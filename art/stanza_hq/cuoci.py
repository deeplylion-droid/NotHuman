"""La luce cotta della stanza del medico ad alta qualita' (costruisci.py fa la stanza): Cycles calcola una volta per
tutte quanta luce arriva su ogni punto (diretta e rimbalzata), la mattina e la sera, e la scrive in un'immagine
sola per tutta la stanza (la "lightmap"); nel gioco Three.js la moltiplica per i colori dei materiali, e la stanza
ha le ombre morbide, la luce che rimbalza e il colore che si spande come nel render, senza calcolarle.

Passi:
1. le seconde coordinate ("luce"): ogni oggetto fermo ha le sue isole, tutte nella stessa immagine, grandi in
   proporzione alla superficie (la stessa definizione dappertutto, circa un punto per centimetro a 2048);
2. la cottura (DIFFUSE, diretta + rimbalzi, senza il colore), per la mattina e per la sera, e la pulizia del rumore
   (il denoiser di Blender);
3. l'esportazione: la stanza in glTF con le due coordinate, le texture ridotte a misura, e un elenco di cosa e'
   cosa (stanza_hq.json) per stanza.js.

Uso: blender -b --python art/stanza_hq/cuoci.py -- [lato] [campioni] [mattina] [sera]
         la cottura (di base 2048 e 128, tutte e due le luci): luce/<fase>.exr e sorgenti/stanza_cotta.blend
     blender -b art/stanza_hq/sorgenti/stanza_cotta.blend --python art/stanza_hq/cuoci.py -- esporta
         la stanza cotta in uscita/stanza.glb e uscita/punti.json (tools/stanza_hq.py gioco fa il resto)
"""
import json
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

QUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, QUI)
import costruisci as C  # noqa: E402

LUCE = os.path.join(QUI, "luce")
USCITA = os.path.join(QUI, "uscita")

# niente luce cotta: la vista fuori dalla finestra (fa luce da se'), i vetri (trasparenti), i display (nel gioco
# sono disegnati dal codice)
SENZA_LUCE = ("vista", "vetro", "sveglia_display", "vcr_display", "scale_luce")


def da_cuocere():
    out = []
    for o in bpy.data.objects:
        if o.type != "MESH" or not o.visible_get():
            continue
        if any(o.name.startswith(s) for s in SENZA_LUCE):
            continue
        out.append(o)
    return out


def coordinate_luce(oggetti):
    """le seconde coordinate: isole dalla proiezione "smart" di tutti gli oggetti insieme, in un'immagine sola"""
    for o in oggetti:
        if o.data.users > 1:
            o.data = o.data.copy()
        me = o.data
        if not me.uv_layers:
            me.uv_layers.new(name="UVMap")
        if "luce" not in me.uv_layers:
            me.uv_layers.new(name="luce")
        me.uv_layers[0].active_render = True
        me.uv_layers.active = me.uv_layers["luce"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in oggetti:
        o.select_set(True)
    bpy.context.view_layer.objects.active = oggetti[0]
    bpy.ops.object.mode_set(mode="EDIT")
    # la selezione delle coordinate segue quella delle facce (tutte)
    bpy.context.scene.tool_settings.use_uv_select_sync = True
    bpy.ops.mesh.select_all(action="SELECT")
    # la proiezione "smart" di Blender, con tutti gli oggetti insieme, fa le isole alla stessa definizione; poi si
    # impacchettano a rettangoli, che non si sovrappongono, con un filo di margine: circa 100 punti per metro a 2048
    # (prove del 27 ottobre). Le isole della sola proiezione a volte si sovrapponevano (il calendario, il santino e
    # la mappa restavano stesi su tutta l'immagine, sotto le altre); margini piu' grandi, con migliaia di isole
    # piccole, schiacciano tutto (con 0,001 il pavimento era grande il 2% dell'immagine), e cosi' ridimensionarle
    # (average_islands_scale) e l'impacchettamento con le forme vere
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.0, area_weight=0.0, correct_aspect=True,
                             scale_to_bounds=False)
    bpy.ops.uv.pack_islands(udim_source="CLOSEST_UDIM", rotate=True, rotate_method="AXIS_ALIGNED", scale=True,
                            merge_overlap=False, margin_method="FRACTION", margin=0.0002, shape_method="AABB")
    bpy.ops.object.mode_set(mode="OBJECT")


def immagine_luce(nome, lato):
    im = bpy.data.images.get(nome) or bpy.data.images.new(nome, lato, lato, float_buffer=True, alpha=False)
    return im


def bersaglio(oggetti, im):
    """in ogni materiale degli oggetti, il nodo con l'immagine della luce, attivo (e' li' che Cycles scrive)"""
    fatti = set()
    for o in oggetti:
        for slot in o.material_slots:
            m = slot.material
            if not m or m.name in fatti:
                continue
            fatti.add(m.name)
            m.use_nodes = True
            nt = m.node_tree
            n = nt.nodes.get("luce_cotta") or nt.nodes.new("ShaderNodeTexImage")
            n.name = "luce_cotta"
            n.image = im
            n.location = (-1200, 600)
            for x in nt.nodes:
                x.select = False
            n.select = True
            nt.nodes.active = n


def unico(oggetti):
    """una copia di tutti gli oggetti da cuocere in un oggetto solo: Cycles prepara la scena per ogni oggetto che
    cuoce, e con 140 oggetti erano minuti persi. Le copie hanno le stesse coordinate della luce degli originali, che
    intanto restano fuori dal render (se no farebbero ombra due volte)"""
    copie = []
    for o in oggetti:
        c = o.copy()
        c.data = o.data.copy()
        bpy.context.scene.collection.objects.link(c)
        copie.append(c)
        o.hide_render = True
    bpy.ops.object.select_all(action="DESELECT")
    for c in copie:
        c.select_set(True)
    bpy.context.view_layer.objects.active = copie[0]
    bpy.ops.object.join()
    tutto = bpy.context.view_layer.objects.active
    tutto.name = "tutto_da_cuocere"
    tutto.data.uv_layers.active = tutto.data.uv_layers["luce"]
    return tutto


def cuoci(fase, lato, campioni):
    sc = bpy.context.scene
    C.luci(fase)
    sc.render.engine = "CYCLES"
    sc.cycles.samples = campioni
    sc.cycles.use_denoising = False
    sc.cycles.max_bounces = 6
    sc.cycles.diffuse_bounces = 4
    sc.render.bake.use_pass_direct = True
    sc.render.bake.use_pass_indirect = True
    sc.render.bake.use_pass_color = False
    sc.render.bake.margin = 6
    sc.render.bake.margin_type = "EXTEND"
    oggetti = da_cuocere()
    im = immagine_luce(f"luce_{fase}", lato)
    bersaglio(oggetti, im)
    tutto = unico(oggetti)
    bpy.ops.object.select_all(action="DESELECT")
    tutto.select_set(True)
    bpy.context.view_layer.objects.active = tutto
    bpy.ops.object.bake(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, margin=6, use_clear=True)
    bpy.data.objects.remove(tutto)
    for o in oggetti:
        o.hide_render = False
    os.makedirs(LUCE, exist_ok=True)
    grezza = os.path.join(LUCE, f"{fase}_grezza.exr")
    im.filepath_raw = grezza
    im.file_format = "OPEN_EXR"
    im.save()
    pulita = os.path.join(LUCE, f"{fase}.exr")
    pulisci(im, pulita)
    print("cotta", fase, flush=True)


def pulisci(im, uscita):
    """toglie il rumore della cottura col denoiser di Blender, in una scena a parte che fa solo il compositore"""
    vecchia = bpy.context.window.scene if bpy.context.window else bpy.context.scene
    sc = bpy.data.scenes.new("pulizia")
    sc.render.engine = "CYCLES"
    sc.cycles.samples = 1
    sc.render.resolution_x, sc.render.resolution_y = im.size
    sc.render.resolution_percentage = 100
    cam = bpy.data.objects.new("cam_pulizia", bpy.data.cameras.new("cam_pulizia"))
    sc.collection.objects.link(cam)
    sc.camera = cam
    sc.use_nodes = True
    nt = sc.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    ni = nt.nodes.new("CompositorNodeImage")
    ni.image = im
    dn = nt.nodes.new("CompositorNodeDenoise")
    if hasattr(dn, "use_hdr"):
        dn.use_hdr = True
    out = nt.nodes.new("CompositorNodeComposite")
    nt.links.new(ni.outputs["Image"], dn.inputs["Image"])
    nt.links.new(dn.outputs["Image"], out.inputs["Image"])
    sc.view_settings.view_transform = "Standard"
    sc.render.image_settings.file_format = "OPEN_EXR"
    sc.render.image_settings.color_depth = "16"
    sc.render.filepath = uscita
    bpy.ops.render.render(write_still=True, scene=sc.name)
    bpy.data.scenes.remove(sc)


# ---------------------------------------------------------------- l'esportazione per il gioco

# cosa e' cosa nel gioco: il nome dell'oggetto (o come comincia; vince il primo) -> l'oggetto che si usa (OGGETTI in
# stanza.js) e il pezzo della scrivania (gli id di D.SCRIVANIA in gioco.js)
RUOLI = [
    ("metal_office_desk", "scrivania", None), ("painted_wooden_chair_02", "scrivania", None),
    ("desk_lamp_arm_01", "scrivania", "lampada"), ("fax", "scrivania", "fax"), ("giornale", "scrivania", "giornale"),
    ("cartella", "scrivania", "taccuino"), ("soldi", "scrivania", "soldi"), ("maschera", "scrivania", "maschera"),
    ("guanti", "scrivania", "maschera"), ("mappa", "scrivania", "mappa"),
    ("television_02", "videoregistratore", "nastri"), ("videoregistratore", "videoregistratore", "nastri"),
    ("cassette", "videoregistratore", "nastri"),
    ("old_bed_frame", "letto", None), ("materasso", "letto", None), ("cuscino", "letto", None),
    ("lenzuolo", "letto", None), ("coperta", "letto", None),
    ("radiosveglia", "orologio", None),
    ("armadio", "armadio", None), ("vintage_suitcase", "armadio", None), ("cardboard_box_01", "armadio", None),
    ("painted_wooden_cabinet", "credenza", None), ("vintage_electric_kettle", "credenza", None),
    ("jug_01", "credenza", None), ("medical_box", "credenza", None),
    ("lavandino", "lavandino", None),
    ("wooden_table_02", "tavolo", None), ("painted_wooden_chair_01", "tavolo", None),
    ("termosifone", "termosifone", None),
    ("brandina", "ospite", None), ("porta_ospite", "ospite", None), ("ospite_mostra", "ospite", None),
    ("porta", "porta", None),
    ("finestra_", "finestra", None), ("anta", "finestra", None), ("vetro", "finestra", None),
    ("tenda", "finestra", None), ("fermo", "finestra", None), ("alzata", "finestra", None), ("vista", "finestra", None),
    ("calendario", "calendario", None), ("santino", "santino", None), ("cappotto", "cappotto", None),
    ("borsa", "borsa", None),
]

# i mobili su cui non si cammina (la loro pianta)
INGOMBRI = ["metal_office_desk", "painted_wooden_chair_02", "old_bed_frame", "painted_wooden_nightstand", "armadio",
            "painted_wooden_cabinet", "lavandino", "wooden_table_02", "painted_wooden_chair_01",
            "painted_wooden_chair_01.001", "termosifone", "cappotto", "borsa", "metal_trash_can", "rubber_boots"]

# la grandezza delle texture: 1024 punti per le superfici della stanza, i mobili e le cose sulla scrivania (si
# guardano da vicino), 512 per le cose piccole; la mappa sulla scrivania la cambia il gioco
GRANDI = ("muro", "pavimento", "soffitto", "battiscopa", "filetto", "cornice", "stanzetta", "metal_office_desk",
          "old_bed_frame", "materasso", "cuscino", "lenzuolo", "coperta", "painted_wooden", "wooden_table_02",
          "armadio", "lavandino", "termosifone", "porta", "ospite_mostra", "finestra", "anta", "tenda", "desk_lamp",
          "television_02", "fax", "giornale", "cartella", "maschera", "cappotto", "tappeto", "brandina", "calendario",
          "santino")
PICCOLE = {"mappa": 128}


def ruolo(nome):
    for inizio, oggetto, pezzo in RUOLI:
        if nome == inizio or nome.startswith(inizio):
            return oggetto, pezzo
    return None, None


def lato_texture(nome):
    for k, v in PICCOLE.items():
        if nome.startswith(k):
            return v
    return 1024 if any(nome.startswith(g) for g in GRANDI) else 512


def immagini(nt, fatti=None):
    """le immagini usate da un materiale (anche dentro i gruppi di nodi)"""
    fatti = fatti if fatti is not None else set()
    for n in nt.nodes:
        if n.type == "TEX_IMAGE" and n.image and n.name != "luce_cotta":
            fatti.add(n.image)
        elif n.type == "GROUP" and n.node_tree:
            immagini(n.node_tree, fatti)
    return fatti


def tre(v):
    """da Blender alle coordinate di Three.js"""
    return [round(v.x, 4), round(v.z, 4), round(-v.y, 4)]


def faccia_di(ob, materiale):
    """centro e verso (in Three.js) delle facce di un oggetto con quel materiale (i display)"""
    idx = [i for i, s in enumerate(ob.material_slots) if s.material and s.material.name.startswith(materiale)]
    facce = [p for p in ob.data.polygons if p.material_index in idx]
    if not facce:
        return None
    mw = ob.matrix_world
    # la faccia grande che guarda fuori dall'oggetto (quella dietro e' grande uguale, ma guarda dentro)
    mn, mx = C.riquadro(ob)
    mezzo = (mn + mx) / 2
    fuori = [p for p in facce if (mw.to_3x3() @ p.normal).dot((mw @ p.center) - mezzo) > 0]
    grande = max(fuori or facce, key=lambda p: p.area)
    centro = sum((mw @ p.center for p in facce), Vector()) / len(facce)
    n = (mw.to_3x3() @ grande.normal).normalized()
    return {"pos": tre(centro), "giro": round(math.atan2(n.x, -n.y), 4)}


def luce_in_numeri():
    """la luce cotta (gli EXR puliti) in numeri, uscita/luce_<fase>.npy, per tools/stanza_hq.py che la porta in WebP
    (l'OpenCV di sistema non legge gli EXR); la prima riga e' quella in cima, come nelle immagini"""
    import numpy as np
    for fase in ("mattina", "sera"):
        f = os.path.join(LUCE, f"{fase}.exr")
        if not os.path.exists(f):
            continue
        im = bpy.data.images.load(f)
        w, h = im.size
        a = np.empty(w * h * 4, np.float32)
        im.pixels.foreach_get(a)
        np.save(os.path.join(USCITA, f"luce_{fase}.npy"), a.reshape(h, w, 4)[::-1, :, :3].astype(np.float16))
        bpy.data.images.remove(im)


def esporta():
    """la stanza cotta in glTF (uscita/stanza.glb), con le due coordinate (le texture e la luce), cosa e' cosa negli
    "extras" di ogni oggetto (in Three.js diventano userData: oggetto e pezzo, come in stanza.js), le texture gia'
    ridotte; e i punti che servono al gioco in uscita/punti.json"""
    os.makedirs(USCITA, exist_ok=True)
    oggetti = [o for o in bpy.data.objects if o.type == "MESH" and o.visible_get()]
    # le coordinate della luce devono essere le seconde (TEXCOORD_1)
    for o in oggetti:
        uvs = [u.name for u in o.data.uv_layers]
        if "luce" in uvs and uvs.index("luce") != 1:
            print("ATTENZIONE: coordinate della luce non seconde in", o.name, uvs, flush=True)
        o["oggetto"], o["pezzo"] = ruolo(o.name)
        if o["oggetto"] is None:
            del o["oggetto"]
        if o["pezzo"] is None:
            del o["pezzo"]
    # niente colori dei vertici: alcuni modelli di Poly Haven li hanno (il letto, la torcia) e nel gioco tingevano i
    # materiali (il letto veniva verde). Nei materiali il nodo del colore dei vertici si salta (il colore della texture
    # va diritto), poi gli attributi si tolgono uno alla volta prendendo sempre il primo: togliendoli da un elenco
    # fatto prima se ne cancellavano altri, anche le coordinate della luce
    for m in bpy.data.materials:
        if not m.use_nodes:
            continue
        nt = m.node_tree
        for vc in [n for n in nt.nodes if n.type == "VERTEX_COLOR"]:
            for uscita in vc.outputs:
                for l in list(uscita.links):
                    mix = l.to_node
                    if mix.type != "MIX":
                        continue
                    altri = [i for i in mix.inputs if i.is_linked and i.links[0].from_node != vc and i.type == "RGBA"]
                    if altri:
                        sorgente = altri[0].links[0].from_socket
                        for out in mix.outputs:
                            for ol in list(out.links):
                                nt.links.new(sorgente, ol.to_socket)
                    nt.nodes.remove(mix)
            nt.nodes.remove(vc)
    for o in oggetti:
        while len(o.data.color_attributes):
            o.data.color_attributes.remove(o.data.color_attributes[0])
    # la porta della stanzetta gira sul cardine (a sud): l'origine li', e la forma gia' al suo posto
    porta = bpy.data.objects["porta_ospite"]
    porta.data = porta.data.copy()
    porta.data.transform(porta.matrix_world)
    porta.matrix_world = Matrix.Identity(4)
    cerniera = C.B(C.X1 + 0.03, 0.0, C.OSPITE["z"] + C.OSPITE["largo"] / 2 - 0.005)
    porta.data.transform(Matrix.Translation(-cerniera))
    porta.location = cerniera
    # le texture alla loro misura (la piu' grande tra chi le usa); quelle di dati (rilievo, ruvidezza, metallo) alla
    # meta': si notano meno e la memoria della scheda video sui telefoni e' poca
    misure = {}
    for o in oggetti:
        for s in o.material_slots:
            if s.material and s.material.use_nodes:
                for im in immagini(s.material.node_tree):
                    lato = lato_texture(o.name)
                    if im.colorspace_settings.name != "sRGB":
                        lato = max(256, lato // 2)
                    misure[im.name] = max(misure.get(im.name, 0), lato)
    for nome, lato in misure.items():
        im = bpy.data.images[nome]
        w, h = im.size
        if max(w, h) > lato:
            k = lato / max(w, h)
            im.scale(max(1, round(w * k)), max(1, round(h * k)))
    # i nodi della luce cotta e i materiali che il gioco rifa' da se': la vista (una foto per la mattina e una per la
    # sera) e il vetro
    for m in bpy.data.materials:
        if m.use_nodes and "luce_cotta" in m.node_tree.nodes:
            m.node_tree.nodes.remove(m.node_tree.nodes["luce_cotta"])
    for nome in ("vista", "vetro"):
        vecchio = bpy.data.materials[nome]
        nuovo = bpy.data.materials.new(nome + "_gioco")
        nuovo.use_nodes = True
        for o in oggetti:
            for s in o.material_slots:
                if s.material == vecchio:
                    s.material = nuovo
        vecchio.name = nome + "_blender"
        nuovo.name = nome
    bpy.ops.object.select_all(action="DESELECT")
    for o in oggetti:
        o.select_set(True)
    bpy.context.view_layer.objects.active = oggetti[0]
    glb = os.path.join(USCITA, "stanza.glb")
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_extras=True,
                              export_cameras=False, export_lights=False, export_apply=True, export_texcoords=True,
                              export_normals=True, export_tangents=False, export_materials="EXPORT",
                              export_image_format="AUTO", export_yup=True, export_animations=False)
    # i punti per il gioco: la pianta dei mobili, i display, il piano della scrivania, la lampada
    ingombri = []
    for nome in INGOMBRI:
        o = bpy.data.objects.get(nome)
        if not o:
            continue
        mn, mx = C.riquadro(o)
        ingombri.append([round(mn.x + 0.02, 3), round(-mx.y + 0.02, 3), round(mx.x - 0.02, 3), round(-mn.y - 0.02, 3)])
    punti = {
        "ingombri": ingombri,
        "su": round(C.cima(bpy.data.objects["metal_office_desk"]), 4),
        "display": faccia_di(bpy.data.objects["videoregistratore"], "display_spento"),
        "sveglia": faccia_di(bpy.data.objects["radiosveglia"], "sveglia_display"),
        "lampada": [C.SCRIVANIA["x"] - 0.55, 1.12, C.SCRIVANIA["z"] - 0.1],
        "lampadina": [0.0, C.ALTA - 0.78, 0.3],
        "cerniera": tre(cerniera),
    }
    with open(os.path.join(USCITA, "punti.json"), "w") as f:
        json.dump(punti, f, indent=1)
    luce_in_numeri()
    print("esportata", glb, len(oggetti), "oggetti", flush=True)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if "esporta" in argv:
        esporta()
        return
    numeri = [int(a) for a in argv if a.isdigit()]
    lato = numeri[0] if numeri else 2048
    campioni = numeri[1] if len(numeri) > 1 else 128
    fasi = [a for a in argv if a in ("mattina", "sera")] or ["mattina", "sera"]
    C.costruisci()
    oggetti = da_cuocere()
    coordinate_luce(oggetti)
    print("coordinate luce:", len(oggetti), "oggetti", flush=True)
    for f in fasi:
        cuoci(f, lato, campioni)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(C.SORG, "stanza_cotta.blend"))



if __name__ == "__main__":
    main()
