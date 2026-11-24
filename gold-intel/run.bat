@echo off
REM Lancement Windows : double-clic. Laisse la fenêtre ouverte (le PC doit rester allumé).
cd /d %~dp0
if not exist .venv ( py -3 -m venv .venv && .venv\Scripts\pip install -r requirements.txt )
.venv\Scripts\python -m app.main
pause
