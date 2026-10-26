#!/usr/bin/env python3
"""Produce una scena nello stile deciso, dalla descrizione all'immagine finale.

Uso: python3 tools/scena.py <cartella> [fino_a]

La cartella contiene scena.json con i campi (in inglese, vanno nei prompt):
- "stanza": la stanza, con pochi dettagli;
- "persone": le persone, con aspetto e posa;
- "n_persone": quante sono, in lettere ("two", "three");
- "pose": le persone in breve, per dire al modello di lasciarle al loro posto;
- "oggetti": gli oggetti della stanza che devono restare fermi.

Passaggi (ognuno salta se il suo file esiste gia': per rifarne uno, cancellalo):
1. base.jpg: la scena in foto (GPT Image 2);
2. fumetto.jpg: la scena ridisegnata nello stile 07, personaggi deformi (GPT Image 2);
3. ammorbiditi.jpg: personaggi e mano rifatti in foto, ammorbiditi (Nano Banana Pro);
4. stanza_stile.jpg: fumetto.jpg senza persone e senza mano (Nano Banana Pro);
5. stanza_vuota.jpg: stanza_stile.jpg rifatta in foto (Nano Banana Pro);
6. maschere/: personaggi, bastone e guanto, ritagliati da ammorbiditi.jpg (SAM 3);
7. finale.jpg: personaggi sulla stanza al 20% (tools/intensita.py);
8. finale_vhs.jpg e finale_vhs_verde.jpg (tools/filtri.py).
Le due stanze vuote vengono dalla versione a fumetto, non dalla foto di partenza: GPT, ridisegnando,
cambia un po' l'inquadratura, e cosi' stanza e personaggi combaciano comunque.
Con "fino_a" (per esempio "base") si ferma dopo quel passaggio.
"""
import concurrent.futures
import json
import pathlib
import subprocess
import sys

from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import fal_batch  # noqa: E402

GPT, GPT_EDIT = "openai/gpt-image-2", "openai/gpt-image-2/edit"
NB_EDIT, SAM = "fal-ai/nano-banana-pro/edit", "fal-ai/sam-3/image"
STYLE_07 = ("STYLE: a 1970s European underground comic panel: bold black brush-ink outlines, expressive scratchy "
            "crosshatching, flat muted colors with no gradients (mustard, olive green, brick red, dirty beige), "
            "halftone dots in the shadows.")
GLOVE = ("In the lower right foreground, the doctor's own black leather glove holds a long wooden cane, like the held "
         "item in a first-person video game.")
STEPS = ["base", "fumetto", "ammorbiditi", "stanza_stile", "stanza_vuota", "maschere", "finale", "filtri"]


def prompts(s):
    return {
        "base": (f"First-person view of a plague doctor standing in {s['stanza']} {s['persone']} {GLOVE} Realistic "
                 "photograph, evenly exposed, everything clearly readable, no dramatic shadows. 16:9, no text, no "
                 "border."),
        "fumetto": ("Completely re-render this image in the style described below, transforming it far beyond a "
                    "filter: redraw every surface, light and texture in that technique. Keep the composition: "
                    f"{s['oggetti']}, the gloved hand holding the cane in the lower right foreground, and {s['pose']}, "
                    f"in the same places and poses. The {s['n_persone']} people must become drawn, deformed, grotesque "
                    "characters, not photographs: exaggerated and distorted proportions, oversized heads, uneven "
                    "bulging eyes, long crooked noses, sunken cheeks, too-wide mouths with bad teeth, elongated bony "
                    "fingers; unsettling and sinister, never cute or cartoonish. No text, no signature, no "
                    "watermark.\n" + STYLE_07),
        "ammorbiditi": (f"Re-render only the {s['n_persone']} people and the black leather gloved hand holding the "
                        "cane as realistic photographs: real skin with pores, real hair, real fabric and real leather, "
                        "photographic lighting. Keep exactly their grotesque, deformed features from this image: the "
                        "same bulging eyes, crooked noses, bad teeth, sunken cheeks, bony elongated fingers, and the "
                        "same proportions, silhouettes, poses, expressions, clothes and positions, pixel for pixel. Do "
                        "not make them look more normal. Everything else in the image stays exactly identical."),
        "stanza_stile": (f"Remove the {s['n_persone']} people completely, with everything they hold, and also remove "
                         "the black leather gloved hand and the wooden cane in the lower right foreground. Reconstruct "
                         "the empty room behind them naturally, in the same drawing style. Keep everything else exactly "
                         f"identical and in the same place: {s['oggetti']}, the same lighting and the same camera. Do "
                         "not draw any face anywhere."),
        "stanza_vuota": ("Re-render this drawing of an empty room as a realistic photograph: real materials, real "
                         "light, real textures, like an ordinary amateur snapshot, evenly exposed. Keep every object "
                         "exactly where it is, with the same composition, perspective, proportions and camera; "
                         f"{s['oggetti']} must stay exactly at the same pixel positions and sizes. Do not add any "
                         "people, hands or objects, and no faces anywhere."),
    }


def job(name, model, prompt=None, image=None, **extra):
    if model == GPT:
        inp = {"prompt": prompt, "image_size": {"width": 1920, "height": 1080}, "quality": "high",
               "output_format": "png"}
    elif model == GPT_EDIT:
        inp = {"prompt": prompt, "image_urls": [image], "image_size": {"width": 1920, "height": 1080},
               "quality": "high", "output_format": "png"}
    elif model == NB_EDIT:
        inp = {"prompt": prompt, "image_urls": [image], "aspect_ratio": "16:9", "resolution": "2K",
               "output_format": "png", "num_images": 1}
    else:
        inp = {"image_url": image, "prompt": prompt, "apply_mask": False, "include_scores": True,
               "output_format": "png", "return_multiple_masks": True, **extra}
    return {"nome": name, "modello": model, "input": inp}


def run_jobs(jobs, folder, key, log):
    """Lancia i lavori in parallelo; converte le immagini in jpg e annota tutto nel registro."""
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(fal_batch.run, j, key, folder, folder): j for j in jobs}
        for f in concurrent.futures.as_completed(futures):
            j = futures[f]
            try:
                res = f.result()  # un errore ferma la scena: i passaggi dopo dipendono da questo
            except RuntimeError as e:
                if j["modello"] == SAM and "nessuna immagine" in str(e):
                    print(f"--  {j['nome']}: niente da ritagliare", flush=True)  # per esempio nessun guanto in scena
                    continue
                raise
            log[j["nome"]] = {"modello": j["modello"], "input": j["input"], **res}
            if j["modello"] != SAM:
                png = folder / res["file"][0]
                Image.open(png).convert("RGB").save(folder / f"{j['nome']}.jpg", quality=93)
                png.unlink()
            print(f"ok  {j['nome']} ({res['secondi']}s)", flush=True)


def main():
    folder = pathlib.Path(sys.argv[1]).resolve()
    stop = sys.argv[2] if len(sys.argv) > 2 else STEPS[-1]
    s = json.loads((folder / "scena.json").read_text())
    p = prompts(s)
    key = fal_batch.load_key()
    log_path = folder / "registro.json"
    log = json.loads(log_path.read_text()) if log_path.exists() else {}
    todo = lambda name: not (folder / f"{name}.jpg").exists()  # noqa: E731

    def done(step):
        log_path.write_text(json.dumps(log, indent=2, ensure_ascii=False))
        return STEPS.index(step) >= STEPS.index(stop)

    if todo("base"):
        run_jobs([job("base", GPT, p["base"])], folder, key, log)
    if done("base"):
        return
    if todo("fumetto"):
        run_jobs([job("fumetto", GPT_EDIT, p["fumetto"], "@file:base.jpg")], folder, key, log)
    if done("fumetto"):
        return
    jobs = [job(n, NB_EDIT, p[n], "@file:fumetto.jpg") for n in ["ammorbiditi", "stanza_stile"] if todo(n)]
    if jobs:
        run_jobs(jobs, folder, key, log)
    if done("stanza_stile"):
        return
    if todo("stanza_vuota"):
        run_jobs([job("stanza_vuota", NB_EDIT, p["stanza_vuota"], "@file:stanza_stile.jpg")], folder, key, log)
    if done("stanza_vuota"):
        return
    masks_dir = folder / "maschere"
    masks_dir.mkdir(exist_ok=True)
    if not list(masks_dir.glob("*_maschera*.png")):
        src = "@file:../ammorbiditi.jpg"
        run_jobs([job("persone", SAM, image=src, prompt="person", max_masks=6),
                  job("bastone", SAM, image=src, prompt="cane", max_masks=3),
                  job("guanto", SAM, image=src, prompt="glove", max_masks=2)], masks_dir, key, log)
    if done("maschere"):
        return
    masks = sorted(str(m.relative_to(folder)) for m in masks_dir.glob("*_maschera*.png"))
    (folder / "montaggio.json").write_text(json.dumps({
        "stile": "ammorbiditi.jpg", "sfondo": "stanza_vuota.jpg", "sfondo_stile": "stanza_stile.jpg",
        "intensita_sfondo": 0.2, "maschere": masks, "allarga": 3, "sfuma": 1.2, "uscita": "finale.jpg"}, indent=2))
    subprocess.run([sys.executable, "-I", str(HERE / "intensita.py"), str(folder / "montaggio.json")], check=True)
    if done("finale"):
        return
    for f in ["vhs", "vhs_verde"]:
        subprocess.run([sys.executable, "-I", str(HERE / "filtri.py"), f, str(folder / "finale.jpg"),
                        str(folder / f"finale_{f}.jpg")], check=True)
    done("filtri")


if __name__ == "__main__":
    main()
