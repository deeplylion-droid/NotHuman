#!/usr/bin/env python3
"""Prova: i personaggi con meno dettagli, ma senza sfocarli ne' rovinare l'immagine (26 ottobre).

Uso: python3 art/prove-stile/20-meno-dettagli/meno_dettagli.py

Il filtro della pelle di 19-pelle toglieva i dettagli ma sfocava e appiattiva le facce. Qui altre tecniche, sui
personaggi delle tre scene del prototipo (cucina, soggiorno e la camera della madre, che e' di notte).

La migliore: rimpicciolire la scena (a 960 o a 640 punti di larghezza: pori, rughe fini e macchie spariscono) e
ingrandirla di nuovo con Real-ESRGAN (fal-ai/esrgan, lavori in esrgan/lavori.json), che ridisegna i contorni
nitidi ma non puo' reinventare i dettagli piccoli. Si prende solo dentro le sagome dei personaggi (la stanza resta
com'e'), e i colori e le luci d'insieme restano quelli dell'originale: dell'originale si tiene la parte sfocata
(sopra gli 8 pixel), di Real-ESRGAN solo il dettaglio. Varianti:
- leggera: da 960, modello RealESRGAN_x2plus;
- forte: da 640, modello RealESRGAN_x4plus;
- disegnata: da 640, modello RealESRGAN_x4plus_anime_6B (ombre piatte e contorni scuri, quasi a fumetto).

Le altre tecniche provate, scartate (altre_tecniche.jpg): chiusura e apertura morfologica, filtro di Kuwahara,
mediana, mean shift, variazione totale, non-local means, filtro laplaciano locale, rimpicciolire e ingrandire
con Lanczos e un po' di nitidezza. O lasciano le rughe (sono contorni forti anche loro, e i filtri che rispettano i
contorni le tengono), o sfocano, o fanno l'effetto pittura. La variazione totale viene da scikit-image
(pip install scikit-image).

Il 26 ottobre ne sono state tenute cinque per un questionario di approvazione (immagini in questionario/, sui tre
del soggiorno, ogni tecnica solo sui personaggi): non-local means 10, variazione totale 0,06, Kuwahara r5,
Real-ESRGAN x4plus da 640 e Real-ESRGAN anime da 640.

Fogli: facce.jpg e mani.jpg (al 100%, senza VHS), cucina_vhs.jpg e soggiorno_vhs.jpg (col VHS del gioco di
giorno), camera_notte.jpg (col VHS verde, senza scritte) e la madre ingrandita, camera_notte_madre.jpg.
"""
import pathlib
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

QUI = pathlib.Path(__file__).resolve().parent
RADICE = QUI.parent.parent.parent
sys.path.insert(0, str(RADICE / "tools"))
import filtri  # noqa: E402
import prepara_gioco  # noqa: E402

W, H = 1920, 1080
SCENE = {"cucina": "01-cucina", "soggiorno": "02-soggiorno", "camera": "03-camera"}
VARIANTI = {"leggera": "960_esrgan", "forte": "640_esrgan", "disegnata": "640_anime"}
# facce e mani da guardare al 100% (sull'immagine 1920x1080)
FACCE = [("cucina", (470, 60, 830, 420)), ("soggiorno", (560, 200, 920, 560)), ("soggiorno", (860, 150, 1140, 510)),
         ("soggiorno", (1080, 80, 1440, 440)), ("camera", (980, 200, 1340, 560))]
MANI = [("cucina", (400, 760, 780, 1010)), ("soggiorno", (1180, 640, 1560, 890)), ("camera", (1050, 760, 1430, 1010))]


def carica(f):
    return np.asarray(Image.open(f).convert("RGB").resize((W, H), Image.LANCZOS), np.float32) / 255


def personaggi(scena):
    m = np.zeros((H, W), np.float32)
    for _, _, paths in prepara_gioco.LUOGHI[scena]["persone"]:
        m = np.maximum(m, prepara_gioco.mask(paths, (W, H)))
    m = cv2.dilate(m, np.ones((5, 5), np.uint8))
    return cv2.GaussianBlur(m, (0, 0), 1.5)[..., None]


def con_esrgan(a, b, m, sigma=8):
    """Il dettaglio di Real-ESRGAN con i colori e le luci d'insieme dell'originale, solo sui personaggi."""
    b = b + cv2.GaussianBlur(a, (0, 0), sigma) - cv2.GaussianBlur(b, (0, 0), sigma)
    return a * (1 - m) + np.clip(b, 0, 1) * m


def varianti(scena):
    a = carica(RADICE / f"art/scene/{SCENE[scena]}/finale.jpg")
    m = personaggi(scena)
    v = {"0 com'e' ora": a}
    for t, f in VARIANTI.items():
        v[t] = con_esrgan(a, carica(QUI / f"esrgan/{scena}_{f}.jpg"), m)
    return v


# ---------- le altre tecniche, scartate ----------

def morfologia(a, r=2):
    lab = cv2.cvtColor(a, cv2.COLOR_RGB2LAB)
    for ch in range(3):
        x = lab[..., ch]
        for k in range(1, r + 1):
            se = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * k + 1, 2 * k + 1))
            x = cv2.morphologyEx(cv2.morphologyEx(x, cv2.MORPH_CLOSE, se), cv2.MORPH_OPEN, se)
        lab[..., ch] = x
    return np.clip(cv2.cvtColor(lab, cv2.COLOR_LAB2RGB), 0, 1)


def kuwahara(a, r=4, settori=8, q=8):
    yy, xx = np.mgrid[-r:r + 1, -r:r + 1].astype(np.float32)
    ang, dist = np.arctan2(yy, xx), np.hypot(yy, xx)
    g = np.exp(-dist ** 2 / (2 * (r / 2) ** 2)) * (dist <= r)
    num, den = np.zeros_like(a), np.zeros(a.shape[:2], np.float32)
    for i in range(settori):
        d = np.angle(np.exp(1j * (ang - 2 * np.pi * i / settori)))
        w = cv2.GaussianBlur((g * (np.abs(d) <= np.pi / settori + 1e-6)).astype(np.float32), (0, 0), 1.0) * g
        w /= w.sum()
        media = cv2.filter2D(a, -1, w)
        var = (cv2.filter2D(a * a, -1, w) - media * media).sum(-1).clip(0)
        peso = 1 / (1e-6 + var ** (q / 2) * 1e8)
        num += media * peso[..., None]
        den += peso
    return np.clip(num / den[..., None], 0, 1)


def u8(a):
    return cv2.cvtColor((a * 255 + 0.5).astype(np.uint8), cv2.COLOR_RGB2BGR)


def f32(b):
    return cv2.cvtColor(b, cv2.COLOR_BGR2RGB).astype(np.float32) / 255


def laplaciano_locale(x, sigma_r, alfa, livelli=6, riferimenti=16):
    """Filtro laplaciano locale (Paris et al. 2011, nella versione veloce di Aubry et al. 2014): abbassa il
    contrasto delle differenze piu' piccole di sigma_r e lascia stare i contorni forti."""
    def gauss(y):
        p = [y]
        for _ in range(livelli - 1):
            p.append(cv2.pyrDown(p[-1]))
        return p

    def lap(y):
        g = gauss(y)
        return [g[i] - cv2.pyrUp(g[i + 1], dstsize=g[i].shape[::-1]) for i in range(livelli - 1)] + [g[-1]]

    G = gauss(x)
    out = [np.zeros_like(g) for g in G]
    rif = np.linspace(float(x.min()), float(x.max()), riferimenti)
    passo = max(1e-6, rif[1] - rif[0])
    for v in rif:
        d = x - v
        ad = np.abs(d)
        y = np.where(ad <= sigma_r, v + np.sign(d) * sigma_r * (ad / sigma_r) ** alfa, x).astype(np.float32)
        L = lap(y)
        for k in range(livelli - 1):
            out[k] += np.clip(1 - np.abs(G[k] - v) / passo, 0, 1) * L[k]
    y = G[-1]
    for k in range(livelli - 2, -1, -1):
        y = cv2.pyrUp(y, dstsize=out[k].shape[::-1]) + out[k]
    return y


def llf(a, sigma_r=0.16, alfa=4.0):
    lab = cv2.cvtColor(a, cv2.COLOR_RGB2LAB)
    lab[..., 0] = laplaciano_locale(lab[..., 0] / 100, sigma_r, alfa) * 100
    return np.clip(cv2.cvtColor(lab, cv2.COLOR_LAB2RGB), 0, 1)


def piccola_nitida(a, w=640):
    p = cv2.resize(a, (w, w * a.shape[0] // a.shape[1]), interpolation=cv2.INTER_AREA)
    g = cv2.resize(p, (a.shape[1], a.shape[0]), interpolation=cv2.INTER_LANCZOS4)
    return np.clip(g + (g - cv2.GaussianBlur(g, (0, 0), 1.6)), 0, 1)


def nlm(a, h=10):
    """Non-local means: toglie la grana come un riduttore di rumore, mediando i pezzetti simili dell'immagine."""
    return f32(cv2.fastNlMeansDenoisingColored(u8(a), None, h, h, 7, 21))


def tv(a, peso=0.06):
    """Variazione totale: appiattisce le variazioni piccole e lascia i salti netti."""
    from skimage.restoration import denoise_tv_chambolle
    return denoise_tv_chambolle(a, weight=peso, channel_axis=-1).astype(np.float32)


def altre(a):
    return {
        "0 com'e' ora": a,
        "morfologia": morfologia(a),
        "kuwahara": kuwahara(a),
        "mediana": f32(cv2.medianBlur(u8(a), 5)),
        "mean shift": f32(cv2.pyrMeanShiftFiltering(u8(a), 6, 25)),
        "variaz. totale": tv(a, 0.15),
        "non-local means": nlm(a, 20),
        "laplaciano loc.": llf(a),
        "piccola+nitida": piccola_nitida(a),
    }


# ---------- il questionario: le tecniche tenute, una per immagine, sui tre del soggiorno ----------

QUESTIONARIO = (620, 60, 1400, 520)


def questionario():
    a = carica(RADICE / "art/scene/02-soggiorno/finale.jpg")
    m = personaggi("soggiorno")
    x0, y0, x1, y1 = QUESTIONARIO
    X0, Y0, X1, Y1 = max(0, x0 - 40), max(0, y0 - 40), min(W, x1 + 40), min(H, y1 + 40)
    zona, mz = a[Y0:Y1, X0:X1], m[Y0:Y1, X0:X1]

    def solo_personaggi(f):
        out = zona * (1 - mz) + f(zona) * mz
        return out[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0]

    prove = {
        "0_ora": a[y0:y1, x0:x1],
        "1_nlm": solo_personaggi(lambda z: nlm(z, 10)),
        "2_tv": solo_personaggi(lambda z: tv(z, 0.06)),
        "3_kuwahara": solo_personaggi(lambda z: kuwahara(z, 5)),
        "4_esrgan": con_esrgan(a, carica(QUI / "esrgan/soggiorno_640_esrgan.jpg"), m)[y0:y1, x0:x1],
        "5_anime": con_esrgan(a, carica(QUI / "esrgan/soggiorno_640_anime.jpg"), m)[y0:y1, x0:x1],
    }
    (QUI / "questionario").mkdir(exist_ok=True)
    for nome, x in prove.items():
        filtri.img(x).save(QUI / f"questionario/{nome}.jpg", quality=93)


# ---------- la tecnica approvata (Real-ESRGAN x4plus da 640) con occhi e bocche originali ----------

MASCHERE_VISO = RADICE / "art/prove-stile/19-pelle/maschere"
# le bocche che SAM 3 non trova (nemmeno come "lips" o "teeth"): quella della figlia, troppo piccola;
# ellisse (cx, cy, rx, ry) sull'immagine 1920x1080
A_MANO = {"cucina": [(935, 330, 12, 7)]}


def occhi_bocca(scena):
    """Dove tenere l'originale: occhi e bocche (maschere di SAM 3 da 19-pelle), allargati in proporzione alla loro
    grandezza per prendere anche palpebre, occhiaie rosse e labbra, coi bordi sfumati."""
    pezzi = [np.asarray(Image.open(f).convert("L").resize((W, H)), np.float32) / 255
             for p in ("eye", "mouth") for f in sorted(MASCHERE_VISO.glob(f"{scena}_{p}_maschera*.png"))]
    for cx, cy, rx, ry in A_MANO.get(scena, []):
        e = np.zeros((H, W), np.float32)
        pezzi.append(cv2.ellipse(e, (cx, cy), (rx, ry), 0, 0, 360, 1.0, -1))
    m = np.zeros((H, W), np.float32)
    for x in pezzi:
        r = max(2, round(np.sqrt((x > 0.5).sum()) * 0.25))
        x = cv2.dilate(x, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1)))
        m = np.maximum(m, cv2.GaussianBlur(x, (0, 0), max(1.0, r * 0.5)))
    return m[..., None]


def approvata(scena):
    """Com'e' ora, la tecnica approvata, e la stessa con occhi e bocche originali."""
    a = carica(RADICE / f"art/scene/{SCENE[scena]}/finale.jpg")
    b = con_esrgan(a, carica(QUI / f"esrgan/{scena}_640_esrgan.jpg"), personaggi(scena))
    ob = occhi_bocca(scena)
    return {"0 com'e' ora": a, "approvata": b, "occhi e bocca originali": b * (1 - ob) + a * ob}


# le facce da guardare, piu' la figlia sulla porta (piccola: si ingrandisce)
FACCE_OB = FACCE + [("cucina", (880, 255, 985, 360))]


def fogli_occhi_bocca():
    v = {s: approvata(s) for s in SCENE}
    titoli = list(v["cucina"])
    immagini, scritte = [], []
    for i, (s, (x0, y0, x1, y1)) in enumerate(FACCE_OB):
        for t in titoli:
            immagini.append(cv2.resize(v[s][t][y0:y1, x0:x1], (380, 380), interpolation=cv2.INTER_CUBIC))
            scritte.append(t if i == 0 else "")
    foglio(immagini, scritte, 3, 380).save(QUI / "occhi_bocca_facce.jpg", quality=92)
    x0, y0, x1, y1 = QUESTIONARIO
    foglio([x[y0:y1, x0:x1] for x in v["soggiorno"].values()], titoli, 1, 780).save(
        QUI / "occhi_bocca_soggiorno.jpg", quality=92)


# ---------- i fogli ----------

def foglio(immagini, titoli, colonne, larghezza, corpo=36):
    font = ImageFont.truetype(str(RADICE / "art/prove-stile/03-schermate/font/VT323-Regular.ttf"), corpo)
    h = round(immagini[0].shape[0] * larghezza / immagini[0].shape[1])
    righe = (len(immagini) + colonne - 1) // colonne
    out = Image.new("RGB", (colonne * larghezza + (colonne - 1) * 8, righe * h + (righe - 1) * 8), (12, 12, 12))
    d = ImageDraw.Draw(out)
    for i, (a, t) in enumerate(zip(immagini, titoli)):
        x, y = (i % colonne) * (larghezza + 8), (i // colonne) * (h + 8)
        out.paste(filtri.img(a).resize((larghezza, h), Image.LANCZOS), (x, y))
        if t:
            d.text((x + 10, y + 6), t, font=font, fill=(255, 230, 120), stroke_width=3, stroke_fill=(0, 0, 0))
    return out


def vhs_giorno(a):
    a = cv2.resize(a, (1600, 900), interpolation=cv2.INTER_AREA)
    return filtri.vhs_artifacts(filtri.luce_videocamera(a), True, 3)


def vhs_notte(a):
    a = cv2.resize(a, (1600, 900), interpolation=cv2.INTER_AREA)
    return filtri.vhs_artifacts(filtri.verde(a), False, 5)


def main():
    v = {s: varianti(s) for s in SCENE}
    titoli = list(v["cucina"])
    for nome, pezzi in [("facce", FACCE), ("mani", MANI)]:
        immagini, scritte = [], []
        for i, (s, (x0, y0, x1, y1)) in enumerate(pezzi):
            for t in titoli:
                immagini.append(v[s][t][y0:y1, x0:x1])
                scritte.append(t if i == 0 else "")
        foglio(immagini, scritte, len(titoli), 380).save(QUI / f"{nome}.jpg", quality=92)
    for s in ["cucina", "soggiorno"]:
        foglio([vhs_giorno(x) for x in v[s].values()], titoli, 2, 960).save(QUI / f"{s}_vhs.jpg", quality=88)
    notte = [vhs_notte(x) for x in v["camera"].values()]
    foglio(notte, titoli, 2, 960).save(QUI / "camera_notte.jpg", quality=88)
    # la madre di notte, ingrandita (sull'immagine 1600x900)
    foglio([x[120:760, 680:1130] for x in notte], titoli, 4, 450).save(QUI / "camera_notte_madre.jpg", quality=90)
    # le altre tecniche, sulle facce (con un po' di margine attorno, per i filtri)
    immagini, scritte = [], []
    for i, (s, (x0, y0, x1, y1)) in enumerate(FACCE):
        a = v[s]["0 com'e' ora"]
        X0, Y0, X1, Y1 = max(0, x0 - 40), max(0, y0 - 40), min(W, x1 + 40), min(H, y1 + 40)
        for t, x in altre(a[Y0:Y1, X0:X1]).items():
            immagini.append(x[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0])
            scritte.append(t if i == 0 else "")
    foglio(immagini, scritte, 9, 300, 30).save(QUI / "altre_tecniche.jpg", quality=90)
    questionario()
    fogli_occhi_bocca()
    print("ok")


if __name__ == "__main__":
    main()
