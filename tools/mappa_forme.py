"""Le forme del paese, ricavate dalla pianta schematica (art/scrivania/mappa_pianta/schematica.jpg, GPT Image 2, 26
ottobre): isolati, case, chiesa, fiume, ponti, alberi, cimitero, il recinto della PANACEA coi prefabbricati e le
strade. Le usano la mappa in 3D (tools/mappa.py) e la planimetria tecnica (tools/mappa_tecnica.py). Le misure sono
in punti della pianta, 2560 x 1440.
"""
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from skimage.morphology import skeletonize

RADICE = Path(__file__).resolve().parent.parent
BASE = RADICE / "art/scrivania/mappa_pianta/schematica.jpg"
W, H = 2560, 1440


def classi():
    im = np.asarray(Image.open(BASE).convert("RGB").resize((W, H), Image.LANCZOS), np.float32)
    centri = {"carta": (248, 232, 200), "campo": (200, 200, 136), "campo2": (184, 184, 120), "cachi": (200, 184, 136),
              "casa": (216, 184, 136), "speciale": (216, 200, 168), "fiume": (196, 216, 200), "albero": (136, 120, 88),
              "inchiostro": (70, 62, 50)}
    nomi = list(centri)
    c = np.array([centri[n] for n in nomi], np.float32)
    d = ((im[:, :, None, :] - c[None, None]) ** 2).sum(-1)
    cl = d.argmin(-1)
    return {n: (cl == i) for i, n in enumerate(nomi)}


def k(n):
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n))


def pulisci(m, apri=3, chiudi=3):
    m = m.astype(np.uint8)
    if chiudi:
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k(chiudi))
    if apri:
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, k(apri))
    return m


def riempi_buchi(m):
    f = (m > 0).astype(np.uint8)
    h, w = f.shape
    inv = (1 - f).astype(np.uint8)
    cv2.floodFill(inv, np.zeros((h + 2, w + 2), np.uint8), (0, 0), 2)
    return ((inv != 2) | (f > 0)).astype(np.uint8)


def poligoni(m, eps, area_min, allarga=0):
    if allarga:
        m = cv2.dilate(m.astype(np.uint8), k(allarga * 2 + 1))
    cs, _ = cv2.findContours(m.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = []
    for c in cs:
        if cv2.contourArea(c) < area_min:
            continue
        out.append(cv2.approxPolyDP(c, eps, True)[:, 0, :].astype(np.float32))
    return out


def potatura(sk, passi):
    """toglie i rametti dello scheletro: per "passi" volte, i punti con un solo vicino"""
    sk = sk.astype(np.uint8)
    kern = np.ones((3, 3), np.uint8)
    for _ in range(passi):
        vicini = cv2.filter2D(sk, -1, kern, borderType=cv2.BORDER_CONSTANT) - sk
        sk = sk & ~((vicini <= 1) & (sk > 0)).astype(np.uint8) & 1
    return sk


def strade(pieno):
    """le linee di mezzo delle strade: lo scheletro dello spazio libero tra isolati, case, fiume, cimitero e recinto,
    tenuto solo dove e' una strada, cioe' stretto (mezza larghezza tra 5 e 44 punti): niente sentierini tra i campi,
    niente piazza e niente bordo bianco attorno al paese; poi via i rametti"""
    libero = (pieno == 0).astype(np.uint8)
    larg = cv2.distanceTransform(libero, cv2.DIST_L2, 5)
    sk = skeletonize(libero > 0).astype(np.uint8)
    sk = (sk > 0) & (larg >= 5) & (larg <= 44)
    sk = potatura(sk.astype(np.uint8), 22)
    n, lab, stat, _ = cv2.connectedComponentsWithStats(sk.astype(np.uint8), connectivity=8)
    tieni = np.zeros(sk.shape, np.uint8)
    for i in range(1, n):
        if stat[i][4] > 80:
            tieni[lab == i] = 1
    # quanto e' larga la strada in ogni punto della linea: le strade vere sono piu' larghe dei sentieri tra i campi
    return tieni, ((libero > 0) & (larg <= 46)).astype(np.uint8), larg * tieni


def forme():
    c = classi()
    verde = c["campo"] | c["cachi"] | c["campo2"]
    isolati = riempi_buchi(pulisci(verde, apri=5, chiudi=9))
    # via i pezzetti: le scritte delle vie, coi bordi sfumati, a volte sembrano verdi
    n, lab, stat, _ = cv2.connectedComponentsWithStats(isolati)
    for i in range(1, n):
        if stat[i][4] < 4000:
            isolati[lab == i] = 0
    case = pulisci(c["casa"], apri=5, chiudi=5)
    speciali = pulisci(c["speciale"], apri=5, chiudi=5)
    fiume = pulisci(c["fiume"], apri=5, chiudi=7)
    prati = pulisci(c["campo2"], apri=9, chiudi=9)
    # gli alberi: i pallini scuri, uno per uno
    n, lab, stat, cen = cv2.connectedComponentsWithStats(pulisci(c["albero"], apri=3, chiudi=0))
    alberi = [(cen[i][0], cen[i][1], math.sqrt(stat[i][4] / math.pi)) for i in range(1, n) if 60 < stat[i][4] < 2500]
    # le aree speciali: il recinto della ditta (a destra), il cimitero (in basso a sinistra), i ponti (sul fiume)
    n, lab, stat, cen = cv2.connectedComponentsWithStats(speciali)
    ditta = cimitero = None
    ponti = []
    for i in range(1, n):
        x, y, w, h, a = stat[i]
        if a < 400:
            continue
        m = (lab == i).astype(np.uint8)
        if x > W * 0.7 and a > 20000:
            ditta = m
        elif x < W * 0.4 and y > H * 0.6 and a > 20000:
            cimitero = m
        else:
            ponti.append(m)
    # i prefabbricati della ditta: i rettangoli bianchi dentro il recinto
    prefab = []
    if ditta is not None:
        pieno = riempi_buchi(ditta)
        dentro = (pieno > 0) & ~(ditta > 0) & c["carta"]
        prefab = poligoni(pulisci(dentro, apri=5, chiudi=3), 2.0, 800)
        ditta = pieno
    if cimitero is not None:
        cimitero = riempi_buchi(cimitero)
    pieno = (isolati > 0) | (fiume > 0) | (case > 0)
    for m in (ditta, cimitero):
        if m is not None:
            pieno |= m > 0
    linee, area_strade, larghezza = strade(pieno.astype(np.uint8))
    return dict(isolati=isolati, case=case, fiume=fiume, prati=prati, alberi=alberi, ditta=ditta, cimitero=cimitero,
                ponti=ponti, prefab=prefab, strade=linee, area_strade=area_strade, larghezza=larghezza)
