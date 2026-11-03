class_name Pugni
extends Node3D
## Le braccia in prima persona (il modello di Meshy da porte/art/pugni, il sinistro e' il destro specchiato), figlie
## della telecamera. In guardia ondeggiano col respiro, coi passi e con lo sguardo (restano un attimo indietro); il
## pugno parte da un braccio alla volta: carica, colpo fino al punto della porta (le nocche toccano davvero il legno),
## l'impatto, il rinculo e il ritorno in guardia.

signal impatto(lato: int)
## un pugno chiesto mentre le braccia erano tutte e due occupate: ora si puo' tirare
signal coda_libera

const MODELLO := preload("res://modelli/pugno.glb")
# il modello e' lungo 1,9 lungo z, con il pugno verso +z: la punta delle nocche a z = 0,95
const PUNTA_MODELLO := 0.95
const SCALA := 0.21
# la guardia (in metri, rispetto alla telecamera): le nocche in basso ai lati, i gomiti fuori dallo schermo
const GUARDIA := [Vector3(0.19, -0.19, -0.40), Vector3(-0.19, -0.19, -0.40)]
const SPALLE := [Vector3(0.22, -0.32, 0.06), Vector3(-0.22, -0.32, 0.06)]
const PORTATA := 0.62
# i tempi del pugno, in secondi
const T_CARICA := 0.055
const T_COLPO := 0.065
const T_TIENE := 0.03
const T_RINCULO := 0.08
const T_RITORNO := 0.17

var passo := 0.0  # 0..1, quanto si cammina (lo dice il giocatore)
var _braccia: Array[Node3D] = []
var _stati: Array[Dictionary] = [{}, {}]
var _lato := 0
var _in_coda := false
var _ondeggio := Vector2.ZERO
var _t := 0.0


func _ready() -> void:
	for lato in 2:
		var perno := Node3D.new()
		add_child(perno)
		var modello: Node3D = MODELLO.instantiate()
		# il pugno avanti (-z), la punta delle nocche nell'origine del perno; il sinistro specchiato
		modello.transform = Transform3D(Basis(Vector3.UP, PI).scaled(Vector3(-1 if lato == 1 else 1, 1, 1) * SCALA), Vector3(0, 0, PUNTA_MODELLO * SCALA))
		perno.add_child(modello)
		_ombre(modello)
		_braccia.append(perno)
		perno.transform = _guardia(lato)


func _ombre(n: Node) -> void:
	for f in n.get_children():
		if f is GeometryInstance3D:
			f.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		_ombre(f)


## la posa di guardia di un braccio: le nocche un po' verso l'interno e in su, il gomito giu' e fuori
func _guardia(lato: int) -> Transform3D:
	var s := 1.0 if lato == 0 else -1.0
	var b := Basis.from_euler(Vector3(0.62, 0.16 * s, -0.5 * s))
	var respiro := Vector3(0, sin(_t * 1.7 + lato) * 0.004, 0)
	var cammina := Vector3(sin(_t * 9.0) * 0.01 * s, -absf(cos(_t * 9.0)) * 0.012, 0) * passo
	var sguardo := Vector3(-_ondeggio.x, _ondeggio.y, 0) * 0.00045
	return Transform3D(b, GUARDIA[lato] + respiro + cammina + sguardo)


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
	var arrivo: Transform3D
	var spalla: Vector3 = SPALLE[lato]
	var bersaglio: Vector3
	if punto != null:
		bersaglio = to_local(punto)
	else:
		bersaglio = Vector3(0.05 * (1.0 if lato == 0 else -1.0), -0.06, -PORTATA)
	var dir := (bersaglio - spalla).normalized()
	var s := 1.0 if lato == 0 else -1.0
	var b := Basis.looking_at(dir, Vector3.UP) * Basis.from_euler(Vector3(0.15, 0, -0.35 * s))
	arrivo = Transform3D(b, bersaglio - dir * 0.004)
	var partenza := _braccia[lato].transform
	var carica := Transform3D(partenza.basis * Basis.from_euler(Vector3(-0.15, 0, 0.1 * s)), partenza.origin + Vector3(0.015 * s, -0.025, 0.06))
	_stati[lato] = {"fase": "carica", "t": 0.0, "da": partenza, "carica": carica, "arrivo": arrivo, "colpisce": punto != null, "dir": dir}
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
				if st.t >= T_CARICA:
					_fase(st, "colpo")
			"colpo":
				var k := 1.0 - pow(1.0 - clampf(st.t / T_COLPO, 0.0, 1.0), 3.0)
				_braccia[lato].transform = st.carica.interpolate_with(st.arrivo, k)
				if st.t >= T_COLPO:
					_braccia[lato].transform = st.arrivo
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
				if st.t >= T_RINCULO:
					_fase(st, "ritorno")
			"ritorno":
				var k := _liscia(st.t / T_RITORNO)
				_braccia[lato].transform = st.rinculo.interpolate_with(_guardia(lato), k)
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


func _fase(st: Dictionary, nome: String) -> void:
	st.fase = nome
	st.t = 0.0


func _liscia(x: float) -> float:
	x = clampf(x, 0.0, 1.0)
	return x * x * (3.0 - 2.0 * x)
