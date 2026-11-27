## CoolingUnitView — the Chapter 1 cooling solution: a cheap pedestal fan.
##
## Later tiers (CRAC units, in-row coolers, liquid loops) will be separate views
## sharing the same `running` API. Origin = floor centre, airflow towards +Z.
extends Node3D

const MeshFactory := preload("res://scripts/view/mesh_factory.gd")
const Style := preload("res://scripts/view/visual_style.gd")

@export var running: bool = true:
	set = set_running
## Blade speed in radians per second when running.
@export var spin_speed: float = 14.0

var _rotor: Node3D


func _ready() -> void:
	_build()
	set_running(running)


func set_running(value: bool) -> void:
	running = value
	set_process(running)


func _process(delta: float) -> void:
	if _rotor != null:
		_rotor.rotate_z(spin_speed * delta)


func _build() -> void:
	var body := MeshFactory.material(Style.FAN_BODY, 0.5, 0.1)
	var metal := MeshFactory.material(Style.FAN_METAL, 0.35, 0.8)
	var blade_mat := MeshFactory.material(Style.FAN_BLADE, 0.4, 0.0)

	MeshFactory.cylinder(self, 0.26, 0.05, Vector3(0.0, 0.025, 0.0), body, "Base")
	MeshFactory.cylinder(self, 0.025, 0.85, Vector3(0.0, 0.475, 0.0), metal, "Pole")

	var head := Node3D.new()
	head.name = "Head"
	head.position = Vector3(0.0, 0.95, 0.0)
	head.rotation.x = deg_to_rad(8.0)
	add_child(head)

	var motor := MeshFactory.cylinder(head, 0.08, 0.16, Vector3(0.0, 0.0, -0.1), body, "Motor")
	motor.rotation.x = PI * 0.5

	var cage := MeshFactory.torus(head, 0.3, 0.33, Vector3.ZERO, metal, "Cage")
	cage.rotation.x = PI * 0.5
	for i in range(4):
		var bar := MeshFactory.no_shadow(MeshFactory.box(head, Vector3(0.6, 0.008, 0.008), Vector3(0.0, 0.0, 0.06), metal))
		bar.rotation.z = i * PI / 4.0

	_rotor = Node3D.new()
	_rotor.name = "Rotor"
	head.add_child(_rotor)
	var hub := MeshFactory.cylinder(_rotor, 0.05, 0.05, Vector3.ZERO, body, "Hub")
	hub.rotation.x = PI * 0.5
	for i in range(3):
		var blade_pivot := Node3D.new()
		blade_pivot.rotation.z = i * TAU / 3.0
		_rotor.add_child(blade_pivot)
		var blade := MeshFactory.box(blade_pivot, Vector3(0.1, 0.24, 0.01), Vector3(0.0, 0.15, 0.0), blade_mat)
		blade.rotation.y = deg_to_rad(20.0)
