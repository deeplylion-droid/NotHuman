class_name Giocatore
extends CharacterBody3D
## Chi sta chiuso nel bunker, in prima persona: il mouse (o la levetta destra) gira lo sguardo, WASD (o la levetta
## sinistra) cammina, il clic (o il grilletto destro) tira un pugno. Qui ci sono anche le cose che fanno sentire il
## colpo: la telecamera che trema e scatta indietro, l'inquadratura che si allarga un attimo, la vibrazione del
## controller, il fermo immagine e i suoni a strati.

const VELOCITA := 2.6
const ALTEZZA_OCCHI := 1.62
const PORTATA := 0.9
const SENSIBILITA := 0.0024
const STRATO_PORTA := 2

var porta: Porta
var automatico := false  # nella dimostrazione per il video: niente mouse ne' tasti, lo guida bunker.gd

var testa: Node3D
var camera: Camera3D
var pugni: Pugni
var _yaw := 0.0
var _pitch := 0.0
var _scossa := 0.0  # il "trauma": cresce con i colpi, cala da solo; la telecamera trema col suo quadrato
var _scatto := 0.0  # la telecamera che salta su all'impatto e torna
var _fov_extra := 0.0
var _rumore := FastNoiseLite.new()
var _t := 0.0
var _bersagli: Array = [null, null]
var _cammina_auto := Vector2.ZERO
var _rollio := 0.0  # la testa che si piega un poco dalla parte opposta al pugno


func _ready() -> void:
	collision_layer = 8
	collision_mask = 1 | STRATO_PORTA
	var forma := CollisionShape3D.new()
	var capsula := CapsuleShape3D.new()
	capsula.radius = 0.3
	capsula.height = 1.75
	forma.shape = capsula
	forma.position.y = 0.875
	add_child(forma)
	testa = Node3D.new()
	testa.position.y = ALTEZZA_OCCHI
	add_child(testa)
	camera = Camera3D.new()
	camera.fov = 72.0
	camera.near = 0.02
	camera.far = 60.0
	camera.current = true
	testa.add_child(camera)
	pugni = Pugni.new()
	camera.add_child(pugni)
	pugni.impatto.connect(_impatto)
	pugni.coda_libera.connect(pugno)
	_rumore.frequency = 0.9
	_yaw = rotation.y
	if not automatico:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


func _unhandled_input(e: InputEvent) -> void:
	if automatico:
		return
	if e is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		guarda_di(e.relative * SENSIBILITA)
	if e is InputEventMouseButton and e.pressed and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
		get_viewport().set_input_as_handled()
		return
	if e.is_action_pressed("colpisci"):
		pugno()
	if e.is_action_pressed("ui_cancel"):
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE


## gira lo sguardo di "d" radianti (x: a destra, y: in giu')
func guarda_di(d: Vector2) -> void:
	_yaw -= d.x
	_pitch = clampf(_pitch - d.y, -1.45, 1.45)
	pugni.guarda(d / SENSIBILITA * 0.35)


## lo sguardo verso un punto, piano piano (la dimostrazione)
func guarda_verso(punto: Vector3, quanto: float) -> void:
	var dir := (punto - camera.global_position).normalized()
	var yaw := atan2(-dir.x, -dir.z)
	var pitch := asin(clampf(dir.y, -1.0, 1.0))
	var dy := wrapf(yaw - _yaw, -PI, PI)
	var vecchio := Vector2(_yaw, _pitch)
	_yaw += dy * quanto
	_pitch = lerpf(_pitch, pitch, quanto)
	pugni.guarda((Vector2(_yaw, _pitch) - vecchio) * -400.0)


func cammina_verso(dir: Vector2) -> void:
	_cammina_auto = dir


## un pugno: il raggio dalla telecamera trova cosa c'e' a portata (solo la porta), il braccio parte; il colpo arriva
## quando le nocche toccano il legno (_impatto)
func pugno() -> void:
	var da := camera.global_position
	var a := da - camera.global_transform.basis.z * PORTATA
	var q := PhysicsRayQueryParameters3D.create(da, a, STRATO_PORTA)
	var hit := get_world_3d().direct_space_state.intersect_ray(q)
	var punto: Variant = hit.position if hit else null
	var lato := pugni.colpisci(punto)
	if lato < 0:
		return
	_bersagli[lato] = hit if hit else null
	_rollio = 0.02 if lato == 0 else -0.02
	Effetti.suona("fruscio", da + camera.global_transform.basis * Vector3(0, -0.2, -0.3), -10.0, 0.12)


func _impatto(lato: int) -> void:
	var hit = _bersagli[lato]
	if hit == null or not is_instance_valid(hit.collider) or porta == null:
		return
	var dir := -camera.global_transform.basis.z
	var forza := randf_range(0.9, 1.15)
	var esito := porta.colpisci(hit.collider, hit.position, hit.normal, dir, forza)
	var p: Vector3 = hit.position
	var n: Vector3 = hit.normal
	# i suoni: le nocche, il legno, e se cede le crepe e l'asse che si stacca; piu' forte se la porta sta per cedere
	Effetti.suona("nocche", p, -4.0)
	Effetti.suona("pugno", p, 0.0 if not porta.cede else 3.0)
	if randf() < 0.45 or esito.crepa:
		Effetti.suona("cardini", p, -9.0)
	if esito.crepa:
		Effetti.suona("crepa", p, -1.0)
	if esito.spaccata:
		Effetti.suona("asse", p, 2.0)
		Effetti.suona("crepa", p, 0.0, 0.15)
	# le schegge e la polvere, di piu' quando qualcosa si rompe
	if not esito.crollo:
		Effetti.schegge(p + n * 0.01, n, 70 if esito.spaccata else (28 if esito.crepa else 14), 1.3 if esito.spaccata else 1.0)
		Effetti.polvere(p + n * 0.06, n, 26 if esito.spaccata else 10, 1.4 if esito.spaccata else 0.8)
	# quello che si sente nel corpo: il fermo, la telecamera, la vibrazione
	if esito.crollo:
		scuoti(1.0)
		_scatto = 0.09
		_fov_extra = 9.0
		Input.start_joy_vibration(0, 1.0, 1.0, 0.7)
	elif esito.spaccata:
		Effetti.fermo(0.11)
		scuoti(0.55)
		_scatto = 0.05
		_fov_extra = 4.5
		Input.start_joy_vibration(0, 0.8, 1.0, 0.25)
	else:
		Effetti.fermo(0.06 if not esito.crepa else 0.08)
		scuoti(0.28 if not esito.crepa else 0.38)
		_scatto = 0.025
		_fov_extra = 2.0
		Input.start_joy_vibration(0, 0.5, 0.6, 0.12)


func scuoti(quanto: float) -> void:
	_scossa = clampf(maxf(_scossa, 0.0) + quanto, 0.0, 1.0)


func _process(delta: float) -> void:
	_t += delta
	if not automatico:
		var leva := Input.get_vector("guarda_sinistra", "guarda_destra", "guarda_su", "guarda_giu")
		if leva.length() > 0.1:
			guarda_di(leva * delta * 2.6)
	rotation.y = _yaw
	# la telecamera: lo sguardo, lo scatto all'impatto, il tremore (rumore, non a caso: trema come una cosa vera)
	_scossa = maxf(0.0, _scossa - delta * 1.6)
	var tr := _scossa * _scossa
	_scatto = lerpf(_scatto, 0.0, clampf(delta * 12.0, 0.0, 1.0))
	_rollio = lerpf(_rollio, 0.0, clampf(delta * 5.0, 0.0, 1.0))
	camera.rotation = Vector3(
		_pitch + _scatto + tr * 0.06 * _rumore.get_noise_2d(_t * 40.0, 0.0),
		tr * 0.06 * _rumore.get_noise_2d(0.0, _t * 40.0),
		_rollio + tr * 0.05 * _rumore.get_noise_2d(_t * 40.0, 50.0))
	# il tremore, e l'affondo: quando la porta e' un po' piu' in la' del braccio, il corpo si butta avanti col pugno
	camera.position = Vector3(_rumore.get_noise_2d(_t * 30.0, 100.0), _rumore.get_noise_2d(100.0, _t * 30.0), 0) * tr * 0.03
	camera.position.z -= pugni.affondo
	_fov_extra = lerpf(_fov_extra, 0.0, clampf(delta * 8.0, 0.0, 1.0))
	camera.fov = 72.0 + _fov_extra
	# la testa che ondeggia camminando
	var v := Vector2(velocity.x, velocity.z).length() / VELOCITA
	pugni.passo = lerpf(pugni.passo, clampf(v, 0.0, 1.0), clampf(delta * 6.0, 0.0, 1.0))
	testa.position.y = ALTEZZA_OCCHI + sin(_t * 9.0) * 0.018 * pugni.passo


func _physics_process(delta: float) -> void:
	# quanto spazio c'e' davanti agli occhi: se si e' contro il muro o la porta, i pugni in guardia arretrano
	var da := testa.global_position
	var q := PhysicsRayQueryParameters3D.create(da, da - camera.global_transform.basis.z * 0.8, 1 | STRATO_PORTA)
	var hit := get_world_3d().direct_space_state.intersect_ray(q)
	pugni.spazio = da.distance_to(hit.position) if hit else 2.0
	var dir2 := _cammina_auto if automatico else Input.get_vector("sinistra", "destra", "avanti", "indietro")
	var dir := (transform.basis * Vector3(dir2.x, 0, dir2.y))
	dir.y = 0
	var voluta := dir.limit_length(1.0) * VELOCITA
	velocity.x = move_toward(velocity.x, voluta.x, delta * 14.0)
	velocity.z = move_toward(velocity.z, voluta.z, delta * 14.0)
	if not is_on_floor():
		velocity.y -= 9.8 * delta
	else:
		velocity.y = 0.0
	move_and_slide()
