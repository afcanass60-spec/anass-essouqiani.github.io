## GarageView — procedural low-poly garage, the Chapter 1 building.
##
## Interior floor is centred on the origin: X in [-width/2, width/2],
## Z in [-depth/2, depth/2], floor top at Y = 0. There is no roof (isometric
## management convention) and the two walls facing the camera are swapped for
## low "cutaway" stubs so the player can always see inside, whatever the angle.
##
## Wall-mounted items (panel, window, pegboard...) are parented to the wall's
## `Full` node via get_wall_mount(), so they disappear together with the wall.
extends Node3D

const MeshFactory := preload("res://scripts/view/mesh_factory.gd")
const Style := preload("res://scripts/view/visual_style.gd")

## Minimal dot(wall normal, direction to camera) for a wall to be cut away.
const CUTAWAY_THRESHOLD := 0.05

@export var interior_width: float = 10.0
@export var interior_depth: float = 8.0
@export var wall_height: float = 3.0
@export var wall_thickness: float = 0.2
@export var cutaway_height: float = 0.35
@export var door_min_x: float = 0.6
@export var door_max_x: float = 3.8
@export var door_height: float = 2.4

## wall name -> { "normal": Vector3, "full": Node3D, "stub": Node3D }
var _walls: Dictionary = {}


func _ready() -> void:
	_build_exterior()
	_build_floor()
	_build_walls()
	_build_props()
	_build_lights()
	apply_camera_yaw(deg_to_rad(45.0))


func get_interior_size() -> Vector2:
	return Vector2(interior_width, interior_depth)


## Node to parent wall-mounted objects to (hidden when that wall is cut away).
func get_wall_mount(wall_name: String) -> Node3D:
	if not _walls.has(wall_name):
		push_error("GarageView: unknown wall '%s'" % wall_name)
		return null
	return _walls[wall_name]["full"]


func is_wall_cut(wall_name: String) -> bool:
	if not _walls.has(wall_name):
		return false
	var stub: Node3D = _walls[wall_name]["stub"]
	return stub.visible


## Called by the camera rig whenever it rotates. `yaw` is the rig's Y rotation (radians).
func apply_camera_yaw(yaw: float) -> void:
	var to_camera := Vector3(sin(yaw), 0.0, cos(yaw))
	for wall_name in _walls:
		var wall: Dictionary = _walls[wall_name]
		var normal: Vector3 = wall["normal"]
		var cut := normal.dot(to_camera) > CUTAWAY_THRESHOLD
		var full: Node3D = wall["full"]
		var stub: Node3D = wall["stub"]
		full.visible = not cut
		stub.visible = cut


# --- Construction ------------------------------------------------------------


func _build_exterior() -> void:
	var exterior := Node3D.new()
	exterior.name = "Exterior"
	add_child(exterior)
	var half_d := interior_depth * 0.5

	MeshFactory.box(exterior, Vector3(80.0, 0.1, 80.0), Vector3(0.0, -0.08, 0.0), MeshFactory.material(Style.GROUND, 1.0), "Lawn")
	MeshFactory.box(
		exterior, Vector3(interior_width + 1.6, 0.04, interior_depth + 1.6), Vector3(0.0, -0.03, 0.0), MeshFactory.material(Style.APRON, 0.95), "Apron"
	)

	var drive_length := 12.0
	var drive_width := door_max_x - door_min_x + 0.6
	var drive_center := Vector3((door_min_x + door_max_x) * 0.5, -0.025, -half_d - wall_thickness - drive_length * 0.5)
	MeshFactory.box(exterior, Vector3(drive_width, 0.04, drive_length), drive_center, MeshFactory.material(Style.ASPHALT, 0.95), "Driveway")

	for tree_position in [Vector3(-9.0, 0.0, -7.0), Vector3(8.5, 0.0, -8.5), Vector3(-10.0, 0.0, 6.0), Vector3(9.5, 0.0, 6.5), Vector3(-6.0, 0.0, 10.0)]:
		_build_tree(exterior, tree_position)


func _build_tree(parent: Node3D, base: Vector3) -> void:
	var tree := Node3D.new()
	tree.name = "Tree"
	tree.position = base
	parent.add_child(tree)
	MeshFactory.cylinder(tree, 0.14, 0.9, Vector3(0.0, 0.45, 0.0), MeshFactory.material(Style.TRUNK, 0.9), "Trunk", -1.0, 8)
	MeshFactory.cylinder(tree, 1.0, 1.7, Vector3(0.0, 1.6, 0.0), MeshFactory.material(Style.FOLIAGE, 0.9), "Foliage", 0.0, 8)
	MeshFactory.cylinder(tree, 0.72, 1.3, Vector3(0.0, 2.45, 0.0), MeshFactory.material(Style.FOLIAGE_LIGHT, 0.9), "FoliageTop", 0.0, 8)


func _build_floor() -> void:
	var floor_node := Node3D.new()
	floor_node.name = "Floor"
	add_child(floor_node)
	var slab := Vector3(interior_width + wall_thickness * 2.0, 0.12, interior_depth + wall_thickness * 2.0)
	MeshFactory.box(floor_node, slab, Vector3(0.0, -0.06, 0.0), MeshFactory.material(Style.CONCRETE, 0.95), "Slab")

	# Concrete expansion joints.
	var joint := MeshFactory.material(Style.CONCRETE_JOINT, 1.0)
	var x := -interior_width * 0.5 + 2.5
	while x < interior_width * 0.5 - 0.1:
		MeshFactory.no_shadow(MeshFactory.box(floor_node, Vector3(0.025, 0.004, interior_depth), Vector3(x, 0.002, 0.0), joint))
		x += 2.5
	var z := -interior_depth * 0.5 + 2.0
	while z < interior_depth * 0.5 - 0.1:
		MeshFactory.no_shadow(MeshFactory.box(floor_node, Vector3(interior_width, 0.004, 0.025), Vector3(0.0, 0.002, z), joint))
		z += 2.0

	# Old oil stain: this used to be a real garage.
	var stain := MeshFactory.no_shadow(
		MeshFactory.cylinder(floor_node, 0.55, 0.004, Vector3(2.3, 0.003, 0.8), MeshFactory.material(Style.OIL_STAIN, 0.3), "OilStain", -1.0, 12)
	)
	stain.scale = Vector3(1.4, 1.0, 1.0)


func _build_walls() -> void:
	var walls_root := Node3D.new()
	walls_root.name = "Walls"
	add_child(walls_root)
	var hw := interior_width * 0.5
	var hd := interior_depth * 0.5
	var t := wall_thickness
	var h := wall_height
	var wall_mat := MeshFactory.material(Style.WALL, 0.9)

	# North (back) wall with the roll-up garage door.
	var north := _create_wall(walls_root, "north", Vector3(0.0, 0.0, -1.0))
	_add_piece(north, Vector3(-hw - t, 0.0, -hd - t), Vector3(door_min_x, h, -hd), wall_mat)
	_add_piece(north, Vector3(door_max_x, 0.0, -hd - t), Vector3(hw + t, h, -hd), wall_mat)
	_add_piece(north, Vector3(door_min_x, door_height, -hd - t), Vector3(door_max_x, h, -hd), wall_mat)
	_add_piece(
		north, Vector3(door_min_x, 0.0, -hd - t * 0.7), Vector3(door_max_x, door_height, -hd - t * 0.3), MeshFactory.material(Style.GARAGE_DOOR, 0.6, 0.4)
	)
	_add_door_slats(north["full"], -hd - t * 0.3, -hd - t * 0.7)

	# South wall.
	var south := _create_wall(walls_root, "south", Vector3(0.0, 0.0, 1.0))
	_add_piece(south, Vector3(-hw - t, 0.0, hd), Vector3(hw + t, h, hd + t), wall_mat)

	# West wall with a window.
	var west := _create_wall(walls_root, "west", Vector3(-1.0, 0.0, 0.0))
	var win_z0 := -0.9
	var win_z1 := 0.9
	var win_y0 := 1.2
	var win_y1 := 2.1
	_add_piece(west, Vector3(-hw - t, 0.0, -hd), Vector3(-hw, h, win_z0), wall_mat)
	_add_piece(west, Vector3(-hw - t, 0.0, win_z1), Vector3(-hw, h, hd), wall_mat)
	_add_piece(west, Vector3(-hw - t, 0.0, win_z0), Vector3(-hw, win_y0, win_z1), wall_mat)
	_add_piece(west, Vector3(-hw - t, win_y1, win_z0), Vector3(-hw, h, win_z1), wall_mat)
	var west_full: Node3D = west["full"]
	MeshFactory.no_shadow(
		MeshFactory.box(
			west_full,
			Vector3(0.04, win_y1 - win_y0, win_z1 - win_z0),
			Vector3(-hw - t * 0.5, (win_y0 + win_y1) * 0.5, 0.0),
			MeshFactory.emissive(Style.WINDOW_GLOW, 0.6),
			"WindowGlass"
		)
	)
	var frame_mat := MeshFactory.material(Style.WALL_TRIM, 0.8)
	MeshFactory.box(west_full, Vector3(0.06, win_y1 - win_y0, 0.04), Vector3(-hw - t * 0.5, (win_y0 + win_y1) * 0.5, 0.0), frame_mat, "Mullion")
	MeshFactory.box(west_full, Vector3(0.1, 0.05, win_z1 - win_z0 + 0.1), Vector3(-hw + 0.03, win_y0 - 0.025, 0.0), frame_mat, "Sill")

	# East wall.
	var east := _create_wall(walls_root, "east", Vector3(1.0, 0.0, 0.0))
	_add_piece(east, Vector3(hw, 0.0, -hd), Vector3(hw + t, h, hd), wall_mat)


func _create_wall(parent: Node3D, wall_name: String, normal: Vector3) -> Dictionary:
	var root := Node3D.new()
	root.name = wall_name.capitalize()
	parent.add_child(root)
	var full := Node3D.new()
	full.name = "Full"
	root.add_child(full)
	var stub := Node3D.new()
	stub.name = "Stub"
	root.add_child(stub)
	var wall := {"normal": normal, "full": full, "stub": stub}
	_walls[wall_name] = wall
	return wall


## Adds an axis-aligned wall block to the full wall and, clipped, to the cutaway stub.
func _add_piece(wall: Dictionary, min_corner: Vector3, max_corner: Vector3, mat: Material) -> void:
	var full: Node3D = wall["full"]
	var stub: Node3D = wall["stub"]
	var size := max_corner - min_corner
	var center := (min_corner + max_corner) * 0.5
	MeshFactory.box(full, size, center, mat)
	if max_corner.y >= wall_height - 0.001:
		MeshFactory.box(
			full, Vector3(size.x + 0.02, 0.04, size.z + 0.02), Vector3(center.x, wall_height + 0.02, center.z), MeshFactory.material(Style.WALL_TRIM, 0.8)
		)
	if min_corner.y < cutaway_height:
		var top := minf(max_corner.y, cutaway_height)
		var stub_max := Vector3(max_corner.x, top, max_corner.z)
		MeshFactory.box(stub, stub_max - min_corner, (min_corner + stub_max) * 0.5, mat)
		# Dark "cut" cap: the classic visual cue that a wall is sliced for visibility.
		MeshFactory.no_shadow(
			MeshFactory.box(stub, Vector3(size.x, 0.02, size.z), Vector3(center.x, top + 0.01, center.z), MeshFactory.material(Style.WALL_CUT, 0.8))
		)


func _add_door_slats(parent: Node3D, inner_face_z: float, outer_face_z: float) -> void:
	var groove := MeshFactory.material(Style.DOOR_GROOVE, 0.7, 0.3)
	var width := door_max_x - door_min_x - 0.06
	var cx := (door_min_x + door_max_x) * 0.5
	var y := 0.3
	while y < door_height - 0.05:
		MeshFactory.no_shadow(MeshFactory.box(parent, Vector3(width, 0.02, 0.012), Vector3(cx, y, inner_face_z + 0.006), groove))
		MeshFactory.no_shadow(MeshFactory.box(parent, Vector3(width, 0.02, 0.012), Vector3(cx, y, outer_face_z - 0.006), groove))
		y += 0.3


func _build_props() -> void:
	var props := Node3D.new()
	props.name = "Props"
	add_child(props)
	var hw := interior_width * 0.5
	var hd := interior_depth * 0.5
	_build_workbench(props, Vector3(-hw + 0.45, 0.0, 0.8))
	_build_shelving(props, Vector3(-hw + 0.85, 0.0, -hd + 0.3))
	_build_box_pile(props, Vector3(hw - 0.75, 0.0, hd - 0.75))

	# Pegboard with a few tools (west wall).
	var west_mount := get_wall_mount("west")
	MeshFactory.box(west_mount, Vector3(0.03, 0.9, 1.4), Vector3(-hw + 0.015, 1.65, 1.9), MeshFactory.material(Style.PEGBOARD, 0.95), "Pegboard")
	var tool_dark := MeshFactory.material(Style.TOOL_DARK, 0.5, 0.6)
	var tool_red := MeshFactory.material(Style.TOOL_RED, 0.5, 0.2)
	MeshFactory.no_shadow(MeshFactory.box(west_mount, Vector3(0.02, 0.32, 0.05), Vector3(-hw + 0.04, 1.7, 1.45), tool_dark))
	MeshFactory.no_shadow(MeshFactory.box(west_mount, Vector3(0.02, 0.26, 0.04), Vector3(-hw + 0.04, 1.72, 1.65), tool_dark))
	MeshFactory.no_shadow(MeshFactory.box(west_mount, Vector3(0.03, 0.12, 0.2), Vector3(-hw + 0.045, 1.5, 2.1), tool_red))
	MeshFactory.no_shadow(MeshFactory.box(west_mount, Vector3(0.02, 0.3, 0.06), Vector3(-hw + 0.04, 1.75, 2.35), tool_red))

	# Fluorescent tube on the north wall.
	var north_mount := get_wall_mount("north")
	MeshFactory.box(north_mount, Vector3(1.3, 0.05, 0.08), Vector3(-2.5, 2.7, -hd + 0.06), MeshFactory.material(Style.METAL_SHELF, 0.6, 0.5), "TubeFixture")
	MeshFactory.no_shadow(
		MeshFactory.box(north_mount, Vector3(1.2, 0.035, 0.035), Vector3(-2.5, 2.66, -hd + 0.1), MeshFactory.emissive(Style.TUBE_LIGHT, 3.0), "Tube")
	)


func _build_workbench(parent: Node3D, base: Vector3) -> void:
	var wood := MeshFactory.material(Style.WOOD, 0.85)
	var wood_dark := MeshFactory.material(Style.WOOD_DARK, 0.9)
	var bench := Node3D.new()
	bench.name = "Workbench"
	bench.position = base
	parent.add_child(bench)
	MeshFactory.box(bench, Vector3(0.8, 0.06, 2.4), Vector3(0.0, 0.9, 0.0), wood, "Top")
	MeshFactory.box(bench, Vector3(0.74, 0.03, 2.3), Vector3(0.0, 0.25, 0.0), wood_dark, "LowerShelf")
	for sx in [-1.0, 1.0]:
		for sz in [-1.0, 1.0]:
			MeshFactory.box(bench, Vector3(0.06, 0.87, 0.06), Vector3(sx * 0.35, 0.435, sz * 1.1), wood_dark)

	# Vintage CRT terminal + keyboard: the founder's first "admin console".
	var beige := MeshFactory.material(Style.VINTAGE_BEIGE, 0.7)
	MeshFactory.box(bench, Vector3(0.42, 0.38, 0.4), Vector3(-0.05, 1.12, 1.2), beige, "CrtMonitor")
	MeshFactory.no_shadow(MeshFactory.box(bench, Vector3(0.01, 0.26, 0.3), Vector3(0.165, 1.13, 1.2), MeshFactory.emissive(Style.CRT_SCREEN, 0.8), "CrtScreen"))
	MeshFactory.box(bench, Vector3(0.16, 0.025, 0.42), Vector3(0.27, 0.945, 1.2), beige, "Keyboard")
	MeshFactory.box(bench, Vector3(0.38, 0.18, 0.3), Vector3(-0.05, 0.36, 1.4), MeshFactory.material(Style.CARDBOARD, 0.95), "SpareParts")


func _build_shelving(parent: Node3D, base: Vector3) -> void:
	var metal := MeshFactory.material(Style.METAL_SHELF, 0.6, 0.5)
	var shelf := Node3D.new()
	shelf.name = "Shelving"
	shelf.position = base
	parent.add_child(shelf)
	for sx in [-1.0, 1.0]:
		for sz in [-1.0, 1.0]:
			MeshFactory.box(shelf, Vector3(0.04, 1.9, 0.04), Vector3(sx * 0.73, 0.95, sz * 0.2), metal)
	for level_y in [0.1, 0.65, 1.2, 1.75]:
		MeshFactory.box(shelf, Vector3(1.5, 0.03, 0.45), Vector3(0.0, level_y, 0.0), metal)

	# Deterministic clutter: [x, shelf_y, size]
	var boxes := [
		[-0.4, 0.115, Vector3(0.5, 0.35, 0.36)],
		[0.3, 0.115, Vector3(0.6, 0.28, 0.38)],
		[-0.45, 0.665, Vector3(0.4, 0.3, 0.34)],
		[0.15, 0.665, Vector3(0.35, 0.22, 0.3)],
		[0.45, 0.665, Vector3(0.22, 0.4, 0.3)],
		[-0.2, 1.215, Vector3(0.7, 0.26, 0.36)],
		[0.0, 1.765, Vector3(0.45, 0.2, 0.3)],
	]
	for i in range(boxes.size()):
		var entry: Array = boxes[i]
		var size: Vector3 = entry[2]
		var color := Style.CARDBOARD if i % 2 == 0 else Style.CARDBOARD_DARK
		MeshFactory.box(shelf, size, Vector3(entry[0], entry[1] + size.y * 0.5, 0.0), MeshFactory.material(color, 0.95))


func _build_box_pile(parent: Node3D, base: Vector3) -> void:
	var pile := Node3D.new()
	pile.name = "BoxPile"
	pile.position = base
	parent.add_child(pile)
	var cardboard := MeshFactory.material(Style.CARDBOARD, 0.95)
	var cardboard_dark := MeshFactory.material(Style.CARDBOARD_DARK, 0.95)
	MeshFactory.box(pile, Vector3(0.6, 0.45, 0.5), Vector3(0.0, 0.225, 0.0), cardboard)
	var second := MeshFactory.box(pile, Vector3(0.45, 0.35, 0.4), Vector3(0.05, 0.625, 0.02), cardboard_dark)
	second.rotation.y = 0.25
	MeshFactory.box(pile, Vector3(0.5, 0.3, 0.45), Vector3(-0.55, 0.15, 0.1), cardboard_dark)
	# Retired beige PC tower waiting for a second life.
	MeshFactory.box(pile, Vector3(0.2, 0.45, 0.45), Vector3(0.0, 0.225, -0.6), MeshFactory.material(Style.VINTAGE_BEIGE, 0.7), "OldTower")


func _build_lights() -> void:
	var lamp := OmniLight3D.new()
	lamp.name = "GarageLight"
	lamp.position = Vector3(0.0, 2.8, 0.0)
	lamp.light_color = Style.WARM_LIGHT
	lamp.light_energy = 1.4
	lamp.omni_range = 9.0
	add_child(lamp)
