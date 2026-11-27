## World — composition root of the 3D scene: environment, lights, building, equipment.
##
## Phase 1 note: the starter layout below is intentionally hard-coded. From Phase 2,
## equipment placement will come from GameState (save data) through RackSystem, and
## this script will only spawn/despawn views in response to system signals.
extends Node3D

const Style := preload("res://scripts/view/visual_style.gd")
const MeshFactory := preload("res://scripts/view/mesh_factory.gd")
const CameraController := preload("res://scripts/world/camera_controller.gd")
const GarageView := preload("res://scripts/view/buildings/garage_view.gd")
const RackView := preload("res://scripts/view/equipment/rack_view.gd")
const ServerView := preload("res://scripts/view/equipment/server_view.gd")
const CoolingUnitView := preload("res://scripts/view/equipment/cooling_unit_view.gd")
const PowerUnitView := preload("res://scripts/view/equipment/power_unit_view.gd")
const NetworkRouterView := preload("res://scripts/view/equipment/network_router_view.gd")

const GarageScene := preload("res://scenes/buildings/garage.tscn")
const RackScene := preload("res://scenes/equipment/rack.tscn")
const ServerScene := preload("res://scenes/equipment/server.tscn")
const CoolingUnitScene := preload("res://scenes/equipment/cooling_unit.tscn")
const PowerUnitScene := preload("res://scenes/equipment/power_unit.tscn")
const NetworkRouterScene := preload("res://scenes/equipment/network_router.tscn")

# Starter layout (garage coordinates, floor top at y = 0).
const STARTER_RACK_POSITION := Vector3(-1.6, 0.0, -3.5)
const STARTER_RACK_UNITS := 12
const STARTER_SERVER_UNIT := 4
const STARTER_SERVER_HEIGHT := 2
const FAN_POSITION := Vector3(-0.35, 0.0, -2.2)
const POWER_PANEL_POSITION := Vector3(-2.75, 1.35, -4.0)
const ROUTER_POSITION := Vector3(-4.62, 0.93, -0.1)
const CABLE_THICKNESS := 0.025

var garage: GarageView
var starter_rack: RackView
var starter_server: ServerView
var cooling_unit: CoolingUnitView
var power_unit: PowerUnitView
var network_router: NetworkRouterView

@onready var camera_rig: CameraController = $CameraRig


func _ready() -> void:
	_setup_environment()
	_setup_sun()
	garage = GarageScene.instantiate() as GarageView
	add_child(garage)
	_place_starter_equipment()
	camera_rig.view_rotated.connect(garage.apply_camera_yaw)
	garage.apply_camera_yaw(camera_rig.get_yaw())


func get_camera_rig() -> CameraController:
	return camera_rig


func _setup_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Style.BACKGROUND
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Style.AMBIENT_LIGHT
	env.ambient_light_energy = 0.55
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.glow_enabled = true
	env.glow_intensity = 0.6
	env.glow_bloom = 0.05
	env.glow_hdr_threshold = 1.0
	var world_env := WorldEnvironment.new()
	world_env.name = "WorldEnvironment"
	world_env.environment = env
	add_child(world_env)


func _setup_sun() -> void:
	var sun := DirectionalLight3D.new()
	sun.name = "Sun"
	sun.rotation_degrees = Vector3(-52.0, -28.0, 0.0)
	sun.light_color = Style.SUN_LIGHT
	sun.light_energy = 0.85
	sun.shadow_enabled = true
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_ORTHOGONAL
	sun.directional_shadow_max_distance = 70.0
	add_child(sun)


func _place_starter_equipment() -> void:
	var equipment := Node3D.new()
	equipment.name = "Equipment"
	add_child(equipment)

	# The founder's first rack and the old beige server rescued from a clearance sale.
	starter_rack = RackScene.instantiate() as RackView
	starter_rack.name = "StarterRack"
	starter_rack.capacity_units = STARTER_RACK_UNITS
	starter_rack.position = STARTER_RACK_POSITION
	equipment.add_child(starter_rack)

	starter_server = ServerScene.instantiate() as ServerView
	starter_server.name = "VintageServer"
	starter_server.height_units = STARTER_SERVER_HEIGHT
	starter_server.body_color = Style.VINTAGE_BEIGE
	starter_server.drive_bays = 2
	starter_rack.mount(starter_server, STARTER_SERVER_UNIT, STARTER_SERVER_HEIGHT)

	# Cooling: a pedestal fan aimed at the rack.
	cooling_unit = CoolingUnitScene.instantiate() as CoolingUnitView
	cooling_unit.name = "PedestalFan"
	cooling_unit.position = FAN_POSITION
	var to_rack := STARTER_RACK_POSITION - FAN_POSITION
	cooling_unit.rotation.y = atan2(to_rack.x, to_rack.z)
	equipment.add_child(cooling_unit)

	# Power: wall panel (mounted on the north wall so it hides with it).
	power_unit = PowerUnitScene.instantiate() as PowerUnitView
	power_unit.name = "PowerPanel"
	power_unit.position = POWER_PANEL_POSITION
	var north_mount := garage.get_wall_mount("north")
	north_mount.add_child(power_unit)

	# Network: consumer internet box on the workbench.
	network_router = NetworkRouterScene.instantiate() as NetworkRouterView
	network_router.name = "InternetBox"
	network_router.position = ROUTER_POSITION
	network_router.rotation.y = PI * 0.5
	equipment.add_child(network_router)

	_build_cables(equipment, north_mount)
	_add_rack_glow(equipment)


func _build_cables(equipment: Node3D, north_mount: Node3D) -> void:
	var power_mat := MeshFactory.material(Style.POWER_CABLE, 0.7)
	var network_mat := MeshFactory.material(Style.NETWORK_CABLE, 0.5)
	var floor_y := CABLE_THICKNESS * 0.5
	var panel_bottom := POWER_PANEL_POSITION + power_unit.get_bottom_local()
	var wall_z := panel_bottom.z - 0.03

	# Power: down the wall (hidden with the wall), then along the floor into the rack.
	(
		MeshFactory
		. cable(
			north_mount,
			PackedVector3Array(
				[
					Vector3(panel_bottom.x, panel_bottom.y, wall_z),
					Vector3(panel_bottom.x, floor_y, wall_z),
				]
			),
			CABLE_THICKNESS,
			power_mat,
			"PowerDrop"
		)
	)
	(
		MeshFactory
		. cable(
			equipment,
			PackedVector3Array(
				[
					Vector3(panel_bottom.x, floor_y, wall_z),
					Vector3(-2.1, floor_y, wall_z),
					Vector3(-2.1, floor_y, -3.75),
					Vector3(-1.85, floor_y, -3.75),
				]
			),
			CABLE_THICKNESS,
			power_mat,
			"PowerFeed"
		)
	)

	# Network: from the internet box, down the workbench, along the floor, up to the server.
	var server_port_y := STARTER_RACK_POSITION.y + starter_rack.get_slot_position(STARTER_SERVER_UNIT).y + starter_server.get_chassis_height() * 0.5
	(
		MeshFactory
		. cable(
			equipment,
			PackedVector3Array(
				[
					Vector3(ROUTER_POSITION.x - 0.09, ROUTER_POSITION.y + 0.02, ROUTER_POSITION.z),
					Vector3(ROUTER_POSITION.x - 0.15, ROUTER_POSITION.y + 0.02, -0.45),
					Vector3(ROUTER_POSITION.x - 0.15, floor_y, -0.45),
					Vector3(ROUTER_POSITION.x - 0.15, floor_y, -2.9),
					Vector3(-1.75, floor_y, -2.9),
					Vector3(-1.75, floor_y, -3.05),
					Vector3(-1.75, server_port_y, -3.05),
					Vector3(-1.75, server_port_y, -3.14),
				]
			),
			CABLE_THICKNESS * 0.7,
			network_mat,
			"NetworkUplink"
		)
	)


func _add_rack_glow(equipment: Node3D) -> void:
	var glow := OmniLight3D.new()
	glow.name = "RackGlow"
	glow.light_color = Style.SERVER_GLOW
	glow.light_energy = 0.6
	glow.omni_range = 2.2
	glow.position = STARTER_RACK_POSITION + Vector3(0.0, 0.9, 0.7)
	equipment.add_child(glow)
