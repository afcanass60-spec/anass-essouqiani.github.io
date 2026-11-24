# Gold Intel — Phase 1 : étude de faisabilité et architecture

> Système d'analyse Polymarket → XAUUSD. Mode **analyse + paper trading uniquement**.
> Aucune exécution d'ordres réels sans demande et validation explicites.

## 0. Décisions et contraintes (validées)

| Sujet | Décision |
|---|---|
| Résidence | **France** |
| Courtier | Aucun pour l'instant → **compte démo MT5** chez un courtier régulé UE (ESMA / AMF) |
| Hébergement | **Pas de VPS** pour l'instant → exécution sur le PC local (Docker) |
| Réseau cloud de dev | Environnement dédié avec accès lecture aux API de données |

### Conséquences

- **Polymarket en France** : le site est bloqué par l'ANJ (depuis fin 2024). On ne fait **que lire des données publiques** via API ; aucun compte, aucun trading. À ne jamais modifier.
- **Kalshi** : trading non accessible aux résidents français, mais **l'API de données publique est lisible** (vérifiée).
- **MT5** : le paquet Python `MetaTrader5` exige un terminal MT5 **Windows** ouvert et connecté à un compte (démo suffisant). Il faut choisir un courtier qui propose MT5 + XAUUSD avec un compte démo.
  Tant que MT5 n'est pas configuré : **Dukascopy** (historique tick, gratuit) pour la recherche/backtest, et un flux temps réel de secours (Twelve Data, offre gratuite) en développement.
- **Pas de VPS** : la collecte s'arrête quand le PC est éteint → les trous de données seront **détectés et marqués**, jamais comblés artificiellement. L'enregistrement continu du carnet d'ordres Polymarket sera limité ; un VPS (~10 €/mois) deviendra nécessaire avant la mise en production réelle.

## 1. Diagnostic critique

1. **L'avance de Polymarket sur l'or n'est pas prouvée.** La plupart du temps Polymarket réagit aux mêmes nouvelles en même temps ou après l'or. → **Phase 0 de recherche** obligatoire : causalité de Granger, corrélations décalées, études d'événements par catégorie de marché.
2. **Latence** : impossible de battre la réaction milliseconde à un CPI/NFP. Cible réaliste : horizons **15 min → quelques jours**.
3. **Couverture** : Polymarket ne couvre ni les achats d'or des banques centrales, ni les flux ETF, ni les rendements réels. → Polymarket = une source parmi d'autres ; **Kalshi** ajouté pour la macro US (Fed, CPI, NFP).

## 2. Architecture

Monolithe modulaire Python asyncio (pas de microservices au départ).

```
INGESTION : Polymarket WS/REST · Kalshi · on-chain Polygon (Goldsky)
            XAUUSD (MT5 / Dukascopy) · FX → DXY synthétique · US10Y
            FRED / BLS / BEA / Fed · calendrier éco · GDELT
     │  (horodatage source + horodatage réception)
     ▼
Redis Streams ──► TimescaleDB (brut immuable, rejouable)
     ▼
M1 Anomalies → M2 Event Intelligence → M3 Contexte XAUUSD → M4 Scoring calibré
     ▼
Signal Engine (BUY / SELL / PAS DE TRADE / OBSERVATION) → paper trading → évaluation
     ▼
Telegram (iPhone) · Dashboard (FastAPI + WebSocket → React) · Health monitor
```

Principes : double horodatage (anti look-ahead), données brutes immuables, **même code de features en live et en backtest**.

## 3. API Polymarket (vérifiées le 2026-11-24)

| API | Statut | Usage |
|---|---|---|
| Gamma `gamma-api.polymarket.com` | ✅ 200 | Découverte marchés/événements, tags, volumes |
| CLOB `clob.polymarket.com` | ✅ 200 | Carnet, prix, `/prices-history` |
| CLOB WebSocket `ws-subscriptions-clob.polymarket.com` | à tester | Temps réel book / price_change / trades |
| Data API **v1** | ❌ **410 — retirée** | — |
| Data API **v2** `data-api.polymarket.com/v2/trades` | ✅ 200 | Trades publics avec `proxy_wallet`, taille, prix, timestamp |
| Goldsky subgraphs / Polygon | à tester | On-chain : OrderFilled, transferts USDC, âge des wallets |

Limites : pas d'historique de carnet d'ordres (à enregistrer soi-même), quotas par endpoint, marchés souvent peu liquides → toute anomalie pondérée par la profondeur.

## 4. Sources XAUUSD

| Source | Rôle |
|---|---|
| **MT5 démo (courtier UE)** | Référence temps réel (prix réellement tradés) |
| **Dukascopy** | Historique tick pour recherche et backtest |
| Twelve Data (gratuit) | Secours temps réel en développement |
| DXY | **Synthétique** à partir de EURUSD, USDJPY, GBPUSD, USDCAD, USDSEK, USDCHF |
| US10Y | Symbole obligataire du courtier MT5 si dispo + FRED (quotidien) |

Exclu en production : Yahoo `GC=F` (non officiel, différé).

## 5. Sources macro et événementielles

FRED (DFII10 rendements réels, DGS10, T10YIE, dollar), BLS (CPI, NFP), BEA (PIB, PCE), RSS Fed (communiqués, discours, FOMC), Kalshi (anticipations), GDELT 2.0 (géopolitique, 15 min), calendrier construit depuis les calendriers officiels + flux ForexFactory en complément.
Non retenus : Truth Social (pas d'API, scraping contraire aux CGU), API X (≥ 200 $/mois), dépêches premium (hors budget — limite assumée).

## 6. Modèles

- **Probabilités en log-odds** : logit(p) = ln(p / (1 − p)).
- **M1** : z-score robuste (médiane/MAD) par marché, volatilité EWMA, CUSUM + BOCPD (ruptures), surprise de volume (binomiale négative), Hawkes (grappes de trades), Isolation Forest (wallets/trades multivariés).
- **M2** : taxonomie + classification LLM (une fois par marché, en cache) → direction a priori ; choc implicite = ΔP × (impact si OUI − impact si NON) ; sensibilité estimée sur l'historique.
- **M3** : rendements or vs DXY / taux réels / volatilité en corrélations glissantes ; structure multi-horizon M1→H4 (EMA, ATR, VWAP, RSI, swings, liquidité de session).
- **M4** : meta-labeling — règle primaire (direction) + modèle secondaire P(TP avant SL), étiquetage triple barrière, calibration isotonique, validation walk-forward purgée avec embargo.
- Peu d'événements par catégorie → modèles simples et régularisés d'abord.

## 7. Transactions anormales (on-chain)

Taille vs profondeur, âge du wallet, wallet mono-marché, financement commun de nouveaux wallets (graphe USDC), historique de précision sur marchés résolus, concentration (Herfindahl), timing avant résolution.
Filtrer market makers et arbitrage. **Vocabulaire imposé : « comportement inhabituel », « anomalie statistique » — jamais « insider ».** Pas d'adresses mises en avant dans les alertes.

## 8. Scoring

```
P  = P(TP avant SL | features), calibrée hors échantillon
EV = P × TP − (1 − P) × SL − coûts (spread + glissement)
Alerte si EV > marge ET n_historique ≥ N_min ET données fraîches ET liquidité suffisante
```

Démarrage à froid : « Confiance : non calibrée (n = …) — mode observation ».
Divergence (événement haussier mais or/DXY/taux contraires) → **PAS DE TRADE**.
Niveaux : SL au-delà du swing structurel (≥ k × ATR M15), TP sur la prochaine zone de liquidité, R:R minimal 1,5.
Week-end : marché de l'or fermé → signaux mis en attente et réévalués à l'ouverture.

## 9. Telegram (iPhone)

BotFather → token dans `.env` (hors Git) ; liste blanche de `chat_id` ; priorité haute = son, basse = silencieuse ; file persistante + retry/backoff + respect `retry_after` ; déduplication par hash (marché, direction, tranche horaire) + cooldown ; aiogram 3.
Commandes : `/start /status /lastsignal /performance /pause /resume /health /calendar`. Boutons « Pris / Ignoré / Faux signal » pour l'évaluation.
Option : Pushover pour les alertes critiques qui traversent le mode Concentration iOS.

## 10. Dashboard

FastAPI (REST + WS) · React + Vite · TradingView Lightweight Charts (Apache-2.0, attribution) · ECharts · Grafana/Prometheus pour l'ops.
Pages : Live, Marchés, Signaux, Performance (precision/recall/F1, faux positifs, profit factor, drawdown, fiabilité), Calendrier, Santé.
Accès local (localhost) tant qu'il n'y a pas de VPS ; ensuite Tailscale, jamais exposé publiquement.

## 11. Coûts

| Poste | Maintenant | Plus tard |
|---|---|---|
| Hébergement | 0 € (PC local) | VPS 8–15 €/mois |
| Polymarket, Kalshi, FRED, BLS, BEA, GDELT, Goldsky, Dukascopy, Telegram, MT5 démo | 0 € | 0 € |
| LLM classification (Claude Haiku 5.5 : 0,10 $ / 0,50 $ par M tokens) | < 2 $/mois | 5–20 $/mois |
| Données premium | 0 | 30–250 $/mois (optionnel) |

## 12. Difficultés (par gravité)

1. Avance non prouvée → Phase 0.
2. Peu d'événements → risque de surapprentissage.
3. Bruit et manipulation sur marchés peu liquides.
4. Association automatique marché → or (beaucoup de faux positifs au début).
5. Pas d'historique de carnet ; collecte interrompue sans VPS.
6. Changements de régime de l'or.
7. Écart flux de données / courtier (spread aux annonces).
8. Fermeture week-end de l'or vs Polymarket 24/7.

## 13. Roadmap

| Phase | Contenu | Critère de passage |
|---|---|---|
| **0** | Collecte historique (Polymarket, Kalshi, Dukascopy, FRED) + étude lead/lag et événements | Rapport : quelles catégories précèdent l'or, sur quel horizon |
| 1 | Socle : Docker Compose, TimescaleDB, config, logs, santé, CI | Tests verts |
| 2 | Collecteurs Polymarket (WS + REST v2) + enregistreur de carnet | Détection de trous fiable |
| 3 | M1 anomalies | Rejeu historique + revue manuelle |
| 4 | XAUUSD (MT5 démo / Dukascopy), DXY synthétique, taux | Cohérence avec le graphique MT5 |
| 5 | M2 event intelligence | Précision de classification mesurée |
| 6 | M3 + M4 calibrés | Brier / fiabilité hors échantillon > référence naïve |
| 7 | Signaux + paper trading | Évaluation automatique de chaque signal |
| 8 | Bot Telegram (version observation dès la fin de la phase 3) | Commandes, dédup, retry, liste blanche |
| 9 | Dashboard | — |
| 10 | Backtest événementiel + rapport de validation | Métriques par période et catégorie |
| 11 | VPS, supervision, réentraînement champion/challenger validé manuellement | — |
