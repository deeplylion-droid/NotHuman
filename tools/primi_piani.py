#!/usr/bin/env python3
"""Primi piani delle parti del corpo, per lo zoom della videocamera durante l'esame.

Uso: python3 tools/primi_piani.py <cartella_scena> [persona ...]

Nella cartella della scena, primi_piani.json descrive le persone (in inglese, va nei prompt):
{
  "padre": {
    "riferimento": "riferimento_padre.jpg",
    "aspetto": "a gaunt man in his fifties, in a worn denim jacket over a grey t-shirt",
    "parti": {
      "occhi": "His eyes are glassy and bloodshot with fever.",
      "collo": {"inquadratura": "the left side of his neck under the jaw, the jacket collar pulled aside",
                "segni": "A hard swollen lump the size of an egg ..."}
    }
  }
}
Una parte puo' essere solo la descrizione dei segni (l'inquadratura e' quella di base, in PARTS) oppure
inquadratura e segni. Con "scheda" (il nome in art/personaggi, per esempio "padre") si passa anche la scheda del
personaggio: serve quando la persona cambia stato (piu' malata, morta), perche' la faccia resti quella. Per ogni persona e parte fa primi-piani/<persona>_<parte>.jpg con Nano Banana Pro,
passando il riferimento del personaggio, cosi' la faccia resta quella. Salta i file che esistono gia':
per rifarne uno, cancellalo. Il registro e' in primi-piani/registro.json.
"""
import concurrent.futures
import json
import pathlib
import sys

from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
import fal_batch  # noqa: E402
from schede import COME_RIFERIMENTO  # noqa: E402

NB_EDIT = "fal-ai/nano-banana-pro/edit"
PARTS = {
    "occhi": "the eyes and the bridge of the nose, from the eyebrows to the cheekbones",
    "bocca": "the mouth, slightly open, from the tip of the nose to the chin",
    "collo": "the side of the neck, from under the jaw to the collarbone",
    "ascelle": "one armpit, with the arm raised",
    "mani": "both hands held out in front, palms down, from the wrists to the fingertips",
}
PROMPT = ("Extreme close-up of {frame} of the person in the reference image ({look}), filling the whole 16:9 frame, as "
          "if a camcorder zoomed in on them from about one meter away. Same person: the same grotesque but almost "
          "photographic features, the same skin, hair and clothes, in the same warm, dim indoor light of a poor home. "
          "{signs} Realistic photograph, sharp focus on the subject, natural colors. No other people, no hands, gloves "
          "or objects belonging to the viewer, no text, no border.")


def main():
    folder = pathlib.Path(sys.argv[1]).resolve()
    only = set(sys.argv[2:])
    people = json.loads((folder / "primi_piani.json").read_text())
    out = folder / "primi-piani"
    out.mkdir(exist_ok=True)
    jobs = []
    for who, p in people.items():
        if only and who not in only:
            continue
        for part, desc in p["parti"].items():
            name = f"{who}_{part}"
            if (out / f"{name}.jpg").exists():
                continue
            if isinstance(desc, str):
                desc = {"segni": desc}
            # una variante della parte (per esempio "occhi_febbre") ha l'inquadratura della parte, se non ne dice una
            frame = desc.get("inquadratura") or PARTS[part.split("_")[0]]
            prompt = PROMPT.format(frame=frame, look=p["aspetto"], signs=desc["segni"])
            immagini = [f"@file:{p['riferimento']}"]
            # con la scheda del personaggio (art/personaggi) la faccia resta quella anche cambiando stato
            if p.get("scheda"):
                immagini.append(f"@file:{ROOT / 'art/personaggi' / (p['scheda'] + '.jpg')}")
                prompt += " " + COME_RIFERIMENTO
            jobs.append({"nome": name, "modello": NB_EDIT, "input": {
                "prompt": prompt, "image_urls": immagini, "aspect_ratio": "16:9",
                "resolution": "2K", "output_format": "png", "num_images": 1}})
    key = fal_batch.load_key()
    log_path = out / "registro.json"
    log = json.loads(log_path.read_text()) if log_path.exists() else {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        futures = {pool.submit(fal_batch.run, j, key, out, folder): j for j in jobs}
        for f in concurrent.futures.as_completed(futures):
            j = futures[f]
            entry = {"modello": j["modello"], "input": j["input"]}
            try:
                entry.update(f.result())
                png = out / entry["file"][0]
                Image.open(png).convert("RGB").save(out / f"{j['nome']}.jpg", quality=93)
                png.unlink()
                print(f"ok      {j['nome']} ({entry['secondi']}s)", flush=True)
            except Exception as e:  # un primo piano fallito non ferma gli altri
                entry["errore"] = str(e)
                print(f"ERRORE  {j['nome']}: {e}", flush=True)
            log[j["nome"]] = entry
            log_path.write_text(json.dumps(log, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
