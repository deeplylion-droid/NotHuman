#!/usr/bin/env python3
"""Le texture degli effetti dei colpi, disegnate qui (niente AI): le crepe che il pugno lascia sul legno (decal: colore
con la trasparenza e le normali, tre varianti) e lo sbuffo di polvere (una macchia morbida e irregolare).

Uso: python3 porte/strumenti/texture_effetti.py   (scrive in porte/progetto/texture/effetti)
"""
import math
import pathlib
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

USCITA = pathlib.Path(__file__).resolve().parent.parent / "progetto" / "texture" / "effetti"
LATO = 512


def crepa(seme):
    """Un'ammaccatura scura al centro, le crepe che partono e si ramificano lungo la venatura (piu' lunghe in
    verticale: il legno si spacca per il lungo), qualche scheggia chiara sollevata."""
    rnd = random.Random(seme)
    alfa = Image.new("L", (LATO, LATO), 0)
    alto = Image.new("L", (LATO, LATO), 128)  # l'altezza, per le normali: le crepe sono solchi
    d, h = ImageDraw.Draw(alfa), ImageDraw.Draw(alto)
    c = LATO / 2

    def ramo(x, y, ang, lung, larg, liv):
        passi = max(3, int(lung / 9))
        for _ in range(passi):
            ang += rnd.uniform(-0.45, 0.45)
            ang = math.atan2(math.sin(ang), math.cos(ang))
            # la venatura e' verticale: le crepe tendono a girare verso l'alto o il basso (verso il piu' vicino)
            ang += (math.copysign(math.pi / 2, math.sin(ang) or 1.0) - ang) * 0.12
            nx, ny = x + math.cos(ang) * lung / passi, y + math.sin(ang) * lung / passi
            d.line([(x, y), (nx, ny)], fill=255, width=max(1, int(larg)))
            h.line([(x, y), (nx, ny)], fill=20, width=max(1, int(larg)))
            if liv > 0 and rnd.random() < 0.18:
                ramo(nx, ny, ang + rnd.choice([-1, 1]) * rnd.uniform(0.5, 1.1), lung * 0.45, larg * 0.6, liv - 1)
            x, y = nx, ny
            larg = max(1.0, larg * 0.9)

    for i in range(rnd.randint(5, 8)):
        ang = i / 6 * math.tau + rnd.uniform(-0.4, 0.4)
        ramo(c + rnd.uniform(-8, 8), c + rnd.uniform(-8, 8), ang, rnd.uniform(90, 210), rnd.uniform(4, 7), 2)
    # l'ammaccatura: un'ombra rotonda che sfuma, schiacciata
    yy, xx = np.mgrid[0:LATO, 0:LATO].astype(np.float32)
    r = np.sqrt(((xx - c) / 1.0) ** 2 + ((yy - c) / 1.25) ** 2) / (LATO * 0.16)
    ammacco = np.clip(1 - r, 0, 1) ** 1.5
    a = np.maximum(np.asarray(alfa, np.float32) / 255, ammacco * 0.85)
    a = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)), np.float32) / 255
    # il colore: legno scuro nelle crepe, appena piu' chiaro ai bordi (fibre strappate)
    bordo = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)), np.float32) / 255
    rgb = np.zeros((LATO, LATO, 3), np.float32)
    scuro, chiaro = np.array([28, 18, 12]), np.array([170, 130, 92])
    rgb[:] = scuro
    fibra = np.clip(bordo - a, 0, 1)[..., None]
    rgb = rgb * (1 - fibra) + chiaro * fibra
    alfa_fin = np.clip(a + fibra[..., 0] * 0.6, 0, 1)
    colore = np.dstack([rgb, alfa_fin * 255]).astype(np.uint8)
    # le normali dall'altezza (solchi delle crepe e conca dell'ammaccatura)
    alt = np.asarray(alto.filter(ImageFilter.GaussianBlur(1.5)), np.float32) / 255 - ammacco * 0.5
    gy, gx = np.gradient(alt)
    forza = 6.0
    n = np.dstack([-gx * forza, gy * forza, np.ones_like(alt)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    normali = ((n * 0.5 + 0.5) * 255).astype(np.uint8)
    return Image.fromarray(colore, "RGBA"), Image.fromarray(normali, "RGB")


def polvere(seme):
    """Uno sbuffo di polvere: una macchia morbida con i bordi irregolari (rumore a piu' scale)."""
    rnd = np.random.default_rng(seme)
    n = LATO // 2
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    r = np.sqrt((xx - n / 2) ** 2 + (yy - n / 2) ** 2) / (n / 2)
    rumore = np.zeros((n, n), np.float32)
    for scala, peso in ((8, 0.5), (16, 0.3), (32, 0.2)):
        piccolo = rnd.random((scala, scala)).astype(np.float32)
        rumore += np.asarray(Image.fromarray((piccolo * 255).astype(np.uint8)).resize((n, n), Image.BICUBIC), np.float32) / 255 * peso
    a = np.clip(1 - r * (0.85 + rumore * 0.45), 0, 1) ** 1.6
    a *= 0.55 + rumore * 0.45
    img = np.dstack([np.full((n, n), 255), np.full((n, n), 255), np.full((n, n), 255), a * 255]).astype(np.uint8)
    return Image.fromarray(img, "RGBA")


if __name__ == "__main__":
    USCITA.mkdir(parents=True, exist_ok=True)
    for i in range(3):
        col, nor = crepa(10 + i)
        col.save(USCITA / f"crepa_{i}.png")
        nor.save(USCITA / f"crepa_{i}_nor.png")
    polvere(3).save(USCITA / "polvere.png")
    print("scritte in", USCITA)
