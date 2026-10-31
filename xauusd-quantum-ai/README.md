# XAUUSD Quantum AI — Expert Advisor MT5 autonome + moteur de recherche Python

Système de trading algorithmique spécialisé **XAUUSD**, conçu pour les petits comptes (50–300 €) :
analyse multi-timeframe (M1→H4), structure de marché (BOS, CHOCH, sweeps, FVG, order blocks),
6 stratégies sélectionnées selon le régime, score d'opportunité sur 100, filtre IA optionnel,
gestion du risque prioritaire, modes BACKTEST / DEMO / LIVE.

> ⚠️ **Aucune rentabilité n'est promise ni démontrée.** Le code est complet et testé sur le plan
> fonctionnel, mais la validation statistique sur données réelles reste à faire avec l'historique de
> votre broker (`docs/BACKTESTING.md`). Les essais réalisés pendant le développement portent sur des
> données synthétiques et ne disent rien de l'or. Le code MQL5 n'a pas pu être compilé dans
> l'environnement de développement : la compilation dans MetaEditor (F7) est la première étape.

## Ce qui est inclus
| Livrable | Emplacement |
|---|---|
| 1. Expert Advisor MQL5 complet (15 fichiers) | `mql5/Experts/XauQuantumAI/` |
| Scripts d'export historique + calendrier | `mql5/Scripts/` |
| 2. Modules Python (features, stratégies, backtester, ML, RL, optimisation quantum-inspired, validation) | `python/xqai/` |
| 3. Communication MT5 ↔ Python (pont fichiers fail-safe) | `python/xqai/bridge/`, `Include/Bridge.mqh` |
| 4. Configuration (`.set` MT5 générés depuis le code, JSON Python) | `configs/` |
| 5. Dashboard (panneau sur graphique + page web) | `Include/Dashboard.mqh`, `dashboard/` |
| 6. Installation MT5 | `docs/INSTALL_MT5.md` |
| 7. Configuration du broker | `docs/BROKER_SETUP.md` |
| 8. VPS 24 h/24 | `docs/VPS.md` |
| 9. Guide de backtesting | `docs/BACKTESTING.md` |
| 10. Passage en réel | `docs/GO_LIVE.md` |
| Architecture, limites MT5/Python/quantique, protocole de validation | `docs/ARCHITECTURE.md` |

## Démarrage rapide
```bash
cd python && pip install -r requirements.txt
python -m pytest -q tests                                   # 34 tests
python scripts/xqai_cli.py backtest --synthetic --balance 10000   # test de la chaîne (données factices)
python ../tools/mql5_lint.py ../mql5                        # contrôle structurel du MQL5
```
Puis : `docs/INSTALL_MT5.md` → démo → `docs/BACKTESTING.md` avec vos données → `docs/GO_LIVE.md`.

## Principes de risque (non négociables, codés en dur)
* Stop loss obligatoire sur chaque ordre, vérifié par `OrderCheck` ; le SL ne s'éloigne jamais.
* Lot = f(capital, risque %, distance du SL, contrat du broker) via `OrderCalcProfit` / `OrderCalcMargin`.
* **Refus du trade si le lot minimum dépasse le risque maximal** — jamais d'augmentation de lot.
* Pas de martingale, de grille, de moyenne à la baisse, de doublement après perte ; risque divisé
  par deux après une série de pertes, pause après perte, arrêt du jour après 3 pertes.
* Limite journalière 2 %, **HALT à 5 % de drawdown** (persistant), max 2 positions dans le même sens,
  la 2ᵉ seulement si la 1ʳᵉ est protégée, risque total ≤ 1 %.
* Mode dégradé : IA requise mais indisponible ⇒ aucun trade (par défaut).
* Kill switch : bouton STOP, fichier `STOP`, ou retrait de l'EA.

## Quantique : ce qui est réel
Aucun ordinateur quantique n'est utilisé. Le projet contient un **recuit quantique simulé** (Monte
Carlo en intégrale de chemin, sur CPU), une optimisation **quantum-inspired** FMQA (QUBO), et un
**classifieur quantique variationnel simulé** — chacun comparé à son équivalent classique et conservé
uniquement s'il fait mieux hors échantillon. Détails et mesures : `docs/ARCHITECTURE.md` §4.

## Arborescence
```
mql5/Experts/XauQuantumAI/   XauQuantumAI.mq5 + Include/*.mqh
mql5/Scripts/                XQAI_ExportHistory.mq5, XQAI_ExportCalendar.mq5
python/xqai/                 config, timeutils, indicators, structure, features, signals, risk,
                             backtester, metrics, validation, news, ml/, optim/, bridge/
python/scripts/xqai_cli.py   backtest | stress | walkforward | optimisers | train | featsel |
                             bandit | regimes | parity | synth
python/tests/                tests unitaires et d'invariants
dashboard/                   server.py + static/index.html
configs/                     presets .set + python_config*.json
tools/                       mql5_lint.py, make_set_files.py
docs/                        documentation
```
