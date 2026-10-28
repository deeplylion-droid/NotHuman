"""La stanza del medico ad alta qualita' (deciso la sera del 27 ottobre: "all'altezza di un videogioco moderno, tipo
Poppy Playtime"). Modelli, materiali e cielo vengono da Poly Haven: sono CC0, si possono usare anche nel gioco per
Steam senza citarli. Questo script li scarica in art/stanza_hq/sorgenti (fuori dal repository: si riscaricano da
qui); la stanza poi si costruisce e si illumina in Blender con art/stanza_hq/costruisci.py.

Uso:
  python3 tools/stanza_hq.py scarica [nomi...]   scarica tutto (o solo i nomi dati); quello che c'e' gia' resta
  python3 tools/stanza_hq.py elenco              cosa si usa e per cosa
  python3 tools/stanza_hq.py gioco               la stanza cotta (art/stanza_hq/cuoci.py) nel gioco, in
                                                 gioco/modelli/hq: il modello alleggerito, la luce della mattina e
                                                 della sera, la vista dalla finestra, i punti (stanza_dati.json)
"""
import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
SORGENTI = RADICE / "art" / "stanza_hq" / "sorgenti"
API = "https://api.polyhaven.com/files/"
RISOLUZIONE = "2k"

# i modelli: il nome su Poly Haven e a cosa serve nella stanza (le posizioni sono in costruisci.py)
MODELLI = {
    "old_bed_frame": "il letto di ferro (materasso, lenzuola e coperta si fanno in Blender)",
    "painted_wooden_nightstand": "il comodino",
    "painted_wooden_cabinet": "la credenza",
    "metal_office_desk": "la scrivania, grigia, da ufficio della ditta",
    "painted_wooden_chair_02": "la sedia della scrivania",
    "painted_wooden_chair_01": "le sedie bianche del tavolino",
    "wooden_table_02": "il tavolo di cucina",
    "wall_clock": "l'orologio sopra la porta, che segna l'ora del gioco",
    "hanging_picture_frame_02": "la cornice col manifesto della ditta",
    "desk_lamp_arm_01": "la lampada della scrivania",
    "pull_chain_light_socket": "il portalampada del soffitto, con la catenella",
    "lightbulb_01": "la lampadina nuda",
    "television_02": "il televisore a tubo sulla scrivania",
    "rubber_boots": "gli stivali di gomma vicino alla porta",
    "metal_trash_can": "il cestino",
    "vintage_suitcase": "la valigia sopra l'armadio",
    "cardboard_box_01": "lo scatolone sopra l'armadio",
    "medical_box": "la cassetta della ditta sulla credenza",
    "vintage_electric_kettle": "il bollitore sulla credenza",
    "jug_01": "la brocca",
    "old_gas_mask": "la vecchia maschera antigas sulla credenza",
    "vintage_flashlight": "la torcia sul comodino",
    "binder_notebook": "i quaderni della ditta",
}

# i materiali delle superfici (colore, rilievo, ruvidezza; "arm" e' occlusione, ruvidezza e metallo insieme)
MATERIALI = {
    "old_wooden_floor_02": "il pavimento di assi di legno, vecchio e consumato",
    "white_planks_clean": "la boiserie a doghe sotto il listello (tinta in texture.py)",
    "decrepit_wallpaper": "la grana e le macchie della carta da parati a righe (texture.py)",
    "beige_wall_001": "gli sguanci di intonaco",
    "painted_plaster_wall": "il soffitto",
    "wood_table_worn": "il legno delle porte e delle finestre, sotto la vernice",
    "fine_grained_wood": "l'armadio",
    "poly_wool_herringbone": "la coperta militare del letto",
    "rough_linen": "le lenzuola e il cuscino",
    "terry_cloth": "l'asciugamano del lavandino",
    "dirty_carpet": "lo scendiletto",
}
MAPPE = ["Diffuse", "nor_gl", "Rough", "arm"]

# il cielo che illumina la stanza dalla finestra: una mattina coperta
CIELI = {"castel_st_angelo_roof": "la luce grigia della mattina, dalla finestra"}


# l'API di Poly Haven rifiuta i programmi senza nome (403)
AGENTE = "NotHuman-stanza-hq/1.0"


def leggi(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": AGENTE}), timeout=60) as r:
        return r.read()


def scarica_file(url, dove):
    if dove.exists() and dove.stat().st_size > 0:
        return
    dove.parent.mkdir(parents=True, exist_ok=True)
    temp = dove.with_suffix(dove.suffix + ".parte")
    subprocess.run(["curl", "-sfL", "--retry", "4", "-A", AGENTE, "-o", str(temp), url], check=True)
    temp.rename(dove)


def scarica_modello(nome):
    info = json.loads(leggi(API + nome))
    g = info["gltf"][RISOLUZIONE]["gltf"]
    cartella = SORGENTI / "modelli" / nome
    scarica_file(g["url"], cartella / Path(g["url"]).name)
    for rel, f in g.get("include", {}).items():
        scarica_file(f["url"], cartella / rel)


def scarica_materiale(nome):
    info = json.loads(leggi(API + nome))
    cartella = SORGENTI / "materiali" / nome
    # alcune stoffe non hanno "Diffuse" ma piu' colori (col_1, col_2...): si scaricano tutti
    for mappa in MAPPE + [k for k in info if k.startswith("col")]:
        if mappa in info and RISOLUZIONE in info[mappa]:
            f = info[mappa][RISOLUZIONE]["jpg"]
            scarica_file(f["url"], cartella / Path(f["url"]).name)


def scarica_cielo(nome):
    info = json.loads(leggi(API + nome))
    f = info["hdri"][RISOLUZIONE]["hdr"]
    scarica_file(f["url"], SORGENTI / "cielo" / Path(f["url"]).name)


# ---------------------------------------------------------------- nel gioco

HQ = RADICE / "art" / "stanza_hq"
GIOCO = RADICE / "gioco" / "modelli" / "hq"
BLENDER = os.environ.get("BLENDER", "blender")


def srgb(x):
    import numpy as np
    x = np.clip(x, 0.0, 1.0)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(x, 1 / 2.4) - 0.055)


def luce_webp(npy, uscita):
    """la luce cotta (i numeri che cuoci.py tira fuori dall'EXR, senza limite) in un'immagine a 8 bit: divisa per una
    "scala" (quasi il massimo: le poche macchie piu' forti, il sole sul pavimento, si tagliano) e codificata sRGB, che
    tiene piu' passi nelle ombre. Nel gioco: luce = colore lineare * scala"""
    import numpy as np
    from PIL import Image
    im = np.maximum(np.load(npy).astype(np.float32), 0.0)
    m = im.max(axis=2)
    valide = m[m > 1e-6]
    # la lampadina capovolta (28 ottobre) ha il vetro a pochi centimetri dalla sua luce: lo prende centinaia di volte
    # piu' forte del resto, ed e' quasi l'1% delle cose piccole. Nel gioco e' accesa comunque: quelle macchie si
    # tolgono prima di cercare la scala, se no tutto il resto finirebbe in pochi passi scuri
    valide = valide[valide < 8 * np.percentile(valide, 99)]
    scala = float(np.percentile(valide, 99.7))
    Image.fromarray((srgb(im / scala) * 255 + 0.5).astype(np.uint8)).save(uscita, "WEBP", quality=92, method=6)
    return round(scala, 5)


def viste(uscita):
    """la vista dalla finestra: la mattina com'e', la sera la stessa al buio, blu"""
    import numpy as np
    from PIL import Image
    im = Image.open(HQ / "finestra" / "vista_mattina.jpg").convert("RGB")
    im.thumbnail((2048, 2048), Image.LANCZOS)
    im.save(uscita / "vista_mattina.webp", "WEBP", quality=86, method=6)
    a = np.asarray(im).astype(np.float32) / 255
    lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    l = lin @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    notte = (l ** 1.15)[..., None] * 0.07 * np.array([0.42, 0.58, 1.0], np.float32)
    Image.fromarray((srgb(notte) * 255 + 0.5).astype(np.uint8)).save(uscita / "vista_sera.webp", "WEBP", quality=86,
                                                                        method=6)


def gioco():
    cotta = HQ / "sorgenti" / "stanza_cotta.blend"
    subprocess.run([BLENDER, "-b", str(cotta), "--python", str(HQ / "cuoci.py"), "--", "esporta"], check=True)
    GIOCO.mkdir(parents=True, exist_ok=True)
    # il modello: geometria compressa (le coordinate della luce con 14 bit: un ottavo di punto nell'immagine da 2048)
    subprocess.run(["node", str(RADICE / "tools" / "tre" / "alleggerisci.mjs"), str(HQ / "uscita" / "stanza.glb"),
                    str(GIOCO), "stanza", "1024", "14"], check=True)
    # le texture del modello in un file solo (stanza_texture.json, nome -> WebP in base64): una versione di un Artifact
    # tiene al massimo 511 file, e il gioco ne ha gia' quasi 500; stanza.js le rimette al loro posto
    import base64
    pacco = {}
    for f in sorted(GIOCO.glob("stanza_*.webp"), key=lambda f: int(f.stem.split("_")[1])):
        pacco[f.name] = base64.b64encode(f.read_bytes()).decode("ascii")
        f.unlink()
    (GIOCO / "stanza_texture.json").write_text(json.dumps(pacco, separators=(",", ":")))
    dati = json.loads((HQ / "uscita" / "punti.json").read_text())
    # la luce cotta: quella della stanza e quella delle cose piccole (in un'immagine a parte, piu' fitta)
    dati["luce"], dati["piccoli"] = {}, {}
    for fase in ("mattina", "sera"):
        for chiave, nome in (("luce", fase), ("piccoli", f"piccoli_{fase}")):
            npy = HQ / "uscita" / f"luce_{nome}.npy"
            if npy.exists():
                dati[chiave][fase] = {"file": f"luce_{nome}.webp", "scala": luce_webp(npy, GIOCO / f"luce_{nome}.webp")}
    viste(GIOCO)
    dati["vista"] = {"mattina": "vista_mattina.webp", "sera": "vista_sera.webp"}
    (GIOCO / "stanza_dati.json").write_text(json.dumps(dati, indent=1))
    peso = sum(f.stat().st_size for f in GIOCO.iterdir())
    print(f"nel gioco: {GIOCO} ({peso / 1e6:.1f} MB)", dati["luce"], dati["piccoli"])


def main():
    comando = sys.argv[1] if len(sys.argv) > 1 else "elenco"
    nomi = set(sys.argv[2:])
    if comando == "elenco":
        for gruppo in (MODELLI, MATERIALI, CIELI):
            for n, a in gruppo.items():
                print(f"{n:28} {a}")
        return
    if comando == "gioco":
        return gioco()
    if comando != "scarica":
        sys.exit(__doc__)
    lavori = [(n, scarica_modello) for n in MODELLI] + [(n, scarica_materiale) for n in MATERIALI] \
        + [(n, scarica_cielo) for n in CIELI]
    for n, f in lavori:
        if nomi and n not in nomi:
            continue
        try:
            f(n)
            print("ok", n)
        except Exception as e:  # uno che manca non ferma gli altri
            print("ERRORE", n, e)


if __name__ == "__main__":
    main()
