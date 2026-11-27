## RackView — procedural open-frame server rack.
##
## Presentation only. Occupancy rules (overlaps, power budget, capacity) belong to
## RackSystem (Phase 2); this view only refuses geometry that would fall outside
## the frame. Origin = floor centre, front facing +Z.
extends Node3D

const MeshFactory := preload("res://scripts/view/mesh_factory.gd")
const Style := preload("res://scripts/view/visual_style.gd")

const BASE_HEIGHT := 0.1
const TOP_HEIGHT := 0.05
const POST_SIZE := 0.045

@export_range(4, 48) var capacity_units: int = 12
@export var frame_color: Color = Style.RACK_FRAME


func _ready() -> void:
	_build()


func get_total_height() -> float:
	return BASE_HEIGHT + capacity_units * Style.RACK_UNIT_HEIGHT + TOP_HEIGHT


## Local position of the bottom of rack unit `start_unit` (0 = lowest unit).
func get_slot_position(start_unit: int) -> Vector3:
	return Vector3(0.0, BASE_HEIGHT + start_unit * Style.RACK_UNIT_HEIGHT, 0.0)


func is_unit_range_valid(start_unit: int, height_units: int) -> bool:
	return start_unit >= 0 and height_units > 0 and start_unit + height_units <= capacity_units


## Attaches a server view at the given unit. Returns false (and adds nothing) if out of range.
func mount(server_view: Node3D, start_unit: int, height_units: int) -> bool:
	if not is_unit_range_valid(start_unit, height_units):
		push_error("RackView.mount: units %d..%d outside a %dU rack" % [start_unit, start_unit + height_units - 1, capacity_units])
		return false
	add_child(server_view)
	server_view.position = get_slot_position(start_unit)
	return true


func _build() -> void:
	var inner_w := Style.RACK_INNER_WIDTH
	var depth := Style.RACK_DEPTH
	var total_h := get_total_height()
	var frame := MeshFactory.material(frame_color, 0.45, 0.6)
	var half_w := inner_w * 0.5 + POST_SIZE * 0.5
	var half_d := depth * 0.5 - POST_SIZE * 0.5
	var outer_w := inner_w + POST_SIZE * 2.0

	# Four corner posts.
	for sx in [-1.0, 1.0]:
		for sz in [-1.0, 1.0]:
			MeshFactory.box(self, Vector3(POST_SIZE, total_h, POST_SIZE), Vector3(sx * half_w, total_h * 0.5, sz * half_d), frame)

	MeshFactory.box(self, Vector3(outer_w, BASE_HEIGHT, depth), Vector3(0.0, BASE_HEIGHT * 0.5, 0.0), frame, "Plinth")
	MeshFactory.box(self, Vector3(outer_w, TOP_HEIGHT, depth), Vector3(0.0, total_h - TOP_HEIGHT * 0.5, 0.0), frame, "Top")

	# Side rails.
	for sx in [-1.0, 1.0]:
		for rail_y in [BASE_HEIGHT + 0.02, total_h - TOP_HEIGHT - 0.02]:
			MeshFactory.box(self, Vector3(POST_SIZE * 0.6, 0.03, depth - POST_SIZE), Vector3(sx * half_w, rail_y, 0.0), frame)

	# One marker per rack unit on the front-left post, so capacity is readable at a glance.
	var marker_mat := MeshFactory.material(Style.RACK_MARKER, 0.6, 0.2)
	for u in range(capacity_units):
		var marker_y: float = BASE_HEIGHT + (u + 0.5) * Style.RACK_UNIT_HEIGHT
		MeshFactory.no_shadow(MeshFactory.box(self, Vector3(0.014, 0.012, 0.004), Vector3(-half_w, marker_y, depth * 0.5 + 0.002), marker_mat))
