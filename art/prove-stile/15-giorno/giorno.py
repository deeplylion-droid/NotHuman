# proposte per nascondere l'aspetto "AI" delle scene di giorno: trattamenti da aggiungere al VHS
import sys, pathlib
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, "/home/user/NotHuman/tools")
import filtri as F

OUT = pathlib.Path(sys.argv[1])
W, H = 1920, 1080
SCENE = {"cucina": "/home/user/NotHuman/art/scene/01-cucina/finale.jpg",
         "soggiorno": "/home/user/NotHuman/art/scene/02-soggiorno/finale.jpg"}


def carica(p):
    return F.arr(Image.open(p).convert("RGB").resize((W, H), Image.LANCZOS))


def yuv(a):
    y = F.lum(a)
    u = a[..., 2] - y
    v = a[..., 0] - y
    return y, u, v


def rgb(y, u, v):
    r = y + v
    b = y + u
    g = (y - 0.299 * r - 0.114 * b) / 0.587
    return np.clip(np.stack([r, g, b], -1), 0, 1)


def ridimensiona(c, w, h):
    return cv2.resize(cv2.resize(c, (w, h), interpolation=cv2.INTER_AREA), (W, H), interpolation=cv2.INTER_CUBIC)


def vera_definizione(a, forza=1.0):
    """La risoluzione vera di un nastro VHS: luminanza a ~430 punti per riga, colore a ~80, con l'alone
    dei contorni (edge enhancement) dei videoregistratori."""
    y, u, v = yuv(a)
    lw = int(W / (1 + 3.5 * forza))
    y2 = ridimensiona(y, lw, int(H / (1 + 1.4 * forza)))
    # alone: unsharp largo, tipico delle videocamere
    sf = cv2.GaussianBlur(y2, (0, 0), 3.2)
    y2 = np.clip(y2 + (y2 - sf) * 0.9 * forza, 0, 1)
    cw = int(W / (1 + 20 * forza))
    u2 = np.roll(ridimensiona(u, cw, int(H / 2)), int(7 * forza), axis=1)
    v2 = np.roll(ridimensiona(v, cw, int(H / 2)), int(7 * forza), axis=1)
    return rgb(y2, u2 * 0.92, v2 * 0.92)


def luce_videocamera(a):
    """Stanze buie, illuminate solo dalla lampada della videocamera: centro chiaro, bordi nel buio,
    alte luci bruciate, neri chiusi."""
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.hypot((xx - w * 0.5) / (w * 0.52), (yy - h * 0.43) / (h * 0.62))
    luce = 0.28 + 1.05 * np.exp(-(d ** 2) * 1.35)
    out = (a ** 1.18) * luce[..., None] * 0.95
    # alte luci che bruciano, con un alone
    out = F.bloom(np.clip(out, 0, 1), 0.72, 0.45, 22)
    out = np.clip((out - 0.035) / (1 - 0.035), 0, 1)
    return out


def colore_economico(a, seed=3):
    """Il colore di una videocamera da poco: bilanciamento del bianco sbagliato (luce al neon), poco
    saturo, ombre verdastre e rumore di colore a chiazze."""
    y, u, v = yuv(a)
    u, v = u * 0.55, v * 0.55
    # ombre verso il verde-azzurro, luci verso il giallo
    ombra = np.clip(1 - y * 1.6, 0, 1)
    luce = np.clip((y - 0.55) / 0.45, 0, 1)
    u = u - 0.035 * ombra - 0.045 * luce
    v = v - 0.03 * ombra + 0.02 * luce
    rng = np.random.default_rng(seed)
    macchie = cv2.resize(rng.normal(0, 1, (H // 24, W // 24, 2)).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
    u = u + macchie[..., 0] * 0.03 * ombra
    v = v + macchie[..., 1] * 0.03 * ombra
    out = rgb(y, u, v)
    # neri sollevati, un po' meno contrasto
    return out * 0.93 + 0.035


def copia_di_copia(a, seed=9):
    """Una copia della copia: piu' morbida, colore che sfugge a destra, un'eco dell'immagine, buchi nel nastro."""
    out = vera_definizione(a, 0.7)
    out = vera_definizione(out, 0.5)
    eco = np.roll(out, 16, axis=1)
    out = out * 0.86 + eco * 0.14
    y, u, v = yuv(out)
    out = rgb(y * 0.92 + 0.04, np.roll(u, 6, axis=1) * 0.8, np.roll(v, 6, axis=1) * 0.85)
    rng = np.random.default_rng(seed)
    for _ in range(40):
        yy, xx, ln = rng.integers(0, H), rng.integers(0, W - 200), rng.integers(10, 160)
        out[yy:yy + 2, xx:xx + ln] = np.clip(out[yy:yy + 2, xx:xx + ln] + 0.55, 0, 1)
    return out


TRATTAMENTI = {
    "0_attuale": lambda a: a,
    "1_vera_definizione": vera_definizione,
    "2_luce_videocamera": luce_videocamera,
    "3_colore_economico": colore_economico,
    "4_copia_di_copia": copia_di_copia,
    "5_insieme": lambda a: colore_economico(luce_videocamera(vera_definizione(a))),
}
NOMI = {"0_attuale": "0 · com'è ora (VHS al 50%)", "1_vera_definizione": "1 · Vera definizione VHS",
        "2_luce_videocamera": "2 · Luce della videocamera", "3_colore_economico": "3 · Colore da videocamera economica",
        "4_copia_di_copia": "4 · Copia di copia", "5_insieme": "5 · 1 + 2 + 3 insieme"}

font = ImageFont.truetype("/home/user/NotHuman/art/prove-stile/03-schermate/font/VT323-Regular.ttf", 44)
for scena, src in SCENE.items():
    a = carica(src)
    tiles = []
    for k, fn in TRATTAMENTI.items():
        b = F.vhs_artifacts(fn(a), True, 3)
        im = F.img(b)
        im.save(OUT / f"{scena}_{k}.png")
        t = im.resize((960, 540), Image.LANCZOS)
        d = ImageDraw.Draw(t)
        d.text((22, 482), NOMI[k], font=font, fill=(0, 0, 0))
        d.text((20, 480), NOMI[k], font=font, fill=(255, 236, 160))
        tiles.append(t)
    foglio = Image.new("RGB", (960 * 3 + 20, 540 * 2 + 10), (12, 12, 12))
    for i, t in enumerate(tiles):
        foglio.paste(t, ((i % 3) * 970, (i // 3) * 550))
    foglio.save(OUT / f"foglio_{scena}.jpg", quality=90)
    print(scena, "ok")
