#!/usr/bin/env python3
"""Applica uno stile con intensita' diverse a sfondo e personaggi.

Uso: python3 tools/intensita.py <scena.json>

La scena indica:
- "stile": l'immagine trasformata del tutto nello stile;
- "sfondo": la stessa stanza nella resa originale, senza personaggi (cosi'
  dietro ai personaggi deformati non restano sagome della foto);
- "sfondo_stile" (facoltativo): lo sfondo pulito trasformato nello stesso stile;
  se c'e', lo sfondo si mescola con questo invece che con "stile", cosi' gli
  oggetti dei due livelli combaciano e non si vedono doppi;
- "maschere": i ritagli dei personaggi (e della mano) fatti con SAM 3;
- "intensita_sfondo": quanto stile dare allo sfondo, da 0 a 1;
- "intensita_personaggi" (facoltativo, 1 se manca): quanto stile dare ai
  personaggi; sotto 1 serve "personaggi_originale", la scena con i personaggi
  nella resa originale, allineata a "stile" (stesse sagome, niente
  deformazioni), altrimenti si vedrebbero due sagome sovrapposte.

Dentro le maschere i personaggi, fuori lo sfondo, ognuno con la sua
intensita'. I percorsi sono relativi al file della scena.
"""
import json
import pathlib
import sys

import numpy as np
from PIL import Image, ImageFilter

W, H = 1920, 1080


def load(path, mode="RGB"):
    return np.asarray(Image.open(path).convert(mode).resize((W, H), Image.LANCZOS)).astype(np.float32) / 255.0


def main():
    scene_path = pathlib.Path(sys.argv[1])
    sc = json.loads(scene_path.read_text())
    base = scene_path.parent
    style = load(base / sc["stile"])
    plate = load(base / sc["sfondo"])
    mask = Image.new("L", (W, H), 0)
    for m in sc["maschere"]:
        mask = Image.fromarray(np.maximum(np.asarray(mask), np.asarray(
            Image.open(base / m).convert("L").resize((W, H), Image.NEAREST))))
    # "allarga" (dispari) allarga la maschera per prendere i contorni disegnati; negativo la stringe, per
    # togliere l'alone chiaro attorno ai personaggi; poi si ammorbidisce il bordo
    grow = sc.get("allarga", 5)
    if grow > 1:
        mask = mask.filter(ImageFilter.MaxFilter(grow))
    elif grow < -1:
        mask = mask.filter(ImageFilter.MinFilter(-grow))
    mask = mask.filter(ImageFilter.GaussianBlur(sc.get("sfuma", 1.5)))
    m = np.asarray(mask).astype(np.float32)[..., None] / 255.0
    k = sc.get("intensita_sfondo", 0.2)
    styled_plate = load(base / sc["sfondo_stile"]) if sc.get("sfondo_stile") else style
    background = plate * (1 - k) + styled_plate * k
    kp = sc.get("intensita_personaggi", 1.0)
    figures = style if kp >= 1 else load(base / sc["personaggi_originale"]) * (1 - kp) + style * kp
    if sc.get("buio"):
        # la stanza sprofonda nel buio fuori dal cono di luce; i personaggi ne risentono meno
        b = sc["buio"]
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        d = np.hypot((xx - b["x"] * W) / (b["raggio"] * W), (yy - b["y"] * H) / (b["raggio"] * W * b.get("schiaccia", 1.0)))
        t = np.clip((d - 0.3) / 0.7, 0, 1)
        light = (1 - b["quanto"] * t * t * (3 - 2 * t))[..., None]
        background = background * light
        figures = figures * light ** b.get("personaggi", 0.35)
    out = figures * m + background * (1 - m)
    dest = base / sc["uscita"]
    Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(dest, quality=93)
    print(dest)


if __name__ == "__main__":
    main()
