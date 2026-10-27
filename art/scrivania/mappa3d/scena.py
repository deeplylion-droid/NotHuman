"""La mappa di Malvento in 3D, in Blender (tools/mappa.py la chiama): il paese come un plastico luminoso sul pendio,
visto dall'alto in obliquo, sul modello della mappa di Night City di Cyberpunk 2077 ma coi colori del gioco ("puoi
adattarla ai nostri colori?"): il nero, il verde della notte e degli indicatori, il giallo e il rosso dell'interfaccia.

- il terreno: una rete che sale verso la montagna attorno al paese; addosso la texture di terreno.png (strade gialle,
  isolati, rive, recinto della ditta) e, disegnate dal materiale, la griglia e le curve di livello;
- gli edifici (forme.json): blocchi azzurri estrusi, accesi di piu' in cima, con gli spigoli chiari; la chiesa col
  campanile; i prefabbricati della ditta bianchi, con l'antenna e la luce rossa;
- solo luce emessa, niente lampade; il bagliore lo fa il compositore.

Scrive render.png e proiezioni.json (dove cadono sullo schermo case, luoghi ed etichette).
Uso: blender -b --python art/scrivania/mappa3d/scena.py -- [larghezza]
"""
import json
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

QUI = os.path.dirname(os.path.abspath(__file__))
U = 100.0  # punti della pianta per unita' di Blender
F = json.load(open(os.path.join(QUI, "forme.json")))
MW, MH = F["larghezza"] / U, F["altezza"] / U  # 25,6 x 14,4


def quota(x, y):
    """l'altezza del terreno (x, y in unita', y negativo verso sud): il paese su un pendio che sale a nord-est, il fiume
    nel fondovalle a ovest, e tutt'intorno la montagna"""
    x = np.asarray(x, np.float64)
    y = np.asarray(y, np.float64)
    u, v = x / MW, -y / MH  # 0..1 nella pianta, v verso sud
    h = 0.55 * (1 - v) + 0.4 * u
    h += 0.035 * np.sin(x * 0.9 + 1.3) * np.cos(y * 0.7 - 0.4) + 0.015 * np.sin(x * 2.1 - y * 1.7)
    # il fondovalle del fiume, a ovest
    fx = 0.12 * MW + 0.04 * MW * np.sin(v * 3.0)
    h -= 0.25 * np.exp(-((x - fx) / 1.6) ** 2)
    # fuori dalla pianta la montagna sale
    dx = np.maximum(np.maximum(-x, x - MW), 0)
    dy = np.maximum(np.maximum(y, -MH - y), 0)
    d = np.sqrt(dx ** 2 + dy ** 2)
    monti = 0.55 * d ** 1.35 * (0.75 + 0.25 * np.sin(x * 0.45 + 2.0) * np.cos(y * 0.5))
    monti += 0.6 * d * (0.5 + 0.5 * np.sin(x * 0.8 - y * 0.3)) * np.clip(d / 4, 0, 1)
    # verso sud (dove sta la camera) la montagna resta bassa
    monti *= np.where(y < -MH, 0.15, 1.0)
    return h + monti


def nuova_scena():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = 24
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 0
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    return sc


def nodi(m):
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    for n in list(N):
        if n.type != "OUTPUT_MATERIAL":
            N.remove(n)
    return N, L, N["Material Output"]


def materiale_terreno():
    m = bpy.data.materials.new("terreno")
    N, L, out = nodi(m)
    tex = N.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(os.path.join(QUI, "terreno.png"))
    tex.extension = "CLIP"
    uv = N.new("ShaderNodeUVMap")
    L.new(uv.outputs["UV"], tex.inputs["Vector"])
    geo = N.new("ShaderNodeNewGeometry")
    sep = N.new("ShaderNodeSeparateXYZ")
    L.new(geo.outputs["Position"], sep.inputs["Vector"])

    def linea(valore, passo, larghezza):
        """1 vicino ai multipli di "passo", 0 altrove: una riga sottile"""
        d = N.new("ShaderNodeMath")
        d.operation = "DIVIDE"
        d.inputs[1].default_value = passo
        L.new(valore, d.inputs[0])
        f = N.new("ShaderNodeMath")
        f.operation = "PINGPONG"
        f.inputs[1].default_value = 0.5
        L.new(d.outputs[0], f.inputs[0])
        s = N.new("ShaderNodeMath")
        s.operation = "LESS_THAN"
        s.inputs[1].default_value = larghezza
        L.new(f.outputs[0], s.inputs[0])
        return s.outputs[0]

    # le curve di livello (ogni 0,08 di quota, una piu' forte ogni cinque) e la griglia ogni unita'
    curve = linea(sep.outputs["Z"], 0.1, 0.022)
    maestre = linea(sep.outputs["Z"], 0.5, 0.008)
    gx = linea(sep.outputs["X"], 1.0, 0.008)
    gy = linea(sep.outputs["Y"], 1.0, 0.008)

    def mescola(a, b, op="ADD", fattore=None):
        n = N.new("ShaderNodeMath")
        n.operation = op
        L.new(a, n.inputs[0])
        if isinstance(b, float):
            n.inputs[1].default_value = b
        else:
            L.new(b, n.inputs[1])
        return n.outputs[0]

    righe = mescola(mescola(curve, 0.16, "MULTIPLY"), mescola(maestre, 0.45, "MULTIPLY"))
    griglia = mescola(mescola(gx, gy, "MAXIMUM"), 0.14, "MULTIPLY")
    blu = N.new("ShaderNodeCombineColor")
    # le righe col verde del gioco (--verde), spento
    blu.inputs[0].default_value, blu.inputs[1].default_value, blu.inputs[2].default_value = 0.14, 0.3, 0.07
    tot = mescola(righe, griglia, "MAXIMUM")
    col_righe = N.new("ShaderNodeVectorMath")
    col_righe.operation = "SCALE"
    L.new(blu.outputs[0], col_righe.inputs[0])
    L.new(tot, col_righe.inputs["Scale"])
    # la texture sopra le righe
    somma = N.new("ShaderNodeVectorMath")
    somma.operation = "ADD"
    L.new(tex.outputs["Color"], somma.inputs[0])
    L.new(col_righe.outputs[0], somma.inputs[1])
    # piu' lontano, piu' buio
    cam = N.new("ShaderNodeCameraData")
    nebbia = N.new("ShaderNodeMath")
    nebbia.operation = "EXPONENT"
    mul = N.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = -0.035
    L.new(cam.outputs["View Distance"], mul.inputs[0])
    L.new(mul.outputs[0], nebbia.inputs[0])
    sc = N.new("ShaderNodeVectorMath")
    sc.operation = "SCALE"
    L.new(somma.outputs[0], sc.inputs[0])
    L.new(nebbia.outputs[0], sc.inputs["Scale"])
    em = N.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = 1.6
    L.new(sc.outputs[0], em.inputs["Color"])
    L.new(em.outputs[0], out.inputs["Surface"])
    return m


def materiale_casa(nome, colore, forza, su=1.0, giu=0.3, piano=0.13):
    """le case: luce azzurra, piu' forte in cima; sui lati una riga piu' chiara a ogni piano"""
    m = bpy.data.materials.new(nome)
    N, L, out = nodi(m)
    geo = N.new("ShaderNodeNewGeometry")
    sep = N.new("ShaderNodeSeparateXYZ")
    L.new(geo.outputs["Normal"], sep.inputs["Vector"])
    mr = N.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = 0.0
    mr.inputs["From Max"].default_value = 1.0
    mr.inputs["To Min"].default_value = giu
    mr.inputs["To Max"].default_value = su
    L.new(sep.outputs["Z"], mr.inputs["Value"])
    pos = N.new("ShaderNodeSeparateXYZ")
    L.new(geo.outputs["Position"], pos.inputs["Vector"])
    d = N.new("ShaderNodeMath")
    d.operation = "DIVIDE"
    d.inputs[1].default_value = piano
    L.new(pos.outputs["Z"], d.inputs[0])
    f = N.new("ShaderNodeMath")
    f.operation = "PINGPONG"
    f.inputs[1].default_value = 0.5
    L.new(d.outputs[0], f.inputs[0])
    lt = N.new("ShaderNodeMath")
    lt.operation = "LESS_THAN"
    lt.inputs[1].default_value = 0.05
    L.new(f.outputs[0], lt.inputs[0])
    righe = N.new("ShaderNodeMath")
    righe.operation = "MULTIPLY"
    righe.inputs[1].default_value = 0.55
    L.new(lt.outputs[0], righe.inputs[0])
    tot = N.new("ShaderNodeMath")
    tot.operation = "ADD"
    L.new(mr.outputs["Result"], tot.inputs[0])
    L.new(righe.outputs[0], tot.inputs[1])
    em = N.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*colore, 1)
    mul = N.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = forza
    L.new(tot.outputs[0], mul.inputs[0])
    L.new(mul.outputs[0], em.inputs["Strength"])
    L.new(em.outputs[0], out.inputs["Surface"])
    return m


def materiale_luce(nome, colore, forza, su=1.0, giu=0.35):
    """un materiale che fa luce: piu' forte in cima (le facce che guardano in su) che sui lati"""
    m = bpy.data.materials.new(nome)
    N, L, out = nodi(m)
    geo = N.new("ShaderNodeNewGeometry")
    sep = N.new("ShaderNodeSeparateXYZ")
    L.new(geo.outputs["Normal"], sep.inputs["Vector"])
    mr = N.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = 0.0
    mr.inputs["From Max"].default_value = 1.0
    mr.inputs["To Min"].default_value = giu
    mr.inputs["To Max"].default_value = su
    L.new(sep.outputs["Z"], mr.inputs["Value"])
    em = N.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*colore, 1)
    mul = N.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = forza
    L.new(mr.outputs["Result"], mul.inputs[0])
    L.new(mul.outputs[0], em.inputs["Strength"])
    L.new(em.outputs[0], out.inputs["Surface"])
    return m


def terreno():
    # la rete: piu' fitta dove sta il paese, larga attorno per la montagna
    x0, x1, y0, y1 = -14.0, MW + 14.0, -MH - 8.0, 16.0
    nx, ny = 520, 330
    xs = np.linspace(x0, x1, nx)
    ys = np.linspace(y0, y1, ny)
    X, Y = np.meshgrid(xs, ys)
    Z = quota(X, Y)
    verts = np.stack([X, Y, Z], -1).reshape(-1, 3)
    facce = []
    for j in range(ny - 1):
        for i in range(nx - 1):
            a = j * nx + i
            facce.append((a, a + 1, a + nx + 1, a + nx))
    me = bpy.data.meshes.new("terreno")
    me.from_pydata(verts.tolist(), [], facce)
    uv = me.uv_layers.new(name="UVMap")
    U_ = (X / MW).reshape(-1)
    V_ = ((Y + MH) / MH).reshape(-1)
    loops = np.array([l.vertex_index for l in me.loops])
    uvs = np.stack([U_[loops], V_[loops]], -1).reshape(-1)
    uv.data.foreach_set("uv", uvs)
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new("terreno", me)
    bpy.context.scene.collection.objects.link(ob)
    me.materials.append(materiale_terreno())
    return ob


def edificio(nome, punti, alto, mat, spigoli, base_giu=0.08):
    """un blocco: la pianta (punti della mappa) estrusa, appoggiato al terreno"""
    pts = [(x / U, -y / U) for x, y in punti]
    zs = quota([p[0] for p in pts], [p[1] for p in pts])
    base = float(zs.min()) - base_giu
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, base)) for x, y in pts]
    f = bm.faces.new(vs)
    bm.normal_update()
    if f.normal.z < 0:
        f.normal_flip()
    top = float(zs.max()) + alto
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    nuovi = [g for g in r["geom"] if isinstance(g, bmesh.types.BMVert)]
    for v in nuovi:
        v.co.z = top
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(nome, me)
    bpy.context.scene.collection.objects.link(ob)
    me.materials.append(mat)
    # gli spigoli: una copia a fil di ferro, chiara
    sp = bpy.data.objects.new(nome + "_spigoli", me.copy())
    bpy.context.scene.collection.objects.link(sp)
    w = sp.modifiers.new("spigoli", "WIREFRAME")
    w.thickness = 0.014
    w.use_replace = True
    sp.data.materials.clear()
    sp.data.materials.append(spigoli)
    return ob, base, top


def scatola(nome, c, d, mat):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * d[0] + c[0], v.co.y * d[1] + c[1], v.co.z * d[2] + c[2]))
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(nome, me)
    bpy.context.scene.collection.objects.link(ob)
    me.materials.append(mat)
    return ob


def costruisci():
    sc = nuova_scena()
    w = bpy.data.worlds.new("notte")
    sc.world = w
    w.use_nodes = True
    # il nero del gioco (--notte)
    w.node_tree.nodes["Background"].inputs["Color"].default_value = (0.0033, 0.004, 0.0037, 1)
    terreno()
    # i colori del gioco: le case col verde degli indicatori e della notte (--verde), la ditta bianca (--testo) e
    # rossa (--rec)
    azzurro = materiale_casa("case", (0.3, 0.62, 0.14), 0.48, su=1.0, giu=0.32)
    chiesa_m = materiale_casa("chiesa", (0.38, 0.69, 0.2), 0.72, su=1.0, giu=0.34, piano=0.2)
    spigoli = materiale_luce("spigoli", (0.7, 1.0, 0.5), 2.2, su=1.0, giu=1.0)
    bianco = materiale_luce("prefab", (0.84, 0.81, 0.72), 0.9, su=1.0, giu=0.35)
    rosso = materiale_luce("rosso", (0.75, 0.05, 0.03), 14.0, su=1.0, giu=1.0)
    case, luoghi = {}, {}
    rng = np.random.default_rng(3)
    for i, e in enumerate(F["edifici"]):
        area = cv2_area(e["punti"]) / (U * U)
        if e["chiesa"]:
            ob, base, top = edificio(f"chiesa", e["punti"], 0.42, chiesa_m, spigoli)
            # il campanile, sul braccio a nord della croce
            xs = [p[0] / U for p in e["punti"]]
            ys = [-p[1] / U for p in e["punti"]]
            cx = (min(xs) + max(xs)) / 2
            cy = max(ys) - 0.16
            alto = 1.25
            scatola("campanile", (cx, cy, top + alto / 2 - 0.1), (0.26, 0.26, alto), chiesa_m)
            scatola("campanile_spigoli", (cx, cy, top + alto - 0.05), (0.3, 0.3, 0.04), spigoli)
            luoghi["chiesa"] = (cx, cy, top + alto)
            continue
        alto = 0.22 + 0.42 * min(1.0, area / 0.5) + rng.uniform(0, 0.12)
        ob, base, top = edificio(f"edificio{i}", e["punti"], alto, azzurro, spigoli)
        if e["casa"]:
            pts = np.array(e["punti"]) / U
            case[e["casa"]] = dict(nome=ob.name, centro=(float(pts[:, 0].mean()), float(-pts[:, 1].mean())), base=base,
                                   top=top)
    for j, p in enumerate(F["prefab"]):
        ob, base, top = edificio(f"prefab{j}", p, 0.16, bianco, spigoli)
    # l'antenna della ditta, con la luce rossa in cima
    dx, dy = F["luoghi"]["ditta"]
    ax, ay = dx / U + 0.9, -dy / U + 0.9
    az = float(quota(ax, ay))
    scatola("antenna", (ax, ay, az + 0.9), (0.03, 0.03, 1.8), spigoli)
    scatola("antenna_luce", (ax, ay, az + 1.82), (0.09, 0.09, 0.09), rosso)
    cx, cy = F["luoghi"]["cimitero"]
    luoghi["cimitero"] = (cx / U, -cy / U, float(quota(cx / U, -cy / U)) + 0.05)
    luoghi["ditta"] = (dx / U, -dy / U, float(quota(dx / U, -dy / U)) + 0.2)
    return sc, case, luoghi


def cv2_area(punti):
    p = np.array(punti)
    x, y = p[:, 0], p[:, 1]
    return 0.5 * abs(np.dot(x, np.roll(y, 1)) - np.dot(y, np.roll(x, 1)))


def camera(sc):
    cam = bpy.data.objects.new("camera", bpy.data.cameras.new("camera"))
    sc.collection.objects.link(cam)
    sc.camera = cam
    cam.data.lens = 34
    cam.data.sensor_fit = "HORIZONTAL"
    centro = Vector((MW * 0.5, -MH * 0.52, 0.4))
    alzo = math.radians(47)
    dist = 22.0
    cam.location = centro + Vector((0, -math.cos(alzo) * dist, math.sin(alzo) * dist))
    cam.rotation_euler = (centro - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.clip_end = 200
    return cam


def bagliore(sc):
    sc.use_nodes = True
    nt = sc.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    rl = nt.nodes.new("CompositorNodeRLayers")
    g = nt.nodes.new("CompositorNodeGlare")
    g.glare_type = "BLOOM" if "BLOOM" in [i.identifier for i in g.bl_rna.properties["glare_type"].enum_items] else "FOG_GLOW"
    try:
        g.threshold = 0.7
        g.size = 7
        g.mix = 0.0
    except Exception:
        pass
    out = nt.nodes.new("CompositorNodeComposite")
    nt.links.new(rl.outputs["Image"], g.inputs["Image"])
    nt.links.new(g.outputs["Image"], out.inputs["Image"])


def proietta(sc, cam, p):
    v = world_to_camera_view(sc, cam, Vector(p))
    return [float(v.x), float(1 - v.y)]


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    larghezza = int(argv[0]) if argv else 2560
    sc, case, luoghi = costruisci()
    cam = camera(sc)
    bagliore(sc)
    sc.render.resolution_x = larghezza
    sc.render.resolution_y = larghezza * 9 // 16
    sc.render.filepath = os.path.join(QUI, "render.png")
    sc.render.image_settings.file_format = "PNG"
    bpy.ops.render.render(write_still=True)
    # dove cadono le cose sullo schermo
    out = {"case": [], "luoghi": {}, "etichette": []}
    for n in range(1, 24):
        c = case[n]
        ob = bpy.data.objects[c["nome"]]
        pts = [proietta(sc, cam, ob.matrix_world @ v.co) for v in ob.data.vertices]
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        spillo = proietta(sc, cam, (c["centro"][0], c["centro"][1], c["top"]))
        ex, ey = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        out["case"].append([spillo[0], spillo[1], ex, ey, (max(xs) - min(xs)) / 2 * 1.1, (max(ys) - min(ys)) / 2 * 1.1])
    for k, p in luoghi.items():
        out["luoghi"][k] = proietta(sc, cam, p)
    for e in F["etichette"]:
        xy = [proietta(sc, cam, (x / U, -y / U, float(quota(x / U, -y / U)))) for x, y in e["candidati"]]
        out["etichette"].append({"testo": e["testo"], "xy": xy[0], "candidati_xy": xy})
    json.dump(out, open(os.path.join(QUI, "proiezioni.json"), "w"), indent=1)
    print("mappa3d render e proiezioni ok", flush=True)


main()
