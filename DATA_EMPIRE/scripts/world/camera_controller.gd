## CameraController — isometric orthographic camera rig.
##
## Node layout:  CameraRig (this, positioned at the focus point on the ground)
##                 └ Pivot (pitch = isometric angle, yaw = view rotation)
##                     └ Camera3D (orthographic, pulled back along +Z)
##
## Controls
##   Mouse    : right/middle drag = pan, wheel = zoom
##   Keyboard : WASD / arrows = pan, Q / E = rotate 90°, +/- = zoom, Space/Home = recenter
##              (physical keys: on AZERTY, WASD = ZQSD and Q/E = A/E)
##   Touch    : one-finger drag = pan, pinch = zoom
## Rotation is limited to 90° steps: enough to see behind racks, never disorienting.
## Smoothing uses frame-rate independent exponential damping.
extends Node3D

signal view_rotated(yaw: float)
signal zoom_changed(size: float)

## True isometric pitch: atan(1 / sqrt(2)).
const ISO_PITCH_DEG := -35.264
const CAMERA_DISTANCE := 30.0
const ROTATION_STEP := PI * 0.5
const BUTTON_ZOOM_FACTOR := 1.25

const INPUT_BINDINGS := {
	"cam_pan_left": [KEY_A, KEY_LEFT],
	"cam_pan_right": [KEY_D, KEY_RIGHT],
	"cam_pan_up": [KEY_W, KEY_UP],
	"cam_pan_down": [KEY_S, KEY_DOWN],
	"cam_rotate_left": [KEY_Q],
	"cam_rotate_right": [KEY_E],
	"cam_zoom_in": [KEY_EQUAL, KEY_KP_ADD],
	"cam_zoom_out": [KEY_MINUS, KEY_KP_SUBTRACT],
	"cam_recenter": [KEY_SPACE, KEY_HOME],
}

@export var min_zoom: float = 5.0
@export var max_zoom: float = 26.0
@export var default_zoom: float = 13.0
@export var default_focus: Vector3 = Vector3(-0.5, 0.6, -0.8)
@export var default_yaw_deg: float = 45.0
@export var bounds_min: Vector2 = Vector2(-14.0, -14.0)
@export var bounds_max: Vector2 = Vector2(14.0, 14.0)
## Keyboard pan speed, in screen heights per second.
@export var keyboard_pan_speed: float = 0.9
@export var wheel_zoom_factor: float = 1.12
## Higher = snappier camera.
@export var smoothing: float = 12.0

var _target_focus: Vector3
var _target_zoom: float
var _target_yaw: float
var _yaw: float
var _last_emitted_yaw := INF
var _touches: Dictionary = {}
var _last_pinch_distance := 0.0

@onready var _pivot: Node3D = $Pivot
@onready var _camera: Camera3D = $Pivot/Camera3D


func _ready() -> void:
	ensure_input_actions()
	_camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	_camera.near = 0.1
	_camera.far = 200.0
	_camera.position = Vector3(0.0, 0.0, CAMERA_DISTANCE)
	_camera.current = true
	reset_view(true)


## Registers the camera input actions once (kept in code so the scene is self-contained;
## a rebinding menu can later move them to project settings).
static func ensure_input_actions() -> void:
	for action in INPUT_BINDINGS:
		if InputMap.has_action(action):
			continue
		InputMap.add_action(action)
		for keycode in INPUT_BINDINGS[action]:
			var event := InputEventKey.new()
			event.physical_keycode = keycode
			InputMap.action_add_event(action, event)


# --- Public API (used by the HUD buttons and the tests) -------------------------


func reset_view(instant: bool = false) -> void:
	_target_focus = default_focus
	_target_zoom = clampf(default_zoom, min_zoom, max_zoom)
	# Back to the default angle, via the shortest way round (no multi-turn spin).
	var default_yaw := deg_to_rad(default_yaw_deg)
	_target_yaw = default_yaw + roundf((_target_yaw - default_yaw) / TAU) * TAU
	if instant:
		_apply_smoothing(1.0)


func zoom_in() -> void:
	set_target_zoom(_target_zoom / BUTTON_ZOOM_FACTOR)


func zoom_out() -> void:
	set_target_zoom(_target_zoom * BUTTON_ZOOM_FACTOR)


func set_target_zoom(value: float) -> void:
	_target_zoom = clampf(value, min_zoom, max_zoom)


func rotate_left() -> void:
	_target_yaw -= ROTATION_STEP


func rotate_right() -> void:
	_target_yaw += ROTATION_STEP


## Pans by a screen-space drag (pixels): the ground under the pointer follows it.
func pan_screen(delta_pixels: Vector2) -> void:
	var viewport_height := maxf(get_viewport().get_visible_rect().size.y, 1.0)
	var units_per_pixel := _camera.size / viewport_height
	# Ground distances along the view direction are foreshortened by sin(pitch).
	var vertical_scale := 1.0 / sin(deg_to_rad(-ISO_PITCH_DEG))
	_target_focus += -_ground_right() * delta_pixels.x * units_per_pixel
	_target_focus += _ground_forward() * delta_pixels.y * units_per_pixel * vertical_scale
	_clamp_focus()


func get_yaw() -> float:
	return _yaw


func get_target_yaw() -> float:
	return _target_yaw


func get_target_zoom() -> float:
	return _target_zoom


func get_target_focus() -> Vector3:
	return _target_focus


func get_camera() -> Camera3D:
	return _camera


# --- Frame update -------------------------------------------------------------


func _process(delta: float) -> void:
	var pan := Input.get_vector("cam_pan_left", "cam_pan_right", "cam_pan_up", "cam_pan_down")
	if pan != Vector2.ZERO:
		var speed := keyboard_pan_speed * _camera.size * delta
		_target_focus += (_ground_right() * pan.x - _ground_forward() * pan.y) * speed
		_clamp_focus()
	_apply_smoothing(1.0 - exp(-smoothing * delta))


func _apply_smoothing(weight: float) -> void:
	_yaw = lerpf(_yaw, _target_yaw, weight)
	if absf(_yaw - _target_yaw) < 0.0005:
		_yaw = _target_yaw
	position = position.lerp(_target_focus, weight)
	var previous_size := _camera.size
	_camera.size = lerpf(_camera.size, _target_zoom, weight)
	_pivot.rotation = Vector3(deg_to_rad(ISO_PITCH_DEG), _yaw, 0.0)
	if absf(_yaw - _last_emitted_yaw) > 0.01:
		_last_emitted_yaw = _yaw
		view_rotated.emit(_yaw)
	if not is_equal_approx(previous_size, _camera.size):
		zoom_changed.emit(_camera.size)


func _ground_right() -> Vector3:
	return Vector3(cos(_yaw), 0.0, -sin(_yaw))


func _ground_forward() -> Vector3:
	return Vector3(-sin(_yaw), 0.0, -cos(_yaw))


func _clamp_focus() -> void:
	_target_focus.x = clampf(_target_focus.x, bounds_min.x, bounds_max.x)
	_target_focus.z = clampf(_target_focus.z, bounds_min.y, bounds_max.y)


# --- Input --------------------------------------------------------------------
# _unhandled_input: UI controls (HUD buttons) get the events first.


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		_handle_mouse_button(event as InputEventMouseButton)
	elif event is InputEventMouseMotion:
		var motion := event as InputEventMouseMotion
		if motion.button_mask & (MOUSE_BUTTON_MASK_RIGHT | MOUSE_BUTTON_MASK_MIDDLE):
			pan_screen(motion.relative)
	elif event is InputEventScreenTouch:
		_handle_touch(event as InputEventScreenTouch)
	elif event is InputEventScreenDrag:
		_handle_drag(event as InputEventScreenDrag)
	elif event is InputEventMagnifyGesture:
		set_target_zoom(_target_zoom / (event as InputEventMagnifyGesture).factor)
	elif event.is_action_pressed("cam_rotate_left"):
		rotate_left()
	elif event.is_action_pressed("cam_rotate_right"):
		rotate_right()
	elif event.is_action_pressed("cam_zoom_in", true):
		zoom_in()
	elif event.is_action_pressed("cam_zoom_out", true):
		zoom_out()
	elif event.is_action_pressed("cam_recenter"):
		reset_view()


func _handle_mouse_button(event: InputEventMouseButton) -> void:
	if not event.pressed:
		return
	if event.button_index == MOUSE_BUTTON_WHEEL_UP:
		set_target_zoom(_target_zoom / wheel_zoom_factor)
	elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
		set_target_zoom(_target_zoom * wheel_zoom_factor)


func _handle_touch(event: InputEventScreenTouch) -> void:
	if event.pressed:
		_touches[event.index] = event.position
	else:
		_touches.erase(event.index)
	_last_pinch_distance = 0.0


func _handle_drag(event: InputEventScreenDrag) -> void:
	_touches[event.index] = event.position
	if _touches.size() == 1:
		pan_screen(event.relative)
	elif _touches.size() == 2:
		var points: Array = _touches.values()
		var distance: float = (points[0] as Vector2).distance_to(points[1])
		if _last_pinch_distance > 0.0 and distance > 0.0:
			set_target_zoom(_target_zoom * _last_pinch_distance / distance)
		_last_pinch_distance = distance
