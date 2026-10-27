#!/usr/bin/env python3
"""Le texture di plastilina per le stanze 3D (27 ottobre): da un'immagine generata (una superficie di plastilina vista
di fronte, vedi art/prove-stile/21-cucina-3d/texture/lavori.json) fa la texture che si ripete senza cuciture e la sua
mappa delle normali.

Uso: python3 tools/texture_creta.py <immagine.png> [--rilievo 3] [--saturazione 1] [--gia-ripetibile]

- Uniforme: le chiazze di luce larghe della foto (un lato piu' chiaro, un angolo piu' scuro) si appiattiscono, se no
  ripetendo la texture si vedrebbero a scacchiera.
- Ripetibile: l'immagine e la stessa spostata di mezzo lato si fondono, ognuna pesata con la distanza dalle sue
  cuciture (l'originale ce le ha ai bordi, quella spostata in mezzo). Con --gia-ripetibile si salta (le piastrelle,
  gia' a griglia).
- Saturazione: sotto 1 i colori si spengono verso il grigio (il muro generato e' troppo giallo).
- Le normali: il rilievo si ricava dalla luminosita' (i dettagli piccoli, senza le macchie larghe di colore) e le sue
  pendenze diventano la mappa delle normali, come quella delle impronte nella prova della cucina (rosso a destra,
  verde in su).
- Scrive accanto all'immagine <nome>.webp (il colore) e <nome>_n.webp (le normali).
"""
import argparse
import pathlib

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter


def uniforma(img, forza=0.75):
    """Toglie le variazioni di luminosita' piu' larghe di un sesto del lato, tenendo la media."""
    lato = img.shape[0]
    largo = gaussian_filter(img, sigma=(lato / 6, lato / 6, 0), mode="wrap")
    return img - (largo - img.mean(axis=(0, 1))) * forza


def ripetibile(img):
    h, w = img.shape[:2]
    spostata = np.roll(img, (h // 2, w // 2), axis=(0, 1))
    y = np.arange(h)[:, None] + 0.5
    x = np.arange(w)[None, :] + 0.5
    # distanza dalle cuciture: dell'originale (i bordi) e della spostata (le due linee di mezzo)
    do = np.minimum(np.minimum(x, w - x), np.minimum(y, h - y))
    ds = np.minimum(np.abs(x - w / 2), np.abs(y - h / 2))
    po, ps = do ** 2, ds ** 2
    t = (po / (po + ps + 1e-6))[..., None]
    return img * t + spostata * (1 - t)


def normali(img, rilievo):
    lum = img @ np.array([0.299, 0.587, 0.114])
    alto = gaussian_filter(lum, 1.0, mode="wrap") - gaussian_filter(lum, 18, mode="wrap")
    alto /= alto.std() + 1e-6
    dx = (np.roll(alto, -1, axis=1) - np.roll(alto, 1, axis=1)) * 0.5 * rilievo / 10
    dy = (np.roll(alto, -1, axis=0) - np.roll(alto, 1, axis=0)) * 0.5 * rilievo / 10
    n = np.stack([-dx, dy, np.ones_like(dx)], axis=-1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return (n * 0.5 + 0.5) * 255


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("immagine")
    ap.add_argument("--rilievo", type=float, default=3)
    ap.add_argument("--saturazione", type=float, default=1)
    ap.add_argument("--gia-ripetibile", action="store_true")
    a = ap.parse_args()
    src = pathlib.Path(a.immagine)
    img = np.asarray(Image.open(src).convert("RGB"), dtype=np.float64)
    if not a.gia_ripetibile:
        img = ripetibile(uniforma(img))
    grigio = (img @ np.array([0.299, 0.587, 0.114]))[..., None]
    colore = np.clip(grigio + (img - grigio) * a.saturazione, 0, 255).astype(np.uint8)
    Image.fromarray(colore).save(src.with_suffix(".webp"), quality=90, method=6)
    Image.fromarray(np.clip(normali(img, a.rilievo), 0, 255).astype(np.uint8)).save(
        src.with_name(src.stem + "_n.webp"), quality=92, method=6)
    print("ok", src.with_suffix(".webp").name, src.stem + "_n.webp")


if __name__ == "__main__":
    main()
