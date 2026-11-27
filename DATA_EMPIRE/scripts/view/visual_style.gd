## VisualStyle — single source of truth for colours and shared visual dimensions.
##
## Every 3D view and UI script reads its palette from here, so the art direction
## can be tuned in one place (no colour literals scattered across the codebase).
extends RefCounted

# --- World palette -----------------------------------------------------------
const BACKGROUND := Color(0.035, 0.05, 0.09)
const GROUND := Color(0.23, 0.29, 0.24)
const ASPHALT := Color(0.16, 0.17, 0.19)
const APRON := Color(0.42, 0.42, 0.41)
const CONCRETE := Color(0.55, 0.55, 0.53)
const CONCRETE_JOINT := Color(0.40, 0.40, 0.39)
const OIL_STAIN := Color(0.18, 0.17, 0.16)
const WALL := Color(0.74, 0.71, 0.66)
const WALL_TRIM := Color(0.50, 0.48, 0.45)
const WALL_CUT := Color(0.22, 0.24, 0.28)
const GARAGE_DOOR := Color(0.62, 0.66, 0.70)
const DOOR_GROOVE := Color(0.42, 0.45, 0.49)
const WINDOW_GLOW := Color(0.55, 0.75, 0.95)
const WOOD := Color(0.52, 0.38, 0.25)
const WOOD_DARK := Color(0.36, 0.26, 0.17)
const PEGBOARD := Color(0.62, 0.50, 0.36)
const METAL_SHELF := Color(0.35, 0.38, 0.42)
const CARDBOARD := Color(0.69, 0.54, 0.35)
const CARDBOARD_DARK := Color(0.56, 0.43, 0.27)
const TOOL_DARK := Color(0.12, 0.13, 0.15)
const TOOL_RED := Color(0.70, 0.16, 0.14)
const VINTAGE_BEIGE := Color(0.80, 0.77, 0.69)
const CRT_SCREEN := Color(0.20, 0.85, 0.45)
const FOLIAGE := Color(0.20, 0.36, 0.25)
const FOLIAGE_LIGHT := Color(0.27, 0.45, 0.30)
const TRUNK := Color(0.34, 0.25, 0.18)

# --- Lights ------------------------------------------------------------------
const SUN_LIGHT := Color(1.0, 0.95, 0.88)
const AMBIENT_LIGHT := Color(0.55, 0.62, 0.78)
const WARM_LIGHT := Color(1.0, 0.86, 0.68)
const TUBE_LIGHT := Color(0.85, 0.95, 1.0)
const SERVER_GLOW := Color(0.18, 0.9, 0.84)

# --- Equipment ---------------------------------------------------------------
const RACK_FRAME := Color(0.11, 0.12, 0.15)
const RACK_MARKER := Color(0.55, 0.58, 0.62)
const SERVER_BODY := Color(0.17, 0.19, 0.23)
const SERVER_BEZEL := Color(0.30, 0.33, 0.38)
const DRIVE_BAY := Color(0.09, 0.10, 0.12)
const VENT := Color(0.05, 0.05, 0.06)
const FAN_BODY := Color(0.85, 0.86, 0.88)
const FAN_METAL := Color(0.60, 0.63, 0.67)
const FAN_BLADE := Color(0.30, 0.62, 0.85)
const PANEL_GREY := Color(0.58, 0.60, 0.62)
const WARNING_YELLOW := Color(0.95, 0.78, 0.15)
const POWER_CABLE := Color(0.07, 0.07, 0.08)
const NETWORK_CABLE := Color(0.15, 0.45, 0.95)
const ROUTER_BODY := Color(0.92, 0.93, 0.95)

# --- LEDs --------------------------------------------------------------------
const LED_OFF := Color(0.10, 0.11, 0.12)
const LED_POWER := Color(0.20, 1.0, 0.50)
const LED_ACTIVITY := Color(0.25, 0.75, 1.0)
const LED_WARNING := Color(1.0, 0.62, 0.10)
const LED_FAULT := Color(1.0, 0.18, 0.22)
const LED_ENERGY := 3.0

# --- UI ----------------------------------------------------------------------
const UI_ACCENT := Color(0.18, 0.90, 0.84)
const UI_PANEL := Color(0.06, 0.08, 0.13, 0.86)
const UI_BORDER := Color(0.18, 0.90, 0.84, 0.35)
const UI_BUTTON := Color(0.10, 0.13, 0.20, 0.92)
const UI_BUTTON_HOVER := Color(0.14, 0.20, 0.30, 0.95)
const UI_BUTTON_PRESSED := Color(0.10, 0.45, 0.48, 0.95)
const UI_TEXT := Color(0.92, 0.95, 0.98)
const UI_TEXT_MUTED := Color(0.62, 0.68, 0.76)

# --- Shared dimensions (stylised metres) ----------------------------------------
## Height of one rack unit (1U). Stylised: real 1U is 0.0445 m, doubled for readability.
const RACK_UNIT_HEIGHT := 0.09
## Vertical gap left between two stacked servers.
const RACK_UNIT_GAP := 0.006
const RACK_INNER_WIDTH := 0.64
const RACK_DEPTH := 0.8
const SERVER_WIDTH := 0.6
const SERVER_DEPTH := 0.68
