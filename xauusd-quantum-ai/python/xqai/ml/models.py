"""Signal-quality models, out-of-sample evaluation and export to the EA.

Candidates compared under the same purged walk-forward protocol:
  * BASELINE  - no filter (take every rule signal above the score threshold)
  * LOGREG    - L2 logistic regression                (exportable to MQL5)
  * MLP       - small feed-forward neural network      (exportable to MQL5)
  * HGB       - histogram gradient boosting            (Python bridge only)
  * QML_SIM   - simulated variational quantum classifier (research only, see qml_sim.py)

A model is *kept* only if, out of sample, it improves the mean R of taken
trades versus BASELINE with a bootstrap p-value < alpha AND keeps enough trades.
Otherwise the EA runs without AI (or with the rule engine only).
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, roc_auc_score
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from ..config import FEATURE_SPEC_VERSION
from .dataset import purged_walk_forward

ACT = {"identity": 0, "relu": 1, "logistic": 2, "tanh": 3}


def make_model(name: str, seed: int = 0):
    if name == "LOGREG":
        return make_pipeline(StandardScaler(), LogisticRegression(C=0.1, max_iter=2000))
    if name == "MLP":
        return make_pipeline(StandardScaler(), MLPClassifier(hidden_layer_sizes=(16, 8), alpha=1e-2,
                                                             early_stopping=True, max_iter=500, random_state=seed))
    if name == "HGB":
        return HistGradientBoostingClassifier(max_depth=3, learning_rate=0.05, max_iter=200,
                                              l2_regularization=1.0, random_state=seed)
    if name == "QML_SIM":
        from .qml_sim import VQCClassifier
        return VQCClassifier(n_qubits=4, layers=2, seed=seed)
    raise ValueError(name)


def bootstrap_pvalue(r_all: np.ndarray, taken: np.ndarray, n_boot: int = 2000, seed: int = 0) -> float:
    """H0: filtered mean R <= unfiltered mean R. Paired bootstrap over OOS samples."""
    rng = np.random.default_rng(seed)
    n = len(r_all)
    if taken.sum() < 5:
        return 1.0
    count = 0
    for _ in range(n_boot):
        idx = rng.integers(0, n, n)
        ra, tk = r_all[idx], taken[idx]
        if tk.sum() == 0:
            count += 1
            continue
        if ra[tk].mean() - ra.mean() <= 0:
            count += 1
    return count / n_boot


@dataclass
class EvalReport:
    name: str
    auc: float
    brier: float
    n_oos: int
    n_taken: int
    mean_r_all: float
    mean_r_taken: float
    p_value: float
    threshold: float

    def keep(self, alpha: float = 0.05, min_frac: float = 0.1) -> bool:
        return (self.name != "BASELINE" and self.p_value < alpha and self.mean_r_taken > self.mean_r_all
                and self.n_taken >= max(30, min_frac * self.n_oos) and self.mean_r_taken > 0)


def walk_forward_eval(F, y, r, meta, names=("LOGREG", "MLP", "HGB"), threshold: float = 0.55, n_folds: int = 5,
                      seed: int = 0):
    times, exits = meta["time"].to_numpy(), meta["exit_time"].to_numpy()
    preds = {nm: np.full(len(y), np.nan) for nm in names}
    for tr, te in purged_walk_forward(times, exits, n_folds=n_folds):
        if len(np.unique(y[tr])) < 2 or len(tr) < 50:
            continue
        for nm in names:
            mdl = make_model(nm, seed)
            mdl.fit(F[tr], y[tr])
            preds[nm][te] = mdl.predict_proba(F[te])[:, 1]
    oos = ~np.isnan(preds[names[0]])
    reports = [EvalReport("BASELINE", 0.5, float("nan"), int(oos.sum()), int(oos.sum()),
                          float(r[oos].mean()) if oos.any() else 0.0, float(r[oos].mean()) if oos.any() else 0.0,
                          1.0, 0.0)]
    for nm in names:
        p = preds[nm][oos]
        yy, rr = y[oos], r[oos]
        taken = p >= threshold
        auc = roc_auc_score(yy, p) if len(np.unique(yy)) > 1 else 0.5
        reports.append(EvalReport(nm, float(auc), float(brier_score_loss(yy, p)), int(oos.sum()), int(taken.sum()),
                                  float(rr.mean()), float(rr[taken].mean()) if taken.any() else 0.0,
                                  bootstrap_pvalue(rr, taken, seed=seed), threshold))
    return reports, preds


# --------------------------------------------------------------------------------------------
# Native export: the EA evaluates the network itself (works in the Strategy Tester and offline)
# --------------------------------------------------------------------------------------------
def export_native(pipe, path: str | Path, threshold: float, n_features: int = 40) -> None:
    scaler = pipe.named_steps["standardscaler"]
    est = pipe.steps[-1][1]
    layers = []
    if isinstance(est, LogisticRegression):
        layers.append((est.coef_.T, est.intercept_, "logistic"))
    elif isinstance(est, MLPClassifier):
        nl = len(est.coefs_)
        for k, (W, b) in enumerate(zip(est.coefs_, est.intercepts_)):
            layers.append((W, b, est.out_activation_ if k == nl - 1 else est.activation))
    else:
        raise TypeError("only LOGREG / MLP pipelines can be exported natively (use the Python bridge for others)")
    scale = np.where(scaler.scale_ > 0, scaler.scale_, 1.0)
    lines = [f"XQAI_MODEL,{FEATURE_SPEC_VERSION},{n_features},{len(layers)},{threshold:.6f}",
             ",".join(f"{v:.10g}" for v in scaler.mean_),
             ",".join(f"{v:.10g}" for v in scale)]
    for W, b, act in layers:
        lines.append(f"{W.shape[0]},{W.shape[1]},{ACT[act]}")
        lines.append(",".join(f"{v:.10g}" for v in np.asarray(W).ravel(order="C")))
        lines.append(",".join(f"{v:.10g}" for v in np.asarray(b).ravel()))
    Path(path).write_text("\n".join(lines) + "\n")


class NativeModel:
    """Python implementation of the exact inference performed by Include/AIModel.mqh."""

    def __init__(self, path: str | Path):
        tok = Path(path).read_text().replace("\n", ",").split(",")
        tok = [t for t in tok if t != ""]
        if tok[0] != "XQAI_MODEL":
            raise ValueError("not an XQAI model file")
        self.spec, self.nf, nl = int(tok[1]), int(tok[2]), int(tok[3])
        self.threshold = float(tok[4])
        if self.spec != FEATURE_SPEC_VERSION:
            raise ValueError(f"feature spec {self.spec} != {FEATURE_SPEC_VERSION}")
        p = 5
        self.mean = np.array(tok[p:p + self.nf], float); p += self.nf
        self.scale = np.array(tok[p:p + self.nf], float); p += self.nf
        self.layers = []
        for _ in range(nl):
            ni, no, act = int(tok[p]), int(tok[p + 1]), int(tok[p + 2]); p += 3
            W = np.array(tok[p:p + ni * no], float).reshape(ni, no); p += ni * no
            b = np.array(tok[p:p + no], float); p += no
            self.layers.append((W, b, act))

    def predict_proba(self, F: np.ndarray) -> np.ndarray:
        a = (np.atleast_2d(F) - self.mean) / self.scale
        for W, b, act in self.layers:
            a = a @ W + b
            if act == 1:
                a = np.maximum(a, 0)
            elif act == 2:
                a = 1.0 / (1.0 + np.exp(-a))
            elif act == 3:
                a = np.tanh(a)
        return a[:, 0]


class SklearnProba:
    """Adapter giving any fitted sklearn classifier the 1-D predict_proba used by the backtester."""

    def __init__(self, model):
        self.model = model

    def predict_proba(self, F):
        return self.model.predict_proba(F)[:, 1]
