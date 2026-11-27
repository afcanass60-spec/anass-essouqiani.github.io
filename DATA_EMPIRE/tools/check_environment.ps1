# DATA EMPIRE — Phase 0 environment check (Windows 10/11, PowerShell 5+).
# Read-only: it installs nothing and changes nothing.
#
# Usage (from the DATA_EMPIRE folder):
#   powershell -ExecutionPolicy Bypass -File .\tools\check_environment.ps1
#   (optional) -GodotPath "C:\Tools\Godot\Godot_v4.4.1-stable_win64_console.exe"

param(
    [string]$GodotPath = ""
)

$ErrorActionPreference = "Continue"
$minimumGodot = [version]"4.4"
$problems = @()

function Write-Check($label, $ok, $detail) {
    $status = if ($ok) { "[OK]  " } else { "[--]  " }
    $color = if ($ok) { "Green" } else { "Yellow" }
    Write-Host ($status + $label.PadRight(28) + $detail) -ForegroundColor $color
}

Write-Host "`n=== DATA EMPIRE - verification de l'environnement ===`n" -ForegroundColor Cyan

# --- Windows ------------------------------------------------------------------
$os = Get-CimInstance Win32_OperatingSystem
Write-Check "Windows" ($os.Caption -match "Windows 1[01]") "$($os.Caption) build $($os.BuildNumber) ($($os.OSArchitecture))"
$ramGb = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
Write-Check "RAM" ($ramGb -ge 8) "$ramGb Go (8 Go recommandes)"
$gpu = (Get-CimInstance Win32_VideoController | Select-Object -First 1).Name
Write-Check "GPU" ($null -ne $gpu) "$gpu"
$drive = Get-PSDrive -Name (Get-Location).Drive.Name
$freeGb = [math]::Round($drive.Free / 1GB, 1)
Write-Check "Espace disque libre" ($freeGb -ge 5) "$freeGb Go (5 Go recommandes avec les modeles d'export)"

# --- Godot --------------------------------------------------------------------
$godotCandidates = @()
if ($GodotPath -ne "") { $godotCandidates += $GodotPath }
$godotCandidates += (Get-Command godot*, Godot* -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source)
$godotCandidates += (Get-ChildItem -Path "C:\Tools\Godot", "$env:LOCALAPPDATA\Microsoft\WinGet\Packages", "$env:USERPROFILE\scoop\apps\godot", "$env:USERPROFILE\Desktop", "$env:USERPROFILE\Downloads" -Recurse -Filter "Godot_v4*.exe" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName)
$godotCandidates = $godotCandidates | Where-Object { $_ } | Select-Object -Unique

$godotFound = $null
foreach ($candidate in $godotCandidates) {
    try {
        $raw = (& $candidate --version 2>$null | Select-Object -Last 1)
        if ($raw -match "^(\d+)\.(\d+)") {
            $version = [version]"$($Matches[1]).$($Matches[2])"
            if ($version -ge $minimumGodot) { $godotFound = @{ Path = $candidate; Version = $raw }; break }
            Write-Check "Godot (trop ancien)" $false "$raw -> $candidate"
        }
    } catch { }
}
if ($godotFound) {
    Write-Check "Godot 4" $true "$($godotFound.Version) -> $($godotFound.Path)"
    if ($godotFound.Version -match "mono") {
        Write-Check "Edition Godot" $false "Edition .NET detectee : l'export Web ne supporte pas C#. Utilisez l'edition standard (GDScript)."
        $problems += "Installer l'edition standard (non .NET) de Godot."
    }
    $templates = Join-Path $env:APPDATA "Godot\export_templates"
    $tplDirs = Get-ChildItem $templates -Directory -ErrorAction SilentlyContinue
    $webTpl = $tplDirs | Where-Object { Test-Path (Join-Path $_.FullName "web_nothreads_release.zip") }
    Write-Check "Modeles d'export Web" ($null -ne $webTpl) $(if ($webTpl) { ($webTpl | Select-Object -ExpandProperty Name) -join ", " } else { "absents (necessaires en Phase 7 seulement)" })
} else {
    Write-Check "Godot 4" $false "introuvable (>= $minimumGodot requis)"
    $problems += "Installer Godot 4 : winget install --id GodotEngine.GodotEngine -e"
}

# --- Outils -------------------------------------------------------------------
$git = (git --version 2>$null)
Write-Check "Git" ($null -ne $git) $(if ($git) { $git } else { "absent -> winget install --id Git.Git -e" })
if (-not $git) { $problems += "Installer Git : winget install --id Git.Git -e" }

$code = (Get-Command code -ErrorAction SilentlyContinue)
Write-Check "Visual Studio Code" ($null -ne $code) $(if ($code) { $code.Source } else { "absent (optionnel) -> winget install --id Microsoft.VisualStudioCode -e" })
if ($code) {
    $hasGodotTools = (code --list-extensions 2>$null) -contains "geequlim.godot-tools"
    Write-Check "Extension godot-tools" $hasGodotTools $(if ($hasGodotTools) { "installee" } else { "code --install-extension geequlim.godot-tools" })
}

$python = (python --version 2>$null)
Write-Check "Python (optionnel)" ($null -ne $python) $(if ($python) { "$python (pour tools\validate_project.py)" } else { "absent : seul le validateur statique en depend" })

$claude = (Get-Command claude -ErrorAction SilentlyContinue)
Write-Check "Claude Code CLI" ($null -ne $claude) $(if ($claude) { $claude.Source } else { "non detecte dans le PATH" })

$winget = (Get-Command winget -ErrorAction SilentlyContinue)
Write-Check "winget" ($null -ne $winget) $(if ($winget) { "disponible" } else { "absent : installer 'App Installer' depuis le Microsoft Store" })

# --- Navigateur (WebGL 2) -----------------------------------------------------
$browsers = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Mozilla Firefox\firefox.exe"
) | Where-Object { Test-Path $_ }
Write-Check "Navigateur WebGL 2" ($browsers.Count -gt 0) $(if ($browsers) { ($browsers | ForEach-Object { Split-Path $_ -Leaf }) -join ", " } else { "Chrome, Edge ou Firefox recommande" })

# --- Synthese -----------------------------------------------------------------
Write-Host ""
if ($problems.Count -eq 0) {
    Write-Host "Environnement pret pour DATA EMPIRE." -ForegroundColor Green
    if ($godotFound) {
        Write-Host "Etape suivante : & `"$($godotFound.Path)`" --headless --path . -s res://tests/run_tests.gd" -ForegroundColor Cyan
    }
} else {
    Write-Host "Actions necessaires :" -ForegroundColor Yellow
    $problems | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
}
