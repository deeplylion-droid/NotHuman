#!/usr/bin/env python3
"""Dove sono le case sulla mappa schematica (schematica.jpg): stampa TETTI e i luoghi per gioco/js/dati.js.

Uso: python3 art/scrivania/mappa_pianta/case.py

Le case si trovano dal colore (il beige pieno delle case, diverso dal verde dei campi e dal giallo delle strade);
quali sono le 23 col numero, e in che ordine, si e' deciso guardando la mappa (26 ottobre): per file dall'alto,
da sinistra a destra. Restano senza spillo l'edificio piccolo accanto alla casa 3 e quello sulla piazza, a destra
della chiesa.
"""
import json
import pathlib

import cv2
import numpy as np
from PIL import Image

QUI = pathlib.Path(__file__).resolve().parent
W, H = 2560, 1440
# le 23 case in ordine (un punto dentro ognuna, in pixel della mappa)
CASE = [(861, 423), (1032, 334), (1232, 308), (1556, 365), (1749, 401),
        (958, 560), (1113, 492), (1374, 515), (1504, 528), (1639, 552),
        (849, 747), (995, 697), (1794, 670),
        (800, 923), (1040, 831), (1144, 892), (1348, 845), (1532, 826), (1721, 850),
        (1112, 1070), (1354, 1009), (1562, 1013),
        (1322, 1139)]
CHIESA, CIMITERO = (1233, 661), (620, 1180)   # nel cimitero, tra le croci
# il recinto della Panacea: nel cortile, a sinistra dei tre prefabbricati e sopra la scritta
DITTA = (2090, 662)
# lo spillo sta sotto il centro della casa (di questa frazione dell'altezza), cosi' la testa resta sulla casa e non
# copre vie e scritte, anche sul telefono dove gli spilli sono piu' grandi
SOTTO = 0.35


def forme():
    a = np.asarray(Image.open(QUI / "schematica.jpg").convert("RGB")).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = ((r - g > 20) & (r - g < 50) & (r - b > 65) & (r > 190) & (r < 240)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    return cv2.connectedComponentsWithStats(m)


def main():
    _, lab, st, cen = forme()

    def forma(p):
        i = lab[p[1], p[0]]
        assert i, f"nessuna casa in {p}"
        x, y, w, h, _ = st[i]
        return i, w, h, cen[i][0], cen[i][1]

    tetti = []
    for p in CASE:
        i, w, h, cx, cy = forma(p)
        x, y = cx, cy + SOTTO * h
        # la punta dello spillo (fino a 10 pixel sotto) deve cadere dentro la casa, anche nelle case a L
        while not (lab[round(y), round(x)] == i and lab[round(y + 10), round(x)] == i):
            y -= 1
        # l'ellisse: col cerchio a matita di gioco.js (1.3 e 1.2 volte, piu' il tremolio) deve chiudere la casa
        rx = (2 ** 0.5 * w / 2 + 4) / 1.352
        ry = (2 ** 0.5 * h / 2 + 4) / 1.248
        tetti.append([round(v, 4) for v in (x / W, y / H, cx / W, cy / H, rx / W, ry / H)])
    luoghi = {}
    for nome, p in (("chiesa", CHIESA), ("cimitero", CIMITERO)):
        _, _, h, cx, cy = forma(p)
        luoghi[nome] = (round(cx / W, 4), round((cy + SOTTO * h) / H, 4))
    luoghi["ditta"] = (round(DITTA[0] / W, 4), round(DITTA[1] / H, 4))

    riga = lambda t: "[" + ", ".join(json.dumps(v) for v in t) + "]"  # noqa: E731
    print("const TETTI = [")
    for k in range(0, len(tetti), 3):
        print("  " + ", ".join(riga(t) for t in tetti[k:k + 3]) + ",")
    print("];")
    for nome, (x, y) in luoghi.items():
        print(f"{nome}: x: {x}, y: {y}")


if __name__ == "__main__":
    main()
