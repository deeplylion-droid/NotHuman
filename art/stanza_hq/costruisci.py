"""La stanza del medico ad alta qualita', costruita in Blender (27 ottobre, sera: "un ambiente 3D con mobili e oggetti
all'altezza di un videogioco moderno, tipo Poppy Playtime"; poi "non rendere la stanza cosi' moscia come era quella di
prima. Dalle piu' carattere, piu' contrasto, meno cupa"; poi "troppo italiana anni 80 con quel pavimento e quella carta
da parati oscena. Puoi renderla piu' americana?": una vecchia casa americana, col pavimento di assi, la boiserie
bianca a doghe, la carta a righe, la finestra a ghigliottina con la tenda avvolgibile, le porte a sei pannelli col
pomolo tondo, l'interruttore e le prese americane).

La pianta e' quella di gioco/js/stanza.js (5 x 6 metri, alta 3; la finestra sopra la scrivania, la porta di fronte, la
stanzetta dell'ospite a est) e i mobili stanno dove stavano, cosi' il gioco resta uguale. Le misure qui sono nelle
coordinate di Three.js (x a est, y in alto, z verso la porta); B() le porta in Blender (z in alto).

I modelli e i materiali vengono da Poly Haven (CC0; tools/stanza_hq.py li scarica in sorgenti/), le texture ricolorate
e la carta da parati da texture.py; quello che manca (muri, porte, finestra, armadio, termosifone, lavandino,
videoregistratore, radiosveglia, letto rifatto) si costruisce qui. Gli oggetti di Meshy della stanza di prima (la borsa,
il cappotto, il fax, la maschera...) restano.

Uso (Blender 4.5):
  blender -b --python art/stanza_hq/costruisci.py -- anteprima [mattina|sera] [viste...]
      le immagini di prova con Cycles in art/stanza_hq/anteprime/
  blender -b --python art/stanza_hq/costruisci.py -- salva
      salva la scena in art/stanza_hq/sorgenti/stanza.blend
"""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

QUI = os.path.dirname(os.path.abspath(__file__))
RADICE = os.path.dirname(os.path.dirname(QUI))
SORG = os.path.join(QUI, "sorgenti")
TEX = os.path.join(QUI, "texture")
VECCHIA = os.path.join(RADICE, "art", "stanza3d")

# la stanza (come in stanza.js)
X0, X1, Z0, Z1, ALTA = -2.5, 2.5, -3.0, 3.0, 3.0
OCCHI = 1.62
FIN = dict(x0=-1.35, x1=-0.05, y0=0.95, y1=2.4, fondo=0.24)
PORTA = dict(x=-1.5, largo=0.96, alto=2.08)
OSPITE = dict(z=1.7, largo=0.84, alto=2.05, muro=0.12)
STANZETTA = dict(x1=X1 + 2.0, z0=0.35, z1=Z1)
SCRIVANIA = dict(x=-0.7, z=-2.62)
ZOCCOLO = 1.0  # fin dove arriva la boiserie a doghe, col listello in cima
SPESSORE = dict(nord=0.3, sud=0.2, ovest=0.2, est=OSPITE["muro"])


def B(x, y, z):
    """da Three.js (y in alto, z verso la porta) a Blender (z in alto)"""
    return Vector((x, -z, y))


# ---------------------------------------------------------------- scena e materiali

def nuova_scena():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.unit_settings.system = "METRIC"
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    return sc


def collezione(nome):
    c = bpy.data.collections.get(nome) or bpy.data.collections.new(nome)
    if c.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(c)
    return c


def immagine(percorso, colore=True):
    im = bpy.data.images.load(percorso, check_existing=True)
    im.colorspace_settings.name = "sRGB" if colore else "Non-Color"
    return im


def lineare(c):
    """un colore sRGB 0..255 in luce lineare"""
    out = []
    for v in c[:3]:
        v = v / 255
        out.append(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


def materiale(nome, diff=None, colore=None, nor=None, rough=None, arm=None, ruvido=0.6, metallo=0.0, rilievo=1.0,
              luce=None, forza_luce=0.0, trasmissione=0.0, alfa=None):
    if nome in bpy.data.materials:
        return bpy.data.materials[nome]
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    p = N["Principled BSDF"]
    x = -700
    if diff:
        t = N.new("ShaderNodeTexImage")
        t.image = immagine(diff)
        t.location = (x, 300)
        L.new(t.outputs["Color"], p.inputs["Base Color"])
    elif colore:
        p.inputs["Base Color"].default_value = lineare(colore)
    if arm:
        t = N.new("ShaderNodeTexImage")
        t.image = immagine(arm, False)
        t.location = (x, 0)
        s = N.new("ShaderNodeSeparateColor")
        s.location = (x + 300, 0)
        L.new(t.outputs["Color"], s.inputs["Color"])
        L.new(s.outputs["Green"], p.inputs["Roughness"])
        L.new(s.outputs["Blue"], p.inputs["Metallic"])
    else:
        if rough:
            t = N.new("ShaderNodeTexImage")
            t.image = immagine(rough, False)
            t.location = (x, 0)
            L.new(t.outputs["Color"], p.inputs["Roughness"])
        else:
            p.inputs["Roughness"].default_value = ruvido
        p.inputs["Metallic"].default_value = metallo
    if nor:
        t = N.new("ShaderNodeTexImage")
        t.image = immagine(nor, False)
        t.location = (x, -300)
        nm = N.new("ShaderNodeNormalMap")
        nm.location = (x + 300, -300)
        nm.inputs["Strength"].default_value = rilievo
        L.new(t.outputs["Color"], nm.inputs["Color"])
        L.new(nm.outputs["Normal"], p.inputs["Normal"])
    if luce:
        p.inputs["Emission Color"].default_value = lineare(luce)
        p.inputs["Emission Strength"].default_value = forza_luce
    if trasmissione:
        p.inputs["Transmission Weight"].default_value = trasmissione
    if alfa is not None:
        p.inputs["Alpha"].default_value = alfa
        m.blend_method = "BLEND" if hasattr(m, "blend_method") else None
    return m


def vetro():
    """il vetro sottile della finestra: lascia passare la luce del sole (in Cycles un vetro vero la fermerebbe, le
    caustiche non si calcolano) e riflette un poco"""
    m = bpy.data.materials.new("vetro")
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    N.remove(N["Principled BSDF"])
    tr = N.new("ShaderNodeBsdfTransparent")
    gl = N.new("ShaderNodeBsdfGlossy")
    gl.inputs["Roughness"].default_value = 0.02
    fr = N.new("ShaderNodeFresnel")
    fr.inputs["IOR"].default_value = 1.5
    mx = N.new("ShaderNodeMixShader")
    L.new(fr.outputs["Fac"], mx.inputs["Fac"])
    L.new(tr.outputs["BSDF"], mx.inputs[1])
    L.new(gl.outputs["BSDF"], mx.inputs[2])
    L.new(mx.outputs["Shader"], N["Material Output"].inputs["Surface"])
    return m


def vista(img):
    """la vista dalla finestra: una foto che fa luce da se'"""
    m = bpy.data.materials.new("vista")
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    N.remove(N["Principled BSDF"])
    t = N.new("ShaderNodeTexImage")
    t.image = immagine(img)
    e = N.new("ShaderNodeEmission")
    e.inputs["Strength"].default_value = 1.0
    L.new(t.outputs["Color"], e.inputs["Color"])
    L.new(e.outputs["Emission"], N["Material Output"].inputs["Surface"])
    return m


def ph_tex(nome, mappa):
    cart = os.path.join(SORG, "materiali", nome)
    for f in sorted(os.listdir(cart)):
        if f.startswith(f"{nome}_{mappa}_") and f.endswith(".jpg"):
            return os.path.join(cart, f)
    raise FileNotFoundError(f"{nome} {mappa}")


MAT = {}


def materiali():
    t = lambda f: os.path.join(TEX, f)
    MAT["pavimento"] = materiale("pavimento", diff=ph_tex("old_wooden_floor_02", "diff"),
                                 nor=ph_tex("old_wooden_floor_02", "nor_gl"), rough=ph_tex("old_wooden_floor_02", "rough"),
                                 rilievo=0.8)
    MAT["zoccolo"] = materiale("boiserie", diff=t("boiserie_diff.jpg"), nor=ph_tex("white_planks_clean", "nor_gl"),
                               rough=t("boiserie_rough.jpg"), rilievo=1.0)
    MAT["carta"] = materiale("carta_parati", diff=t("carta_parati_diff.jpg"), nor=t("carta_parati_nor.jpg"), ruvido=0.82,
                             rilievo=0.6)
    MAT["soffitto"] = materiale("soffitto", diff=t("soffitto_diff.jpg"),
                                nor=ph_tex("painted_plaster_wall", "nor_gl"), ruvido=0.9, rilievo=0.4)
    MAT["intonaco"] = materiale("intonaco", diff=ph_tex("beige_wall_001", "diff"), nor=ph_tex("beige_wall_001", "nor_gl"),
                                ruvido=0.9)
    MAT["smalto"] = materiale("smalto", diff=t("smalto_diff.jpg"), nor=ph_tex("wood_table_worn", "nor_gl"),
                              rough=t("smalto_rough.jpg"), rilievo=0.25)
    MAT["noce"] = materiale("noce", diff=ph_tex("fine_grained_wood", "col"), nor=ph_tex("fine_grained_wood", "nor_gl"),
                            rough=ph_tex("fine_grained_wood", "rough"), rilievo=0.5)
    MAT["legno_scuro"] = materiale("legno_scuro", diff=ph_tex("wood_table_worn", "diff"),
                                   nor=ph_tex("wood_table_worn", "nor_gl"), rough=ph_tex("wood_table_worn", "rough"))
    MAT["marmo"] = materiale("marmo", colore=(214, 208, 196), ruvido=0.25)
    MAT["ottone"] = materiale("ottone", colore=(196, 160, 92), ruvido=0.32, metallo=1.0)
    MAT["cromo"] = materiale("cromo", colore=(220, 222, 226), ruvido=0.15, metallo=1.0)
    MAT["ghisa"] = materiale("ghisa", colore=(222, 214, 196), ruvido=0.55)  # termosifone smaltato, vecchio
    MAT["ceramica"] = materiale("ceramica", colore=(236, 234, 228), ruvido=0.12)
    MAT["plastica_nera"] = materiale("plastica_nera", colore=(28, 28, 30), ruvido=0.45)
    MAT["plastica_grigia"] = materiale("plastica_grigia", colore=(150, 148, 142), ruvido=0.5)
    # la tenda avvolgibile della finestra: tela color crema; la mattina il sole la attraversa e fa luce (luci())
    MAT["tenda"] = materiale("tenda", colore=(226, 212, 178), nor=ph_tex("rough_linen", "nor_gl"), ruvido=0.9,
                             luce=(255, 232, 196), forza_luce=0.0)
    MAT["vetro"] = vetro()
    MAT["lenzuolo"] = materiale("lenzuolo", diff=ph_tex("rough_linen", "diff"), nor=ph_tex("rough_linen", "nor_gl"),
                                ruvido=0.9)
    MAT["coperta"] = materiale("coperta", diff=t("coperta_diff.jpg"), nor=ph_tex("poly_wool_herringbone", "nor_gl"),
                               ruvido=0.95)
    MAT["materasso"] = materiale("materasso", diff=ph_tex("rough_linen", "diff"), nor=ph_tex("rough_linen", "nor_gl"),
                                 ruvido=0.9)
    MAT["spugna"] = materiale("spugna", diff=ph_tex("terry_cloth", "diff"), nor=ph_tex("terry_cloth", "nor_gl"),
                              ruvido=1.0)
    MAT["tappeto"] = materiale("tappeto", diff=ph_tex("dirty_carpet", "diff"), nor=ph_tex("dirty_carpet", "nor_gl"),
                               ruvido=1.0)
    MAT["tela"] = materiale("tela_brandina", colore=(96, 98, 70), ruvido=0.9)
    MAT["tubo"] = materiale("tubo_brandina", colore=(70, 76, 62), ruvido=0.5, metallo=0.6)
    MAT["fuori"] = vista(os.path.join(QUI, "finestra", "vista_mattina.jpg"))


# ---------------------------------------------------------------- geometria

def oggetto(nome, me, coll="stanza"):
    ob = bpy.data.objects.new(nome, me)
    collezione(coll).objects.link(ob)
    return ob


def uv_mondo(ob, metri=1.0):
    """le coordinate della texture dal mondo, per faccia: i disegni continuano da un pezzo all'altro, ogni tot metri"""
    me = ob.data
    if not me.uv_layers:
        me.uv_layers.new(name="UVMap")
    uv = me.uv_layers[0].data
    mw = ob.matrix_world
    rot = mw.to_3x3()
    for poly in me.polygons:
        n = (rot @ poly.normal).normalized()
        ax = max(range(3), key=lambda i: abs(n[i]))
        for li in poly.loop_indices:
            v = mw @ me.vertices[me.loops[li].vertex_index].co
            if ax == 0:
                u, w = (v.y if n.x > 0 else -v.y), v.z
            elif ax == 1:
                u, w = (-v.x if n.y > 0 else v.x), v.z
            else:
                u, w = v.x, (v.y if n.z > 0 else -v.y)
            uv[li].uv = (u / metri, w / metri)


def scatola(nome, c, d, mat, metri=None, smusso=0.0, coll="stanza", rot_y=0.0):
    """una scatola: centro e misure nelle coordinate di Three.js; "smusso" arrotonda gli spigoli"""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * d[0], v.co.y * d[2], v.co.z * d[1]))
    if smusso:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=smusso, segments=2, affect="EDGES", profile=0.5)
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    ob = oggetto(nome, me, coll)
    ob.location = B(*c)
    ob.rotation_euler = (0, 0, rot_y)
    me.materials.append(mat)
    bpy.context.view_layer.update()
    uv_mondo(ob, metri or max(d))
    return ob


def piano(nome, verts3, mat, metri=1.0, coll="stanza"):
    """una faccia da punti in coordinate di Three.js (in senso antiorario visti da davanti)"""
    me = bpy.data.meshes.new(nome)
    me.from_pydata([B(*p) for p in verts3], [], [list(range(len(verts3)))])
    ob = oggetto(nome, me, coll)
    me.materials.append(mat)
    uv_mondo(ob, metri)
    return ob


def parete(nome, verso, aperture, mats, spessore, x0=X0, x1=X1, z0=Z0, z1=Z1, alta=ALTA, zoccolo=ZOCCOLO,
           coll="stanza", metri=(1.8, 0.53, 2.0)):
    """la faccia interna di un muro, con i buchi (porte, finestre) e gli sguanci; sotto lo zoccolo il primo materiale,
    sopra il secondo, negli sguanci il terzo. "aperture": (a0, a1, y0, y1) lungo il muro (x per nord e sud, z per ovest
    ed est); "metri": ogni quanto si ripete la texture di ogni materiale (la boiserie, la carta, l'intonaco)"""
    lungoX = verso in ("nord", "sud")
    a_min, a_max = (x0, x1) if lungoX else (z0, z1)

    def P(a, y, d=0.0):
        if verso == "nord":
            return B(a, y, z0 - d)
        if verso == "sud":
            return B(a, y, z1 + d)
        if verso == "ovest":
            return B(x0 - d, y, a)
        return B(x1 + d, y, a)

    dentro = {"nord": B(0, 0, 1) - B(0, 0, 0), "sud": B(0, 0, -1) - B(0, 0, 0), "ovest": B(1, 0, 0) - B(0, 0, 0),
              "est": B(-1, 0, 0) - B(0, 0, 0)}[verso]
    xs = sorted({a_min, a_max, *[v for ap in aperture for v in ap[:2]]})
    ys = sorted({0.0, alta, *([zoccolo] if zoccolo else []), *[v for ap in aperture for v in ap[2:]]})
    bm = bmesh.new()
    cache = {}

    def V(a, y, d=0.0):
        k = (round(a, 5), round(y, 5), round(d, 5))
        if k not in cache:
            cache[k] = bm.verts.new(P(a, y, d))
        return cache[k]

    def faccia(vs, verso_n, mat_i):
        f = bm.faces.new(vs)
        f.material_index = mat_i
        bm.normal_update()
        if f.normal.dot(verso_n) < 0:
            f.normal_flip()
        return f

    for i in range(len(xs) - 1):
        for j in range(len(ys) - 1):
            am, ym = (xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2
            if any(ap[0] < am < ap[1] and ap[2] < ym < ap[3] for ap in aperture):
                continue
            mi = 0 if (zoccolo and ym < zoccolo) else 1
            faccia([V(xs[i], ys[j]), V(xs[i + 1], ys[j]), V(xs[i + 1], ys[j + 1]), V(xs[i], ys[j + 1])], dentro, mi)
    # gli sguanci: lo spessore del muro attorno ai buchi, d'intonaco
    lungo = (P(1, 0) - P(0, 0)).normalized()
    su = Vector((0, 0, 1))
    for (a0, a1, y0, y1) in aperture:
        for (pa, pb, n) in [((a0, y0), (a0, y1), lungo), ((a1, y0), (a1, y1), -lungo), ((a0, y1), (a1, y1), -su),
                            ((a0, y0), (a1, y0), su)]:
            if n == su and y0 <= 0.001:
                continue
            faccia([V(*pa), V(*pb), V(pb[0], pb[1], spessore), V(pa[0], pa[1], spessore)], n, 2)
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    ob = oggetto(nome, me, coll)
    for m in mats:
        me.materials.append(m)
    uv_mondo(ob, 1.0)
    uv = me.uv_layers[0].data
    for poly in me.polygons:
        for li in poly.loop_indices:
            uv[li].uv = uv[li].uv / metri[poly.material_index]
    return ob


def listello(nome, verso, a0, a1, y, h, d, mat, x0=X0, x1=X1, z0=Z0, z1=Z1, smusso=0.004):
    lungoX = verso in ("nord", "sud")
    c = (a0 + a1) / 2
    if verso == "nord":
        centro, dim = (c, y, z0 + d / 2), (a1 - a0, h, d)
    elif verso == "sud":
        centro, dim = (c, y, z1 - d / 2), (a1 - a0, h, d)
    elif verso == "ovest":
        centro, dim = (x0 + d / 2, y, c), (d, h, a1 - a0)
    else:
        centro, dim = (x1 - d / 2, y, c), (d, h, a1 - a0)
    return scatola(nome, centro, dim, mat, metri=0.6, smusso=smusso)


def guscio():
    """muri, pavimento, soffitto, zoccolo, battiscopa e cornici"""
    o0, o1 = OSPITE["z"] - OSPITE["largo"] / 2, OSPITE["z"] + OSPITE["largo"] / 2
    p0, p1 = PORTA["x"] - PORTA["largo"] / 2, PORTA["x"] + PORTA["largo"] / 2
    mats = [MAT["zoccolo"], MAT["carta"], MAT["intonaco"]]
    parete("muro_nord", "nord", [(FIN["x0"], FIN["x1"], FIN["y0"], FIN["y1"])], mats, FIN["fondo"])
    parete("muro_sud", "sud", [(p0, p1, 0.0, PORTA["alto"])], mats, SPESSORE["sud"])
    parete("muro_ovest", "ovest", [], mats, SPESSORE["ovest"])
    parete("muro_est", "est", [(o0, o1, 0.0, OSPITE["alto"])], mats, OSPITE["muro"])
    piano("pavimento", [(X0, 0, Z1), (X1, 0, Z1), (X1, 0, Z0), (X0, 0, Z0)], MAT["pavimento"], metri=2.03)
    piano("soffitto", [(X0, ALTA, Z0), (X1, ALTA, Z0), (X1, ALTA, Z1), (X0, ALTA, Z1)], MAT["soffitto"], metri=2.0)
    # fuori dai muri, un guscio che non fa entrare la luce dalle fessure tra un pezzo e l'altro
    for nome, c, d in [("fuori_nord", (0, ALTA / 2, Z0 - FIN["fondo"] - 0.05), (X1 - X0 + 1, ALTA + 1, 0.1))]:
        pass
    # il battiscopa alto, il listello che chiude la boiserie (si ferma alle cornici di porte e finestra) e la cornice
    # sotto il soffitto: legno dipinto di bianco, all'americana
    for verso, a0, a1 in [("nord", X0, X1), ("sud", X0, p0 - 0.085), ("sud", p1 + 0.085, X1), ("ovest", Z0, Z1),
                          ("est", Z0, o0 - 0.085), ("est", o1 + 0.085, Z1)]:
        listello(f"battiscopa_{verso}_{a0:.2f}", verso, a0, a1, 0.07, 0.14, 0.02, MAT["smalto"], smusso=0.005)
    for verso, a0, a1 in [("nord", X0, FIN["x0"] - 0.095), ("nord", FIN["x1"] + 0.095, X1), ("sud", X0, p0 - 0.085),
                          ("sud", p1 + 0.085, X1), ("ovest", Z0, Z1), ("est", Z0, o0 - 0.085), ("est", o1 + 0.085, Z1)]:
        listello(f"filetto_{verso}_{a0:.2f}", verso, a0, a1, ZOCCOLO, 0.05, 0.028, MAT["smalto"], smusso=0.008)
    for verso, a0, a1 in [("nord", X0, X1), ("sud", X0, X1), ("ovest", Z0, Z1), ("est", Z0, Z1)]:
        listello(f"cornice_{verso}", verso, a0, a1, ALTA - 0.05, 0.1, 0.05, MAT["smalto"], smusso=0.012)


def finestra():
    """la finestra all'americana: due finestre a ghigliottina affiancate (il telaio di sopra fermo, quello di sotto che
    scorre), bianche, col fermo d'ottone; dentro, le cornici piatte, il davanzale di legno con la fascia sotto e le due
    tende avvolgibili color crema, tirate giu' a meta' e a un quarto; dietro, la vista del paese (solo per la camera)"""
    x0, x1, y0, y1, fondo = FIN["x0"], FIN["x1"], FIN["y0"], FIN["y1"], FIN["fondo"]
    zf = Z0 - fondo + 0.07  # il telaio, verso l'esterno
    cx, w, h = (x0 + x1) / 2, x1 - x0, y1 - y0
    s, m = 0.06, 0.08  # il telaio fisso e il montante in mezzo
    for nome, c, d in [("telaio_su", (cx, y1 - s / 2, zf), (w, s, 0.1)), ("telaio_giu", (cx, y0 + s / 2, zf), (w, s, 0.1)),
                       ("telaio_sx", (x0 + s / 2, (y0 + y1) / 2, zf), (s, h, 0.1)),
                       ("telaio_dx", (x1 - s / 2, (y0 + y1) / 2, zf), (s, h, 0.1)),
                       ("telaio_mezzo", (cx, (y0 + y1) / 2, zf), (m, h, 0.1))]:
        scatola(f"finestra_{nome}", c, d, MAT["smalto"], metri=0.5, smusso=0.006)
    ym = (y0 + y1) / 2 + 0.03  # dove si incontrano i due telai
    lw = (w - 2 * s - m) / 2  # larga ogni finestra
    for lato in (-1, 1):
        ax = cx + lato * (m / 2 + lw / 2)
        # il telaio di sopra (fuori) e quello di sotto (dentro): montanti, traverse e il vetro
        for anta, ya, yb, za, giu in [("sopra", ym - 0.02, y1 - s, zf - 0.024, 0.045),
                                      ("sotto", y0 + s, ym + 0.02, zf + 0.024, 0.075)]:
            hh = yb - ya
            pezzi = [(f"{anta}_sx", (ax - lw / 2 + 0.025, (ya + yb) / 2, za), (0.05, hh, 0.04)),
                     (f"{anta}_dx", (ax + lw / 2 - 0.025, (ya + yb) / 2, za), (0.05, hh, 0.04)),
                     (f"{anta}_su", (ax, yb - 0.025, za), (lw, 0.05, 0.04)),
                     (f"{anta}_giu", (ax, ya + giu / 2, za), (lw, giu, 0.04))]
            for nome, c, d in pezzi:
                scatola(f"anta{lato}_{nome}", c, d, MAT["smalto"], metri=0.5, smusso=0.004)
            scatola(f"vetro{lato}_{anta}", (ax, (ya + yb) / 2, za), (lw - 0.08, hh - 0.08, 0.004), MAT["vetro"])
        # il fermo d'ottone sulla traversa di mezzo e le due maniglie per alzare il telaio di sotto
        scatola(f"fermo{lato}", (ax, ym + 0.028, zf + 0.012), (0.06, 0.012, 0.035), MAT["ottone"], smusso=0.004)
        for dx in (-0.16, 0.16):
            scatola(f"alzata{lato}_{dx:.2f}", (ax + dx, y0 + s + 0.05, zf + 0.05), (0.05, 0.014, 0.018), MAT["ottone"],
                    smusso=0.005)
        # la tenda avvolgibile: il rullo in alto, la tela giu' fino a un punto e la stecca in fondo con l'anello
        giu = y1 - h * (0.48 if lato < 0 else 0.26)
        tx = ax
        scatola(f"tenda_rullo{lato}", (tx, y1 - 0.03, Z0 - 0.045), (lw + 0.04, 0.04, 0.04), MAT["smalto"], smusso=0.015)
        scatola(f"tenda{lato}", (tx, (y1 - 0.04 + giu) / 2, Z0 - 0.06), (lw + 0.02, y1 - 0.04 - giu, 0.003), MAT["tenda"],
                metri=0.4)
        scatola(f"tenda_stecca{lato}", (tx, giu - 0.008, Z0 - 0.06), (lw + 0.03, 0.02, 0.012), MAT["smalto"], smusso=0.004)
        scatola(f"tenda_anello{lato}", (tx, giu - 0.04, Z0 - 0.058), (0.028, 0.036, 0.006), MAT["ottone"], smusso=0.01)
    # le cornici piatte attorno al buco, verso la stanza; il davanzale che sporge e la fascia sotto
    for nome, c, d in [("cornice_sx", (x0 - 0.045, (y0 + y1) / 2, Z0 + 0.012), (0.09, h, 0.024)),
                       ("cornice_dx", (x1 + 0.045, (y0 + y1) / 2, Z0 + 0.012), (0.09, h, 0.024)),
                       ("cornice_su", (cx, y1 + 0.055, Z0 + 0.014), (w + 0.18, 0.11, 0.028)),
                       ("cornice_cappello", (cx, y1 + 0.118, Z0 + 0.022), (w + 0.22, 0.018, 0.044)),
                       ("davanzale", (cx, y0 - 0.015, Z0 - fondo / 2 + 0.06), (w + 0.24, 0.03, fondo + 0.04)),
                       ("fascia", (cx, y0 - 0.068, Z0 + 0.012), (w + 0.18, 0.076, 0.024))]:
        scatola(f"finestra_{nome}", c, d, MAT["smalto"], metri=0.5, smusso=0.005)
    # la vista, lontana: solo per la camera, non fa luce e non fa ombra
    v = scatola("vista", (cx - 0.6, 2.4, Z0 - 9.0), (19.0, 10.7, 0.01), MAT["fuori"])
    # la foto intera sul piano, da un angolo all'altro (non ripetuta come le texture dei muri)
    me = v.data
    xs = [p.co.x for p in me.vertices]
    zs = [p.co.z for p in me.vertices]
    uv = me.uv_layers[0].data
    for poly in me.polygons:
        for li in poly.loop_indices:
            p = me.vertices[me.loops[li].vertex_index].co
            uv[li].uv = ((p.x - min(xs)) / (max(xs) - min(xs)), (p.z - min(zs)) / (max(zs) - min(zs)))
    v.visible_diffuse = v.visible_glossy = v.visible_shadow = False
    v.visible_volume_scatter = False
    return v


def cilindro(nome, c, r, lungo, mat, coll="stanza"):
    """un cilindro col suo asse lungo la z della stanza (verso la porta), centro in c (coordinate di Three.js)"""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=r, radius2=r, depth=lungo)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, "X"))
    for f in bm.faces:
        f.smooth = len(f.verts) == 4
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    ob = oggetto(nome, me, coll)
    ob.location = B(*c)
    me.materials.append(mat)
    bpy.context.view_layer.update()
    uv_mondo(ob, 0.1)
    return ob


def sfera(nome, c, r, mat, schiaccia=1.0, coll="stanza"):
    """una sfera (schiacciata lungo la z della stanza), centro in c"""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=14, radius=r)
    for v in bm.verts:
        v.co.y *= schiaccia
    for f in bm.faces:
        f.smooth = True
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    ob = oggetto(nome, me, coll)
    ob.location = B(*c)
    me.materials.append(mat)
    bpy.context.view_layer.update()
    uv_mondo(ob, 0.1)
    return ob


def porta_pannelli(nome, larga, alta, spessa, mat, maniglia_lato=1, chiavistello=False):
    """un'anta di porta americana a sei pannelli in rilievo (due piccoli in alto, due alti in mezzo, due in basso),
    centrata sull'origine (nelle coordinate dell'anta: x largo, y alto, z spessore), col pomolo tondo d'ottone sui due
    lati e, se c'e', il chiavistello sopra"""
    pezzi = [scatola(f"{nome}_anta", (0, alta / 2, 0), (larga, alta, spessa), mat, metri=0.6, smusso=0.004)]
    st = 0.11
    pw = (larga - 3 * st) / 2
    for (y_a, y_b) in [(1.70, alta - 0.12), (0.97, 1.60), (0.24, 0.80)]:
        for lx in (-1, 1):
            for lato in (-1, 1):
                pezzi.append(scatola(f"{nome}_pannello{lx}{lato}_{y_a:.2f}", (lx * (st / 2 + pw / 2), (y_a + y_b) / 2,
                                                                                 lato * (spessa / 2 + 0.006)),
                                     (pw, y_b - y_a, 0.012), mat, metri=0.6, smusso=0.012))
    px = maniglia_lato * (larga / 2 - 0.065)
    for lato in (-1, 1):
        z = lato * spessa / 2
        pezzi.append(cilindro(f"{nome}_rosetta{lato}", (px, 0.9, z + lato * 0.004), 0.027, 0.008, MAT["ottone"]))
        pezzi.append(cilindro(f"{nome}_collo{lato}", (px, 0.9, z + lato * 0.022), 0.009, 0.03, MAT["ottone"]))
        pezzi.append(sfera(f"{nome}_pomolo{lato}", (px, 0.9, z + lato * 0.048), 0.028, MAT["ottone"], schiaccia=0.75))
        if chiavistello:
            pezzi.append(cilindro(f"{nome}_chiavistello{lato}", (px, 1.12, z + lato * 0.006), 0.024, 0.012,
                                  MAT["ottone"]))
            pezzi.append(scatola(f"{nome}_levetta{lato}", (px, 1.12, z + lato * 0.016), (0.01, 0.036, 0.012),
                                 MAT["ottone"], smusso=0.004))
    return pezzi


def unisci(nome, pezzi):
    """unisce piu' oggetti in uno (le facce tengono i loro materiali), con l'origine nell'origine del mondo: chi lo
    sposta o lo gira dopo (le porte, il videoregistratore, la radiosveglia) parte dalle misure con cui e' fatto (prima
    l'origine restava al centro del primo pezzo, e le porte finivano a meta' nel pavimento)"""
    bpy.ops.object.select_all(action="DESELECT")
    for p in pezzi:
        p.select_set(True)
    bpy.context.view_layer.objects.active = pezzi[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = nome
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return ob


def porte():
    p0, p1 = PORTA["x"] - PORTA["largo"] / 2, PORTA["x"] + PORTA["largo"] / 2
    # lo stipite e la mostra attorno alla porta d'ingresso
    for nome, c, d in [("mostra_su", (PORTA["x"], PORTA["alto"] + 0.05, Z1 - 0.015), (PORTA["largo"] + 0.2, 0.1, 0.03)),
                       ("mostra_sx", (p0 - 0.045, PORTA["alto"] / 2, Z1 - 0.013), (0.09, PORTA["alto"], 0.026)),
                       ("mostra_dx", (p1 + 0.045, PORTA["alto"] / 2, Z1 - 0.013), (0.09, PORTA["alto"], 0.026))]:
        scatola(f"porta_{nome}", c, d, MAT["smalto"], metri=0.5, smusso=0.005)
    pezzi = porta_pannelli("porta", PORTA["largo"] - 0.01, PORTA["alto"] - 0.015, 0.045, MAT["smalto"], chiavistello=True)
    anta = unisci("porta", pezzi)
    anta.location = B(PORTA["x"], 0.008, Z1 + 0.04)
    anta.rotation_euler = (0, 0, math.pi)
    # la luce delle scale che passa sotto la porta (la sera): una striscia che fa luce, fuori
    lama = scatola("scale_luce", (PORTA["x"], 0.004, Z1 + 0.2), (PORTA["largo"] - 0.1, 0.008, 0.3),
                   materiale("luce_scale", colore=(0, 0, 0), luce=(255, 176, 102), forza_luce=0.0))
    # la porta della stanzetta, sul muro a est: gira sul cardine a sud
    o0, o1 = OSPITE["z"] - OSPITE["largo"] / 2, OSPITE["z"] + OSPITE["largo"] / 2
    for nome, c, d in [("mostra_su", (X1 - 0.015, OSPITE["alto"] + 0.05, OSPITE["z"]), (0.03, 0.1, OSPITE["largo"] + 0.2)),
                       ("mostra_n", (X1 - 0.013, OSPITE["alto"] / 2, o0 - 0.045), (0.026, OSPITE["alto"], 0.09)),
                       ("mostra_s", (X1 - 0.013, OSPITE["alto"] / 2, o1 + 0.045), (0.026, OSPITE["alto"], 0.09))]:
        scatola(f"ospite_{nome}", c, d, MAT["smalto"], metri=0.5, smusso=0.005)
    pezzi = porta_pannelli("porta_ospite", OSPITE["largo"] - 0.01, OSPITE["alto"] - 0.01, 0.04, MAT["smalto"],
                           maniglia_lato=-1)
    anta = unisci("porta_ospite", pezzi)
    anta.location = B(X1 + 0.03, 0.005, OSPITE["z"])
    anta.rotation_euler = (0, 0, math.pi / 2)
    return lama


def stanzetta():
    """la stanzetta dell'ospite dietro il muro a est: piccola, spoglia, buia; una finestrella con le persiane chiuse"""
    sx0 = X1 + OSPITE["muro"]
    sx1, sz0, sz1 = STANZETTA["x1"], STANZETTA["z0"], STANZETTA["z1"]
    o0, o1 = OSPITE["z"] - OSPITE["largo"] / 2, OSPITE["z"] + OSPITE["largo"] / 2
    mats = [MAT["intonaco"], MAT["intonaco"], MAT["intonaco"]]
    m2 = (2.0, 2.0, 2.0)
    parete("stanzetta_ovest", "ovest", [(o0, o1, 0.0, OSPITE["alto"])], mats, -OSPITE["muro"], x0=sx0, x1=sx1, z0=sz0,
           z1=sz1, zoccolo=None, metri=m2)
    parete("stanzetta_est", "est", [(1.2, 1.8, 1.4, 2.1)], mats, 0.25, x0=sx0, x1=sx1, z0=sz0, z1=sz1, zoccolo=None,
           metri=m2)
    parete("stanzetta_nord", "nord", [], mats, 0.12, x0=sx0, x1=sx1, z0=sz0, z1=sz1, zoccolo=None, metri=m2)
    parete("stanzetta_sud", "sud", [], mats, 0.2, x0=sx0, x1=sx1, z0=sz0, z1=sz1, zoccolo=None, metri=m2)
    piano("stanzetta_pavimento", [(sx0, 0, sz1), (sx1, 0, sz1), (sx1, 0, sz0), (sx0, 0, sz0)], MAT["pavimento"], metri=2.03)
    piano("stanzetta_soffitto", [(sx0, ALTA, sz0), (sx1, ALTA, sz0), (sx1, ALTA, sz1), (sx0, ALTA, sz1)], MAT["soffitto"],
          metri=2.0)
    # le persiane chiuse della finestrella: legno, con le fessure da cui passa un filo di luce
    for i in range(12):
        scatola(f"persiana{i}", (sx1 + 0.2, 1.43 + i * 0.056, 1.5), (0.02, 0.045, 0.6), MAT["legno_scuro"])


# ---------------------------------------------------------------- mobili

def importa(nome, centro, rot=0.0, dim=None, scala=None, solo=None, togli=None, appoggia=0.0, coll="mobili",
            percorso=None, inclina=0.0):
    """un modello glTF al suo posto: girato di "rot" (come rotY in stanza.js), messo alle misure "dim" (x, y, z della
    stanza) o in "scala", appoggiato a quota "appoggia" con il centro in "centro" (x, z). "solo" tiene solo gli oggetti
    col nome che contiene quella parola (alcuni file hanno piu' varianti); "inclina" lo corica prima di girarlo (come
    rotZ in stanza.js: attorno alla z della stanza, che in Blender e' -y)"""
    prima = set(bpy.data.objects)
    f = percorso or next(os.path.join(SORG, "modelli", nome, x) for x in os.listdir(os.path.join(SORG, "modelli", nome))
                         if x.endswith(".gltf"))
    bpy.ops.import_scene.gltf(filepath=f)
    nuovi = [o for o in bpy.data.objects if o not in prima]
    vuoti = [o.name for o in nuovi if o.type != "MESH"]
    mesh = [o for o in nuovi if o.type == "MESH"]
    if solo:
        via = [o for o in mesh if not any(s in o.name for s in solo)]
        for o in via:
            bpy.data.objects.remove(o)
        mesh = [o for o in mesh if o not in via]
    if togli:
        via = [o for o in mesh if any(s in o.name for s in togli)]
        for o in via:
            bpy.data.objects.remove(o)
        mesh = [o for o in mesh if o not in via]
    # tutto applicato e unito in un oggetto solo
    for o in [bpy.data.objects[n] for n in vuoti if n in bpy.data.objects]:
        for figlio in o.children:
            m = figlio.matrix_world.copy()
            figlio.parent = None
            figlio.matrix_world = m
        bpy.data.objects.remove(o)
    for o in mesh:
        for c in o.users_collection:
            c.objects.unlink(o)
        collezione(coll).objects.link(o)
    bpy.ops.object.select_all(action="DESELECT")
    for o in mesh:
        o.select_set(True)
    bpy.context.view_layer.objects.active = mesh[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(mesh) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = nome
    # coricato e girato
    if inclina:
        ob.data.transform(Matrix.Rotation(-inclina, 4, "Y"))
    ob.data.transform(Matrix.Rotation(rot, 4, "Z"))
    ob.data.update()
    # misure
    mn, mx = riquadro(ob)
    d = mx - mn
    if dim:
        # dim nelle coordinate della stanza: x, y (alto), z -> Blender x, z, y
        sx, sy, sz = dim[0] / d.x, dim[2] / d.y, dim[1] / d.z
        ob.data.transform(Matrix.Diagonal((sx, sy, sz, 1)))
    elif scala:
        ob.data.transform(Matrix.Scale(scala, 4))
    ob.data.update()
    mn, mx = riquadro(ob)
    c = (mn + mx) / 2
    dove = B(centro[0], appoggia, centro[1])
    ob.data.transform(Matrix.Translation(Vector((dove.x - c.x, dove.y - c.y, dove.z - mn.z))))
    ob.data.update()
    return ob


def riquadro(ob):
    vs = [ob.matrix_world @ v.co for v in ob.data.vertices]
    mn = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    mx = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    return mn, mx


def cima(ob):
    """la quota (y della stanza) del punto piu' alto"""
    return riquadro(ob)[1].z


def armadio():
    """l'armadio di noce a due ante contro il muro a ovest, col cappello sopra e lo zoccolo"""
    x, z = -2.19, -1.75
    w, h, p = 1.2, 2.05, 0.6  # lungo z, alto, profondo (lungo x)
    pezzi = [scatola("armadio_corpo", (x, 0.08 + (h - 0.14) / 2, z), (p, h - 0.14, w), MAT["noce"], metri=0.6, smusso=0.006),
             scatola("armadio_zoccolo", (x + 0.01, 0.04, z), (p - 0.02, 0.08, w - 0.02), MAT["noce"], metri=0.6),
             scatola("armadio_cappello", (x + 0.02, h - 0.03, z), (p + 0.06, 0.06, w + 0.08), MAT["noce"], metri=0.6,
                     smusso=0.012)]
    fx = x + p / 2 + 0.006
    for lato in (-1, 1):
        zc = z + lato * w / 4
        for (yc, ph) in [(0.12 + (h - 0.3) * 0.75, (h - 0.3) * 0.42), (0.12 + (h - 0.3) * 0.27, (h - 0.3) * 0.4)]:
            pezzi.append(scatola(f"armadio_pannello{lato}_{yc:.2f}", (fx, yc, zc), (0.014, ph, w / 2 - 0.16), MAT["noce"],
                                 metri=0.6, smusso=0.01))
        pezzi.append(scatola(f"armadio_maniglia{lato}", (fx + 0.02, 1.05, z + lato * 0.06), (0.018, 0.13, 0.018),
                             MAT["ottone"], smusso=0.007))
        pezzi.append(scatola(f"armadio_bocchetta{lato}", (fx + 0.004, 1.2, z + lato * 0.06), (0.006, 0.05, 0.03),
                             MAT["ottone"], smusso=0.003))
    pezzi.append(scatola("armadio_fessura", (fx, 0.12 + (h - 0.3) / 2, z), (0.004, h - 0.3, 0.006), MAT["plastica_nera"]))
    return unisci("armadio", pezzi)


def termosifone():
    """il termosifone di ghisa smaltata sotto la finestra, a destra della scrivania: dieci elementi a colonne"""
    x, z = 0.62, -2.93
    pezzi = []
    n, passo = 11, 0.062
    for i in range(n):
        xc = x + (i - (n - 1) / 2) * passo
        for k, dz in enumerate((-0.03, 0.03)):
            pezzi.append(scatola(f"term_col{i}_{k}", (xc, 0.4, z + 0.075 + dz), (0.045, 0.6, 0.032), MAT["ghisa"],
                                 smusso=0.012))
        for yc in (0.12, 0.68):
            pezzi.append(scatola(f"term_nodo{i}_{yc}", (xc, yc, z + 0.075), (0.05, 0.06, 0.1), MAT["ghisa"], smusso=0.02))
    pezzi.append(scatola("term_valvola", (x + n * passo / 2 + 0.02, 0.62, z + 0.075), (0.05, 0.05, 0.05), MAT["ottone"],
                         smusso=0.01))
    pezzi.append(scatola("term_tubo", (x + n * passo / 2 + 0.02, 0.32, z + 0.075), (0.025, 0.6, 0.025), MAT["ghisa"],
                         smusso=0.01))
    return unisci("termosifone", pezzi)


def lavandino():
    """il lavandino di ceramica appeso al muro a ovest, col rubinetto, la mensola, lo specchio e l'asciugamano"""
    x, z = X0, 1.75
    pezzi = [scatola("lav_vasca", (x + 0.25, 0.8, z), (0.46, 0.17, 0.56), MAT["ceramica"], smusso=0.04)]
    pezzi.append(scatola("lav_fondo", (x + 0.27, 0.86, z), (0.34, 0.06, 0.44),
                         materiale("ceramica_dentro", colore=(206, 204, 196), ruvido=0.1)))
    pezzi.append(scatola("lav_colonna", (x + 0.2, 0.37, z), (0.2, 0.74, 0.22), MAT["ceramica"], smusso=0.05))
    pezzi.append(scatola("lav_rubinetto", (x + 0.1, 0.98, z), (0.06, 0.12, 0.06), MAT["cromo"], smusso=0.02))
    pezzi.append(scatola("lav_becco", (x + 0.17, 1.02, z), (0.16, 0.025, 0.025), MAT["cromo"], smusso=0.01))
    for dz in (-0.07, 0.07):
        pezzi.append(scatola(f"lav_manopola{dz}", (x + 0.1, 1.04, z + dz), (0.04, 0.035, 0.04), MAT["cromo"], smusso=0.012))
    pezzi.append(scatola("lav_mensola", (x + 0.07, 1.25, z), (0.13, 0.015, 0.5), MAT["ceramica"], smusso=0.005))
    # l'armadietto dei medicinali con lo sportello a specchio, smaltato bianco
    pezzi.append(scatola("specchio_cornice", (x + 0.055, 1.64, z), (0.11, 0.6, 0.44), MAT["smalto"], smusso=0.008))
    pezzi.append(scatola("specchio_vetro", (x + 0.112, 1.64, z), (0.004, 0.52, 0.36),
                         materiale("specchio", colore=(200, 204, 204), ruvido=0.06, metallo=1.0)))
    pezzi.append(scatola("specchio_pomello", (x + 0.118, 1.64, z + 0.2), (0.012, 0.04, 0.012), MAT["cromo"], smusso=0.004))
    pezzi.append(scatola("asciugamano", (x + 0.04, 0.92, z + 0.36), (0.03, 0.42, 0.26), MAT["spugna"], smusso=0.01))
    pezzi.append(scatola("portasciugamano", (x + 0.035, 1.14, z + 0.36), (0.04, 0.02, 0.32), MAT["cromo"], smusso=0.008))
    return unisci("lavandino", pezzi)


def griglia(nome, x0, x1, z0, z1, y, nx, nz, mat, metri, coll="stanza"):
    """un telo orizzontale a quota y (coordinate di Three.js), diviso in nx x nz quadri, con la texture ogni tot metri"""
    bm = bmesh.new()
    vs = [[bm.verts.new(B(x0 + (x1 - x0) * i / nx, y, z0 + (z1 - z0) * j / nz)) for i in range(nx + 1)] for j in range(nz + 1)]
    for j in range(nz):
        for i in range(nx):
            f = bm.faces.new((vs[j][i], vs[j][i + 1], vs[j + 1][i + 1], vs[j + 1][i]))
            f.smooth = True
    bm.normal_update()
    for f in bm.faces:
        if f.normal.z < 0:
            f.normal_flip()
    uv = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        for l in f.loops:
            l[uv].uv = (l.vert.co.x / metri, l.vert.co.y / metri)
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    ob = oggetto(nome, me, coll)
    me.materials.append(mat)
    return ob


def stoffa(telo, ostacoli, fotogrammi=60, massa=0.3, rigidezza=12.0, piega=0.4):
    """fa cadere il telo sugli ostacoli con la simulazione della stoffa di Blender, poi tiene la forma finale"""
    sc = bpy.context.scene
    for o in ostacoli:
        o.modifiers.new("collisione", "COLLISION")
        o.collision.thickness_outer = 0.006
        o.collision.cloth_friction = 8.0
    m = telo.modifiers.new("stoffa", "CLOTH")
    st = m.settings
    st.quality = 8
    st.mass = massa
    st.tension_stiffness = st.compression_stiffness = rigidezza
    st.shear_stiffness = rigidezza * 0.5
    st.bending_stiffness = piega
    st.air_damping = 2.0
    m.collision_settings.distance_min = 0.006
    m.collision_settings.use_self_collision = False
    m.point_cache.frame_start = 1
    m.point_cache.frame_end = fotogrammi
    sc.frame_start, sc.frame_end = 1, fotogrammi
    for f in range(1, fotogrammi + 1):
        sc.frame_set(f)
    dg = bpy.context.evaluated_depsgraph_get()
    forma = bpy.data.meshes.new_from_object(telo.evaluated_get(dg))
    telo.modifiers.clear()
    vecchia = telo.data
    telo.data = forma
    bpy.data.meshes.remove(vecchia)
    for o in ostacoli:
        o.modifiers.clear()
    sc.frame_set(1)
    return telo


def spessore(ob, quanto):
    """da' spessore a un telo (la coperta, il lenzuolo)"""
    m = ob.modifiers.new("spessore", "SOLIDIFY")
    m.thickness = quanto
    m.offset = 1.0
    dg = bpy.context.evaluated_depsgraph_get()
    forma = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    ob.modifiers.clear()
    vecchia = ob.data
    ob.data = forma
    bpy.data.meshes.remove(vecchia)


def letto():
    """il letto di ferro di Poly Haven, rifatto: il materasso sulla rete, dentro il telaio tra testiera e pediera; il
    cuscino; la coperta di lana rossa che ci cade sopra (simulazione della stoffa), fermata dalla pediera e dai
    longheroni, col risvolto del lenzuolo bianco in testa. Il telaio, misurato: largo 1, lungo 2,05 (testiera a z
    -2,98, pediera a z -0,94), la rete a 0,43"""
    ob = importa("old_bed_frame", (1.98, -1.96), rot=0.0, dim=(1.0, 1.05, 2.05))
    rete, cx = 0.43, 1.98
    z0, z1 = -2.89, -0.97  # tra testiera e pediera
    mat = scatola("materasso", (cx, rete + 0.08, (z0 + z1) / 2), (0.88, 0.16, z1 - z0), MAT["materasso"], metri=0.5,
                  smusso=0.05)
    su = rete + 0.16
    cus = scatola("cuscino", (cx, su + 0.06, z0 + 0.22), (0.62, 0.12, 0.36), MAT["lenzuolo"], metri=0.4, smusso=0.055)
    # gli ostacoli per la stoffa: materasso, cuscino, pediera, testiera e i longheroni ai lati (scatole semplici,
    # poi si buttano)
    finti = [scatola("finta_pediera", (cx, 0.4, -0.945), (1.0, 0.8, 0.03), MAT["tubo"]),
             scatola("finta_testiera", (cx, 0.55, -2.955), (1.0, 1.1, 0.05), MAT["tubo"])]
    for lato in (-1, 1):
        finti.append(scatola(f"finto_longherone{lato}", (cx + lato * 0.485, rete, (z0 + z1) / 2), (0.03, 0.04, z1 - z0 + 0.06),
                             MAT["tubo"]))
    # il lenzuolo, sotto la coperta, che si vede solo nel risvolto: un telo piu' corto, sulla testa del letto
    lenz = griglia("lenzuolo", cx - 0.6, cx + 0.6, z0 + 0.36, z0 + 0.62, su + 0.06, 40, 10, MAT["lenzuolo"], 0.4)
    stoffa(lenz, [mat, cus] + finti, fotogrammi=40, massa=0.15, rigidezza=8, piega=0.1)
    cop = griglia("coperta", cx - 0.62, cx + 0.62, z0 + 0.5, z1 - 0.01, su + 0.1, 46, 58, MAT["coperta"], 0.4)
    stoffa(cop, [mat, cus, lenz] + finti, fotogrammi=60)
    spessore(cop, 0.008)
    spessore(lenz, 0.004)
    for f in finti:
        bpy.data.objects.remove(f)
    return ob


def videoregistratore(cx, cz, rot, su):
    """il videoregistratore anni '90 sulla scrivania: grigio scuro, lo sportello della cassetta, i tasti e il display"""
    w, h, p = 0.36, 0.085, 0.27
    pezzi = [scatola("vcr_corpo", (0, h / 2, 0), (w, h, p), MAT["plastica_nera"], smusso=0.006),
             scatola("vcr_sportello", (-0.04, h * 0.55, p / 2 + 0.002), (0.19, 0.03, 0.004), MAT["plastica_grigia"],
                     smusso=0.002),
             scatola("vcr_display", (0.11, h * 0.55, p / 2 + 0.002), (0.09, 0.022, 0.004),
                     materiale("display_spento", colore=(16, 22, 18), ruvido=0.2), smusso=0.001)]
    for i in range(5):
        pezzi.append(scatola(f"vcr_tasto{i}", (-0.12 + i * 0.035, h * 0.2, p / 2 + 0.003), (0.026, 0.012, 0.006),
                             MAT["plastica_grigia"], smusso=0.002))
    ob = unisci("videoregistratore", pezzi)
    ob.data.transform(Matrix.Rotation(rot, 4, "Z"))
    ob.data.transform(Matrix.Translation(B(cx, su, cz)))
    ob.data.update()
    return ob


def radiosveglia(cx, cz, rot, su):
    pezzi = [scatola("sveglia_corpo", (0, 0.04, 0), (0.2, 0.08, 0.1), MAT["plastica_nera"], smusso=0.012),
             scatola("sveglia_display", (0.03, 0.045, 0.051), (0.1, 0.035, 0.003),
                     materiale("sveglia_display", colore=(30, 6, 6), ruvido=0.2)),
             scatola("sveglia_griglia", (-0.065, 0.04, 0.051), (0.05, 0.05, 0.002), MAT["plastica_grigia"])]
    ob = unisci("radiosveglia", pezzi)
    ob.data.transform(Matrix.Rotation(rot, 4, "Z"))
    ob.data.transform(Matrix.Translation(B(cx, su, cz)))
    ob.data.update()
    return ob


def brandina():
    """la brandina militare della stanzetta: tubi d'acciaio verniciati, la tela verde, una coperta grigia"""
    cx, cz = STANZETTA["x1"] - 0.42, 1.75
    L, W, h = 1.9, 0.7, 0.42
    pezzi = []
    for lato in (-1, 1):
        pezzi.append(scatola(f"br_tubo{lato}", (cx, h, cz + lato * W / 2), (L, 0.03, 0.03), MAT["tubo"], smusso=0.012))
    for i, dx in enumerate((-L / 2 + 0.1, 0, L / 2 - 0.1)):
        for lato in (-1, 1):
            pezzi.append(scatola(f"br_gamba{i}{lato}", (cx + dx, h / 2, cz + lato * (W / 2 - 0.05)), (0.025, h, 0.025),
                                 MAT["tubo"], smusso=0.01))
    pezzi.append(scatola("br_tela", (cx, h - 0.02, cz), (L - 0.05, 0.012, W - 0.02), MAT["tela"], smusso=0.004))
    pezzi.append(scatola("br_coperta", (cx + 0.2, h + 0.02, cz), (1.3, 0.05, W + 0.04),
                         materiale("coperta_grigia", diff=ph_tex("poly_wool_herringbone", "diff"),
                                   nor=ph_tex("poly_wool_herringbone", "nor_gl"), ruvido=0.95), metri=0.4, smusso=0.02))
    pezzi.append(scatola("br_cuscino", (cx - L / 2 + 0.25, h + 0.05, cz), (0.32, 0.1, 0.5), MAT["lenzuolo"], smusso=0.04))
    return unisci("brandina", pezzi)


def mobili():
    # la scrivania grigia d'ufficio, alle misure di prima (1,6 x 0,77 x 0,75)
    scr = importa("metal_office_desk", (SCRIVANIA["x"], SCRIVANIA["z"]), rot=0.0, dim=(1.6, 0.77, 0.75))
    su = cima(scr)
    importa("painted_wooden_chair_02", (-0.7, -1.95), rot=math.pi, dim=None)
    letto()
    importa("painted_wooden_nightstand", (1.2, -2.74), rot=0.0)
    armadio()
    importa("painted_wooden_cabinet", (-2.2, 0.25), rot=-math.pi / 2)
    lavandino()
    tav = importa("wooden_table_02", (0.05, 1.65), rot=0.0, dim=(1.05, 0.76, 0.7))
    importa("painted_wooden_chair_01", (0.05, 0.98), rot=0.15)
    importa("painted_wooden_chair_01", (0.12, 2.32), rot=math.pi - 0.2)
    termosifone()
    brandina()
    # sulla scrivania
    importa("desk_lamp_arm_01", (SCRIVANIA["x"] - 0.64, SCRIVANIA["z"] - 0.24), rot=2.75 + math.pi / 2, appoggia=su)
    importa("television_02", (SCRIVANIA["x"] + 0.5, SCRIVANIA["z"] - 0.21), rot=-0.15, appoggia=su)
    videoregistratore(SCRIVANIA["x"] + 0.5, SCRIVANIA["z"] + 0.08, -0.06, su)
    # sul comodino e intorno
    com = bpy.data.objects["painted_wooden_nightstand"]
    radiosveglia(1.12, -2.78, 0.35, cima(com))
    importa("vintage_flashlight", (1.32, -2.7), rot=1.2, appoggia=cima(com))
    cestino = importa("metal_trash_can", (0.28, -2.6), solo=["metal_trash_can"], togli=["rust"])
    misura(cestino, alto=0.42, centro=(0.28, -2.6))
    # sulla credenza: il bollitore, la brocca, la cassetta della ditta e la vecchia maschera antigas
    cr = bpy.data.objects["painted_wooden_cabinet"]
    sc = cima(cr)
    importa("vintage_electric_kettle", (-2.27, -0.12), rot=-math.pi / 2 + 0.3, appoggia=sc)
    importa("jug_01", (-2.3, 0.15), rot=0.4, appoggia=sc)
    importa("medical_box", (-2.25, 0.55), rot=-math.pi / 2 - 0.1, appoggia=sc)
    # sopra l'armadio la valigia e uno scatolone
    arm = bpy.data.objects["armadio"]
    sa = cima(arm)
    importa("vintage_suitcase", (-2.15, -2.0), rot=math.pi / 2, solo=["vintage_suitcase_01"], appoggia=sa)
    importa("cardboard_box_01", (-2.2, -1.35), rot=0.2, appoggia=sa)
    # per terra: gli stivali di gomma vicino alla porta
    importa("rubber_boots", (-0.75, 2.78), rot=math.pi + 0.1)
    # il portalampada col filo e la lampadina nuda, al centro (appoggiato con la punta della catenella; la porcellana
    # va da ALTA - 0.51 a ALTA - 0.455, col foro della lampadina sotto). Il modello della lampadina sta in piedi (il
    # vetro in alto): appesa va capovolta, con l'attacco avvitato nel foro (28 ottobre: "la lampadina e' al
    # contrario"; prima pendeva sotto il portalampada, col filo che passava dentro e spuntava sotto)
    importa("pull_chain_light_socket", (0.0, 0.3), appoggia=ALTA - 0.62)
    importa("lightbulb_01", (0.0, 0.3), rot=0.0, inclina=math.pi, appoggia=ALTA - 0.59)
    scatola("filo", (0.0, ALTA - 0.23, 0.3), (0.008, 0.46, 0.008), MAT["plastica_nera"])
    scatola("rosone", (0.0, ALTA - 0.012, 0.3), (0.09, 0.024, 0.09), MAT["ceramica"], smusso=0.01)
    # l'orologio sopra la porta, la cornice col manifesto della ditta accanto
    importa("wall_clock", (PORTA["x"], Z1 - 0.03), rot=math.pi, appoggia=2.32)
    return su


def oggetti_meshy(su):
    """gli oggetti di Meshy della stanza di prima: sulla scrivania come in stanza.js, la borsa e il cappotto"""
    S3 = os.path.join(VECCHIA, "scrivania3d")
    # nome, file, (dx, dz) sulla scrivania, misura (lungo/largo/alto), giro, inclinazione; la maschera e' sdraiata
    # sul fianco destro davanti alla mappa, col becco verso destra e la lente verso chi siede
    for nome, f, sopra, lungo, rot, inclina in [
        ("fax", "fax.glb", (-0.46, -0.05), 0.32, 0.18, 0.0),
        ("cassette", "cassette.glb", (0.4, 0.3), 0.19, -0.2, 0.0),
        ("cartella", "cartella.glb", (-0.57, 0.22), 0.3, 0.1, 0.0),
        ("soldi", "soldi.glb", (-0.33, 0.22), 0.2, -0.3, 0.0),
        ("maschera", "maschera.glb", (-0.06, 0.24), 0.36, 1.35, 1.25),
        ("guanti", "guanti.glb", (0.2, 0.22), 0.24, 0.5, 0.0),
    ]:
        ob = importa(nome, (SCRIVANIA["x"] + sopra[0], SCRIVANIA["z"] + sopra[1]), rot=rot, appoggia=su,
                     percorso=os.path.join(S3, f), coll="meshy", inclina=inclina)
        misura(ob, lungo=lungo, centro=(SCRIVANIA["x"] + sopra[0], SCRIVANIA["z"] + sopra[1]), appoggia=su)
        normali_lisce(ob)
    mappa = scatola("mappa", (SCRIVANIA["x"], su + 0.0015, SCRIVANIA["z"] - 0.03), (0.5, 0.003, 0.28),
                    materiale("mappa", diff=os.path.join(RADICE, "gioco", "img", "stanza", "mappa.jpg"), ruvido=0.8),
                    coll="meshy")
    intera(mappa, "y")
    ob = importa("borsa", (-2.12, -2.72), rot=-0.9, percorso=os.path.join(VECCHIA, "borsa.glb"), coll="meshy")
    misura(ob, alto=0.3, centro=(-2.12, -2.72))
    normali_lisce(ob)
    # il cappotto col cappello, appeso all'appendiabiti sulla parete est: nel modello l'asse dei ganci e' girata di
    # una cinquantina di gradi, e nella stanza veniva di sbieco, staccata dal muro (28 ottobre: «l'appendiabiti e'
    # storto rispetto al muro»); si gira dritta lungo il muro e si appoggia
    ob = importa("cappotto", (2.3, 0.45), percorso=os.path.join(VECCHIA, "cappotto.glb"), coll="meshy")
    dritto_lungo_il_muro(ob)
    misura(ob, alto=1.42, centro=(2.3, 0.45), appoggia=0.45, fondo=0.6)
    al_muro(ob, X1)
    normali_lisce(ob)
    giornale(su)


def fascia_dei_ganci(V, quota=0.12):
    """i vertici in cima a un appendiabiti (l'asse e i ganci: il "quota" piu' alto) e la sua direzione nella pianta"""
    import numpy as np
    h0, h1 = V[:, 2].min(), V[:, 2].max()
    cima = V[V[:, 2] > h1 - quota * (h1 - h0)]
    c = cima[:, :2].mean(0)
    w, vec = np.linalg.eigh(np.cov((cima[:, :2] - c).T))
    return cima, c, vec[:, np.argmax(w)]


def dritto_lungo_il_muro(ob):
    """gira l'appendiabiti (con quello che ci pende) perche' l'asse dei ganci stia lungo il muro est, cioe' lungo la y
    di Blender, e il davanti, da dove pende il cappotto, guardi la stanza (verso -x)"""
    import numpy as np
    me = ob.data
    V = np.array([v.co[:] for v in me.vertices])
    _, c, d = fascia_dei_ganci(V)
    davanti = np.array([-d[1], d[0]])
    h0, h1 = V[:, 2].min(), V[:, 2].max()
    sotto = V[V[:, 2] < h0 + 0.5 * (h1 - h0)][:, :2].mean(0)
    if np.dot(sotto - c, davanti) < 0:
        davanti = -davanti
    me.transform(Matrix.Rotation(math.pi - math.atan2(davanti[1], davanti[0]), 4, "Z"))
    me.update()


def al_muro(ob, muro, gioco=0.003, listello=0.035):
    """spinge l'appendiabiti contro il muro est (x = muro in Three.js e in Blender): il dietro dell'asse a "gioco" dal
    muro; quello che pende e finirebbe nel muro (o nel listello della boiserie, che sporge) resta schiacciato davanti"""
    import numpy as np
    me = ob.data
    V = np.array([v.co[:] for v in me.vertices])
    cima, _, _ = fascia_dei_ganci(V)
    dx = (muro - gioco) - cima[:, 0].max()
    h0, h1 = V[:, 2].min(), V[:, 2].max()
    basso = h1 - 0.12 * (h1 - h0)
    for v in me.vertices:
        v.co.x += dx
        if v.co.z < basso:
            v.co.x = min(v.co.x, muro - listello)
    me.update()


def giornale(su):
    """il giornale piegato in due sulla scrivania, al posto di quello di Meshy (28 ottobre: «il giornale e' low quality
    come item poggiato sulla scrivania»): la meta' di sopra della prima pagina della Voce (texture/giornale.jpg, che il
    gioco ridisegna col giornale del giorno: gioco/js/primapagina.js), la testata verso la finestra e la piega verso chi
    siede; i fogli appena ondulati, piu' spessi alla piega; sui lati e dietro i bordi dei fogli"""
    # 28,6 x 20 centimetri (come la pagina della tela: 2048 x 0,7), dietro la mappa senza toccarla
    W, D, T, sotto = 0.286, 0.2, 0.0062, 0.0003
    PIEGA, BORDI = 0.7, (0.965, 1.0)
    cx, cz, giro = SCRIVANIA["x"] - 0.03, SCRIVANIA["z"] - 0.268, 0.04
    cs, sn = math.cos(giro), math.sin(giro)

    def P(x, y, z):
        # dal giornale (x lungo la riga, z verso chi siede) alla stanza, girato di "giro"
        return B(cx + x * cs + z * sn, y, cz - x * sn + z * cs)

    def alto(x, z):
        f = (z + D / 2) / D
        return su + sotto + (T - sotto) * (0.5 + 0.5 * f ** 0.6) \
            + 0.0007 * math.sin(x * 41 + 1.3) * math.sin(math.pi * f) + 0.0004 * math.sin(z * 57 + x * 23)

    nx, nz, na = 30, 21, 8
    vs, facce, uvs = [], [], []

    def quad(a, b, c_, d_, ua, ub, uc, ud):
        n = len(vs)
        vs.extend([a, b, c_, d_])
        facce.append([n, n + 1, n + 2, n + 3])
        uvs.extend([ua, ub, uc, ud])

    def uv(u, v):
        return (u, 1.0 - v)

    xs = [-W / 2 + W * i / nx for i in range(nx + 1)]
    zs = [-D / 2 + D * j / nz for j in range(nz + 1)]
    # il foglio di sopra (visto da sopra: in senso antiorario)
    for j in range(nz):
        for i in range(nx):
            x0, x1, z0, z1 = xs[i], xs[i + 1], zs[j], zs[j + 1]
            u0, u1 = i / nx, (i + 1) / nx
            v0, v1 = j / nz * PIEGA, (j + 1) / nz * PIEGA
            quad(P(x0, alto(x0, z1), z1), P(x1, alto(x1, z1), z1), P(x1, alto(x1, z0), z0), P(x0, alto(x0, z0), z0),
                 uv(u0, v1), uv(u1, v1), uv(u1, v0), uv(u0, v0))
    # la piega: mezzo giro dalla cima del foglio fino alla scrivania, verso chi siede
    r = (T - sotto) / 2
    yc = su + sotto + r

    def arco(x, k):
        a = math.pi / 2 - math.pi * k / na
        y = yc + r * math.sin(a)
        if k == 0:
            y = alto(x, D / 2)
        return P(x, y, D / 2 + r * math.cos(a))

    for k in range(na):
        for i in range(nx):
            x0, x1 = xs[i], xs[i + 1]
            u0, u1 = i / nx, (i + 1) / nx
            v0, v1 = PIEGA + 0.006 * k, PIEGA + 0.006 * (k + 1)
            quad(arco(x0, k), arco(x0, k + 1), arco(x1, k + 1), arco(x1, k), uv(u0, v0), uv(u0, v1), uv(u1, v1),
                 uv(u1, v0))
    # i bordi dei fogli: dietro (verso la finestra) e sui due lati, fino alla scrivania
    b0, b1 = BORDI
    for i in range(nx):
        x0, x1 = xs[i], xs[i + 1]
        z = -D / 2
        quad(P(x1, alto(x1, z), z), P(x1, su + sotto, z), P(x0, su + sotto, z), P(x0, alto(x0, z), z),
             uv(i / nx, b0), uv(i / nx, b1), uv((i + 1) / nx, b1), uv((i + 1) / nx, b0))
    for lato in (-1, 1):
        x = lato * W / 2
        for j in range(nz):
            za, zb = (zs[j + 1], zs[j]) if lato > 0 else (zs[j], zs[j + 1])
            quad(P(x, alto(x, za), za), P(x, su + sotto, za), P(x, su + sotto, zb), P(x, alto(x, zb), zb),
                 uv(j / nz, b0), uv(j / nz, b1), uv((j + 1) / nz, b1), uv((j + 1) / nz, b0))
        # la testa della piega, su quel lato: un ventaglio
        for k in range(na):
            a, b = arco(x, k), arco(x, k + 1)
            c_ = P(x, yc, D / 2)
            n = len(vs)
            vs.extend([c_, a, b] if lato > 0 else [c_, b, a])
            facce.append([n, n + 1, n + 2])
            uvs.extend([uv(0.5, b0 + 0.01)] * 3)
    me = bpy.data.meshes.new("giornale")
    me.from_pydata(vs, [], facce)
    me.uv_layers.new(name="UVMap")
    dati = me.uv_layers[0].data
    for poly in me.polygons:
        for li in poly.loop_indices:
            dati[li].uv = uvs[me.loops[li].vertex_index]
    # i vertici nello stesso punto (dove i pezzi si toccano) si uniscono; le coordinate della texture restano quelle di
    # ogni faccia
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    for poly in me.polygons:
        poly.use_smooth = True
    ob = oggetto("giornale", me, "meshy")
    me.materials.append(materiale("giornale", diff=os.path.join(TEX, "giornale.jpg"), ruvido=0.86))
    return ob


def normali_lisce(ob, giri=3):
    """le normali lisce per un modello di Meshy. Le sue facce sono accartocciate (sul fax meta' dei triangoli piega
    di 19 gradi o piu' dalla superficie, nel giornale uno su otto e' girato al contrario) e le normali del modello le
    seguono: tra due facce vicine 10 gradi in mediana, una su dieci oltre i 77. Cycles cuoce la luce con quelle
    normali, e il fax veniva a triangoli chiari e scuri.
    Qui si mediano: i vertici nello stesso punto uniti (il modello e' staccato a ogni cucitura delle texture), la
    normale di ogni vertice dalle facce attorno, quella delle facce dai loro vertici, per "giri" giri; poi diventano
    le normali personalizzate del modello (la forma e le coordinate delle texture restano quelle). E Cycles fa
    partire i raggi verso le luci un po' piu' in la' dalla superficie vera (geometry offset, contro il "terminatore"
    delle ombre: con le normali lisce, le pieghe girate dall'altra parte si farebbero ombra da sole)"""
    import numpy as np
    me = ob.data
    nv, nl, nf = len(me.vertices), len(me.loops), len(me.polygons)
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    tiene = np.arange(nv)
    for v, t in bmesh.ops.find_doubles(bm, verts=bm.verts, dist=1e-5)["targetmap"].items():
        tiene[v.index] = t.index
    bm.free()
    co = np.empty(nv * 3, np.float64)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    lv = np.empty(nl, np.int64)
    me.loops.foreach_get("vertex_index", lv)
    inizio, quanti = np.empty(nf, np.int64), np.empty(nf, np.int64)
    me.polygons.foreach_get("loop_start", inizio)
    me.polygons.foreach_get("loop_total", quanti)
    lf = np.repeat(np.arange(nf), quanti)
    dopo = np.arange(nl) + 1
    dopo[inizio + quanti - 1] = inizio
    lw = tiene[lv]

    def somma(dove, x, n):
        return np.stack([np.bincount(dove, x[:, k], minlength=n) for k in range(3)], axis=1)

    def unita(x):
        return x / np.maximum(np.linalg.norm(x, axis=1), 1e-20)[:, None]

    # le facce col loro verso, grandi quanto sono (Newell)
    f = somma(lf, np.cross(co[lv], co[lv[dopo]]), nf) / 2
    area = np.linalg.norm(f, axis=1)[:, None]
    for _ in range(giri):
        vn = unita(somma(lw, f[lf], nv))
        f = unita(somma(lf, vn[lw], nf)) * area
    vn = unita(somma(lw, f[lf], nv))
    me.shade_smooth()
    if "sharp_edge" in me.attributes:
        me.attributes.remove(me.attributes["sharp_edge"])
    me.normals_split_custom_set(vn[lw].tolist())
    ob.shadow_terminator_geometry_offset = 1.0


def misura(ob, lungo=None, alto=None, centro=None, appoggia=0.0, fondo=1.0):
    mn, mx = riquadro(ob)
    d = mx - mn
    s = alto / d.z if alto else lungo / max(d.x, d.y)
    ob.data.transform(Matrix.Diagonal((s * fondo, s, s, 1)) if fondo != 1.0 else Matrix.Scale(s, 4))
    ob.data.update()
    mn, mx = riquadro(ob)
    c = (mn + mx) / 2
    dove = B(centro[0], appoggia, centro[1])
    ob.data.transform(Matrix.Translation(Vector((dove.x - c.x, dove.y - c.y, dove.z - mn.z))))
    ob.data.update()


def intera(ob, piatto="z"):
    """la texture intera sulla faccia grande di un foglio: in piedi ("z": x e alto) o steso ("y": x e profondo, il
    lato in cima verso la finestra)"""
    me = ob.data
    uv = me.uv_layers[0].data
    vs = [me.vertices[l.vertex_index].co for l in me.loops]
    a = [v.x for v in vs]
    b = [v.z for v in vs] if piatto == "z" else [v.y for v in vs]
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            w = v.z if piatto == "z" else v.y
            uv[li].uv = ((v.x - min(a)) / (max(a) - min(a)), (w - min(b)) / (max(b) - min(b)))


def quadri():
    """il calendario della ditta sopra la credenza, il santino sopra il letto, l'interruttore e la presa"""
    def foglio(nome, img, c, w, h, rot):
        m = materiale(nome, diff=img, ruvido=0.7)
        ob = scatola(nome, c, (w, h, 0.004), m, rot_y=rot)
        intera(ob)
        return ob

    foglio("calendario", os.path.join(VECCHIA, "calendario.jpg"), (X0 + 0.01, 1.62, 0.25), 0.3, 0.39, math.pi / 2)
    foglio("santino", os.path.join(VECCHIA, "santino.jpg"), (X1 - 0.012, 1.7, -2.3), 0.24, 0.32, -math.pi / 2)
    # l'interruttore americano (la placca alta e stretta con la levetta, a 1,2 m) e la presa doppia, coi buchi
    xi = PORTA["x"] + PORTA["largo"] / 2 + 0.25
    unisci("interruttore", [scatola("interruttore_placca", (xi, 1.2, Z1 - 0.004), (0.07, 0.115, 0.008), MAT["ceramica"],
                                    smusso=0.003),
                            scatola("interruttore_leva", (xi, 1.206, Z1 - 0.013), (0.01, 0.024, 0.012), MAT["ceramica"],
                                    smusso=0.003)])
    buco = materiale("buco", colore=(20, 18, 16), ruvido=0.8)
    presa = [scatola("presa_placca", (0.25, 0.32, Z0 + 0.004), (0.07, 0.115, 0.008), MAT["ceramica"], smusso=0.003)]
    for dy in (-0.025, 0.025):
        presa.append(scatola(f"presa_faccia{dy}", (0.25, 0.32 + dy, Z0 + 0.0095), (0.036, 0.03, 0.004), MAT["ceramica"],
                             smusso=0.006))
        for dx, ddy, dim in [(-0.006, 0.004, (0.0024, 0.008)), (0.006, 0.004, (0.0024, 0.008)), (0.0, -0.007, (0.004, 0.004))]:
            presa.append(scatola(f"presa_buco{dy}{dx}{ddy}", (0.25 + dx, 0.32 + dy + ddy, Z0 + 0.0118), (*dim, 0.001), buco))
    unisci("presa", presa)
    scatola("tappeto", (1.0, 0.004, -1.9), (0.75, 0.008, 1.3), MAT["tappeto"], metri=0.6)


# ---------------------------------------------------------------- luci e viste

def luci(fase):
    sc = bpy.context.scene
    w = bpy.data.worlds.new(fase)
    sc.world = w
    w.use_nodes = True
    N, L = w.node_tree.nodes, w.node_tree.links
    bg = N["Background"]
    for o in [o for o in bpy.data.objects if o.type == "LIGHT"]:
        bpy.data.objects.remove(o)
    cx = (FIN["x0"] + FIN["x1"]) / 2
    if fase == "mattina":
        env = N.new("ShaderNodeTexEnvironment")
        env.image = bpy.data.images.load(next(os.path.join(SORG, "cielo", f) for f in os.listdir(os.path.join(SORG, "cielo"))))
        L.new(env.outputs["Color"], bg.inputs["Color"])
        bg.inputs["Strength"].default_value = 3.5
        # il sole basso della mattina entra dalla finestra, di sbieco, e arriva in fondo alla stanza: disegna i vetri
        # sul pavimento, sul letto e sul muro
        sole = bpy.data.lights.new("sole", "SUN")
        sole.energy = 9.0
        sole.angle = math.radians(1.2)
        sole.color = (1.0, 0.84, 0.64)
        o = bpy.data.objects.new("sole", sole)
        collezione("luci").objects.link(o)
        d = (B(1.6, 0.0, 0.6) - B(cx - 2.2, 3.6, -7.0)).normalized()
        o.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        # e la lampadina e' accesa anche di giorno, piu' debole: dentro caldo, fuori freddo
        l = bpy.data.lights.new("lampadina", "POINT")
        l.energy = 35
        l.shadow_soft_size = 0.03
        l.color = (1.0, 0.72, 0.42)
        o = bpy.data.objects.new("lampadina", l)
        o.location = B(0.0, ALTA - 0.63, 0.3)
        collezione("luci").objects.link(o)
    else:
        bg.inputs["Color"].default_value = (0.012, 0.018, 0.04, 1)
        bg.inputs["Strength"].default_value = 1.0
        # la lampadina nuda e la lampada della scrivania: calde
        for nome, pos, energia, raggio, colore in [("lampadina", (0.0, ALTA - 0.63, 0.3), 70, 0.03, (1.0, 0.72, 0.42)),
                                                   ("lampada", (SCRIVANIA["x"] - 0.55, 1.12, SCRIVANIA["z"] - 0.1), 18, 0.02,
                                                    (1.0, 0.68, 0.38))]:
            l = bpy.data.lights.new(nome, "POINT")
            l.energy = energia
            l.shadow_soft_size = raggio
            l.color = colore
            o = bpy.data.objects.new(nome, l)
            o.location = B(*pos)
            collezione("luci").objects.link(o)
        # la luce delle scale sotto la porta
        bpy.data.materials["luce_scale"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 8
    # la tenda avvolgibile: la mattina il sole la attraversa e la tela fa luce, la sera e' scura
    tenda = bpy.data.materials["tenda"].node_tree.nodes["Principled BSDF"]
    tenda.inputs["Emission Strength"].default_value = 0.9 if fase == "mattina" else 0.0
    # la finestra fa da portale: la luce del cielo si cerca da li'
    port = bpy.data.lights.new("portale", "AREA")
    port.shape = "RECTANGLE"
    port.size = FIN["x1"] - FIN["x0"]
    port.size_y = FIN["y1"] - FIN["y0"]
    port.cycles.is_portal = True
    o = bpy.data.objects.new("portale", port)
    o.location = B(cx, (FIN["y0"] + FIN["y1"]) / 2, Z0 - FIN["fondo"] + 0.02)
    o.rotation_euler = (math.pi / 2, 0, 0)
    collezione("luci").objects.link(o)


VISTE = {
    # nome: (x, z, direzione, inclinazione) come ARRIVI in stanza.js (direzione 0: verso la finestra)
    "arrivo": (1.0, -0.9, 0.82, -0.12),
    "porta": (-1.5, 2.3, -0.16, -0.06),
    "letto": (-0.6, 0.6, -0.75, -0.2),
    "scrivania": (0.6, 2.4, 0.25, -0.12),
    "armadio": (-1.0, -0.9, 1.4, -0.1),
    "ospite": (1.75, 1.7, -math.pi / 2, -0.05),
    "fondo": (1.9, 2.6, 0.55, -0.1),
    "uscita": (-0.6, 0.4, math.pi + 0.35, -0.06),
}


def camera(nome, fov=58):
    sc = bpy.context.scene
    cam = bpy.data.objects.get("camera")
    if not cam:
        cam = bpy.data.objects.new("camera", bpy.data.cameras.new("camera"))
        sc.collection.objects.link(cam)
    sc.camera = cam
    cam.data.sensor_fit = "VERTICAL"
    cam.data.angle_y = math.radians(fov)
    cam.data.clip_start = 0.02
    if nome == "seduto":
        da, a = B(SCRIVANIA["x"], 1.78, SCRIVANIA["z"] + 0.59), B(SCRIVANIA["x"], 0.77, SCRIVANIA["z"] - 0.01)
        cam.data.angle_y = math.radians(52)
    else:
        x, z, yaw, pitch = VISTE[nome]
        da = B(x, OCCHI, z)
        a = da + B(-math.sin(yaw) * math.cos(pitch), math.sin(pitch), -math.cos(yaw) * math.cos(pitch)) - B(0, 0, 0)
    cam.location = da
    cam.rotation_euler = (a - da).to_track_quat("-Z", "Y").to_euler()


def costruisci():
    nuova_scena()
    materiali()
    guscio()
    finestra()
    porte()
    stanzetta()
    su = mobili()
    oggetti_meshy(su)
    quadri()


def anteprima(fase, viste, campioni=96, larghezza=1280):
    sc = bpy.context.scene
    luci(fase)
    sc.cycles.samples = campioni
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 6
    sc.render.resolution_x = larghezza
    sc.render.resolution_y = larghezza * 9 // 16
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
    sc.view_settings.exposure = 2.3 if fase == "mattina" else 1.4
    out = os.path.join(QUI, "anteprime")
    os.makedirs(out, exist_ok=True)
    for v in viste:
        camera(v)
        sc.render.filepath = os.path.join(out, f"{fase}_{v}.jpg")
        sc.render.image_settings.file_format = "JPEG"
        bpy.ops.render.render(write_still=True)
        print("anteprima", sc.render.filepath, flush=True)


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    comando = argv[0] if argv else "anteprima"
    costruisci()
    if comando == "anteprima":
        fase = argv[1] if len(argv) > 1 else "mattina"
        viste = [a for a in argv[2:] if not a.isdigit()] or ["porta", "arrivo", "scrivania", "seduto"]
        numeri = [int(a) for a in argv[2:] if a.isdigit()]
        anteprima(fase, viste, *(numeri[:2] or []))
    elif comando == "salva":
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SORG, "stanza.blend"))
