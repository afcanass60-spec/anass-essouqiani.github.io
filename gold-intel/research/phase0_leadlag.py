"""Phase 0 — Les probabilités Polymarket précèdent-elles XAUUSD ?

Trois tests, sans paramètre ajusté sur les résultats :

1. Corrélations décalées (grille de 5 min) entre un indice de « pression haussière or »
   par catégorie, I_c(t) = somme des Δlogit(p) × direction a priori, et le rendement de l'or
   r(t+k), k = -12..+12 barres. k > 0 significatif => Polymarket MÈNE ; k < 0 => SUIT.
2. Causalité de Granger horaire dans les deux sens.
3. Étude d'événements : sauts de probabilité (regroupés en « nouvelles » à 15 min),
   rendement signé de l'or AVANT et APRÈS, avec une latence d'exécution réaliste
   (entrée au premier prix d'or disponible >= t0 + 5 min) et des coûts.

Aucune donnée n'est inventée : toute série manquante est exclue et comptée.
"""

from __future__ import annotations

import json
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
BAR = "5min"
LAGS = range(-12, 13)
COST_BP = 1.5  # spread + glissement aller-retour XAUUSD, en points de base (hypothèse prudente)
SPLIT = pd.Timestamp("2026-01-01", tz="UTC")  # 2025 = période A, 2026 = période B (hors échantillon)

C_BLUE, C_ORANGE, C_AQUA, C_GRAY, C_INK = "#2a78d6", "#eb6834", "#1baf7a", "#8a8984", "#0b0b0b"
CAT_FR = {
    "fed": "Fed / taux", "macro_data": "Données macro", "tariffs": "Droits de douane",
    "geo_middle_east": "Moyen-Orient / Iran", "geo_russia_ukraine": "Russie / Ukraine",
    "geo_china": "Chine / Taïwan", "geo_venezuela": "Venezuela / Amériques",
    "us_shutdown": "Shutdown US",
}


# ----------------------------------------------------------------------------- données

def gold_grid() -> pd.DataFrame:
    m1 = dukascopy.load("XAUUSD")
    m1 = m1[m1["volume"] > 0]
    px = m1["close"].copy()
    px.index = px.index + pd.Timedelta("1min")  # prix « connu à » la fin de la minute
    g = px.resample(BAR, label="right", closed="right").last().to_frame("px")
    g["open"] = g["px"].notna()
    g["px_ffill"] = g["px"].ffill()
    g["r"] = np.log(g["px"]).diff()
    g.loc[~(g["open"] & g["open"].shift(1, fill_value=False)), "r"] = np.nan
    return g


def market_series(token: str, start, end) -> pd.Series | None:
    f = PM_ROOT / "history" / f"{token}_5m.parquet"
    if not f.exists():
        return None
    p = pd.read_parquet(f)["p"]
    if p.empty:
        return None
    p = p.resample(BAR, label="right", closed="right").last().ffill(limit=12)
    p = p[(p.index >= start) & (p.index <= end)]
    return p if p.notna().sum() > 50 else None


def logit(p: pd.Series) -> pd.Series:
    q = p.clip(0.01, 0.99)
    return np.log(q / (1 - q))


# ----------------------------------------------------------------------------- tests

def newey_west_beta(y: pd.Series, x: pd.Series, lags: int = 6) -> tuple[float, float]:
    d = pd.concat([y, x], axis=1).dropna()
    if len(d) < 200 or d.iloc[:, 1].std() == 0:
        return np.nan, np.nan
    res = sm.OLS(d.iloc[:, 0], sm.add_constant(d.iloc[:, 1])).fit(
        cov_type="HAC", cov_kwds={"maxlags": lags})
    return float(res.params.iloc[1]), float(res.tvalues.iloc[1])


def leadlag(idx: pd.Series, r: pd.Series) -> pd.DataFrame:
    rows = []
    z = idx.clip(idx.quantile(0.001), idx.quantile(0.999))  # winsorisation des extrêmes
    for k in LAGS:
        rk = r.shift(-k)  # rendement k barres après (k>0) ou avant (k<0)
        d = pd.concat([z, rk], axis=1).dropna()
        d = d[d.iloc[:, 0] != 0]
        corr = d.iloc[:, 0].corr(d.iloc[:, 1]) if len(d) > 100 else np.nan
        spear = d.iloc[:, 0].corr(d.iloc[:, 1], method="spearman") if len(d) > 100 else np.nan
        _, t = newey_west_beta(rk, z.where(z != 0))
        rows.append({"lag": k, "n": len(d), "pearson": corr, "spearman": spear, "t_nw": t})
    return pd.DataFrame(rows)


def granger_hourly(idx: pd.Series, r: pd.Series) -> dict:
    h = pd.concat([idx.resample("1h").sum(), r.resample("1h").sum(min_count=1)], axis=1).dropna()
    h.columns = ["pm", "gold"]
    h = h[(h["pm"] != 0) | (h["gold"] != 0)]
    out = {}
    if len(h) < 300:
        return {"n": len(h)}
    h["pm"] = h["pm"].clip(h["pm"].quantile(0.001), h["pm"].quantile(0.999))
    for name, cols in {"pm_cause_or": ["gold", "pm"], "or_cause_pm": ["pm", "gold"]}.items():
        try:
            res = grangercausalitytests(h[cols], maxlag=3)
            out[name] = min(res[k][0]["ssr_ftest"][1] for k in res)
        except Exception:  # noqa: BLE001
            out[name] = np.nan
    out["n"] = len(h)
    return out


def detect_jumps(x: pd.Series, p: pd.Series, end: pd.Timestamp) -> pd.DataFrame:
    """Saut = |Δp| >= 5 pts ET |Δlogit| >= 0,25 ET z >= 4 vs écart-type EWMA passé."""
    vol = x.ewm(halflife=288, min_periods=100).std().shift(1)  # demi-vie 1 jour, sans futur
    z = x / vol.clip(lower=0.01)
    dp = p.diff()
    m = (dp.abs() >= 0.05) & (x.abs() >= 0.25) & (z.abs() >= 4) & p.shift(1).between(0.03, 0.97)
    j = pd.DataFrame({"dx": x[m], "dp": dp[m], "z": z[m], "p0": p.shift(1)[m]})
    # Au plus un saut par heure et par marché.
    keep, last = [], None
    for t in j.index:
        if last is None or t - last >= pd.Timedelta("60min"):
            keep.append(t)
            last = t
    j = j.loc[keep]
    j["h_to_end"] = (end - j.index).total_seconds() / 3600
    return j


def window_ret(g: pd.DataFrame, t_from: pd.Timestamp, t_to: pd.Timestamp) -> float:
    a = g["px_ffill"].asof(t_from)
    b = g["px_ffill"].asof(t_to)
    return float(np.log(b / a)) if pd.notna(a) and pd.notna(b) else np.nan


def next_open(g: pd.DataFrame, t: pd.Timestamp) -> pd.Timestamp | None:
    s = g.index[(g.index >= t) & g["open"].values]
    return s[0] if len(s) else None


# ----------------------------------------------------------------------------- principal

def main() -> None:
    IMG.mkdir(parents=True, exist_ok=True)
    g = gold_grid()
    r = g["r"]
    # Dérive récente de l'or (moyenne glissante passée, ~20 jours de bourse) : on la retire
    # pour ne pas confondre la tendance de fond avec un signal Polymarket.
    g["drift"] = r.rolling(20 * 276, min_periods=2000).mean().shift(1).ffill()
    uni = pd.read_parquet(PM_ROOT / "universe.parquet")
    uni[["prior", "why"]] = uni["question"].apply(lambda q: pd.Series(prior_direction(q)))
    gold_start, gold_end = g.index[g["open"]].min(), g.index[g["open"]].max()

    coverage = {"marches_univers": len(uni), "marches_direction": int((uni.prior != 0).sum()),
                "or_debut": str(gold_start), "or_fin": str(gold_end),
                "barres_or_ouvertes": int(g["open"].sum())}

    idx_by_cat: dict[str, list[pd.Series]] = {}
    jumps = []
    missing = 0
    for m in uni.itertuples():
        if m.prior == 0:
            continue
        p = market_series(m.yes_token, m.start, m.end)
        if p is None:
            missing += 1
            continue
        x = logit(p).diff()
        idx_by_cat.setdefault(m.category, []).append((m.prior * x).rename(m.market_id))
        j = detect_jumps(x, p, m.end)
        if not j.empty:
            j["market_id"], j["category"], j["prior"] = m.market_id, m.category, m.prior
            j["question"], j["event_id"] = m.question, m.event_id
            jumps.append(j)
    coverage["marches_sans_historique"] = missing

    # ------------------------------------------------------------ 1 + 2 : lead / lag, Granger
    ll_rows, gr_rows = [], []
    indices = {}
    for cat, lst in idx_by_cat.items():
        idx = pd.concat(lst, axis=1).sum(axis=1, min_count=1).reindex(g.index).fillna(0)
        indices[cat] = idx
        ll = leadlag(idx, r)
        ll["category"] = cat
        ll_rows.append(ll)
        gr = granger_hourly(idx, r)
        gr["category"] = cat
        gr_rows.append(gr)
    allidx = pd.concat(indices.values(), axis=1).sum(axis=1)
    ll = leadlag(allidx, r)
    ll["category"] = "all"
    ll_rows.append(ll)
    gr = granger_hourly(allidx, r)
    gr["category"] = "all"
    gr_rows.append(gr)
    LL = pd.concat(ll_rows)
    GR = pd.DataFrame(gr_rows)

    # ------------------------------------------------------------ 3 : étude d'événements
    J = pd.concat(jumps).sort_index()
    J["t0"] = J.index
    # Regroupement : sauts à moins de 15 min d'écart = une même nouvelle.
    cluster = (J["t0"].diff() > pd.Timedelta("15min")).cumsum()
    J["cluster"] = cluster.values
    J["signed"] = J["prior"] * J["dx"]
    ev = J.groupby("cluster").agg(
        t0=("t0", "first"), n_markets=("market_id", "nunique"), push=("signed", "sum"),
        category=("category", lambda s: s.value_counts().index[0]),
        near_res=("h_to_end", lambda s: bool((s < 24).all())),
        question=("question", "first"))
    ev = ev[ev["push"] != 0]
    ev["dir"] = np.sign(ev["push"])

    rows = []
    for e in ev.itertuples():
        t0 = e.t0
        is_open = bool(g["open"].asof(t0)) if t0 >= gold_start else False
        entry = next_open(g, t0 + pd.Timedelta("5min"))
        if entry is None or entry > gold_end:
            continue
        rec = {"t0": t0, "dir": e.dir, "category": e.category, "n_markets": e.n_markets,
               "near_res": e.near_res, "gold_open_at_t0": is_open,
               "delay_min": (entry - t0).total_seconds() / 60, "question": e.question}
        rec["pre_60"] = window_ret(g, t0 - pd.Timedelta("60min"), t0 - pd.Timedelta("5min"))
        rec["same_bar"] = window_ret(g, t0 - pd.Timedelta("5min"), t0)
        rec["to_entry"] = window_ret(g, t0, entry)
        drift = g["drift"].asof(t0)
        drift = 0.0 if pd.isna(drift) else float(drift)
        for lab, mins in {"post_15": 15, "post_60": 60, "post_240": 240, "post_1d": 1440}.items():
            raw = window_ret(g, entry, entry + pd.Timedelta(minutes=mins))
            n_bars = g["open"].loc[entry: entry + pd.Timedelta(minutes=mins)].sum()
            rec[lab] = raw - drift * n_bars  # rendement anormal (hors dérive)
        rows.append(rec)
    E = pd.DataFrame(rows)
    for c in ["pre_60", "same_bar", "to_entry", "post_15", "post_60", "post_240", "post_1d"]:
        E["s_" + c] = E[c] * E["dir"] * 1e4  # rendement signé en points de base

    # Base de comparaison : |rendement| moyen sur 60 min à la même heure UTC.
    abs60 = (np.log(g["px_ffill"]).shift(-12) - np.log(g["px_ffill"])).abs()
    abs60 = abs60[g["open"]]
    base_by_hour = abs60.groupby(abs60.index.hour).mean() * 1e4

    def summarize(df: pd.DataFrame) -> dict:
        out = {"n": len(df), "part_haussier": float((df["dir"] > 0).mean()) if len(df) else np.nan,
               "jours": int(df["t0"].dt.date.nunique()) if len(df) else 0}
        for c in ["s_pre_60", "s_same_bar", "s_to_entry", "s_post_15", "s_post_60", "s_post_240", "s_post_1d"]:
            v = df[c].dropna()
            if len(v) >= 5:
                # t-stat sur moyennes journalières : les événements d'un même jour ne sont
                # pas indépendants.
                daily = v.groupby(df.loc[v.index, "t0"].dt.date).mean()
                t = daily.mean() / (daily.std(ddof=1) / np.sqrt(len(daily))) if len(daily) > 2 else np.nan
                out[c] = (v.mean(), t, (v > 0).mean())
        for c in ["post_60", "post_240"]:
            v = df[c].dropna()
            if len(v) >= 5:
                net = v * df.loc[v.index, "dir"] * 1e4 - COST_BP
                gains, losses = net[net > 0].sum(), -net[net < 0].sum()
                out[f"net_{c}"] = (net.mean(), gains / losses if losses > 0 else np.inf,
                                   (net > 0).mean())
        v = (df["post_60"].abs() * 1e4).dropna()
        if len(v) >= 5:
            base = base_by_hour.reindex(df.loc[v.index, "t0"].dt.hour).values
            out["vol_ratio_60"] = float(v.mean() / np.nanmean(base))
        return out

    groups = {"Tous": E, "Hors veille de résolution": E[~E.near_res],
              "Or ouvert au moment du saut": E[E.gold_open_at_t0],
              "Or fermé (week-end/nuit)": E[~E.gold_open_at_t0],
              "Période A (2025)": E[E.t0 < SPLIT], "Période B (2026)": E[E.t0 >= SPLIT]}
    for cat in sorted(E.category.unique()):
        groups[CAT_FR.get(cat, cat)] = E[E.category == cat]
    SUM = {k: summarize(v) for k, v in groups.items()}

    # ------------------------------------------------------------ figures
    fig, axes = plt.subplots(3, 3, figsize=(13, 10), sharex=True)
    cats = ["all"] + [c for c in CAT_FR if c in indices]
    for ax, cat in zip(axes.flat, cats):
        d = LL[LL.category == cat]
        colors = [C_ORANGE if k > 0 else (C_BLUE if k < 0 else C_INK) for k in d.lag]
        ax.bar(d.lag, d.pearson, color=colors, width=0.7)
        ax.axhline(0, color=C_GRAY, lw=0.8)
        n = int(d.n.max()) if len(d) else 0
        ax.axhspan(-2 / np.sqrt(max(n, 1)), 2 / np.sqrt(max(n, 1)), color=C_GRAY, alpha=0.12, lw=0)
        ax.set_title("Toutes catégories" if cat == "all" else CAT_FR[cat], fontsize=10, color=C_INK)
        ax.tick_params(labelsize=8, colors="#52514e")
        for s in ("top", "right"):
            ax.spines[s].set_visible(False)
    for ax in axes.flat[len(cats):]:
        ax.axis("off")
    fig.supxlabel("Décalage k (barres de 5 min).  k < 0 : l'or a bougé AVANT (bleu)  ·  "
                  "k > 0 : l'or bouge APRÈS (orange)", fontsize=10)
    fig.supylabel("Corrélation (pression Polymarket, rendement or)", fontsize=10)
    fig.suptitle("Qui bouge en premier ? Corrélations décalées Polymarket → XAUUSD "
                 "(bande grise ≈ bruit à 95 %)", fontsize=12)
    fig.tight_layout()
    fig.savefig(IMG / "leadlag.png", dpi=130)
    plt.close(fig)

    # Trajectoire moyenne signée de l'or autour des sauts (-60 à +240 min).
    offs = np.arange(-60, 245, 5)
    def path(df):
        mat = []
        for t0 in df.t0:
            base = g["px_ffill"].asof(t0)
            if pd.isna(base):
                continue
            pts = [g["px_ffill"].asof(t0 + pd.Timedelta(minutes=int(o))) for o in offs]
            mat.append(np.log(np.array(pts, dtype=float) / base) * 1e4)
        mat = np.array(mat) * df["dir"].values[: len(mat), None] if mat else np.empty((0, len(offs)))
        return np.nanmean(mat, axis=0), np.nanstd(mat, axis=0) / np.sqrt(max(len(mat), 1))
    fig, ax = plt.subplots(figsize=(10, 5))
    for lab, df, col in [("Or ouvert au moment du saut", E[E.gold_open_at_t0], C_BLUE),
                         ("Hors veille de résolution (or ouvert)",
                          E[E.gold_open_at_t0 & ~E.near_res], C_ORANGE)]:
        mu, se = path(df)
        ax.plot(offs, mu, color=col, lw=2, label=f"{lab} (n={len(df)})")
        ax.fill_between(offs, mu - 2 * se, mu + 2 * se, color=col, alpha=0.15, lw=0)
    ax.axvline(0, color=C_INK, lw=1)
    ax.axvline(5, color=C_GRAY, lw=1, ls="--")
    ax.axhline(0, color=C_GRAY, lw=0.8)
    ax.text(6, ax.get_ylim()[1] * 0.92, "entrée possible\n(t0 + 5 min)", fontsize=8, color="#52514e")
    ax.set_xlabel("Minutes autour du saut de probabilité Polymarket (t0)")
    ax.set_ylabel("Rendement de l'or dans le sens attendu (pb)")
    ax.set_title("Étude d'événements : l'or a-t-il déjà bougé quand Polymarket saute ?")
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    ax.legend(frameon=False, fontsize=9)
    fig.tight_layout()
    fig.savefig(IMG / "event_study.png", dpi=130)
    plt.close(fig)

    # ------------------------------------------------------------ sauvegardes
    LL.to_csv(OUT / "leadlag.csv", index=False)
    GR.to_csv(OUT / "granger.csv", index=False)
    E.to_csv(OUT / "events.csv", index=False)
    (OUT / "summary.json").write_text(json.dumps(
        {"coverage": coverage, "events": SUM, "n_jumps_raw": len(J), "n_news_clusters": len(ev)},
        default=lambda o: float(o) if isinstance(o, (np.floating, np.integer)) else str(o),
        indent=2, ensure_ascii=False))
    print(json.dumps(coverage, indent=2))
    print(GR.to_string())
    print(LL[LL.category == "all"].to_string())
    for k, v in SUM.items():
        print(k, {kk: (tuple(round(float(x), 3) for x in vv) if isinstance(vv, tuple) else vv)
                  for kk, vv in v.items()})


if __name__ == "__main__":
    main()
