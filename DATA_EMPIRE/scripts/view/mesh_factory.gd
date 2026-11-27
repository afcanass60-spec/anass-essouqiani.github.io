## MeshFactory — procedural low-poly building blocks and a shared material cache.
##
## The whole prototype is built from Godot primitives (boxes, cylinders, tori):
## zero external assets, zero cost, tiny Web download. Identical materials and
## meshes are cached and shared, which keeps GPU state changes low on WebGL/mobile.
extends RefCounted

static var _materials: Dictionary = {}
static var _meshes: Dictionary = {}


## Opaque PBR material. Cached by (colour, roughness, metallic).
static func material(color: Color, roughness: float = 0.8, metallic: float = 0.0) -> StandardMaterial3D:
	var key := "m|%s|%.2f|%.2f" % [color.to_html(true), roughness, metallic]
	if _materials.has(key):
		return _materials[key]
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = roughness
	mat.metallic = metallic
	_materials[key] = mat
	return mat


## Self-lit material for LEDs, screens and light fixtures.
static func emissive(color: Color, energy: float = 2.0) -> StandardMaterial3D:
	var key := "e|%s|%.2f" % [color.to_html(true), energy]
	if _materials.has(key):
		return _materials[key]
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.emission_enabled = true
	mat.emission = color
	mat.emission_energy_multiplier = energy
	_materials[key] = mat
	return mat


static func box(parent: Node3D, size: Vector3, position: Vector3, mat: Material, node_name: String = "") -> MeshInstance3D:
	var key := "b|%.4f|%.4f|%.4f" % [size.x, size.y, size.z]
	var mesh: BoxMesh = _meshes.get(key)
	if mesh == null:
		mesh = BoxMesh.new()
		mesh.size = size
		_meshes[key] = mesh
	return _instance(parent, mesh, position, mat, node_name)


## Cylinder along the Y axis. A top_radius of 0 gives a cone.
static func cylinder(
	parent: Node3D, radius: float, height: float, position: Vector3, mat: Material, node_name: String = "", top_radius: float = -1.0, segments: int = 16
) -> MeshInstance3D:
	var top := radius if top_radius < 0.0 else top_radius
	var key := "c|%.4f|%.4f|%.4f|%d" % [radius, top, height, segments]
	var mesh: CylinderMesh = _meshes.get(key)
	if mesh == null:
		mesh = CylinderMesh.new()
		mesh.bottom_radius = radius
		mesh.top_radius = top
		mesh.height = height
		mesh.radial_segments = segments
		mesh.rings = 1
		_meshes[key] = mesh
	return _instance(parent, mesh, position, mat, node_name)


## Ring lying in the XZ plane (around the Y axis).
static func torus(parent: Node3D, inner_radius: float, outer_radius: float, position: Vector3, mat: Material, node_name: String = "") -> MeshInstance3D:
	var key := "t|%.4f|%.4f" % [inner_radius, outer_radius]
	var mesh: TorusMesh = _meshes.get(key)
	if mesh == null:
		mesh = TorusMesh.new()
		mesh.inner_radius = inner_radius
		mesh.outer_radius = outer_radius
		mesh.rings = 24
		mesh.ring_segments = 8
		_meshes[key] = mesh
	return _instance(parent, mesh, position, mat, node_name)


## Polyline cable made of square segments through the given points.
static func cable(parent: Node3D, points: PackedVector3Array, thickness: float, mat: Material, node_name: String = "Cable") -> Node3D:
	var root := Node3D.new()
	root.name = node_name
	parent.add_child(root)
	for i in range(points.size() - 1):
		var a: Vector3 = points[i]
		var b: Vector3 = points[i + 1]
		var segment := b - a
		var length := segment.length()
		if length < 0.001:
			continue
		var direction := segment / length
		var up := Vector3.UP if absf(direction.dot(Vector3.UP)) < 0.99 else Vector3.RIGHT
		var piece := box(root, Vector3(thickness, thickness, length + thickness), (a + b) * 0.5, mat)
		piece.basis = Basis.looking_at(direction, up)
		no_shadow(piece)
	return root


## Disables shadow casting for tiny details (LEDs, markers, decals): cheaper and cleaner.
static func no_shadow(instance: MeshInstance3D) -> MeshInstance3D:
	instance.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return instance


static func _instance(parent: Node3D, mesh: Mesh, position: Vector3, mat: Material, node_name: String) -> MeshInstance3D:
	var instance := MeshInstance3D.new()
	instance.mesh = mesh
	instance.material_override = mat
	instance.position = position
	if not node_name.is_empty():
		instance.name = node_name
	parent.add_child(instance)
	return instance
