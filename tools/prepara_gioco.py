#!/usr/bin/env python3
"""Prepara le immagini del prototipo in gioco/img a partire da art/.

Uso: python3 tools/prepara_gioco.py

Per ogni luogo:
- <luogo>.jpg: la scena finale (senza filtro: il VHS lo fa il gioco), 1600x900;
- <luogo>_persone.png: un grigio per persona (40, 80, 120...), per sapere chi c'e' sotto il puntatore;
- <luogo>_<persona>.png: la sagoma bianca della persona, per evidenziarla;
- <luogo>_calore.png: la mappa di calore per l'infrarosso dei nastri: le persone (piu' calde dove si vede la
  pelle, e chi ha la febbre di piu'), i nascosti dietro le porte, le lampade.
Poi i primi piani in img/pp, la scrivania disegnata al 40% (confermato il 26 ottobre; e' salvata anche in
art/scrivania/scrivania.jpg) e la mappa del paese, piatta e schematica, com'e' (non si mescola al disegno).
L'ordine delle persone e i calori sono quelli di gioco/js/dati.js.
Infine le espressioni: da ogni variante in art/espressioni (la stessa scena con un'altra faccia) si ritaglia solo
la testa, riallineata alla scena, in img/espressioni/<luogo>_<persona>_<volto>.png; dove incollarla e' scritto in
gioco/js/espressioni.js. Serve OpenCV per riallineare (pip install opencv-python-headless).
Di ogni immagine con personaggi (scene, espressioni, primi piani, scheda della figlia) si usa la versione con meno
dettagli fatta da tools/meno_dettagli.py (nella cartella meno_dettagli/ accanto), se c'e'; se manca si usa
l'originale e lo si dice.
"""
import itertools
import json
import pathlib

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "gioco/img"
W, H = 1600, 900

LUOGHI = {
    "cucina": {
        "scena": "art/scene/01-cucina/finale.jpg",
        "persone": [
            ("padre", 0.8, ["art/prove-stile/11-personaggi-50/maschere/ammorbiditi_persone_maschera1.png"]),
            ("figlia", 0.52, ["art/prove-stile/11-personaggi-50/maschere/ammorbiditi_persone_maschera2.png"]),
        ],
        # la madre in fondo al corridoio buio, appena visibile oltre la porta
        "nascosti": [("ellisse", 0.433, 0.37, 0.012, 0.045, 0.62), ("ellisse", 0.433, 0.31, 0.008, 0.014, 0.7)],
        "lampade": [],
    },
    "camera": {
        "scena": "art/scene/03-camera/finale.jpg",
        "persone": [("madre", 1.0, ["art/scene/03-camera/maschere/persone_maschera1.png"])],
        "nascosti": [],
        "lampade": [(0.305, 0.42, 0.018, 0.9)],
    },
    "soggiorno": {
        "scena": "art/scene/02-soggiorno/finale.jpg",
        "persone": [
            ("uomo", 0.78, ["art/scene/02-soggiorno/maschere/persone_maschera1.png"]),
            ("giovane", 0.4, ["art/scene/02-soggiorno/maschere/persone_maschera2.png"]),
            ("nonna", 0.5, ["art/scene/02-soggiorno/maschere/persone_maschera3.png",
                            "art/scene/02-soggiorno/maschere/bastone_maschera1.png"]),
        ],
        # il ragazzo sdraiato dietro la porta chiusa: il calore passa attenuato dal legno
        "nascosti": [("ellisse", 0.835, 0.64, 0.07, 0.035, 0.5), ("ellisse", 0.775, 0.6, 0.018, 0.028, 0.58)],
        "lampade": [(0.385, 0.02, 0.03, 0.55)],
    },
}

# le foto degli occupanti per la scheda della casa sulla mappa: ritaglio attorno alla faccia [x0, y0, x1, y1]
VOLTI = {
    "padre": ("art/scene/01-cucina/finale.jpg", (0.275, 0.09, 0.42, 0.36)),
    "figlia": ("art/scene/01-cucina/scheda_figlia.jpg", (0.16, 0.08, 0.84, 0.62)),
    "madre": ("art/scene/03-camera/finale.jpg", (0.5, 0.19, 0.615, 0.43)),
    "uomo": ("art/scene/02-soggiorno/finale.jpg", (0.565, 0.06, 0.68, 0.3)),
    "giovane": ("art/scene/02-soggiorno/finale.jpg", (0.462, 0.185, 0.543, 0.375)),
    "nonna": ("art/scene/02-soggiorno/finale.jpg", (0.37, 0.225, 0.452, 0.425)),
}

# le espressioni di ogni persona (art/espressioni/<persona>_<volto>.png o .jpg) e l'ellisse della testa
# (cx, cy, rx, ry): dentro si prende la faccia nuova, verso il bordo si sfuma nella scena
ESPRESSIONI = {
    "cucina": {"padre": ["nervoso", "arrabbiato"], "figlia": ["piange"]},
    "soggiorno": {"uomo": ["nervoso", "arrabbiato"], "giovane": ["piange"]},
}
TESTE = {
    "padre": (0.338, 0.2, 0.072, 0.155),
    "figlia": (0.477, 0.29, 0.034, 0.068),
    "uomo": (0.62, 0.172, 0.066, 0.14),
    "giovane": (0.499, 0.262, 0.042, 0.1),
}
# per le foto sul nastro delle frasi: chi l'ha detta, con la faccia che aveva (ritaglio dalla scena)
VOLTI_SCENA = {"figlia": (0.44, 0.215, 0.515, 0.36)}

PRIMI = {
    "art/scene/01-cucina/primi-piani": ["padre", "figlia"],
    "art/scene/02-soggiorno/primi-piani": ["uomo", "giovane", "nonna"],
    "art/scene/03-camera/primi-piani": ["madre"],
}

# il secondo giorno (bozza del 27 ottobre, docs/proposta_secondo_giorno.md): le stesse stanze, le persone cambiate
# dalle scelte del primo giorno. Ogni scena si compone a strati, per ogni combinazione di chi e' in casa: sotto la
# stanza vuota al 20% di fumetto (come nel montaggio, tools/intensita.py), sopra le persone, ognuna ritagliata dalla
# sua variante (tools/varianti.py, poi tools/meno_dettagli.py). Escono img/g2/<luogo>-<strati>.jpg (per esempio
# cucina2-padre-figlia, o cucina2-vuota se non c'e' nessuno) con le stesse mappe dei luoghi del primo giorno.
# "strati": nome -> (persona, calore, immagine, maschere), nell'ordine delle persone del luogo (e' l'ordine dei grigi
# della mappa delle persone, lo stesso di gioco/js/giorno2.js); per ogni persona al massimo uno strato
G2C, G2S, G2K = "art/scene/01-cucina/giorno2/", "art/scene/02-soggiorno/giorno2/", "art/scene/03-camera/giorno2/"
GIORNO2 = {
    "cucina2": {
        "sfondo": "art/prove-stile/06-cucina/cucina_semplice.jpg", "sfondo_stile": "art/scene/01-cucina/stanza_stile_pulita.jpg",
        "strati": {
            "padre": ("padre", 0.95, G2C + "persone.jpg", [G2C + "maschere_persone/persone_maschera1.png"]),
            "figlia": ("figlia", 0.78, G2C + "persone.jpg", [G2C + "maschere_persone/persone_maschera2.png"]),
            # rimasta sana (i genitori al lazzaretto, e non ha dormito dal medico): quella del primo giorno
            "figlia_sana": ("figlia", 0.52, "art/scene/01-cucina/finale.jpg",
                            ["art/prove-stile/11-personaggi-50/maschere/ammorbiditi_persone_maschera2.png"]),
        },
        "nascosti": [], "lampade": [],
    },
    "camera2": {
        "sfondo": "art/scene/03-camera/stanza_vuota.jpg", "sfondo_stile": "art/scene/03-camera/stanza_stile_pulita.jpg",
        # la madre morta a letto: col letto intero, perche' coperta e lenzuolo sono rifatti
        "strati": {"madre": ("madre", 0.12, G2K + "persone.jpg",
                             [G2K + "maschere_persone/persone_maschera1.png", G2K + "maschere_persone/letto_maschera1.png"])},
        "nascosti": [], "lampade": [(0.305, 0.42, 0.018, 0.9)],
    },
    "soggiorno2": {
        "sfondo": "art/scene/02-soggiorno/stanza_vuota.jpg", "sfondo_stile": "art/scene/02-soggiorno/stanza_stile_pulita.jpg",
        "strati": {
            "uomo": ("uomo", 0.95, G2S + "persone.jpg", [G2S + "maschere_persone/persone_maschera1.png"]),
            "giovane": ("giovane", 0.4, G2S + "persone.jpg", [G2S + "maschere_persone/persone_maschera2.png"]),
            "giovane_febbre": ("giovane", 0.78, G2S + "persone_febbre.jpg",
                               [G2S + "maschere_persone_febbre/persone_maschera2.png"]),
            "nonna": ("nonna", 0.5, G2S + "persone.jpg", [G2S + "maschere_persone/persone_maschera3.png",
                                                         G2S + "maschere_persone/bastone_maschera1.png"]),
        },
        # il ragazzo, portato giu' in cantina: un calore debole sotto il pavimento, vicino alla porta
        "nascosti": [("ellisse", 0.83, 0.94, 0.09, 0.04, 0.6)],
        "lampade": [(0.385, 0.02, 0.03, 0.55)],
    },
}
# le espressioni del secondo giorno, solo dove la persona ha una versione sola (art/espressioni/giorno2/
# <persona>_<volto>.*, fatte dalla variante delle persone): si allineano alla scena con tutti in casa (SCENE2)
ESPRESSIONI2 = {"cucina2": {"figlia": ["piange"]}, "soggiorno2": {"uomo": ["arrabbiato"]}}
SCENE2 = {"cucina2": (["padre", "figlia"], G2C + "scena.jpg"), "soggiorno2": (["uomo", "giovane", "nonna"], G2S + "scena.jpg")}
# le foto del secondo giorno (in img/volti/g2), con la faccia di oggi
VOLTI2 = {
    "padre": (G2C + "persone.jpg", (0.27, 0.07, 0.42, 0.33)),
    "figlia": (G2C + "persone.jpg", (0.445, 0.225, 0.515, 0.345)),
    "madre": (G2K + "persone.jpg", (0.45, 0.33, 0.58, 0.50)),
    "uomo": (G2S + "persone.jpg", (0.56, 0.04, 0.70, 0.29)),
    "giovane": (G2S + "persone.jpg", (0.45, 0.16, 0.56, 0.36)),
    "giovane_febbre": (G2S + "persone_febbre.jpg", (0.45, 0.16, 0.56, 0.36)),
    "nonna": (G2S + "persone.jpg", (0.33, 0.20, 0.45, 0.40)),
}
# i primi piani nuovi del secondo giorno (in img/pp/g2); quelli che non cambiano restano del primo
PRIMI2 = {
    G2C + "primi-piani": ["padre", "figlia"],
    G2S + "primi-piani": ["uomo", "giovane", "nonna"],
    G2K + "primi-piani": ["madre"],
}


def fonte(f):
    """La versione con meno dettagli di un'immagine (tools/meno_dettagli.py), se c'e'; se no l'originale."""
    f = ROOT / f
    md = f.parent / "meno_dettagli" / (f.stem + ".jpg")
    if md.exists():
        return md
    print("  senza meno dettagli:", f.relative_to(ROOT))
    return f


def mask(paths, size):
    m = np.zeros((size[1], size[0]), np.float32)
    for p in paths:
        a = np.asarray(Image.open(ROOT / p).convert("L").resize(size, Image.BILINEAR)).astype(np.float32) / 255
        m = np.maximum(m, a)
    return m


def heat_blobs(draw_list, size):
    w, h = size
    im = Image.new("L", size, 0)
    d = ImageDraw.Draw(im)
    for kind, cx, cy, rx, ry, v in draw_list:
        d.ellipse([(cx - rx) * w, (cy - ry) * h, (cx + rx) * w, (cy + ry) * h], fill=int(v * 255))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(w * 0.012))).astype(np.float32) / 255


def luogo(nome, L, scena=None):
    scena = scena or Image.open(fonte(L["scena"])).convert("RGB")
    scena.resize((W, H), Image.LANCZOS).save(OUT / f"{nome}.jpg", quality=86)
    # chi c'e' sotto il puntatore
    idw, idh = 480, 270
    ids = np.zeros((idh, idw), np.uint8)
    for i, (persona, _, paths) in enumerate(L["persone"], 1):
        ids[mask(paths, (idw, idh)) > 0.5] = i * 40
    Image.fromarray(ids).save(OUT / f"{nome}_persone.png")
    # sagome per evidenziare e mappa di calore
    hw, hh = 800, 450
    rgb = np.asarray(scena.resize((hw, hh), Image.BILINEAR)).astype(np.float32) / 255
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    pelle = np.clip((r - b - 0.06) / 0.12, 0, 1) * np.clip((r - g + 0.02) / 0.08, 0, 1)
    calore = np.zeros((hh, hw), np.float32)
    for persona, caldo, paths in L["persone"]:
        m = mask(paths, (hw, hh))
        alpha = (np.clip(m, 0, 1) * 255).astype(np.uint8)
        sagoma = np.dstack([np.full_like(alpha, 255)] * 3 + [alpha])
        Image.fromarray(sagoma, "RGBA").save(OUT / f"{nome}_{persona}.png")
        corpo = m * caldo * (0.55 + 0.45 * pelle)
        calore = np.maximum(calore, corpo)
    calore = np.asarray(Image.fromarray((calore * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))
                        ).astype(np.float32) / 255
    if L["nascosti"]:
        calore = np.maximum(calore, heat_blobs(L["nascosti"], (hw, hh)))
    if L["lampade"]:
        calore = np.maximum(calore, heat_blobs([("ellisse", x, y, rr, rr * 16 / 9, v) for x, y, rr, v in L["lampade"]],
                                               (hw, hh)))
    Image.fromarray((np.clip(calore, 0, 1) * 255).astype(np.uint8)).save(OUT / f"{nome}_calore.png")
    print(nome, "ok")


# quanto disegno sulla scrivania: la foto mescolata alla versione disegnata
DISEGNO_SCRIVANIA = 0.4


def mescola(foto, disegno, size, quanto):
    a = np.asarray(Image.open(foto).convert("RGB").resize(size, Image.LANCZOS)).astype(np.float32)
    b = np.asarray(Image.open(disegno).convert("RGB").resize(size, Image.LANCZOS)).astype(np.float32)
    return Image.fromarray(np.clip(a * (1 - quanto) + b * quanto, 0, 255).astype(np.uint8))


def scrivania():
    base = ROOT / "art/scrivania"
    out = mescola(base / "scrivania_foto.jpg", base / "scrivania_stile.jpg", (1920, 1080), DISEGNO_SCRIVANIA)
    out.save(base / "scrivania.jpg", quality=93)
    out.resize((W, H), Image.LANCZOS).save(OUT / "scrivania.jpg", quality=86)
    # la mappa resta piu' grande dello schermo: nel gioco si ingrandisce. E' la pianta piatta e schematica del paese
    # (26 ottobre, GPT Image 2; le altre prove sono nella stessa cartella), usata com'e', senza mescolarla al disegno:
    # dove sono le 23 case e' scritto in TETTI in gioco/js/dati.js (lo calcola mappa_pianta/case.py). Le mappe di
    # prima sono mappa_25_case.jpg e mappa_paese.jpg (50 case). Dal 27 ottobre, sera, la mappa e' il paese in 3D
    # visto in obliquo (tools/mappa.py: il render di Blender sta in art/scrivania/mappa3d, qui si rimettono solo le
    # etichette e il pannello; per rifare anche il 3D: python3 tools/mappa.py tutto)
    import mappa
    mappa.componi()
    print("scrivania e mappa ok")


def primi():
    (OUT / "pp").mkdir(parents=True, exist_ok=True)
    n = 0
    for folder, persone in PRIMI.items():
        for f in sorted((ROOT / folder).glob("*.jpg")):
            if f.stem.split("_")[0] in persone:
                Image.open(fonte(f)).convert("RGB").resize((W, H), Image.LANCZOS).save(OUT / "pp" / f.name, quality=84)
                n += 1
    print("primi piani:", n)


def volti():
    (OUT / "volti").mkdir(parents=True, exist_ok=True)
    for persona, (src, box) in VOLTI.items():
        ritaglio_volto(Image.open(fonte(src)).convert("RGB"), box).save(OUT / "volti" / f"{persona}.jpg", quality=86)
    print("volti:", len(VOLTI))


def giornale():
    # il giornale disegnato (il testo lo stampa il gioco) e la foto della prima pagina, in bianco e nero: il medico di
    # spalle con la maschera della scheda (la videocamera, il cavo e la batteria sulla nuca) e il bastone-sonda
    Image.open(ROOT / "art/giornale/giornale.jpg").convert("RGB").save(OUT / "giornale.jpg", quality=86)
    Image.open(ROOT / "art/giornale/foto_medico_maschera.jpg").convert("L").resize((960, 720), Image.LANCZOS).save(
        OUT / "foto_medico.jpg", quality=84)
    print("giornale ok")


def ritaglio_volto(im, box):
    x0, y0, x1, y1 = box
    c = im.crop((int(x0 * im.width), int(y0 * im.height), int(x1 * im.width), int(y1 * im.height)))
    # 6:7 come una fototessera
    w, h = c.size
    if w / h > 6 / 7:
        nw = int(h * 6 / 7)
        c = c.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = int(w * 7 / 6)
        c = c.crop((0, 0, w, nh))
    return c.resize((240, 280), Image.LANCZOS)


def riallinea(scena, variante, testa):
    """La variante deformata finche' non combacia con la scena: prima tutta (affine), poi attorno alla testa."""
    h, w = scena.shape[:2]
    variante = cv2.resize(variante, (w, h), interpolation=cv2.INTER_AREA)
    grigio = lambda im: cv2.GaussianBlur(cv2.cvtColor(im, cv2.COLOR_RGB2GRAY), (0, 0), 1.5).astype(np.float32)
    a, b = grigio(scena), grigio(variante)
    criteri = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6)
    warp = np.eye(2, 3, dtype=np.float32)
    try:
        _, warp = cv2.findTransformECC(a, b, warp, cv2.MOTION_AFFINE, criteri, None, 5)
    except cv2.error:
        pass
    variante = cv2.warpAffine(variante, warp, (w, h), flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP,
                              borderMode=cv2.BORDER_REPLICATE)
    # attorno alla testa, solo uno spostamento: la faccia cambia, ma capelli e spalle restano
    cx, cy, rx, ry = testa
    x0, x1 = int(max(0, (cx - rx * 2) * w)), int(min(w, (cx + rx * 2) * w))
    y0, y1 = int(max(0, (cy - ry * 1.6) * h)), int(min(h, (cy + ry * 1.6) * h))
    a, b = grigio(scena)[y0:y1, x0:x1], grigio(variante)[y0:y1, x0:x1]
    sposta = np.eye(2, 3, dtype=np.float32)
    try:
        _, sposta = cv2.findTransformECC(a, b, sposta, cv2.MOTION_TRANSLATION, criteri, None, 5)
    except cv2.error:
        pass
    return cv2.warpAffine(variante, sposta, (w, h), flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP,
                          borderMode=cv2.BORDER_REPLICATE)


def espressioni():
    """Le teste delle espressioni, da incollare sopra la scena (ritagli RGBA) e le foto per il nastro delle frasi."""
    (OUT / "espressioni").mkdir(parents=True, exist_ok=True)
    (OUT / "volti").mkdir(parents=True, exist_ok=True)
    caselle = {}
    # il primo giorno e il secondo: la scena, le maschere delle persone, dove sono le varianti, dove vanno le foto
    gruppi = [(luogo_, persone, fonte(LUOGHI[luogo_]["scena"]), {chi: p for chi, _, p in LUOGHI[luogo_]["persone"]},
               ROOT / "art/espressioni", OUT / "volti", {**VOLTI, **{k: v for k, v in VOLTI_SCENA.items()}})
              for luogo_, persone in ESPRESSIONI.items()]
    (OUT / "volti" / "g2").mkdir(parents=True, exist_ok=True)
    for luogo_, persone in ESPRESSIONI2.items():
        maschere = {}
        for persona_, _, _, p in GIORNO2[luogo_]["strati"].values():
            maschere.setdefault(persona_, p)
        gruppi.append((luogo_, persone, ROOT / SCENE2[luogo_][1], maschere, ROOT / "art/espressioni/giorno2", OUT / "volti" / "g2",
                       VOLTI2))
    for luogo_, persone, scena_src, maschere, cartella, volti_out, riquadri in gruppi:
        sorgente = Image.open(scena_src).convert("RGB")
        scena = np.asarray(sorgente.resize((W, H), Image.LANCZOS))
        grande = np.asarray(sorgente.resize((W * 2, H * 2), Image.LANCZOS))
        gy, gx = np.mgrid[0:H, 0:W].astype(np.float32)
        for persona, volti_ in persone.items():
            cx, cy, rx, ry = TESTE[persona]
            d = np.sqrt(((gx / W - cx) / rx) ** 2 + ((gy / H - cy) / ry) ** 2)
            # pieno fino a 0.72 del raggio, poi sfuma fino al bordo
            alpha = np.clip((1 - d) / 0.28, 0, 1)
            alpha = alpha * alpha * (3 - 2 * alpha)
            # dalla variante si prende solo la persona (con un margine per capelli e spalle): lo sfondo attorno alla
            # testa resta quello della scena, anche se la scena e' cambiata dopo le varianti (la cucina ripulita)
            # (il margine e' in proporzione alla testa: le facce piccole, lontane, ne vogliono poco)
            paths = maschere[persona]
            margine = max(3, round(0.06 * ry * H))
            sua = cv2.dilate((mask(paths, (W, H)) > 0.5).astype(np.uint8),
                             cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * margine + 1, 2 * margine + 1)))
            alpha = alpha * cv2.GaussianBlur(sua.astype(np.float32), (0, 0), margine / 2.5)
            anello = (d > 1.0) & (d < 1.3)
            ys, xs = np.nonzero(alpha > 0)
            x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
            caselle.setdefault(luogo_, {})[persona] = {"box": [round(x0 / W, 5), round(y0 / H, 5), round(x1 / W, 5),
                                                                round(y1 / H, 5)], "volti": volti_}
            for volto in volti_:
                file = next(f for f in cartella.glob(f"{persona}_{volto}.*") if f.suffix in (".png", ".jpg"))
                variante = np.asarray(Image.open(fonte(file)).convert("RGB"))
                allineata = riallinea(scena, variante, TESTE[persona]).astype(np.float32)
                # la variante puo' avere una luce appena diversa: si corregge col colore attorno alla testa
                allineata += (scena[anello].astype(np.float32).mean(0) - allineata[anello].mean(0))
                rgba = np.dstack([np.clip(allineata, 0, 255), alpha * 255]).astype(np.uint8)[y0:y1, x0:x1]
                Image.fromarray(rgba, "RGBA").save(OUT / "espressioni" / f"{luogo_}_{persona}_{volto}.png", optimize=True)
                # la foto per il nastro: dalla scena grande con la testa nuova
                grande_v = riallinea(grande, variante, TESTE[persona]).astype(np.float32)
                a2 = cv2.resize(alpha, (W * 2, H * 2))[..., None]
                misto = Image.fromarray((grande * (1 - a2) + grande_v * a2).astype(np.uint8))
                box = riquadri[persona] if isinstance(riquadri[persona][0], float) else riquadri[persona][1]
                ritaglio_volto(misto, box).save(volti_out / f"{persona}_{volto}.jpg", quality=86)
            print("espressioni:", luogo_, persona, ", ".join(volti_))
    righe = ["// generato da tools/prepara_gioco.py: dove incollare le teste delle espressioni sopra la scena,",
             "// [x0, y0, x1, y1] in frazioni dell'immagine, e quali espressioni ci sono per ogni persona",
             "export const ESPRESSIONI = {"]
    for luogo_, persone in caselle.items():
        righe.append(f"  {luogo_}: {{")
        for persona, v in persone.items():
            righe.append(f"    {persona}: {{ box: {json.dumps(v['box'])}, volti: {json.dumps(v['volti'])} }},")
        righe.append("  },")
    righe.append("};")
    (ROOT / "gioco/js/espressioni.js").write_text("\n".join(righe) + "\n")


def carica(path, size, mode="RGB"):
    return np.asarray(Image.open(ROOT / path).convert(mode).resize(size, Image.LANCZOS)).astype(np.float32) / 255


def giorno2():
    """Le scene del secondo giorno, una per ogni combinazione di chi e' in casa (vedi GIORNO2)."""
    (OUT / "g2").mkdir(parents=True, exist_ok=True)
    size = (1920, 1080)
    n = 0
    for nome, G in GIORNO2.items():
        # la stanza vuota al 20%, come nel montaggio delle scene
        stanza = carica(G["sfondo"], size) * 0.8 + carica(G["sfondo_stile"], size) * 0.2
        per_persona = {}
        for s, (persona, caldo, src, paths) in G["strati"].items():
            per_persona.setdefault(persona, []).append(s)
        # ogni persona: assente o uno dei suoi strati
        scelte = [[None] + strati for strati in per_persona.values()]
        for combo in itertools.product(*scelte):
            strati = [s for s in combo if s]
            img = stanza.copy()
            for s in strati:
                persona, caldo, src, paths = G["strati"][s]
                m = Image.fromarray((mask(paths, size) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))
                m = np.asarray(m.filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32)[..., None] / 255
                fig = np.asarray(Image.open(fonte(src)).convert("RGB").resize(size, Image.LANCZOS)).astype(np.float32) / 255
                img = img * (1 - m) + fig * m
            scena = Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8))
            if nome in SCENE2 and strati == SCENE2[nome][0]:
                scena.save(ROOT / SCENE2[nome][1], quality=93)
            L = {"persone": [G["strati"][s][0:2] + (G["strati"][s][3],) for s in strati],
                 "nascosti": G["nascosti"], "lampade": G["lampade"]}
            luogo(f"g2/{nome}-{'-'.join(strati) or 'vuota'}", L, scena)
            n += 1
    # i primi piani nuovi
    (OUT / "pp" / "g2").mkdir(parents=True, exist_ok=True)
    for folder, persone in PRIMI2.items():
        for f in sorted((ROOT / folder).glob("*.jpg")):
            if f.stem.split("_")[0] in persone:
                Image.open(fonte(f)).convert("RGB").resize((W, H), Image.LANCZOS).save(OUT / "pp" / "g2" / f.name, quality=84)
    # le foto per lo stato di famiglia e la scheda della casa, con la faccia di oggi
    (OUT / "volti" / "g2").mkdir(parents=True, exist_ok=True)
    for chi, (src, box) in VOLTI2.items():
        ritaglio_volto(Image.open(fonte(src)).convert("RGB"), box).save(OUT / "volti" / "g2" / f"{chi}.jpg", quality=86)
    print("secondo giorno:", n, "scene")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for nome, L in LUOGHI.items():
        luogo(nome, L)
    scrivania()
    primi()
    volti()
    giornale()
    espressioni()
    giorno2()


if __name__ == "__main__":
    main()
