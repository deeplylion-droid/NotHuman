#!/usr/bin/env python3
"""Prepara texture e modelli della stanza del medico in 3D (gioco/js/stanza.js).

Uso: python3 tools/prepara_stanza.py

- Le texture vengono da art/stanza3d (generate con GPT Image 2, lavori in lavori.json) e finiscono
  ridotte in gioco/img/stanza; la finestra ha anche la maschera dei vetri, per farli brillare di giorno.
- I modelli 3D si alleggeriscono con tools/tre/alleggerisci.mjs (gltf-transform e meshoptimizer; tools/tre va
  installata una volta con "npm install" in quella cartella) e finiscono in gioco/modelli come glTF in un file .json
  (la geometria dentro, le texture WebP accanto): gli Artifact di claude.ai non servono i .glb. I mobili sono di
  Meshy (art/stanza3d/mobili, lavori in lavori_3d.json, con le foto di riferimento fatte con GPT Image 2 in
  lavori.json): la forma resta com'e', le texture (colore, rilievo, lucido) scendono a 1024 punti. Anche gli oggetti
  della scrivania sono di Meshy (art/stanza3d/scrivania3d: fax, lampada, televisore, videoregistratore, cassette,
  giornale, cartella dello stato di famiglia, soldi, guanti, maschera), con le texture a 1024 o a 512. Gli altri
  oggetti piccoli sono di Tripo (art/stanza3d, lavori in lavori_3d.json), con le texture a 512. La geometria e'
  quantizzata e compressa (EXT_meshopt_compression: Three.js la legge con MeshoptDecoder), e pesa meta' di prima;
  semplificarla non conviene (vedi alleggerisci.mjs).
- Il pavimento ha anche il rilievo delle assi (pavimento_normale.jpg), calcolato dalla sua immagine.
"""
import pathlib
import subprocess

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
    "carta_parati": 1024, "pavimento": 1024, "legno": 1024, "porta": 512, "santino": 256, "finestra": 768,
    "finestra_chiusa": 768, "mobili/tappeto": 1024,
}
# i vetri della finestra (frazioni dell'immagine): di giorno sono la luce che entra
VETRI = [(0.10, 0.27, 0.45, 0.905), (0.53, 0.27, 0.88, 0.905)]
# i modelli 3D da alleggerire: nome -> (file sorgente in art/stanza3d, lato massimo delle texture). Gli oggetti della
# scrivania sono di Meshy (art/stanza3d/scrivania3d): si guardano da vicino quando ci si siede alla scrivania. Gli
# altri oggetti piccoli sono ancora di Tripo
OGGETTI = {
    "sedia": ("sedia.glb", 512), "cappotto": ("cappotto.glb", 512), "borsa": ("borsa.glb", 512),
    "termosifone": ("termosifone.glb", 512),
    "scrivania": ("mobili/scrivania.glb", 1024), "letto": ("mobili/letto.glb", 1024),
    "comodino": ("mobili/comodino.glb", 1024), "armadio": ("mobili/armadio.glb", 1024),
    "credenza": ("mobili/credenza.glb", 1024), "lavandino": ("mobili/lavandino.glb", 1024),
    "tavolo": ("mobili/tavolo.glb", 1024), "brandina": ("mobili/brandina.glb", 1024),
    "fax": ("scrivania3d/fax.glb", 1024), "lampada": ("scrivania3d/lampada.glb", 1024),
    "televisore": ("scrivania3d/televisore.glb", 1024), "videoregistratore": ("scrivania3d/videoregistratore.glb", 1024),
    "maschera": ("scrivania3d/maschera.glb", 1024), "giornale": ("scrivania3d/giornale.glb", 1024),
    "cassette": ("scrivania3d/cassette.glb", 512), "cartella": ("scrivania3d/cartella.glb", 512),
    "soldi": ("scrivania3d/soldi.glb", 512), "guanti": ("scrivania3d/guanti.glb", 512),
}


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
        im.save(IMG / f"{pathlib.Path(nome).name}.jpg", quality=86)
    normale("pavimento", 3.0)
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


def normale(nome, forza):
    """Il rilievo di una texture (normal map) dalla sua luce: le fessure scure diventano solchi."""
    a = np.asarray(Image.open(IMG / f"{nome}.jpg").convert("L"), np.float32) / 255
    # la texture si ripete: i bordi si toccano (si allarga girando attorno, si calcola, si ritaglia)
    m = 8
    a = cv2.copyMakeBorder(a, m, m, m, m, cv2.BORDER_WRAP)
    a = cv2.GaussianBlur(a, (0, 0), 1.2)
    gx = cv2.Sobel(a, cv2.CV_32F, 1, 0, ksize=3)[m:-m, m:-m] * forza
    gy = cv2.Sobel(a, cv2.CV_32F, 0, 1, ksize=3)[m:-m, m:-m] * forza
    a = a[m:-m, m:-m]
    n = np.dstack([-gx, gy, np.ones_like(a)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    Image.fromarray(((n * 0.5 + 0.5) * 255 + 0.5).astype(np.uint8)).save(IMG / f"{nome}_normale.jpg", quality=90)


def modelli():
    MODELLI.mkdir(parents=True, exist_ok=True)
    if not (TRE / "node_modules").exists():
        print("manca gltf-transform: npm install in tools/tre")
        return
    for nome, (file, lato) in OGGETTI.items():
        sorgente = ART / file
        if not sorgente.exists():
            print(f"manca   {sorgente.name}")
            continue
        subprocess.run(["node", str(TRE / "alleggerisci.mjs"), str(sorgente), str(MODELLI), nome, str(lato)],
                       check=True, capture_output=True)
        peso = sum(f.stat().st_size for f in MODELLI.glob(f"{nome}*")) // 1024
        print(f"modello {nome}: {sorgente.stat().st_size // 1024} KB -> {peso} KB")


if __name__ == "__main__":
    texture()
    modelli()
