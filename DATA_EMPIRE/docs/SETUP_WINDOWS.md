# Installation et vérification de l'environnement (Windows 10/11)

Tout est gratuit et sans carte bancaire.

## 1. Vérification automatique

Depuis le dossier `DATA_EMPIRE` dans PowerShell :

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\check_environment.ps1
```

Le script est **en lecture seule**. Il vérifie : version de Windows, RAM, GPU, espace
disque, Godot 4 (version ≥ 4.4, édition non-.NET), modèles d'export Web, Git, VS Code +
extension godot-tools, Python (optionnel), Claude Code, winget, navigateur WebGL 2.
Il affiche ensuite la liste exacte des actions nécessaires.

## 2. Vérification manuelle (si vous préférez)

```powershell
Get-Command godot* -ErrorAction SilentlyContinue   # Godot dans le PATH ?
winget list --name Godot                            # Godot installé via winget ?
git --version
code --version
python --version                                    # optionnel
```

## 3. Installation

### Godot 4 (obligatoire)
Option A — winget (recommandé) :
```powershell
winget install --id GodotEngine.GodotEngine -e
```
Option B — manuel : télécharger l'édition **standard** (pas « .NET ») sur
<https://godotengine.org/download/windows/>, extraire dans `C:\Tools\Godot\`.
Godot est un exécutable portable : aucune installation système.

Deux exécutables sont fournis : `Godot_v4.x-stable_win64.exe` (éditeur) et
`Godot_v4.x-stable_win64_console.exe` (même chose + console : **à utiliser pour les tests**).

Version : le projet cible **Godot 4.4 minimum**. Une version 4.x plus récente fonctionne ;
Godot proposera de mettre à jour le format des fichiers à la première ouverture (accepter).

### Git (obligatoire pour l'historique du projet)
```powershell
winget install --id Git.Git -e
```

### VS Code (recommandé)
```powershell
winget install --id Microsoft.VisualStudioCode -e
code --install-extension geequlim.godot-tools
```
Dans Godot : *Éditeur → Paramètres de l'éditeur → Text Editor → External* :
activer *Use External Editor*, chemin vers `Code.exe`, arguments `{project} --goto {file}:{line}:{col}`.

### Python (optionnel)
Uniquement pour `tools/validate_project.py` et le linter GDScript :
```powershell
winget install --id Python.Python.3.12 -e
pip install "gdtoolkit==4.*"
```

## 4. Première exécution (critère de validation de la Phase 0)

```powershell
cd DATA_EMPIRE
# Import initial des ressources (crée le cache .godot/)
& "C:\Tools\Godot\Godot_v4.4.1-stable_win64_console.exe" --headless --path . --editor --quit
# Tests automatisés
powershell -ExecutionPolicy Bypass -File .\tools\run_tests.ps1 -Godot "C:\Tools\Godot\Godot_v4.4.1-stable_win64_console.exe"
```
Résultat attendu : `Result: 20 test(s), 20 passed, 0 failed` et aucune ligne `SCRIPT ERROR`.

Puis ouvrir l'éditeur, *Importer* → `DATA_EMPIRE/project.godot`, et lancer avec **F5**.
Vous devez voir : le garage en vue isométrique, le rack avec le serveur beige aux LED
clignotantes, le ventilateur qui tourne, les murs avant découpés.

## 5. Problèmes connus

| Symptôme | Cause | Solution |
|---|---|---|
| Écran noir / erreur OpenGL au lancement | pilote graphique ancien | mettre à jour le pilote GPU ; sinon lancer avec `--rendering-driver opengl3_angle` |
| « This project uses C# » / export Web impossible | édition .NET installée | installer l'édition standard |
| Aucune sortie console pendant les tests | `.exe` sans console utilisé | utiliser `*_console.exe` |
| Scripts PowerShell bloqués | politique d'exécution | utiliser `powershell -ExecutionPolicy Bypass -File ...` (n'affecte que cette commande) |
| Avertissements « UID » au premier import | Godot 4.4 génère des fichiers `.uid` | normal : les ajouter au dépôt Git |
