"""Phase 0b — Des portefeuilles se positionnent-ils de façon inhabituelle AVANT les révélations ?

Échantillon : « révélations surprises » détectées automatiquement (issue < 30 % 24 h avant,
>= 90 % ensuite, résolution finale confirmée). T* = premier passage à 90 %.

Pour chaque marché :
- pari sur l'issue gagnante W = achat du token W, ou vente du token opposé (équivalent) ;
  prix de W = prix payé (achat W) ou 1 - prix (vente de l'opposé) ;
- pari « long shot » : prix de W <= 0,35 ; « gros » : >= 2 000 $ de mise ;
- portefeuille « neuf » : première activité Polymarket < 7 jours avant le trade.

Fenêtres : référence [T*-30 j, T*-72 h) ; pré-révélation [T*-72 h, T*), [T*-24 h, T*), [T*-6 h, T*).
Vocabulaire : on parle d'anomalie statistique, jamais de délit d'initié.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

from research.data import dukascopy
from research.data.pm_trades import ROOT, trades, wallet_first_activity

OUT = Path(__file__).resolve().parents[1] / "docs" / "phase0b"
LONGSHOT, BIG, FRESH_DAYS = 0.35, 2000.0, 7
WINDOWS = {"72h": 72, "24h": 24, "6h": 6}


def bets_on_winner(df: pd.DataFrame, side: str) -> pd.DataFrame:
    w_idx = 0 if side == "YES" else 1
    d = df.copy()
    d["outcome_index"] = d["outcome_index"].astype(int)
    d["price"] = d["price"].astype(float)
    d["size"] = d["size"].astype(float)
    buy_w = (d["side"] == "BUY") & (d["outcome_index"] == w_idx)
    sell_l = (d["side"] == "SELL") & (d["outcome_index"] != w_idx)
    d["on_w"] = buy_w | sell_l
    d["p_w"] = np.where(d["outcome_index"] == w_idx, d["price"], 1 - d["price"])
    d["stake_w"] = d["size"] * d["p_w"]  # mise équivalente sur W
    return d


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    S = pd.read_parquet(Path(__file__).resolve().parents[1] / "data" / "surprises_strict.parquet")
    per_market, sus_all = [], []
    for r in S.itertuples():
        df = trades(r.mid, r.tstar - pd.Timedelta(days=30))
        if df.empty:
            continue
        d = bets_on_winner(df, r.side)
        d = d[d["ts"] < r.tstar]
        d["h_before"] = (r.tstar - d["ts"]).dt.total_seconds() / 3600
        sus = d[d["on_w"] & (d["p_w"] <= LONGSHOT) & (d["stake_w"] >= BIG)].copy()
        sus["mid"], sus["case"], sus["cat"], sus["q"], sus["tstar"] = r.mid, r.case, r.cat, r.q, r.tstar
        sus_all.append(sus)
        base = d[d["h_before"] >= 72]
        base_days = max((base["h_before"].max() - 72) / 24, 1) if len(base) else np.nan
        rec = {"mid": r.mid, "case": r.case, "cat": r.cat, "q": r.q, "tstar": r.tstar,
               "vol_total": float(d["size"].mul(d["price"]).sum())}
        # Référence : par jour.
        rec["base_n_sus_j"] = len(sus[sus.h_before >= 72]) / base_days
        rec["base_usd_sus_j"] = sus.loc[sus.h_before >= 72, "stake_w"].sum() / base_days
        tot_b = base["size"].mul(base["price"]).sum()
        rec["base_part_sus"] = sus.loc[sus.h_before >= 72, "stake_w"].sum() / tot_b if tot_b else np.nan
        for lab, h in WINDOWS.items():
            win = d[d["h_before"] < h]
            sw = sus[sus.h_before < h]
            tot = win["size"].mul(win["price"]).sum()
            rec[f"n_sus_j_{lab}"] = len(sw) / (h / 24)
            rec[f"usd_sus_j_{lab}"] = sw["stake_w"].sum() / (h / 24)
            rec[f"part_sus_{lab}"] = sw["stake_w"].sum() / tot if tot else np.nan
        per_market.append(rec)
    M = pd.DataFrame(per_market)
    SUS = pd.concat(sus_all, ignore_index=True)

    # Ancienneté des portefeuilles auteurs de paris suspects.
    first = wallet_first_activity(sorted(SUS["proxy_wallet"].unique()))
    SUS["first_ts"] = pd.to_datetime(SUS["proxy_wallet"].map(first), unit="s", utc=True)
    SUS["age_j"] = (SUS["ts"] - SUS["first_ts"]).dt.total_seconds() / 86400
    SUS["fresh"] = SUS["age_j"] < FRESH_DAYS
    SUS["window"] = np.where(SUS.h_before < 72, "pré-72h", "référence")

    # Tests appariés par cas (un cas = une révélation, marchés agrégés).
    C = M.groupby("case").agg(tstar=("tstar", "first"), cat=("cat", "first"), q=("q", "first"),
                              base_usd=("base_usd_sus_j", "sum"), base_n=("base_n_sus_j", "sum"),
                              **{f"usd_{k}": (f"usd_sus_j_{k}", "sum") for k in WINDOWS},
                              **{f"n_{k}": (f"n_sus_j_{k}", "sum") for k in WINDOWS})
    tests = {}
    for k in WINDOWS:
        diff = np.log1p(C[f"usd_{k}"]) - np.log1p(C["base_usd"])
        w = stats.wilcoxon(diff, alternative="greater") if (diff != 0).sum() >= 5 else None
        tests[k] = {"cas": int(len(C)), "cas_hausse": int((diff > 0).sum()), "cas_baisse": int((diff < 0).sum()),
                    "ratio_median_usd_j": round(float(np.median((C[f"usd_{k}"] + 1) / (C["base_usd"] + 1))), 2),
                    "p_wilcoxon": round(float(w.pvalue), 4) if w else None}

    fresh = SUS.groupby("window").agg(n=("fresh", "size"), part_neufs=("fresh", "mean"),
                                      usd=("stake_w", "sum")).round(3)

    # Règle d'alerte (fixée a priori) : >= 1 pari suspect d'un portefeuille NEUF sur un marché
    # dans les 6 dernières heures. Évaluation : alerte « juste » si T* survient dans les 72 h.
    al = SUS[SUS.fresh].copy()
    al["hit72"] = al.h_before < 72
    al["hit24"] = al.h_before < 24
    alerts_by_hour = al.assign(hr=al.ts.dt.floor("6h")).drop_duplicates(["mid", "hr"])
    rule = {"alertes_6h_distinctes": int(len(alerts_by_hour)),
            "dont_T*_dans_72h": int(alerts_by_hour.hit72.sum()),
            "dont_T*_dans_24h": int(alerts_by_hour.hit24.sum()),
            "cas_avec_alerte_avant_T*_72h": int(al[al.hit72].case.nunique()),
            "cas_total": int(S.case.nunique()),
            "delai_median_h_avant_T*": round(float(al[al.hit72].groupby("case").h_before.max().median()), 1)
            if al.hit72.any() else None}

    # Or autour de chaque révélation (H1).
    g = dukascopy.load_hourly("XAUUSD")
    g = g[g.volume > 0]["close"]
    g.index = g.index + pd.Timedelta("1h")

    def gret(a, b):
        pa, pb = g.asof(a), g.asof(b)
        return float(np.log(pb / pa) * 1e4) if pd.notna(pa) and pd.notna(pb) else np.nan

    C["or_T*_-1h_+4h_pb"] = [gret(t - pd.Timedelta("1h"), t + pd.Timedelta("4h")) for t in C.tstar]
    C["or_T*_-72h_T*_pb"] = [gret(t - pd.Timedelta("72h"), t) for t in C.tstar]
    first_alert = al[al.hit72].groupby("case").ts.min()
    C["premiere_alerte_h_avant"] = (C.tstar - first_alert.reindex(C.index)).dt.total_seconds() / 3600

    M.to_csv(OUT / "markets.csv", index=False)
    C.to_csv(OUT / "cases.csv")
    SUS.drop(columns=["proxy_wallet"]).to_csv(OUT / "suspicious_bets_anonymized.csv", index=False)
    summary = {"marches": len(M), "cas": int(len(C)), "paris_suspects": int(len(SUS)),
               "tests_flux_vs_reference": tests, "portefeuilles_neufs": fresh.reset_index().to_dict("records"),
               "regle_alerte": rule}
    (OUT / "summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False, default=str))
    print(json.dumps(summary, indent=1, ensure_ascii=False, default=str))
    pd.set_option("display.width", 250)
    pd.set_option("display.max_colwidth", 55)
    print(C[["tstar", "cat", "q", "base_usd", "usd_72h", "usd_24h", "usd_6h",
             "premiere_alerte_h_avant", "or_T*_-1h_+4h_pb"]].round(0).to_string())


if __name__ == "__main__":
    main()
