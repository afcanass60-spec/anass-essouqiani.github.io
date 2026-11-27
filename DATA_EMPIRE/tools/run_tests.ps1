# DATA EMPIRE — run the headless test suite on Windows.
# Usage (from the DATA_EMPIRE folder):
#   powershell -ExecutionPolicy Bypass -File .\tools\run_tests.ps1 -Godot "C:\Tools\Godot\Godot_v4.4.1-stable_win64_console.exe"
# Use the *_console.exe build so the output appears in the terminal.

param(
    [string]$Godot = "godot"
)

$project = Split-Path -Parent $PSScriptRoot

# 1. Import resources once (creates the .godot/ cache and the global class list).
& $Godot --headless --path $project --editor --quit 2>&1 | Out-Null

# 2. Run the tests and capture everything.
$output = & $Godot --headless --path $project -s res://tests/run_tests.gd 2>&1 | ForEach-Object { "$_" }
$exitCode = $LASTEXITCODE
$output | ForEach-Object { Write-Host $_ }

# 3. A GDScript runtime error must fail the run even if the assertions passed.
$scriptErrors = $output | Where-Object { $_ -match "SCRIPT ERROR|Parse Error|Failed to load script" }
if ($scriptErrors) {
    Write-Host "`nScript errors detected:" -ForegroundColor Red
    $scriptErrors | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    exit 1
}
exit $exitCode
