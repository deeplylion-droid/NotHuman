"""La planimetria tecnica di Malvento: provata la sera del 27 ottobre e scartata per la mappa in 3D di
tools/mappa.py ("cambiamo stile"); resta come alternativa. Era la planimetria del centro abitato dell'ufficio tecnico
comunale (27 ottobre, sera: la pianta
schematica era "troppo poco curata", e la prima prova con i colori pieni e gli oggetti incollati sopra "sembra fatta da
un bambino all'asilo").

Dalla pianta schematica (art/scrivania/mappa_pianta/schematica.jpg) si ricavano le forme: isolati, case, chiesa,
fiume, ponti, alberi, il cimitero e il recinto della PANACEA. Poi si ridisegnano da capo, puliti, come una tavola
tecnica stampata: tratto nero sottile, le case tratteggiate come al catasto, il fiume con le righe lungo le rive, le
curve di livello della montagna, la griglia delle coordinate, il cartiglio del comune, la scala, la legenda, il
perimetro della zona di controllo sanitario della ditta e il suo timbro. Le case restano esattamente dove sono (TETTI
in gioco/js/dati.js): le puntine del gioco ci cadono sopra come prima.

Uso: python3 tools/mappa_tecnica.py [uscita.jpg]   (di base art/scrivania/mappa_tecnica.jpg)
"""
import math
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from skimage import measure

sys.path.insert(0, str(Path(__file__).resolve().parent))

RADICE = Path(__file__).resolve().parent.parent
BASE = RADICE / "art/scrivania/mappa_pianta/schematica.jpg"
USCITA = RADICE / "art/scrivania/mappa_tecnica.jpg"
W, H = 2560, 1440
S = 2  # si disegna al doppio e si rimpicciolisce: linee nette e sottili

FONT = "/usr/share/fonts"
CARATTERI = {
    "sans": ["Inter-Medium.otf", "FreeSans.ttf", "DejaVuSans.ttf"],
    "sans_bold": ["Inter-Bold.otf", "FreeSansBold.ttf", "DejaVuSans-Bold.ttf"],
    "sans_light": ["Inter-Regular.otf", "FreeSans.ttf", "DejaVuSans.ttf"],
    "corsivo": ["LiberationSerif-Italic.ttf", "FreeSerifItalic.ttf", "DejaVuSerif.ttf"],
}

# i colori della stampa: pochi, come una tavola tecnica
CARTA = (243, 239, 229)
NERO = (30, 28, 25)
GRIGIO = (92, 88, 80)
GRIGLIA = (206, 198, 184)
ISOLATO = (231, 230, 215)
PRATO = (219, 226, 204)
CASA = (214, 207, 194)
ACQUA = (198, 220, 229)
RIVA = (62, 112, 142)
ALBERO = (78, 98, 66)
QUOTE = (164, 128, 88)
DITTA = (34, 78, 140)
ROSSO = (178, 38, 34)


def carattere(tipo, px):
    for nome in CARATTERI[tipo]:
        for f in Path(FONT).rglob(nome):
            return ImageFont.truetype(str(f), int(px * S))
    return ImageFont.load_default()


from mappa_forme import forme, k, poligoni  # noqa: E402


# ---------------------------------------------------------------- il disegno

class Tavola:
    def __init__(self):
        self.img = Image.new("RGB", (W * S, H * S), CARTA)
        self.d = ImageDraw.Draw(self.img)

    @staticmethod
    def p(poly):
        return [(float(x) * S, float(y) * S) for x, y in poly]

    def poligono(self, poly, fill=None, outline=None, width=1.0):
        pts = self.p(poly)
        if fill:
            self.d.polygon(pts, fill=fill)
        if outline:
            self.d.line(pts + [pts[0]], fill=outline, width=max(1, int(round(width * S))), joint="curve")

    def maschera(self, polys=None, m=None):
        """una maschera alla risoluzione del disegno, da poligoni o da una maschera della pianta"""
        if m is not None:
            return Image.fromarray((m > 0).astype(np.uint8) * 255).resize((W * S, H * S), Image.BILINEAR)
        mk = Image.new("L", (W * S, H * S), 0)
        dm = ImageDraw.Draw(mk)
        for poly in polys:
            dm.polygon(self.p(poly), fill=255)
        return mk

    def motivo(self, maschera, disegno):
        """un motivo (tratteggio, puntini) solo dentro la maschera"""
        self.img.paste(disegno, (0, 0), maschera)

    def testo(self, testo, font, centro, angolo=0.0, colore=NERO, spazio=0.0, alone=None):
        img = scritta(testo, font, colore, spazio, alone)
        img = img.rotate(angolo, resample=Image.BICUBIC, expand=True)
        x, y = centro[0] * S - img.width / 2, centro[1] * S - img.height / 2
        self.img.paste(img, (int(x), int(y)), img)

    def testo_curvo(self, testo, font, punti, colore=NERO, spazio=0.0, alone=None):
        """una scritta lungo una linea (punti nella pianta), centrata"""
        pts = np.array([(x * S, y * S) for x, y in punti], np.float32)
        seg = np.hypot(*(pts[1:] - pts[:-1]).T)
        cum = np.concatenate([[0], np.cumsum(seg)])
        larghi = [font.getlength(ch) + spazio * font.size for ch in testo]
        s = (cum[-1] - sum(larghi)) / 2
        for ch, lw in zip(testo, larghi):
            m = s + lw / 2
            i = int(np.clip(np.searchsorted(cum, m) - 1, 0, len(seg) - 1))
            t = (m - cum[i]) / max(seg[i], 1e-6)
            pos = pts[i] + (pts[i + 1] - pts[i]) * t
            ang = math.degrees(math.atan2(-(pts[i + 1][1] - pts[i][1]), pts[i + 1][0] - pts[i][0]))
            g = scritta(ch, font, colore, 0, alone)
            g = g.rotate(ang, resample=Image.BICUBIC, expand=True)
            self.img.paste(g, (int(pos[0] - g.width / 2), int(pos[1] - g.height / 2)), g)
            s += lw


def scritta(testo, font, colore, spazio=0.0, alone=None):
    """una scritta su sfondo trasparente, con la spaziatura tra le lettere e, se serve, un alone color carta"""
    larghi = [font.getlength(ch) + spazio * font.size for ch in testo]
    asc, desc = font.getmetrics()
    pad = int(font.size * 0.4)
    img = Image.new("RGBA", (int(sum(larghi)) + 2 * pad, asc + desc + 2 * pad), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if alone:
        x = pad
        for ch, lw in zip(testo, larghi):
            d.text((x, pad), ch, font=font, fill=alone + (255,), stroke_width=max(2, font.size // 7),
                   stroke_fill=alone + (255,))
            x += lw
    x = pad
    for ch, lw in zip(testo, larghi):
        d.text((x, pad), ch, font=font, fill=colore + (255,))
        x += lw
    return img


def righe(angolo, passo, spessore, colore, sfondo=None):
    """un foglio di righe parallele (per i tratteggi)"""
    w, h = W * S, H * S
    img = Image.new("RGB", (w, h), sfondo or CARTA)
    d = ImageDraw.Draw(img)
    p = passo * S
    larg = max(1, int(round(spessore * S)))
    if angolo == 45:
        for x in np.arange(-h, w, p):
            d.line([(x, h), (x + h, 0)], fill=colore, width=larg)
    elif angolo == -45:
        for x in np.arange(-h, w, p):
            d.line([(x, 0), (x + h, h)], fill=colore, width=larg)
    else:
        for y in np.arange(0, h, p):
            d.line([(0, y), (w, y)], fill=colore, width=larg)
    return img


def puntini(passo, raggio, colore, sfondo):
    w, h = W * S, H * S
    img = Image.new("RGB", (w, h), sfondo)
    d = ImageDraw.Draw(img)
    p, r = passo * S, raggio * S
    for j, y in enumerate(np.arange(0, h, p)):
        for x in np.arange((j % 2) * p / 2, w, p):
            d.ellipse([x - r, y - r, x + r, y + r], fill=colore)
    return img


def erba(passo, colore, sfondo, seme=3):
    """il segno del prato: due trattini a V, sparsi in file sfalsate"""
    w, h = W * S, H * S
    img = Image.new("RGB", (w, h), sfondo)
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(seme)
    p = passo * S
    for j, y in enumerate(np.arange(p / 2, h, p)):
        for x in np.arange((j % 2) * p / 2, w, p):
            x2, y2 = x + rng.uniform(-p * 0.15, p * 0.15), y + rng.uniform(-p * 0.15, p * 0.15)
            l = 3.2 * S
            d.line([(x2 - l * 0.6, y2 - l), (x2, y2)], fill=colore, width=max(1, int(0.9 * S)))
            d.line([(x2 + l * 0.6, y2 - l), (x2, y2)], fill=colore, width=max(1, int(0.9 * S)))
    return img


def curve_di_livello(t, escludi):
    """la montagna: il paese sta su un pendio che sale verso nord-est, il fiume nel fondovalle a ovest. Le curve ogni
    5 metri, quelle ogni 25 piu' marcate e con la quota"""
    r = 8
    gw, gh = W // r, H // r
    yy, xx = np.mgrid[0:gh, 0:gw].astype(np.float32)
    rng = np.random.default_rng(7)
    rumore = np.zeros((gh, gw), np.float32)
    for scala, amp in ((60, 9.0), (25, 3.0)):
        g = rng.random((gh // scala + 3, gw // scala + 3)).astype(np.float32)
        rumore += amp * (cv2.resize(g, (gw, gh), interpolation=cv2.INTER_CUBIC) - 0.5)
    fiume_x = 0.12 * gw + 0.04 * gw * np.sin(yy / gh * 3.0)
    quota = 712 + 58 * (1 - yy / gh) + 46 * (xx / gw) + rumore - 16 * np.exp(-((xx - fiume_x) / (0.08 * gw)) ** 2)
    quota = cv2.GaussianBlur(quota, (0, 0), 2.0)
    strato = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(strato)
    font = carattere("sans_light", 13)
    etichette = []
    for q in range(int(quota.min()) // 5 * 5 + 5, int(quota.max()), 5):
        maestra = q % 25 == 0
        for c in measure.find_contours(quota, q):
            if len(c) < 12:
                continue
            pts = [(x * r * S, y * r * S) for y, x in c]
            d.line(pts, fill=QUOTE + (255,), width=max(1, int((1.8 if maestra else 1.0) * S)))
            if maestra and len(c) > 80:
                etichette.append((q, c[len(c) // 2], c[len(c) // 2 + 3]))
    # niente curve sopra le case, l'acqua e le aree speciali
    alfa = np.asarray(strato.getchannel("A"), np.float32) * (1 - np.asarray(escludi, np.float32) / 255)
    strato.putalpha(Image.fromarray(alfa.astype(np.uint8)))
    t.img.paste(strato, (0, 0), strato)
    esc = np.asarray(escludi)
    for q, a, b in etichette:
        ang = math.degrees(math.atan2(-(b[0] - a[0]), b[1] - a[1]))
        if ang > 90:
            ang -= 180
        if ang < -90:
            ang += 180
        cx, cy = a[1] * r, a[0] * r
        if esc[min(int(cy * S), H * S - 1), min(int(cx * S), W * S - 1)] > 0:
            continue
        t.testo(str(q), font, (cx, cy), ang, QUOTE, alone=CARTA)


def timbro(testo_giro, testo_mezzo, raggio, colore):
    """un timbro tondo a inchiostro, con la scritta lungo il bordo e le righe in mezzo, un po' consumato"""
    lato = int(raggio * 2.4 * S)
    img = Image.new("L", (lato, lato), 0)
    d = ImageDraw.Draw(img)
    c = lato / 2
    for rr, w in ((raggio * S, 4), (raggio * S * 0.95, 2), (raggio * S * 0.63, 2)):
        d.ellipse([c - rr, c - rr, c + rr, c + rr], outline=255, width=int(w * S / 2))
    font = carattere("sans_bold", raggio * 0.15)
    n = len(testo_giro)
    for i, ch in enumerate(testo_giro):
        a = math.pi / 2 - i * (2 * math.pi) / n
        rr = raggio * S * 0.79
        g = Image.new("L", (font.size * 2, font.size * 2), 0)
        ImageDraw.Draw(g).text((font.size / 2, font.size / 4), ch, font=font, fill=255)
        g = g.rotate(math.degrees(a - math.pi / 2), resample=Image.BICUBIC)
        img.paste(255, (int(c + rr * math.cos(a) - g.width / 2), int(c - rr * math.sin(a) - g.height / 2)), g)
    font2 = carattere("sans_bold", raggio * 0.17)
    righe_mezzo = testo_mezzo.split("\n")
    for i, riga in enumerate(righe_mezzo):
        tw = font2.getlength(riga)
        y = c + (i - (len(righe_mezzo) - 1) / 2) * font2.size * 1.2 - font2.size * 0.62
        d.text((c - tw / 2, y), riga, font=font2, fill=255)
    # l'inchiostro non prende dappertutto
    rng = np.random.default_rng(5)
    rumore = cv2.GaussianBlur(rng.random((lato, lato)).astype(np.float32), (0, 0), 1.6)
    a = np.asarray(img, np.float32) / 255 * np.clip((rumore - 0.36) * 6, 0.3, 1)
    out = Image.new("RGBA", (lato, lato), colore + (0,))
    out.putalpha(Image.fromarray((a * 215).astype(np.uint8)))
    return out


def tratteggio_linea(d, pts, motivo, colore, larg):
    """una linea a tratti secondo un motivo [(lunghezza, pieno), ...] (lunghezze in punti della pianta)"""
    k_i, resto = 0, motivo[0][0] * S
    for (ax, ay), (bx, by) in zip(pts[:-1], pts[1:]):
        L = math.hypot(bx - ax, by - ay)
        pos = 0.0
        while pos < L - 1e-6:
            passo = min(resto, L - pos)
            if motivo[k_i][1]:
                x0, y0 = ax + (bx - ax) * pos / L, ay + (by - ay) * pos / L
                x1, y1 = ax + (bx - ax) * (pos + passo) / L, ay + (by - ay) * (pos + passo) / L
                d.line([(x0, y0), (x1, y1)], fill=colore, width=larg)
            pos += passo
            resto -= passo
            if resto <= 1e-6:
                k_i = (k_i + 1) % len(motivo)
                resto = motivo[k_i][0] * S


def main(uscita=None):
    uscita = Path(uscita or (sys.argv[1] if len(sys.argv) > 1 else USCITA))
    F = forme()
    t = Tavola()
    d = t.d
    M = 30  # il margine della cornice (pianta)
    TRATT = (96, 90, 80)

    # la griglia delle coordinate, sotto tutto
    for x in range(M, W - M, 160):
        d.line([(x * S, M * S), (x * S, (H - M) * S)], fill=GRIGLIA, width=S)
    for y in range(M, H - M, 160):
        d.line([(M * S, y * S), ((W - M) * S, y * S)], fill=GRIGLIA, width=S)

    # gli isolati: orti e giardini, un retino a puntini; i prati piu' grandi col segno dell'erba
    iso = poligoni(F["isolati"], 1.6, 1500, allarga=1)
    t.motivo(t.maschera(iso), puntini(7, 0.55, (168, 166, 140), ISOLATO))
    t.motivo(t.maschera(m=F["prati"]), erba(16, (122, 140, 100), PRATO))
    for p in iso:
        t.poligono(p, outline=GRIGIO, width=1.3)

    # il fiume: l'acqua, le righe lungo le rive, la riva marcata
    fiume = F["fiume"]
    mf = t.maschera(m=fiume)
    t.motivo(mf, Image.new("RGB", mf.size, ACQUA))
    for passo, col in ((5, (120, 162, 184)), (11, (150, 186, 204)), (18, (170, 200, 214))):
        er = cv2.erode(fiume.astype(np.uint8), k(passo * 2 + 1))
        for p in poligoni(er, 1.5, 3000):
            t.poligono(p, outline=col, width=1.0)
    for p in poligoni(fiume, 1.5, 3000):
        t.poligono(p, outline=RIVA, width=1.6)

    # cosa le curve di livello non attraversano: case, acqua, aree speciali
    case = poligoni(F["case"], 2.6, 250, allarga=1)
    escludi = Image.new("L", (W * S, H * S), 0)
    de = ImageDraw.Draw(escludi)
    for p in case:
        de.polygon(t.p(p), fill=255)
    escludi.paste(255, (0, 0), mf)
    for m in [F["ditta"], F["cimitero"], *F["ponti"]]:
        if m is not None:
            escludi.paste(255, (0, 0), t.maschera(m=cv2.dilate(m, k(9))))
    escludi = escludi.filter(ImageFilter.MaxFilter(5))
    curve_di_livello(t, escludi)

    # i ponti: la strada che passa, con le spallette e le alette agli angoli
    for m in F["ponti"]:
        for p in poligoni(m, 1.5, 300, allarga=1):
            t.poligono(p, fill=CARTA)
            box = cv2.boxPoints(cv2.minAreaRect(p.astype(np.float32)))
            centro = box.mean(0)
            lati = sorted([(box[i], box[(i + 1) % 4]) for i in range(4)], key=lambda e: -np.hypot(*(e[1] - e[0])))[:2]
            for a, b in lati:
                d.line([(a[0] * S, a[1] * S), (b[0] * S, b[1] * S)], fill=NERO, width=int(2.2 * S))
                for e, f in ((a, b), (b, a)):
                    v = (f - e) / max(np.hypot(*(f - e)), 1e-6)
                    n = np.array([-v[1], v[0]])
                    if np.dot(n, e - centro) < 0:
                        n = -n
                    q = e + n * 9 - v * 7
                    d.line([(e[0] * S, e[1] * S), (q[0] * S, q[1] * S)], fill=NERO, width=int(2.2 * S))

    # il cimitero: il muro di cinta doppio e le croci in file
    if F["cimitero"] is not None:
        for p in poligoni(F["cimitero"], 1.5, 1000):
            t.poligono(p, fill=(232, 229, 218), outline=NERO, width=2.4)
            for q in poligoni(cv2.erode(F["cimitero"], k(13)), 1.5, 500):
                t.poligono(q, outline=NERO, width=1.0)
            x0, y0 = p.min(0)
            x1, y1 = p.max(0)
            for y in np.arange(y0 + 34, y1 - 22, 30):
                for x in np.arange(x0 + 32, x1 - 22, 30):
                    if cv2.pointPolygonTest(p.reshape(-1, 1, 2), (float(x), float(y)), True) > 16:
                        d.line([(x * S, (y - 7) * S), (x * S, (y + 8) * S)], fill=NERO, width=int(1.6 * S))
                        d.line([((x - 5) * S, (y - 2) * S), ((x + 5) * S, (y - 2) * S)], fill=NERO, width=int(1.6 * S))

    # il recinto della ditta: il terreno col tratteggio blu, la rete con le crocette, i prefabbricati
    if F["ditta"] is not None:
        t.motivo(t.maschera(m=F["ditta"]), righe(45, 9, 0.9, (150, 172, 205), (226, 232, 240)))
        for p in poligoni(F["ditta"], 1.5, 1000):
            pts = t.p(p) + [t.p(p)[0]]
            d.line(pts, fill=DITTA, width=int(2.2 * S), joint="curve")
            tot = 0.0
            for (ax, ay), (bx, by) in zip(pts[:-1], pts[1:]):
                L = math.hypot(bx - ax, by - ay)
                while tot < L:
                    x, y = ax + (bx - ax) * tot / L, ay + (by - ay) * tot / L
                    s = 4 * S
                    d.line([(x - s, y - s), (x + s, y + s)], fill=DITTA, width=int(1.3 * S))
                    d.line([(x - s, y + s), (x + s, y - s)], fill=DITTA, width=int(1.3 * S))
                    tot += 26 * S
                tot -= L
        for i, p in enumerate(sorted(F["prefab"], key=lambda q: q[:, 1].mean())):
            t.poligono(p, fill=(248, 248, 246), outline=DITTA, width=1.8)
            c = p.mean(0)
            t.testo(f"P{i + 1}", carattere("sans_bold", 15), (c[0], c[1]), 0, DITTA)

    # gli alberi: un cerchio col punto in mezzo
    for x, y, r in F["alberi"]:
        r = max(6.0, r * 0.9)
        d.ellipse([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], fill=(225, 231, 212), outline=ALBERO,
                  width=int(1.3 * S))
        d.ellipse([(x - 1.4) * S, (y - 1.4) * S, (x + 1.4) * S, (y + 1.4) * S], fill=ALBERO)

    # le case: tratteggiate come al catasto, col bordo nero; la chiesa a tratteggio incrociato
    t.motivo(t.maschera(case), righe(45, 6.5, 0.9, TRATT, CASA))
    # il tratteggio incrociato: le righe a 45 gradi sopra quelle a -45
    incrocio = righe(-45, 8, 0.9, TRATT, CASA)
    incrocio.paste(righe(45, 8, 0.9, TRATT, CASA), (0, 0),
                   Image.fromarray((np.asarray(righe(45, 8, 0.9, (0, 0, 0), (255, 255, 255)).convert("L")) < 128).astype(np.uint8) * 255))
    for p in case:
        c = p.mean(0)
        chiesa = abs(c[0] / W - 0.4816) < 0.03 and abs(c[1] / H - 0.48) < 0.06
        if chiesa:
            t.motivo(t.maschera([p]), incrocio)
        t.poligono(p, outline=NERO, width=2.6 if chiesa else 2.0)

    # il perimetro della zona di controllo sanitario della ditta: tratto e punto rosso attorno al paese
    zona = np.zeros((H, W), np.uint8)
    for p in case:
        cv2.fillPoly(zona, [p.astype(np.int32)], 1)
    hull = cv2.convexHull(np.argwhere(zona > 0)[:, ::-1].astype(np.int32))
    zona = np.zeros((H, W), np.uint8)
    cv2.fillPoly(zona, [hull], 1)
    zona = cv2.GaussianBlur(cv2.dilate(zona, k(91)).astype(np.float32), (0, 0), 25) > 0.5
    for p in poligoni(zona.astype(np.uint8), 3.0, 10000):
        tratteggio_linea(d, t.p(p) + [t.p(p)[0]], [(22, True), (7, False), (3, True), (7, False)], ROSSO, int(2.4 * S))

    # le scritte: le vie in maiuscolo spaziato, il fiume in corsivo, la ditta, la chiesa e il cimitero
    via = carattere("sans", 17)
    for testo, c, a in [("VIA DELLA CHIESA", (1322, 408), -5.5), ("VIA DEL FIUME", (728, 788), 61),
                        ("VIA DEI MULINI", (1226, 990), 84), ("VICOLO STRETTO", (1703, 646), 66)]:
        t.testo(testo, via, c, a, NERO, spazio=0.22, alone=CARTA)
    t.testo_curvo("STRADA DEL CIMITERO", via, [(850, 1112), (960, 1150), (1080, 1182), (1200, 1205), (1290, 1214)],
                  NERO, spazio=0.22, alone=CARTA)
    t.testo_curvo("Torrente Malvento", carattere("corsivo", 22),
                  [(330, 1290), (380, 1170), (440, 1040), (520, 900), (590, 760)], RIVA, spazio=0.08, alone=ACQUA)
    t.testo("Chiesa di S. Rocco", carattere("corsivo", 17), (1232, 760), 0, GRIGIO, alone=CARTA)
    t.testo("Cimitero", carattere("corsivo", 17), (640, 1336), 0, GRIGIO, alone=CARTA)
    t.testo("PANACEA S.p.A.", carattere("sans_bold", 19), (2160, 722), 0, DITTA, spazio=0.12, alone=(226, 232, 240))
    t.testo("area sanitaria recintata", carattere("corsivo", 14), (2160, 750), 0, DITTA, alone=(226, 232, 240))

    # la cornice con le coordinate sul margine
    for box in ([0, 0, W * S, M * S], [0, (H - M) * S, W * S, H * S], [0, 0, M * S, H * S], [(W - M) * S, 0, W * S, H * S]):
        d.rectangle(box, fill=CARTA)
    d.rectangle([M * S, M * S, (W - M) * S, (H - M) * S], outline=NERO, width=int(2 * S))
    d.rectangle([(M - 12) * S, (M - 12) * S, (W - M + 12) * S, (H - M + 12) * S], outline=NERO, width=S)
    piccolo = carattere("sans_light", 10)
    for i, x in enumerate(range(M, W - M, 160)):
        d.line([(x * S, (M - 12) * S), (x * S, M * S)], fill=NERO, width=S)
        d.line([(x * S, (H - M) * S), (x * S, (H - M + 12) * S)], fill=NERO, width=S)
    for i, y in enumerate(range(M, H - M, 160)):
        d.line([((M - 12) * S, y * S), (M * S, y * S)], fill=NERO, width=S)
        d.line([((W - M) * S, y * S), ((W - M + 12) * S, y * S)], fill=NERO, width=S)
    for i, x in enumerate(range(M + 160, W - M, 160)):
        t.testo(f"{2514 + i * 2}", piccolo, (x + 20, M - 6), 0, GRIGIO)
    for i, y in enumerate(range(M + 160, H - M, 160)):
        t.testo(f"{4484 - i * 2}", piccolo, (M - 6, y - 22), 90, GRIGIO)

    # il cartiglio del comune, in alto al centro
    x0, y0, x1, y1 = 905, 44, 1695, 196
    d.rectangle([x0 * S, y0 * S, x1 * S, y1 * S], fill=(248, 245, 238), outline=NERO, width=int(2.4 * S))
    d.rectangle([(x0 + 7) * S, (y0 + 7) * S, (x1 - 7) * S, (y1 - 7) * S], outline=NERO, width=S)
    d.line([((x0 + 7) * S, (y0 + 104) * S), ((x1 - 7) * S, (y0 + 104) * S)], fill=NERO, width=S)
    t.testo("COMUNE DI MALVENTO", carattere("sans_bold", 40), ((x0 + x1) / 2, y0 + 44), 0, NERO, spazio=0.16)
    t.testo("Planimetria del centro abitato", carattere("corsivo", 21), ((x0 + x1) / 2, y0 + 82), 0, GRIGIO)
    t.testo("UFFICIO TECNICO COMUNALE   ·   SCALA 1:2000   ·   TAV. 3", carattere("sans_light", 14),
            ((x0 + x1) / 2, y0 + 127), 0, NERO, spazio=0.12)

    # il nord: la freccia tecnica nel cerchio
    cx, cy, r = 176, 250, 58
    d.ellipse([(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], outline=NERO, width=int(1.4 * S))
    d.polygon([(cx * S, (cy - r - 14) * S), ((cx + 15) * S, (cy + 22) * S), (cx * S, (cy + 10) * S)], fill=NERO)
    d.polygon([(cx * S, (cy - r - 14) * S), ((cx - 15) * S, (cy + 22) * S), (cx * S, (cy + 10) * S)], fill=CARTA,
              outline=NERO)
    t.testo("N", carattere("sans_bold", 26), (cx, cy - r - 34), 0, NERO)

    # la scala grafica
    sx, sy = 1960, 1318
    for i in range(4):
        d.rectangle([(sx + i * 100) * S, sy * S, (sx + (i + 1) * 100) * S, (sy + 10) * S],
                    fill=NERO if i % 2 == 0 else CARTA, outline=NERO, width=int(1.2 * S))
    for i in range(5):
        t.testo(str(i * 50), carattere("sans_light", 13), (sx + i * 100, sy - 14), 0, NERO)
    t.testo("metri", carattere("sans_light", 13), (sx + 448, sy + 5), 0, NERO)
    t.testo("Scala 1:2000  ·  equidistanza delle curve 5 m", carattere("corsivo", 14), (sx + 200, sy + 30), 0, GRIGIO)

    # la legenda, a destra sotto il recinto
    lx, ly = 2120, 920
    d.rectangle([lx * S, ly * S, (lx + 350) * S, (ly + 300) * S], fill=(248, 245, 238), outline=NERO, width=int(1.4 * S))
    t.testo("LEGENDA", carattere("sans_bold", 14), (lx + 175, ly + 22), 0, NERO, spazio=0.2)
    voce = carattere("sans_light", 14)
    for i, testo in enumerate(["Edifici", "Chiesa", "Area recintata PANACEA", "Zona di controllo sanitario", "Cimitero",
                               "Corso d'acqua", "Alberi", "Curve di livello"]):
        y = ly + 52 + i * 31
        bx = lx + 18
        q = [(bx, y - 9), (bx + 40, y - 9), (bx + 40, y + 9), (bx, y + 9)]
        if testo == "Edifici":
            t.motivo(t.maschera([q]), righe(45, 5.5, 0.9, TRATT, CASA))
            t.poligono(q, outline=NERO, width=1.6)
        elif testo == "Chiesa":
            cr = [(bx + 14, y - 10), (bx + 26, y - 10), (bx + 26, y - 3), (bx + 36, y - 3), (bx + 36, y + 3),
                  (bx + 26, y + 3), (bx + 26, y + 10), (bx + 14, y + 10), (bx + 14, y + 3), (bx + 4, y + 3),
                  (bx + 4, y - 3), (bx + 14, y - 3)]
            t.motivo(t.maschera([cr]), incrocio)
            t.poligono(cr, outline=NERO, width=1.6)
        elif testo.startswith("Area"):
            t.motivo(t.maschera([q]), righe(45, 6, 0.9, (150, 172, 205), (226, 232, 240)))
            t.poligono(q, outline=DITTA, width=1.8)
        elif testo.startswith("Zona"):
            tratteggio_linea(d, [(bx * S, y * S), ((bx + 40) * S, y * S)], [(18, True), (6, False), (3, True), (6, False)],
                             ROSSO, int(2.4 * S))
        elif testo == "Cimitero":
            for dx in (8, 20, 32):
                d.line([((bx + dx) * S, (y - 7) * S), ((bx + dx) * S, (y + 7) * S)], fill=NERO, width=int(1.4 * S))
                d.line([((bx + dx - 4) * S, (y - 2) * S), ((bx + dx + 4) * S, (y - 2) * S)], fill=NERO,
                       width=int(1.4 * S))
        elif testo.startswith("Corso"):
            t.poligono(q, fill=ACQUA, outline=RIVA, width=1.4)
            d.line([((bx + 4) * S, y * S), ((bx + 36) * S, y * S)], fill=(120, 162, 184), width=S)
        elif testo == "Alberi":
            for dx in (10, 30):
                d.ellipse([(bx + dx - 7) * S, (y - 7) * S, (bx + dx + 7) * S, (y + 7) * S], fill=(225, 231, 212),
                          outline=ALBERO, width=int(1.2 * S))
        else:
            d.line([(bx * S, (y + 4) * S), ((bx + 14) * S, (y - 2) * S), ((bx + 40) * S, (y + 3) * S)], fill=QUOTE,
                   width=int(1.4 * S))
        tw = voce.getlength(testo) / S
        t.testo(testo, voce, (bx + 56 + tw / 2, y), 0, NERO)

    # il timbro della ditta, in blu, un po' storto, sul margine in alto a destra
    tb = timbro("PANACEA S.p.A. · CONTROLLO SANITARIO · ", "ZONA\nSOTTO\nOSSERVAZIONE", 92, DITTA)
    tb = tb.rotate(-11, resample=Image.BICUBIC, expand=True)
    t.img.paste(tb, (int(2330 * S - tb.width / 2), int(330 * S - tb.height / 2)), tb)

    # la carta: una grana leggera e la stampa che non e' perfettamente uniforme
    out = t.img.resize((W, H), Image.LANCZOS)
    a = np.asarray(out, np.float32) / 255
    rng = np.random.default_rng(11)
    g = cv2.GaussianBlur(rng.normal(0, 1, (H, W)).astype(np.float32), (0, 0), 0.8) * 0.012
    macchie = cv2.resize(rng.random((9, 16)).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
    a = a * (1 + g[..., None]) * (0.985 + 0.03 * macchie[..., None])
    Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)).save(uscita, quality=92)
    print("fatto", uscita)


if __name__ == "__main__":
    main()
