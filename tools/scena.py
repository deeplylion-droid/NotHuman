#!/usr/bin/env python3
"""Produce una scena nello stile deciso, dalla descrizione all'immagine finale.

Uso: python3 tools/scena.py <cartella> [fino_a]

La cartella contiene scena.json con i campi (in inglese, vanno nei prompt):
- "stanza": la stanza, con pochi dettagli;
- "persone": le persone, con aspetto e posa;
- "n_persone": quante sono, in lettere ("two", "three");
- "pose": le persone in breve, per dire al modello di lasciarle al loro posto;
- "oggetti": gli oggetti della stanza che devono restare fermi;
- "muri" (facoltativo): com'e' fatta la stanza in foto, muri e soffitto (di base intonaco liscio e chiaro con
  qualche macchia di umidita');
- "mano" (facoltativo, false se manca): true per avere in scena la mano del medico col bastone;
- "ritagli" (facoltativo): cosa ritagliare con SAM 3; di base persone e bastoni (quelli delle persone),
  piu' il guanto se c'e' la mano;
- "deformita" (facoltativo): come devono essere deformate le persone, una per una (aspetto, deformita', vestiti da
  tenere): con questo campo le persone ammorbidite si rifanno piu' deformi (passaggio 3b);
- "escludi_maschere" (facoltativo): nomi dei file in maschere/ da lasciare fuori dal montaggio, per
  togliere qualcosa dalla scena senza rigenerarla (per esempio la mano del medico).

Passaggi (ognuno salta se il suo file esiste gia': per rifarne uno, cancellalo):
1. base.jpg: la scena in foto (GPT Image 2);
2. fumetto.jpg: la scena ridisegnata nello stile 07, personaggi deformi (GPT Image 2);
3. ammorbiditi.jpg: personaggi e mano rifatti in foto, ammorbiditi (Nano Banana Pro);
3b. deformi.jpg, solo con "deformita": le stesse persone molto piu' deformi, ancora in foto (Nano Banana Pro). Deciso
   il 28 ottobre («questi personaggi sono troppo umani, devi deformarli di piu'»): ammorbidendo, le deformita' del
   fumetto si perdevano quasi tutte. Rifarle dal fumetto con un prompt piu' forte non va: le persone si ingrandiscono
   e si spostano; si parte dalle persone ammorbidite, che restano al loro posto. Se c'e', i passaggi dopo usano
   deformi.jpg al posto di ammorbiditi.jpg;
4. stanza_stile.jpg: fumetto.jpg senza persone e senza mano (Nano Banana Pro);
4b. stanza_stile_pulita.jpg: stanza_stile.jpg con i muri ripuliti, stesso tratto. Il ridisegno a fumetto
   aggiunge segni (intonaco scrostato, crepe, macchie) che confondono lo sfondo: del fumetto si vuole solo un
   accenno, e il 20% si prende da qui (Nano Banana Pro);
5. stanza_vuota.jpg: stanza_stile_pulita.jpg rifatta in foto, con i muri descritti a parole (Nano Banana Pro).
   Passandogli anche base.jpg i muri vengono giusti, ma porta e mobili si spostano;
6. maschere/: i ritagli, da ammorbiditi.jpg o deformi.jpg (SAM 3);
7. finale.jpg: personaggi sulla stanza al 20% (tools/intensita.py);
8. finale_vhs.jpg, finale_vhs_verde.jpg e finale_vhs_infrarosso.jpg (tools/filtri.py).
Le due stanze vuote vengono dalla versione a fumetto, non dalla foto di partenza: GPT, ridisegnando,
cambia un po' l'inquadratura, e cosi' stanza e personaggi combaciano comunque.
Con "fino_a" (per esempio "base") si ferma dopo quel passaggio.
"""
import concurrent.futures
import json
import pathlib
import subprocess
import sys

from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import fal_batch  # noqa: E402

GPT, GPT_EDIT = "openai/gpt-image-2", "openai/gpt-image-2/edit"
NB_EDIT, SAM = "fal-ai/nano-banana-pro/edit", "fal-ai/sam-3/image"
STYLE_07 = ("STYLE: a 1970s European underground comic panel: bold black brush-ink outlines, expressive scratchy "
            "crosshatching, flat muted colors with no gradients (mustard, olive green, brick red, dirty beige), "
            "halftone dots in the shadows.")
GLOVE = ("In the lower right foreground, the doctor's own black leather glove holds a long wooden cane, like the held "
         "item in a first-person video game.")
WALLS = ("smooth, plain painted plaster in a warm off-white color, like a modest but cared-for home, with at most two "
         "or three faint damp stains")
STEPS = ["base", "fumetto", "ammorbiditi", "stanza_stile", "deformi", "stanza_stile_pulita", "stanza_vuota",
         "maschere", "finale", "filtri"]


def prompts(s):
    mano = s.get("mano", False)
    viewer = GLOVE if mano else "No hands, arms or objects belonging to the viewer are visible in the frame."
    hand_keep = "the gloved hand holding the cane in the lower right foreground, " if mano else ""
    hand_redo = " and the black leather gloved hand holding the cane" if mano else ""
    hand_remove = (", and also remove the black leather gloved hand and the wooden cane in the lower right "
                   "foreground") if mano else ""
    return {
        "base": (f"First-person view of a plague doctor standing in {s['stanza']} {s['persone']} {viewer} Realistic "
                 "photograph, evenly exposed, everything clearly readable, no dramatic shadows. 16:9, no text, no "
                 "border."),
        "fumetto": ("Completely re-render this image in the style described below, transforming it far beyond a "
                    "filter: redraw every surface, light and texture in that technique. Keep the composition: "
                    f"{s['oggetti']}, {hand_keep}and {s['pose']}, "
                    f"in the same places and poses. The {s['n_persone']} people must become drawn, deformed, grotesque "
                    "characters, not photographs: exaggerated and distorted proportions, oversized heads, uneven "
                    "bulging eyes, long crooked noses, sunken cheeks, too-wide mouths with bad teeth, elongated bony "
                    "fingers; unsettling and sinister, never cute or cartoonish. No text, no signature, no "
                    "watermark.\n" + STYLE_07),
        "ammorbiditi": (f"Re-render only the {s['n_persone']} people{hand_redo} "
                        "as realistic photographs: real skin with pores, real hair, real fabric and real leather, "
                        "photographic lighting. Keep exactly their grotesque, deformed features from this image: the "
                        "same bulging eyes, crooked noses, bad teeth, sunken cheeks, bony elongated fingers, and the "
                        "same proportions, silhouettes, poses, expressions, clothes and positions, pixel for pixel. Do "
                        "not make them look more normal. Everything else in the image stays exactly identical."),
        "deformi": (f"Make the {s['n_persone']} {'person' if s['n_persone'] == 'one' else 'people'} in this image far "
                    "more grotesque and deformed, like nightmare caricatures that are still realistic photographs. "
                    f"{s.get('deformita', '')} Keep the same clothes, poses, positions and lighting, and keep them "
                    "photographic: real skin, hair and fabric. They are still living people, with normal skin color "
                    "and eyes with irises and pupils: not zombies, not monsters, not corpses. Do not change anything "
                    "else in the image."),
        "stanza_stile": (f"Remove the {s['n_persone']} people completely, with everything they hold{hand_remove}. "
                         "Reconstruct "
                         "the empty room behind them naturally, in the same drawing style. Keep everything else exactly "
                         f"identical and in the same place: {s['oggetti']}, the same lighting and the same camera. Do "
                         "not draw any face anywhere."),
        "stanza_stile_pulita": ("Edit this comic drawing of an empty room. Keep exactly the same drawing style (bold "
                                "black brush-ink outlines, flat muted colors with no gradients, light crosshatching "
                                "only where there is shadow), the same composition and every object in exactly the "
                                "same place and size. Clean only the walls and the ceiling: they become "
                                f"{s.get('muri', WALLS)}. Remove all peeling and flaking paint, exposed patches, "
                                "cracks, dirt streaks and texture marks that are not real objects. Do not add "
                                "anything. No people, no faces, no text."),
        "stanza_vuota": ("Re-render this drawing of an empty room as a realistic photograph, like an ordinary amateur "
                         f"snapshot, evenly exposed. The walls and the ceiling are {s.get('muri', WALLS)}: do not copy "
                         "the drawing's cracks, peeling or flaking paint, stains or hatching. Keep everything else "
                         f"exactly identical and in exactly the same place and size: {s['oggetti']}, the lighting, the "
                         "camera and the framing. Do not add any people, hands or objects, and no faces anywhere."),
    }


def job(name, model, prompt=None, image=None, **extra):
    if model == GPT:
        inp = {"prompt": prompt, "image_size": {"width": 1920, "height": 1080}, "quality": "high",
               "output_format": "png"}
    elif model == GPT_EDIT:
        inp = {"prompt": prompt, "image_urls": [image], "image_size": {"width": 1920, "height": 1080},
               "quality": "high", "output_format": "png"}
    elif model == NB_EDIT:
        inp = {"prompt": prompt, "image_urls": image if isinstance(image, list) else [image], "aspect_ratio": "16:9",
               "resolution": "2K", "output_format": "png", "num_images": 1}
    else:
        inp = {"image_url": image, "prompt": prompt, "apply_mask": False, "include_scores": True,
               "output_format": "png", "return_multiple_masks": True, **extra}
    return {"nome": name, "modello": model, "input": inp}


def run_jobs(jobs, folder, key, log):
    """Lancia i lavori in parallelo; converte le immagini in jpg e annota tutto nel registro."""
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(fal_batch.run, j, key, folder, folder): j for j in jobs}
        for f in concurrent.futures.as_completed(futures):
            j = futures[f]
            try:
                res = f.result()  # un errore ferma la scena: i passaggi dopo dipendono da questo
            except RuntimeError as e:
                if j["modello"] == SAM and "nessuna immagine" in str(e):
                    print(f"--  {j['nome']}: niente da ritagliare", flush=True)  # per esempio nessun guanto in scena
                    continue
                raise
            log[j["nome"]] = {"modello": j["modello"], "input": j["input"], **res}
            if j["modello"] != SAM:
                png = folder / res["file"][0]
                Image.open(png).convert("RGB").save(folder / f"{j['nome']}.jpg", quality=93)
                png.unlink()
            print(f"ok  {j['nome']} ({res['secondi']}s)", flush=True)


def main():
    folder = pathlib.Path(sys.argv[1]).resolve()
    stop = sys.argv[2] if len(sys.argv) > 2 else STEPS[-1]
    s = json.loads((folder / "scena.json").read_text())
    p = prompts(s)
    key = fal_batch.load_key()
    log_path = folder / "registro.json"
    log = json.loads(log_path.read_text()) if log_path.exists() else {}
    todo = lambda name: not (folder / f"{name}.jpg").exists()  # noqa: E731

    def done(step):
        log_path.write_text(json.dumps(log, indent=2, ensure_ascii=False))
        return STEPS.index(step) >= STEPS.index(stop)

    if todo("base"):
        run_jobs([job("base", GPT, p["base"])], folder, key, log)
    if done("base"):
        return
    if todo("fumetto"):
        run_jobs([job("fumetto", GPT_EDIT, p["fumetto"], "@file:base.jpg")], folder, key, log)
    if done("fumetto"):
        return
    jobs = [job(n, NB_EDIT, p[n], "@file:fumetto.jpg") for n in ["ammorbiditi", "stanza_stile"] if todo(n)]
    if jobs:
        run_jobs(jobs, folder, key, log)
    if done("stanza_stile"):
        return
    if s.get("deformita") and todo("deformi"):
        run_jobs([job("deformi", NB_EDIT, p["deformi"], "@file:ammorbiditi.jpg")], folder, key, log)
    if done("deformi"):
        return
    # le persone da ritagliare e montare: quelle piu' deformi, se ci sono
    persone = "deformi.jpg" if (folder / "deformi.jpg").exists() else "ammorbiditi.jpg"
    if todo("stanza_stile_pulita"):
        run_jobs([job("stanza_stile_pulita", NB_EDIT, p["stanza_stile_pulita"], "@file:stanza_stile.jpg")],
                 folder, key, log)
    if done("stanza_stile_pulita"):
        return
    if todo("stanza_vuota"):
        run_jobs([job("stanza_vuota", NB_EDIT, p["stanza_vuota"], "@file:stanza_stile_pulita.jpg")], folder, key, log)
    if done("stanza_vuota"):
        return
    masks_dir = folder / "maschere"
    masks_dir.mkdir(exist_ok=True)
    if not list(masks_dir.glob("*_maschera*.png")):
        src = f"@file:../{persone}"
        cuts = s.get("ritagli", ["person", "cane"] + (["glove"] if s.get("mano") else []))
        names = {"person": "persone", "cane": "bastone", "glove": "guanto"}
        run_jobs([job(names.get(c, c.replace(" ", "_")), SAM, image=src, prompt=c, max_masks=6) for c in cuts],
                 masks_dir, key, log)
    if done("maschere"):
        return
    skip = set(s.get("escludi_maschere", []))
    masks = sorted(str(m.relative_to(folder)) for m in masks_dir.glob("*_maschera*.png") if m.name not in skip)
    (folder / "montaggio.json").write_text(json.dumps({
        "stile": persone, "sfondo": "stanza_vuota.jpg", "sfondo_stile": "stanza_stile_pulita.jpg",
        "intensita_sfondo": 0.2, "maschere": masks, "allarga": 3, "sfuma": 1.2, "uscita": "finale.jpg"}, indent=2))
    subprocess.run([sys.executable, "-I", str(HERE / "intensita.py"), str(folder / "montaggio.json")], check=True)
    if done("finale"):
        return
    for f in ["vhs", "vhs_verde", "vhs_infrarosso"]:
        subprocess.run([sys.executable, "-I", str(HERE / "filtri.py"), f, str(folder / "finale.jpg"),
                        str(folder / f"finale_{f}.jpg")], check=True)
    done("filtri")


if __name__ == "__main__":
    main()
