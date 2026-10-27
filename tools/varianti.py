#!/usr/bin/env python3
"""Le persone di una scena cambiate per un altro giorno (piu' malate, morte, in un'altra posa), nella stessa stanza.

Uso: python3 tools/varianti.py <cartella> [nome ...]

La cartella (per esempio art/scene/01-cucina/giorno2) contiene varianti.json:
{
  "maschere_da": ["../maschere/persone_maschera1.png"],   le persone dell'immagine di partenza (della prima)
  "varianti": {
    "persone": {"da": "../ammorbiditi.jpg", "schede": ["padre", "figlia"], "prompt": "...",
                "ritagli": ["person", "cane"]},
    "persone_febbre": {"da": "persone.jpg", "schede": ["giovane"], "prompt": "..."}
  }
}
Per ogni variante, nell'ordine (una puo' partire da quella prima):
1. <nome>_grezza.jpg: l'immagine "da" (le persone ammorbidite della scena, senza il 20% di fumetto) rifatta da Nano
   Banana Pro col prompt, passando dopo di lei le schede dei personaggi (art/personaggi/<persona>.jpg), cosi' le
   facce restano quelle;
2. <nome>.jpg: la grezza riallineata a "da" (affine, con ECC) guardando solo la stanza, non le persone: il ridisegno
   sposta un poco l'inquadratura, e le persone devono cadere giuste sulla stanza vuota del primo giorno;
3. maschere_<nome>/: i ritagli di SAM 3 ("ritagli", di base "person").
Le scene del gioco le compone tools/prepara_gioco.py (GIORNO2): sulla stanza vuota al 20%, come nel montaggio,
solo le persone che quel giorno sono in casa, ognuna ritagliata dalla sua variante; prima tools/meno_dettagli.py.
Ogni passaggio salta se il suo file c'e' gia': per rifarlo, cancellalo. Il registro e' in registro.json.
"""
import json
import pathlib
import sys

import cv2
import numpy as np
from PIL import Image

QUI = pathlib.Path(__file__).resolve().parent
ROOT = QUI.parent
sys.path.insert(0, str(QUI))
import fal_batch  # noqa: E402
from scena import NB_EDIT, SAM, job, run_jobs  # noqa: E402

SCHEDE = ROOT / "art/personaggi"
# le schede vanno dopo l'immagine da cambiare: si usano solo per le facce
COME_SCHEDE = ("The images after the first one are character reference sheets, one per person (each shows the same "
               "person five times: front, three-quarter view, profile, back and a close-up of the face). Use them "
               "only to keep each person's face and body identical; every person appears only once, in the first "
               "image's place. ")
FINE = (" Keep the room, the furniture, the camera, the framing and the light exactly identical, pixel for pixel. The "
        "people keep the same grotesque but almost photographic features: bulging eyes, crooked noses, bad teeth, "
        "sunken cheeks. Realistic photograph, no text, no border.")


def allinea(da, grezza, maschere, uscita):
    """La grezza deformata (affine) finche' la stanza combacia con quella di "da"; le persone non contano."""
    a = cv2.imread(str(da))
    h, w = a.shape[:2]
    b = cv2.resize(cv2.imread(str(grezza)), (w, h), interpolation=cv2.INTER_AREA)
    s = 960 / w
    piccola = lambda im: cv2.GaussianBlur(cv2.cvtColor(cv2.resize(im, None, fx=s, fy=s, interpolation=cv2.INTER_AREA),  # noqa: E731
                                                       cv2.COLOR_BGR2GRAY), (0, 0), 1.5)
    ga, gb = piccola(a), piccola(b)
    # fuori dalle persone di prima, allargate parecchio: le pose cambiano
    persone = np.zeros(ga.shape, np.uint8)
    for m in maschere:
        x = cv2.resize(cv2.imread(str(m), cv2.IMREAD_GRAYSCALE), (ga.shape[1], ga.shape[0]))
        persone = np.maximum(persone, (x > 127).astype(np.uint8))
    r = round(0.05 * ga.shape[1])
    persone = cv2.dilate(persone, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1)))
    stanza = ((1 - persone) * 255).astype(np.uint8)
    warp = np.eye(2, 3, dtype=np.float32)
    try:
        _, warp = cv2.findTransformECC(ga, gb, warp, cv2.MOTION_AFFINE,
                                       (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6), stanza, 5)
    except cv2.error as e:
        print("  ECC non converge, resta com'e':", e)
    warp[:, 2] /= s
    out = cv2.warpAffine(b, warp, (w, h), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REFLECT)
    cv2.imwrite(str(uscita), out, [cv2.IMWRITE_JPEG_QUALITY, 93])
    print(f"  allineata: spostamento {warp[0, 2]:+.1f}, {warp[1, 2]:+.1f} punti, scala {warp[0, 0]:.4f}")


def main():
    folder = pathlib.Path(sys.argv[1]).resolve()
    solo = set(sys.argv[2:])
    v = json.loads((folder / "varianti.json").read_text())
    key = fal_batch.load_key()
    log_path = folder / "registro.json"
    log = json.loads(log_path.read_text()) if log_path.exists() else {}
    for nome, d in v["varianti"].items():
        if solo and nome not in solo:
            continue
        da = (folder / d["da"]).resolve()
        if not (folder / f"{nome}.jpg").exists():
            if not (folder / f"{nome}_grezza.jpg").exists():
                immagini = [f"@file:{d['da']}"] + [f"@file:{SCHEDE / f'{p}.jpg'}" for p in d.get("schede", [])]
                prompt = (COME_SCHEDE if d.get("schede") else "") + d["prompt"] + FINE
                run_jobs([job(f"{nome}_grezza", NB_EDIT, prompt, immagini)], folder, key, log)
                log_path.write_text(json.dumps(log, indent=2, ensure_ascii=False))
            # le persone da non guardare: quelle di "da" (per una variante di una variante, le sue maschere)
            prima = d.get("maschere_da") or v.get("maschere_da", [])
            allinea(da, folder / f"{nome}_grezza.jpg", [(folder / m).resolve() for m in prima], folder / f"{nome}.jpg")
        cartella = folder / f"maschere_{nome}"
        if not list(cartella.glob("*_maschera*.png")):
            cartella.mkdir(exist_ok=True)
            nomi = {"person": "persone", "cane": "bastone", "bed": "letto"}
            run_jobs([job(nomi.get(c, c.replace(" ", "_")), SAM, image=f"@file:../{nome}.jpg", prompt=c, max_masks=6)
                      for c in d.get("ritagli", ["person"])], cartella, key, log)
            log_path.write_text(json.dumps(log, indent=2, ensure_ascii=False))
        print("ok", nome, flush=True)


if __name__ == "__main__":
    main()
