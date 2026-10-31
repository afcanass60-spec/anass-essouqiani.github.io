"""Reinforcement learning (contextual bandit) for regime -> strategy selection.

Why a bandit and not deep RL: each decision (take / skip a proposed trade) has
an immediate, observable reward (the trade's R multiple) and only weakly
influences future states, which is precisely the contextual-bandit setting.
Full deep RL (DQN/PPO on raw prices) needs orders of magnitude more
independent episodes than a few years of gold signals provide and is a
well-documented overfitting machine on financial series.

Policy: Thompson sampling with a Normal posterior on the mean R of every
(regime, strategy) cell.  Evaluated by *replay* in chronological order: the
policy only learns from trades it would have taken (bandit feedback), and its
out-of-sample result is compared with "take everything" and with the default
regime matrix.  The learned matrix can be exported to the EA input
``InpRegimeMatrix`` -- only if it wins out of sample.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from ..config import REGIMES, STRATEGIES, format_regime_matrix, parse_regime_matrix


class ThompsonGate:
    def __init__(self, prior_mean: float = 0.0, prior_n: float = 5.0, sigma: float = 1.2, seed: int = 0):
        self.prior_mean, self.prior_n, self.sigma = prior_mean, prior_n, sigma
        self.n = np.zeros((len(REGIMES), len(STRATEGIES)))
        self.s = np.zeros_like(self.n)
        self.rng = np.random.default_rng(seed)

    def posterior(self):
        n = self.n + self.prior_n
        mean = (self.s + self.prior_mean * self.prior_n) / n
        sd = self.sigma / np.sqrt(n)
        return mean, sd

    def take(self, reg: int, strat: int) -> bool:
        mean, sd = self.posterior()
        return self.rng.normal(mean[reg, strat], sd[reg, strat]) > 0

    def update(self, reg: int, strat: int, r: float):
        self.n[reg, strat] += 1
        self.s[reg, strat] += r

    def matrix(self, min_prob: float = 0.7) -> dict:
        from scipy.stats import norm
        mean, sd = self.posterior()
        p_pos = 1 - norm.cdf(0, mean, sd)
        m = {r: set() for r in REGIMES}
        for i, r in enumerate(REGIMES):
            for j, s in enumerate(STRATEGIES):
                if p_pos[i, j] >= min_prob and self.n[i, j] >= 10:
                    m[r].add(s)
        return m


def replay(meta: pd.DataFrame, split_time: int, seed: int = 0, prior_n: float = 5.0, explore_until: int | None = None):
    """meta: columns time, regime, strategy, r (from build_meta_dataset). Returns OOS comparison."""
    meta = meta.sort_values("time").reset_index(drop=True)
    gate = ThompsonGate(prior_n=prior_n, seed=seed)
    s_idx = meta["strategy"].map({s: i for i, s in enumerate(STRATEGIES)}).to_numpy()
    reg, r, t = meta["regime"].to_numpy(), meta["r"].to_numpy(), meta["time"].to_numpy()
    taken = np.zeros(len(meta), dtype=bool)
    for k in range(len(meta)):
        if t[k] < split_time:              # in-sample: full-information learning (all outcomes known)
            gate.update(reg[k], s_idx[k], r[k])
            continue
        if gate.take(reg[k], s_idx[k]):    # out-of-sample: bandit feedback only
            taken[k] = True
            gate.update(reg[k], s_idx[k], r[k])
    oos = t >= split_time
    return {"oos_n": int(oos.sum()), "oos_mean_r_all": float(r[oos].mean()) if oos.any() else 0.0,
            "oos_n_taken": int(taken.sum()), "oos_mean_r_taken": float(r[taken].mean()) if taken.any() else 0.0,
            "oos_total_r_all": float(r[oos].sum()), "oos_total_r_taken": float(r[taken].sum()),
            "learned_matrix": format_regime_matrix(gate.matrix()), "gate": gate}


def matrix_filter(meta: pd.DataFrame, matrix_str: str) -> np.ndarray:
    m = parse_regime_matrix(matrix_str)
    return np.array([s in m[REGIMES[g]] for s, g in zip(meta["strategy"], meta["regime"])])
