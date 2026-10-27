"""La mappa di Malvento sulla scrivania (27 ottobre, sera: "e' semplice, ok, ma e' troppo poco curata. Oggetti
appoggiati sopra? Una macchia di caffe'? Piu' contrasto e colore?").

Parte dalla pianta schematica (art/scrivania/mappa_pianta/schematica.jpg): le case restano esattamente dove sono
(TETTI in gioco/js/dati.js), cambia solo come e' stampata e cosa c'e' sopra.
- Piu' colore e contrasto: i tetti color coppo, i campi verdi, il fiume blu, l'inchiostro piu' scuro, e la luce
  della lampada che viene da sinistra.
- La carta: la grana, le pieghe di quando stava piegata in quattro, un angolo piegato e i bordi consumati.
- Gli aloni del caffe' e gli oggetti appoggiati (art/scrivania/mappa_oggetti: tazzina, matita rossa, gomma, graffette,
  fiammiferi), sui campi, sul fiume e sui bordi, mai sulle case, con la loro ombra.

Uso: python3 tools/mappa.py [uscita.jpg]   (di base gioco/img/mappa.jpg)
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

RADICE = Path(__file__).resolve().parent.parent
BASE = RADICE / "art/scrivania/mappa_pianta/schematica.jpg"
OGGETTI = RADICE / "art/scrivania/mappa_oggetti"
USCITA = RADICE / "gioco/img/mappa.jpg"
W, H = 2560, 1440

# i colori della pianta e quelli nuovi: ogni pixel si sposta come il colore della pianta piu' vicino, cosi' i bordi
# sfumati e l'inchiostro restano com'erano
TAVOLOZZA = [
    ((248, 232, 200), (246, 232, 202)),  # la carta e le strade
    ((200, 200, 136), (146, 172, 84)),   # i campi
    ((184, 184, 120), (122, 152, 70)),   # i campi piu' scuri
    ((200, 184, 136), (176, 160, 98)),   # i prati secchi
    ((216, 184, 136), (214, 132, 84)),   # i tetti: coppi
    ((216, 200, 168), (226, 176, 128)),  # i tetti chiari, i ponti
    ((200, 216, 200), (96, 160, 200)),   # il fiume
    ((184, 216, 200), (84, 150, 196)),   # il fiume, la riva
    ((136, 120, 88), (58, 92, 46)),      # gli alberi
    ((152, 136, 104), (72, 108, 56)),    # gli alberi chiari
    ((80, 70, 54), (34, 28, 22)),        # l'inchiostro
]


def rumore(w, h, scala, seme, ottave=4):
    """rumore liscio in [-1, 1], somma di griglie casuali ingrandite"""
    rng = np.random.default_rng(seme)
    tot = np.zeros((h, w), np.float32)
    amp, peso = 1.0, 0.0
    for o in range(ottave):
        gw, gh = max(2, int(w / scala * 2 ** o)), max(2, int(h / scala * 2 ** o))
        g = Image.fromarray(rng.random((gh, gw)).astype(np.float32), "F").resize((w, h), Image.BICUBIC)
        tot += amp * (np.asarray(g) * 2 - 1)
        peso += amp
        amp *= 0.5
    return tot / peso


def ricolora(img):
    p = img.reshape(-1, 3)
    sorg = np.array([s for s, _ in TAVOLOZZA], np.float32) / 255
    dest = np.array([d for _, d in TAVOLOZZA], np.float32) / 255
    d2 = ((p[:, None, :] - sorg[None, :, :]) ** 2).sum(-1)
    w = np.exp(-d2 / (2 * 0.055 ** 2))
    somma = w.sum(1, keepdims=True)
    spinta = (w[:, :, None] * (dest - sorg)[None]).sum(1) / (somma + 0.02)
    out = p + spinta
    # un po' di contrasto in piu' (una S leggera) e i colori piu' pieni
    lum = out @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    s = lum + 0.18 * (lum - 0.5) * (1 - np.abs(2 * lum - 1))
    out = out + (s - lum)[:, None]
    lum2 = out @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    out = lum2[:, None] + (out - lum2[:, None]) * 1.08
    return np.clip(out, 0, 1).reshape(img.shape)


def carta(img):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # la grana e le macchie dell'eta'
    grana = rumore(W, H, 6, 1, 3) * 0.018 + rumore(W, H, 300, 2, 4) * 0.035
    img = img * (1 + grana[..., None])
    # le pieghe: stava piegata in quattro. Una riga scura, un filo di luce da un lato e la carta un po' curva
    piega = np.zeros((H, W), np.float32)
    for d, larg in ((xx - W * 0.5, W), (yy - H * 0.5, H)):
        piega += -0.11 * np.exp(-(d / 2.2) ** 2) + 0.06 * np.exp(-((d - 5) / 3.5) ** 2) \
            + 0.035 * np.tanh(d / 90.0) * np.exp(-np.abs(d) / 260.0)
    # dove le pieghe si incrociano la carta e' consumata e piu' chiara
    piega += 0.05 * np.exp(-(((xx - W * 0.5) / 26) ** 2 + ((yy - H * 0.5) / 26) ** 2))
    img = img * (1 + piega[..., None])
    # i bordi ingialliti e consumati
    bordo = np.minimum(np.minimum(xx, W - 1 - xx), np.minimum(yy, H - 1 - yy))
    giallo = np.exp(-bordo / (34 + 22 * (rumore(W, H, 120, 3, 3) + 1)))
    img = img * (1 - 0.22 * giallo[..., None] * np.array([0.55, 0.75, 1.0], np.float32))
    # la luce della lampada, da sinistra in alto: la mappa non e' piatta come uno schermo
    luce = 1.06 - 0.2 * np.clip(np.hypot((xx - W * 0.28) / W, (yy - H * 0.2) / H * 0.75) / 0.75, 0, 1) ** 1.6
    return img * luce[..., None]


def alone(img, cx, cy, r, forza, seme, aperto=0.0):
    """l'alone di una tazza: il bordo scuro e sottile, dentro una velatura, qua e la' interrotto"""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    dx, dy = xx - cx, yy - cy
    d = np.hypot(dx, dy)
    ang = np.arctan2(dy, dx)
    rng = np.random.default_rng(seme)
    fasi = rng.random(4) * 6.28
    onda = sum(np.sin(ang * k + fasi[i]) / k for i, k in enumerate((2, 3, 5, 9)))
    rr = r * (1 + 0.025 * onda)
    bordo = np.exp(-((d - rr) / 3.2) ** 2) * 0.9 + np.exp(-((d - rr + 7) / 6) ** 2) * 0.25
    dentro = (d < rr).astype(np.float32) * (0.16 + 0.08 * rumore(W, H, 40, seme, 3))
    # un pezzo di bordo manca (la tazza era inclinata)
    buco = 1 - aperto * np.clip(np.cos(ang - fasi[0]) * 2.2 - 1.2, 0, 1)
    a = np.clip((bordo + dentro) * buco * forza, 0, 1)
    caffe = np.array([0.6, 0.42, 0.27], np.float32)
    return img * (1 - a[..., None] * (1 - caffe))


def orecchia(img, lato):
    """l'angolo piegato in basso a sinistra: sotto si vede la scrivania, sopra il retro della carta"""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    u, v = xx, (H - 1 - yy)  # distanza dal bordo sinistro e da quello basso
    via = (u + v) < lato
    # il lembo ripiegato: il simmetrico del triangolo rispetto alla piega
    lembo = ((u + v) >= lato) & ((u + v) < lato * 2) & (u < lato) & (v < lato)
    ombra = ((u + v) >= lato) & ((u + v) < lato * 2 + 26) & (u < lato + 14) & (v < lato + 14) & ~lembo
    out = img.copy()
    scrivania = np.array([0.24, 0.25, 0.26], np.float32) * (1 + 0.06 * rumore(W, H, 30, 7, 3))[..., None]
    out[ombra] *= 0.62
    t = ((u + v - lato) / lato)[lembo][:, None]
    out[lembo] = np.array([0.9, 0.86, 0.77], np.float32) * (0.82 + 0.16 * t)
    out[via] = scrivania[via]
    return out


def incolla(img, nome, cx, cy, lato, angolo, ombra=(14, 18), sfoca=10, forza=0.5):
    o = Image.open(OGGETTI / f"{nome}_ritaglio.png").convert("RGBA")
    o = o.crop(o.getbbox())
    k = lato / max(o.size)
    o = o.resize((max(1, int(o.width * k)), max(1, int(o.height * k))), Image.LANCZOS)
    o = o.rotate(angolo, resample=Image.BICUBIC, expand=True)
    ox, oy = int(cx * W - o.width / 2), int(cy * H - o.height / 2)
    tela = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8), "RGB").convert("RGBA")
    a = o.getchannel("A")
    om = Image.new("L", (W, H), 0)
    om.paste(a, (ox + ombra[0], oy + ombra[1]))
    om = om.filter(ImageFilter.GaussianBlur(sfoca))
    scuro = Image.new("RGBA", (W, H), (30, 20, 12, 255))
    scuro.putalpha(om.point(lambda x: int(x * forza)))
    tela = Image.alpha_composite(tela, scuro)
    tela.alpha_composite(o, (ox, oy)) if ox >= 0 and oy >= 0 else tela.paste(o, (ox, oy), o)
    return np.asarray(tela.convert("RGB"), np.float32) / 255


def main(uscita=None):
    uscita = Path(uscita or (sys.argv[1] if len(sys.argv) > 1 else USCITA))
    img = np.asarray(Image.open(BASE).convert("RGB").resize((W, H), Image.LANCZOS), np.float32) / 255
    img = ricolora(img)
    img = carta(img)
    # gli aloni: uno fresco vicino alla tazzina, sulla scala dei metri, e uno vecchio, piu' grande, a ovest del fiume
    img = alone(img, W * 0.836, H * 0.866, 74, 0.85, 11, aperto=0.7)
    img = alone(img, W * 0.858, H * 0.835, 72, 0.45, 12, aperto=1.0)
    img = alone(img, W * 0.083, H * 0.52, 118, 0.42, 13, aperto=0.4)
    img = orecchia(img, 92)
    # gli oggetti: dove non coprono case, strade col nome o segni della mappa
    img = incolla(img, "matita", 0.11, 0.86, 640, -17)
    img = incolla(img, "gomma", 0.215, 0.135, 175, -22, ombra=(8, 10), sfoca=6, forza=0.45)
    img = incolla(img, "graffette", 0.012, 0.33, 150, 88, ombra=(5, 7), sfoca=4, forza=0.4)
    img = incolla(img, "fiammiferi", 0.957, 0.33, 230, -14, ombra=(10, 13), sfoca=8)
    img = incolla(img, "tazzina", 0.928, 0.705, 400, 18, ombra=(22, 28), sfoca=18, forza=0.55)
    Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8), "RGB").save(uscita, quality=90)
    print("fatto", uscita)


if __name__ == "__main__":
    main()
