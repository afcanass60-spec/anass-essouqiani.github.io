"""Phase 0, test complémentaire : direction DYNAMIQUE.

Constat de phase0_leadlag (H1) : le lien entre marchés géopolitiques et or change de
signe selon le régime (2025 : escalade => or +, guerre US-Iran 2026 : escalade => or -).
Ici, la direction d'un événement n'est plus fixée a priori : elle est
  dir = signe(pression a priori) × signe(corrélation contemporaine de la catégorie
        sur les 30 jours PRÉCÉDENTS t0)
Si la corrélation passée est trop faible (|ρ| < 0,05) ou estimée sur trop peu de
barres (< 100), on ne prend PAS position. Aucune information postérieure à t0.
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd

from research.data.polymarket import ROOT as PM_ROOT
from research.labels import prior_direction
from research.phase0_leadlag import CAT_FR, COST_BP, OUT, RES, SPLIT, gold_grid, logit, market_series

WINDOW = pd.Timedelta(days=30)
MIN_ABS_RHO, MIN_N = 0.05, 100


def main() -> None:
    res = RES["H1"]
    g = gold_grid(res)
    uni = pd.read_parquet(PM_ROOT / "universe.parquet")
    idx = {}
    for cat, sub in uni.groupby("category"):
        lst = []
        for m in sub.itertuples():
            pr = prior_direction(m.question)[0]
            if pr == 0:
                continue
            p = market_series(m.yes_token, m.start, m.end, res.bar)
            if p is not None:
                lst.append(pr * logit(p).diff())
        if lst:
            idx[cat] = pd.concat(lst, axis=1).sum(axis=1).reindex(g.index).fillna(0)

    E = pd.read_csv(OUT / "events_H1.csv", parse_dates=["t0"])
    rows = []
    for e in E.itertuples():
        d = pd.DataFrame({"i": idx[e.category], "r": g["r"]})
        d = d[(d.index < e.t0) & (d.index >= e.t0 - WINDOW)].dropna()
        d = d[d["i"] != 0]
        rho = d["i"].corr(d["r"]) if len(d) >= MIN_N else np.nan
        trade = pd.notna(rho) and abs(rho) >= MIN_ABS_RHO
        rows.append({"rho_passe": rho, "n_passe": len(d), "trade": trade,
                     "dir_dyn": e.dir * np.sign(rho) if trade else 0})
    E = pd.concat([E, pd.DataFrame(rows)], axis=1)
    T = E[E.trade].copy()
    windows = list(res.windows)
    for w in windows:
        T["d_" + w] = T[w] * T["dir_dyn"] * 1e4

    def summ(df: pd.DataFrame) -> dict:
        out = {"n": len(df), "jours": int(df.t0.dt.date.nunique())}
        for w in windows:
            v = df["d_" + w].dropna()
            if len(v) < 8:
                continue
            daily = v.groupby(df.loc[v.index, "t0"].dt.date).mean()
            t = daily.mean() / (daily.std(ddof=1) / np.sqrt(len(daily))) if len(daily) > 2 else np.nan
            net = v - COST_BP
            pf = net[net > 0].sum() / -net[net < 0].sum() if (net < 0).any() else None
            out[w] = {"moy_pb": round(float(v.mean()), 2), "t_jour": round(float(t), 2),
                      "taux_bon_sens": round(float((v > 0).mean()), 3),
                      "net_pb": round(float(net.mean()), 2), "profit_factor": round(float(pf), 2) if pf else None}
        return out

    groups = {"Tous (dynamique)": T, "2025": T[T.t0 < SPLIT], "2026": T[T.t0 >= SPLIT],
              "Or ouvert au moment du saut": T[T.gold_open_at_t0]}
    for cat in sorted(T.category.unique()):
        groups[CAT_FR.get(cat, cat)] = T[T.category == cat]
    S = {k: summ(v) for k, v in groups.items()}
    S["_couverture"] = {"evenements": len(E), "avec_position": int(E.trade.sum()),
                        "sans_position_correlation_faible": int((~E.trade).sum())}
    (OUT / "summary_H1_dynamic.json").write_text(json.dumps(S, indent=2, ensure_ascii=False, default=str))
    E.to_csv(OUT / "events_H1_dynamic.csv", index=False)
    for k, v in S.items():
        print(k, json.dumps(v, ensure_ascii=False))


if __name__ == "__main__":
    main()
