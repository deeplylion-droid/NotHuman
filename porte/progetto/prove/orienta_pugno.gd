extends Node3D
## prova: il modello del pugno col dorso in su (roll 315 gradi nel perno), visto da sopra, da davanti, da sinistra e
## da destra, per capire da che parte sta il pollice (godot --path . res://prove/orienta.tscn -- <cartella>)
func _ready() -> void:
	var cartella: String = OS.get_cmdline_user_args()[0] if OS.get_cmdline_user_args().size() > 0 else "res://prove"
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0.3, 0.3, 0.32)
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color.WHITE
	e.ambient_light_energy = 0.7
	env.environment = e
	add_child(env)
	var sole := DirectionalLight3D.new()
	sole.rotation = Vector3(-1.0, 0.3, 0)
	add_child(sole)
	var modello: PackedScene = load("res://modelli/pugno.glb")
	var perno := Node3D.new()
	var m: Node3D = modello.instantiate()
	m.transform = Transform3D(Basis(Vector3.UP, PI).scaled(Vector3.ONE * 0.21), Vector3(0, 0, 0.95 * 0.21))
	perno.add_child(m)
	add_child(perno)
	perno.transform = Transform3D(Basis(Vector3(0, 0, 1), deg_to_rad(315.0)), Vector3.ZERO)
	# un cubetto rosso a sinistra (-x) del pugno, per orientarsi
	var segno := MeshInstance3D.new()
	var cubo := BoxMesh.new()
	cubo.size = Vector3.ONE * 0.02
	var mr := StandardMaterial3D.new()
	mr.albedo_color = Color.RED
	mr.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	cubo.material = mr
	segno.mesh = cubo
	segno.position = Vector3(-0.09, 0, -0.04)
	add_child(segno)
	var cam := Camera3D.new()
	cam.fov = 30
	add_child(cam)
	var viste := {"davanti": Vector3(0, 0.03, -0.3), "sotto": Vector3(0, -0.3, -0.02), "sotto_davanti": Vector3(0, -0.2, -0.22)}
	for nome in viste:
		var su := Vector3(0, 0, -1) if nome == "sotto" else Vector3.UP
		cam.look_at_from_position(viste[nome], Vector3(0, 0, -0.05), su)
		for i in 4:
			await get_tree().process_frame
		get_viewport().get_texture().get_image().save_png("%s/vista_%s.png" % [cartella, nome])
	get_tree().quit()
