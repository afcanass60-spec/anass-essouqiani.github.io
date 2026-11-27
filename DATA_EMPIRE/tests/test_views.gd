## Equipment views: geometry guards and visual state changes.
extends "res://tests/framework/test_case.gd"

const RackScene := preload("res://scenes/equipment/rack.tscn")
const ServerScene := preload("res://scenes/equipment/server.tscn")
const Style := preload("res://scripts/view/visual_style.gd")
const ServerView := preload("res://scripts/view/equipment/server_view.gd")

var rack  # untyped: scripted members accessed dynamically


func before_each() -> void:
	rack = RackScene.instantiate()
	rack.capacity_units = 12
	tree.root.add_child(rack)


func after_each() -> void:
	rack.free()
	rack = null


func test_rack_unit_range_validation() -> void:
	assert_true(rack.is_unit_range_valid(0, 2))
	assert_true(rack.is_unit_range_valid(10, 2), "last two units are valid")
	assert_false(rack.is_unit_range_valid(11, 2), "would overflow the top of the rack")
	assert_false(rack.is_unit_range_valid(-1, 1), "negative unit")
	assert_false(rack.is_unit_range_valid(0, 0), "zero-height server")


func test_rack_refuses_out_of_range_mount() -> void:
	var server = ServerScene.instantiate()
	var mounted: bool = rack.mount(server, 11, 2)
	assert_false(mounted, "mount must fail outside the frame")
	assert_true(server.get_parent() == null, "refused server must not be attached")
	server.free()


func test_server_is_positioned_on_its_slot() -> void:
	var server = ServerScene.instantiate()
	assert_true(rack.mount(server, 4, 2))
	assert_almost(server.position.y, rack.get_slot_position(4).y)
	assert_almost(server.get_chassis_height(), 2 * Style.RACK_UNIT_HEIGHT - Style.RACK_UNIT_GAP)


func test_server_offline_stops_processing() -> void:
	var server = ServerScene.instantiate()
	rack.mount(server, 0, 2)
	server.set_status(ServerView.VisualStatus.OFFLINE)
	assert_false(server.is_processing(), "an offline server must not animate")
	server.set_status(ServerView.VisualStatus.FAULT)
	assert_true(server.is_processing(), "a faulty server blinks its LED")
