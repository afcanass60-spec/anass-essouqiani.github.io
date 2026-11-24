# Gold Intel

Système d'analyse Polymarket → XAUUSD. **Mode analyse et paper trading uniquement.**

- `docs/phase1-architecture.md` : étude de faisabilité et architecture.
- `docs/phase0/` : rapport de recherche « Polymarket précède-t-il l'or ? ».
- `research/` : code de recherche (téléchargeurs, règles de direction, analyses).

## Reproduire la Phase 0

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python -m research.data.dukascopy XAUUSD 2025-01-01 2026-11-22   # ~3 h (limite de débit Dukascopy)
python -m research.data.polymarket                                # ~20 min
python -m research.phase0_leadlag
```

Les données brutes vont dans `data/` (non versionné).
