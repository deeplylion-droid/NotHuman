class_name Porta
extends Node3D
## La porta di legno sgangherata, fatta di assi vere. Ogni asse e' un poligono nel piano della porta (in metri: x verso
## destra, y verso l'alto, la faccia verso la stanza a z = 0), spesso SPESSORE. Dove la colpisci si ammacca e si crepa;
## un'asse colpita abbastanza si spacca all'altezza del colpo e il pezzo in mezzo vola via; i pezzi che non stanno piu'
## attaccati a una traversa cadono. Quando abbastanza assi sono spaccate la porta cede, e il colpo dopo la fa esplodere.
## Con "robusta" e' la porta dopo, piu' spessa e con le fasce di ferro (per ora solo da guardare).

signal colpita(forza: float)
signal crollata(dove: Vector3)

const STRATO_MONDO := 1
const STRATO_PORTA := 2
const STRATO_DETRITI := 4
const DENSITA_LEGNO := 450.0

@export var larghezza := 0.9
@export var altezza := 2.0
@export var n_assi := 5
@export var spessore := 0.035
@export var vita_asse := 3.0
@export var assi_per_crollo := 3
@export var robusta := false

var rotta := false
var cede := false

var _assi: Array[Dictionary] = []
var _traverse_y: Array[Vector2] = []
var _traverse: Array[Node3D] = []
var _ferri: Array[Node3D] = []
var _cardine: Node3D
var _foglio: Node3D
var _detriti: Node3D
var _ang := 0.0
var _vel_ang := 0.0
var _mat_asse: ORMMaterial3D
var _mat_vivo: ORMMaterial3D
var _mat_traversa: ORMMaterial3D
var _mat_ferro: ORMMaterial3D
var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	costruisci()


## (ri)fa la porta da capo: le assi, le traverse, i cardini, la maniglia; i detriti di prima spariscono
func costruisci(seme := -1) -> void:
	for n in get_children():
		n.queue_free()
	_assi.clear()
	_traverse.clear()
	_traverse_y.clear()
	_ferri.clear()
	rotta = false
	cede = false
	_ang = 0.0
	_vel_ang = 0.0
	if seme >= 0:
		_rng.seed = seme
	else:
		_rng.randomize()
	_mat_asse = Materiali.pbr("rough_wood", 1.0, false).duplicate()
	_mat_asse.vertex_color_use_as_albedo = true
	_mat_vivo = Materiali.legno_vivo()
	_mat_traversa = Materiali.pbr("wood_peeling_paint_weathered", 1.0, false).duplicate()
	_mat_traversa.vertex_color_use_as_albedo = true
	_mat_ferro = Materiali.pbr("rusty_metal_02", 6.0, true, Color(0.8, 0.75, 0.7), 0.6)
	# il battente gira sui cardini, a sinistra
	_cardine = Node3D.new()
	_cardine.position = Vector3(-larghezza / 2, 0, 0)
	add_child(_cardine)
	_foglio = Node3D.new()
	_foglio.position = Vector3(larghezza / 2, 0, 0)
	_cardine.add_child(_foglio)
	_detriti = Node3D.new()
	add_child(_detriti)
	_crea_assi()
	_crea_traverse()
	_crea_ferri()


# ---------- la costruzione ----------

func _crea_assi() -> void:
	var margine := 0.004
	var fessura_media := 0.006 if not robusta else 0.003
	var largo := (larghezza - 2 * margine - (n_assi - 1) * fessura_media) / n_assi
	var x := -larghezza / 2 + margine
	for i in n_assi:
		var w := largo * _rng.randf_range(0.9, 1.1) if i < n_assi - 1 else (larghezza / 2 - margine) - x
		var y0 := _rng.randf_range(0.008, 0.03)
		var y1 := altezza - _rng.randf_range(0.0, 0.045 if not robusta else 0.01)
		var poly := _rettangolo(x, y0, x + w, y1)
		if not robusta:
			# sgangherata: le assi un po' storte, qualche spigolo mangiato
			poly = _ruota(poly, _rng.randf_range(-0.012, 0.012))
			if _rng.randf() < 0.6:
				var basso := _rng.randf() < 0.6
				var cy := y0 if basso else y1
				var dx := _rng.randf_range(0.03, 0.08)
				var dy := _rng.randf_range(0.04, 0.14) * (1 if basso else -1)
				var cx := x if _rng.randf() < 0.5 else x + w
				var dir := 1.0 if cx == x else -1.0
				var morso := PackedVector2Array([Vector2(cx - dir * 0.01, cy - signf(dy) * 0.01), Vector2(cx + dir * dx, cy - signf(dy) * 0.01), Vector2(cx - dir * 0.01, cy + dy)])
				poly = _piu_grande(Geometry2D.clip_polygons(poly, morso), poly)
		var tinta := Color.from_hsv(_rng.randf_range(0.06, 0.1), _rng.randf_range(0.0, 0.25), _rng.randf_range(0.62, 0.95))
		var asse := {
			"indice": i, "originale": poly, "pezzi": [], "vita": vita_asse * _rng.randf_range(0.85, 1.2),
			"vita_iniziale": vita_asse, "crepata": false, "spaccata": false, "tinta": tinta,
			"uv": Vector2(_rng.randf(), _rng.randf()), "spinta": 0.0, "vel": 0.0,
		}
		_assi.append(asse)
		asse.pezzi.append(_nuovo_pezzo(poly, asse))
		x += w + fessura_media * _rng.randf_range(0.5, 1.6)


func _crea_traverse() -> void:
	var sp := 0.026 if not robusta else 0.03
	var y_traverse := [Vector2(0.30, 0.43), Vector2(1.52, 1.65)] if not robusta else [Vector2(0.25, 0.36), Vector2(0.95, 1.06), Vector2(1.66, 1.77)]
	for yy in y_traverse:
		_traverse_y.append(yy)
		var poly := _rettangolo(-larghezza / 2 + 0.012, yy.x, larghezza / 2 - 0.012, yy.y)
		if not robusta:
			poly = _ruota(poly, _rng.randf_range(-0.01, 0.01))
		_traverse.append(_pezzo_traversa(poly, sp))
	if not robusta:
		# la diagonale tra le due traverse, a Z
		var a := Vector2(-larghezza / 2 + 0.03, 0.43)
		var b := Vector2(larghezza / 2 - 0.09, 1.52)
		var poly := PackedVector2Array([a, a + Vector2(0.11, 0), b + Vector2(0.06, 0), b + Vector2(-0.05, 0)])
		_traverse.append(_pezzo_traversa(poly, sp))


func _pezzo_traversa(poly: PackedVector2Array, sp: float) -> StaticBody3D:
	var info := {"indice": -1, "originale": poly, "tinta": Color.from_hsv(0.08, 0.1, _rng.randf_range(0.7, 0.95)), "uv": Vector2(_rng.randf(), _rng.randf())}
	var corpo := _corpo(poly, info, sp, _mat_traversa, true)
	corpo.position.z += sp
	corpo.set_meta("traversa", true)
	# i chiodi: dove la traversa passa sopra un'asse, due teste scure
	if not robusta:
		for asse in _assi:
			var bb := _rettangolo_di(asse.originale)
			var cx := bb.get_center().x
			var cy := _centroide(poly).y
			for k in 2:
				var chiodo := MeshInstance3D.new()
				var cil := CylinderMesh.new()
				cil.top_radius = 0.0055
				cil.bottom_radius = 0.0055
				cil.height = 0.004
				cil.material = _mat_ferro
				chiodo.mesh = cil
				chiodo.rotation.x = PI / 2
				var c := _centroide(poly)
				chiodo.position = Vector3(cx - c.x + (k - 0.5) * 0.05, cy - c.y + _rng.randf_range(-0.02, 0.02), 0.002)
				corpo.add_child(chiodo)
	return corpo


func _crea_ferri() -> void:
	# i cardini: bandelle di ferro sulle traverse, a sinistra, coi loro rulli
	for i in range(mini(2, _traverse_y.size())):
		var yy: Vector2 = _traverse_y[i] if i == 0 else _traverse_y[_traverse_y.size() - 1]
		var ferro := _scatola(Vector3(0.32, 0.04, 0.006), _mat_ferro)
		ferro.position = Vector3(-larghezza / 2 + 0.15, (yy.x + yy.y) / 2, 0.026 + 0.004 if not robusta else 0.034)
		_foglio.add_child(ferro)
		_ferri.append(ferro)
		var rullo := MeshInstance3D.new()
		var cil := CylinderMesh.new()
		cil.top_radius = 0.012
		cil.bottom_radius = 0.012
		cil.height = 0.09
		cil.material = _mat_ferro
		rullo.mesh = cil
		rullo.position = Vector3(-larghezza / 2 - 0.005, (yy.x + yy.y) / 2, 0.012)
		_foglio.add_child(rullo)
		_ferri.append(rullo)
	if robusta:
		# la porta dopo: fasce di ferro inchiodate da parte a parte, e un lucchetto
		for yy in _traverse_y:
			var fascia := _scatola(Vector3(larghezza - 0.02, 0.07, 0.008), _mat_ferro)
			fascia.position = Vector3(0, (yy.x + yy.y) / 2, 0.034)
			_foglio.add_child(fascia)
			_ferri.append(fascia)
		var lucchetto := _scatola(Vector3(0.07, 0.09, 0.03), _mat_ferro)
		lucchetto.position = Vector3(larghezza / 2 - 0.09, 1.0, 0.06)
		_foglio.add_child(lucchetto)
		_ferri.append(lucchetto)
	else:
		# la maniglia: una piastra e un anello di ferro, a destra
		var piastra := _scatola(Vector3(0.06, 0.12, 0.006), _mat_ferro)
		piastra.position = Vector3(larghezza / 2 - 0.08, 1.0, 0.003)
		_foglio.add_child(piastra)
		_ferri.append(piastra)
		var anello := MeshInstance3D.new()
		var t := TorusMesh.new()
		t.inner_radius = 0.028
		t.outer_radius = 0.036
		t.material = _mat_ferro
		anello.mesh = t
		anello.rotation = Vector3(0, 0, PI / 2)
		anello.position = Vector3(larghezza / 2 - 0.08, 0.96, 0.02)
		_foglio.add_child(anello)
		_ferri.append(anello)


func _scatola(misure: Vector3, mat: Material) -> MeshInstance3D:
	var m := MeshInstance3D.new()
	var b := BoxMesh.new()
	b.size = misure
	b.material = mat
	m.mesh = b
	return m


# ---------- i pezzi: poligoni spessi, col legno vivo dove si sono spaccati ----------

func _nuovo_pezzo(poly: PackedVector2Array, asse: Dictionary) -> StaticBody3D:
	var corpo := _corpo(poly, asse, spessore, _mat_asse, false)
	corpo.set_meta("asse", asse.indice)
	return corpo


## un corpo fermo della porta (si colpisce col raggio dei pugni) col suo poligono; il centro e' il baricentro
func _corpo(poly: PackedVector2Array, info: Dictionary, sp: float, mat: Material, traversa: bool) -> StaticBody3D:
	var c := _centroide(poly)
	var corpo := StaticBody3D.new()
	corpo.collision_layer = STRATO_PORTA
	corpo.collision_mask = 0
	corpo.position = Vector3(c.x, c.y, 0)
	var mi := MeshInstance3D.new()
	mi.name = "Legno"
	mi.mesh = _estrudi(poly, c, sp, info, mat)
	mi.layers = 1 | 2
	corpo.add_child(mi)
	var cs := CollisionShape3D.new()
	var sh := ConvexPolygonShape3D.new()
	sh.points = _punti(poly, c, sp)
	cs.shape = sh
	corpo.add_child(cs)
	corpo.set_meta("poligono", poly)
	corpo.set_meta("info", info)
	corpo.set_meta("spessore", sp)
	corpo.set_meta("materiale", mat)
	_foglio.add_child(corpo)
	return corpo


func _punti(poly: PackedVector2Array, c: Vector2, sp: float) -> PackedVector3Array:
	var pts := PackedVector3Array()
	for p in poly:
		pts.append(Vector3(p.x - c.x, p.y - c.y, 0))
		pts.append(Vector3(p.x - c.x, p.y - c.y, -sp))
	return pts


## il poligono estruso: davanti e dietro col legno dell'asse (le coordinate delle texture sono quelle della porta,
## cosi' il legno continua da un pezzo all'altro), i fianchi originali uguali, quelli spaccati col legno vivo
func _estrudi(poly: PackedVector2Array, c: Vector2, sp: float, info: Dictionary, mat: Material) -> ArrayMesh:
	var tri := Geometry2D.triangulate_polygon(poly)
	if tri.is_empty():
		# un taglio venuto storto (punti che si toccano): si riempie lo stesso, coi triangoli dei suoi punti
		tri = Geometry2D.triangulate_delaunay(poly)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_color(info.tinta)
	var vivo := SurfaceTool.new()
	vivo.begin(Mesh.PRIMITIVE_TRIANGLES)
	vivo.set_color(Color.WHITE)
	var n_vivo := 0
	var uv_off: Vector2 = info.uv
	for i in range(0, tri.size(), 3):
		var a := poly[tri[i]]
		var b := poly[tri[i + 1]]
		var d := poly[tri[i + 2]]
		_triangolo(st, _v3(a, c, 0), _v3(b, c, 0), _v3(d, c, 0), Vector3.BACK, _uv(a, uv_off), _uv(b, uv_off), _uv(d, uv_off))
		_triangolo(st, _v3(a, c, -sp), _v3(b, c, -sp), _v3(d, c, -sp), Vector3.FORWARD, _uv(a, uv_off + Vector2(0.31, 0.17)), _uv(b, uv_off + Vector2(0.31, 0.17)), _uv(d, uv_off + Vector2(0.31, 0.17)))
	var area := _area(poly)
	var lungo := 0.0
	for i in poly.size():
		var p := poly[i]
		var q := poly[(i + 1) % poly.size()]
		var e := q - p
		if e.length() < 0.0001:
			continue
		var n2 := Vector2(e.y, -e.x).normalized() if area > 0 else Vector2(-e.y, e.x).normalized()
		var n := Vector3(n2.x, n2.y, 0)
		var originale := _sul_bordo(p, info.originale) and _sul_bordo(q, info.originale) and _sul_bordo((p + q) / 2, info.originale)
		var s := st if originale else vivo
		if not originale:
			n_vivo += 1
		var A := _v3(p, c, 0)
		var B := _v3(q, c, 0)
		var C := _v3(q, c, -sp)
		var D := _v3(p, c, -sp)
		var u0 := lungo * 2.0
		var u1 := (lungo + e.length()) * 2.0
		_triangolo(s, A, B, C, n, Vector2(u0, 0), Vector2(u1, 0), Vector2(u1, sp * 2))
		_triangolo(s, A, C, D, n, Vector2(u0, 0), Vector2(u1, sp * 2), Vector2(u0, sp * 2))
		lungo += e.length()
	st.generate_tangents()
	var mesh := st.commit()
	mesh.surface_set_material(0, mat)
	if n_vivo > 0:
		vivo.generate_tangents()
		vivo.commit(mesh)
		mesh.surface_set_material(1, _mat_vivo)
	return mesh


## un triangolo girato come vuole Godot (in senso orario visto dalla parte della normale)
func _triangolo(s: SurfaceTool, a: Vector3, b: Vector3, d: Vector3, n: Vector3, ua: Vector2, ub: Vector2, ud: Vector2) -> void:
	if (b - a).cross(d - a).dot(n) > 0.0:
		var t := b
		b = d
		d = t
		var tu := ub
		ub = ud
		ud = tu
	for coppia in [[a, ua], [b, ub], [d, ud]]:
		s.set_normal(n)
		s.set_uv(coppia[1])
		s.add_vertex(coppia[0])


func _v3(p: Vector2, c: Vector2, z: float) -> Vector3:
	return Vector3(p.x - c.x, p.y - c.y, z)


func _uv(p: Vector2, off: Vector2) -> Vector2:
	return Vector2(p.x * 1.1, -p.y * 0.55) + off


func _sul_bordo(p: Vector2, poly: PackedVector2Array) -> bool:
	for i in poly.size():
		var q := Geometry2D.get_closest_point_to_segment(p, poly[i], poly[(i + 1) % poly.size()])
		if q.distance_to(p) < 0.0015:
			return true
	return false


# ---------- i colpi ----------

## un colpo sul pezzo "corpo" della porta, nel punto (globale) dato, dalla direzione del pugno. "forza": 1 un pugno
## normale. Rende cosa e' successo: "crepa", "spaccata", "crollo" (per i suoni, la telecamera, la lampada)
func colpisci(corpo: Node3D, punto: Vector3, normale: Vector3, direzione: Vector3, forza: float) -> Dictionary:
	var esito := {"crepa": false, "spaccata": false, "crollo": false}
	if rotta or not is_instance_valid(corpo):
		return esito
	var locale := _foglio.to_local(punto)
	var p2 := Vector2(locale.x, locale.y)
	# il battente sobbalza sui cardini, l'asse colpita rientra un attimo
	_vel_ang += forza * (1.2 if not cede else 2.2)
	Effetti.crepa(corpo, punto, normale, _rng.randf_range(0.14, 0.22) * (1.0 + forza * 0.2))
	if cede:
		_esplodi(punto, direzione, forza)
		esito.crollo = true
		colpita.emit(3.0)
		return esito
	if corpo.has_meta("traversa"):
		colpita.emit(forza * 0.8)
		return esito
	var asse: Dictionary = _assi[corpo.get_meta("asse")]
	asse.vel += forza * 1.4
	asse.vita -= forza
	if not asse.crepata and asse.vita < asse.vita_iniziale * 0.55:
		asse.crepata = true
		esito.crepa = true
		_crepa(asse, corpo, p2)
	if asse.vita <= 0.0:
		esito.spaccata = true
		_spacca(asse, p2, direzione, forza)
		asse.vita = asse.vita_iniziale * 0.45
		if not asse.spaccata:
			asse.spaccata = true
			var spaccate := _assi.filter(func(a): return a.spaccata).size()
			if spaccate >= assi_per_crollo:
				cede = true
	colpita.emit(forza * (1.6 if esito.spaccata else 1.0))
	return esito


## la crepa: il pezzo colpito si spacca in due lungo una linea storta all'altezza del colpo, ma resta su; tra i due
## pezzi una fessura da cui passa la luce
func _crepa(asse: Dictionary, corpo: Node3D, p: Vector2) -> void:
	var poly: PackedVector2Array = corpo.get_meta("poligono")
	var linea := _taglio(p.y, _rettangolo_di(poly), 0.02, 0.06)
	var sotto := _sotto(linea, _rettangolo_di(poly))
	var giu := Geometry2D.intersect_polygons(poly, sotto)
	var su := Geometry2D.clip_polygons(poly, sotto)
	if giu.is_empty() or su.is_empty():
		return
	var nuovi: Array = []
	for parte in giu:
		if _area(parte) > 0.0004:
			nuovi.append(_sposta(parte, Vector2(_rng.randf_range(-0.002, 0.002), -0.004)))
	for parte in su:
		if _area(parte) > 0.0004:
			nuovi.append(parte)
	_sostituisci(asse, corpo, nuovi)


## l'asse si spacca: il pezzo all'altezza del colpo (una fascia dai bordi frastagliati) vola via in due o tre schegge
## grandi; i pezzi rimasti che non toccano piu' una traversa cadono
func _spacca(asse: Dictionary, p: Vector2, direzione: Vector3, forza: float) -> void:
	var giu_y := p.y - _rng.randf_range(0.08, 0.16)
	var su_y := p.y + _rng.randf_range(0.08, 0.16)
	for corpo in asse.pezzi.duplicate():
		if not is_instance_valid(corpo):
			continue
		var poly: PackedVector2Array = corpo.get_meta("poligono")
		var bb := _rettangolo_di(poly)
		if bb.position.y > su_y + 0.08 or bb.end.y < giu_y - 0.08:
			continue
		var sotto := _sotto(_taglio(giu_y, bb, 0.025, 0.07), bb)
		var sopra := _sopra(_taglio(su_y, bb, 0.025, 0.07), bb)
		var rimasti: Array = []
		for parte in Geometry2D.intersect_polygons(poly, sotto):
			if _area(parte) > 0.0003:
				rimasti.append(parte)
		for parte in Geometry2D.intersect_polygons(poly, sopra):
			if _area(parte) > 0.0003:
				rimasti.append(parte)
		var fascia: Array = []
		for senza_sotto in Geometry2D.clip_polygons(poly, sotto):
			fascia.append_array(Geometry2D.clip_polygons(senza_sotto, sopra))
		# la fascia vola via, in pezzi lungo la venatura (tagli quasi verticali)
		var punto_g := _foglio.to_global(Vector3(p.x, p.y, 0))
		for f in fascia:
			for scheggia in _tagli_verticali(f, _rng.randi_range(1, 3)):
				if _area(scheggia) > 0.0002:
					_vola(scheggia, asse, punto_g, direzione, forza * 1.2)
		_sostituisci(asse, corpo, rimasti)
	_cadono(asse)


## i pezzi di un'asse che non toccano piu' nessuna traversa cadono (con una spinta leggera all'indietro)
func _cadono(asse: Dictionary) -> void:
	for corpo in asse.pezzi.duplicate():
		if not is_instance_valid(corpo):
			continue
		var bb := _rettangolo_di(corpo.get_meta("poligono"))
		var tiene := false
		for t in _traverse_y:
			if minf(bb.end.y, t.y) - maxf(bb.position.y, t.x) > 0.02:
				tiene = true
		if not tiene:
			var poly: PackedVector2Array = corpo.get_meta("poligono")
			asse.pezzi.erase(corpo)
			_vola(poly, asse, corpo.global_position + Vector3(0, 0, 0.1), Vector3(0, 0, -1), 0.3, corpo)
			corpo.queue_free()


## sostituisce un pezzo con i suoi nuovi pezzi (le crepe sul legno vanno con il pezzo nuovo che le contiene)
func _sostituisci(asse: Dictionary, vecchio: Node3D, polys: Array) -> void:
	var nuovi: Array = []
	for poly in polys:
		var n := _nuovo_pezzo(poly, asse)
		n.position.z = vecchio.position.z
		nuovi.append(n)
		asse.pezzi.append(n)
	_passa_crepe(vecchio, nuovi)
	asse.pezzi.erase(vecchio)
	vecchio.queue_free()


func _passa_crepe(vecchio: Node3D, nuovi: Array) -> void:
	for d in vecchio.get_children():
		if not d is Decal:
			continue
		var l := _foglio.to_local(d.global_position)
		var dove: Node3D = null
		for n in nuovi:
			if Geometry2D.is_point_in_polygon(Vector2(l.x, l.y), n.get_meta("poligono")):
				dove = n
		if dove:
			d.reparent(dove, true)


## un pezzo che vola via: un corpo rigido con lo stesso legno, spinto dal colpo, che gira su se stesso e resta a terra
func _vola(poly: PackedVector2Array, info: Dictionary, da: Vector3, direzione: Vector3, forza: float, vecchio: Node3D = null, sp := -1.0, mat: Material = null) -> RigidBody3D:
	if sp < 0:
		sp = spessore
	if mat == null:
		mat = _mat_asse
	var c := _centroide(poly)
	var corpo := RigidBody3D.new()
	corpo.collision_layer = STRATO_DETRITI
	corpo.collision_mask = STRATO_MONDO | STRATO_DETRITI
	corpo.continuous_cd = true
	var pm := PhysicsMaterial.new()
	pm.friction = 0.8
	pm.bounce = 0.15
	corpo.physics_material_override = pm
	corpo.mass = maxf(0.05, absf(_area(poly)) * sp * DENSITA_LEGNO)
	var mi := MeshInstance3D.new()
	mi.mesh = _estrudi(poly, c, sp, info, mat)
	mi.layers = 1 | 2
	corpo.add_child(mi)
	var cs := CollisionShape3D.new()
	var sh := ConvexPolygonShape3D.new()
	sh.points = _punti(poly, c, sp)
	cs.shape = sh
	corpo.add_child(cs)
	_detriti.add_child(corpo)
	corpo.global_transform = _foglio.global_transform * Transform3D(Basis(), Vector3(c.x, c.y, 0))
	if vecchio:
		corpo.global_position.z = vecchio.global_position.z
		for d in vecchio.get_children():
			if d is Decal:
				d.reparent(corpo, true)
	var via := (corpo.global_position - da)
	via = via.normalized() if via.length() > 0.001 else Vector3.ZERO
	var spinta := (direzione.normalized() * _rng.randf_range(2.0, 4.0) + via * _rng.randf_range(0.5, 1.6) + Vector3.UP * _rng.randf_range(0.3, 1.4)) * forza
	corpo.apply_central_impulse(spinta * corpo.mass)
	corpo.apply_torque_impulse(Vector3(_rng.randf_range(-1, 1), _rng.randf_range(-1, 1), _rng.randf_range(-1, 1)) * corpo.mass * 0.06 * forza)
	return corpo


## la porta esplode: ogni pezzo rimasto si spacca ancora in due o tre e vola via, le traverse e i ferri con loro
func _esplodi(punto: Vector3, direzione: Vector3, forza: float) -> void:
	rotta = true
	var potenza := 2.2 + forza * 0.6
	for asse in _assi:
		for corpo in asse.pezzi:
			if not is_instance_valid(corpo):
				continue
			var poly: PackedVector2Array = corpo.get_meta("poligono")
			for parte in _tagli_orizzontali(poly, _rng.randi_range(1, 3)):
				for scheggia in _tagli_verticali(parte, _rng.randi_range(1, 2)):
					if _area(scheggia) > 0.0002:
						_vola(scheggia, asse, punto, direzione, potenza * _rng.randf_range(0.6, 1.2), corpo)
			corpo.queue_free()
		asse.pezzi.clear()
	for t in _traverse:
		var poly: PackedVector2Array = t.get_meta("poligono")
		var info: Dictionary = t.get_meta("info")
		var sp: float = t.get_meta("spessore")
		for parte in _tagli_verticali(poly, _rng.randi_range(2, 3)):
			var r := _vola(parte, info, punto, direzione, potenza * 0.8, t, sp, t.get_meta("materiale"))
			r.global_position.z = t.global_position.z
		t.queue_free()
	_traverse.clear()
	for f in _ferri:
		var corpo := RigidBody3D.new()
		corpo.collision_layer = STRATO_DETRITI
		corpo.collision_mask = STRATO_MONDO | STRATO_DETRITI
		corpo.mass = 0.4
		var cs := CollisionShape3D.new()
		var sh := BoxShape3D.new()
		sh.size = f.get_aabb().size.max(Vector3.ONE * 0.01)
		cs.shape = sh
		_detriti.add_child(corpo)
		corpo.global_transform = f.global_transform
		f.reparent(corpo, true)
		corpo.add_child(cs)
		corpo.apply_central_impulse((direzione * _rng.randf_range(1.5, 3.0) + Vector3.UP) * corpo.mass * potenza * 0.5)
	_ferri.clear()
	crollata.emit(punto)


# ---------- i tagli ----------

## una linea storta di parte in parte all'altezza y: piccoli denti e qualche scheggia lunga lungo la venatura
func _taglio(y: float, bb: Rect2, denti: float, schegge: float) -> PackedVector2Array:
	var pts := PackedVector2Array()
	var x := bb.position.x - 0.03
	var fine := bb.end.x + 0.03
	while x < fine:
		var dy := _rng.randf_range(-denti, denti)
		if _rng.randf() < 0.25:
			dy += _rng.randf_range(-schegge, schegge)
		pts.append(Vector2(x, y + dy))
		x += _rng.randf_range(0.012, 0.03)
	pts.append(Vector2(fine, y + _rng.randf_range(-denti, denti)))
	return pts


func _sotto(linea: PackedVector2Array, bb: Rect2) -> PackedVector2Array:
	var p := linea.duplicate()
	p.append(Vector2(linea[linea.size() - 1].x, bb.position.y - 1.0))
	p.append(Vector2(linea[0].x, bb.position.y - 1.0))
	return p


func _sopra(linea: PackedVector2Array, bb: Rect2) -> PackedVector2Array:
	var p := linea.duplicate()
	p.append(Vector2(linea[linea.size() - 1].x, bb.end.y + 1.0))
	p.append(Vector2(linea[0].x, bb.end.y + 1.0))
	return p


func _tagli_orizzontali(poly: PackedVector2Array, n: int) -> Array:
	var pezzi: Array = [poly]
	for k in n - 1:
		var piu := _piu_grande_lista(pezzi)
		var bb := _rettangolo_di(piu)
		if bb.size.y < 0.15:
			break
		var y := bb.position.y + bb.size.y * _rng.randf_range(0.3, 0.7)
		var sotto := _sotto(_taglio(y, bb, 0.02, 0.06), bb)
		pezzi.erase(piu)
		pezzi.append_array(Geometry2D.intersect_polygons(piu, sotto))
		pezzi.append_array(Geometry2D.clip_polygons(piu, sotto))
	return pezzi


## tagli lungo la venatura: linee quasi verticali, frastagliate
func _tagli_verticali(poly: PackedVector2Array, n: int) -> Array:
	var pezzi: Array = [poly]
	for k in n - 1:
		var piu := _piu_grande_lista(pezzi)
		var bb := _rettangolo_di(piu)
		if bb.size.x < 0.05:
			break
		var x := bb.position.x + bb.size.x * _rng.randf_range(0.35, 0.65)
		var pts := PackedVector2Array()
		var y := bb.position.y - 0.03
		while y < bb.end.y + 0.03:
			pts.append(Vector2(x + _rng.randf_range(-0.012, 0.012), y))
			y += _rng.randf_range(0.03, 0.08)
		pts.append(Vector2(x, bb.end.y + 0.03))
		pts.append(Vector2(bb.position.x - 1.0, bb.end.y + 0.03))
		pts.append(Vector2(bb.position.x - 1.0, bb.position.y - 0.03))
		pezzi.erase(piu)
		pezzi.append_array(Geometry2D.intersect_polygons(piu, pts))
		pezzi.append_array(Geometry2D.clip_polygons(piu, pts))
	return pezzi


# ---------- il movimento: il battente sui cardini, le assi che rientrano ----------

func _physics_process(delta: float) -> void:
	if not _cardine:
		return
	# una molla smorzata: la serratura tiene il battente, che sobbalza verso la stanza dopo e torna a sbattere contro
	# lo stipite (da questa parte non passa)
	var k := 700.0 if not cede else 260.0
	_vel_ang += (-k * _ang - 14.0 * _vel_ang) * delta
	_ang += _vel_ang * delta
	if _ang < -0.004:
		_ang = -0.004
		_vel_ang = -_vel_ang * 0.3
	_cardine.rotation.y = _ang
	for asse in _assi:
		asse.vel += (-1600.0 * asse.spinta - 22.0 * asse.vel) * delta
		asse.spinta += asse.vel * delta
		for corpo in asse.pezzi:
			if is_instance_valid(corpo):
				corpo.position.z = -asse.spinta * 0.25


# ---------- geometria ----------

func _rettangolo(x0: float, y0: float, x1: float, y1: float) -> PackedVector2Array:
	return PackedVector2Array([Vector2(x0, y0), Vector2(x1, y0), Vector2(x1, y1), Vector2(x0, y1)])


func _ruota(poly: PackedVector2Array, ang: float) -> PackedVector2Array:
	var c := _centroide(poly)
	var out := PackedVector2Array()
	for p in poly:
		out.append(c + (p - c).rotated(ang))
	return out


func _sposta(poly: PackedVector2Array, d: Vector2) -> PackedVector2Array:
	var out := PackedVector2Array()
	for p in poly:
		out.append(p + d)
	return out


func _area(poly: PackedVector2Array) -> float:
	var a := 0.0
	for i in poly.size():
		var p := poly[i]
		var q := poly[(i + 1) % poly.size()]
		a += p.x * q.y - q.x * p.y
	return a * 0.5


func _centroide(poly: PackedVector2Array) -> Vector2:
	var a := _area(poly)
	if absf(a) < 1e-9:
		var s := Vector2.ZERO
		for p in poly:
			s += p
		return s / maxi(1, poly.size())
	var cx := 0.0
	var cy := 0.0
	for i in poly.size():
		var p := poly[i]
		var q := poly[(i + 1) % poly.size()]
		var f := p.x * q.y - q.x * p.y
		cx += (p.x + q.x) * f
		cy += (p.y + q.y) * f
	return Vector2(cx, cy) / (6.0 * a)


func _rettangolo_di(poly: PackedVector2Array) -> Rect2:
	var r := Rect2(poly[0], Vector2.ZERO)
	for p in poly:
		r = r.expand(p)
	return r


func _piu_grande(lista: Array, altrimenti: PackedVector2Array) -> PackedVector2Array:
	return altrimenti if lista.is_empty() else _piu_grande_lista(lista)


func _piu_grande_lista(lista: Array) -> PackedVector2Array:
	var meglio: PackedVector2Array = lista[0]
	for p in lista:
		if absf(_area(p)) > absf(_area(meglio)):
			meglio = p
	return meglio
