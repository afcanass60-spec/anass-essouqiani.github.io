"""Unsupervised regime discovery (Gaussian mixture) vs the rule-based regimes.

Question answered: do data-driven clusters separate trade outcomes better than
the hand-written regime rules?  Criterion: between-group variance of
out-of-sample trade R (eta squared).  The GMM is fitted on the in-sample period
only and then used to label OOS samples, so the comparison is leakage-free.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.mixture import GaussianMixture
from sklearn.preprocessing import StandardScaler

COLS = ["h1_atr_ratio", "h1_adx", "m15_bw_ratio", "h1_slope"]


def regime_inputs(X: pd.DataFrame) -> pd.DataFrame:
    return pd.DataFrame({
        "h1_atr_ratio": X["h1_atr"] / X["h1_atr_sma100"],
        "h1_adx": X["h1_adx"],
        "m15_bw_ratio": X["m15_bw"] / X["m15_bw_sma100"],
        "h1_slope": (X["h1_ema20"] - X["h1_ema50"]) / X["h1_atr"],
    }).replace([np.inf, -np.inf], np.nan).fillna(0.0)


def eta_squared(groups: np.ndarray, r: np.ndarray) -> float:
    if len(r) < 2 or r.var() == 0:
        return 0.0
    mu = r.mean()
    between = sum((groups == g).sum() * (r[groups == g].mean() - mu) ** 2 for g in np.unique(groups))
    return float(between / (len(r) * r.var()))


def compare_regimes(X: pd.DataFrame, meta: pd.DataFrame, split_time: int, k: int = 6, seed: int = 0) -> dict:
    Z = regime_inputs(X)
    is_rows = X.index[(X["T"] < split_time) & X["valid"]]
    sc = StandardScaler().fit(Z.loc[is_rows])
    gmm = GaussianMixture(n_components=k, random_state=seed).fit(sc.transform(Z.loc[is_rows]))
    oos = meta[meta["time"] >= split_time]
    clusters = gmm.predict(sc.transform(Z.loc[oos["row"].to_numpy()]))
    r = oos["r"].to_numpy()
    return {"oos_samples": len(oos), "eta2_rule_regimes": eta_squared(oos["regime"].to_numpy(), r),
            "eta2_gmm_clusters": eta_squared(clusters, r), "gmm": gmm, "scaler": sc}
