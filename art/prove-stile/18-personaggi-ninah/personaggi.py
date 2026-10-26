#!/usr/bin/env python3
"""Prova: i dettagli dei personaggi bruciati, confusi e offuscati come in NINAH, solo dentro le loro sagome.

Uso: python3 art/prove-stile/18-personaggi-ninah/personaggi.py

Nelle schermate di NINAH i personaggi hanno pochi toni piatti con un retino a puntini (posterizzazione con
dithering), una risoluzione bassa coi pixel che si vedono, un contrasto che brucia le luci e chiude le ombre, e
i colori virati (ombre blu-verdi, luci rosa). Qui le varianti, sulle scene del gioco (gioco/img) con le
maschere dei personaggi di tools/prepara_gioco.py, prima senza e poi con il VHS del gioco:
A bruciati, B confusi, C offuscati, D come NINAH (A + B), E come NINAH ma piu' leggero.
In NINAH pero' l'effetto copre tutta l'immagine: il foglio "tutta_la_scena" mette a confronto D ed E solo sui
personaggi e su tutta la scena.
Il retino usa una tavolozza di pochi colori presa dai personaggi stessi (k-means), come in NINAH, non tutti i
colori con pochi livelli (che fanno puntini colorati).
"""
import pathlib
import sys

import cv2
import numpy as np
from PIL import Image

QUI = pathlib.Path(__file__).resolve().parent
RADICE = QUI.parent.parent.parent
sys.path.insert(0, str(RADICE / "tools"))
import filtri  # noqa: E402
import prepara_gioco  # noqa: E402

W, H = 1600, 900
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) / 16 - 0.47


def lum(a):
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114


def brucia(a, k=7.0, dettaglio=1.1, viraggio=0.45):
    """Contrasto locale forte, curva a S che brucia le luci e chiude le ombre, ombre blu-verdi e luci rosa."""
    sfoc = cv2.GaussianBlur(a, (0, 0), 10)
    a = np.clip(a + (a - sfoc) * dettaglio, 0, 1)
    s0, s1 = 1 / (1 + np.exp(k * 0.5)), 1 / (1 + np.exp(-k * 0.5))
    a = (1 / (1 + np.exp(-k * (a - 0.5))) - s0) / (s1 - s0)
    l = lum(a)[..., None]
    ombra, luce = np.array([0.08, 0.2, 0.27], np.float32), np.array([1.0, 0.87, 0.85], np.float32)
    return np.clip(a * (1 - viraggio) + (ombra + (luce - ombra) * l) * viraggio, 0, 1)


def tavolozza(a, m, colori):
    """I colori piu' usati dai personaggi (k-means sui pixel dentro la maschera)."""
    px = a[m[..., 0] > 0.5].reshape(-1, 3).astype(np.float32)
    rng = np.random.default_rng(1)
    px = px[rng.choice(len(px), min(30000, len(px)), replace=False)]
    criteri = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 1e-3)
    _, _, centri = cv2.kmeans(px, colori, None, criteri, 3, cv2.KMEANS_PP_CENTERS)
    return centri


def confondi(a, m, pixel=3, colori=12, retino=0.1):
    """Risoluzione bassa coi pixel che si vedono, pochi colori e il retino a puntini (dithering ordinato)."""
    h, w = a.shape[:2]
    centri = tavolozza(a, m, colori)
    p = cv2.resize(a, (w // pixel, h // pixel), interpolation=cv2.INTER_AREA)
    soglia = np.tile(BAYER, (p.shape[0] // 4 + 1, p.shape[1] // 4 + 1))[:p.shape[0], :p.shape[1], None] * retino
    q = p + soglia
    vicino = np.argmin(((q[:, :, None, :] - centri[None, None]) ** 2).sum(-1), -1)
    return cv2.resize(centri[vicino], (w, h), interpolation=cv2.INTER_NEAREST)


def offusca(a, scala=3, sigma=0.8, eco=0.22):
    """Pochi dettagli: rimpicciolita e sfocata, con un'eco spostata come un nastro consumato."""
    h, w = a.shape[:2]
    p = cv2.GaussianBlur(cv2.resize(a, (w // scala, h // scala), interpolation=cv2.INTER_AREA), (0, 0), sigma)
    p = cv2.resize(p, (w, h), interpolation=cv2.INTER_LINEAR)
    return p * (1 - eco) + np.roll(p, 7, axis=1) * eco


VARIANTI = {
    "0 com'e' ora": lambda a, m: a,
    "A bruciati": lambda a, m: brucia(a),
    "B confusi": lambda a, m: confondi(a, m),
    "C offuscati": lambda a, m: offusca(a),
    "D come NINAH": lambda a, m: confondi(brucia(a, 6.0, 0.9, 0.5), m, 3, 10, 0.12),
    "E piu' leggero": lambda a, m: confondi(brucia(a, 4.5, 0.6, 0.3), m, 2, 16, 0.08),
}


def personaggi(nome):
    L = prepara_gioco.LUOGHI[nome]
    m = np.zeros((H, W), np.float32)
    for _, _, paths in L["persone"]:
        m = np.maximum(m, prepara_gioco.mask(paths, (W, H)))
    m = cv2.dilate(m, np.ones((3, 3), np.uint8))
    return cv2.GaussianBlur(m, (0, 0), 1.5)[..., None]


def gioco_vhs(a):
    # il VHS del gioco di giorno: la luce della videocamera e i difetti del nastro al 50%
    return filtri.vhs_artifacts(filtri.luce_videocamera(a), True, 3)


def foglio(immagini, titoli, colonne, larghezza):
    from PIL import ImageDraw, ImageFont
    font = ImageFont.truetype(str(RADICE / "art/prove-stile/03-schermate/font/VT323-Regular.ttf"), 40)
    h = round(immagini[0].shape[0] * larghezza / immagini[0].shape[1])
    righe = (len(immagini) + colonne - 1) // colonne
    out = Image.new("RGB", (colonne * larghezza + (colonne - 1) * 10, righe * h + (righe - 1) * 10), (12, 12, 12))
    d = ImageDraw.Draw(out)
    for i, (a, t) in enumerate(zip(immagini, titoli)):
        x, y = (i % colonne) * (larghezza + 10), (i // colonne) * (h + 10)
        out.paste(filtri.img(a).resize((larghezza, h), Image.LANCZOS), (x, y))
        d.text((x + 14, y + 8), t, font=font, fill=(255, 230, 120), stroke_width=3, stroke_fill=(0, 0, 0))
    return out


def confronto(nome, scena, m):
    """D ed E solo sui personaggi o su tutta la scena (stanza compresa), col VHS del gioco."""
    tutto = np.ones_like(m)
    prove = {
        "D solo personaggi": (VARIANTI["D come NINAH"], m),
        "D tutta la scena": (lambda a, mm: confondi(brucia(a, 6.0, 0.9, 0.5), mm, 3, 16, 0.12), tutto),
        "E solo personaggi": (VARIANTI["E piu' leggero"], m),
        "E tutta la scena": (lambda a, mm: confondi(brucia(a, 4.5, 0.6, 0.3), mm, 2, 24, 0.08), tutto),
    }
    con = [gioco_vhs(scena * (1 - mm) + effetto(scena, mm) * mm) for effetto, mm in prove.values()]
    foglio(con, list(prove), 2, 960).save(QUI / f"{nome}_tutta_la_scena.jpg", quality=88)


def main():
    for nome, testa in [("cucina", (360, 20, 700, 380)), ("soggiorno", (440, 40, 1120, 420))]:
        scena = filtri.arr(Image.open(RADICE / f"gioco/img/{nome}.jpg").resize((W, H)))
        m = personaggi(nome)
        con, senza, facce = [], [], []
        for titolo, effetto in VARIANTI.items():
            a = scena * (1 - m) + effetto(scena, m) * m
            senza.append(a)
            con.append(gioco_vhs(a))
            x0, y0, x1, y1 = testa
            facce.append(a[y0:y1, x0:x1])
        titoli = list(VARIANTI)
        foglio(con, titoli, 2, 960).save(QUI / f"{nome}_vhs.jpg", quality=88)
        foglio(senza, titoli, 2, 960).save(QUI / f"{nome}_senza_vhs.jpg", quality=88)
        foglio(facce, titoli, 3, 520).save(QUI / f"{nome}_facce.jpg", quality=90)
        confronto(nome, scena, m)
        print(nome, "ok")


if __name__ == "__main__":
    main()
