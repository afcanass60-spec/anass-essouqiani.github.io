# Installation sur MetaTrader 5

## 1. Copier les fichiers
Dans MT5 : **Fichier → Ouvrir le dossier des données** (`MQL5\` s'y trouve).

| Source (ce dépôt) | Destination |
|---|---|
| `mql5/Experts/XauQuantumAI/` (dossier entier, avec `Include/`) | `MQL5\Experts\XauQuantumAI\` |
| `mql5/Scripts/XQAI_ExportHistory.mq5` | `MQL5\Scripts\` |
| `mql5/Scripts/XQAI_ExportCalendar.mq5` | `MQL5\Scripts\` |
| `configs/*.set` | `MQL5\Presets\` |

Le script calendrier inclut `..\Experts\XauQuantumAI\Include\TimeUtils.mqh` : respectez l'arborescence.

## 2. Compiler (obligatoire)
Ouvrez MetaEditor (F4), ouvrez `Experts\XauQuantumAI\XauQuantumAI.mq5`, appuyez sur **F7**.
Faites de même pour les deux scripts.

> Le code n'a **pas pu être compilé** dans l'environnement de développement (MetaEditor
> indisponible). Il a été écrit en respectant l'API MQL5 et vérifié par un linter structurel
> (`tools/mql5_lint.py`), mais **la compilation F7 est la première vérification réelle**. Si
> MetaEditor signale une erreur, notez le fichier/ligne/message : la correction est en général
> immédiate. Les *warnings* de conversion implicite sont sans conséquence.

## 3. Préparer le dossier commun
L'EA, les scripts et Python échangent via `%APPDATA%\MetaQuotes\Terminal\Common\Files\XQAI\`
(créé automatiquement). Contenu :

| Fichier | Rôle |
|---|---|
| `xqai_model.txt` | modèle IA exporté par `xqai_cli.py train` (optionnel) |
| `calendar.csv` | calendrier exporté (pour le Strategy Tester) |
| `data\XAUUSD_*.csv` | historique exporté pour Python |
| `status.json`, `journal_*.csv`, `log_*.txt` | écrits par l'EA (dashboard) |
| `STOP` | si ce fichier existe, l'EA ferme ses positions et s'arrête |

## 4. Lancer en DEMO
1. Ouvrez un graphique **XAUUSD** (n'importe quelle unité de temps ; M5 conseillé pour lire le panneau).
2. Activez **Trading algorithmique** dans la barre d'outils.
3. Glissez l'EA sur le graphique → onglet *Commun* : cochez *Autoriser le trading algorithmique* →
   onglet *Paramètres* : **Charger** `XauQuantumAI_demo.set`.
4. Vérifiez l'onglet **Experts** : lignes `account …`, `XAUUSD contract=…`, diagnostic petit compte,
   `news source: MT5 calendar`, `mode DEMO ready`.

Le mode DEMO **refuse** de démarrer sur un compte réel.

## 5. Panneau et commandes
* Panneau en haut à gauche : capital, equity, P/L, drawdown, trades, win rate, PF, régime, signal,
  score, probabilité IA, état IA, news, dernière décision.
* **STOP + CLOSE** : ferme toutes les positions de l'EA et l'arrête (état HALT persistant ; pour
  repartir : redémarrer l'EA avec `InpResetHalt=true` après analyse).
* **PAUSE / RESUME** : bloque les nouvelles entrées, les positions restent gérées.
* Arrêt immédiat alternatif : créer le fichier `Common\Files\XQAI\STOP` (ou bouton du dashboard web),
  ou simplement retirer l'EA du graphique / désactiver le trading algorithmique.

## 6. IA (optionnel)
* **Native** : copiez `models/xqai_model.txt` vers `Common\Files\XQAI\xqai_model.txt`, chargez
  `XauQuantumAI_demo_ai_native.set`. Log attendu : `native model loaded`.
* **Pont Python** : voir `VPS.md` §4 ; `InpAIMode = BRIDGE_FALLBACK` recommandé.
* Si le modèle est absent/incompatible : politique `InpDegradedPolicy` (par défaut **aucun trade**).

## 7. Paramètres clés
| Paramètre | Défaut | Rôle |
|---|---|---|
| `InpRiskPercent` | 0,5 | risque par trade (refusé si > 2) |
| `InpMaxRiskPercentHard` | 0,75 | refus si le **lot minimum** dépasse ce risque |
| `InpDailyLossLimitPercent` | 2 | stop des entrées pour la journée |
| `InpMaxDrawdownPercent` | 5 | **HALT** + fermeture de tout |
| `InpMinScore` | 65 | score minimal /100 |
| `InpRegimeMatrix` | voir ARCHITECTURE §5.1 | stratégies autorisées par régime |
| `InpServerTZ` | EET_US | modèle de fuseau du broker (voir BROKER_SETUP) |
| `InpDumpFeatures` | false | écrit les features pour le contrôle de parité Python |
