"""Recherche de signaux prix / macro sur XAUUSD — hypothèses PRÉ-ENREGISTRÉES.

Toutes les règles et leurs paramètres sont fixés dans ce fichier AVANT le premier calcul.
Aucune optimisation : chaque règle est évaluée telle quelle, puis l'ensemble des tests
est corrigé pour comparaisons multiples (Benjamini-Hochberg).

Conventions :
- Barres H1 Dukascopy (BID), uniquement les heures où le marché est ouvert ; le rendement
  entre deux barres ouvertes consécutives inclut les gaps de week-end (une position tenue
  le vendredi subit le gap du dimanche).
- Position p(t) décidée avec les données <= t, rendement gagné sur la barre suivante.
- Coût : 0,75 pb par unité de changement de position (1,5 pb l'aller-retour).
- Macro FRED quotidienne utilisée avec 2 jours de décalage (publication + prudence).
- « Alpha de timing » = rendement de la stratégie - exposition moyenne × rendement moyen de
  l'or, pour ne pas confondre une stratégie surtout acheteuse avec du talent dans un marché
  haussier.
"""

from __future__ import annotations

import io
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
import requests  # noqa: E402
from scipy import stats  # noqa: E402

from research.data import dukascopy  # noqa: E402

BASE = Path(__file__).resolve().parents[1]
OUT = BASE / "docs" / "phase1r"
CACHE = BASE / "data" / "raw" / "fred"
COST_SIDE_BP = 0.75
SPLIT = pd.Timestamp("2023-01-01", tz="UTC")
FRED = ["DFII10", "DGS10", "T10YIE", "VIXCLS", "DTWEXBGS"]
C_BLUE, C_ORANGE, C_GRAY, C_INK, C_INK2 = "#2a78d6", "#eb6834", "#8a8984", "#0b0b0b", "#52514e"


# ----------------------------------------------------------------------------- données

def gold_h1() -> pd.DataFrame:
    d = dukascopy.load_hourly("XAUUSD")
    d = d[d["volume"] > 0].copy()
    d.index = d.index + pd.Timedelta("1h")  # horodatage = fin de bougie
    d = d[~d.index.duplicated()].sort_index()
    d["r"] = np.log(d["close"]).diff()
    return d


def fred(series: str) -> pd.Series:
    CACHE.mkdir(parents=True, exist_ok=True)
    f = CACHE / f"{series}.csv"
    if not f.exists():
        r = requests.get("https://fred.stlouisfed.org/graph/fredgraph.csv",
                         params={"id": series, "cosd": "2017-01-01"}, timeout=60)
        r.raise_for_status()
        f.write_text(r.text)
    s = pd.read_csv(f, index_col=0, parse_dates=True).iloc[:, 0]
    return pd.to_numeric(s, errors="coerce").dropna()


# ----------------------------------------------------------------------------- règles

def rsi(close: pd.Series, n: int = 14) -> pd.Series:
    d = close.diff()
    up = d.clip(lower=0).ewm(alpha=1 / n, adjust=False).mean()
    dn = (-d.clip(upper=0)).ewm(alpha=1 / n, adjust=False).mean()
    return 100 - 100 / (1 + up / dn)


def hold(trigger: pd.Series, bars: int) -> pd.Series:
    """Ouvre une position (+1/-1) au déclenchement et la tient `bars` barres (dernier signal gagne)."""
    p = np.zeros(len(trigger))
    trig = trigger.fillna(0).values
    left, cur = 0, 0.0
    for i, t in enumerate(trig):
        if t != 0:
            cur, left = t, bars
        if left > 0:
            p[i] = cur
            left -= 1
        else:
            p[i] = 0
    return pd.Series(p, index=trigger.index)


def build_rules(g: pd.DataFrame, macro: pd.DataFrame) -> dict[str, pd.Series]:
    c, lc = g["close"], np.log(g["close"])
    R: dict[str, pd.Series] = {}
    for L, lab in [(23, "1j"), (115, "1sem"), (460, "4sem")]:
        R[f"Tendance {lab}"] = np.sign(lc - lc.shift(L))
    R["EMA H4 20/50"] = np.sign(c.ewm(span=80).mean() - c.ewm(span=200).mean())
    x = rsi(c)
    trig = pd.Series(np.where(x < 30, 1, np.where(x > 70, -1, 0)), index=c.index)
    R["RSI 30/70 tenu 4h"] = hold(trig, 4)
    R["RSI 30/70 tenu 24h"] = hold(trig, 23)
    day = g.index.floor("D")
    hi = g["high"].groupby(day).max().shift(1).reindex(day).values
    lo = g["low"].groupby(day).min().shift(1).reindex(day).values
    br = pd.Series(np.where(c > hi, 1, np.where(c < lo, -1, 0)), index=c.index)
    first_break = br.where(br != br.shift(1), 0)  # premier franchissement seulement
    R["Cassure veille tenu 24h"] = hold(first_break, 23)
    sig = g["r"].ewm(halflife=115, min_periods=200).std().shift(1)
    shock = pd.Series(np.where(g["r"].abs() > 3 * sig, np.sign(g["r"]), 0), index=c.index)
    R["Choc >3σ continuation 4h"] = hold(shock, 4)
    R["Choc >3σ continuation 24h"] = hold(shock, 23)
    R["Choc >3σ retournement 4h"] = -hold(shock, 4)
    R["Choc >3σ retournement 24h"] = -hold(shock, 23)
    # Macro : variation du jour d, appliquée de J+2 00:00 UTC à J+3 00:00 UTC.
    for col, sgn, lab in [("DFII10", -1, "Taux réels ↓ ⇒ achat"), ("DTWEXBGS", -1, "Dollar ↓ ⇒ achat"),
                          ("VIXCLS", +1, "VIX ↑ ⇒ achat"), ("T10YIE", +1, "Inflation anticipée ↑ ⇒ achat")]:
        dm = np.sign(macro[col].diff()) * sgn
        dm.index = dm.index + pd.Timedelta(days=2)
        dm.index = dm.index.tz_localize("UTC")
        R[f"Macro : {lab}"] = dm.reindex(day, method="ffill").set_axis(c.index).fillna(0)
    return {k: v.astype(float).fillna(0) for k, v in R.items()}


# ----------------------------------------------------------------------------- évaluation

def evaluate(p: pd.Series, r: pd.Series) -> tuple[pd.Series, dict]:
    pos = p.shift(1).fillna(0)
    gross = pos * r
    cost = p.diff().abs().fillna(0).shift(1).fillna(0) * COST_SIDE_BP / 1e4
    net = (gross - cost).dropna()
    daily = net.groupby(net.index.floor("D")).sum()
    daily = daily[daily != 0] if (daily != 0).any() else daily
    mu_mkt = r.mean()
    timing = (pos * (r - mu_mkt) - cost).dropna()
    tdaily = timing.groupby(timing.index.floor("D")).sum()
    eq = daily.cumsum()
    dd = (eq - eq.cummax()).min()
    t = daily.mean() / (daily.std(ddof=1) / np.sqrt(len(daily))) if len(daily) > 20 else np.nan
    tt = tdaily.mean() / (tdaily.std(ddof=1) / np.sqrt(len(tdaily))) if len(tdaily) > 20 else np.nan
    years = daily.groupby(daily.index.year).sum()
    # Facteur d'annualisation = nombre réel de « jours » de cotation par an (dimanches soir inclus).
    span_y = max((r.index[-1] - r.index[0]).days / 365.25, 1e-9)
    af = r.groupby(r.index.floor("D")).size().size / span_y
    out = {
        "rend_annuel_%": round(float(daily.mean() * af * 100), 2),
        "sharpe": round(float(daily.mean() / daily.std() * np.sqrt(af)), 2) if daily.std() > 0 else np.nan,
        "t": round(float(t), 2),
        "alpha_timing_annuel_%": round(float(tdaily.mean() * af * 100), 2),
        "t_alpha": round(float(tt), 2),
        "p_alpha": float(2 * stats.t.sf(abs(tt), len(tdaily) - 1)) if np.isfinite(tt) else np.nan,
        "drawdown_max_%": round(float(dd * 100), 1),
        "profit_factor": round(float(daily[daily > 0].sum() / -daily[daily < 0].sum()), 2),
        "jours_gagnants": round(float((daily > 0).mean()), 3),
        "exposition_moy": round(float(pos.mean()), 2),
        "temps_en_position": round(float((pos != 0).mean()), 2),
        "annees_positives": f"{int((years > 0).sum())}/{len(years)}",
        "alpha_2018_2022_%": round(float(tdaily[tdaily.index < SPLIT].mean() * af * 100), 2),
        "alpha_2023_2026_%": round(float(tdaily[tdaily.index >= SPLIT].mean() * af * 100), 2),
    }
    return eq, out


def bh(pvals: pd.Series, q: float = 0.05) -> pd.Series:
    p = pvals.sort_values()
    m = len(p)
    thresh = q * np.arange(1, m + 1) / m
    passed = p.values <= thresh
    k = passed.nonzero()[0].max() + 1 if passed.any() else 0
    return pd.Series(np.arange(m) < k, index=p.index).reindex(pvals.index)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    g = gold_h1()
    macro = pd.concat({s: fred(s) for s in FRED}, axis=1).ffill()
    rules = build_rules(g, macro)
    r = g["r"]

    rows, curves = {}, {}
    for name, p in rules.items():
        eq, m = evaluate(p, r)
        rows[name] = m
        curves[name] = eq
    bh_eq, bh_m = evaluate(pd.Series(1.0, index=r.index), r)
    rows["Référence : acheter et garder"] = bh_m
    T = pd.DataFrame(rows).T
    tested = T.drop(index="Référence : acheter et garder")
    T["significatif_BH_5%"] = bh(tested["p_alpha"]).reindex(T.index)

    # Saisonnalité (descriptif + test par session, cohérence annuelle).
    hr = r.index.hour
    sess = pd.Series(np.select([(hr >= 23) | (hr < 7), (hr >= 7) & (hr < 12), (hr >= 12) & (hr < 21)],
                               ["Asie (23-07 UTC)", "Londres (07-12)", "New York (12-21)"], "Clôture (21-23)"),
                     index=r.index)
    seas = []
    for s_name, rs in r.groupby(sess):
        daily = rs.groupby(rs.index.floor("D")).sum()
        yrs = daily.groupby(daily.index.year).mean()
        t = daily.mean() / (daily.std() / np.sqrt(len(daily)))
        af = daily.size / max((daily.index[-1] - daily.index[0]).days / 365.25, 1e-9)
        seas.append({"session": s_name, "rend_annuel_%": round(daily.mean() * af * 100, 2), "t": round(t, 2),
                     "annees_meme_signe": f"{int((np.sign(yrs) == np.sign(daily.mean())).sum())}/{len(yrs)}"})
    dow = r.groupby(r.index.floor("D")).sum()
    dow_t = dow.groupby(dow.index.dayofweek).agg(lambda x: x.mean() / (x.std() / np.sqrt(len(x))))

    # Corrélations contemporaines macro (descriptif, NON tradable) par année.
    gd = g["close"].resample("1D").last().dropna()
    gd.index = gd.index.tz_localize(None).normalize()
    dm = macro.diff()
    dfc = pd.concat([np.log(gd).diff().rename("or"), dm], axis=1).dropna()
    corr = dfc.groupby(dfc.index.year).apply(lambda x: x.corr()["or"].drop("or")).round(2)

    # Figures.
    fig, ax = plt.subplots(figsize=(11, 5.5))
    ax.plot(bh_eq.index, bh_eq.values * 100, color=C_GRAY, lw=2, label="Acheter et garder (référence)")
    top = tested["sharpe"].astype(float).sort_values(ascending=False).index[:3]
    for nm, col in zip(top, [C_BLUE, C_ORANGE, "#1baf7a"]):
        ax.plot(curves[nm].index, curves[nm].values * 100, color=col, lw=1.6, label=nm)
    ax.axhline(0, color=C_GRAY, lw=0.8)
    ax.set_ylabel("Rendement cumulé (log, %) après coûts", color=C_INK2)
    ax.set_title("XAUUSD H1 : 3 meilleures règles (par Sharpe) vs acheter-et-garder")
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    ax.legend(frameon=False, fontsize=9)
    fig.tight_layout()
    fig.savefig(OUT / "equity_top3.png", dpi=130)
    plt.close(fig)

    T.to_csv(OUT / "rules.csv")
    pd.DataFrame(seas).to_csv(OUT / "sessions.csv", index=False)
    corr.to_csv(OUT / "macro_corr_by_year.csv")
    summary = {"periode": [str(r.index.min()), str(r.index.max())], "barres": int(r.notna().sum()),
               "regles": T.astype(object).where(T.notna(), None).to_dict(orient="index"),
               "sessions": seas, "jour_semaine_t": dow_t.round(2).to_dict()}
    (OUT / "summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False, default=str))
    pd.set_option("display.width", 260)
    print(summary["periode"], summary["barres"])
    print(T[["rend_annuel_%", "sharpe", "alpha_timing_annuel_%", "t_alpha", "p_alpha", "drawdown_max_%",
             "profit_factor", "annees_positives", "alpha_2018_2022_%", "alpha_2023_2026_%",
             "significatif_BH_5%"]].to_string())
    print(pd.DataFrame(seas).to_string(index=False))
    print("Jour de semaine (t):", dow_t.round(2).to_dict())
    print(corr.to_string())


if __name__ == "__main__":
    main()
