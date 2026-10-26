#!/usr/bin/env python3
"""Prepara texture e modelli della stanza del medico in 3D (gioco/js/stanza.js).

Uso: python3 tools/prepara_stanza.py

- Le texture vengono da art/stanza3d (generate con GPT Image 2, lavori in lavori.json) e finiscono
  ridotte in gioco/img/stanza; la finestra ha anche la maschera dei vetri, per farli brillare di giorno.
- Gli oggetti piccoli sulla scrivania (giornali, stato di famiglia, soldi, guanti, cassette) sono
  ritagliati dalla scrivania disegnata (gioco/img/scrivania.jpg), cosi' la scrivania in 3D somiglia a
  quella che si apre in 2D.
- I modelli 3D (Tripo, lavori in lavori_3d.json) si alleggeriscono con gltf-transform (tools/tre, da
  installare una volta con "npm install" in quella cartella) e finiscono in gioco/modelli come glTF in un
  file .json (la geometria dentro, le texture WebP accanto): gli Artifact di claude.ai non servono i .glb.
"""
import base64
import json
import pathlib
import subprocess
import tempfile

import cv2
import numpy as np
from PIL import Image, ImageFilter

RADICE = pathlib.Path(__file__).resolve().parent.parent
ART = RADICE / "art/stanza3d"
IMG = RADICE / "gioco/img/stanza"
MODELLI = RADICE / "gioco/modelli"
TRE = RADICE / "tools/tre"

# texture: nome -> larghezza massima (l'altezza segue le proporzioni)
TEXTURE = {
    "carta_parati": 512, "pavimento": 512, "legno": 512, "coperta": 512, "porta": 320, "armadio": 384,
    "testiera": 448, "comodino": 320, "santino": 224, "finestra": 512, "finestra_chiusa": 512,
}
# i vetri della finestra (frazioni dell'immagine): di giorno sono la luce che entra
VETRI = [(0.10, 0.27, 0.45, 0.905), (0.53, 0.27, 0.88, 0.905)]
# ritagli dalla scrivania disegnata (1600x900): nome -> riquadro, e se va scontornato dal legno
SCRIVANIA = {
    "giornali": ((620, 62, 952, 228), False),
    "taccuino": ((176, 618, 308, 796), True),
    "soldi": ((330, 596, 470, 748), True),
    "guanti": ((820, 586, 1062, 832), True),
    "cassetta": ((1192, 588, 1314, 774), False),
}
# i modelli 3D da alleggerire
OGGETTI = ["sedia", "lampada", "fax", "televisore", "cappotto", "borsa", "termosifone", "maschera"]


def riduci(im, larghezza):
    if im.width <= larghezza:
        return im
    return im.resize((larghezza, round(im.height * larghezza / im.width)), Image.LANCZOS)


def texture():
    IMG.mkdir(parents=True, exist_ok=True)
    for nome, largo in TEXTURE.items():
        sorgente = ART / f"{nome}.jpg"
        if not sorgente.exists():
            print(f"manca   {sorgente.name}")
            continue
        im = riduci(Image.open(sorgente).convert("RGB"), largo)
        im.save(IMG / f"{nome}.jpg", quality=86)
    # la maschera dei vetri: bianca dove entra la luce del giorno, con i bordi sfumati
    fin = Image.open(IMG / "finestra.jpg")
    m = Image.new("L", fin.size, 0)
    a = np.zeros((fin.height, fin.width), np.uint8)
    for x0, y0, x1, y1 in VETRI:
        a[round(y0 * fin.height):round(y1 * fin.height), round(x0 * fin.width):round(x1 * fin.width)] = 255
    m = Image.fromarray(a).filter(ImageFilter.GaussianBlur(2))
    luce = Image.composite(fin, Image.new("RGB", fin.size, 0), m)
    luce.save(IMG / "finestra_luce.jpg", quality=86)
    # il calendario della ditta senza l'anno stampato in fondo (diceva 1996)
    cal = Image.open(ART / "calendario.jpg").convert("RGB")
    cal = cal.crop((0, 0, cal.width, round(cal.height * 0.935)))
    riduci(cal, 288).save(IMG / "calendario.jpg", quality=86)
    # la mappa sulla scrivania e' quella del gioco
    riduci(Image.open(RADICE / "gioco/img/mappa.jpg").convert("RGB"), 768).save(IMG / "mappa.jpg", quality=84)
    print("texture ok")


def scontorna(im):
    """Toglie il legno della scrivania attorno a un oggetto: alfa dove il colore si allontana dal legno."""
    a = np.asarray(im.convert("RGB"))
    lab = cv2.cvtColor(a, cv2.COLOR_RGB2LAB).astype(np.float32)
    bordo = np.concatenate([lab[:4].reshape(-1, 3), lab[-4:].reshape(-1, 3), lab[:, :4].reshape(-1, 3), lab[:, -4:].reshape(-1, 3)])
    legno = np.median(bordo, axis=0)
    d = np.linalg.norm(lab - legno, axis=2)
    m = (d > 22).astype(np.uint8)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k, iterations=2)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, k)
    # tiene i pezzi grandi (le monete sono pezzi a parte) e riempie i buchi
    n, lab_cc, stats, _ = cv2.connectedComponentsWithStats(m)
    tieni = np.zeros_like(m)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] > m.size * 0.01:
            tieni[lab_cc == i] = 1
    contorni, _ = cv2.findContours(tieni, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    piena = np.zeros_like(tieni)
    cv2.drawContours(piena, contorni, -1, 1, thickness=cv2.FILLED)
    alfa = cv2.GaussianBlur((piena * 255).astype(np.uint8), (3, 3), 0)
    out = np.dstack([a, alfa])
    return Image.fromarray(out, "RGBA")


def scrivania():
    disegno = Image.open(RADICE / "gioco/img/scrivania.jpg").convert("RGB")
    for nome, (box, togli) in SCRIVANIA.items():
        pezzo = disegno.crop(box)
        if togli:
            scontorna(pezzo).save(IMG / f"{nome}.png")
        else:
            pezzo.save(IMG / f"{nome}.jpg", quality=88)
    print("scrivania ok")


def modelli():
    MODELLI.mkdir(parents=True, exist_ok=True)
    cli = TRE / "node_modules/.bin/gltf-transform"
    if not cli.exists():
        print("manca gltf-transform: npm install in tools/tre")
        return
    for nome in OGGETTI:
        sorgente = ART / f"{nome}.glb"
        if not sorgente.exists():
            print(f"manca   {sorgente.name}")
            continue
        with tempfile.TemporaryDirectory() as tmp:
            leggero = pathlib.Path(tmp) / "leggero.glb"
            subprocess.run([str(cli), "optimize", str(sorgente), str(leggero), "--compress", "false",
                            "--texture-compress", "webp", "--texture-size", "512", "--simplify", "false"],
                           check=True, capture_output=True)
            # il glTF separato: la geometria va dentro il .json, le immagini accanto col nome del modello
            gltf = pathlib.Path(tmp) / "modello.gltf"
            subprocess.run([str(cli), "copy", str(leggero), str(gltf)], check=True, capture_output=True)
            j = json.loads(gltf.read_text())
            for b in j.get("buffers", []):
                dati = (gltf.parent / b["uri"]).read_bytes()
                b["uri"] = "data:application/octet-stream;base64," + base64.b64encode(dati).decode()
            for i, im in enumerate(j.get("images", [])):
                if "uri" not in im:
                    continue
                file = f"{nome}_{i}{pathlib.Path(im['uri']).suffix}"
                (MODELLI / file).write_bytes((gltf.parent / im["uri"]).read_bytes())
                im["uri"] = file
        dest = MODELLI / f"{nome}.json"
        dest.write_text(json.dumps(j, separators=(",", ":")))
        peso = sum(f.stat().st_size for f in MODELLI.glob(f"{nome}*")) // 1024
        print(f"modello {nome}: {sorgente.stat().st_size // 1024} KB -> {peso} KB")


if __name__ == "__main__":
    texture()
    scrivania()
    modelli()
