class_name Materiali
extends RefCounted
## I materiali del bunker dalle texture di Poly Haven (porte/strumenti/texture.py): il colore, le normali e l'ORM
## (occlusione, ruvidita' e metallo nei tre canali). Per muri, pavimento e tubi le texture si stendono da sole lungo le
## superfici (triplanare, in metri: "scala" ripetizioni per metro); per le assi si usano le coordinate del pezzo.

static var _cache := {}


static func pbr(nome: String, scala := 1.0, triplanare := true, tinta := Color.WHITE, metallo := 0.0) -> ORMMaterial3D:
	var chiave := "%s|%s|%s|%s|%s" % [nome, scala, triplanare, tinta, metallo]
	if _cache.has(chiave):
		return _cache[chiave]
	var base := "res://texture/%s/" % nome
	var m := ORMMaterial3D.new()
	m.albedo_texture = load(base + "diff.jpg")
	m.albedo_color = tinta
	m.normal_enabled = true
	m.normal_texture = load(base + "nor.jpg")
	m.orm_texture = load(base + "arm.jpg")
	m.roughness = 1.0
	m.metallic = metallo
	m.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	if triplanare:
		m.uv1_triplanar = true
		m.uv1_world_triplanar = true
		m.uv1_triplanar_sharpness = 4.0
		m.uv1_scale = Vector3.ONE * scala
	else:
		m.uv1_scale = Vector3(scala, scala, 1.0)
	_cache[chiave] = m
	return m


## il legno vivo, quello chiaro che si vede dove l'asse si e' spaccata
static func legno_vivo() -> ORMMaterial3D:
	var m := pbr("rough_wood", 1.0, false, Color(1.55, 1.25, 0.95)).duplicate()
	m.uv1_scale = Vector3(6.0, 1.2, 1.0)
	return m
