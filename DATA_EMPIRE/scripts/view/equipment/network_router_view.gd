## NetworkRouterView — consumer internet box: the Chapter 1 "standard connection".
##
## Origin = bottom centre, front (LEDs) facing +Z. Later network tiers (pro link,
## fibre, redundant uplinks) will get their own rack-mounted views.
extends Node3D

const MeshFactory := preload("res://scripts/view/mesh_factory.gd")
const Style := preload("res://scripts/view/visual_style.gd")

const LED_COUNT := 4

var _leds: Array[MeshInstance3D] = []
var _timers: Array[float] = []
var _lit: Array[bool] = []
var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	_rng.randomize()
	_build()


func _process(delta: float) -> void:
	# LED 0 is the steady power LED; the others flicker with traffic.
	for i in range(1, _leds.size()):
		_timers[i] -= delta
		if _timers[i] > 0.0:
			continue
		_timers[i] = _rng.randf_range(0.05, 0.6)
		_lit[i] = not _lit[i]
		_leds[i].material_override = MeshFactory.emissive(Style.LED_ACTIVITY, Style.LED_ENERGY) if _lit[i] else MeshFactory.material(Style.LED_OFF, 0.4)


func _build() -> void:
	MeshFactory.box(self, Vector3(0.24, 0.045, 0.16), Vector3(0.0, 0.0225, 0.0), MeshFactory.material(Style.ROUTER_BODY, 0.4), "Body")
	var antenna_mat := MeshFactory.material(Style.TOOL_DARK, 0.6)
	for side in [-1.0, 1.0]:
		var antenna := MeshFactory.box(self, Vector3(0.012, 0.16, 0.012), Vector3(side * 0.1, 0.12, -0.07), antenna_mat)
		antenna.rotation.z = side * 0.15
	for i in range(LED_COUNT):
		var led_x: float = -0.06 + i * 0.04
		var led := MeshFactory.no_shadow(
			MeshFactory.box(self, Vector3(0.012, 0.008, 0.004), Vector3(led_x, 0.03, 0.082), MeshFactory.material(Style.LED_OFF, 0.4))
		)
		_leds.append(led)
		_timers.append(_rng.randf_range(0.05, 0.6))
		_lit.append(false)
	_leds[0].material_override = MeshFactory.emissive(Style.LED_POWER, Style.LED_ENERGY)
