#!/usr/bin/env python3
"""Prova: meno dettagli sulla pelle dei personaggi (pori, rughe fini, macchie, chiazze rosse).

Uso: python3 art/prove-stile/19-pelle/pelle.py

Le maschere sono di SAM 3 (lavori in maschere/lavori.json): facce, colli e mani sono la pelle da lisciare,
occhi e bocche restano come sono. Varianti, sulle scene finite (art/scene/*/finale.jpg):
1 filtro: toglie la grana piu' piccola di qualche pixel (rolling guidance con un guided filter, che segue i
  contorni) tenendo un quarto del dettaglio, e uniforma i colori della pelle (spariscono chiazze e macchie). La
  scala segue la grandezza di ogni faccia o mano: una faccia piccola sullo sfondo non deve diventare una macchia;
2 ritocco con l'AI: Nano Banana Pro rifa' la pelle piu' semplice (lavori in ai/lavori.json), e si prende solo
  la pelle, dentro le stesse maschere (prima riallineata con tools/allinea.py: si spostava di un paio di pixel);
3 AI + filtro: il filtro, piu' leggero, sopra il ritocco con l'AI.
I fogli: le facce e le mani al 100% senza VHS, e le scene intere col VHS del gioco.
"""
import glob
import pathlib
import sys

import cv2
import numpy as np
from PIL import Image

QUI = pathlib.Path(__file__).resolve().parent
RADICE = QUI.parent.parent.parent
sys.path.insert(0, str(RADICE / "tools"))
import filtri  # noqa: E402

SCENE = {
    # scena: cartella, riquadri delle facce da mostrare al 100% (sull'immagine 1920x1080)
    "cucina": ("01-cucina", [(470, 60, 830, 420), (860, 230, 1000, 370)]),
    "soggiorno": ("02-soggiorno", [(560, 200, 920, 560), (860, 150, 1140, 510), (1080, 80, 1440, 440)]),
}
# le parti di pelle da lisciare (gambe e piedi ci sono solo nella camera, dove la madre e' scalza)
PELLE = ["face", "neck", "hand", "leg", "foot"]
# le mani al 100%: erano la parte piu' piena di dettagli (vene, rughe, sporco)
MANI = {"cucina": (400, 760, 780, 1010), "soggiorno": (1180, 640, 1560, 890)}


def maschera(scena, parti, forma):
    m = np.zeros(forma, np.float32)
    for x in istanze(scena, parti, forma):
        m = np.maximum(m, x)
    return m


def istanze(scena, parti, forma):
    """Le maschere di SAM 3 una per una: una faccia, una mano, un collo."""
    out = []
    for p in parti:
        for f in sorted(glob.glob(str(QUI / f"maschere/{scena}_{p}_maschera*.png"))):
            x = Image.open(f).convert("L").resize((forma[1], forma[0]))
            out.append(np.asarray(x, np.float32) / 255)
    return out


def guidato(guida, src, r, eps):
    """Guided filter (He et al.): liscia src seguendo i contorni di guida."""
    box = lambda x: cv2.boxFilter(x, -1, (2 * r + 1, 2 * r + 1))  # noqa: E731
    mi, mp = box(guida), box(src)
    var = box(guida * guida) - mi * mi
    cov = box(guida * src) - mi * mp
    a = cov / (var + eps)
    b = mp - a * mi
    return box(a) * guida + box(b)


def liscia(l, scala, r, eps, giri=4):
    """Toglie le strutture piu' piccole di "scala" pixel tenendo i contorni grandi (rolling guidance)."""
    j = cv2.GaussianBlur(l, (0, 0), scala)
    for _ in range(giri):
        j = guidato(j, l, r, eps)
    return j


def pelle(a, m, tieni, scala):
    """La pelle con meno dettagli: luminosita' lisciata (tenendo una parte del dettaglio) e colori uniformati."""
    lab = cv2.cvtColor(a, cv2.COLOR_RGB2LAB)
    l = lab[..., 0] / 100
    base = liscia(l, scala, max(2, round(2.5 * scala)), 0.008)
    l2 = base + (l - base) * tieni
    # i colori: la media della pelle attorno, pesata dalla maschera (cosi' non entrano i colori dei vestiti)
    s = 2.5 * scala + 2
    media = cv2.GaussianBlur(lab[..., 1:] * m[..., None], (0, 0), s) / (cv2.GaussianBlur(m, (0, 0), s) + 1e-4)[..., None]
    out = np.dstack([l2 * 100, media]).astype(np.float32)
    return np.clip(cv2.cvtColor(out, cv2.COLOR_LAB2RGB), 0, 1)


def filtro(a, scena, forza, tieni):
    """Liscia la pelle una faccia (o mano, o collo) alla volta, con la scala che segue la sua grandezza."""
    forma = a.shape[:2]
    occhi = maschera(scena, ["eye", "mouth"], forma)
    occhi = cv2.GaussianBlur(cv2.dilate(occhi, np.ones((5, 5), np.uint8)), (0, 0), 2)
    out = a.copy()
    for m in istanze(scena, PELLE, forma):
        ys, xs = np.nonzero(m > 0.5)
        if len(ys) < 50:
            continue
        scala = max(0.6, forza * np.sqrt(len(ys)) / 100)  # una faccia grande in primo piano: circa 150 pixel
        bordo = round(12 * scala) + 12
        y0, y1 = max(0, ys.min() - bordo), min(forma[0], ys.max() + bordo)
        x0, x1 = max(0, xs.min() - bordo), min(forma[1], xs.max() + bordo)
        pezzo, mm = out[y0:y1, x0:x1], m[y0:y1, x0:x1]
        w = cv2.GaussianBlur(mm, (0, 0), 1 + 0.5 * scala) * (1 - 0.85 * occhi[y0:y1, x0:x1])
        out[y0:y1, x0:x1] = pezzo * (1 - w[..., None]) + pelle(pezzo, mm, tieni, scala) * w[..., None]
    return np.clip(out, 0, 1)


def importanza(base, mm, scala, s0, s1):
    """Dove sono i tratti che contano (sopracciglia, naso, bocca, pieghe profonde): i contorni forti che restano
    nella pelle lisciata, dove la grana fine non arriva."""
    b = cv2.GaussianBlur(base, (0, 0), 0.6 + 0.25 * scala)
    g = np.hypot(cv2.Sobel(b, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(b, cv2.CV_32F, 0, 1, ksize=3)) / 8
    g *= scala  # a parita' di contrasto, su una faccia piccola il contorno e' piu' ripido
    t = np.clip((g - s0) / (s1 - s0), 0, 1)
    # e i buchi scuri: la bocca aperta, le narici, le occhiaie (piu' scuri della pelle attorno anche dopo il filtro)
    buio = np.clip((cv2.GaussianBlur(base, (0, 0), 4 * scala) - base - 0.06) / 0.1, 0, 1)
    t = np.maximum(t, buio)
    t = t * t * (3 - 2 * t)
    t = cv2.GaussianBlur(cv2.dilate(t, np.ones((3, 3), np.uint8)), (0, 0), 0.5 + 0.3 * scala)
    # il bordo della faccia non conta: li' il contorno e' tra la pelle e i capelli o lo sfondo
    dentro = cv2.erode((mm > 0.5).astype(np.uint8), np.ones((3, 3), np.uint8), iterations=max(1, round(1.5 * scala)))
    return t * cv2.GaussianBlur(dentro.astype(np.float32), (0, 0), 1 + 0.5 * scala)


def pelle_pulita(a, mm, scala, minimo, s0, s1, grana, seme):
    """Come pelle(), ma piu' pulita: sulla pelle liscia resta pochissimo dettaglio, sui tratti che contano quasi
    tutto; sopra, una grana finissima e uguale, perche' la pelle non sembri di cera."""
    lab = cv2.cvtColor(a, cv2.COLOR_RGB2LAB)
    l = lab[..., 0] / 100
    base = liscia(l, scala, max(2, round(2.5 * scala)), 0.01)
    imp = importanza(base, mm, scala, s0, s1)
    l2 = base + (l - base) * (minimo + (1 - minimo) * imp)
    rumore = np.random.default_rng(seme).normal(0, 1, l.shape).astype(np.float32)
    l2 += cv2.GaussianBlur(rumore, (0, 0), 0.7) * grana * (1 - imp)
    s = 2.5 * scala + 2
    ab = lab[..., 1:]
    media = cv2.GaussianBlur(ab * mm[..., None], (0, 0), s) / (cv2.GaussianBlur(mm, (0, 0), s) + 1e-4)[..., None]
    out = np.dstack([l2 * 100, media + (ab - media) * (0.45 * imp)[..., None]]).astype(np.float32)
    return np.clip(cv2.cvtColor(out, cv2.COLOR_LAB2RGB), 0, 1)


def pulito(a, scena, forza=2.6, minimo=0.08, s0=0.05, s1=0.12, grana=0.006):
    """Il filtro 1 piu' pulito, una faccia (o mano, collo, gamba, piede) alla volta."""
    forma = a.shape[:2]
    occhi = maschera(scena, ["eye", "mouth"], forma)
    occhi = cv2.GaussianBlur(cv2.dilate(occhi, np.ones((5, 5), np.uint8)), (0, 0), 2)
    out = a.copy()
    for i, m in enumerate(istanze(scena, PELLE, forma)):
        ys, xs = np.nonzero(m > 0.5)
        if len(ys) < 50:
            continue
        # le facce piccole, lontane, si lisciano meno: la grana li' non si vede, e la bocca diventerebbe una macchia
        lato = np.sqrt(len(ys))
        scala = max(0.6, forza * lato / 100 * np.clip(lato / 80, 0.5, 1))
        bordo = round(12 * scala) + 12
        y0, y1 = max(0, ys.min() - bordo), min(forma[0], ys.max() + bordo)
        x0, x1 = max(0, xs.min() - bordo), min(forma[1], xs.max() + bordo)
        pezzo, mm = out[y0:y1, x0:x1], m[y0:y1, x0:x1]
        w = cv2.GaussianBlur(mm, (0, 0), 1 + 0.5 * scala) * (1 - 0.85 * occhi[y0:y1, x0:x1])
        liscio = pelle_pulita(pezzo, mm, scala, minimo, s0, s1, grana, i)
        out[y0:y1, x0:x1] = pezzo * (1 - w[..., None]) + liscio * w[..., None]
    return np.clip(out, 0, 1)


def ai(scena, a):
    """Il ritocco di Nano Banana Pro, preso solo dentro la pelle (occhi e bocche restano gli originali)."""
    f = QUI / f"ai/{scena}_nb_allineata.jpg"  # riallineata con tools/allinea.py
    if not f.exists():
        return None
    forma = a.shape[:2]
    b = np.asarray(Image.open(f).convert("RGB").resize((forma[1], forma[0]), Image.LANCZOS), np.float32) / 255
    occhi = maschera(scena, ["eye", "mouth"], forma)
    occhi = cv2.GaussianBlur(cv2.dilate(occhi, np.ones((5, 5), np.uint8)), (0, 0), 2)
    w = (cv2.GaussianBlur(maschera(scena, ["face", "neck", "hand"], forma), (0, 0), 2) * (1 - 0.6 * occhi))[..., None]
    return a * (1 - w) + b * w


def varianti(scena, a):
    v = {"0 com'e' ora": a, "1 filtro": filtro(a, scena, 2.0, 0.25)}
    b = ai(scena, a)
    if b is not None:
        v["2 ritocco con l'AI"] = b
        v["3 AI + filtro"] = filtro(b, scena, 1.4, 0.4)
    return v


def gioco_vhs(a):
    # come nel gioco di giorno: 1600x900, la luce della videocamera e i difetti del nastro al 50%
    a = cv2.resize(a, (1600, 900), interpolation=cv2.INTER_AREA)
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


def main():
    mani = []
    for scena, (cartella, facce) in SCENE.items():
        a = filtri.arr(Image.open(RADICE / f"art/scene/{cartella}/finale.jpg").convert("RGB"))
        v = varianti(scena, a)
        titoli = list(v)
        # le facce al 100%, una riga per variante
        righe = []
        for t in titoli:
            pezzi = [v[t][y0:y1, x0:x1] for x0, y0, x1, y1 in facce]
            alto = max(p.shape[0] for p in pezzi)
            pezzi = [cv2.resize(p, (round(p.shape[1] * alto / p.shape[0]), alto)) for p in pezzi]
            righe.append(np.concatenate(pezzi, axis=1))
        foglio(righe, titoli, 1 if len(facce) > 2 else 2, 1080 if len(facce) > 2 else 760).save(
            QUI / f"{scena}_facce.jpg", quality=92)
        foglio([gioco_vhs(x) for x in v.values()], titoli, 2, 960).save(QUI / f"{scena}_vhs.jpg", quality=88)
        x0, y0, x1, y1 = MANI[scena]
        mani += [(x[y0:y1, x0:x1], t if scena == "cucina" else "") for t, x in v.items()]
        print(scena, "ok", len(v), "varianti")
    foglio([m for m, _ in mani], [t for _, t in mani], len(mani) // 2, 380).save(QUI / "mani.jpg", quality=92)


if __name__ == "__main__":
    main()
