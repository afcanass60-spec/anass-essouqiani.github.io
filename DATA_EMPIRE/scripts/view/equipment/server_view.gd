## ServerView — 3D presentation of one rack-mounted server.
##
## Presentation only: it owns no gameplay data. From Phase 2, ServerSystem will
## drive `set_status()` through signals. Origin = bottom-centre of the chassis,
## front panel facing +Z (towards the rack front).
extends Node3D

enum VisualStatus { ONLINE, IDLE, OVERHEAT, FAULT, OFFLINE }

const MeshFactory := preload("res://scripts/view/mesh_factory.gd")
const Style := preload("res://scripts/view/visual_style.gd")

const FAULT_BLINK_PERIOD := 0.4
const ACTIVITY_MIN_INTERVAL := 0.04
const ACTIVITY_MAX_INTERVAL_ONLINE := 0.35
const ACTIVITY_MAX_INTERVAL_IDLE := 1.6

@export_range(1, 8) var height_units: int = 2
@export var body_color: Color = Style.SERVER_BODY
@export_range(0, 4) var drive_bays: int = 4
@export var status: VisualStatus = VisualStatus.ONLINE:
	set = set_status

var _power_led: MeshInstance3D
var _activity_leds: Array[MeshInstance3D] = []
var _activity_timers: Array[float] = []
var _activity_lit: Array[bool] = []
var _blink_clock := 0.0
var _rng := RandomNumberGenerator.new()
var _built := false


func _ready() -> void:
	_rng.randomize()
	_build()
	_built = true
	_refresh_leds()


func set_status(value: VisualStatus) -> void:
	status = value
	if _built:
		_refresh_leds()


func get_chassis_height() -> float:
	return height_units * Style.RACK_UNIT_HEIGHT - Style.RACK_UNIT_GAP


func _process(delta: float) -> void:
	_blink_clock += delta
	match status:
		VisualStatus.ONLINE, VisualStatus.IDLE, VisualStatus.OVERHEAT:
			_animate_activity(delta)
		VisualStatus.FAULT:
			var lit := fmod(_blink_clock, FAULT_BLINK_PERIOD) < FAULT_BLINK_PERIOD * 0.5
			_set_led(_power_led, Style.LED_FAULT if lit else Style.LED_OFF)


func _animate_activity(delta: float) -> void:
	var max_interval := ACTIVITY_MAX_INTERVAL_ONLINE
	if status != VisualStatus.ONLINE:
		max_interval = ACTIVITY_MAX_INTERVAL_IDLE
	for i in range(_activity_leds.size()):
		_activity_timers[i] -= delta
		if _activity_timers[i] > 0.0:
			continue
		_activity_timers[i] = _rng.randf_range(ACTIVITY_MIN_INTERVAL, max_interval)
		_activity_lit[i] = not _activity_lit[i]
		_set_led(_activity_leds[i], Style.LED_ACTIVITY if _activity_lit[i] else Style.LED_OFF)


func _refresh_leds() -> void:
	var power_color := Style.LED_POWER
	match status:
		VisualStatus.OVERHEAT:
			power_color = Style.LED_WARNING
		VisualStatus.FAULT:
			power_color = Style.LED_FAULT
		VisualStatus.OFFLINE:
			power_color = Style.LED_OFF
	_set_led(_power_led, power_color)
	if status == VisualStatus.FAULT or status == VisualStatus.OFFLINE:
		for i in range(_activity_leds.size()):
			_activity_lit[i] = false
			_set_led(_activity_leds[i], Style.LED_OFF)
	# No per-frame work at all for a server that is switched off.
	set_process(status != VisualStatus.OFFLINE)


func _set_led(led: MeshInstance3D, color: Color) -> void:
	if led == null:
		return
	if color == Style.LED_OFF:
		led.material_override = MeshFactory.material(Style.LED_OFF, 0.4)
	else:
		led.material_override = MeshFactory.emissive(color, Style.LED_ENERGY)


func _build() -> void:
	var h := get_chassis_height()
	var w := Style.SERVER_WIDTH
	var d := Style.SERVER_DEPTH
	var front_z := d * 0.5
	var mid_y := h * 0.5

	MeshFactory.box(self, Vector3(w, h, d), Vector3(0.0, mid_y, 0.0), MeshFactory.material(body_color, 0.55, 0.35), "Chassis")

	# Rack ears screwed onto the rack posts.
	var ear_mat := MeshFactory.material(Style.SERVER_BEZEL, 0.5, 0.5)
	for side in [-1.0, 1.0]:
		MeshFactory.box(self, Vector3(0.03, h, 0.02), Vector3(side * (w * 0.5 + 0.015), mid_y, front_z - 0.01), ear_mat)

	# Front bezel.
	var bezel_depth := 0.012
	MeshFactory.box(
		self,
		Vector3(w - 0.02, h - 0.012, bezel_depth),
		Vector3(0.0, mid_y, front_z + bezel_depth * 0.5),
		MeshFactory.material(body_color.darkened(0.25), 0.6, 0.2),
		"Bezel"
	)
	var face_z := front_z + bezel_depth

	# Hot-swap drive bays with their activity LED.
	var bay_mat := MeshFactory.material(Style.DRIVE_BAY, 0.7, 0.1)
	var bay_w := 0.065
	var bay_h := minf(h - 0.03, 0.05)
	var start_x := -w * 0.5 + 0.05
	for i in range(drive_bays):
		var x: float = start_x + i * (bay_w + 0.012) + bay_w * 0.5
		MeshFactory.no_shadow(MeshFactory.box(self, Vector3(bay_w, bay_h, 0.006), Vector3(x, mid_y, face_z + 0.003), bay_mat))
		var led := MeshFactory.no_shadow(
			MeshFactory.box(
				self,
				Vector3(0.012, 0.008, 0.006),
				Vector3(x + bay_w * 0.3, mid_y + bay_h * 0.5 - 0.008, face_z + 0.007),
				MeshFactory.material(Style.LED_OFF, 0.4)
			)
		)
		_activity_leds.append(led)
		_activity_timers.append(_rng.randf_range(ACTIVITY_MIN_INTERVAL, ACTIVITY_MAX_INTERVAL_ONLINE))
		_activity_lit.append(false)

	# Ventilation slits.
	var vent_mat := MeshFactory.material(Style.VENT, 0.9)
	for i in range(5):
		var vx: float = w * 0.5 - 0.17 + i * 0.022
		MeshFactory.no_shadow(MeshFactory.box(self, Vector3(0.012, h - 0.03, 0.004), Vector3(vx, mid_y, face_z + 0.002), vent_mat))

	# Power LED.
	_power_led = MeshFactory.no_shadow(
		MeshFactory.box(
			self, Vector3(0.018, 0.018, 0.006), Vector3(w * 0.5 - 0.045, mid_y, face_z + 0.003), MeshFactory.material(Style.LED_OFF, 0.4), "PowerLed"
		)
	)
