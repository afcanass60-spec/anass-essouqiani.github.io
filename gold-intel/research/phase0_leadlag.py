"""Phase 0 — Les probabilités Polymarket précèdent-elles XAUUSD ?

Trois tests, sans paramètre ajusté sur les résultats :

1. Corrélations décalées entre un indice de « pression haussière or » par catégorie,
   I_c(t) = Σ Δlogit(p) × direction a priori, et le rendement de l'or r(t+k).
   k > 0 significatif => Polymarket MÈNE ; k < 0 => Polymarket SUIT l'or.
2. Causalité de Granger horaire dans les deux sens.
3. Étude d'événements : sauts de probabilité (regroupés en « nouvelles »), rendement
   ANORMAL signé de l'or (dérive récente retirée) avant / après, entrée réaliste après
   observation, coûts déduits, t-stat calculées sur moyennes journalières.

Deux résolutions :
- M5 : bougies M1 Dukascopy agrégées (période limitée par le débit de la source) ;
- H1 : bougies H1 Dukascopy, toute la période (test hors échantillon 2026).

Aucune donnée n'est inventée : toute série manquante est exclue et comptée.

Usage : python -m research.phase0_leadlag [M5|H1]
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
import statsmodels.api as sm  # noqa: E402
from statsmodels.tsa.stattools import grangercausalitytests  # noqa: E402

from research.data import dukascopy  # noqa: E402
from research.data.polymarket import ROOT as PM_ROOT  # noqa: E402
from research.labels import prior_direction  # noqa: E402

BASE = Path(__file__).resolve().parents[1]
OUT = BASE / "docs" / "phase0"
IMG = OUT / "img"
COST_BP = 1.5  # spread + glissement aller-retour XAUUSD, points de base (hypothèse prudente)
SPLIT = pd.Timestamp("2026-01-01", tz="UTC")

C_BLUE, C_ORANGE, C_GRAY, C_INK, C_INK2 = "#2a78d6", "#eb6834", "#8a8984", "#0b0b0b", "#52514e"
CAT_FR = {
    "fed": "Fed / taux", "macro_data": "Données macro", "tariffs": "Droits de douane",
    "geo_middle_east": "Moyen-Orient / Iran", "geo_russia_ukraine": "Russie / Ukraine",
    "geo_china": "Chine / Taïwan", "geo_venezuela": "Venezuela / Amériques",
    "us_shutdown": "Shutdown US",
}


@dataclass(frozen=True)
class Res:
    name: str
    bar: str
    bar_min: int
    bars_per_day: int
    lags: range
    entry_delay_min: int          # latence entre l'observation du saut et l'entrée
    windows: dict                 # libellé -> minutes après l'entrée
    pre_min: int


RES = {
    "M5": Res("M5", "5min", 5, 276, range(-12, 13), 5,
              {"post_15m": 15, "post_1h": 60, "post_4h": 240, "post_1d": 1440}, 60),
    "H1": Res("H1", "1h", 60, 23, range(-12, 13), 0,
              {"post_1h": 60, "post_4h": 240, "post_1d": 1440, "post_3d": 4320}, 240),
}


# ----------------------------------------------------------------------------- données

def gold_grid(res: Res) -> pd.DataFrame:
    if res.name == "M5":
        src = dukascopy.load("XAUUSD")
        step = pd.Timedelta("1min")
    else:
        src = dukascopy.load_hourly("XAUUSD")
        step = pd.Timedelta("1h")
    src = src[src["volume"] > 0]
    px = src["close"].copy()
    px.index = px.index + step  # prix « connu à » la fin de la bougie
    g = px.resample(res.bar, label="right", closed="right").last().to_frame("px")
    g["open"] = g["px"].notna()
    g["px_ffill"] = g["px"].ffill()
    g["r"] = np.log(g["px"]).diff()
    g.loc[~(g["open"] & g["open"].shift(1, fill_value=False)), "r"] = np.nan
    # Dérive récente (moyenne passée sur ~20 jours de bourse) : retirée des rendements
    # d'événements pour ne pas confondre tendance de fond et signal.
    g["drift"] = g["r"].rolling(20 * res.bars_per_day, min_periods=5 * res.bars_per_day).mean().shift(1).ffill()
    return g


def market_series(token: str, start, end, bar: str) -> pd.Series | None:
    f = PM_ROOT / "history" / f"{token}_5m.parquet"
    if not f.exists():
        return None
    p = pd.read_parquet(f)["p"]
    if p.empty:
        return None
    p = p.resample(bar, label="right", closed="right").last().ffill(limit=max(1, 60 // max(1, pd.Timedelta(bar).seconds // 60)))
    p = p[(p.index >= start) & (p.index <= end)]
    return p if p.notna().sum() > 30 else None


def logit(p: pd.Series) -> pd.Series:
    q = p.clip(0.01, 0.99)
    return np.log(q / (1 - q))


# ----------------------------------------------------------------------------- tests

def nw_t(y: pd.Series, x: pd.Series, lags: int = 6) -> float:
    d = pd.concat([y, x], axis=1).dropna()
    if len(d) < 200 or d.iloc[:, 1].std() == 0:
        return np.nan
    res = sm.OLS(d.iloc[:, 0], sm.add_constant(d.iloc[:, 1])).fit(
        cov_type="HAC", cov_kwds={"maxlags": lags})
    return float(res.tvalues.iloc[1])


def leadlag(idx: pd.Series, r: pd.Series, lags: range) -> pd.DataFrame:
    rows = []
    z = idx.clip(idx.quantile(0.001), idx.quantile(0.999))
    zz = z.where(z != 0)
    for k in lags:
        rk = r.shift(-k)
        d = pd.concat([zz, rk], axis=1).dropna()
        ok = len(d) > 100
        rows.append({"lag": k, "n": len(d),
                     "pearson": d.iloc[:, 0].corr(d.iloc[:, 1]) if ok else np.nan,
                     "spearman": d.iloc[:, 0].corr(d.iloc[:, 1], method="spearman") if ok else np.nan,
                     "t_nw": nw_t(rk, zz)})
    return pd.DataFrame(rows)


def granger_hourly(idx: pd.Series, r: pd.Series) -> dict:
    h = pd.concat([idx.resample("1h").sum(), r.resample("1h").sum(min_count=1)], axis=1).dropna()
    h.columns = ["pm", "gold"]
    h = h[h["pm"] != 0]
    out = {"n": len(h)}
    if len(h) < 300:
        return out
    h["pm"] = h["pm"].clip(h["pm"].quantile(0.001), h["pm"].quantile(0.999))
    for name, cols in {"p_pm_cause_or": ["gold", "pm"], "p_or_cause_pm": ["pm", "gold"]}.items():
        try:
            res = grangercausalitytests(h[cols], maxlag=3)
            out[name] = min(res[k][0]["ssr_ftest"][1] for k in res)
        except Exception:  # noqa: BLE001
            out[name] = np.nan
    return out


def detect_jumps(x: pd.Series, p: pd.Series, end: pd.Timestamp, bars_per_day: int) -> pd.DataFrame:
    """Saut = |Δp| >= 5 pts ET |Δlogit| >= 0,25 ET z >= 4 vs écart-type EWMA passé."""
    vol = x.ewm(halflife=bars_per_day, min_periods=50).std().shift(1)
    z = x / vol.clip(lower=0.01)
    dp = p.diff()
    m = (dp.abs() >= 0.05) & (x.abs() >= 0.25) & (z.abs() >= 4) & p.shift(1).between(0.03, 0.97)
    j = pd.DataFrame({"dx": x[m], "dp": dp[m], "z": z[m], "p0": p.shift(1)[m]})
    keep, last = [], None
    for t in j.index:
        if last is None or t - last >= pd.Timedelta("60min"):
            keep.append(t)
            last = t
    j = j.loc[keep]
    j["h_to_end"] = (end - j.index).total_seconds() / 3600
    return j


def asof_px(g: pd.DataFrame, t: pd.Timestamp) -> float:
    return g["px_ffill"].asof(t)


def lret(g: pd.DataFrame, a: pd.Timestamp, b: pd.Timestamp) -> float:
    pa, pb = asof_px(g, a), asof_px(g, b)
    return float(np.log(pb / pa)) if pd.notna(pa) and pd.notna(pb) else np.nan


def next_open(open_idx: pd.DatetimeIndex, t: pd.Timestamp) -> pd.Timestamp | None:
    i = open_idx.searchsorted(t)
    return open_idx[i] if i < len(open_idx) else None


# ----------------------------------------------------------------------------- principal

def run(res: Res) -> dict:
    IMG.mkdir(parents=True, exist_ok=True)
    g = gold_grid(res)
    r = g["r"]
    open_idx = g.index[g["open"]]
    gold_start, gold_end = open_idx.min(), open_idx.max()
    uni = pd.read_parquet(PM_ROOT / "universe.parquet")
    uni[["prior", "why"]] = uni["question"].apply(lambda q: pd.Series(prior_direction(q)))

    cov = {"resolution": res.name, "marches_univers": len(uni),
           "marches_direction": int((uni.prior != 0).sum()),
           "or_debut": str(gold_start), "or_fin": str(gold_end), "barres_or": int(g["open"].sum())}

    idx_by_cat: dict[str, list] = {}
    jumps, missing = [], 0
    for m in uni.itertuples():
        if m.prior == 0:
            continue
        p = market_series(m.yes_token, max(m.start, gold_start), min(m.end, gold_end), res.bar)
        if p is None:
            missing += 1
            continue
        x = logit(p).diff()
        idx_by_cat.setdefault(m.category, []).append((m.prior * x).rename(m.market_id))
        j = detect_jumps(x, p, m.end, res.bars_per_day)
        if not j.empty:
            j["market_id"], j["category"], j["prior"] = m.market_id, m.category, m.prior
            j["question"] = m.question
            jumps.append(j)
    cov["marches_exclus_hors_periode_ou_vides"] = missing

    # ---------------------------------------------------- 1 + 2 : lead/lag, Granger
    ll_rows, gr_rows, indices = [], [], {}
    for cat, lst in idx_by_cat.items():
        idx = pd.concat(lst, axis=1).sum(axis=1, min_count=1).reindex(g.index).fillna(0)
        indices[cat] = idx
    indices["all"] = pd.concat(indices.values(), axis=1).sum(axis=1)
    for cat, idx in indices.items():
        ll = leadlag(idx, r, res.lags)
        ll["category"] = cat
        ll_rows.append(ll)
        gr = granger_hourly(idx, r)
        gr["category"] = cat
        gr_rows.append(gr)
    LL, GR = pd.concat(ll_rows), pd.DataFrame(gr_rows)

    # ---------------------------------------------------- 3 : étude d'événements
    J = pd.concat(jumps).sort_index()
    J["t0"] = J.index
    J["cluster"] = (J["t0"].diff() > pd.Timedelta("15min")).cumsum().values
    J["signed"] = J["prior"] * J["dx"]
    ev = J.groupby("cluster").agg(
        t0=("t0", "first"), n_markets=("market_id", "nunique"), push=("signed", "sum"),
        category=("category", lambda s: s.value_counts().index[0]),
        near_res=("h_to_end", lambda s: bool((s < 24).all())), question=("question", "first"))
    ev = ev[ev["push"] != 0]
    ev["dir"] = np.sign(ev["push"])

    rows = []
    for e in ev.itertuples():
        t0 = e.t0
        if t0 < gold_start:
            continue
        entry = next_open(open_idx, t0 + pd.Timedelta(minutes=res.entry_delay_min))
        if entry is None or entry > gold_end:
            continue
        drift = g["drift"].asof(t0)
        drift = 0.0 if pd.isna(drift) else float(drift)
        rec = {"t0": t0, "dir": e.dir, "category": e.category, "n_markets": e.n_markets,
               "near_res": e.near_res, "gold_open_at_t0": bool(g["open"].asof(t0)),
               "delay_min": (entry - t0).total_seconds() / 60, "question": e.question}
        rec["pre"] = lret(g, t0 - pd.Timedelta(minutes=res.pre_min), t0 - pd.Timedelta(minutes=res.bar_min))
        rec["same_bar"] = lret(g, t0 - pd.Timedelta(minutes=res.bar_min), t0)
        rec["to_entry"] = lret(g, t0, entry)
        for lab, mins in res.windows.items():
            end = entry + pd.Timedelta(minutes=mins)
            nb = int(g["open"].loc[entry:end].sum())
            rec[lab] = lret(g, entry, end) - drift * nb
        rows.append(rec)
    E = pd.DataFrame(rows)
    cols = ["pre", "same_bar", "to_entry", *res.windows]
    for c in cols:
        E["s_" + c] = E[c] * E["dir"] * 1e4

    def summarize(df: pd.DataFrame) -> dict:
        out = {"n": len(df), "jours": int(df["t0"].dt.date.nunique()) if len(df) else 0,
               "part_haussier": round(float((df["dir"] > 0).mean()), 3) if len(df) else None}
        for c in cols:
            v = df["s_" + c].dropna()
            if len(v) >= 8:
                daily = v.groupby(df.loc[v.index, "t0"].dt.date).mean()
                t = daily.mean() / (daily.std(ddof=1) / np.sqrt(len(daily))) if len(daily) > 2 else np.nan
                out[c] = {"moy_pb": round(float(v.mean()), 2), "t_jour": round(float(t), 2),
                          "taux_bon_sens": round(float((v > 0).mean()), 3)}
        for c in res.windows:
            v = df["s_" + c].dropna()
            if len(v) >= 8:
                net = v - COST_BP
                gains, losses = net[net > 0].sum(), -net[net < 0].sum()
                out["net_" + c] = {"esperance_pb": round(float(net.mean()), 2),
                                   "profit_factor": round(float(gains / losses), 2) if losses > 0 else None,
                                   "taux_gain": round(float((net > 0).mean()), 3)}
        return out

    groups = {"Tous": E, "Hors veille de résolution": E[~E.near_res],
              "Or ouvert au moment du saut": E[E.gold_open_at_t0],
              "Or fermé au moment du saut": E[~E.gold_open_at_t0],
              "Période 2025": E[E.t0 < SPLIT], "Période 2026": E[E.t0 >= SPLIT],
              "Nouvelle multi-marchés (≥3)": E[E.n_markets >= 3]}
    for cat in sorted(E.category.unique()):
        groups[CAT_FR.get(cat, cat)] = E[E.category == cat]
    SUM = {k: summarize(v) for k, v in groups.items()}

    # ---------------------------------------------------- figures
    cats = ["all"] + [c for c in CAT_FR if c in indices]
    ncol = 3
    nrow = int(np.ceil(len(cats) / ncol))
    fig, axes = plt.subplots(nrow, ncol, figsize=(13, 3.2 * nrow), sharex=True)
    for ax, cat in zip(axes.flat, cats):
        d = LL[LL.category == cat]
        colors = [C_ORANGE if k > 0 else (C_BLUE if k < 0 else C_INK) for k in d.lag]
        ax.bar(d.lag, d.pearson, color=colors, width=0.7)
        n = int(d.n.max()) if len(d) else 1
        ax.axhspan(-2 / np.sqrt(max(n, 1)), 2 / np.sqrt(max(n, 1)), color=C_GRAY, alpha=0.15, lw=0)
        ax.axhline(0, color=C_GRAY, lw=0.8)
        ax.set_title("Toutes catégories" if cat == "all" else CAT_FR[cat], fontsize=10, color=C_INK)
        ax.tick_params(labelsize=8, colors=C_INK2)
        for s in ("top", "right"):
            ax.spines[s].set_visible(False)
    for ax in list(axes.flat)[len(cats):]:
        ax.axis("off")
    unit = "5 min" if res.name == "M5" else "1 h"
    fig.supxlabel(f"Décalage k (barres de {unit}).  Bleu, k < 0 : l'or a bougé AVANT Polymarket  ·  "
                  "Orange, k > 0 : l'or bouge APRÈS", fontsize=10, color=C_INK2)
    fig.supylabel("Corrélation pression Polymarket / rendement or", fontsize=10, color=C_INK2)
    fig.suptitle(f"Qui bouge en premier ? ({res.name}, {cov['or_debut'][:10]} → {cov['or_fin'][:10]}; "
                 "bande grise ≈ bruit à 95 %)", fontsize=12)
    fig.tight_layout()
    fig.savefig(IMG / f"leadlag_{res.name}.png", dpi=130)
    plt.close(fig)

    step = res.bar_min
    offs = np.arange(-res.pre_min, max(res.windows.values()) // (4 if res.name == "H1" else 1) + step, step)
    offs = offs[offs <= (1440 if res.name == "H1" else 240)]

    def path(df):
        mat = []
        for t0, d in zip(df.t0, df.dir):
            base = asof_px(g, t0)
            if pd.isna(base):
                continue
            pts = np.array([asof_px(g, t0 + pd.Timedelta(minutes=int(o))) for o in offs], dtype=float)
            mat.append(np.log(pts / base) * 1e4 * d)
        mat = np.array(mat)
        if not len(mat):
            return None, None
        return np.nanmean(mat, axis=0), np.nanstd(mat, axis=0) / np.sqrt(len(mat))

    fig, ax = plt.subplots(figsize=(10, 4.8))
    for lab, df, col in [("Or ouvert au moment du saut", E[E.gold_open_at_t0], C_BLUE),
                         ("Idem, hors veille de résolution", E[E.gold_open_at_t0 & ~E.near_res], C_ORANGE)]:
        mu, se = path(df)
        if mu is None:
            continue
        ax.plot(offs / 60, mu, color=col, lw=2, label=f"{lab} (n={len(df)})")
        ax.fill_between(offs / 60, mu - 2 * se, mu + 2 * se, color=col, alpha=0.15, lw=0)
    ax.axvline(0, color=C_INK, lw=1)
    ax.axhline(0, color=C_GRAY, lw=0.8)
    ax.set_xlabel("Heures autour du saut de probabilité Polymarket (t0)", color=C_INK2)
    ax.set_ylabel("Rendement de l'or dans le sens attendu (pb)", color=C_INK2)
    ax.set_title(f"Étude d'événements ({res.name}) : trajectoire moyenne de l'or (± 2 erreurs-types)")
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    ax.legend(frameon=False, fontsize=9)
    fig.tight_layout()
    fig.savefig(IMG / f"event_study_{res.name}.png", dpi=130)
    plt.close(fig)

    LL.to_csv(OUT / f"leadlag_{res.name}.csv", index=False)
    GR.to_csv(OUT / f"granger_{res.name}.csv", index=False)
    E.to_csv(OUT / f"events_{res.name}.csv", index=False)
    summary = {"coverage": cov, "n_sauts_bruts": len(J), "n_nouvelles": len(ev), "events": SUM,
               "granger": GR.round(4).to_dict(orient="records"),
               "leadlag_all": LL[LL.category == "all"].round(4).to_dict(orient="records")}
    (OUT / f"summary_{res.name}.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False, default=str))
    return summary


if __name__ == "__main__":
    which = sys.argv[1:] or ["M5", "H1"]
    for w in which:
        s = run(RES[w])
        print(json.dumps({k: s[k] for k in ("coverage", "n_sauts_bruts", "n_nouvelles")}, indent=1))
        print(pd.DataFrame(s["granger"]).to_string())
        for k, v in s["events"].items():
            print(k, json.dumps(v, ensure_ascii=False))
