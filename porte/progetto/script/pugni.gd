class_name Pugni
extends Node3D
## Le braccia in prima persona, figlie della telecamera. Il modello di Meshy (porte/art/pugni) e' un avambraccio
## SINISTRO: il destro e' la sua copia specchiata (una mesh rifatta al contrario, non una scala negativa: il materiale
## e' a due facce e con la scala negativa Godot lo illumina al rovescio, nero). Dal polsino della manica parte la manica
## fino alla spalla, fuori dallo schermo, cosi' il braccio non finisce mai a mezz'aria.
## In guardia le braccia ondeggiano col respiro, coi passi e con lo sguardo (restano un attimo indietro), e se si e'
## troppo vicini a un muro si tirano indietro. Il pugno parte da un braccio alla volta: carica, colpo fino al punto della
## porta (le nocche toccano davvero il legno; se la porta e' piu' lontana del braccio, il corpo ci si butta dentro:
## l'"affondo", che il giocatore aggiunge alla telecamera), l'impatto, il rinculo e il ritorno in guardia. Durante il
## colpo il pugno gira, da mezzo dritto a dorso in su, come un pugno vero.

signal impatto(lato: int)
## un pugno chiesto mentre le braccia erano tutte e due occupate: ora si puo' tirare
signal coda_libera

const MODELLO := preload("res://modelli/pugno.glb")
# il modello e' lungo 1,9 lungo z, con il pugno verso +z: la punta delle nocche a z = 0,95
const PUNTA_MODELLO := 0.95
const SCALA := 0.21
# il giro attorno al braccio che mette il dorso della mano in su (+y nel perno), il pollice verso il centro dello
# schermo: -45 gradi per il sinistro (il modello com'e'), +45 per il destro (specchiato)
const GIRO_DORSO := PI / 4.0
# nel perno (la punta delle nocche nell'origine, il braccio verso +z) il polsino della manica va da 0,35 a 0,40: la
# manica verso la spalla parte da dentro il polsino
const INIZIO_MANICA := 0.37
const RAGGIO_MANICA := [0.06, 0.075]
# la guardia (in metri, rispetto alla telecamera): i pugni in basso ai lati, il dorso un po' verso l'esterno
const GUARDIA := [Vector3(0.22, -0.13, -0.42), Vector3(-0.22, -0.13, -0.42)]
const SPALLE := [Vector3(0.2, -0.36, 0.08), Vector3(-0.2, -0.36, 0.08)]
# fin dove arriva il pugno dagli occhi; oltre, il corpo si butta avanti, al massimo di AFFONDO_MAX
const BRACCIO := 0.72
const AFFONDO_MAX := 0.18
# il pugno a vuoto (niente a portata)
const VUOTO := Vector3(0.05, -0.06, -0.64)
# i tempi del pugno, in secondi
const T_CARICA := 0.055
const T_COLPO := 0.065
const T_TIENE := 0.03
const T_RINCULO := 0.08
const T_RITORNO := 0.17
# lo strato delle braccia (oltre al primo, quello di tutto): la luce di riempimento illumina solo questo
const STRATO_BRACCIA := 8

static var _mesh_destra: ArrayMesh

var passo := 0.0  # 0..1, quanto si cammina (lo dice il giocatore)
var spazio := 2.0  # quanto spazio libero c'e' davanti agli occhi (lo dice il giocatore): sotto la guardia si arretra
var affondo := 0.0  # di quanto la telecamera si butta avanti adesso, per il pugno in corso (la legge il giocatore)
var _braccia: Array[Node3D] = []
var _maniche: Array[MeshInstance3D] = []
var _stati: Array[Dictionary] = [{}, {}]
var _lato := 0
var _in_coda := false
var _ondeggio := Vector2.ZERO
var _t := 0.0


func _ready() -> void:
	var stoffa := _stoffa()
	for lato in 2:
		var s := _segno(lato)
		var perno := Node3D.new()
		add_child(perno)
		var modello: Node3D = MODELLO.instantiate()
		if lato == 0:
			var mi := _mesh_in(modello)
			if _mesh_destra == null:
				_mesh_destra = _specchia(mi.mesh)
			mi.mesh = _mesh_destra
		# il pugno avanti (-z), la punta delle nocche nell'origine del perno, il dorso in su
		modello.transform = Transform3D(Basis(Vector3(0, 0, 1), GIRO_DORSO * s) * Basis(Vector3.UP, PI).scaled(Vector3.ONE * SCALA), Vector3(0, 0, PUNTA_MODELLO * SCALA))
		perno.add_child(modello)
		_prepara(modello)
		_braccia.append(perno)
		perno.transform = _guardia(lato)
		# la manica, dal polsino alla spalla
		var manica := MeshInstance3D.new()
		var c := CylinderMesh.new()
		c.bottom_radius = RAGGIO_MANICA[0]
		c.top_radius = RAGGIO_MANICA[1]
		c.height = 1.0
		c.radial_segments = 18
		c.rings = 1
		c.cap_top = false
		c.cap_bottom = false
		c.material = stoffa
		manica.mesh = c
		add_child(manica)
		_prepara(manica)
		_maniche.append(manica)
	_aggiorna_maniche()
	# la luce di riempimento, da dietro e sopra gli occhi, solo sulle braccia: la lampada sta davanti, e senza questa il
	# lato delle braccia che si vede resterebbe nero ogni volta che si guarda in su
	var riempe := OmniLight3D.new()
	riempe.position = Vector3(0.0, 0.22, 0.2)
	riempe.light_color = Color(1.0, 0.86, 0.72)
	riempe.light_energy = 0.55
	riempe.light_specular = 0.25
	riempe.omni_range = 1.6
	riempe.light_cull_mask = STRATO_BRACCIA
	riempe.shadow_enabled = false
	add_child(riempe)


func _segno(lato: int) -> float:
	return 1.0 if lato == 0 else -1.0


func _mesh_in(n: Node) -> MeshInstance3D:
	if n is MeshInstance3D:
		return n
	for f in n.get_children():
		var m := _mesh_in(f)
		if m:
			return m
	return null


## la copia specchiata (x -> -x) di una mesh: le posizioni, le normali, le tangenti (e il verso della binormale), e i
## triangoli girati al contrario perche' restino rivolti verso fuori
static func _specchia(mesh: Mesh) -> ArrayMesh:
	var nuova := ArrayMesh.new()
	for k in mesh.get_surface_count():
		var a := mesh.surface_get_arrays(k)
		var v: PackedVector3Array = a[Mesh.ARRAY_VERTEX]
		for i in v.size():
			var p := v[i]
			p.x = -p.x
			v[i] = p
		a[Mesh.ARRAY_VERTEX] = v
		if a[Mesh.ARRAY_NORMAL] != null:
			var n: PackedVector3Array = a[Mesh.ARRAY_NORMAL]
			for i in n.size():
				var q := n[i]
				q.x = -q.x
				n[i] = q
			a[Mesh.ARRAY_NORMAL] = n
		if a[Mesh.ARRAY_TANGENT] != null:
			var t: PackedFloat32Array = a[Mesh.ARRAY_TANGENT]
			for i in range(0, t.size(), 4):
				t[i] = -t[i]
				t[i + 3] = -t[i + 3]
			a[Mesh.ARRAY_TANGENT] = t
		if a[Mesh.ARRAY_INDEX] != null:
			var idx: PackedInt32Array = a[Mesh.ARRAY_INDEX]
			for i in range(0, idx.size() - 2, 3):
				var tmp := idx[i + 1]
				idx[i + 1] = idx[i + 2]
				idx[i + 2] = tmp
			a[Mesh.ARRAY_INDEX] = idx
		nuova.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, a)
		nuova.surface_set_material(k, mesh.surface_get_material(k))
	return nuova


## la stoffa della camicia da lavoro, verde oliva, con una trama leggera
func _stoffa() -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(0.29, 0.3, 0.21)
	m.roughness = 1.0
	var rumore := FastNoiseLite.new()
	rumore.frequency = 0.09
	var trama := NoiseTexture2D.new()
	trama.noise = rumore
	trama.seamless = true
	trama.as_normal_map = true
	trama.bump_strength = 3.0
	trama.width = 256
	trama.height = 256
	m.normal_enabled = true
	m.normal_texture = trama
	m.uv1_scale = Vector3(3.0, 2.0, 1.0)
	return m


## le braccia non fanno ombra (sulla porta, da vicino, le ombre dei pugni sembravano altri due pugni) e stanno anche
## nello strato della luce di riempimento
func _prepara(n: Node) -> void:
	if n is GeometryInstance3D:
		n.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		n.layers = 1 | STRATO_BRACCIA
	for f in n.get_children():
		_prepara(f)


## la posa di guardia di un braccio: le nocche avanti e un po' in su, il dorso girato verso l'esterno, il gomito giu'
## e fuori. Se davanti c'e' poco spazio (un muro, la porta) il pugno arretra
func _guardia(lato: int) -> Transform3D:
	var s := _segno(lato)
	var b := Basis.from_euler(Vector3(0.5, 0.12 * s, -0.6 * s))
	var pos: Vector3 = GUARDIA[lato]
	var indietro := clampf(-pos.z + 0.1 - spazio, 0.0, 0.3)
	pos += Vector3(0.1 * s, -0.4, 1.0) * indietro
	var respiro := Vector3(0, sin(_t * 1.7 + lato) * 0.004, 0)
	var cammina := Vector3(sin(_t * 9.0) * 0.01 * s, -absf(cos(_t * 9.0)) * 0.012, 0) * passo
	var sguardo := Vector3(-_ondeggio.x, _ondeggio.y, 0) * 0.00045
	return Transform3D(b, pos + respiro + cammina + sguardo)


## lo sguardo che si muove: le braccia restano un attimo indietro
func guarda(relativo: Vector2) -> void:
	_ondeggio = (_ondeggio + relativo).limit_length(90.0)


func libero() -> bool:
	return _stati[_lato].is_empty() or _stati[_lato].fase in ["rinculo", "ritorno"]


## un pugno verso "punto" (in coordinate globali; null se non c'e' niente a portata). Parte il braccio che tocca; se
## tutti e due sono occupati il pugno aspetta il primo libero. Rende il braccio che parte (0 il destro), -1 se aspetta
func colpisci(punto: Variant) -> int:
	var lato := _lato
	if not (_stati[lato].is_empty() or _stati[lato].fase in ["rinculo", "ritorno"]):
		lato = 1 - lato
		if not (_stati[lato].is_empty() or _stati[lato].fase in ["ritorno"]):
			_in_coda = true
			return -1
	_lato = 1 - lato
	var s := _segno(lato)
	var spalla: Vector3 = SPALLE[lato]
	var bersaglio: Vector3
	var avanti := 0.0
	if punto != null:
		# il punto come lo vedrebbe la telecamera senza l'affondo di adesso; se il braccio non ci arriva, il corpo si
		# butta avanti quanto basta
		bersaglio = to_local(punto) - Vector3(0, 0, affondo)
		var resto := BRACCIO * BRACCIO - bersaglio.x * bersaglio.x - bersaglio.y * bersaglio.y
		avanti = clampf(-bersaglio.z - sqrt(resto), 0.0, AFFONDO_MAX) if resto > 0.0 else AFFONDO_MAX
		bersaglio.z += avanti
	else:
		bersaglio = Vector3(VUOTO.x * s, VUOTO.y, VUOTO.z)
	var dir := (bersaglio - spalla).normalized()
	# all'arrivo il pugno e' quasi orizzontale, il dorso in su (in guardia era girato di mezzo giro verso l'esterno)
	var b := Basis.looking_at(dir, Vector3.UP) * Basis.from_euler(Vector3(0.1, 0, -0.12 * s))
	var arrivo := Transform3D(b, bersaglio - dir * 0.004)
	var partenza := _braccia[lato].transform
	var carica := Transform3D(partenza.basis * Basis.from_euler(Vector3(-0.15, 0, 0.1 * s)), partenza.origin + Vector3(0.015 * s, -0.025, 0.06))
	_stati[lato] = {"fase": "carica", "t": 0.0, "da": partenza, "carica": carica, "arrivo": arrivo, "colpisce": punto != null, "dir": dir, "avanti": avanti, "affondo": 0.0}
	return lato


func _process(delta: float) -> void:
	_t += delta
	_ondeggio = _ondeggio.lerp(Vector2.ZERO, clampf(delta * 9.0, 0.0, 1.0))
	for lato in 2:
		var st := _stati[lato]
		if st.is_empty():
			_braccia[lato].transform = _braccia[lato].transform.interpolate_with(_guardia(lato), clampf(delta * 14.0, 0.0, 1.0))
			continue
		st.t += delta
		match st.fase:
			"carica":
				var k := _liscia(st.t / T_CARICA)
				_braccia[lato].transform = st.da.interpolate_with(st.carica, k)
				st.affondo = st.avanti * 0.15 * k
				if st.t >= T_CARICA:
					_fase(st, "colpo")
			"colpo":
				var k := 1.0 - pow(1.0 - clampf(st.t / T_COLPO, 0.0, 1.0), 3.0)
				_braccia[lato].transform = st.carica.interpolate_with(st.arrivo, k)
				st.affondo = st.avanti * lerpf(0.15, 1.0, k)
				if st.t >= T_COLPO:
					_braccia[lato].transform = st.arrivo
					st.affondo = st.avanti
					if st.colpisce:
						impatto.emit(lato)
					_fase(st, "tiene")
			"tiene":
				if st.t >= (T_TIENE if st.colpisce else 0.0):
					st.rinculo = Transform3D(st.arrivo.basis, st.arrivo.origin - st.dir * (0.07 if st.colpisce else 0.02))
					_fase(st, "rinculo")
			"rinculo":
				var k := 1.0 - pow(1.0 - clampf(st.t / T_RINCULO, 0.0, 1.0), 2.0)
				_braccia[lato].transform = st.arrivo.interpolate_with(st.rinculo, k)
				st.affondo = st.avanti * lerpf(1.0, 0.6, k)
				if st.t >= T_RINCULO:
					_fase(st, "ritorno")
			"ritorno":
				var k := _liscia(st.t / T_RITORNO)
				_braccia[lato].transform = st.rinculo.interpolate_with(_guardia(lato), k)
				st.affondo = st.avanti * 0.6 * (1.0 - k)
				if st.t >= T_RITORNO:
					_stati[lato] = {}
					if _in_coda:
						_in_coda = false
						coda_libera.emit.call_deferred()
	# l'altro braccio, mentre questo colpisce, si tira un po' indietro (la spalla gira)
	for lato in 2:
		if _stati[lato].is_empty() and not _stati[1 - lato].is_empty() and _stati[1 - lato].fase in ["carica", "colpo", "tiene"]:
			var g := _guardia(lato)
			g.origin += Vector3(0, -0.01, 0.04)
			_braccia[lato].transform = _braccia[lato].transform.interpolate_with(g, clampf(delta * 18.0, 0.0, 1.0))
	affondo = 0.0
	for st in _stati:
		if not st.is_empty():
			affondo = maxf(affondo, st.affondo)
	_aggiorna_maniche()


## la manica di ogni braccio: un cilindro dal polsino (che si muove col braccio) alla spalla (ferma, sotto la telecamera)
func _aggiorna_maniche() -> void:
	for lato in 2:
		var a: Vector3 = _braccia[lato].transform * Vector3(0, 0, INIZIO_MANICA)
		var b: Vector3 = SPALLE[lato]
		var d := b - a
		var l := d.length()
		if l < 0.01:
			_maniche[lato].visible = false
			continue
		_maniche[lato].visible = true
		var y := d / l
		var x := y.cross(Vector3(0, 0, 1) if absf(y.z) < 0.9 else Vector3(1, 0, 0)).normalized()
		var z := x.cross(y)
		_maniche[lato].transform = Transform3D(Basis(x, y * l, z), (a + b) / 2.0)


func _fase(st: Dictionary, nome: String) -> void:
	st.fase = nome
	st.t = 0.0


func _liscia(x: float) -> float:
	x = clampf(x, 0.0, 1.0)
	return x * x * (3.0 - 2.0 * x)
