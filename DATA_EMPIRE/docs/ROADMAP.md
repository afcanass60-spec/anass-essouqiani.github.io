# Roadmap

Règle : une phase n'est **terminée** que lorsque tous ses critères sont validés par une
exécution réelle. Légende : ✅ validé · 🟡 fait, en attente de validation · ⏳ à faire.

## Phase 0 — Analyse et préparation · 🟡

| Critère | État |
|---|---|
| Environnement Windows vérifié | 🟡 script `tools/check_environment.ps1` fourni — **à exécuter sur le PC** |
| Godot 4 disponible | 🟡 à confirmer par le script |
| Projet créé, compatible Web (renderer Compatibility) | ✅ |
| Arborescence + conventions | ✅ |
| Documents d'architecture / design / roadmap | ✅ |
| Risques identifiés | ✅ (TECHNICAL_ARCHITECTURE §10) |
| Scène 3D isométrique préparée | 🟡 écrite, syntaxe validée |
| **Projet ouvert dans Godot sans erreur + 20 tests passés** | ⏳ **bloquant — sur le PC Windows** |

## Phase 1 — Prototype visuel · 🟡 (anticipée en Phase 0)

Garage, sol, murs, caméra isométrique, rack, serveur, matériaux, éclairage, navigation.
Critères : scène affichée à ≥ 60 FPS desktop ; caméra fluide souris + clavier ; murs avant
découpés à chaque angle ; retours visuels de l'utilisateur intégrés.

## Phase 2 — Gameplay de base · ⏳
Argent, `data/servers.json`, boutique, installation dans les racks (RackSystem : capacité en U,
chevauchements), CPU/RAM, revenus, maintenance, `SimulationClock` à pas fixe.
Tests : `test_economy.gd`, `test_servers.gd`.

## Phase 3 — Clients et contrats · ⏳
10 contrats fictifs, exigences, calcul de capacité, revenus, pénalités. `test_contracts.gd`.

## Phase 4 — Simulation technique · ⏳
Électricité, refroidissement, température, pannes, 3 incidents, disponibilité SLA.

## Phase 5 — Progression et sauvegarde · ⏳
XP, niveaux, réputation, déblocages, sauvegarde versionnée, hors ligne plafonné.
`test_save.gd`, `test_progression.gd`.

## Phase 6 — Interface et polish · ⏳
Barre supérieure, panneaux gestion/boutique/contrats, notifications, animations.

## Phase 7 — Export navigateur · ⏳
Export Web mono-thread, tests navigateur (Chrome/Edge/Firefox), sauvegarde IndexedDB,
publication GitHub Pages.

## Phase 8 — Préparation iOS · ⏳
Safe area, tactile, performances, plan d'export Mac/Xcode (voir EXPORT_GUIDE.md).

## Après le MVP
Chapitres 2–7, appels d'offres avec concurrents simulés, régions et latence, classements
(local puis backend gratuit à étudier), défis hebdomadaires.
