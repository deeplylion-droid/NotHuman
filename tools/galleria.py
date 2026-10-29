# La pagina delle schermate: tutte le scene delle case (e i primi piani dell'esame), come si vedono nel gioco.
# Il filtro e' quello di gioco/js/vhs.js con vhs.difetti = 0: di giorno il tono della casa (tonoCasa), la lampada
# della videocamera con l'alone delle luci forti e la vignetta; di notte il verde; nei primi piani il rosso dell'esame.
# Uso: python3 tools/galleria.py <cartella di uscita> [cartella del gioco], poi python3 tools/galleria_pagina.py <cartella
# di uscita>: la pagina (index.html) con le foto come nel gioco (s/, p/) e gli originali (o/, q/), da pubblicare come
# artifact (la galleria del 29 ottobre: https://claude.ai/artifact/VSNv1r7aKjneQr92EJNhqq; i file sono piu' di 255,
# quindi in due volte: prima la pagina con s/ e p/, poi o/ e q/)
import base64, io, json, math, os, sys
import numpy as np
from PIL import Image

OUT = sys.argv[1]
GIOCO = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "gioco")
LUMA = np.array([0.299, 0.587, 0.114], np.float32)

# ---------- le immagini, dai file o dai pacchi ----------
PACCHI = {}
def carica(rel):
    p = os.path.join(GIOCO, rel)
    if os.path.exists(p):
        return Image.open(p).convert("RGB")
    for f in sorted(os.listdir(os.path.join(GIOCO, "img/pacchi"))):
        if f not in PACCHI:
            PACCHI[f] = json.load(open(os.path.join(GIOCO, "img/pacchi", f)))
        d = PACCHI[f].get(rel)
        if d:
            return Image.open(io.BytesIO(base64.b64decode(d.split(",", 1)[1]))).convert("RGB")
    raise FileNotFoundError(rel)

# ---------- lo shader, in numpy ----------
def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

def luma(c):
    return c @ LUMA

def tono_colore(c, ombre, luci):
    l = luma(c)[..., None]
    t = np.array(ombre, np.float32) + (np.array(luci, np.float32) - np.array(ombre, np.float32)) * smooth(0.05, 0.7, l)
    t = t / np.maximum(luma(t)[..., None], 0.001)
    g = c * t
    lg = luma(g)[..., None]
    g = lg + (g - lg) * 0.85
    return np.power(np.maximum(g, 0), 1.12) * 0.9

TONI = {
    3: ((0.5, 0.86, 0.74), (1.0, 1.0, 0.68)),   # verde malato
    4: ((0.42, 0.76, 1.0), (1.0, 0.82, 0.6)),   # ottanio e arancio
    5: ((0.5, 0.66, 1.0), (0.86, 0.95, 1.0)),   # blu freddo
    6: ((0.74, 0.55, 1.0), (1.0, 0.86, 0.92)),  # livido
}

def scala(stops, l, n):
    t = np.clip(l, 0, 1) * n
    s = [np.array(x, np.float32) / 255 for x in stops]
    c = s[0] + (s[1] - s[0]) * np.clip(t, 0, 1)[..., None]
    for i in range(2, len(s)):
        c = c + (s[i] - c) * np.clip(t - (i - 1), 0, 1)[..., None]
    return c

def green_map(l):
    return scala([(2, 10, 8), (8, 38, 30), (22, 96, 80), (80, 178, 150), (196, 248, 224)], l, 4)

def rosso_scuro(l):
    return scala([(4, 0, 1), (36, 4, 6), (94, 14, 14), (170, 40, 32), (236, 130, 112)], l, 4)

def campiona(img, dx, dy):
    """l'immagine spostata di (dx, dy) pixel, coi bordi ripetuti (CLAMP_TO_EDGE), bilineare"""
    H, W, _ = img.shape
    ys = np.clip(np.arange(H, dtype=np.float32) + dy, 0, H - 1)
    xs = np.clip(np.arange(W, dtype=np.float32) + dx, 0, W - 1)
    y0, x0 = np.floor(ys).astype(int), np.floor(xs).astype(int)
    y1, x1 = np.minimum(y0 + 1, H - 1), np.minimum(x0 + 1, W - 1)
    fy, fx = (ys - y0)[:, None, None], (xs - x0)[None, :, None]
    a = img[y0][:, x0] * (1 - fx) + img[y0][:, x1] * fx
    b = img[y1][:, x0] * (1 - fx) + img[y1][:, x1] * fx
    return a * (1 - fy) + b * fy

def griglia(H, W):
    x = (np.arange(W, dtype=np.float32) + 0.5) / W
    y = 1 - (np.arange(H, dtype=np.float32) + 0.5) / H   # in WebGL la y va in su
    return np.meshgrid(x, y)

def videocamera(im, tono, notte, esame=False):
    c = np.asarray(im, np.float32) / 255
    H, W, _ = c.shape
    X, Y = griglia(H, W)
    Yl = luma(c)
    if notte:
        col = c
    else:
        col = tono_colore(c, *TONI[tono])
        dlx, dly = (X - 0.5) / 0.52, (Y - 0.57) / 0.62
        lampada = (0.28 + 1.05 * np.exp(-(dlx * dlx + dly * dly) * 1.35))[..., None]
        lit = np.power(np.maximum(col, 0), 1.18) * lampada * 0.95
        g = np.zeros_like(c)
        for i in range(6):
            t = i * 1.0472
            for r, t2 in ((0.0065, t), (0.013, t + 0.5236)):
                g += campiona(c, math.cos(t2) * r * W, -math.sin(t2) * 1.778 * r * H)
        g /= 12
        alone = np.clip((luma(g)[..., None] * lampada - 0.72) / 0.28, 0, 1)
        lit = 1 - (1 - np.clip(lit, 0, 1)) * (1 - alone * 0.45)
        col = np.maximum(lit - 0.035, 0) / 0.965
    if esame:
        col = rosso_scuro(np.clip((luma(col) - 0.5) * 1.15 + 0.5, 0, 1))
    elif notte:
        col = green_map(np.clip((Yl - 0.5) * 1.15 + 0.5, 0, 1))
    k = 0.3 + (0.3 if notte else 0) + (0.2 if esame else 0)
    vx, vy = X - 0.5, (Y - 0.5) * 0.9
    col = col * (1 - k * np.power(np.clip(np.sqrt(vx * vx + vy * vy) * 1.41, 0, 1), 2.2))[..., None]
    return Image.fromarray((np.clip(col, 0, 1) * 255 + 0.5).astype(np.uint8))

# ---------- cosa c'e' ----------
CASE = [
    ("casa3", 3, "I Rossi", "Via della Chiesa 12"),
    ("casa5", 5, "I Ferri", "Vicolo Stretto 3"),
    ("casa2", 2, "Galli e Marini", "Via della Chiesa 8"),
    ("casa10", 10, "I Serra", "Vicolo Stretto 7"),
    ("casa7", 7, "I Barbieri", "Via della Chiesa 2"),
    ("casa4", 4, "Le De Rosa", "Vicolo Stretto 1"),
]
TONO_NOME = {3: "verde malato", 4: "ottanio e arancio", 5: "blu freddo", 6: "livido"}

# chi c'e', dal nome degli strati (prepara_gioco.py). Il terzo giorno il padre e l'uomo sono cambiati
STRATI = {
    1: {},
    2: {"padre": "il padre", "figlia": "la figlia, malata", "figlia_sana": "la figlia, sana", "madre": "la madre, cambiata",
        "uomo": "l'uomo in tuta", "giovane": "la ragazza, sana", "giovane_febbre": "la ragazza, con la febbre",
        "nonna": "la nonna", "moglie": "la moglie", "marito": "il marito", "suocera": "la suocera", "nuora": "la nuora"},
    3: {"padre": "il padre radicato", "figlia": "la figlia, malata", "figlia_sana": "la figlia, sana",
        "uomo": "l'uomo allungato", "giovane": "la ragazza, sana", "giovane_febbre": "la ragazza, malata",
        "nonna": "la nonna", "moglie": "la moglie", "marito": "il marito", "suocera": "la suocera", "nuora": "la nuora"},
}

def chi(giorno, strati):
    if strati == ["vuota"]:
        return "Nessuno"
    nomi = [STRATI[giorno][s] for s in strati]
    s = ", ".join(nomi[:-1]) + (" e " if len(nomi) > 1 else "") + nomi[-1]
    return s[0].upper() + s[1:]

def varianti(cartella, luogo, giorno):
    """i file a strati di un luogo: <luogo>-<strati>.jpg, dai file e dai pacchi"""
    nomi = set()
    d = os.path.join(GIOCO, "img", cartella)
    if os.path.isdir(d):
        nomi |= {f for f in os.listdir(d) if f.startswith(luogo + "-") and f.endswith(".jpg")}
    idx = open(os.path.join(GIOCO, "js/pacchi.js")).read()
    import re
    nomi |= set(re.findall(r'"img/%s/(%s-[^"]+\.jpg)"' % (cartella, re.escape(luogo)), idx))
    out = []
    for f in nomi:
        strati = f[len(luogo) + 1:-4].split("-")
        out.append((f"img/{cartella}/{f}", strati))
    # prima chi e' tutto in casa, l'ultima la stanza vuota
    out.sort(key=lambda x: (x[1] == ["vuota"], -len(x[1]), x[0]))
    return out

SCENE = []  # (casa, giorno, stanza, file, notte, didascalia)
def scena(casa, giorno, stanza, rel, notte, chi_c):
    SCENE.append(dict(casa=casa, giorno=giorno, stanza=stanza, rel=rel, notte=notte, chi=chi_c))

# il primo giorno
scena("casa3", 1, "La cucina", "img/cucina.jpg", False, "Il padre e la figlia")
scena("casa3", 1, "La camera", "img/camera.jpg", True, "La madre, a letto")
scena("casa5", 1, "Il soggiorno", "img/soggiorno.jpg", False, "L'uomo in tuta, la ragazza e la nonna")
# il secondo giorno
for rel, st in varianti("g2", "cucina2", 2): scena("casa3", 2, "La cucina", rel, False, chi(2, st))
for rel, st in varianti("g2", "camera2", 2): scena("casa3", 2, "La camera", rel, True, chi(2, st))
for rel, st in varianti("g2", "soggiorno2", 2): scena("casa5", 2, "Il soggiorno", rel, False, chi(2, st))
scena("casa2", 2, "Il monolocale", "img/g2/monolocale.jpg", False, "La moglie e il marito")
scena("casa10", 2, "La cucina", "img/g2/cucina10.jpg", False, "La suocera")
scena("casa10", 2, "La camera", "img/g2/camera10.jpg", True, "La nuora")
# il terzo giorno
for rel, st in varianti("g3", "cucina2", 3): scena("casa3", 3, "La cucina", rel, False, chi(3, st))
scena("casa3", 3, "La camera", "img/g3/camera2.jpg", True, "Nessuno: la madre è uscita dalla finestra")
for rel, st in varianti("g3", "soggiorno2", 3): scena("casa5", 3, "Il soggiorno", rel, False, chi(3, st))
scena("casa5", 3, "La cantina", "img/g3/cantina5.jpg", True, "Davide, nel bozzolo appeso alla trave")
for rel, st in varianti("g3", "monolocale", 3): scena("casa2", 3, "Il monolocale", rel, False, chi(3, st))
for rel, st in varianti("g3", "cucina10", 3): scena("casa10", 3, "La cucina", rel, False, chi(3, st))
for rel, st in varianti("g3", "camera10", 3): scena("casa10", 3, "La camera", rel, True, chi(3, st))
scena("casa7", 3, "La stanza davanti", "img/g3/sacrestia7.jpg", False, "Il sacrestano e Giona, il campanaro")
scena("casa7", 3, "La cripta", "img/g3/cripta7.jpg", True, "Assunta, la santa di cera nella nicchia")
scena("casa4", 3, "La sartoria", "img/g3/sartoria4.jpg", False, "Le gemelle, Ada e Lia")

# i primi piani: la persona dice la casa; quelli di notte (camera, cantina, cripta) senza la lampada
CASA_DI = {"padre": "casa3", "figlia": "casa3", "madre": "casa3", "mostro": "casa3", "uomo": "casa5", "giovane": "casa5",
           "nonna": "casa5", "ragazzo": "casa5", "moglie": "casa2", "marito": "casa2", "suocera": "casa10", "nuora": "casa10",
           "sacrestano": "casa7", "giona": "casa7", "assunta": "casa7", "ada": "casa4", "lia": "casa4"}
DI_NOTTE = {"madre", "mostro", "nuora", "ragazzo", "assunta"}
NOME = {"padre": "il padre", "figlia": "la figlia", "madre": "la madre", "mostro": "la madre cambiata", "uomo": "l'uomo",
        "giovane": "la ragazza", "nonna": "la nonna", "ragazzo": "Davide", "moglie": "la moglie", "marito": "il marito",
        "suocera": "la suocera", "nuora": "la nuora", "sacrestano": "il sacrestano", "giona": "Giona", "assunta": "Assunta",
        "ada": "Ada", "lia": "Lia"}
PARTE = {"occhi": "Occhi", "bocca": "Bocca", "collo": "Collo", "ascelle": "Ascelle", "mani": "Mani"}
ORDINE_PARTI = list(PARTE)
STATO = {"febbre": "con la febbre", "grave": "grave"}
import re
idx = open(os.path.join(GIOCO, "js/pacchi.js")).read()
pp = set()
for cart, g in (("", 1), ("g2/", 2), ("g3/", 3)):
    d = os.path.join(GIOCO, "img/pp", cart)
    pp |= {(f"img/pp/{cart}{f}", g) for f in os.listdir(d) if f.endswith(".jpg")}
    pp |= {(f"img/pp/{cart}{f}", g) for f in re.findall(r'"img/pp/%s([^"/]+\.jpg)"' % re.escape(cart), idx)}
PRIMI = []
for rel, g in pp:
    base = os.path.basename(rel)[:-4].split("_")
    persona, parte, stato = base[0], base[1], (base[2] if len(base) > 2 else None)
    didascalia = f"{PARTE[parte]} · {NOME[persona]}" + (f", {STATO[stato]}" if stato else "")
    PRIMI.append(dict(casa=CASA_DI[persona], giorno=g, rel=rel, notte=persona in DI_NOTTE, chi=didascalia,
                      ordine=(list(NOME).index(persona), ORDINE_PARTI.index(parte), stato or "")))
PRIMI.sort(key=lambda p: (p["giorno"], p["ordine"]))

# ---------- le foto ----------
os.makedirs(OUT, exist_ok=True)
for d in ("s", "o", "p", "q"):
    os.makedirs(os.path.join(OUT, d), exist_ok=True)
NUMERO = {c[0]: c[1] for c in CASE}
dati = {"case": [dict(id=c[0], n=c[1], famiglia=c[2], via=c[3], tono=TONO_NOME[3 + (c[1] - 1) % 4]) for c in CASE],
        "scene": [], "primi": []}
for i, s in enumerate(SCENE):
    nome = f"{s['casa']}-g{s['giorno']}-{i:02d}.jpg"
    im = carica(s["rel"])
    tono = 3 + (NUMERO[s["casa"]] - 1) % 4
    videocamera(im, tono, s["notte"]).save(os.path.join(OUT, "s", nome), quality=82, optimize=True, progressive=True)
    im.save(os.path.join(OUT, "o", nome), quality=82, optimize=True, progressive=True)
    dati["scene"].append(dict(f=nome, casa=s["casa"], giorno=s["giorno"], stanza=s["stanza"], notte=s["notte"], chi=s["chi"],
                              src=s["rel"].replace("img/", "")))
    print("scena", nome, s["rel"], flush=True)
for i, p in enumerate(PRIMI):
    nome = f"{p['casa']}-g{p['giorno']}-{i:03d}.jpg"
    im = carica(p["rel"]).resize((960, 540), Image.LANCZOS)
    tono = 3 + (NUMERO[p["casa"]] - 1) % 4
    videocamera(im, tono, p["notte"], esame=True).save(os.path.join(OUT, "p", nome), quality=80, optimize=True, progressive=True)
    im.save(os.path.join(OUT, "q", nome), quality=80, optimize=True, progressive=True)
    dati["primi"].append(dict(f=nome, casa=p["casa"], giorno=p["giorno"], chi=p["chi"], src=p["rel"].replace("img/", "")))
print("primo piano", len(PRIMI), flush=True)
json.dump(dati, open(os.path.join(OUT, "dati.json"), "w"), ensure_ascii=False, indent=1)
print("scene", len(SCENE), "primi piani", len(PRIMI))
