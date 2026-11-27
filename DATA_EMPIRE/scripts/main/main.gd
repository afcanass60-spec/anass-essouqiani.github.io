## Main — application entry point and composition root.
##
## Wires the HUD intents to the camera rig. From Phase 2 it will also own the
## SimulationClock and connect core managers (economy, save...) to the views.
## Nothing else should reach across the World / HUD boundary.
extends Node

const WorldScript := preload("res://scripts/world/world.gd")
const HudController := preload("res://scripts/ui/hud_controller.gd")

@onready var world: WorldScript = $World
@onready var hud: HudController = $HUD


func _ready() -> void:
	var camera_rig := world.get_camera_rig()
	hud.zoom_in_requested.connect(camera_rig.zoom_in)
	hud.zoom_out_requested.connect(camera_rig.zoom_out)
	hud.rotate_left_requested.connect(camera_rig.rotate_left)
	hud.rotate_right_requested.connect(camera_rig.rotate_right)
	hud.recenter_requested.connect(camera_rig.reset_view.bind(false))
