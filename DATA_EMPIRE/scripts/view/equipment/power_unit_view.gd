## PowerUnitView — wall-mounted electrical panel (Chapter 1 power supply).
##
## Origin = centre of the panel's back face, flush against the wall, front facing +Z.
## `powered` will be driven by PowerSystem (Phase 4: overload / blackout incidents).
extends Node3D

const MeshFactory := preload("res://scripts/view/mesh_factory.gd")
const Style := preload("res://scripts/view/visual_style.gd")

const WIDTH := 0.5
const HEIGHT := 0.66
const DEPTH := 0.12

@export var powered: bool = true:
	set = set_powered

var _indicator: MeshInstance3D
var _display: MeshInstance3D


func _ready() -> void:
	_build()
	set_powered(powered)


func set_powered(value: bool) -> void:
	powered = value
	if _indicator == null:
		return
	_indicator.material_override = MeshFactory.emissive(Style.LED_POWER if powered else Style.LED_FAULT, Style.LED_ENERGY)
	_display.material_override = MeshFactory.emissive(Style.SERVER_GLOW, 1.2) if powered else MeshFactory.material(Style.LED_OFF, 0.4)


func get_bottom_local() -> Vector3:
	return Vector3(0.0, -HEIGHT * 0.5, DEPTH * 0.5)


func _build() -> void:
	var cabinet := MeshFactory.material(Style.PANEL_GREY, 0.6, 0.4)
	var dark := MeshFactory.material(Style.TOOL_DARK, 0.6)
	var front_z := DEPTH

	MeshFactory.box(self, Vector3(WIDTH, HEIGHT, DEPTH), Vector3(0.0, 0.0, DEPTH * 0.5), cabinet, "Cabinet")
	# Door seam and hinge side.
	MeshFactory.no_shadow(MeshFactory.box(self, Vector3(WIDTH - 0.04, 0.006, 0.004), Vector3(0.0, HEIGHT * 0.5 - 0.06, front_z + 0.002), dark))
	# Yellow high-voltage warning plate.
	MeshFactory.no_shadow(
		MeshFactory.box(self, Vector3(0.12, 0.1, 0.004), Vector3(-0.13, HEIGHT * 0.5 - 0.13, front_z + 0.002), MeshFactory.material(Style.WARNING_YELLOW, 0.5))
	)
	# Main breaker lever.
	MeshFactory.box(self, Vector3(0.05, 0.1, 0.05), Vector3(0.14, 0.02, front_z + 0.025), dark, "Breaker")
	# Status LED and small power meter display.
	_indicator = MeshFactory.no_shadow(MeshFactory.box(self, Vector3(0.025, 0.025, 0.006), Vector3(0.14, 0.13, front_z + 0.003), dark, "Indicator"))
	_display = MeshFactory.no_shadow(MeshFactory.box(self, Vector3(0.16, 0.06, 0.006), Vector3(-0.1, -0.05, front_z + 0.003), dark, "Meter"))
