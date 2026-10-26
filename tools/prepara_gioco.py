#!/usr/bin/env python3
"""Prepara le immagini del prototipo in gioco/img a partire da art/.

Uso: python3 tools/prepara_gioco.py

Per ogni luogo:
- <luogo>.jpg: la scena finale (senza filtro: il VHS lo fa il gioco), 1600x900;
- <luogo>_persone.png: un grigio per persona (40, 80, 120...), per sapere chi c'e' sotto il puntatore;
- <luogo>_<persona>.png: la sagoma bianca della persona, per evidenziarla;
- <luogo>_calore.png: la mappa di calore per l'infrarosso dei nastri: le persone (piu' calde dove si vede la
  pelle, e chi ha la febbre di piu'), i nascosti dietro le porte, le lampade.
Poi i primi piani in img/pp, la mappa del paese e la scrivania con il 20% di fumetto (salvata anche in
art/scrivania/scrivania.jpg). L'ordine delle persone e i calori sono quelli di gioco/js/dati.js.
"""
import pathlib

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "gioco/img"
W, H = 1600, 900

LUOGHI = {
    "cucina": {
        "scena": "art/scene/01-cucina/finale.jpg",
        "persone": [
            ("padre", 0.8, ["art/prove-stile/11-personaggi-50/maschere/ammorbiditi_persone_maschera1.png"]),
            ("figlia", 0.52, ["art/prove-stile/11-personaggi-50/maschere/ammorbiditi_persone_maschera2.png"]),
        ],
        # la madre in fondo al corridoio buio, appena visibile oltre la porta
        "nascosti": [("ellisse", 0.433, 0.37, 0.012, 0.045, 0.62), ("ellisse", 0.433, 0.31, 0.008, 0.014, 0.7)],
        "lampade": [],
    },
    "camera": {
        "scena": "art/scene/03-camera/finale.jpg",
        "persone": [("madre", 1.0, ["art/scene/03-camera/maschere/persone_maschera1.png"])],
        "nascosti": [],
        "lampade": [(0.305, 0.42, 0.018, 0.9)],
    },
    "soggiorno": {
        "scena": "art/scene/02-soggiorno/finale.jpg",
        "persone": [
            ("uomo", 0.78, ["art/scene/02-soggiorno/maschere/persone_maschera1.png"]),
            ("giovane", 0.4, ["art/scene/02-soggiorno/maschere/persone_maschera2.png"]),
            ("nonna", 0.5, ["art/scene/02-soggiorno/maschere/persone_maschera3.png",
                            "art/scene/02-soggiorno/maschere/bastone_maschera1.png"]),
        ],
        # il ragazzo sdraiato dietro la porta chiusa: il calore passa attenuato dal legno
        "nascosti": [("ellisse", 0.835, 0.64, 0.07, 0.035, 0.5), ("ellisse", 0.775, 0.6, 0.018, 0.028, 0.58)],
        "lampade": [(0.385, 0.02, 0.03, 0.55)],
    },
}

PRIMI = {
    "art/scene/01-cucina/primi-piani": ["padre", "figlia"],
    "art/scene/02-soggiorno/primi-piani": ["uomo", "giovane", "nonna"],
    "art/scene/03-camera/primi-piani": ["madre"],
}


def mask(paths, size):
    m = np.zeros((size[1], size[0]), np.float32)
    for p in paths:
        a = np.asarray(Image.open(ROOT / p).convert("L").resize(size, Image.BILINEAR)).astype(np.float32) / 255
        m = np.maximum(m, a)
    return m


def heat_blobs(draw_list, size):
    w, h = size
    im = Image.new("L", size, 0)
    d = ImageDraw.Draw(im)
    for kind, cx, cy, rx, ry, v in draw_list:
        d.ellipse([(cx - rx) * w, (cy - ry) * h, (cx + rx) * w, (cy + ry) * h], fill=int(v * 255))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(w * 0.012))).astype(np.float32) / 255


def luogo(nome, L):
    scena = Image.open(ROOT / L["scena"]).convert("RGB")
    scena.resize((W, H), Image.LANCZOS).save(OUT / f"{nome}.jpg", quality=86)
    # chi c'e' sotto il puntatore
    idw, idh = 480, 270
    ids = np.zeros((idh, idw), np.uint8)
    for i, (persona, _, paths) in enumerate(L["persone"], 1):
        ids[mask(paths, (idw, idh)) > 0.5] = i * 40
    Image.fromarray(ids).save(OUT / f"{nome}_persone.png")
    # sagome per evidenziare e mappa di calore
    hw, hh = 800, 450
    rgb = np.asarray(scena.resize((hw, hh), Image.BILINEAR)).astype(np.float32) / 255
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    pelle = np.clip((r - b - 0.06) / 0.12, 0, 1) * np.clip((r - g + 0.02) / 0.08, 0, 1)
    calore = np.zeros((hh, hw), np.float32)
    for persona, caldo, paths in L["persone"]:
        m = mask(paths, (hw, hh))
        alpha = (np.clip(m, 0, 1) * 255).astype(np.uint8)
        sagoma = np.dstack([np.full_like(alpha, 255)] * 3 + [alpha])
        Image.fromarray(sagoma, "RGBA").save(OUT / f"{nome}_{persona}.png")
        corpo = m * caldo * (0.55 + 0.45 * pelle)
        calore = np.maximum(calore, corpo)
    calore = np.asarray(Image.fromarray((calore * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))
                        ).astype(np.float32) / 255
    if L["nascosti"]:
        calore = np.maximum(calore, heat_blobs(L["nascosti"], (hw, hh)))
    if L["lampade"]:
        calore = np.maximum(calore, heat_blobs([("ellisse", x, y, rr, rr * 16 / 9, v) for x, y, rr, v in L["lampade"]],
                                               (hw, hh)))
    Image.fromarray((np.clip(calore, 0, 1) * 255).astype(np.uint8)).save(OUT / f"{nome}_calore.png")
    print(nome, "ok")


def scrivania():
    base = ROOT / "art/scrivania"
    foto = np.asarray(Image.open(base / "scrivania_foto.jpg").convert("RGB").resize((1920, 1080), Image.LANCZOS)
                      ).astype(np.float32)
    stile = np.asarray(Image.open(base / "scrivania_stile.jpg").convert("RGB").resize((1920, 1080), Image.LANCZOS)
                       ).astype(np.float32)
    out = Image.fromarray(np.clip(foto * 0.8 + stile * 0.2, 0, 255).astype(np.uint8))
    out.save(base / "scrivania.jpg", quality=93)
    out.resize((W, H), Image.LANCZOS).save(OUT / "scrivania.jpg", quality=86)
    Image.open(base / "mappa.jpg").convert("RGB").resize((W, H), Image.LANCZOS).save(OUT / "mappa.jpg", quality=86)
    print("scrivania e mappa ok")


def primi():
    (OUT / "pp").mkdir(parents=True, exist_ok=True)
    n = 0
    for folder, persone in PRIMI.items():
        for f in sorted((ROOT / folder).glob("*.jpg")):
            if f.stem.split("_")[0] in persone:
                Image.open(f).convert("RGB").resize((W, H), Image.LANCZOS).save(OUT / "pp" / f.name, quality=84)
                n += 1
    print("primi piani:", n)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for nome, L in LUOGHI.items():
        luogo(nome, L)
    scrivania()
    primi()


if __name__ == "__main__":
    main()
