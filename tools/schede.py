#!/usr/bin/env python3
"""Le schede dei personaggi: un riferimento per ognuno, da usare in tutte le scene e in tutti gli stati.

Uso: python3 tools/schede.py [persona ...]      (senza nomi: tutte quelle che mancano)

Per ogni persona dei primi piani (art/scene/*/primi_piani.json: il riferimento e l'aspetto) Nano Banana Pro fa
art/personaggi/<persona>.jpg: la stessa persona cinque volte su fondo grigio chiaro (davanti, di tre quarti, di
profilo, di spalle e il primo piano della testa), quasi fotografica come nel gioco (grottesca, o strana come i
quattro delle case 2 e 10). I riferimenti di
prima erano ritagli delle scene (col fondo e pezzi di altre persone) o una foto sola. D'ora in poi, per cambiare lo
stato o l'inquadratura di una persona, si passa la sua scheda come seconda immagine, con COME_RIFERIMENTO nel prompt.
Ogni scheda salta se il file c'e' gia': per rifarla, cancellala. Il registro e' in art/personaggi/registro.json.
"""
import concurrent.futures
import json
import pathlib
import sys

from PIL import Image

QUI = pathlib.Path(__file__).resolve().parent
ROOT = QUI.parent
sys.path.insert(0, str(QUI))
import fal_batch  # noqa: E402
from ospite import persone  # noqa: E402
from scena import NB_EDIT, job  # noqa: E402

DIR = ROOT / "art/personaggi"
# quello che la persona tiene sempre con se'
CON = {"nonna": "She leans on her wooden walking stick in every full-body view."}
# come dirlo nel prompt quando la scheda e' la seconda immagine, per cambiare lo stato o l'inquadratura di una persona
# (provato sul padre con la febbre e il bubbone: art/personaggi/prova)
COME_RIFERIMENTO = ("The second image is a character reference sheet: the same person seen five times, from the "
                    "front, in three-quarter view, in profile, from the back and in a close-up of the face. Use it only "
                    "to keep the person identical; the person appears only once.")


def prompt(aspetto, con):
    return ("Create a character reference sheet of the person in the image "
            f"({aspetto}). On one wide sheet with a plain, even, light grey studio background, show the same person "
            "five times, side by side and evenly spaced, all at the same scale: 1) full body from the front, standing "
            "upright with relaxed arms; 2) full body in three-quarter view; 3) full body in side profile; 4) full body "
            "from the back; 5) a large close-up of the head and shoulders from the front. "
            f"{con + ' ' if con else ''}It must be exactly the same person in every view: the same almost "
            "photographic face, however strange it is, the same eyes, nose, mouth, teeth, hair, skin and body shape, "
            "and exactly the same clothes, shoes and colors as in the image. Realistic photograph, soft even studio light, natural "
            "colors, sharp focus. No other people, no furniture, no text, no labels, no numbers, no border.")


def main():
    chi = persone()
    nomi = sys.argv[1:] or sorted(chi)
    DIR.mkdir(parents=True, exist_ok=True)
    log_path = DIR / "registro.json"
    log = json.loads(log_path.read_text()) if log_path.exists() else {}
    lavori = []
    for nome in nomi:
        if (DIR / f"{nome}.jpg").exists():
            continue
        rif, aspetto = chi[nome]
        lavori.append(job(nome, NB_EDIT, prompt(aspetto, CON.get(nome)), f"@file:{rif}"))
    if not lavori:
        return
    key = fal_batch.load_key()
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(fal_batch.run, j, key, DIR, DIR): j for j in lavori}
        for f in concurrent.futures.as_completed(futures):
            j = futures[f]
            try:
                res = f.result()
            except Exception as e:  # una scheda fallita non ferma le altre
                print(f"ERRORE  {j['nome']}: {e}", flush=True)
                log[j["nome"]] = {"modello": j["modello"], "errore": str(e)}
                continue
            log[j["nome"]] = {"modello": j["modello"], "input": {k: v for k, v in j["input"].items()
                                                                  if k != "image_urls"}, **res}
            png = DIR / res["file"][0]
            Image.open(png).convert("RGB").save(DIR / f"{j['nome']}.jpg", quality=93)
            png.unlink()
            print(f"ok      {j['nome']} ({res['secondi']}s)", flush=True)
    log_path.write_text(json.dumps(log, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
