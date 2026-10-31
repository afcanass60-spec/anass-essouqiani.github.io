# Guide de backtesting et de validation

Rappel : un backtest ne prouve pas une rentabilité future. L'objectif est de **rejeter** les versions
qui ne tiennent pas, pas de trouver la courbe la plus belle.

## 1. Préparer les données
1. Dans MT5, ouvrez XAUUSD en M1 et faites défiler (ou Outils → Options → Graphiques → *Max barres*
   = illimité) pour télécharger l'historique.
2. Exécutez le script **XQAI_ExportHistory** (6 ans) → `Common\Files\XQAI\data\XAUUSD_*.csv`.
3. Exécutez **XQAI_ExportCalendar** sur un compte connecté → `Common\Files\XQAI\calendar.csv`.
4. Copiez ces fichiers dans `xauusd-quantum-ai/data/broker/` (et `calendar.csv` à côté).

## 2. Environnement Python
```bash
cd xauusd-quantum-ai/python
python -m venv .venv && source .venv/bin/activate     # Windows : .venv\Scripts\activate
pip install -r requirements.txt
python -m pytest -q tests            # 34 tests : doivent tous passer
```
Configuration : copiez `configs/python_config.json` et adaptez **contrat, lot min, pas, levier,
commission, fuseau** à votre broker, `initial_balance` à votre capital (en **cents** pour un compte
cent : 100 € ≈ 10 000), `news_csv` vers `calendar.csv`.

## 3. Commandes (dans `python/`)
```bash
C="--data ../data/broker --config ../configs/my_config.json"
python scripts/xqai_cli.py backtest    $C     # métriques + baselines EMA et aléatoire + ventilations
python scripts/xqai_cli.py stress      $C     # spreads x1.5/x2, slippage x3, commission, paramètres
python scripts/xqai_cli.py walkforward $C --optimiser bayes --budget 40 --is-days 180 --oos-days 60
python scripts/xqai_cli.py optimisers  $C --budget 30 --seeds 3   # random / SA / BO / FMQA-SQA / FMQA-SA
python scripts/xqai_cli.py train       $C --with-qml              # LR, MLP, GBM, VQC simulé (purged WF)
python scripts/xqai_cli.py featsel     $C                         # mRMR vs QUBO (SA / SQA simulé)
python scripts/xqai_cli.py bandit      $C                         # RL : matrice régime -> stratégie
python scripts/xqai_cli.py regimes     $C                         # GMM vs régimes par règles
```
Chaque commande écrit un rapport JSON dans `reports/` (`backtest_trades.csv`, `backtest_equity.csv`,
`backtest_decisions.csv` pour le détail). Pour tester la chaîne sans données : `--synthetic`
(résultats **sans aucune valeur** pour l'or).

## 4. Lecture des résultats — critères d'acceptation proposés
| Critère | Seuil indicatif |
|---|---|
| Trades OOS (walk-forward) | ≥ 200 sur l'ensemble |
| Espérance OOS | > 0,10 R après coûts |
| Profit factor OOS | > 1,2 |
| Efficacité walk-forward | > 0,5 |
| Bat la baseline aléatoire | oui, nettement, dans **tous** les scénarios de `stress` |
| Monte Carlo : P(DD ≥ 5 %) | faible (sinon réduire le risque) ; P(perte) < 20 % |
| PBO (CSCV) | < 0,3 |
| Deflated Sharpe | > 0,95 |
| Stabilité | performance positive sur la majorité des années / régimes, pas une seule période |
| Fréquence | 0 à 5 trades/jour ; jours sans trade normaux |

Si ces critères ne sont pas atteints : **ne pas passer en réel**. Simplifiez (désactivez les
stratégies/sessions perdantes via les ventilations), revalidez sur une période **jamais utilisée**.
Chaque nouvel essai augmente le risque de sur-apprentissage : comptez-les (Deflated Sharpe).

## 5. Strategy Tester MT5 (référence d'exécution)
1. Testeur (Ctrl+R) → Expert `XauQuantumAI`, symbole XAUUSD, période M5 (l'EA lit lui-même les
   autres unités de temps).
2. Modélisation **« Every tick based on real ticks »** (sinon « Every tick »).
3. Dépôt = votre capital réel (ou en cents), levier réel, preset `XauQuantumAI_backtest.set`.
4. Placez `calendar.csv` dans `Common\Files\XQAI\` (sinon le journal indique que le filtre news n'est
   pas appliqué) ; pour l'IA native, `xqai_model.txt` au même endroit.
5. Lancez ; comparez avec le backtest Python sur la même période (nombre de trades, PF, DD). Des
   écarts modérés sont attendus (gestion M1 vs M5, ticks réels) ; des écarts importants signalent une
   divergence à investiguer (étape parité).
6. Optimisation MT5 possible : critère **Custom max** = même objectif robuste que Python (`OnTester`).
   Utilisez le **forward** intégré (1/3) et ne retenez jamais le seul meilleur résultat.

## 6. Contrôle de parité EA ↔ Python
1. Testeur, preset backtest + `InpDumpFeatures=true` sur 1–2 mois.
2. `python scripts/xqai_cli.py parity $C --ea-dump <Common>/Files/XQAI/XQAI_features_dump_tester.csv`
3. Attendu : écart max ≈ 1e-6. Un écart sur une feature précise désigne la fonction à comparer.

## 7. Plusieurs brokers et conditions de marché
Répétez sur un 2ᵉ broker et examinez la ventilation par régime (`by_regime`) et par année
(`monthly_pct`) : tendance haussière forte, range, crise de volatilité doivent tous être couverts.
