#!/usr/bin/env python3
"""Genera immagini con fal.ai a partire da un file di lavori.

Uso: python3 tools/fal_batch.py <lavori.json> <cartella_output> [nome ...]

Il file e' una lista di lavori {"nome", "modello", "input"}: "modello" e'
l'endpoint di fal (es. "fal-ai/nano-banana-pro"), "input" i parametri del
modello. Un valore "@file:percorso" viene sostituito con il contenuto del file
(percorso relativo al file dei lavori), per passare immagini locali. Se si
passano dei nomi, gira solo quei lavori. Nella cartella di output finiscono le
immagini e registro.json (parametri, seed, tempi).

La chiave si legge da FAL_KEY oppure da ~/.config/fal/key.
"""
import base64
import concurrent.futures
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.request

QUEUE = "https://queue.fal.run"


def load_key():
    key = os.environ.get("FAL_KEY")
    if key:
        return key.strip()
    return (pathlib.Path.home() / ".config/fal/key").read_text().strip()


def call(method, url, key, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "Authorization": f"Key {key}",
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{e.code} {url}: {e.read().decode(errors='replace')[:500]}") from None


def resolve_files(value, base):
    if isinstance(value, str) and value.startswith("@file:"):
        path = base / value[len("@file:"):]
        mime = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
        return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"
    if isinstance(value, list):
        return [resolve_files(v, base) for v in value]
    if isinstance(value, dict):
        return {k: resolve_files(v, base) for k, v in value.items()}
    return value


def run(job, key, out, base):
    t0 = time.time()
    sub = call("POST", f"{QUEUE}/{job['modello']}", key, resolve_files(job["input"], base))
    while True:
        st = call("GET", sub["status_url"], key)
        if st.get("status") == "COMPLETED":
            break
        if time.time() - t0 > 900:
            raise TimeoutError(f"{job['nome']}: nessuna risposta dopo 15 minuti")
        time.sleep(3)
    res = call("GET", sub["response_url"], key)
    files = []
    images = res.get("images") or ([res["image"]] if res.get("image") else [])
    # i modelli di segmentazione restituiscono anche una maschera per ogni oggetto trovato
    named = [(f"{job['nome']}{'' if i == 0 else f'_{i + 1}'}", im) for i, im in enumerate(images)]
    named += [(f"{job['nome']}_maschera{i + 1}", m) for i, m in enumerate(res.get("masks") or [])]
    # i modelli da immagine a 3D restituiscono un GLB (e un'anteprima)
    glb = res.get("model_glb") or (res.get("model_urls") or {}).get("glb") or res.get("model_mesh")
    if glb:
        named.append((job["nome"], {**glb, "content_type": "model/glb"}))
    anteprima = res.get("rendered_image") or res.get("thumbnail")
    if glb and anteprima:
        named.append((f"{job['nome']}_anteprima", anteprima))
    for name, img in named:
        ext = (img.get("content_type") or "image/png").split("/")[-1].replace("jpeg", "jpg")
        if ext not in ("glb", "png", "jpg", "webp"):
            ext = pathlib.PurePosixPath(img.get("file_name") or img["url"]).suffix.lstrip(".") or "bin"
        dest = out / f"{name}.{ext}"
        urllib.request.urlretrieve(img["url"], dest)
        files.append(dest.name)
    if not files:
        raise RuntimeError(f"{job['nome']}: nessuna immagine nella risposta: {json.dumps(res)[:500]}")
    return {"file": files, "seed": res.get("seed"), "secondi": round(time.time() - t0),
            "descrizione": res.get("description")}


def main():
    jobs_path = pathlib.Path(sys.argv[1])
    jobs = json.loads(jobs_path.read_text())
    out = pathlib.Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    only = set(sys.argv[3:])
    if only:
        jobs = [j for j in jobs if j["nome"] in only]
    key = load_key()
    log_path = out / "registro.json"
    log = json.loads(log_path.read_text()) if log_path.exists() else {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        futures = {pool.submit(run, j, key, out, jobs_path.parent): j for j in jobs}
        for f in concurrent.futures.as_completed(futures):
            job = futures[f]
            entry = {"modello": job["modello"], "input": job["input"]}
            try:
                entry.update(f.result())
                print(f"ok      {job['nome']} ({entry['secondi']}s)")
            except Exception as e:  # un lavoro fallito non ferma gli altri
                entry["errore"] = str(e)
                print(f"ERRORE  {job['nome']}: {e}")
            log[job["nome"]] = entry
    log_path.write_text(json.dumps(log, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
