## Phase 0/1 smoke tests: the main scene builds a complete, coherent garage scene.
extends "res://tests/framework/test_case.gd"

const MainScene := preload("res://scenes/main/main.tscn")

var main


func before_each() -> void:
	main = MainScene.instantiate()
	tree.root.add_child(main)


func after_each() -> void:
	main.free()
	main = null


func test_main_scene_has_world_and_hud() -> void:
	assert_true(main.has_node("World"), "World node missing")
	assert_true(main.has_node("HUD"), "HUD node missing")


func test_camera_is_orthographic_and_current() -> void:
	var camera: Camera3D = main.get_node("World").get_camera_rig().get_camera()
	assert_eq(camera.projection, Camera3D.PROJECTION_ORTHOGONAL, "isometric view needs an orthographic camera")
	assert_true(camera.current, "camera must be the active one")


func test_garage_has_four_walls() -> void:
	var garage = main.get_node("World").garage
	assert_not_null(garage, "garage not built")
	for wall_name in ["north", "south", "west", "east"]:
		assert_not_null(garage.get_wall_mount(wall_name), "missing wall " + wall_name)


func test_walls_facing_camera_are_cut_away() -> void:
	var garage = main.get_node("World").garage
	garage.apply_camera_yaw(deg_to_rad(45.0))
	assert_true(garage.is_wall_cut("south") and garage.is_wall_cut("east"), "walls facing the camera at 45° must be cut")
	assert_false(garage.is_wall_cut("north") or garage.is_wall_cut("west"), "back walls must stay full at 45°")
	garage.apply_camera_yaw(deg_to_rad(225.0))
	assert_true(garage.is_wall_cut("north") and garage.is_wall_cut("west"), "walls facing the camera at 225° must be cut")
	assert_false(garage.is_wall_cut("south") or garage.is_wall_cut("east"), "back walls must stay full at 225°")


func test_starter_rack_holds_vintage_server() -> void:
	var world = main.get_node("World")
	assert_not_null(world.starter_rack, "starter rack missing")
	assert_not_null(world.starter_server, "starter server missing")
	assert_true(world.starter_server.get_parent() == world.starter_rack, "server must be mounted in the rack")
	assert_eq(world.starter_rack.capacity_units, 12)


func test_starter_infrastructure_is_present() -> void:
	var world = main.get_node("World")
	assert_not_null(world.cooling_unit, "cooling unit (fan) missing")
	assert_not_null(world.power_unit, "power panel missing")
	assert_not_null(world.network_router, "network box missing")
	assert_true(world.cooling_unit.running, "fan should run at start")
	assert_true(world.power_unit.powered, "power panel should be on at start")


func test_hud_buttons_drive_the_camera() -> void:
	var rig = main.get_node("World").get_camera_rig()
	var hud = main.get_node("HUD")
	var zoom_before: float = rig.get_target_zoom()
	hud.zoom_in_requested.emit()
	assert_true(rig.get_target_zoom() < zoom_before, "HUD zoom-in must reduce the ortho size")
	var yaw_before: float = rig.get_target_yaw()
	hud.rotate_right_requested.emit()
	assert_almost(rig.get_target_yaw() - yaw_before, PI * 0.5, 0.0001, "HUD rotate must turn 90°")
