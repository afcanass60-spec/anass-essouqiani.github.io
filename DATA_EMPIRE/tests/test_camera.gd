## Camera rig behaviour, tested in isolation (no world around it).
extends "res://tests/framework/test_case.gd"

const CameraScene := preload("res://scenes/world/camera_controller.tscn")

var rig  # untyped: scripted members accessed dynamically


func before_each() -> void:
	rig = CameraScene.instantiate()
	tree.root.add_child(rig)


func after_each() -> void:
	rig.free()
	rig = null


func test_starts_at_default_view() -> void:
	assert_almost(rig.get_target_zoom(), rig.default_zoom)
	assert_almost(rig.get_yaw(), deg_to_rad(rig.default_yaw_deg))
	assert_true(rig.position.is_equal_approx(rig.default_focus), "rig must start on the default focus")


func test_zoom_is_clamped() -> void:
	for i in range(50):
		rig.zoom_in()
	assert_almost(rig.get_target_zoom(), rig.min_zoom)
	for i in range(50):
		rig.zoom_out()
	assert_almost(rig.get_target_zoom(), rig.max_zoom)


func test_rotation_uses_quarter_turns() -> void:
	var start: float = rig.get_target_yaw()
	rig.rotate_left()
	assert_almost(rig.get_target_yaw(), start - PI * 0.5)
	rig.rotate_right()
	rig.rotate_right()
	assert_almost(rig.get_target_yaw(), start + PI * 0.5)


func test_pan_is_clamped_to_bounds() -> void:
	rig.pan_screen(Vector2(1.0e7, 1.0e7))
	var focus: Vector3 = rig.get_target_focus()
	assert_true(focus.x >= rig.bounds_min.x - 0.001 and focus.x <= rig.bounds_max.x + 0.001, "x out of bounds")
	assert_true(focus.z >= rig.bounds_min.y - 0.001 and focus.z <= rig.bounds_max.y + 0.001, "z out of bounds")


func test_recenter_restores_default_view_without_full_spin() -> void:
	rig.rotate_right()
	rig.rotate_right()
	rig.rotate_right()
	rig.zoom_in()
	rig.pan_screen(Vector2(300.0, 0.0))
	rig.reset_view()
	assert_almost(rig.get_target_zoom(), rig.default_zoom)
	assert_true(rig.get_target_focus().is_equal_approx(rig.default_focus), "focus must be reset")
	var default_yaw := deg_to_rad(rig.default_yaw_deg)
	var turns: float = (rig.get_target_yaw() - default_yaw) / TAU
	assert_almost(turns, roundf(turns), 0.0001, "yaw must land on the default angle")
	assert_true(absf(rig.get_target_yaw() - deg_to_rad(45.0 + 270.0)) <= PI * 0.5 + 0.001, "recenter must take the short way")


func test_input_actions_registered() -> void:
	for action in [
		"cam_pan_left", "cam_pan_right", "cam_pan_up", "cam_pan_down", "cam_rotate_left", "cam_rotate_right", "cam_zoom_in", "cam_zoom_out", "cam_recenter"
	]:
		assert_true(InputMap.has_action(action), "missing input action " + action)
