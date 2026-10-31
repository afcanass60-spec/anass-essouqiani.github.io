import sys
import time
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from xqai.bridge.protocol import N_FEATURES  # noqa: E402
from xqai.bridge.server import BridgeServer  # noqa: E402
from xqai.ml.dataset import purged_walk_forward  # noqa: E402
from xqai.ml.models import NativeModel, export_native, make_model  # noqa: E402
from xqai.optim.annealing import brute_force, qubo_energy, qubo_to_ising, sa_solve, sqa_solve  # noqa: E402
from xqai.optim.optimizers import OPTIMISERS, FactorizationMachine, Space  # noqa: E402
from xqai.validation import deflated_sharpe, monte_carlo, pbo_cscv  # noqa: E402


@pytest.fixture(scope="module")
def xy():
    rng = np.random.default_rng(0)
    F = rng.normal(size=(800, N_FEATURES))
    y = (F[:, 0] - F[:, 3] + 0.5 * rng.normal(size=800) > 0).astype(int)
    return F, y


@pytest.mark.parametrize("name", ["LOGREG", "MLP"])
def test_native_export_matches_sklearn(tmp_path, xy, name):
    F, y = xy
    m = make_model(name).fit(F, y)
    p = tmp_path / "m.txt"
    export_native(m, p, 0.55)
    nm = NativeModel(p)
    assert np.allclose(nm.predict_proba(F[:50]), m.predict_proba(F[:50])[:, 1], atol=1e-7)
    assert nm.threshold == pytest.approx(0.55)


def test_purged_splits_no_overlap():
    t = np.arange(1000) * 300
    exits = t + 3000
    for tr, te in purged_walk_forward(t, exits, n_folds=4, embargo_sec=600):
        assert exits[tr].max() < t[te].min()


def test_qubo_solvers_find_optimum():
    rng = np.random.default_rng(3)
    for k in range(3):
        Q = np.triu(rng.normal(size=(10, 10)))
        _, eb = brute_force(Q)
        assert sqa_solve(Q, sweeps=150, seed=k)[1] == pytest.approx(eb)
        assert sa_solve(Q, sweeps=150, seed=k)[1] == pytest.approx(eb)


def test_ising_conversion():
    rng = np.random.default_rng(4)
    Q = np.triu(rng.normal(size=(7, 7)))
    h, J, c = qubo_to_ising(Q)
    for _ in range(10):
        x = rng.integers(0, 2, 7)
        s = 2 * x - 1
        assert qubo_energy(Q, x) == pytest.approx(h @ s + 0.5 * s @ J @ s + c)


def test_factorization_machine_learns_quadratic():
    rng = np.random.default_rng(5)
    X = rng.integers(0, 2, size=(300, 12)).astype(float)
    y = X[:, 0] * X[:, 1] - X[:, 2] + 0.5 * X[:, 3]
    fm = FactorizationMachine(12, k=4).fit(X, y, epochs=1500, lr=0.03)
    assert np.corrcoef(fm.predict(X), y)[0, 1] > 0.95


@pytest.mark.parametrize("name", list(OPTIMISERS))
def test_optimisers_improve_on_toy(name):
    sp = Space()
    target = np.array([s // 2 for s in sp.sizes])

    def obj(params):
        idx = np.array([vals.index(params[n]) for n, vals in sp.spec])
        return -float(np.sum((idx - target) ** 2))
    best, v = OPTIMISERS[name](obj, 25, 0)
    assert v >= -20


def test_monte_carlo_and_stats():
    r = np.concatenate([np.full(60, 2.0), np.full(40, -1.0)])
    mc = monte_carlo(r, 0.5, n_paths=500)
    assert mc["median_return_pct"] > 0 and 0 <= mc["prob_loss"] <= 1
    mc_bad = monte_carlo(-np.abs(r), 0.5, n_paths=200)
    assert mc_bad["prob_loss"] == 1.0
    rng = np.random.default_rng(0)
    assert 0 <= deflated_sharpe(rng.normal(0.001, 0.01, 500), 50, 0.001) <= 1
    perf = rng.normal(0, 0.01, size=(400, 20))
    pbo = pbo_cscv(perf)
    assert 0 <= pbo["pbo"] <= 1 and pbo["n_combinations"] == 70


def test_bridge_roundtrip(tmp_path, xy):
    F, y = xy
    m = make_model("LOGREG").fit(F, y)
    export_native(m, tmp_path / "m.txt", 0.55)
    srv = BridgeServer(tmp_path / "bridge", NativeModel(tmp_path / "m.txt"), "test")
    req = tmp_path / "bridge" / "req_7.csv"
    req.write_text("7,%d,XAUUSD,TREND_PULLBACK,1," % time.time() + ",".join(f"{v:.6f}" for v in F[0]))
    srv.poll_once()
    seq, prob, mid, status = (tmp_path / "bridge" / "resp_7.csv").read_text().strip().split(",")
    assert status == "OK" and abs(float(prob) - m.predict_proba(F[:1])[0, 1]) < 1e-4
    assert (tmp_path / "bridge" / "heartbeat.txt").exists()
    bad = tmp_path / "bridge" / "req_8.csv"
    bad.write_text("8,0,XAUUSD,X,1,1,2,3")
    srv.poll_once()
    assert (tmp_path / "bridge" / "resp_8.csv").read_text().strip().endswith("REJECT")
