extends Node
## Gli effetti dei colpi, per tutti (caricato da solo: Effetti): i suoni a strati, le schegge e la polvere, le crepe sul
## legno, il fermo immagine all'impatto e il rallentatore dell'ultimo colpo.

# i suoni (porte/art/suoni, ElevenLabs su fal): per ogni nome le varianti, una a caso a ogni colpo
const SUONI := {
	"pugno": ["pugno_a", "pugno_b", "pugno_c"],
	"nocche": ["nocche"],
	"crepa": ["crepa_a", "crepa_b"],
	"asse": ["asse_rotta"],
	"esplode": ["porta_esplode"],
	"detriti": ["detriti"],
	"fruscio": ["fruscio_a", "fruscio_b"],
	"cardini": ["cardini"],
	"lampada": ["lampada"],
}

var _flussi := {}
var _crepe: Array[Texture2D] = []
var _crepe_nor: Array[Texture2D] = []
var _legno_scheggia: StandardMaterial3D
var _polvere_mat: StandardMaterial3D
var _scheggia_mesh: BoxMesh
var _rallenta_fino := 0.0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	# il limitatore sull'uscita: i suoni di un colpo si sommano (nocche, legno, cardini, crepe) e senza questo l'audio
	# satura e gracchia; prima del limitatore tutto 4 dB piu' basso
	var limite := AudioEffectHardLimiter.new()
	limite.pre_gain_db = -4.0
	limite.ceiling_db = -0.5
	limite.release = 0.15
	AudioServer.add_bus_effect(0, limite)
	for nome in SUONI:
		_flussi[nome] = SUONI[nome].map(func(f): return load("res://suoni/%s.mp3" % f))
	for i in 3:
		_crepe.append(load("res://texture/effetti/crepa_%d.png" % i))
		_crepe_nor.append(load("res://texture/effetti/crepa_%d_nor.png" % i))
	# le schegge: listelli sottili di legno chiaro, quello vivo che c'e' dentro le assi
	_legno_scheggia = StandardMaterial3D.new()
	_legno_scheggia.albedo_texture = load("res://texture/rough_wood/diff.jpg")
	_legno_scheggia.albedo_color = Color(1.25, 1.1, 0.9)
	_legno_scheggia.roughness = 0.9
	_scheggia_mesh = BoxMesh.new()
	_scheggia_mesh.size = Vector3(0.007, 0.05, 0.004)
	_scheggia_mesh.material = _legno_scheggia
	# la polvere: macchie morbide rivolte sempre verso chi guarda, illuminate dalla lampada
	_polvere_mat = StandardMaterial3D.new()
	_polvere_mat.albedo_texture = load("res://texture/effetti/polvere.png")
	_polvere_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_polvere_mat.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	_polvere_mat.vertex_color_use_as_albedo = true
	_polvere_mat.shading_mode = BaseMaterial3D.SHADING_MODE_PER_VERTEX
	_polvere_mat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	# dove la nuvola entra nella porta o nel muro sfuma, invece di tagliarsi con un bordo dritto
	_polvere_mat.proximity_fade_enabled = true
	_polvere_mat.proximity_fade_distance = 0.25


# ---------- i suoni ----------

## un suono nel punto dato, una variante a caso, con un po' di intonazione diversa ogni volta
func suona(nome: String, dove: Vector3, volume_db := 0.0, varia := 0.08, tono := 1.0) -> void:
	var lista: Array = _flussi.get(nome, [])
	if lista.is_empty():
		return
	var p := AudioStreamPlayer3D.new()
	p.stream = lista.pick_random()
	p.volume_db = volume_db
	p.pitch_scale = tono * randf_range(1.0 - varia, 1.0 + varia)
	p.unit_size = 4.0
	p.max_db = 6.0
	p.attenuation_model = AudioStreamPlayer3D.ATTENUATION_INVERSE_DISTANCE
	p.process_mode = Node.PROCESS_MODE_ALWAYS
	get_tree().current_scene.add_child(p)
	p.global_position = dove
	p.play()
	p.finished.connect(p.queue_free)


# ---------- le schegge e la polvere ----------

## le schegge che saltano dal punto colpito, verso chi colpisce e di lato; quante: poche a ogni pugno, tante quando
## un'asse si rompe, tantissime alla fine
func schegge(dove: Vector3, normale: Vector3, quante: int, forza := 1.0) -> void:
	var p := GPUParticles3D.new()
	p.one_shot = true
	p.explosiveness = 0.95
	p.amount = quante
	p.lifetime = 5.0
	p.draw_pass_1 = _scheggia_mesh
	p.collision_base_size = 0.01
	var m := ParticleProcessMaterial.new()
	m.direction = normale
	m.spread = 55.0
	m.initial_velocity_min = 1.2 * forza
	m.initial_velocity_max = 3.8 * forza
	m.gravity = Vector3(0, -9.8, 0)
	m.damping_min = 0.2
	m.damping_max = 0.8
	m.scale_min = 0.5
	m.scale_max = 1.8
	m.particle_flag_align_y = true
	m.collision_mode = ParticleProcessMaterial.COLLISION_RIGID
	m.collision_bounce = 0.25
	m.collision_friction = 0.7
	m.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
	m.emission_sphere_radius = 0.03
	m.hue_variation_min = -0.03
	m.hue_variation_max = 0.03
	p.process_material = m
	p.visibility_aabb = AABB(Vector3(-4, -3, -4), Vector3(8, 6, 8))
	_metti(p, dove, p.lifetime + 1.0)
	p.emitting = true


## uno sbuffo di polvere di legno e di intonaco dove arriva il colpo
func polvere(dove: Vector3, normale: Vector3, quante: int, grandezza := 1.0) -> void:
	var p := GPUParticles3D.new()
	p.one_shot = true
	p.explosiveness = 0.9
	p.amount = quante
	p.lifetime = 2.2
	var quad := QuadMesh.new()
	quad.size = Vector2(0.24, 0.24) * grandezza
	quad.material = _polvere_mat
	p.draw_pass_1 = quad
	var m := ParticleProcessMaterial.new()
	m.direction = normale
	m.spread = 70.0
	m.initial_velocity_min = 0.2
	m.initial_velocity_max = 1.1 * grandezza
	m.gravity = Vector3(0, -0.15, 0)
	m.damping_min = 1.5
	m.damping_max = 2.5
	m.angle_min = -180.0
	m.angle_max = 180.0
	m.scale_min = 0.6
	m.scale_max = 1.4
	var crescita := Curve.new()
	crescita.add_point(Vector2(0, 0.35))
	crescita.add_point(Vector2(1, 1.6))
	var ct := CurveTexture.new()
	ct.curve = crescita
	m.scale_curve = ct
	var rampa := Gradient.new()
	rampa.set_color(0, Color(0.46, 0.41, 0.35, 0.3))
	rampa.set_color(1, Color(0.4, 0.37, 0.33, 0.0))
	var gt := GradientTexture1D.new()
	gt.gradient = rampa
	m.color_ramp = gt
	m.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
	m.emission_sphere_radius = 0.05 * grandezza
	p.process_material = m
	p.visibility_aabb = AABB(Vector3(-4, -3, -4), Vector3(8, 6, 8))
	_metti(p, dove, p.lifetime + 0.5)
	p.emitting = true


func _metti(n: Node3D, dove: Vector3, vita: float) -> void:
	get_tree().current_scene.add_child(n)
	n.global_position = dove
	get_tree().create_timer(vita, true, false, true).timeout.connect(n.queue_free)


# ---------- le crepe ----------

## una crepa (un'ammaccatura con le crepe attorno) proiettata sul legno nel punto colpito, attaccata al pezzo di porta
## che la porta con se' se vola via. Solo sul legno della porta (lo strato 2 delle cose che la ricevono)
func crepa(pezzo: Node3D, dove: Vector3, normale: Vector3, grandezza := 0.2) -> Decal:
	var d := Decal.new()
	var i := randi() % _crepe.size()
	d.texture_albedo = _crepe[i]
	d.texture_normal = _crepe_nor[i]
	d.size = Vector3(grandezza, 0.08, grandezza * randf_range(1.1, 1.5))
	d.cull_mask = 2
	d.normal_fade = 0.3
	d.upper_fade = 0.2
	d.lower_fade = 0.2
	pezzo.add_child(d)
	# le decal proiettano lungo il loro -Y: Y verso fuori dalla superficie, girata a caso attorno alla normale
	var y := normale.normalized()
	var x := y.cross(Vector3.UP if absf(y.y) < 0.9 else Vector3.RIGHT).normalized().rotated(y, randf() * TAU)
	d.global_transform = Transform3D(Basis(x, y, x.cross(y)), dove)
	return d


# ---------- il tempo: il fermo all'impatto e il rallentatore ----------

## il fermo immagine: per un istante tutto si ferma (il pugno "pesa"), poi riparte
func fermo(durata: float) -> void:
	if _rallenta_fino > Time.get_ticks_msec() / 1000.0:
		return
	Engine.time_scale = 0.03
	await get_tree().create_timer(durata, true, false, true).timeout
	if _rallenta_fino <= Time.get_ticks_msec() / 1000.0:
		Engine.time_scale = 1.0


## il rallentatore dell'ultimo colpo: scala per "durata" secondi veri, poi torna a velocita' normale piano piano
func rallenta(scala: float, durata: float, ritorno := 0.6) -> void:
	_rallenta_fino = Time.get_ticks_msec() / 1000.0 + durata + ritorno
	Engine.time_scale = scala
	await get_tree().create_timer(durata, true, false, true).timeout
	var t := 0.0
	while t < ritorno:
		await get_tree().process_frame
		t += get_process_delta_time() / maxf(Engine.time_scale, 0.001)
		Engine.time_scale = lerpf(scala, 1.0, smoothstep(0.0, 1.0, t / ritorno))
	Engine.time_scale = 1.0
