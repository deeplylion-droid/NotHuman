"""La mappa di Malvento in 3D (27 ottobre, sera). Dopo la pianta "troppo poco curata", la prima prova con gli oggetti
incollati ("sembra fatta da un bambino all'asilo") e la planimetria tecnica (tools/mappa_tecnica.py), l'utente manda la
mappa di Night City di Cyberpunk 2077: "prova ad ispirarti a questa per la mappa", "cambiamo stile quindi".

Il paese diventa un plastico luminoso visto dall'alto in obliquo, su fondo blu notte: le case sono blocchi azzurri
con gli spigoli accesi, le strade linee gialle, la montagna una rete di curve di livello; sopra, le etichette gialle
con il filo che scende sul posto e il pannello coi nomi. Le forme vengono dalla pianta schematica (mappa_forme.py).

I passi:
1. qui: le forme -> art/scrivania/mappa3d/forme.json e la texture del terreno (terreno.png: strade, isolati, rive,
   recinto della ditta, cimitero, alberi);
2. Blender (art/scrivania/mappa3d/scena.py): il paese in 3D sul pendio, la foto in prospettiva (render.png) e dove
   cadono sullo schermo case, luoghi ed etichette (proiezioni.json);
3. qui: le etichette, il pannello e gioco/img/mappa.jpg; le posizioni sullo schermo vanno in gioco/js/mappa3d.js (le
   usano gli spilli e la scheda della casa; la pianta, TETTI in dati.js, resta per le distanze del contagio).

Uso: python3 tools/mappa.py [forme|render|componi|tutto]   (di base: tutto)
"""
import json
import math
import os
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
import mappa_forme as mf  # noqa: E402

RADICE = Path(__file__).resolve().parent.parent
CART = RADICE / "art/scrivania/mappa3d"
FONT = CART / "font"
USCITA = RADICE / "gioco/img/mappa.jpg"
JS = RADICE / "gioco/js/mappa3d.js"
BLENDER = os.environ.get("BLENDER", "blender")
W, H = mf.W, mf.H
T = 1.6  # la texture del terreno e' 1,6 volte la pianta: 4096 x 2304

# le etichette delle vie e dei luoghi: il testo e il punto della pianta su cui scende il filo
ETICHETTE = [
    ("VIA DELLA CHIESA", (1480, 408)),
    ("VIA DEL FIUME", (790, 900)),
    ("VIA DEI MULINI", (1228, 1000)),
    ("VICOLO STRETTO", (1700, 640)),
    ("STRADA DEL CIMITERO", (1000, 1172)),
    ("TORRENTE", (470, 1060)),
]
# i numeri dei luoghi nel pannello e i loro punti
LUOGHI = {"chiesa": (1233, 717), "cimitero": (650, 1245), "ditta": (2090, 662)}


def esporta_forme():
    F = mf.forme()
    case = mf.poligoni(F["case"], 2.4, 250, allarga=1)
    # i numeri delle case: la casa della pianta piu' vicina al centro dell'ellisse di TETTI (gioco/js/dati.js)
    tetti = tetti_da_dati()
    numerate = {}
    for i, (_, _, ex, ey, _, _) in enumerate(tetti):
        c = np.array([ex * W, ey * H])
        j = int(np.argmin([np.hypot(*(p.mean(0) - c)) for p in case]))
        numerate[j] = i + 1
    edifici = []
    for j, p in enumerate(case):
        c = p.mean(0)
        chiesa = abs(c[0] / W - 0.4816) < 0.03 and abs(c[1] / H - 0.48) < 0.06
        edifici.append({"punti": p.round(1).tolist(), "casa": numerate.get(j), "chiesa": bool(chiesa)})
    # per ogni etichetta, piu' punti possibili lungo la sua via (sulla linea gialla, vicino al punto scelto): la
    # composizione prende quello dove il cartellino non copre spilli, pannello e altre etichette
    linea = np.argwhere(F["strade"] > 0)[:, ::-1].astype(np.float32)
    etichette = []
    for t, p in ETICHETTE:
        d = np.hypot(*(linea - np.array(p, np.float32)).T)
        vicini = linea[d < 230]
        scelti = []
        for q in vicini[np.argsort(np.hypot(*(vicini - np.array(p, np.float32)).T))]:
            if all(np.hypot(*(q - np.array(r))) > 24 for r in scelti):
                scelti.append(q.tolist())
            if len(scelti) >= 18:
                break
        etichette.append({"testo": t, "punto": p, "candidati": [p] + scelti})
    dati = {"larghezza": W, "altezza": H, "edifici": edifici,
            "prefab": [p.round(1).tolist() for p in F["prefab"]], "etichette": etichette, "luoghi": LUOGHI}
    CART.mkdir(parents=True, exist_ok=True)
    (CART / "forme.json").write_text(json.dumps(dati))
    terreno(F)
    print("forme e terreno ok:", len(edifici), "edifici,", len(numerate), "case numerate")


def tetti_da_dati():
    s = (RADICE / "gioco/js/dati.js").read_text(encoding="utf-8")
    a = s.index("const TETTI = [")
    b = s.index("];", a)
    return json.loads("[" + s[a + len("const TETTI = ["):b].strip().rstrip(",") + "]")


def terreno(F):
    """la texture del terreno: cosa si accende sulla montagna (colori in luce, sRGB)"""
    w, h = int(W * T), int(H * T)
    img = np.zeros((h, w, 3), np.float32)

    def maschera(m):
        return cv2.resize(m.astype(np.uint8), (w, h), interpolation=cv2.INTER_LINEAR) > 0

    def linee(polys, colore, spessore, chiuse=True):
        tela = np.zeros((h, w), np.uint8)
        for p in polys:
            cv2.polylines(tela, [(p * T).astype(np.int32)], chiuse, 255, max(1, int(spessore * T)), cv2.LINE_AA)
        a = tela.astype(np.float32)[..., None] / 255
        img[:] = img * (1 - a) + np.array(colore, np.float32) * a

    def bagliore(m, colore, raggio):
        g = cv2.GaussianBlur(m.astype(np.float32), (0, 0), raggio * T)
        img[:] = img + np.array(colore, np.float32) * g[..., None]

    iso = mf.poligoni(F["isolati"], 1.6, 1500, allarga=1)
    # gli isolati: appena accesi dentro, il bordo azzurro
    img[maschera(F["isolati"])] = (0.008, 0.014, 0.007)
    linee(iso, (0.15, 0.34, 0.08), 1.6)
    # il fiume: nero, con le rive accese e due righe dentro
    fiume = F["fiume"]
    img[maschera(fiume)] = (0.004, 0.03, 0.026)
    for passo, col in ((7, (0.05, 0.2, 0.14)), (16, (0.03, 0.12, 0.08))):
        linee(mf.poligoni(cv2.erode(fiume, mf.k(passo * 2 + 1)), 1.5, 3000), col, 1.2)
    linee(mf.poligoni(fiume, 1.5, 3000), (0.24, 0.6, 0.4), 2.2)
    # gli alberi: punti verdi spenti
    tela = np.zeros((h, w), np.uint8)
    for x, y, r in F["alberi"]:
        cv2.circle(tela, (int(x * T), int(y * T)), max(3, int(r * 0.55 * T)), 255, -1, cv2.LINE_AA)
    a = tela.astype(np.float32)[..., None] / 255
    img[:] = img * (1 - a) + np.array((0.08, 0.2, 0.05), np.float32) * a
    # il cimitero: il muro e le croci, bianco spento
    if F["cimitero"] is not None:
        cim = mf.poligoni(F["cimitero"], 1.5, 1000)
        linee(cim, (0.55, 0.53, 0.47), 2.4)
        for p in cim:
            x0, y0 = p.min(0)
            x1, y1 = p.max(0)
            tela = np.zeros((h, w), np.uint8)
            for y in np.arange(y0 + 34, y1 - 22, 30):
                for x in np.arange(x0 + 32, x1 - 22, 30):
                    if cv2.pointPolygonTest(p.reshape(-1, 1, 2), (float(x), float(y)), True) > 16:
                        cv2.line(tela, (int(x * T), int((y - 7) * T)), (int(x * T), int((y + 8) * T)), 255, 2, cv2.LINE_AA)
                        cv2.line(tela, (int((x - 5) * T), int((y - 2) * T)), (int((x + 5) * T), int((y - 2) * T)), 255, 2,
                                 cv2.LINE_AA)
            a = tela.astype(np.float32)[..., None] / 255
            img[:] = img * (1 - a) + np.array((0.5, 0.48, 0.43), np.float32) * a
    # il recinto della ditta: righe rosse fitte dentro e il bordo a tratti rosso acceso
    if F["ditta"] is not None:
        md = maschera(F["ditta"])
        yy, xx = np.mgrid[0:h, 0:w]
        righe = ((xx + yy) % int(14 * T)) < int(2.2 * T)
        img[md & righe] = (0.36, 0.03, 0.02)
        img[md & ~righe] = (0.05, 0.004, 0.003)
        for p in mf.poligoni(F["ditta"], 1.5, 1000):
            pts = np.vstack([p, p[:1]]) * T
            tela = np.zeros((h, w), np.uint8)
            tot = 0.0
            for a_, b_ in zip(pts[:-1], pts[1:]):
                L = float(np.hypot(*(b_ - a_)))
                pos = 0.0
                while pos < L:
                    seg = min(16 * T, L - pos)
                    if (tot // (16 * T)) % 2 == 0:
                        q0 = a_ + (b_ - a_) * pos / L
                        q1 = a_ + (b_ - a_) * (pos + seg) / L
                        cv2.line(tela, tuple(q0.astype(int)), tuple(q1.astype(int)), 255, int(3 * T), cv2.LINE_AA)
                    pos += seg
                    tot += seg
            a = tela.astype(np.float32)[..., None] / 255
            img[:] = img * (1 - a) + np.array((0.95, 0.12, 0.07), np.float32) * a
    # le strade: le vie gialle piene, i sentieri tra i campi sottili; un alone giallo sul terreno
    L = F["larghezza"]
    princ = (L >= 11).astype(np.uint8)
    sent = ((L > 0) & (L < 11)).astype(np.uint8)
    pr = cv2.dilate(cv2.resize(princ, (w, h), interpolation=cv2.INTER_NEAREST), mf.k(int(7 * T)))
    se = cv2.dilate(cv2.resize(sent, (w, h), interpolation=cv2.INTER_NEAREST), mf.k(max(3, int(2.2 * T))))
    # il giallo del gioco (--giallo)
    bagliore(pr, (0.45, 0.3, 0.06), 7)
    img[se > 0] = (0.5, 0.36, 0.09)
    img[pr > 0] = (0.95, 0.72, 0.2)
    # il bordo della texture resta nero: fuori dalla pianta c'e' solo la montagna
    img[:4], img[-4:], img[:, :4], img[:, -4:] = 0, 0, 0, 0
    Image.fromarray((np.clip(img, 0, 1) ** (1 / 2.2) * 255 + 0.5).astype(np.uint8)).save(CART / "terreno.png")


def render(larghezza=2560):
    scena = CART / "scena.py"
    r = subprocess.run([BLENDER, "-b", "--python", str(scena), "--", str(larghezza)], capture_output=True, text=True)
    righe = [l for l in r.stdout.splitlines() if l.startswith("mappa3d")]
    print("\n".join(righe) or r.stdout[-3000:] + r.stderr[-3000:])


# ---------------------------------------------------------------- le etichette sopra la foto

def carattere(nome, px):
    return ImageFont.truetype(str(FONT / nome), int(px))


# i colori del gioco (gioco/index.html: --giallo, --notte, --rec, --verde, --testo)
GIALLO = (242, 209, 107)
NERO = (11, 13, 12)
ROSSO = (224, 64, 47)
VERDE = (166, 217, 124)
TESTO = (236, 232, 220)


def misura_etichetta(testo, font, spazio):
    larghi = [font.getlength(ch) + spazio * font.size for ch in testo]
    asc, desc = font.getmetrics()
    ph, pw = int(font.size * 0.42), int(font.size * 0.55)
    return sum(larghi), larghi, asc, desc, ph, pw, sum(larghi) + 2 * pw, asc + desc * 0.2 + 2 * ph


def riquadro_etichetta(testo, font, punto, alto, lato, spazio):
    """il rettangolo del cartellino: sopra il punto (alto > 0) o sotto (alto < 0), spostato di lato"""
    *_, bw, bh = misura_etichetta(testo, font, spazio)
    x, y = punto
    bx = x - bw / 2 + lato * bw * 0.5
    by = y - alto - bh if alto > 0 else y - alto
    return bx, by, bw, bh


def etichetta(d, img, testo, punto, alto, font, spazio=0.06, lato=0):
    """un cartellino giallo col testo nero, sopra (o sotto) il punto, col filo che arriva fino a un pallino"""
    x, y = punto
    tw, larghi, asc, desc, ph, pw, bw, bh = misura_etichetta(testo, font, spazio)
    bx, by, bw, bh = riquadro_etichetta(testo, font, punto, alto, lato, spazio)
    attacco = by + bh if alto > 0 else by
    d.line([(x, y), (min(max(x, bx + 8), bx + bw - 8), attacco)], fill=GIALLO, width=3)
    d.ellipse([x - 6, y - 6, x + 6, y + 6], fill=GIALLO)
    d.rectangle([bx, by, bx + bw, by + bh], fill=GIALLO)
    # l'angolo tagliato, come nei cartellini di Night City
    t = bh * 0.32
    d.polygon([(bx + bw - t, by + bh), (bx + bw, by + bh - t), (bx + bw, by + bh)], fill=NERO)
    cx = bx + pw
    for ch, lw in zip(testo, larghi):
        d.text((cx, by + ph - desc * 0.15), ch, font=font, fill=NERO)
        cx += lw


def sovrapposizione(a, b):
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    return max(0, min(ax + aw, bx + bw) - max(ax, bx)) * max(0, min(ay + ah, by + bh) - max(ay, by))


def posti_etichette(pro, font, spazio, ostacoli):
    """dove mettere i cartellini: per ognuno, tra i punti lungo la sua via e i modi di appenderlo (sopra, sotto, un
    po' a destra o a sinistra), quello che copre meno spilli, pannello, comandi e cartellini gia' messi"""
    scelte = []
    occupati = list(ostacoli)
    for e in sorted(pro["etichette"], key=lambda e: -len(e["testo"])):
        migliore = None
        for i, (u, v) in enumerate(e["candidati_xy"]):
            punto = (u * W, v * H)
            for alto, lato in ((74, 0), (74, 0.8), (74, -0.8), (-34, 0), (-34, 0.8), (-34, -0.8)):
                r = riquadro_etichetta(e["testo"], font, punto, alto, lato, spazio)
                costo = sum(sovrapposizione(r, o) for o in occupati)
                fuori = max(0, 40 - r[0]) + max(0, r[0] + r[2] - (W - 40)) + max(0, 40 - r[1]) + max(0, r[1] + r[3] - (H - 40))
                costo += fuori * 400 + i * 30 + (0 if alto > 0 else 400) + abs(lato) * 200
                if migliore is None or costo < migliore[0]:
                    migliore = (costo, punto, alto, lato, r)
        scelte.append((e["testo"], *migliore[1:4]))
        occupati.append(migliore[4])
    return scelte


def componi():
    pro = json.loads((CART / "proiezioni.json").read_text())
    img = Image.open(CART / "render.png").convert("RGB").resize((W, H), Image.LANCZOS)
    d = ImageDraw.Draw(img)
    pixel = lambda px: carattere("Silkscreen-Regular.ttf", px)
    # le etichette delle vie, dove non coprono gli spilli delle case e dei luoghi, il pannello e i comandi del gioco
    font_e = pixel(32)
    ostacoli = [(46, 236, 540, 640), (0, 0, 420, 210), (1880, 0, 680, 210), (2080, 1140, 480, 300), (0, 1320, 960, 120)]
    for x, y, *_ in pro["case"]:
        ostacoli.append((x * W - 32, y * H - 78, 64, 82))
    for x, y in pro["luoghi"].values():
        ostacoli.append((x * W - 32, y * H - 78, 64, 82))
    for testo, punto, alto, lato in posti_etichette(pro, font_e, 0.02, ostacoli):
        etichetta(d, img, testo, punto, alto, font_e, spazio=0.02, lato=lato)
    # il pannello coi nomi, a sinistra, sotto i soldi
    px, py, pw, ph = 46, 236, 540, 640
    pannello = Image.new("RGBA", (pw, ph), NERO + (222,))
    img.paste(pannello, (px, py), pannello)
    d.rectangle([px, py, px + pw, py + ph], outline=GIALLO, width=3)
    d.line([(px + pw - 40, py + ph), (px + pw, py + ph - 40)], fill=GIALLO, width=3)
    d.text((px + 28, py + 22), "MALVENTO_", font=pixel(66), fill=GIALLO)
    d.line([(px + 28, py + 114), (px + pw - 28, py + 114)], fill=GIALLO, width=2)
    voce = pixel(27)
    y = py + 136
    # i luoghi con le lettere, per non confonderli con i numeri delle case
    for n, testo in [("A", "Chiesa di S. Rocco"), ("B", "Cimitero"), ("C", "Recinto PANACEA")]:
        d.rectangle([px + 28, y + 2, px + 68, y + 42], fill=GIALLO)
        d.text((px + 48, y + 22), n, font=pixel(28), fill=NERO, anchor="mm")
        d.text((px + 88, y + 22), testo, font=voce, fill=TESTO, anchor="lm")
        y += 56
    y += 18
    d.text((px + 28, y), "CASE", font=pixel(30), fill=GIALLO)
    y += 54
    for fondo, cifra, bordo, testo in [(ROSSO, (255, 255, 255), None, "segnalata"), (VERDE, NERO, None, "visitata"),
                                        (TESTO, NERO, None, "croce sulla porta"), (NERO, VERDE, VERDE, "nessuna segnalazione")]:
        d.rounded_rectangle([px + 28, y + 2, px + 68, y + 42], radius=5, fill=fondo, outline=bordo, width=2)
        d.text((px + 48, y + 22), "7", font=pixel(24), fill=cifra, anchor="mm")
        d.text((px + 88, y + 22), testo, font=voce, fill=TESTO, anchor="lm")
        y += 56
    # le lettere dei luoghi (A, B, C) le mette il gioco: sono spilli gialli, come le case
    img.save(USCITA, quality=92)
    # dove cadono le case sullo schermo, per gli spilli del gioco
    righe_js = ",\n  ".join(json.dumps([round(v, 4) for v in c]) for c in pro["case"])
    luoghi = {k: [round(v, 4) for v in pro["luoghi"][k]] for k in pro["luoghi"]}
    JS.write_text(
        "// La mappa di Malvento e' una vista 3D in prospettiva (tools/mappa.py, art/scrivania/mappa3d): dove cadono sullo\n"
        "// schermo le 23 case (x, y dello spillo, poi centro e raggi dell'ellisse che le copre) e i luoghi, in frazioni\n"
        "// dell'immagine. File scritto da tools/mappa.py: non si modifica a mano\n"
        f"export const MAPPA_3D = {{\n  case: [\n  {righe_js},\n  ],\n  luoghi: {json.dumps(luoghi)},\n}};\n",
        encoding="utf-8")
    print("fatto", USCITA, "e", JS)


if __name__ == "__main__":
    passo = sys.argv[1] if len(sys.argv) > 1 else "tutto"
    if passo in ("forme", "tutto"):
        esporta_forme()
    if passo in ("render", "tutto"):
        render(int(sys.argv[2]) if len(sys.argv) > 2 else 2560)
    if passo in ("componi", "tutto"):
        componi()
