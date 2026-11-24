# Gold Intel — alertes XAUUSD sur iPhone (Telegram)

Surveille en continu **Polymarket** (Fed, Iran, Russie/Ukraine, Chine, droits de douane, shutdown…) et le **prix de l'or en temps réel**, puis t'envoie des notifications Telegram.

> **Mode analyse + paper trading uniquement.** Aucun ordre réel n'est passé. Les signaux sont expérimentaux : la recherche (`docs/phase0`, `docs/phase0b`) n'a pas démontré d'avantage statistique à suivre Polymarket. Le bot mesure lui-même ses résultats (`/performance`).

## Ce que tu reçois

| Notification | Quand | Ce que ça veut dire |
|---|---|---|
| 🌍 **ALERTE CONTEXTE** | Une ou plusieurs probabilités Polymarket bougent anormalement (≥ 5 points en 5 min, inhabituel pour ce marché) | Une nouvelle importante est en cours. **Pas d'ordre** : volatilité de l'or attendue en hausse. |
| 🟢 **BUY** / 🔴 **SELL** | 15 à 30 min après l'alerte, **seulement si l'or confirme** : mouvement ≥ 0,5 ATR M15 dans le même sens que la tendance M15 | Scénario indicatif avec entrée, stop-loss, take-profit (R:R 1:2), horizon, invalidation. Ouvre une position **papier**. |
| ⏸ **PAS DE TRADE** | Nouvelle importante, mais l'or ne confirme pas | Ne rien faire. |
| ✅ / ❌ / ⌛ **Clôture papier** | Objectif, stop ou 4 h écoulées | Résultat en R, compté dans `/performance`. |
| ⚠️ **Flux interrompu** | Prix de l'or ou Polymarket indisponible | Les analyses ne sont plus fiables jusqu'au message ✅ rétabli. |

Pourquoi l'or doit confirmer : en 2026, la paix au Moyen-Orient a fait **monter** l'or et l'escalade l'a fait baisser, l'inverse de l'intuition. Seule la réaction réelle du marché décide.

Commandes : `/start` `/status` `/lastsignal` `/performance` `/pause` `/resume`

## Installation (10 minutes)

### 1. Créer ton bot Telegram (sur l'iPhone)
1. Dans Telegram, ouvre **@BotFather** → envoie `/newbot` → choisis un nom (ex. *Gold Intel Anass*) et un identifiant se terminant par `bot`.
2. BotFather te donne un **token** (`123456789:AA…`). Garde-le secret.

### 2. Installer sur ton PC
Il faut **Python 3.10+** ([python.org](https://www.python.org/downloads/), coche « Add Python to PATH » sous Windows).

```bash
git clone -b claude/polymarket-gold-trading-ai-es2t0h https://github.com/afcanass60-spec/anass-essouqiani.github.io.git
cd anass-essouqiani.github.io/gold-intel
```
Copie `.env.example` en `.env` et colle ton token dans `TELEGRAM_BOT_TOKEN=`.

### 3. Premier lancement
- **Windows** : double-clic sur `run.bat`
- **Mac / Linux** : `./run.sh`

Dans Telegram, envoie `/start` à ton bot : il te répond avec ton **identifiant de chat**. Colle-le dans `.env` (`TELEGRAM_CHAT_ID=`), ferme la fenêtre et relance. Tu reçois « 🚀 Gold Intel démarré ».

### 4. Notifications iPhone
Réglages iPhone → Notifications → Telegram → autoriser + son. Les alertes 🟢/🔴/🌍 haute priorité sonnent ; les clôtures papier arrivent en silencieux.

**Important** : le PC doit rester allumé et connecté (pas de veille), sinon le bot s'arrête. Un petit serveur (VPS, ~5-10 €/mois) pourra le remplacer plus tard.

## Sources de données
- Or : cotations publiques Swissquote XAU/USD (temps réel) ; historique de démarrage Dukascopy.
- Polymarket : API Gamma (marchés) et CLOB (probabilités en direct, historique).
- Tout est gratuit, sans clé. Si une source tombe, le bot le signale et n'émet pas de signal.

## Réglages (facultatifs, dans `.env`)
`JUMP_DP` (0.05) · `JUMP_Z` (4) · `CONFIRM_ATR_FRAC` (0.5) · `SL_ATR_MULT` (1.5) · `RR` (2) · `TRADE_TIMEOUT_H` (4) · `MIN_MARKET_VOLUME24H` (20000) · `DRY_RUN` (0/1).

## Tests
```bash
.venv/bin/python -m pytest -q tests     # Windows : .venv\Scripts\python -m pytest -q tests
```

## Recherche
- `docs/phase1-architecture.md` — étude d'architecture
- `docs/phase0/` — Polymarket précède-t-il l'or ? (non)
- `docs/phase0b/` — portefeuilles inhabituels avant les annonces (pas de signal systématique)
- `research/` — code de recherche reproductible
