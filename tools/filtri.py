#!/usr/bin/env python3
"""Filtri finali che rendono omogenee immagini di stili diversi.

Uso: python3 tools/filtri.py <filtro> <immagine> <uscita>

Filtri:
- verde: viraggio monocromo verde che riempie l'immagine, con bagliore e vignetta;
- verde_acido: lo stesso, con un verde giallastro da luce malata;
- verde_retinato: lo stesso verde con il trattamento di schermata.py
  (bassa risoluzione, pochi colori, retinatura, vignetta);
- verde_rosso: il verde, ma i rossi dell'originale restano rossi;
- vhs: videocassetta (crominanza sbavata, righe, disturbi, scritte del videoregistratore;
  senza la banda di tracking);
- vhs_verde: il verde con i difetti della videocassetta;
- infrarosso: come il verde, ma rosso tendente al rosa, piu' scuro e piu' tenue;
- vhs_infrarosso: l'infrarosso con i difetti della videocassetta;
- fotocopia: bianco e nero sporco da fotocopiatrice.

I difetti della videocassetta sono al 50% (VHS_AMOUNT, deciso il 26 ottobre), come lo slider
dell'anteprima animata a 50%; il colore dei filtri (verde, infrarosso) resta pieno.
"""
import pathlib
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import schermata  # noqa: E402  (per il trattamento retinato)

W, H = 1920, 1080
FONT = HERE.parent / "art/prove-stile/03-schermate/font/VT323-Regular.ttf"
GREEN = [(2, 10, 8), (8, 38, 30), (22, 96, 80), (80, 178, 150), (196, 248, 224)]
VHS_AMOUNT = 0.5


def arr(im):
    return np.asarray(im.convert("RGB")).astype(np.float32) / 255.0


def img(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def lum(a):
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


def gradient_map(l, stops):
    stops = np.array(stops, np.float32) / 255.0
    pos = np.clip(l, 0, 1) * (len(stops) - 1)
    i0 = np.clip(pos.astype(int), 0, len(stops) - 2)
    fr = (pos - i0)[..., None]
    return stops[i0] * (1 - fr) + stops[i0 + 1] * fr


def vignette(a, strength, power=2.2):
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.hypot((xx - w / 2) / (w / 2), (yy - h / 2) / (h / 2)) / np.sqrt(2)
    return a * (1 - strength * np.clip(d, 0, 1) ** power)[..., None]


def bloom(a, threshold, amount, radius):
    bright = np.clip((a - threshold) / (1 - threshold), 0, 1)
    glow = arr(img(bright).filter(ImageFilter.GaussianBlur(radius)))
    return 1 - (1 - a) * (1 - glow * amount)


def grain(a, sigma, seed):
    rng = np.random.default_rng(seed)
    return a + rng.normal(0, sigma, a.shape[:2])[..., None]


def verde(a):
    l = np.clip((lum(a) - 0.5) * 1.15 + 0.5, 0, 1)
    g = gradient_map(l, GREEN)
    g = bloom(g, 0.55, 0.35, 16)
    return grain(vignette(g, 0.65), 0.03, 1)


INFRARED = [(6, 2, 4), (34, 10, 17), (84, 30, 44), (150, 80, 94), (214, 162, 172)]


def infrarosso(a):
    # contrasto piu' basso (tenue) e mezzitoni spinti verso il basso (piu' scuro del verde)
    l = np.clip((lum(a) - 0.5) * 1.0 + 0.5, 0, 1) ** 1.25
    g = gradient_map(l, INFRARED)
    g = bloom(g, 0.6, 0.2, 16)
    return grain(vignette(g, 0.75), 0.03, 4)


def verde_acido(a):
    l = np.clip((lum(a) - 0.5) * 1.15 + 0.5, 0, 1)
    g = gradient_map(l, [(6, 8, 2), (28, 36, 8), (78, 96, 20), (160, 182, 60), (232, 242, 172)])
    g = bloom(g, 0.55, 0.35, 16)
    return grain(vignette(g, 0.65), 0.03, 2)


def verde_rosso(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # solo i rossi veri: la pelle arancione dei personaggi (verde molto sopra il blu) resta verde
    m = (np.clip((r - g - 0.22) / 0.15, 0, 1) * np.clip((0.16 - (g - b)) / 0.1, 0, 1))[..., None]
    red = np.stack([np.clip(r * 1.15, 0, 1), g * 0.55, b * 0.55], -1)
    return verde(a) * (1 - m) + red * m


def verde_retinato(a):
    t = {"palette": [[4, 14, 12], [10, 44, 38], [24, 92, 80], [70, 160, 138], [150, 220, 196], [220, 252, 236]],
         "pixel": 3, "livelli_colore": 6, "colore_originale": 0.08, "contrasto": 1.15, "luce": 0.02,
         "gamma": 1.0, "vignetta": 0.9, "barilotto": 0.05, "grana": 0.03}
    return arr(schermata.treat(img(a), t))


def vhs_artifacts(a, color, seed, k=VHS_AMOUNT):
    # k: intensita' dei difetti, da 0 a 1; la vignetta resta piena, come nell'anteprima animata
    rng = np.random.default_rng(seed)
    h, w = a.shape[:2]
    # risoluzione da nastro: meta' delle righe, contorni morbidi
    soft = arr(img(a).resize((w // 2, h // 2), Image.BILINEAR).resize((w, h), Image.BILINEAR))
    a = a * (1 - k) + soft * k
    if color:
        # colore sbavato e spostato a destra, neri sollevati
        y = lum(a)[..., None]
        chroma = arr(img((a - y) * 0.5 + 0.5).filter(ImageFilter.BoxBlur(6 * k))) * 2 - 1
        a = y + np.roll(chroma, int(5 * k + 0.5), axis=1) * (1 - 0.15 * k)
        a = a * (1 - 0.1 * k) + 0.05 * k
    # alone sui contorni, tipico dei videoregistratori
    a = arr(img(a).filter(ImageFilter.UnsharpMask(radius=3, percent=int(60 * k), threshold=0)))
    # righe che tremano
    shifts = np.round(rng.normal(0, 0.8 * k, h)).astype(int)
    a = np.stack([np.roll(a[i], shifts[i], axis=0) for i in range(h)])
    # niente banda di tracking: e' stata tolta (26 ottobre), dava fastidio
    # righe di scansione e disturbi
    a[::2] *= 1 - 0.1 * k
    a = a + rng.normal(0, 0.035 * k, (h, w, 1))
    for _ in range(12):
        yy, xx, ln = rng.integers(0, h), rng.integers(0, w - 300), rng.integers(40, 300)
        a[yy, xx:xx + ln] = np.clip(a[yy, xx:xx + ln] + 0.4 * k, 0, 1)
    return vignette(a, 0.35)


def osd(a, tint):
    im = img(a)
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(str(FONT), 60)
    for (x, y), text in [((112, 46), "PLAY"), ((70, 962), "OTT. 25 2026   23:47")]:
        d.text((x + 3, y + 3), text, font=f, fill=(0, 0, 0))
        d.text((x, y), text, font=f, fill=tint)
    d.polygon([(70, 62), (70, 102), (100, 82)], fill=tint)
    return arr(im)


def vhs(a):
    return osd(vhs_artifacts(a, True, 3), (236, 236, 236))


def vhs_verde(a):
    return osd(vhs_artifacts(verde(a), False, 5), (196, 248, 224))


def vhs_infrarosso(a):
    return osd(vhs_artifacts(infrarosso(a), False, 6), (232, 186, 194))


def fotocopia(a, seed=7):
    rng = np.random.default_rng(seed)
    h, w = a.shape[:2]
    l = lum(arr(img(a).filter(ImageFilter.GaussianBlur(0.8))))
    t = 1 / (1 + np.exp(-(l - 0.5) * 11))
    # toner: puntini neri sul chiaro, buchi bianchi nel nero
    speck = rng.random((h, w))
    t = np.where(speck < 0.010 * t, 0.0, t)
    t = np.where(speck > 1 - 0.008 * (1 - t), 1.0, t)
    t = arr(img(np.repeat(t[..., None], 3, -1)).filter(ImageFilter.GaussianBlur(0.6)))[..., 0]
    paper, ink = np.array([0.93, 0.91, 0.86]), np.array([0.07, 0.07, 0.08])
    out = ink + (paper - ink) * t[..., None]
    # striature verticali del rullo e ombra del coperchio sul bordo destro
    xx = np.arange(w, dtype=np.float32)
    streaks = 1 - 0.05 * (0.5 + 0.5 * np.sin(xx / w * np.pi * 9 + rng.random() * 6))
    out = out * streaks[None, :, None]
    edge = np.clip((xx / w - 0.93) / 0.07, 0, 1) ** 2
    out = out * (1 - 0.6 * edge)[None, :, None]
    return grain(out, 0.02, seed)


FILTERS = {"verde": verde, "verde_acido": verde_acido, "verde_retinato": verde_retinato, "verde_rosso": verde_rosso,
           "vhs": vhs, "vhs_verde": vhs_verde, "infrarosso": infrarosso, "vhs_infrarosso": vhs_infrarosso,
           "fotocopia": fotocopia}


def main():
    name, src, dst = sys.argv[1:4]
    a = arr(Image.open(src).convert("RGB").resize((W, H), Image.LANCZOS))
    img(FILTERS[name](a)).save(dst, quality=92)
    print(dst)


if __name__ == "__main__":
    main()
