"""Black-box parameter optimisers compared under an equal evaluation budget.

* random_search                 - reference
* annealing_search              - classical simulated annealing directly on the backtest objective
* bayes_opt                     - Gaussian-process Bayesian optimisation (expected improvement)
* fmqa(solver="sqa")            - quantum-inspired FMQA (Kitai et al., 2020): a factorization-machine
                                  surrogate turned into a QUBO, minimised by SIMULATED quantum annealing
* fmqa(solver="sa")             - ablation: same surrogate, classical annealing.  If FMQA-SQA does not
                                  beat FMQA-SA, the "quantum" part brings nothing.

All take ``objective(params: dict) -> float`` (to maximise), a budget of
evaluations and a seed, and return ``(best_params, best_value)``.  They also
record ``history`` (value of every evaluation) for convergence comparisons.
"""
from __future__ import annotations

import warnings

import numpy as np
from scipy.stats import norm
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import ConstantKernel, Matern, WhiteKernel

from .annealing import one_hot_penalty, sa_solve, sqa_solve

DEFAULT_SPACE = [
    ("min_score", [55.0, 60.0, 65.0, 70.0, 75.0, 80.0]),
    ("w_structure", [5.0, 10.0, 15.0, 20.0, 25.0]),
    ("w_trend", [5.0, 10.0, 15.0, 20.0, 25.0]),
    ("w_momentum", [5.0, 10.0, 15.0, 20.0, 25.0]),
    ("w_liquidity", [5.0, 10.0, 15.0, 20.0, 25.0]),
    ("w_volatility", [5.0, 10.0, 15.0, 20.0, 25.0]),
    ("w_price_action", [5.0, 10.0, 15.0, 20.0, 25.0]),
    ("w_mtf", [5.0, 10.0, 15.0, 20.0, 25.0]),
    ("rr_target", [2.0, 2.5, 3.0]),
    ("sl_buffer_atr", [0.2, 0.3, 0.5]),
    ("trail_atr_mult", [1.5, 2.0, 2.5, 3.0]),
    ("break_even_r", [0.8, 1.0, 1.5]),
]


class Space:
    def __init__(self, spec=None):
        self.spec = spec or DEFAULT_SPACE
        self.sizes = [len(v) for _, v in self.spec]
        self.offsets = np.cumsum([0] + self.sizes[:-1])
        self.n_bits = int(sum(self.sizes))

    def random(self, rng) -> np.ndarray:
        return np.array([rng.integers(0, s) for s in self.sizes])

    def params(self, idx) -> dict:
        return {name: vals[int(i)] for (name, vals), i in zip(self.spec, idx)}

    def onehot(self, idx) -> np.ndarray:
        x = np.zeros(self.n_bits)
        x[self.offsets + np.asarray(idx)] = 1
        return x

    def decode(self, x) -> np.ndarray:
        idx = []
        for off, s in zip(self.offsets, self.sizes):
            seg = x[off:off + s]
            idx.append(int(np.argmax(seg)) if seg.sum() > 0 else s // 2)
        return np.array(idx)

    def groups(self):
        return [list(range(off, off + s)) for off, s in zip(self.offsets, self.sizes)]

    def unit(self, idx) -> np.ndarray:
        return np.array([i / max(1, s - 1) for i, s in zip(idx, self.sizes)])

    def mutate(self, idx, rng, k: int = 1) -> np.ndarray:
        idx = idx.copy()
        for p in rng.choice(len(self.sizes), size=k, replace=False):
            step = rng.choice([-1, 1])
            idx[p] = int(np.clip(idx[p] + step, 0, self.sizes[p] - 1))
        return idx


class _Evaluator:
    def __init__(self, objective, space):
        self.objective, self.space = objective, space
        self.cache, self.history = {}, []

    def __call__(self, idx):
        key = tuple(int(i) for i in idx)
        if key not in self.cache:
            v = float(self.objective(self.space.params(idx)))
            self.cache[key] = v
            self.history.append(v)
        return self.cache[key]

    def best(self):
        k = max(self.cache, key=self.cache.get)
        return self.space.params(np.array(k)), self.cache[k]


def random_search(objective, budget, seed=0, space=None):
    sp, rng = space or Space(), np.random.default_rng(seed)
    ev = _Evaluator(objective, sp)
    tries = 0
    while len(ev.history) < budget and tries < budget * 20:
        ev(sp.random(rng)); tries += 1
    random_search.history = ev.history
    return ev.best()


def annealing_search(objective, budget, seed=0, space=None, t0=1.0, t1=0.02):
    sp, rng = space or Space(), np.random.default_rng(seed)
    ev = _Evaluator(objective, sp)
    cur = sp.random(rng); cur_v = ev(cur)
    tries = 0
    while len(ev.history) < budget and tries < budget * 20:
        T = t0 * (t1 / t0) ** (len(ev.history) / budget)
        cand = sp.mutate(cur, rng, k=rng.integers(1, 3))
        v = ev(cand); tries += 1
        if v >= cur_v or rng.random() < np.exp((v - cur_v) / max(T, 1e-9)):
            cur, cur_v = cand, v
    annealing_search.history = ev.history
    return ev.best()


def bayes_opt(objective, budget, seed=0, space=None, n_init=8, n_cand=3000):
    sp, rng = space or Space(), np.random.default_rng(seed)
    ev = _Evaluator(objective, sp)
    pts = []
    while len(ev.history) < min(n_init, budget):
        p = sp.random(rng); ev(p); pts.append(p)
    kernel = ConstantKernel(1.0) * Matern(length_scale=np.ones(len(sp.sizes)) * 0.5, nu=2.5) + WhiteKernel(0.1)
    tries = 0
    while len(ev.history) < budget and tries < budget * 5:
        tries += 1
        keys = list(ev.cache)
        Xu = np.array([sp.unit(np.array(k)) for k in keys])
        y = np.array([ev.cache[k] for k in keys])
        mu, sd = y.mean(), y.std() or 1.0
        gp = GaussianProcessRegressor(kernel, normalize_y=False, random_state=seed, n_restarts_optimizer=1)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            gp.fit(Xu, (y - mu) / sd)
        cands = np.array([sp.random(rng) for _ in range(n_cand)])
        best_idx = np.array(max(ev.cache, key=ev.cache.get))
        cands[: n_cand // 4] = [sp.mutate(best_idx, rng, k=rng.integers(1, 3)) for _ in range(n_cand // 4)]
        m, s = gp.predict(np.array([sp.unit(c) for c in cands]), return_std=True)
        ybest = (y.max() - mu) / sd
        z = (m - ybest) / np.maximum(s, 1e-9)
        ei = (m - ybest) * norm.cdf(z) + s * norm.pdf(z)
        for j in np.argsort(-ei):
            if tuple(int(i) for i in cands[j]) not in ev.cache:
                ev(cands[j]); break
    bayes_opt.history = ev.history
    return ev.best()


# ----------------------------------------------------------------------------- FMQA
class FactorizationMachine:
    def __init__(self, n, k=8, seed=0, l2=1e-3):
        rng = np.random.default_rng(seed)
        self.w0, self.w = 0.0, np.zeros(n)
        self.V = rng.normal(0, 0.01, size=(n, k))
        self.l2 = l2

    def predict(self, X):
        XV = X @ self.V
        return self.w0 + X @ self.w + 0.5 * ((XV ** 2).sum(1) - ((X ** 2) @ (self.V ** 2)).sum(1))

    def fit(self, X, y, epochs=600, lr=0.02):
        params = [np.array(self.w0), self.w, self.V]
        m = [np.zeros_like(p, dtype=float) for p in params]
        v = [np.zeros_like(p, dtype=float) for p in params]
        n = len(y)
        for ep in range(1, epochs + 1):
            XV = X @ self.V
            err = self.predict(X) - y
            g0 = np.array(2 * err.mean())
            gw = 2 * X.T @ err / n + self.l2 * self.w
            gV = 2 * (X.T @ (err[:, None] * XV) - self.V * ((X ** 2).T @ err)[:, None]) / n + self.l2 * self.V
            for p_i, g in enumerate((g0, gw, gV)):
                m[p_i] = 0.9 * m[p_i] + 0.1 * g
                v[p_i] = 0.999 * v[p_i] + 0.001 * g ** 2
                step = lr * (m[p_i] / (1 - 0.9 ** ep)) / (np.sqrt(v[p_i] / (1 - 0.999 ** ep)) + 1e-8)
                if p_i == 0:
                    self.w0 -= float(step)
                elif p_i == 1:
                    self.w -= step
                else:
                    self.V -= step
        return self

    def qubo(self):
        """QUBO whose minimisation maximises the surrogate."""
        Q = -(self.V @ self.V.T)
        Q = np.triu(Q, 1)
        Q[np.diag_indices_from(Q)] = -self.w
        return Q


def fmqa(objective, budget, seed=0, space=None, solver="sqa", n_init=8):
    sp, rng = space or Space(), np.random.default_rng(seed)
    ev = _Evaluator(objective, sp)
    while len(ev.history) < min(n_init, budget):
        ev(sp.random(rng))
    tries = 0
    while len(ev.history) < budget and tries < budget * 5:
        tries += 1
        keys = list(ev.cache)
        Xb = np.array([sp.onehot(np.array(k)) for k in keys])
        y = np.array([ev.cache[k] for k in keys])
        ys = (y - y.mean()) / (y.std() or 1.0)
        fm = FactorizationMachine(sp.n_bits, k=6, seed=int(rng.integers(1 << 30))).fit(Xb, ys)
        Q = fm.qubo()
        Q = one_hot_penalty(Q, sp.groups(), weight=2.0 * np.abs(Q).max() + 1.0)
        solve = sqa_solve if solver == "sqa" else sa_solve
        x, _ = solve(Q, sweeps=120, seed=int(rng.integers(1 << 30)))
        idx = sp.decode(x)
        if tuple(int(i) for i in idx) in ev.cache:      # surrogate optimum already known: explore around it
            idx = sp.mutate(idx, rng, k=rng.integers(1, 3))
        ev(idx)
    fmqa.history = ev.history
    return ev.best()


OPTIMISERS = {
    "random": random_search,
    "annealing": annealing_search,
    "bayes": bayes_opt,
    "fmqa_sqa": lambda o, b, s=0, space=None: fmqa(o, b, s, space, solver="sqa"),
    "fmqa_sa": lambda o, b, s=0, space=None: fmqa(o, b, s, space, solver="sa"),
}


# ----------------------------------------------------------------------------- feature selection QUBO
def feature_selection_qubo(F: np.ndarray, y: np.ndarray, k: int, alpha: float = 0.7) -> np.ndarray:
    """mRMR as a QUBO: maximise relevance |corr(f, y)|, minimise redundancy |corr(f_i, f_j)|,
    with a soft constraint of selecting k features."""
    Fz = (F - F.mean(0)) / np.where(F.std(0) > 0, F.std(0), 1)
    yz = (y - y.mean()) / (y.std() or 1)
    rel = np.abs(Fz.T @ yz) / len(y)
    with np.errstate(divide="ignore", invalid="ignore"):
        red = np.nan_to_num(np.abs(np.corrcoef(Fz.T)))
    n = F.shape[1]
    rel = rel / (rel.max() or 1)
    Q = np.triu((1 - alpha) * red, 1)
    Q[np.diag_indices(n)] = -alpha * rel
    lam = 1.0
    # lam * (sum x - k)^2 = lam*(sum x_i (1 - 2k) + 2 sum_{i<j} x_i x_j) + const
    Q[np.diag_indices(n)] += lam * (1 - 2 * k)
    Q += np.triu(np.full((n, n), 2 * lam), 1)
    return Q


def greedy_mrmr(F, y, k, alpha=0.7):
    Fz = (F - F.mean(0)) / np.where(F.std(0) > 0, F.std(0), 1)
    yz = (y - y.mean()) / (y.std() or 1)
    rel = np.abs(Fz.T @ yz) / len(y)
    rel = rel / (rel.max() or 1)
    with np.errstate(divide="ignore", invalid="ignore"):
        red = np.nan_to_num(np.abs(np.corrcoef(Fz.T)))
    sel = [int(np.argmax(rel))]
    while len(sel) < k:
        score = alpha * rel - (1 - alpha) * red[:, sel].mean(1)
        score[sel] = -np.inf
        sel.append(int(np.argmax(score)))
    x = np.zeros(F.shape[1], dtype=int)
    x[sel] = 1
    return x
