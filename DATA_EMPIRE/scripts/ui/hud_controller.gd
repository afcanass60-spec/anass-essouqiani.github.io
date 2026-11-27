## HudController — Phase 0/1 overlay: title card, controls hint, camera buttons, FPS.
##
## The HUD only emits intent signals; main.gd wires them to the camera. No direct
## reference to gameplay or 3D nodes, so the UI can be redesigned (or replaced by a
## touch-first layout on iOS) without touching the systems.
## Buttons are 56 px minimum: comfortable touch targets.
extends CanvasLayer

signal zoom_in_requested
signal zoom_out_requested
signal rotate_left_requested
signal rotate_right_requested
signal recenter_requested

const Style := preload("res://scripts/view/visual_style.gd")
const TOUCH_TARGET := Vector2(56.0, 56.0)
const SCREEN_MARGIN := 16
const FPS_REFRESH_SECONDS := 0.5

var _fps_label: Label
var _fps_timer := 0.0


func _ready() -> void:
	_build()


func _process(delta: float) -> void:
	_fps_timer -= delta
	if _fps_timer <= 0.0:
		_fps_timer = FPS_REFRESH_SECONDS
		_fps_label.text = "%d FPS" % Engine.get_frames_per_second()


func _build() -> void:
	var margin := MarginContainer.new()
	margin.name = "SafeArea"
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for side in ["left", "top", "right", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, SCREEN_MARGIN)
	add_child(margin)

	var column := VBoxContainer.new()
	column.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.add_child(column)

	var top_row := HBoxContainer.new()
	top_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	column.add_child(top_row)
	top_row.add_child(_build_title_card())
	top_row.add_child(_expanding_spacer())
	_fps_label = _make_label("-- FPS", 14, Style.UI_TEXT_MUTED)
	_fps_label.name = "FpsLabel"
	_fps_label.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	top_row.add_child(_fps_label)

	var middle := _expanding_spacer()
	middle.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(middle)

	var bottom_row := HBoxContainer.new()
	bottom_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	column.add_child(bottom_row)
	bottom_row.add_child(_build_hint_card())
	bottom_row.add_child(_expanding_spacer())
	bottom_row.add_child(_build_camera_controls())


func _build_title_card() -> PanelContainer:
	var card := _panel()
	card.name = "TitleCard"
	var box := VBoxContainer.new()
	box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	card.add_child(box)
	box.add_child(_make_label("DATA EMPIRE", 24, Style.UI_ACCENT))
	box.add_child(_make_label("Chapitre 1 — Garage Computing", 15, Style.UI_TEXT))
	box.add_child(_make_label("Prototype Phase 0 · scène de démonstration (pas encore de gameplay)", 12, Style.UI_TEXT_MUTED))
	return card


func _build_hint_card() -> PanelContainer:
	var card := _panel()
	card.name = "HintCard"
	card.size_flags_vertical = Control.SIZE_SHRINK_END
	var hint := _make_label(
		(
			"Souris : clic droit ou molette-clic + glisser = déplacer · molette = zoom\n"
			+ "Clavier : ZQSD/WASD ou flèches = déplacer · A/E (Q/E en QWERTY) = pivoter · +/- = zoom · Espace = recentrer\n"
			+ "Tactile : 1 doigt = déplacer · pincer = zoom"
		),
		13,
		Style.UI_TEXT_MUTED
	)
	hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hint.custom_minimum_size = Vector2(540.0, 0.0)
	card.add_child(hint)
	return card


func _build_camera_controls() -> HBoxContainer:
	var row := HBoxContainer.new()
	row.name = "CameraControls"
	row.size_flags_vertical = Control.SIZE_SHRINK_END
	row.add_theme_constant_override("separation", 8)
	row.add_child(_make_button("<", "Pivoter à gauche (A / Q)", rotate_left_requested.emit, "RotateLeft"))
	row.add_child(_make_button(">", "Pivoter à droite (E)", rotate_right_requested.emit, "RotateRight"))
	row.add_child(_make_button("-", "Dézoomer (-)", zoom_out_requested.emit, "ZoomOut"))
	row.add_child(_make_button("+", "Zoomer (+)", zoom_in_requested.emit, "ZoomIn"))
	row.add_child(_make_button("Centrer", "Recentrer la vue (Espace)", recenter_requested.emit, "Recenter"))
	return row


# --- Widgets -------------------------------------------------------------------


func _panel() -> PanelContainer:
	var panel := PanelContainer.new()
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	var style := StyleBoxFlat.new()
	style.bg_color = Style.UI_PANEL
	style.border_color = Style.UI_BORDER
	style.set_border_width_all(1)
	style.set_corner_radius_all(12)
	style.content_margin_left = 14.0
	style.content_margin_right = 14.0
	style.content_margin_top = 10.0
	style.content_margin_bottom = 10.0
	panel.add_theme_stylebox_override("panel", style)
	return panel


func _make_label(text: String, font_size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = text
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	return label


func _make_button(text: String, tooltip: String, callback: Callable, node_name: String) -> Button:
	var button := Button.new()
	button.name = node_name
	button.text = text
	button.tooltip_text = tooltip
	button.custom_minimum_size = TOUCH_TARGET
	# No keyboard focus: Space must recenter the camera, not re-press the last button.
	button.focus_mode = Control.FOCUS_NONE
	button.add_theme_font_size_override("font_size", 20)
	button.add_theme_color_override("font_color", Style.UI_TEXT)
	button.add_theme_stylebox_override("normal", _button_style(Style.UI_BUTTON))
	button.add_theme_stylebox_override("hover", _button_style(Style.UI_BUTTON_HOVER))
	button.add_theme_stylebox_override("pressed", _button_style(Style.UI_BUTTON_PRESSED))
	button.pressed.connect(callback)
	return button


func _button_style(color: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.border_color = Style.UI_BORDER
	style.set_border_width_all(1)
	style.set_corner_radius_all(14)
	style.content_margin_left = 12.0
	style.content_margin_right = 12.0
	return style


func _expanding_spacer() -> Control:
	var spacer := Control.new()
	spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return spacer
