## Phase 0 deliverables: required project files and documents exist.
extends "res://tests/framework/test_case.gd"

const REQUIRED_FILES := [
	"res://project.godot",
	"res://README.md",
	"res://CHANGELOG.md",
	"res://EXPORT_GUIDE.md",
	"res://docs/GAME_DESIGN.md",
	"res://docs/TECHNICAL_ARCHITECTURE.md",
	"res://docs/GAME_BALANCE.md",
	"res://docs/ROADMAP.md",
	"res://docs/SETUP_WINDOWS.md",
	"res://scenes/main/main.tscn",
]


func test_required_files_exist() -> void:
	for path in REQUIRED_FILES:
		assert_true(FileAccess.file_exists(path), "missing " + path)


func test_main_scene_is_configured() -> void:
	assert_eq(ProjectSettings.get_setting("application/run/main_scene"), "res://scenes/main/main.tscn")


func test_renderer_is_web_compatible() -> void:
	# The Web export only supports the Compatibility (OpenGL ES 3 / WebGL 2) renderer.
	assert_eq(ProjectSettings.get_setting("rendering/renderer/rendering_method"), "gl_compatibility")
