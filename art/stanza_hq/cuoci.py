"""La luce cotta della stanza del medico ad alta qualita' (costruisci.py fa la stanza): Cycles calcola una volta per
tutte quanta luce arriva su ogni punto (diretta e rimbalzata), la mattina e la sera, e la scrive in un'immagine
sola per tutta la stanza (la "lightmap"); nel gioco Three.js la moltiplica per i colori dei materiali, e la stanza
ha le ombre morbide, la luce che rimbalza e il colore che si spande come nel render, senza calcolarle.

Passi:
1. le seconde coordinate ("luce"): ogni oggetto fermo ha le sue isole, tutte nella stessa immagine, grandi in
   proporzione alla superficie (la stessa definizione dappertutto, circa un punto per centimetro a 2048); le cose
   piccole che si guardano da vicino (PICCOLI) in un'immagine a parte, piu' fitta;
2. la cottura (DIFFUSE, diretta + rimbalzi, senza il colore), per la mattina e per la sera, e la pulizia del rumore
   (il denoiser di Blender);
3. l'esportazione: la stanza in glTF con le due coordinate, le texture ridotte a misura, e un elenco di cosa e'
   cosa (stanza_hq.json) per stanza.js.

Uso: blender -b --python art/stanza_hq/cuoci.py -- [lato] [campioni] [mattina] [sera]
         la cottura (di base 2048 e 128, tutte e due le luci): luce/<fase>.exr, luce/piccoli_<fase>.exr (lato a
         meta') e sorgenti/stanza_cotta.blend
     blender -b art/stanza_hq/sorgenti/stanza_cotta.blend --python art/stanza_hq/cuoci.py -- esporta
         la stanza cotta in uscita/stanza.glb e uscita/punti.json (tools/stanza_hq.py gioco fa il resto)
"""
import json
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

QUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, QUI)
import costruisci as C  # noqa: E402

LUCE = os.path.join(QUI, "luce")
USCITA = os.path.join(QUI, "uscita")

# niente luce cotta: la vista fuori dalla finestra (fa luce da se'), i vetri (trasparenti), i display (nel gioco
# sono disegnati dal codice)
SENZA_LUCE = ("vista", "vetro", "sveglia_display", "vcr_display", "scale_luce")

# le cose piccole che si guardano da vicino (sulla scrivania, la lampada, la televisione col videoregistratore, la
# radiosveglia, le cose sulla credenza, la borsa): la loro luce in un'immagine a parte, quasi tre volte piu' fitta
# (circa 260 punti per metro a 1024, la stanza 92 a 2048; nel gioco la seconda luce cotta, "atlante" negli extras)
PICCOLI = ("fax", "giornale", "cartella", "soldi", "guanti", "maschera", "cassette", "mappa", "desk_lamp_arm_01",
           "television_02", "videoregistratore", "radiosveglia", "vintage_flashlight", "wall_clock", "lightbulb_01",
           "pull_chain_light_socket", "vintage_electric_kettle", "jug_01", "borsa")


def piccolo(o):
    return o.name.startswith(PICCOLI)


def da_cuocere():
    out = []
    for o in bpy.data.objects:
        if o.type != "MESH" or not o.visible_get():
            continue
        if any(o.name.startswith(s) for s in SENZA_LUCE):
            continue
        out.append(o)
    return out


def coordinate_luce(oggetti, margine=0.001):
    """le seconde coordinate, in due immagini: la stanza e le cose piccole"""
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
    # isole di almeno 3 punti di lato: circa 3 centimetri nella stanza, 1 nelle cose piccole
    proietta([o for o in oggetti if not piccolo(o)], margine, 0.03)
    proietta([o for o in oggetti if piccolo(o)], margine * 2, 0.01)


def proietta(oggetti, margine, minimo):
    """le isole di un'immagine: fatte crescere (isole()) sulle copie saldate degli oggetti (saldata()), in metri,
    poi impacchettate tutte insieme a rettangoli, che non si sovrappongono, con un margine di un paio di punti
    (FRACTION e' la parte dell'immagine): la stessa definizione dappertutto.
    Prima c'era la proiezione "smart" di Blender sugli originali: i modelli di Meshy e molti di Poly Haven sono
    staccati a ogni cucitura delle loro texture, quelli di Meshy anche accartocciati, e venivano migliaia di isole
    piu' piccole di un punto (il fax ne aveva 8385, il giornale 14521, il letto 10877; sulle copie saldate ancora
    2579 il fax; ora 192, di 15 punti in mediana): la luce di ognuna finiva su quelle accanto. Con tante isole minuscole anche il margine
    non ci stava (con 0,001 il pavimento era grande il 2% dell'immagine)"""
    copie = [saldata(o) for o in oggetti]
    quante = sum(isole(c, minimo) for c, _ in copie)
    bpy.ops.object.select_all(action="DESELECT")
    for c, _ in copie:
        c.select_set(True)
    bpy.context.view_layer.objects.active = copie[0][0]
    bpy.ops.object.mode_set(mode="EDIT")
    # la selezione delle coordinate segue quella delle facce (tutte)
    bpy.context.scene.tool_settings.use_uv_select_sync = True
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.pack_islands(udim_source="CLOSEST_UDIM", rotate=True, rotate_method="AXIS_ALIGNED", scale=True,
                            merge_overlap=False, margin_method="FRACTION", margin=margine, shape_method="AABB")
    bpy.ops.object.mode_set(mode="OBJECT")
    print(f"  {len(oggetti)} oggetti, {quante} isole", flush=True)
    for o, (c, tiene) in zip(oggetti, copie):
        riporta(c, tiene, o)
        me = c.data
        bpy.data.objects.remove(c)
        bpy.data.meshes.remove(me)


def saldata(o):
    """una copia dell'oggetto coi vertici nello stesso punto uniti (le facce restano quelle, con le loro coordinate
    delle texture); e, per ogni vertice dell'originale, quello della copia che lo tiene (col suo numero di prima)"""
    c = o.copy()
    c.data = o.data.copy()
    bpy.context.scene.collection.objects.link(c)
    # dove guarda ogni faccia per chi la disegna: la media delle normali dei suoi angoli (non quella del triangolo: i
    # modelli di Meshy sono accartocciati, e le loro normali le rifa' lisce costruisci.normali_lisce), nel mondo;
    # presa prima di saldare
    me = o.data
    nl, nf = len(me.loops), len(me.polygons)
    cn = np.empty(nl * 3, np.float64)
    me.corner_normals.foreach_get("vector", cn)
    quanti = np.empty(nf, np.int64)
    me.polygons.foreach_get("loop_total", quanti)
    lf = np.repeat(np.arange(nf), quanti)
    g = np.stack([np.bincount(lf, cn[k::3], minlength=nf) for k in range(3)], axis=1)
    g = g @ np.linalg.inv(np.array(o.matrix_world, np.float64)[:3, :3])
    g /= np.maximum(np.linalg.norm(g, axis=1), 1e-20)[:, None]
    c.data.attributes.new("guarda", "FLOAT_VECTOR", "FACE").data.foreach_set("vector", g.astype(np.float32).ravel())
    bm = bmesh.new()
    bm.from_mesh(c.data)
    # il numero di prima, prima di cercare i doppi (un livello nuovo invalida i vertici gia' presi)
    numero = bm.verts.layers.int.new("primo")
    bm.verts.ensure_lookup_table()
    for v in bm.verts:
        v[numero] = v.index
    doppi = bmesh.ops.find_doubles(bm, verts=bm.verts, dist=1e-5)["targetmap"]
    tiene = np.arange(len(bm.verts))
    for v, t in doppi.items():
        tiene[v.index] = t.index
    bmesh.ops.weld_verts(bm, targetmap=doppi)
    bm.to_mesh(c.data)
    bm.free()
    return c, tiene


def isole(c, minimo, soglia=55, piega=80):
    """le isole di una copia saldata, fatte crescere a mano: dalla faccia piu' grande ancora libera si aggiungono le
    vicine (che toccano uno spigolo) finche' guardano dalla sua parte, entro "soglia" gradi (dove guardano: le
    normali lisce, "guarda" di saldata()), la faccia vera non piega oltre "piega" gradi e, nel piano dell'isola, non
    finisce sopra quello che l'isola copre gia' (una griglia di quadretti grandi mezzo lato tipico). I fogli della
    cartella, dei giornali e dei soldi sono uno sopra l'altro, uniti dai bordi sottili: con le sole normali un'isola
    passava da un foglio a quello sotto, e nella proiezione si sovrapponevano (la cartella al 70%: la luce di un
    foglio finiva su quello sopra, a macchie scure). Ogni isola si proietta in piano lungo la direzione della sua
    prima faccia, in metri, nelle coordinate della luce della copia.
    Le facce rimaste fuori per poco (le pieghe dei triangoli accartocciati, che nella proiezione si girano sopra le
    vicine) e le isole piu' piccole di "minimo" metri di lato si uniscono a una vicina grande, anche sovrapposte: e'
    lo stesso punto, con la stessa luce (Cycles cuoce con le normali lisce). Le isole che non hanno vicine (i
    pezzetti staccati: viti, borchie; le strisce attorno ai tubi e ai fili) si allungano fino a "minimo": la cottura
    scrive i punti dell'immagine il cui centro cade dentro un'isola, e in quelle piu' piccole di un punto finiva la
    luce delle vicine. Restituisce quante sono"""
    me = c.data
    nv, nl, nf = len(me.vertices), len(me.loops), len(me.polygons)
    if not nf:
        return 0
    co = np.empty(nv * 3, np.float64)
    me.vertices.foreach_get("co", co)
    m = np.array(c.matrix_world, np.float64)
    p = co.reshape(-1, 3) @ m[:3, :3].T + m[:3, 3]
    lv, le = np.empty(nl, np.int64), np.empty(nl, np.int64)
    me.loops.foreach_get("vertex_index", lv)
    me.loops.foreach_get("edge_index", le)
    inizio, quanti = np.empty(nf, np.int64), np.empty(nf, np.int64)
    me.polygons.foreach_get("loop_start", inizio)
    me.polygons.foreach_get("loop_total", quanti)
    assert inizio[0] == 0 and (np.diff(inizio) == quanti[:-1]).all(), "angoli delle facce non in fila"
    lf = np.repeat(np.arange(nf), quanti)
    dopo = np.arange(nl) + 1
    dopo[inizio + quanti - 1] = inizio

    def unita(x):
        return x / np.maximum(np.linalg.norm(x, axis=1), 1e-20)[:, None]

    # l'area con il suo verso (Newell, anche per le facce non piane), dove e' girata e dove guarda la faccia
    a = np.stack([np.bincount(lf, x, minlength=nf) for x in np.cross(p[lv], p[lv[dopo]]).T], axis=1) / 2
    area = np.linalg.norm(a, axis=1)
    n = unita(a)
    s = np.empty(nf * 3, np.float32)
    me.attributes["guarda"].data.foreach_get("vector", s)
    s = s.reshape(-1, 3).astype(np.float64)
    # le facce vicine: quelle che hanno uno spigolo in comune (in fila, se lo hanno in tre o piu')
    ordine = np.argsort(le, kind="stable")
    es, fs = le[ordine], lf[ordine]
    stesso = np.flatnonzero(es[1:] == es[:-1])
    vicini = [[] for _ in range(nf)]
    for x, y in zip(fs[stesso].tolist(), fs[stesso + 1].tolist()):
        if x != y:
            vicini[x].append(y)
            vicini[y].append(x)
    # la griglia: quadretti grandi mezzo lato tipico; i vertici di ogni faccia
    cella = max(float(np.median(np.linalg.norm(p[lv] - p[lv[dopo]], axis=1))) / 2, 2e-4)
    P = (p / cella).tolist()
    vf = np.split(lv, inizio[1:])

    def piano(d):
        u = np.cross(d, (0.0, 0.0, 1.0) if abs(d[2]) < 0.9 else (1.0, 0.0, 0.0))
        u /= np.linalg.norm(u)
        return u.tolist(), np.cross(d, u).tolist()

    def copre(f, u, v):
        """i quadretti (col centro dentro) che la faccia copre nel piano u, v"""
        q = [(P[i][0] * u[0] + P[i][1] * u[1] + P[i][2] * u[2] - 0.5, P[i][0] * v[0] + P[i][1] * v[1] + P[i][2] * v[2] - 0.5)
             for i in vf[f].tolist()]
        out = []
        ax, ay = q[0]
        for t in range(1, len(q) - 1):
            (bx, by), (cx, cy) = q[t], q[t + 1]
            den = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay)
            if abs(den) < 1e-12:
                continue
            for gx in range(math.ceil(min(ax, bx, cx)), math.floor(max(ax, bx, cx)) + 1):
                for gy in range(math.ceil(min(ay, by, cy)), math.floor(max(ay, by, cy)) + 1):
                    w1 = ((bx - gx) * (cy - gy) - (cx - gx) * (by - gy)) / den
                    w2 = ((cx - gx) * (ay - gy) - (ax - gx) * (cy - gy)) / den
                    if w1 > 1e-7 and w2 > 1e-7 and 1 - w1 - w2 > 1e-7:
                        out.append((gx, gy))
        return out

    sl, nl_, ar = s.tolist(), n.tolist(), area.tolist()
    cs, cp = math.cos(math.radians(soglia)), math.cos(math.radians(piega))
    isola = [-1] * nf
    prime, piani = [], []
    for f in np.argsort(-area, kind="stable").tolist():
        if isola[f] >= 0:
            continue
        k = len(prime)
        dx, dy, dz = sl[f]
        prime.append((dx, dy, dz))
        u, v = piano(np.array(sl[f]))
        piani.append((u, v))
        isola[f] = k
        coperti = set(copre(f, u, v))
        coda = [f]
        while coda:
            g = coda.pop()
            for h in vicini[g]:
                if isola[h] >= 0:
                    continue
                sh, nh = sl[h], nl_[h]
                if sh[0] * dx + sh[1] * dy + sh[2] * dz < cs or \
                        (ar[h] > 1e-14 and nh[0] * dx + nh[1] * dy + nh[2] * dz < cp):
                    continue
                qh = copre(h, u, v)
                sopra = sum(1 for x in qh if x in coperti)
                if sopra > 1 and sopra > 0.3 * len(qh):
                    continue
                isola[h] = k
                coperti.update(qh)
                coda.append(h)
    k = len(prime)
    # le isole piccole (meno di un quadrato di "minimo" di lato) faccia per faccia nella vicina grande che guarda
    # piu' dalla loro parte; piu' volte, perche' alcune toccano solo altre piccole
    for _ in range(8):
        grandezza = np.bincount(isola, area, minlength=k)
        piccole = grandezza < minimo * minimo
        cambi = 0
        for f in np.flatnonzero(piccole[isola]).tolist():
            meglio, quanto = -1, -3.0
            sf = sl[f]
            for h in vicini[f]:
                j = isola[h]
                if not piccole[j]:
                    pj = prime[j]
                    q = sf[0] * pj[0] + sf[1] * pj[1] + sf[2] * pj[2]
                    if q > quanto:
                        meglio, quanto = j, q
            if meglio >= 0:
                isola[f] = meglio
                cambi += 1
        if not cambi:
            break
    isola = np.array(isola)
    # la proiezione in piano, in metri, sui due assi di ogni isola
    u = np.array([x for x, _ in piani])
    v = np.array([y for _, y in piani])
    il = isola[lf]
    uv = np.stack([np.einsum("ij,ij->i", p[lv], u[il]), np.einsum("ij,ij->i", p[lv], v[il])], axis=1)
    # ogni isola girata sui suoi assi (quelli della sua forma) e, dove e' piu' stretta di "minimo", allungata
    quante = np.maximum(np.bincount(il, minlength=k), 1)
    media = np.stack([np.bincount(il, uv[:, j], minlength=k) for j in range(2)], axis=1) / quante[:, None]
    du = uv - media[il]
    sxx, syy = np.bincount(il, du[:, 0] ** 2, minlength=k), np.bincount(il, du[:, 1] ** 2, minlength=k)
    sxy = np.bincount(il, du[:, 0] * du[:, 1], minlength=k)
    ang = 0.5 * np.arctan2(2 * sxy, sxx - syy)
    co_, si_ = np.cos(ang)[il], np.sin(ang)[il]
    uv = np.stack([co_ * du[:, 0] + si_ * du[:, 1], co_ * du[:, 1] - si_ * du[:, 0]], axis=1)
    lo, hi = np.zeros((k, 2)), np.zeros((k, 2))
    usate = np.unique(il)
    lo[usate], hi[usate] = np.inf, -np.inf
    np.minimum.at(lo, il, uv)
    np.maximum.at(hi, il, uv)
    lati = hi - lo
    per = np.where(lati < minimo, minimo / np.maximum(lati, minimo * 1e-3), 1.0)
    centro = (lo + hi) / 2
    uv = centro[il] + (uv - centro[il]) * per[il]
    me.uv_layers["luce"].data.foreach_set("uv", uv.astype(np.float32).ravel())
    return len(usate)


def riporta(c, tiene, o):
    """le coordinate della luce dalla copia saldata all'originale: ogni faccia dell'originale ritrova la sua nella
    copia dai vertici che la tengono, nello stesso giro (le due facce di un foglio hanno gli stessi vertici al
    contrario), e ogni angolo prende le coordinate del suo vertice. Una faccia con due vertici nello stesso punto,
    saldata, perde un angolo (ritrova la sua senza il vertice ripetuto); quelle che non si ritrovano (degeneri)
    finiscono in un punto solo delle coordinate, che la cottura non scrive"""
    def giro(ids):
        k = ids.index(min(ids))
        return tuple(ids[k:] + ids[:k])

    def angoli(me):
        n = len(me.polygons)
        inizio, quanti = np.empty(n, np.int64), np.empty(n, np.int64)
        me.polygons.foreach_get("loop_start", inizio)
        me.polygons.foreach_get("loop_total", quanti)
        vert = np.empty(len(me.loops), np.int64)
        me.loops.foreach_get("vertex_index", vert)
        return inizio, quanti, vert

    mc, mo = c.data, o.data
    primo = np.empty(len(mc.vertices), np.int64)
    mc.attributes["primo"].data.foreach_get("value", primo)
    uv = np.empty(len(mc.loops) * 2, np.float32)
    mc.uv_layers["luce"].data.foreach_get("uv", uv)
    uv = uv.reshape(-1, 2)
    facce, vertici = {}, {}
    inizio, quanti, vert = angoli(mc)
    for s, n in zip(inizio.tolist(), quanti.tolist()):
        ids = primo[vert[s:s + n]].tolist()
        d = dict(zip(ids, uv[s:s + n]))
        facce.setdefault(giro(ids), d)
        vertici.update(d)
    inizio, quanti, vert = angoli(mo)
    nuove = np.zeros((len(mo.loops), 2), np.float32)
    perse = 0
    for s, n in zip(inizio.tolist(), quanti.tolist()):
        ids = tiene[vert[s:s + n]].tolist()
        d = facce.get(giro([x for j, x in enumerate(ids) if x != ids[j - 1]] or ids[:1]))
        if d is None:
            punto = next((vertici[i] for i in ids if i in vertici), (0.0, 0.0))
            d = {i: punto for i in ids}
            perse += 1
        for k, i in enumerate(ids):
            nuove[s + k] = d.get(i, (0.0, 0.0))
    mo.uv_layers["luce"].data.foreach_set("uv", nuove.ravel())
    if perse:
        print(f"  {o.name}: {perse} facce degeneri (area zero), in un punto solo", flush=True)


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
    # l'ombra cotta un po' piu' in la' dalla superficie, se un pezzo la vuole (i modelli di Meshy, normali_lisce)
    tutto.shadow_terminator_geometry_offset = max(o.shadow_terminator_geometry_offset for o in oggetti)
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
    # prima la stanza, poi le cose piccole nella loro immagine: in ogni cottura gli oggetti dell'altra restano nella
    # scena (fanno ombra e luce come prima), e i materiali che usano tutte e due scrivono ogni volta nell'immagine giusta
    # (le cose piccole con il doppio dei campioni: sono poche, e si guardano da vicino)
    for gruppo, nome, l, n in (([o for o in oggetti if not piccolo(o)], fase, lato, campioni),
                               ([o for o in oggetti if piccolo(o)], f"piccoli_{fase}", lato // 2, campioni * 2)):
        sc.cycles.samples = n
        im = immagine_luce(f"luce_{nome}", l)
        bersaglio(gruppo, im)
        tutto = unico(gruppo)
        bpy.ops.object.select_all(action="DESELECT")
        tutto.select_set(True)
        bpy.context.view_layer.objects.active = tutto
        bpy.ops.object.bake(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, margin=6, use_clear=True)
        bpy.data.objects.remove(tutto)
        for o in gruppo:
            o.hide_render = False
        os.makedirs(LUCE, exist_ok=True)
        im.filepath_raw = os.path.join(LUCE, f"{nome}_grezza.exr")
        im.file_format = "OPEN_EXR"
        im.save()
        pulisci(im, os.path.join(LUCE, f"{nome}.exr"))
        print("cotta", nome, flush=True)


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
    for nome in ("mattina", "sera", "piccoli_mattina", "piccoli_sera"):
        f = os.path.join(LUCE, f"{nome}.exr")
        if not os.path.exists(f):
            continue
        im = bpy.data.images.load(f)
        w, h = im.size
        a = np.empty(w * h * 4, np.float32)
        im.pixels.foreach_get(a)
        np.save(os.path.join(USCITA, f"luce_{nome}.npy"), a.reshape(h, w, 4)[::-1, :, :3].astype(np.float16))
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
        # la luce cotta delle cose piccole e' nella seconda immagine
        if piccolo(o) and "luce" in uvs:
            o["atlante"] = "piccoli"
        elif "atlante" in o:
            del o["atlante"]
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
        "lampadina": [0.0, C.ALTA - 0.63, 0.3],
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
