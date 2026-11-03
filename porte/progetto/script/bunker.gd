extends Node3D
## Il bunker del prototipo: la stanza di cemento dove ti eri nascosto (i tubi, le casse, la lampadina nella gabbia che
## oscilla a ogni colpo), la porta di legno sgangherata nel telaio di ferro, e dietro la stanza dopo, piccola, con la
## sua luce fredda, la porta piu' robusta e il bastone per terra. Niente menu: si entra e si picchia. R rifa' la porta,
## F11 lo schermo intero, Esc libera il mouse. Con "-- --demo" si gioca da solo (per il video).

const MURO := 0.3
# la stanza: x da -1,6 a 1,6, z dalla porta (-1,6) al muro dietro (1,9), alta 2,6; la porta larga 0,9 e alta 2
const STANZA := {"x0": -1.6, "x1": 1.6, "z0": -1.6, "z1": 1.9, "h": 2.6}
const VANO := {"largo": 0.9, "alto": 2.02}
const DOPO := {"x0": -1.2, "x1": 1.2, "z0": -4.3, "z1": -1.9, "h": 2.4}

var porta: Porta
var giocatore: Giocatore
var _perno_lampada: Node3D
var _luce_lampada: OmniLight3D
var _vetro_lampada: StandardMaterial3D
var _ang_lampada := Vector2.ZERO
var _vel_lampada := Vector2.ZERO
var _sfarfallio := 0.0
var _lampo: ColorRect
var _demo := false


func _ready() -> void:
	_demo = "--demo" in OS.get_cmdline_user_args()
	if _demo:
		seed(7)
	_azioni()
	_ambiente()
	_stanza()
	_stanza_dopo()
	_lampada()
	_schermo()
	porta = Porta.new()
	porta.position = Vector3(0, 0, -1.70)
	add_child(porta)
	if _demo:
		porta.costruisci(12345)
	porta.colpita.connect(_su_colpo)
	porta.crollata.connect(_su_crollo)
	giocatore = Giocatore.new()
	giocatore.automatico = _demo
	giocatore.porta = porta
	giocatore.position = Vector3(0.05, 0, 0.55)
	add_child(giocatore)
	var ambiente := AudioStreamPlayer.new()
	var flusso: AudioStreamMP3 = load("res://suoni/bunker.mp3")
	flusso.loop = true
	ambiente.stream = flusso
	ambiente.volume_db = -15.0
	add_child(ambiente)
	ambiente.play()
	if _demo:
		_dimostrazione()


func _azioni() -> void:
	var tasti := {
		"avanti": [KEY_W, KEY_UP], "indietro": [KEY_S, KEY_DOWN], "sinistra": [KEY_A, KEY_LEFT], "destra": [KEY_D, KEY_RIGHT],
		"rifai": [KEY_R], "schermo_intero": [KEY_F11],
	}
	for nome in tasti:
		if not InputMap.has_action(nome):
			InputMap.add_action(nome)
		for k in tasti[nome]:
			var e := InputEventKey.new()
			e.physical_keycode = k
			InputMap.action_add_event(nome, e)
	var leve := {
		"avanti": [JOY_AXIS_LEFT_Y, -1.0], "indietro": [JOY_AXIS_LEFT_Y, 1.0], "sinistra": [JOY_AXIS_LEFT_X, -1.0], "destra": [JOY_AXIS_LEFT_X, 1.0],
		"guarda_su": [JOY_AXIS_RIGHT_Y, -1.0], "guarda_giu": [JOY_AXIS_RIGHT_Y, 1.0], "guarda_sinistra": [JOY_AXIS_RIGHT_X, -1.0], "guarda_destra": [JOY_AXIS_RIGHT_X, 1.0],
		"colpisci": [JOY_AXIS_TRIGGER_RIGHT, 1.0],
	}
	for nome in leve:
		if not InputMap.has_action(nome):
			InputMap.add_action(nome, 0.2)
		var e := InputEventJoypadMotion.new()
		e.axis = leve[nome][0]
		e.axis_value = leve[nome][1]
		InputMap.action_add_event(nome, e)
	var clic := InputEventMouseButton.new()
	clic.button_index = MOUSE_BUTTON_LEFT
	InputMap.action_add_event("colpisci", clic)
	for b in [JOY_BUTTON_X, JOY_BUTTON_RIGHT_SHOULDER]:
		var e := InputEventJoypadButton.new()
		e.button_index = b
		InputMap.action_add_event("colpisci", e)
	var rifai := InputEventJoypadButton.new()
	rifai.button_index = JOY_BUTTON_Y
	InputMap.action_add_event("rifai", rifai)


func _unhandled_input(e: InputEvent) -> void:
	if _demo:
		return
	if e.is_action_pressed("rifai"):
		Engine.time_scale = 1.0
		# se si e' passati di la' (o si e' sulla soglia), si torna nella stanza prima che la porta si rifaccia
		if giocatore.global_position.z < porta.global_position.z + 0.45:
			giocatore.global_position = Vector3(0.05, 0, 0.55)
			giocatore.velocity = Vector3.ZERO
		porta.costruisci()
	if e.is_action_pressed("schermo_intero") or (e is InputEventKey and e.pressed and e.keycode == KEY_ENTER and e.alt_pressed):
		var pieno := DisplayServer.window_get_mode() == DisplayServer.WINDOW_MODE_FULLSCREEN
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED if pieno else DisplayServer.WINDOW_MODE_FULLSCREEN)


# ---------- la luce, la nebbia, il colore ----------

func _ambiente() -> void:
	var we := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color.BLACK
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(0.32, 0.33, 0.38)
	e.ambient_light_energy = 0.22
	e.tonemap_mode = Environment.TONE_MAPPER_AGX
	e.tonemap_exposure = 1.05
	e.ssao_enabled = true
	e.ssao_radius = 0.9
	e.ssao_intensity = 1.8
	e.ssil_enabled = true
	e.ssil_intensity = 0.7
	e.glow_enabled = true
	e.glow_intensity = 0.55
	e.glow_bloom = 0.04
	e.glow_hdr_threshold = 1.1
	# la polvere sospesa nel bunker: la luce della lampada si vede nell'aria, e quella della stanza dopo passa dalle
	# fessure della porta a raggi
	e.volumetric_fog_enabled = true
	e.volumetric_fog_density = 0.018
	e.volumetric_fog_albedo = Color(0.86, 0.82, 0.76)
	e.volumetric_fog_anisotropy = 0.55
	e.volumetric_fog_length = 16.0
	e.adjustment_enabled = true
	e.adjustment_contrast = 1.08
	e.adjustment_saturation = 0.9
	we.environment = e
	add_child(we)


# ---------- la stanza ----------

func _stanza() -> void:
	var muri := Materiali.pbr("concrete_layers_02", 0.55)
	var pavimento := Materiali.pbr("dirty_concrete", 0.45)
	var soffitto := Materiali.pbr("concrete_wall_006", 0.6, true, Color(0.75, 0.75, 0.75))
	var ferro := Materiali.pbr("rusty_metal_02", 1.5, true, Color(0.52, 0.46, 0.42), 0.7)
	var tubi := Materiali.pbr("green_metal_rust", 2.0, true, Color.WHITE, 0.5)
	var s := STANZA
	var lv: float = VANO.largo / 2
	_blocco(Vector3(s.x0 - MURO - 0.1, -0.25, DOPO.z0 - MURO), Vector3(s.x1 + MURO + 0.1, 0.0, s.z1 + MURO), pavimento)
	_blocco(Vector3(s.x0 - MURO, s.h, s.z0), Vector3(s.x1 + MURO, s.h + 0.25, s.z1 + MURO), soffitto)
	_blocco(Vector3(s.x0 - MURO, 0, s.z1), Vector3(s.x1 + MURO, s.h, s.z1 + MURO), muri)
	_blocco(Vector3(s.x0 - MURO, 0, s.z0 - MURO), Vector3(s.x0, s.h, s.z1 + MURO), muri)
	_blocco(Vector3(s.x1, 0, s.z0 - MURO), Vector3(s.x1 + MURO, s.h, s.z1 + MURO), muri)
	# il muro della porta, col vano
	_blocco(Vector3(s.x0, 0, s.z0 - MURO), Vector3(-lv - 0.08, s.h, s.z0), muri)
	_blocco(Vector3(lv + 0.08, 0, s.z0 - MURO), Vector3(s.x1, s.h, s.z0), muri)
	_blocco(Vector3(-lv - 0.08, VANO.alto + 0.08, s.z0 - MURO), Vector3(lv + 0.08, s.h, s.z0), muri)
	# il telaio di ferro della porta, che sporge un po' nella stanza, e la soglia
	_blocco(Vector3(-lv - 0.08, 0, s.z0 - MURO), Vector3(-lv, VANO.alto + 0.08, s.z0 + 0.03), ferro)
	_blocco(Vector3(lv, 0, s.z0 - MURO), Vector3(lv + 0.08, VANO.alto + 0.08, s.z0 + 0.03), ferro)
	_blocco(Vector3(-lv, VANO.alto, s.z0 - MURO), Vector3(lv, VANO.alto + 0.08, s.z0 + 0.03), ferro)
	_blocco(Vector3(-lv, 0, s.z0 - MURO), Vector3(lv, 0.015, s.z0 + 0.02), ferro)
	# i tubi lungo il soffitto e uno in un angolo, con le staffe
	_tubo(Vector3(0, s.h - 0.16, s.z0 + 0.2), 3.2, Vector3(0, 0, PI / 2), 0.05, tubi)
	_tubo(Vector3(0, s.h - 0.24, s.z0 + 0.38), 3.2, Vector3(0, 0, PI / 2), 0.035, tubi)
	_tubo(Vector3(s.x1 - 0.14, s.h / 2, s.z1 - 0.16), s.h, Vector3.ZERO, 0.06, tubi)
	_tubo(Vector3(s.x0 + 0.12, s.h - 0.2, 0.2), 3.4, Vector3(PI / 2, 0, 0), 0.04, tubi)
	for x in [-1.2, -0.2, 0.8]:
		_blocco(Vector3(x - 0.02, s.h - 0.22, s.z0), Vector3(x + 0.02, s.h, s.z0 + 0.45), ferro)
	# le casse in un angolo, e una sopra l'altra: chi si e' nascosto qui ci ha vissuto
	var legno := Materiali.pbr("wood_peeling_paint_weathered", 1.2)
	_blocco(Vector3(s.x0 + 0.05, 0, s.z1 - 0.75), Vector3(s.x0 + 0.65, 0.55, s.z1 - 0.1), legno, 0.12)
	_blocco(Vector3(s.x0 + 0.1, 0.55, s.z1 - 0.65), Vector3(s.x0 + 0.58, 0.95, s.z1 - 0.18), legno, -0.2)
	_blocco(Vector3(s.x1 - 0.6, 0, s.z0 + 0.25), Vector3(s.x1 - 0.1, 0.45, s.z0 + 0.75), legno, 0.25)


## un blocco solido (si vede, si urta, ci rimbalzano le schegge), girato di "giro" radianti attorno al suo centro
func _blocco(a: Vector3, b: Vector3, mat: Material, giro := 0.0) -> void:
	var misure := (b - a).abs()
	var centro := (a + b) / 2
	var corpo := StaticBody3D.new()
	corpo.collision_layer = 1
	corpo.position = centro
	corpo.rotation.y = giro
	var mi := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = misure
	box.material = mat
	mi.mesh = box
	corpo.add_child(mi)
	var cs := CollisionShape3D.new()
	var sh := BoxShape3D.new()
	sh.size = misure
	cs.shape = sh
	corpo.add_child(cs)
	var urto := GPUParticlesCollisionBox3D.new()
	urto.size = misure
	corpo.add_child(urto)
	add_child(corpo)


func _tubo(centro: Vector3, lungo: float, giro: Vector3, raggio: float, mat: Material) -> void:
	var mi := MeshInstance3D.new()
	var c := CylinderMesh.new()
	c.top_radius = raggio
	c.bottom_radius = raggio
	c.height = lungo
	c.radial_segments = 20
	c.material = mat
	mi.mesh = c
	mi.position = centro
	mi.rotation = giro
	add_child(mi)


## la stanza dopo: piccola, con una luce fredda che passa dalle fessure della porta, la porta piu' robusta in fondo e
## il bastone per terra (lo strumento dopo i pugni)
func _stanza_dopo() -> void:
	var d := DOPO
	var muri := Materiali.pbr("concrete_wall_006", 0.6, true, Color(0.7, 0.72, 0.75))
	_blocco(Vector3(d.x0 - MURO, 0, d.z0 - MURO), Vector3(d.x0, d.h, d.z1), muri)
	_blocco(Vector3(d.x1, 0, d.z0 - MURO), Vector3(d.x1 + MURO, d.h, d.z1), muri)
	_blocco(Vector3(d.x0, d.h, d.z0 - MURO), Vector3(d.x1, d.h + 0.25, d.z1), muri)
	var lv: float = VANO.largo / 2
	_blocco(Vector3(d.x0, 0, d.z0 - MURO), Vector3(-lv - 0.06, d.h, d.z0), muri)
	_blocco(Vector3(lv + 0.06, 0, d.z0 - MURO), Vector3(d.x1, d.h, d.z0), muri)
	_blocco(Vector3(-lv - 0.06, VANO.alto + 0.04, d.z0 - MURO), Vector3(lv + 0.06, d.h, d.z0), muri)
	var nera := MeshInstance3D.new()
	var q := QuadMesh.new()
	q.size = Vector2(1.2, 2.2)
	var buio := StandardMaterial3D.new()
	buio.albedo_color = Color.BLACK
	q.material = buio
	nera.mesh = q
	nera.position = Vector3(0, 1.1, d.z0 - MURO + 0.01)
	add_child(nera)
	var dopo := Porta.new()
	dopo.robusta = true
	dopo.n_assi = 6
	dopo.spessore = 0.045
	dopo.position = Vector3(0, 0, d.z0 - 0.06)
	add_child(dopo)
	# il bastone, appoggiato al muro in fondo accanto alla porta (per terra finiva sotto i pezzi della porta):
	# legno chiaro e il nastro bianco dell'impugnatura, lo stesso dei pugni
	var bastone := Node3D.new()
	bastone.position = Vector3(0.7, 0.5, d.z0 + 0.1)
	bastone.rotation = Vector3(-0.18, 0.0, 0.07)
	add_child(bastone)
	var c := CylinderMesh.new()
	c.top_radius = 0.021
	c.bottom_radius = 0.026
	c.height = 1.0
	c.material = Materiali.pbr("rough_wood", 2.5, true, Color(1.35, 1.2, 1.0))
	var legno := MeshInstance3D.new()
	legno.mesh = c
	bastone.add_child(legno)
	var nastro := MeshInstance3D.new()
	var n := CylinderMesh.new()
	n.top_radius = 0.029
	n.bottom_radius = 0.029
	n.height = 0.22
	var bianco := StandardMaterial3D.new()
	bianco.albedo_color = Color(0.86, 0.82, 0.72)
	bianco.roughness = 0.95
	n.material = bianco
	nastro.mesh = n
	nastro.position.y = -0.36
	bastone.add_child(nastro)
	var luce := OmniLight3D.new()
	luce.position = Vector3(0.0, d.h - 0.25, -3.3)
	luce.light_color = Color(0.62, 0.82, 1.0)
	luce.light_energy = 3.2
	luce.omni_range = 5.5
	luce.shadow_enabled = true
	luce.light_volumetric_fog_energy = 4.0
	add_child(luce)


# ---------- la lampadina nella gabbia ----------

func _lampada() -> void:
	_perno_lampada = Node3D.new()
	_perno_lampada.position = Vector3(0.05, STANZA.h, -0.15)
	add_child(_perno_lampada)
	var scuro := Materiali.pbr("rusty_metal_02", 4.0, true, Color(0.35, 0.33, 0.3), 0.8)
	var filo := MeshInstance3D.new()
	var f := CylinderMesh.new()
	f.top_radius = 0.005
	f.bottom_radius = 0.005
	f.height = 0.5
	f.material = scuro
	filo.mesh = f
	filo.position.y = -0.25
	_perno_lampada.add_child(filo)
	var bulbo := MeshInstance3D.new()
	var sfera := SphereMesh.new()
	sfera.radius = 0.04
	sfera.height = 0.1
	_vetro_lampada = StandardMaterial3D.new()
	_vetro_lampada.albedo_color = Color(1.0, 0.85, 0.6)
	_vetro_lampada.emission_enabled = true
	_vetro_lampada.emission = Color(1.0, 0.7, 0.4)
	_vetro_lampada.emission_energy_multiplier = 9.0
	sfera.material = _vetro_lampada
	bulbo.mesh = sfera
	bulbo.position.y = -0.56
	bulbo.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_perno_lampada.add_child(bulbo)
	# la gabbia: due anelli e quattro sbarre
	for y in [-0.5, -0.62]:
		var anello := MeshInstance3D.new()
		var t := TorusMesh.new()
		t.inner_radius = 0.062
		t.outer_radius = 0.07
		t.material = scuro
		anello.mesh = t
		anello.position.y = y
		anello.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		_perno_lampada.add_child(anello)
	for i in 4:
		var sbarra := MeshInstance3D.new()
		var c := CylinderMesh.new()
		c.top_radius = 0.0025
		c.bottom_radius = 0.0025
		c.height = 0.15
		c.material = scuro
		sbarra.mesh = c
		var ang := i * PI / 2 + PI / 4
		sbarra.position = Vector3(cos(ang) * 0.066, -0.56, sin(ang) * 0.066)
		_perno_lampada.add_child(sbarra)
	_luce_lampada = OmniLight3D.new()
	_luce_lampada.position.y = -0.56
	_luce_lampada.light_color = Color(1.0, 0.74, 0.46)
	_luce_lampada.light_energy = 2.3
	_luce_lampada.omni_range = 8.0
	_luce_lampada.omni_attenuation = 1.2
	_luce_lampada.shadow_enabled = true
	_luce_lampada.light_size = 0.08
	_luce_lampada.shadow_bias = 0.04
	_luce_lampada.light_volumetric_fog_energy = 0.7
	_perno_lampada.add_child(_luce_lampada)


func _process(delta: float) -> void:
	# la lampada oscilla come un pendolo e si ferma piano
	_vel_lampada += (-14.0 * _ang_lampada - 0.9 * _vel_lampada) * delta
	_ang_lampada += _vel_lampada * delta
	_perno_lampada.rotation = Vector3(_ang_lampada.x, 0, _ang_lampada.y)
	# lo sfarfallio dopo i colpi forti
	var luce := 1.0
	if _sfarfallio > 0.0:
		_sfarfallio -= delta
		luce = randf_range(0.15, 1.0) if randf() < 0.6 else 1.0
	_luce_lampada.light_energy = 2.3 * luce
	_vetro_lampada.emission_energy_multiplier = 9.0 * luce
	if _lampo.color.a > 0.0:
		_lampo.color.a = maxf(0.0, _lampo.color.a - delta * 6.0)


## ogni colpo fa tremare il bunker: la lampada oscilla, e se il colpo e' forte sfarfalla
func _su_colpo(forza: float) -> void:
	_vel_lampada += Vector2(randf_range(-1, 1), randf_range(-0.3, 0.6)).normalized() * forza * 0.35
	if forza > 1.3 or randf() < 0.12:
		_sfarfallio = 0.18 + forza * 0.08
		Effetti.suona("lampada", _luce_lampada.global_position, -10.0)


## la porta esplode: il rallentatore, il boato, la nuvola di polvere e di schegge, il lampo
func _su_crollo(dove: Vector3) -> void:
	Effetti.rallenta(0.22, 0.85, 0.9)
	Effetti.suona("esplode", dove, 4.0, 0.02, 0.92)
	Effetti.suona("crepa", dove, 2.0)
	Effetti.schegge(dove, Vector3(0, 0.25, 1).normalized(), 260, 1.7)
	Effetti.polvere(dove, Vector3(0, 0.2, 1).normalized(), 36, 1.5)
	Effetti.polvere(Vector3(0, VANO.alto, STANZA.z0), Vector3.DOWN, 16, 1.0)
	_vel_lampada += Vector2(1.2, 0.4)
	_sfarfallio = 0.6
	_lampo.color.a = 0.35
	get_tree().create_timer(0.7, true, false, true).timeout.connect(func(): Effetti.suona("detriti", dove + Vector3(0, -1, -0.8), 0.0))


# ---------- sullo schermo: solo un puntino al centro, la vignetta e il lampo ----------

func _schermo() -> void:
	var livello := CanvasLayer.new()
	add_child(livello)
	var vignetta := ColorRect.new()
	vignetta.set_anchors_preset(Control.PRESET_FULL_RECT)
	vignetta.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sh := Shader.new()
	sh.code = """shader_type canvas_item;
void fragment() {
	vec2 uv = SCREEN_UV - 0.5;
	float v = smoothstep(0.32, 0.95, length(uv * vec2(1.0, 1.15)));
	COLOR = vec4(0.0, 0.0, 0.0, v * 0.72);
}"""
	var m := ShaderMaterial.new()
	m.shader = sh
	vignetta.material = m
	livello.add_child(vignetta)
	_lampo = ColorRect.new()
	_lampo.set_anchors_preset(Control.PRESET_FULL_RECT)
	_lampo.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_lampo.color = Color(1.0, 0.95, 0.85, 0.0)
	livello.add_child(_lampo)
	if _demo:
		return
	var punto := Panel.new()
	var stile := StyleBoxFlat.new()
	stile.bg_color = Color(1, 1, 1, 0.55)
	stile.set_corner_radius_all(3)
	punto.add_theme_stylebox_override("panel", stile)
	punto.size = Vector2(5, 5)
	punto.set_anchors_preset(Control.PRESET_CENTER)
	punto.position -= Vector2(2.5, 2.5)
	punto.mouse_filter = Control.MOUSE_FILTER_IGNORE
	livello.add_child(punto)


# ---------- la dimostrazione, per il video: si gioca da solo ----------

func _attendi(s: float) -> void:
	await get_tree().create_timer(s, true, false, true).timeout


func _mira(punto: Vector3, durata: float) -> void:
	var t := 0.0
	while t < durata:
		await get_tree().process_frame
		var dt := get_process_delta_time() / maxf(Engine.time_scale, 0.001)
		t += dt
		giocatore.guarda_verso(punto, clampf(dt * 5.5, 0.0, 1.0))


## il punto della porta piu' vicino a "p" dove c'e' un'asse, non una traversa (sulle traverse i pugni non rompono
## niente: nella dimostrazione non si sprecano)
func _punto_libero(p: Vector3) -> Vector3:
	var occhi := giocatore.camera.global_position
	var spazio := get_world_3d().direct_space_state
	for d in [Vector2.ZERO, Vector2(0, 0.08), Vector2(0, -0.08), Vector2(0.06, 0), Vector2(-0.06, 0), Vector2(0, 0.16), Vector2(0, -0.16), Vector2(0.06, 0.12), Vector2(-0.06, -0.12)]:
		var q := p + Vector3(d.x, d.y, 0)
		var hit := spazio.intersect_ray(PhysicsRayQueryParameters3D.create(occhi, occhi + (q - occhi).normalized() * 2.0, Porta.STRATO_PORTA))
		if hit and hit.collider.has_meta("asse"):
			return q
	return p


func _dimostrazione() -> void:
	# in ogni caso, dopo un minuto la dimostrazione finisce (se qualcosa va storto il video non gira all'infinito)
	get_tree().create_timer(60.0, true, false, true).timeout.connect(get_tree().quit)
	var z := porta.global_position.z + 0.01
	await _attendi(0.3)
	# uno sguardo alla lampada, poi alla porta
	await _mira(Vector3(0.1, 2.0, -0.4), 1.0)
	await _mira(Vector3(0.0, 1.2, z), 1.1)
	giocatore.cammina_verso(Vector2(0, -0.55))
	while giocatore.global_position.z > porta.global_position.z + 0.87:
		await get_tree().physics_frame
	giocatore.cammina_verso(Vector2.ZERO)
	await _attendi(0.3)
	# tre assi, all'altezza del petto: tre colpi o quattro per asse, poi la porta cede
	var colpi := [
		Vector3(0.0, 1.45, z), Vector3(0.02, 1.37, z), Vector3(-0.01, 1.3, z), Vector3(0.0, 1.4, z),
		Vector3(-0.18, 1.42, z), Vector3(-0.19, 1.34, z), Vector3(-0.17, 1.27, z), Vector3(-0.18, 1.38, z),
		Vector3(0.18, 1.44, z), Vector3(0.19, 1.36, z), Vector3(0.17, 1.28, z), Vector3(0.18, 1.4, z),
		Vector3(0.03, 1.35, z), Vector3(0.0, 1.3, z),
	]
	for p in colpi:
		if porta.rotta:
			break
		await _mira(_punto_libero(p), 0.12)
		giocatore.pugno()
		await _attendi(0.34 if not porta.cede else 0.7)
	while not porta.rotta:
		await _mira(_punto_libero(Vector3(0.0, 1.35, z)), 0.1)
		giocatore.pugno()
		await _attendi(0.4)
	await _attendi(1.6)
	# i pezzi della porta, poi di la': la stanza dopo, la porta piu' robusta e il bastone; due passi verso la soglia
	await _mira(Vector3(0.1, 0.1, -2.6), 1.4)
	giocatore.cammina_verso(Vector2(0, -0.35))
	await _mira(Vector3(0.6, 0.7, DOPO.z0 + 0.1), 1.3)
	giocatore.cammina_verso(Vector2.ZERO)
	await _mira(Vector3(0.6, 0.6, DOPO.z0 + 0.1), 1.4)
	get_tree().quit()
