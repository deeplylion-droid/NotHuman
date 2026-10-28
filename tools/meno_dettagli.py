#!/usr/bin/env python3
"""I personaggi con meno dettagli, senza sfocarli (scelto il 26 ottobre: art/prove-stile/20-meno-dettagli).

Uso: python3 tools/meno_dettagli.py                 tutte le immagini con personaggi del gioco
     python3 tools/meno_dettagli.py <immagine> ...   solo queste (devono essere tra quelle del gioco)

Per ogni immagine si fa una versione con meno dettagli nella cartella meno_dettagli/ accanto, con lo stesso nome
(in .jpg); gli originali restano come sono, e tools/prepara_gioco.py usa la versione con meno dettagli quando c'e'.
1. L'immagine si rimpicciolisce (a 640x360 punti se e' 16:9, alla stessa superficie se no) e si ingrandisce di
   nuovo con Real-ESRGAN (fal-ai/esrgan, modello RealESRGAN_x4plus): pori, grana, rughe fini e macchie spariscono,
   i contorni tornano nitidi.
2. Dell'originale si tengono i colori e le luci d'insieme (la parte sfocata), di Real-ESRGAN solo il dettaglio.
3. Si prende solo sui personaggi: nelle scene e nelle espressioni con le maschere delle persone di prepara_gioco;
   i primi piani e la scheda della figlia sono tutti personaggio e si prendono interi.
4. Occhi e bocche restano originali (Real-ESRGAN li rovinava): maschere di SAM 3 ("eye" e "mouth"), allargate in
   proporzione per prendere palpebre, occhiaie e labbra, coi bordi sfumati. Le bocche che SAM 3 non trova sono
   ellissi scritte a mano in A_MANO.
5. Le facce piccole, lontane (meno di PICCOLA della larghezza dell'immagine, per esempio la figlia sulla porta),
   restano originali per intero: li' i dettagli non si vedono comunque, e Real-ESRGAN le deforma (maschere "face").
Ogni passaggio salta se il suo file c'e' gia' (meno_dettagli/esrgan/, meno_dettagli/maschere/, l'immagine finale):
per rifarne uno basta cancellarlo. Costa un paio di centesimi a immagine.
"""
import concurrent.futures
import json
import pathlib
import sys
import tempfile

import cv2
import numpy as np
from PIL import Image

QUI = pathlib.Path(__file__).resolve().parent
ROOT = QUI.parent
sys.path.insert(0, str(QUI))
import fal_batch  # noqa: E402
import prepara_gioco  # noqa: E402

ESRGAN, SAM = "fal-ai/esrgan", "fal-ai/sam-3/image"
SUPERFICIE = 640 * 360
# una faccia e' piccola se il lato (la radice della sua superficie) e' meno di questa frazione della larghezza
PICCOLA = 0.04
# bocche che SAM 3 non trova (nemmeno come "lips" o "teeth"): ellissi (cx, cy, rx, ry) in frazioni dell'immagine
A_MANO = {
    "art/scene/01-cucina/finale.jpg": [(0.48698, 0.30556, 0.00625, 0.00648)],  # la figlia sulla porta, troppo piccola
}


def immagini():
    """Le immagini con personaggi che usa il gioco: {percorso: maschere delle persone, o None se e' tutta persona}."""
    out = {}
    for luogo, L in prepara_gioco.LUOGHI.items():
        persone = [p for _, _, paths in L["persone"] for p in paths]
        out[ROOT / L["scena"]] = persone
        for persona in prepara_gioco.ESPRESSIONI.get(luogo, {}):
            for volto in prepara_gioco.ESPRESSIONI[luogo][persona]:
                out[next((ROOT / "art/espressioni").glob(f"{persona}_{volto}.*"))] = persone
    # le case nuove del secondo giorno: una scena per luogo, come quelle del primo
    for luogo, L in prepara_gioco.LUOGHI2.items():
        out[ROOT / L["scena"]] = [p for _, _, paths in L["persone"] for p in paths]
    # le espressioni del secondo giorno, con le maschere delle persone della loro variante (o della scena nuova)
    for luogo, persone in prepara_gioco.ESPRESSIONI2.items():
        if luogo in prepara_gioco.LUOGHI2:
            maschere = [p for _, _, paths in prepara_gioco.LUOGHI2[luogo]["persone"] for p in paths]
        else:
            maschere = [p for _, _, src, paths, *_ in prepara_gioco.GIORNO2[luogo]["strati"].values() if "/giorno2/" in src for p in paths]
        for persona, volti in persone.items():
            for volto in volti:
                for f in (ROOT / "art/espressioni/giorno2").glob(f"{persona}_{volto}.*"):
                    if f.suffix in (".png", ".jpg"):
                        out[f] = maschere
    # il secondo giorno: le varianti con le persone cambiate, con le maschere di chi se ne prende
    for G in prepara_gioco.GIORNO2.values():
        for _, _, src, paths, *_ in G["strati"].values():
            if "/giorno2/" in src:
                lista = out.setdefault(ROOT / src, [])
                lista += [p for p in paths if p not in lista]
    for cartella, persone in {**prepara_gioco.PRIMI, **prepara_gioco.PRIMI2}.items():
        for f in sorted((ROOT / cartella).glob("*.jpg")):
            if f.stem.split("_")[0] in persone:
                out[f] = None
    for src, _ in prepara_gioco.VOLTI.values():
        out.setdefault(ROOT / src, None)
    return out


def cartella(f):
    return f.parent / "meno_dettagli"


def uscita(f):
    return cartella(f) / (f.stem + ".jpg")


def lavori(f):
    """I lavori di fal che mancano per questa immagine."""
    c = cartella(f)
    out = []
    if not (c / "esrgan" / f"{f.stem}.jpg").exists():
        im = Image.open(f).convert("RGB")
        s = (SUPERFICIE / (im.width * im.height)) ** 0.5
        piccola = c / "esrgan" / f"{f.stem}_piccola.png"
        piccola.parent.mkdir(parents=True, exist_ok=True)
        im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS).save(piccola)
        out.append({"nome": f"{f.stem}_esrgan", "modello": ESRGAN, "cartella": c / "esrgan",
                    "input": {"image_url": f"@file:{piccola}", "model": "RealESRGAN_x4plus", "scale": round(1 / s, 3),
                              "face": False, "output_format": "png"}})
    for parte in ("eye", "mouth", "face"):
        if not any((c / "maschere").glob(f"{f.stem}_{parte}*")):
            (c / "maschere").mkdir(parents=True, exist_ok=True)
            out.append({"nome": f"{f.stem}_{parte}", "modello": SAM, "cartella": c / "maschere",
                        "input": {"image_url": f"@file:{f}", "prompt": parte, "apply_mask": False,
                                  "include_scores": True, "output_format": "png", "return_multiple_masks": True,
                                  "max_masks": 8}})
    return out


def esegui(tutti):
    key = fal_batch.load_key()

    def uno(j):
        try:
            res = fal_batch.run(j, key, j["cartella"], ROOT)
        except RuntimeError as e:
            if j["modello"] == SAM and "nessuna immagine" in str(e):
                # niente da ritagliare (per esempio nessuna bocca in un primo piano delle mani): lo si segna
                (j["cartella"] / f"{j['nome']}_nessuna").write_text("")
                return f"--  {j['nome']}: nessuna"
            raise
        if j["modello"] == ESRGAN:
            png = j["cartella"] / res["file"][0]
            Image.open(png).convert("RGB").save(j["cartella"] / f"{j['nome'][:-len('_esrgan')]}.jpg", quality=95)
            png.unlink()
            (j["cartella"] / f"{j['nome'][:-len('_esrgan')]}_piccola.png").unlink()
        else:
            # di SAM 3 servono solo le maschere, non l'immagine con le maschere sopra
            for nome in res["file"]:
                if "_maschera" not in nome:
                    (j["cartella"] / nome).unlink()
        return f"ok  {j['nome']} ({res['secondi']}s)"

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for r in pool.map(uno, tutti):
            print(r, flush=True)


def maschera(paths, size):
    return prepara_gioco.mask(paths, size)


def occhi_bocche(f, w, h):
    """Dove tenere l'originale: occhi, bocche e facce piccole, allargati in proporzione alla grandezza e sfumati."""
    carica = lambda p: np.asarray(Image.open(p).convert("L").resize((w, h), Image.BILINEAR), np.float32) / 255  # noqa: E731
    pezzi = [(carica(p), 0.25) for parte in ("eye", "mouth")
             for p in sorted((cartella(f) / "maschere").glob(f"{f.stem}_{parte}_maschera*.png"))]
    for p in sorted((cartella(f) / "maschere").glob(f"{f.stem}_face_maschera*.png")):
        x = carica(p)
        if np.sqrt((x > 0.5).sum()) < PICCOLA * w:
            pezzi.append((x, 0.12))
    for cx, cy, rx, ry in A_MANO.get(str(f.relative_to(ROOT)), []):
        e = np.zeros((h, w), np.float32)
        e = cv2.ellipse(e, (round(cx * w), round(cy * h)), (round(rx * w), round(ry * h)), 0, 0, 360, 1.0, -1)
        pezzi.append((e, 0.25))
    m = np.zeros((h, w), np.float32)
    for x, quanto in pezzi:
        r = max(2, round(np.sqrt((x > 0.5).sum()) * quanto))
        x = cv2.dilate(x, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1)))
        m = np.maximum(m, cv2.GaussianBlur(x, (0, 0), max(1.0, r * 0.5)))
    return m[..., None]


def componi(f, persone):
    a = np.asarray(Image.open(f).convert("RGB"), np.float32) / 255
    h, w = a.shape[:2]
    b = np.asarray(Image.open(cartella(f) / "esrgan" / f"{f.stem}.jpg").convert("RGB").resize((w, h), Image.LANCZOS),
                   np.float32) / 255
    # il dettaglio di Real-ESRGAN, con i colori e le luci d'insieme dell'originale
    sigma = 8 * w / 1920
    b = np.clip(b + cv2.GaussianBlur(a, (0, 0), sigma) - cv2.GaussianBlur(b, (0, 0), sigma), 0, 1)
    if persone:
        k = max(3, round(5 * w / 1920)) | 1
        m = cv2.dilate(maschera(persone, (w, h)), np.ones((k, k), np.uint8))
        m = cv2.GaussianBlur(m, (0, 0), 1.5 * w / 1920)[..., None]
        b = a * (1 - m) + b * m
    ob = occhi_bocche(f, w, h)
    out = b * (1 - ob) + a * ob
    Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(uscita(f), quality=93)


def main():
    tutte = immagini()
    if len(sys.argv) > 1:
        scelte = {pathlib.Path(a).resolve() for a in sys.argv[1:]}
        tutte = {f: p for f, p in tutte.items() if f in scelte}
    da_fare = [j for f in tutte for j in lavori(f)]
    if da_fare:
        print(f"{len(da_fare)} lavori su fal", flush=True)
        esegui(da_fare)
    for f, persone in tutte.items():
        componi(f, persone)
        print("meno dettagli:", uscita(f).relative_to(ROOT), flush=True)


if __name__ == "__main__":
    main()
