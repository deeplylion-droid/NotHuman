#!/usr/bin/env python3
"""Le immagini dell'ospite della notte: la stanzetta vista dalla porta e il nastro della notte.

Uso: python3 tools/ospite.py [nome ...]      (senza nomi: tutto quello che manca)

Tutto in art/ospite, descritto in ospite.json:
- "basi": le inquadrature. Ognuna parte da una vista della stanza 3D del gioco (basi/<base>.jpg, fatta con
  tools/viste_ospite.js), cosi' la stanzetta e la stanza sono quelle in cui si cammina. Per ogni base, come per le
  scene (tools/scena.py): <base>_foto.jpg (la vista rifatta in foto, GPT Image 2), <base>_fumetto.jpg (la foto nello
  stile 07, GPT Image 2), <base>_pulita.jpg (il fumetto coi muri ripuliti, Nano Banana Pro), <base>_vuota.jpg (il
  fumetto pulito rifatto in foto, con la stessa inquadratura, Nano Banana Pro) e <base>_20.jpg: la foto col 20% di
  fumetto, la stanza dello stile deciso.
- "immagini": per ognuna, la base, la persona (le persone e i loro riferimenti sono quelli dei primi piani, in
  art/scene/*/primi_piani.json) e cosa fa; senza persona, solo "azione" (per esempio la sagoma del medico che dorme).
  <nome>.jpg: la base al 20% con la persona dentro, fatta da Nano Banana Pro col riferimento del personaggio, cosi'
  la faccia resta quella delle visite. Con "sopra" si parte da un'altra immagine invece che dalla base (il nastro
  della notte parte da notte_dorme, col medico che dorme sotto le coperte).
Poi, come per le scene, i personaggi con meno dettagli (tools/meno_dettagli.py: Real-ESRGAN sulle persone, occhi e
bocche originali), e le immagini finali a 1600x900 in gioco/img/ospite. Il VHS verde lo fa il gioco.
Ogni passaggio salta se il suo file c'e' gia': per rifarne uno, cancellalo. Il registro e' in art/ospite/registro.json.
"""
import concurrent.futures
import json
import pathlib
import sys

import numpy as np
from PIL import Image

QUI = pathlib.Path(__file__).resolve().parent
ROOT = QUI.parent
sys.path.insert(0, str(QUI))
import fal_batch  # noqa: E402
import meno_dettagli  # noqa: E402
from scena import GPT_EDIT, NB_EDIT, SAM, STYLE_07, job  # noqa: E402

DIR = ROOT / "art/ospite"
OUT = ROOT / "gioco/img/ospite"
W, H = 1600, 900

MURI = ("an old wallpaper with a small faded floral pattern, plain and even, with no cracks, peeling, stains or "
        "texture marks")


def persone():
    """persona -> (riferimento, aspetto), dai primi piani delle scene."""
    out = {}
    for f in sorted((ROOT / "art/scene").glob("*/primi_piani.json")):
        for chi, p in json.loads(f.read_text()).items():
            out[chi] = (f.parent / p["riferimento"], p["aspetto"])
    return out


def prompt_basi(b):
    return {
        "foto": ("Re-render this 3D render as a realistic photograph, like an ordinary amateur snapshot of "
                 f"{b['stanza']} Keep the camera, the framing and every object exactly in the same place and size: "
                 f"{b['oggetti']}. The walls are {MURI}. Warm, dim but even light from an old lamp, everything clearly "
                 "readable, no dramatic shadows. No people, no hands, no text, no border."),
        "fumetto": ("Completely re-render this image in the style described below, transforming it far beyond a "
                    "filter: redraw every surface, light and texture in that technique. Keep the composition: "
                    f"{b['oggetti']}, in the same places. No people, no faces, no text, no signature, no watermark.\n"
                    + STYLE_07),
        "pulita": ("Edit this comic drawing of an empty room. Keep exactly the same drawing style (bold black "
                   "brush-ink outlines, flat muted colors with no gradients, light crosshatching only where there is "
                   "shadow), the same composition and every object in exactly the same place and size. Clean only "
                   f"the walls and the ceiling: they become {MURI}. Remove all cracks, dirt streaks and texture marks "
                   "that are not real objects. Do not add anything. No people, no faces, no text."),
        "vuota": ("Re-render this drawing of an empty room as a realistic photograph, like an ordinary amateur "
                  f"snapshot, evenly exposed. The walls are {MURI}: do not copy the drawing's hatching or marks. Keep "
                  f"everything else exactly identical and in exactly the same place and size: {b['oggetti']}, the "
                  "lighting, the camera and the framing. Do not add any people, hands or objects, and no faces."),
    }


DORME = ("Keep the sleeping person in the iron bed exactly as in the first image: completely covered by the bedspread "
         "from head to toe, the head under the covers too, nothing of him visible: do not show his head, hair, face or "
         "hands, and do not remove him.")


def prompt_immagine(im, base, chi):
    dorme = f" {DORME}" if im.get("sopra") else ""
    if not chi:
        return (f"Edit this image: {im['azione']}{dorme} Keep everything else exactly as it is, in the same drawing "
                f"style, with the same camera, framing and lighting, and every object in the same place: "
                f"{base['oggetti']}. No faces visible, no hands or objects belonging to the viewer, no text.")
    rif, aspetto = chi
    altri = "Apart from him, only this one person" if im.get("sopra") else "Only this one person"
    return (f"Edit the first image: add the person from the second image ({aspetto}) into this room. {im['azione']} "
            "It must be the same person as in the second image: exactly the same almost photographic face, however "
            "strange it is, the same eyes, hair, body and clothes. Keep the room exactly as it is in the first image, in the "
            "same drawing style, with the same camera, framing and light, and every object in the same place: "
            f"{base['oggetti']}.{dorme} The person is a realistic photograph, lit by the same light as the room, with "
            f"real skin, hair and fabric. {altri}; no other people, no hands or objects belonging to the viewer, no "
            "text, no border.")


def lancia(lavori, log):
    """I lavori in parallelo; le immagini in jpg, tutto nel registro."""
    if not lavori:
        return
    key = fal_batch.load_key()
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(fal_batch.run, j, key, DIR, DIR): j for j in lavori}
        for f in concurrent.futures.as_completed(futures):
            j = futures[f]
            try:
                res = f.result()
            except Exception as e:  # un'immagine fallita non ferma le altre
                print(f"ERRORE  {j['nome']}: {e}", flush=True)
                log[j["nome"]] = {"modello": j["modello"], "errore": str(e)}
                continue
            log[j["nome"]] = {"modello": j["modello"], "input": {k: v for k, v in j["input"].items()
                                                                  if k != "image_urls"}, **res}
            png = DIR / res["file"][0]
            Image.open(png).convert("RGB").save(DIR / f"{j['nome']}.jpg", quality=93)
            png.unlink()
            print(f"ok      {j['nome']} ({res['secondi']}s)", flush=True)
    (DIR / "registro.json").write_text(json.dumps(log, indent=2, ensure_ascii=False))


def manca(nome):
    return not (DIR / f"{nome}.jpg").exists()


def basi(spec, usate, log):
    # un passaggio alla volta: ognuno parte dal precedente, per tutte le basi insieme
    for passo, modello, da in [("foto", GPT_EDIT, None), ("fumetto", GPT_EDIT, "foto"), ("pulita", NB_EDIT, "fumetto"),
                               ("vuota", NB_EDIT, "pulita")]:
        lavori = []
        for b in usate:
            nome = f"{b}_{passo}"
            if manca(nome):
                sorgente = spec["basi"][b]["render"] if da is None else f"{b}_{da}.jpg"
                lavori.append(job(nome, modello, prompt_basi(spec["basi"][b])[passo], f"@file:{sorgente}"))
        lancia(lavori, log)
    for b in usate:
        if manca(f"{b}_20"):
            # la stanza dello stile deciso: la foto col 20% del fumetto pulito (stessa inquadratura)
            vuota = np.asarray(Image.open(DIR / f"{b}_vuota.jpg").convert("RGB").resize((1920, 1080), Image.LANCZOS),
                               np.float32)
            pulita = np.asarray(Image.open(DIR / f"{b}_pulita.jpg").convert("RGB").resize((1920, 1080),
                                                                                           Image.LANCZOS), np.float32)
            Image.fromarray((vuota * 0.8 + pulita * 0.2 + 0.5).astype(np.uint8)).save(DIR / f"{b}_20.jpg", quality=93)
            print(f"ok      {b}_20", flush=True)


def immagini(spec, nomi, log):
    chi = persone()
    # prima quelle che partono dalla base, poi quelle che partono da un'altra immagine ("sopra")
    for giro in (False, True):
        lavori = []
        for nome in nomi:
            im = spec["immagini"][nome]
            if not manca(nome) or bool(im.get("sopra")) != giro:
                continue
            if giro and manca(im["sopra"]):
                print(f"manca   {im['sopra']}, per {nome}", flush=True)
                continue
            base = spec["basi"][im["base"]]
            p = chi.get(im.get("persona")) if im.get("persona") else None
            primo = f"{im['sopra']}.jpg" if giro else f"{im['base']}_20.jpg"
            urls = [f"@file:{primo}"] + ([f"@file:{p[0]}"] if p else [])
            lavori.append(job(nome, NB_EDIT, prompt_immagine(im, base, p), urls))
        lancia(lavori, log)


def meno(spec, nomi):
    """Le persone con meno dettagli, come nelle scene: maschere di SAM 3 ("person") e tools/meno_dettagli.py."""
    con = [DIR / f"{n}.jpg" for n in nomi if spec["immagini"][n].get("persona") and (DIR / f"{n}.jpg").exists()]
    sam = []
    for f in con:
        c = meno_dettagli.cartella(f) / "maschere"
        c.mkdir(parents=True, exist_ok=True)
        if not any(c.glob(f"{f.stem}_person_maschera*")):
            sam.append({"nome": f"{f.stem}_person", "modello": SAM, "cartella": c,
                        "input": {"image_url": f"@file:{f}", "prompt": "person", "apply_mask": False,
                                  "include_scores": True, "output_format": "png", "return_multiple_masks": True,
                                  "max_masks": 3}})
    lavori = sam + [j for f in con for j in meno_dettagli.lavori(f)]
    if lavori:
        print(f"{len(lavori)} lavori su fal per i dettagli", flush=True)
        meno_dettagli.esegui(lavori)
    for f in con:
        maschere = sorted(str(m.relative_to(ROOT)) for m in (meno_dettagli.cartella(f) / "maschere").glob(
            f"{f.stem}_person_maschera*.png"))
        meno_dettagli.componi(f, maschere)
        print("meno dettagli:", meno_dettagli.uscita(f).relative_to(ROOT), flush=True)


def finali(spec, nomi):
    OUT.mkdir(parents=True, exist_ok=True)
    tutte = list(nomi) + sorted({f"{im['base']}_20" for im in spec["immagini"].values()})
    for nome in tutte:
        f = DIR / f"{nome}.jpg"
        md = meno_dettagli.uscita(f)
        sorgente = md if md.exists() else f
        if not sorgente.exists():
            continue
        Image.open(sorgente).convert("RGB").resize((W, H), Image.LANCZOS).save(OUT / f"{nome}.jpg", quality=86)
    print("immagini nel gioco:", len(list(OUT.glob("*.jpg"))), flush=True)


def main():
    spec = json.loads((DIR / "ospite.json").read_text())
    nomi = sys.argv[1:] or list(spec["immagini"])
    log_path = DIR / "registro.json"
    log = json.loads(log_path.read_text()) if log_path.exists() else {}
    usate = sorted({spec["immagini"][n]["base"] for n in nomi})
    basi(spec, usate, log)
    immagini(spec, nomi, log)
    meno(spec, nomi)
    finali(spec, nomi)


if __name__ == "__main__":
    main()
