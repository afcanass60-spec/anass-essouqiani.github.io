# Architecture technique, limites et protocole de validation

> **Avertissement.** Ce projet est un système de trading algorithmique de recherche et d'exécution.
> **Aucune rentabilité n'est garantie, ni démontrée à ce stade** : le code a été testé sur le plan
> fonctionnel (tests unitaires, invariants de risque, absence de look-ahead) mais **aucune validation
> statistique sur données réelles XAUUSD n'a encore été exécutée** — elle nécessite l'historique de
> votre broker (voir `BACKTESTING.md`). Les seuls chiffres produits pendant le développement l'ont été
> sur des données **synthétiques** et ne prouvent rien sur l'or.

---

## 1. Vue d'ensemble

```
┌──────────────────────────── MetaTrader 5 (Windows / VPS) ────────────────────────────┐
│ XauQuantumAI.mq5  (Expert Advisor, autonome)                                         │
│  ├─ Features.mqh     données M1/M5/M15/M30/H1/H4 (barres CLÔTURÉES uniquement)       │
│  ├─ Indicators.mqh   EMA 9/20/50/100/200, RSI, MACD, ATR, ADX, Bollinger             │
│  ├─ Structure.mqh    swings, HH/HL/LH/LL, BOS, CHOCH, sweeps, FVG, order blocks      │
│  ├─ Signals.mqh      régime → 6 stratégies → SL/TP structurels → score /100          │
│  ├─ AIModel.mqh      réseau de neurones exporté, évalué nativement (aussi en tester) │
│  ├─ Bridge.mqh       pont fichiers ↔ service Python (optionnel, fail-safe)           │
│  ├─ NewsFilter.mqh   calendrier économique MT5 (+ CSV pour le testeur)               │
│  ├─ RiskManager.mqh  taille de lot (OrderCalcProfit/Margin), limites jour/DD/séries  │
│  ├─ Trader.mqh       OrderCheck, envoi, BE, partiels, trailing, sorties              │
│  ├─ SafetyGuard.mqh  modes BACKTEST/DEMO/LIVE, contrôles compte/symbole, kill switch │
│  └─ Dashboard.mqh    panneau graphique + status.json                                 │
│                    │ Common\Files\XQAI\ (status, journaux, requêtes IA, STOP)        │
└────────────────────┼─────────────────────────────────────────────────────────────────┘
                     │
┌────────────────────┴──────────── Python 3.11+ ───────────────────────────────────────┐
│ xqai/  (jumeau de recherche : mêmes features, mêmes règles, même gestion du risque)   │
│  features / signals / risk / backtester      → backtests rapides, walk-forward        │
│  ml/  dataset (méta-labelling), models (LR, MLP, GBM, VQC simulé), bandit (RL),       │
│       regime_cluster (GMM)                                                           │
│  optim/  annealing (SA, recuit quantique SIMULÉ), optimizers (aléatoire, SA, BO, FMQA)│
│  validation  walk-forward, Monte Carlo, Deflated Sharpe, PBO (CSCV), baselines        │
│  bridge/server.py  service d'inférence pour l'EA                                     │
│ dashboard/server.py  tableau de bord web (lecture des fichiers de l'EA)              │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Principe directeur : un seul système, deux implémentations synchronisées

L'EA MQL5 est **autonome** : il prend toutes ses décisions seul, y compris sans Python. Le code
Python est son **jumeau de recherche** : il réimplémente exactement les mêmes calculs (features,
stratégies, score, taille de lot, filtres) pour pouvoir faire en quelques secondes ce que le
Strategy Tester ferait en heures : walk-forward, optimisation, Monte Carlo, entraînement de modèles.

Garde-fous contre la divergence entre les deux :

| Garde-fou | Où |
|---|---|
| Mêmes conventions de calcul (amorçage des moyennes, écart-type population, barres clôturées) | `indicators.py` ↔ `Indicators.mqh` |
| Test d'absence de look-ahead (features identiques sur historique tronqué) | `tests/test_core.py::test_features_no_lookahead` |
| Valeurs par défaut identiques EA ↔ Python | `tests/test_ea_sync.py` |
| Version de la spécification de features dans le modèle exporté (refus si différente) | `FEATURE_SPEC_VERSION` / `XQAI_FEATURE_SPEC` |
| Contrôle de parité sur vos données : l'EA écrit ses features (`InpDumpFeatures=true`), Python les compare | `xqai_cli.py parity` |
| Linter structurel MQL5 (accolades, includes, fonctions et membres inexistants) | `tools/mql5_lint.py` |

---

## 2. Choix technologiques et justification

| Besoin | Choix | Pourquoi / alternative écartée |
|---|---|---|
| Exécution, risque, SL/TP | **MQL5 natif** | Seul langage exécuté dans le terminal ; fonctionne sur VPS sans dépendance. |
| Inférence IA en direct **et** en backtest | **Réseau exporté en texte, évalué en MQL5** | Fonctionne dans le Strategy Tester (où Python est inaccessible) et sans DLL. ONNX (supporté par MQL5) est une alternative valable mais ajoute une chaîne d'outils ; le format texte est vérifiable bit à bit (`NativeModel` Python = même calcul, testé). |
| Modèles non portables (gradient boosting) | **Pont fichiers vers Python** | Pas de DLL (souvent interdites par les VPS/brokers), robuste aux redémarrages, inspectable. Latence 100–300 ms, négligeable pour une décision par bougie M5. ZeroMQ/sockets écartés : DLL ou API socket indisponible dans le testeur. |
| Recherche / ML | **Python + numpy/pandas/scikit-learn/scipy** | Écosystème standard, reproductible, sans GPU. |
| Deep learning lourd (LSTM/Transformers) | **Non retenu par défaut** | Quelques milliers d'échantillons indépendants (signaux) seulement : sur-apprentissage quasi certain. Le MLP est déjà un réseau de neurones ; on n'augmente la capacité que si le walk-forward le justifie. |
| RL | **Bandit contextuel (Thompson)** | Chaque décision (prendre/ignorer un signal) a une récompense immédiate (R du trade) : c'est le cadre exact du bandit. Le deep RL (DQN/PPO sur prix bruts) demande des ordres de grandeur de données en plus. |
| Calendrier économique | **Calendrier MetaQuotes intégré à MT5** | Source officielle, déjà synchronisée en heure serveur. Indisponible dans le testeur → export CSV par script. |
| Dashboard | **Panneau sur le graphique + page web (stdlib)** | Aucune dépendance ; la page lit les fichiers de l'EA et peut écrire le fichier STOP (protégé par jeton). |

---

## 3. Limites techniques à connaître

### MetaTrader 5 / MQL5
* **Strategy Tester** : pas d'accès réseau ni au calendrier économique, pas de service Python → l'IA
  ne peut y être testée que via le **modèle natif** ; les news via **CSV exporté**.
* Les **données de ticks réels** dépendent du broker (souvent quelques années seulement) ; au-delà,
  ticks générés (« 1 minute OHLC » ou « Every tick ») → résultats d'exécution approximatifs.
* Le spread historique des barres (`MqlRates.spread`) n'est qu'un échantillon par barre.
* **Netting vs hedging** : en compte netting une seule position par symbole → l'EA force `max 1 position`.
* Les fonctions `OrderCalcProfit` / `OrderCalcMargin` gèrent la conversion de devise du compte
  (y compris comptes cent) ; elles sont utilisées pour **chaque** taille de lot.
* L'heure serveur dépend du broker et de ses changements d'heure → modèle de fuseau (§6).
* Le Strategy Tester ne simule ni requotes réalistes ni la latence d'un VPS.

### Python
* Le package officiel `MetaTrader5` (Python) n'existe que sous **Windows** ; il n'est **pas requis** ici
  (les données passent par CSV exporté), ce qui garde la recherche portable (Linux/macOS).
* Le backtester Python est **barre par barre (M5)** : quand le SL et le TP sont touchés dans la même
  barre, le SL est supposé atteint d'abord (pessimiste) ; BE/trailing évalués à la clôture M5 alors que
  l'EA les gère à chaque bougie M1. **Le Strategy Tester en ticks réels reste la référence d'exécution.**

### Capital de 50 à 300 € sur XAUUSD — la contrainte la plus importante
Sur un compte standard, le lot minimum est généralement **0,01 lot = 1 once** : un mouvement de 1 $
de l'or = **1 $ de gain/perte**. Un stop « raisonnable » sur M5 mesure souvent **plusieurs dollars**.

| Capital | Risque 0,5 % | Stop maximal possible avec 0,01 lot | Réalité |
|---|---|---|---|
| 50 € | ≈ 0,27 $ | ≈ 0,27 $ | inférieur au spread → **aucun trade possible** |
| 100 € | ≈ 0,54 $ | ≈ 0,54 $ | idem |
| 300 € | ≈ 1,6 $ | ≈ 1,6 $ | quasiment toujours trop serré |

Le bot applique la règle demandée : **si le lot minimum dépasse le risque autorisé
(`InpMaxRiskPercentHard`), le trade est refusé** (`sizing:min_lot_risk_exceeds_cap`). Au démarrage, il
écrit dans le journal un diagnostic chiffré (« ACCOUNT TOO SMALL… ») calculé avec les spécifications
réelles du broker. Le backtest Python sur un compte de 100 montre exactement ce comportement :
zéro trade, refus pour cause de lot minimum.

**Solutions réalistes, sans augmenter le risque :**
1. **Compte cent** (USC) : 100 € ≈ 10 000 cents ; la valeur par point est 100× plus petite → la
   gestion à 0,25–0,5 % devient possible. C'est la solution recommandée pour ce projet.
2. Broker proposant des **micro-lots 0,001** sur XAUUSD (rare ; vérifier `SYMBOL_VOLUME_MIN`).
3. Augmenter le capital.
4. ❌ Ce que le bot ne fera **jamais** : augmenter le lot ou réduire artificiellement le stop pour
   « faire passer » le trade.

---

## 4. IA, apprentissage et calcul quantique : ce qui est réel et ce qui ne l'est pas

### 4.1 Rôle de l'IA : filtre de qualité (méta-labelling)
Le moteur de règles propose des trades ; l'IA estime **la probabilité que le TP soit atteint avant le
SL** et filtre les signaux faibles. Les étiquettes sont calculées par la méthode « triple barrière »
avec coûts (spread, glissement). 40 features : 7 composantes du score, stratégie, sens, régime,
volatilité (ratio ATR), tendance (ADX), momentum (RSI, MACD), Bollinger, volume, distances aux EMA,
risque/ATR, R:R, session, heure, spread.

| Capacité demandée | Implémentation |
|---|---|
| Identifier les configurations de marché | Régimes par règles (trend up/down, range, squeeze, volatile, transition) + étude GMM non supervisée (`ml/regime_cluster.py`) comparée hors échantillon |
| Détecter les changements de volatilité | Ratio ATR / moyenne 100 (H1, M5), ratio de largeur de Bollinger (squeeze → expansion) |
| Reconnaître tendances / consolidations | ADX + alignement EMA 20/50/200, HH/HL/LH/LL, Bollinger |
| Évaluer la qualité d'un signal / filtrer les faux | Score /100 + probabilité du modèle |
| Adapter les paramètres | Walk-forward : ré-optimisation périodique sur fenêtre glissante, validée hors échantillon |
| Choisir la stratégie selon le régime | Matrice régime→stratégies ; **bandit (RL)** pour l'apprendre, adoptée seulement si elle bat la matrice par défaut hors échantillon |

### 4.2 Quantique : distinction stricte

| Catégorie | Dans ce projet | Statut |
|---|---|---|
| **Vrai ordinateur quantique** | **Non utilisé.** | — |
| **Algorithme quantique simulé** | `ml/qml_sim.py` : classifieur variationnel (VQC, 4 qubits) simulé par vecteur d'état numpy, entraîné par la règle du *parameter-shift* (vérifiée exacte à 1e-11 contre la différence finie) | Recherche uniquement, jamais exporté |
| **Quantum-inspired** | `optim/annealing.py::sqa_solve` : *Simulated Quantum Annealing* (Monte Carlo en intégrale de chemin, Suzuki-Trotter, champ transverse décroissant) ; FMQA (factorization machine → QUBO → recuit) | Tourne sur CPU |
| **Service quantique réel possible** | Les matrices QUBO produites sont directement soumissibles à D-Wave Leap (`dwave-ocean-sdk`) ; le VQC est transposable à Qiskit/IBM Quantum ou Amazon Braket | Non branché : voir ci-dessous |

**Pourquoi ne pas brancher un vrai QPU ?** Les problèmes de ce projet (≤ 60 variables binaires pour
l'optimisation des paramètres, ≤ 40 pour la sélection de features) sont résolus **exactement ou
quasi exactement** par des méthodes classiques en moins d'une seconde. Mesuré pendant le développement :
sur des QUBO aléatoires de 12 variables, recuit classique et recuit quantique simulé trouvent tous deux
l'optimum exact (vérifié par force brute) ; sur 54 variables, le recuit **classique** obtient une
énergie légèrement meilleure **10× plus vite**. Un QPU ajouterait latence, bruit, coût, et ne peut pas
être appelé depuis le Strategy Tester. Aucun avantage quantique n'est attendu à cette taille ; le projet
ne prétend pas le contraire.

### 4.3 Règle de conservation des modules
Chaque module « avancé » est comparé à une alternative classique, **à budget égal, hors échantillon** :

| Module | Comparé à | Conservé seulement si… |
|---|---|---|
| Filtre IA (LR / MLP / GBM / VQC) | aucun filtre (BASELINE) | R moyen hors échantillon des trades filtrés > R moyen non filtré, p-value bootstrap < 0,05, ≥ 10 % des trades conservés, R moyen > 0 (`EvalReport.keep`) |
| FMQA + recuit quantique simulé | FMQA + recuit classique, BO, recuit direct, aléatoire | meilleur objectif **hors échantillon** en moyenne sur plusieurs graines |
| Sélection de features QUBO (SQA) | mRMR glouton, QUBO+SA, toutes les features | meilleure AUC hors échantillon |
| Bandit (RL) | matrice régime→stratégie par défaut | R moyen OOS supérieur |
| Régimes GMM | régimes par règles | η² (variance de R expliquée) OOS supérieur |

Si rien ne passe, l'EA tourne **sans IA** (`InpAIMode=OFF`) : c'est un résultat normal et honnête.

---

## 5. Logique de trading (spécification)

### 5.1 Régime (H1 + M15)
1. ATR(H1)/moyenne100 > 2 → **VOLATILE** (aucune stratégie par défaut)
2. ADX(H1) ≥ 25 et EMA20>50>200 (H1) → **TREND_UP** ; inverse → **TREND_DOWN**
3. ADX(H1) < 20 et largeur Bollinger M15 < 0,7× sa moyenne → **SQUEEZE**
4. ADX(H1) < 20 → **RANGE** ; sinon **TRANSITION**

Matrice par défaut (`InpRegimeMatrix`) : `TU:PB,MO,BO | TD:PB,MO,BO | SQ:BO | RG:MR,SW,RV | TR:SW,RV,PB | VO:`.
Les stratégies de tendance ne prennent que le sens du régime ; en TRANSITION, seulement dans le sens H4.

### 5.2 Stratégies (signal sur la bougie M5 clôturée, entrée à l'ouverture suivante)
| Stratégie | Conditions principales | SL | TP |
|---|---|---|---|
| Trend Pullback (PB) | retour sur EMA20 ou zone FVG/OB, clôture au-dessus EMA20/50, englobante/pin bar ou clôture forte, RSI 40–70 | plus bas 5 barres − 0,3 ATR | liquidité M15 opposée / 2R |
| Momentum (MO) | BOS sur la bougie, MACD histogramme croissant, ADX M15 > 25, volume ≥ 1,2× moyenne, RSI 55–75 | dernier swing − 0,3 ATR | liquidité H1 / 2R |
| Breakout (BO) | clôture au-delà du Donchian 20, volume ≥ 1,5×, clôture dans le haut 30 %, compression M15 | bas de la bougie − 0,3 ATR | hauteur du range (measured move) |
| Liquidity Sweep (SW) | mèche sous un swing low (M5 ≤ 3 barres ou M15) et clôture au-dessus, bougie de rejet | plus bas 5 barres − 0,3 ATR | liquidité M15 opposée (≥ 2R sinon refus) |
| Reversal (RV) | CHOCH ≤ 3 barres après RSI < 35, pas de forte tendance H4 contraire | plus bas 10 barres − 0,3 ATR | liquidité M15 (≥ 2R) |
| Mean Reversion (MR) | sortie de bande de Bollinger, RSI < 30, bougie de rejet, régime RANGE | plus bas 3 barres − 0,5 ATR | moyenne de Bollinger (≥ 1,5R) |

Le SL est borné à [0,8 ; 3] ATR(M5). Si une liquidité opposée se trouve à moins de 1R → refus
(obstacle). Ventes : règles symétriques.

### 5.3 Score sur 100 (pondérations = hypothèses à optimiser)
Structure 20 · Tendance 20 · Momentum 15 · Liquidité 15 · Volatilité 10 · Price action 10 ·
Multi-timeframe 10. Chaque composante est une fraction [0,1] définie dans `signals.py` / `Signals.mqh`
(ex. structure = 0,4·BOS/CHOCH récent + 0,3·structure M15 + 0,3·zone FVG/OB). Pour les stratégies
contre-tendance, « tendance » mesure l'**absence** de tendance forte contraire. Seuil par défaut 65.

### 5.4 Pipeline de décision (identique EA / backtester)
sorties de fin de barre (invalidation CHOCH, signal opposé ≥ 80, temps max 24 h, week-end) →
meilleur candidat → score ≥ seuil → [IA ≥ seuil] → limites journalières/série/cooldown/nb trades →
positions (max 2, même sens, la 1ʳᵉ doit être protégée au BE) → session → rollover/vendredi →
news → spread → R:R recalculé au prix réel → stop level → taille de lot & marge → risque total → ordre.
Chaque décision (acceptée ou refusée, avec la raison) est journalisée.

---

## 6. Heures, sessions, changements d'heure
* Barres en **heure serveur** → UTC via le modèle de fuseau (`EET_US` : GMT+2/+3 suivant l'heure d'été
  US, le plus fréquent ; `EET_EU` ; `FIXED`). En réel, le décalage est **mesuré** (`TimeTradeServer − TimeGMT`).
* Sessions en heure locale avec leur propre DST : Londres 08:00–16:30 (Europe), New York 08:00–17:00
  (US), Asie 00:00–08:00 UTC, chevauchement = Londres ∩ New York. Les semaines où US et Europe ne
  sont pas synchronisées (mars/novembre) sont gérées (testé).
* Par défaut : Londres, New York et chevauchement autorisés ; Asie désactivée (configurable — à
  trancher avec `backtest`, qui ventile les résultats par session).
* Blocage autour du rollover (spreads élargis), arrêt des entrées vendredi 19:00 UTC, fermeture
  avant le week-end 20:45 UTC.

---

## 7. Protocole de validation (obligatoire avant tout compte réel)

1. **Données** : ≥ 5–6 ans de M1…H4 exportées du broker + calendrier ; Strategy Tester en ticks réels
   pour la période où ils existent.
2. **Parité** : `InpDumpFeatures=true` sur une période de test → `xqai_cli.py parity` : écart max
   attendu ≈ 1e-6 (arrondis) ; tout écart de régime/stratégie doit être expliqué avant d'aller plus loin.
3. **Référence** : chaque rapport compare la stratégie à deux baselines dans le même moteur de coûts :
   croisement EMA20/50 H1 et **entrées aléatoires** de même fréquence. Une stratégie qui ne bat pas
   clairement l'aléatoire n'a pas d'avantage.
4. **Walk-forward** (fenêtres IS 180 j / OOS 60 j glissantes), optimisation uniquement sur IS ; seuls
   les trades OOS concaténés comptent. Efficacité WF = espérance OOS / espérance IS (> 0,5 souhaitable).
5. **Robustesse** (`stress`) : spreads ×1,5 et ×2, glissement ×3, commission 7 $/lot A/R, seuil ±5,
   variations des paramètres de gestion → la stratégie doit rester positive après coûts.
6. **Monte Carlo** (5 000 rééchantillonnages des trades OOS) : distribution du rendement et du
   drawdown, probabilité de perte, probabilité de toucher 5 % de DD (« risque de ruine » au sens des
   limites du projet).
7. **Sur-apprentissage** : nombre d'essais enregistré → **Deflated Sharpe Ratio** ; **PBO** (CSCV,
   70 combinaisons) sur la matrice des rendements des configurations testées : PBO > 0,5 ⇒ rejet.
8. **Fuites de données** : features sur barres clôturées (test anti look-ahead), splits purgés +
   embargo de 24 h pour le ML, normalisation apprise sur l'entraînement seulement.
9. **Biais de survivance** : un seul instrument (XAUUSD), sans univers sélectionné a posteriori ; le
   biais restant est celui du **broker** (historique, spreads) → tester sur **au moins deux brokers**.
10. **Démo forward** ≥ 2–3 mois et ≥ 50 trades, comparée aux attentes du backtest (`GO_LIVE.md`).

Métriques produites : net profit, profit factor, win rate, max drawdown, Sharpe, Sortino, espérance
(monnaie et R), recovery factor, nombre de trades / jour, performance mensuelle, ventilation par
stratégie, session, régime, distribution Monte Carlo et probabilité de ruine.

### 5.5 Entrées étagées (option `InpUseScaledEntries`, désactivée par défaut)
Une idée de trade peut être découpée en plusieurs ordres : un ordre au marché puis des ordres limites
placés entre l'entrée et le stop, à des fractions de la distance entrée→SL propres à chaque stratégie
(`InpScaleLevels`, par défaut `PB:0,0.3,0.55 | SW:0,0.35,0.6 | MR:0,0.4 | RV:0,0.4 | BO:0 | MO:0`).
* **Un seul SL et un seul TP** pour toutes les jambes.
* **Lots égaux par jambe, calculés pour que la perte TOTALE, si toutes les jambes sont exécutées et
  que le SL est touché, soit égale au risque choisi.** Comme les jambes profondes sont plus proches du
  stop, la distance moyenne est plus courte : plus de lots pour le même risque. Si une jambe tombe sous
  le lot minimum, les jambes les plus profondes sont supprimées.
* Jambes non exécutées annulées après `InpScaleExpiryBars` bougies M5, dès que le prix atteint +1R
  (le mouvement est parti) ou quand l'idée est clôturée.
* Les limites (positions max, trades/jour, série de pertes, R) s'appliquent à l'**idée**, pas à chaque jambe.
* Break-even / partiel / trailing mesurés à partir de la première entrée de l'idée.
* Nécessite un compte *hedging*. Breakout et Momentum entrent toujours en une fois.
* Ce n'est ni une martingale ni une moyenne à la baisse : la perte maximale est fixée **avant** l'entrée.
  À valider en backtest (`use_scaled_entries` dans la config Python) contre l'entrée unique.
