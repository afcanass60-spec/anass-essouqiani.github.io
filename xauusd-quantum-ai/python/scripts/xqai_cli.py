#!/usr/bin/env python3
"""XQAI research command line.

  python scripts/xqai_cli.py synth      --out ../data/synthetic --days 400
  python scripts/xqai_cli.py backtest   --data ../data/broker --config ../configs/python_config.json
  python scripts/xqai_cli.py train      --data ../data/broker --out ../models
  python scripts/xqai_cli.py walkforward --data ../data/broker --optimiser bayes --budget 40
  python scripts/xqai_cli.py optimisers --data ../data/broker --budget 30 --seeds 3
  python scripts/xqai_cli.py featsel    --data ../data/broker
  python scripts/xqai_cli.py bandit     --data ../data/broker
  python scripts/xqai_cli.py regimes    --data ../data/broker
  python scripts/xqai_cli.py stress     --data ../data/broker
  python scripts/xqai_cli.py parity     --data ../data/broker --ea-dump XQAI_features_dump.csv

Every command writes a JSON report into --reports (default ../reports).
Use --synthetic instead of --data to exercise the pipeline without real data
(results on synthetic data are meaningless for trading decisions).
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from xqai.backtester import run_backtest  # noqa: E402
from xqai.config import STRATEGIES, Config  # noqa: E402
from xqai.data import load_dataset, synthetic_dataset  # noqa: E402
from xqai.features import build_features  # noqa: E402
from xqai.metrics import breakdown, compute_metrics, format_metrics, monthly_table  # noqa: E402
from xqai.news import load_calendar  # noqa: E402
from xqai.signals import evaluate  # noqa: E402


def _json_default(o):
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating,)):
        return float(o)
    if isinstance(o, np.ndarray):
        return o.tolist()
    if isinstance(o, (set,)):
        return sorted(o)
    return str(o)


def save_report(args, name: str, payload: dict):
    d = Path(args.reports)
    d.mkdir(parents=True, exist_ok=True)
    payload = {"command": name, "created": time.strftime("%Y-%m-%d %H:%M:%S"),
               "data": "SYNTHETIC (pipeline test only - not evidence of anything)" if args.synthetic else args.data,
               **payload}
    p = d / f"{name}.json"
    p.write_text(json.dumps(payload, indent=2, default=_json_default))
    print(f"report -> {p}")


def load(args):
    cfg = Config.load(args.config) if args.config else Config()
    if args.balance:
        cfg = cfg.replace(initial_balance=args.balance)
    if args.synthetic:
        data = synthetic_dataset(days=args.days, seed=args.seed)
    else:
        data = load_dataset(args.data, cfg.symbol)
    cal = load_calendar(cfg.news_csv) if cfg.news_csv else None
    t = time.time()
    X = build_features(data, cfg)
    print(f"features: {X.shape[0]} rows in {time.time() - t:.1f}s, valid={X['valid'].mean():.1%}")
    return cfg, data, X, cal


def load_model_arg(args, cfg):
    if cfg.ai_mode == "NATIVE" and cfg.ai_model_path:
        from xqai.ml.models import NativeModel
        return NativeModel(cfg.ai_model_path)
    return None


# ------------------------------------------------------------------ commands
def cmd_synth(args):
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    data = synthetic_dataset(days=args.days, seed=args.seed)
    for tf, df in data.items():
        df.to_csv(out / f"XAUUSD_{tf}.csv", index=False)
    print(f"synthetic dataset written to {out} ({len(data['M1'])} M1 bars)")


def cmd_backtest(args):
    cfg, data, X, cal = load(args)
    model = load_model_arg(args, cfg)
    res = run_backtest(data, cfg, X, evaluate(X, cfg), model=model, calendar=cal, record_decisions=True)
    m = compute_metrics(res.trades, res.equity, cfg.initial_balance)
    print(format_metrics(m))
    for n in res.notes:
        print("NOTE:", n)
    from xqai.validation import run_baseline
    base = {}
    for kind in ("ema_cross", "random"):
        b = run_baseline(data, X, cfg, kind=kind, calendar=cal)
        base[kind] = compute_metrics(b.trades, b.equity, cfg.initial_balance)
        print(f"baseline {kind}: trades={base[kind]['trades']} PF={base[kind]['profit_factor']:.2f} "
              f"expR={base[kind]['expectancy_r']:.3f} DD={base[kind]['max_drawdown_pct']:.2f}%")
    out = Path(args.reports)
    out.mkdir(parents=True, exist_ok=True)
    res.trades.to_csv(out / "backtest_trades.csv", index=False)
    res.equity.to_csv(out / "backtest_equity.csv", index=False)
    if not res.decisions.empty:
        res.decisions.to_csv(out / "backtest_decisions.csv", index=False)
    save_report(args, "backtest", {
        "config": cfg.to_dict(), "metrics": m, "baselines": base, "notes": res.notes, "halted": res.halted,
        "by_strategy": breakdown(res.trades, "strategy").to_dict(), "by_session": breakdown(res.trades, "session").to_dict(),
        "by_regime": breakdown(res.trades, "regime").to_dict(),
        "monthly_pct": {str(k.date()): v for k, v in monthly_table(res.equity).items()},
        "decision_counts": res.decisions["decision"].value_counts().to_dict() if not res.decisions.empty else {}})


def cmd_train(args):
    from xqai.ml.dataset import build_meta_dataset
    from xqai.ml.models import export_native, make_model, walk_forward_eval
    cfg, data, X, _ = load(args)
    ev = evaluate(X, cfg)
    F, y, meta = build_meta_dataset(data, X, ev, cfg)
    print(f"meta-label samples: {len(y)} positives={y.mean():.1%} mean R={meta['r'].mean():.3f}")
    names = ["LOGREG", "MLP", "HGB"] + (["QML_SIM"] if args.with_qml else [])
    reports, _ = walk_forward_eval(F, y, meta["r"].to_numpy(), meta, names=names, threshold=args.threshold)
    rows = []
    for r in reports:
        keep = r.keep(alpha=args.alpha)
        rows.append({**r.__dict__, "keep": keep})
        print(f"{r.name:<9} AUC={r.auc:.3f} brier={r.brier:.4f} taken={r.n_taken}/{r.n_oos} "
              f"meanR all={r.mean_r_all:+.3f} taken={r.mean_r_taken:+.3f} p={r.p_value:.3f} keep={keep}")
    kept = [r for r in reports if r.keep(alpha=args.alpha) and r.name in ("LOGREG", "MLP")]
    exported = None
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    if kept or args.force_export:
        best = max(kept, key=lambda r: r.mean_r_taken) if kept else max(
            [r for r in reports if r.name in ("LOGREG", "MLP")], key=lambda r: r.auc)
        mdl = make_model(best.name, args.seed).fit(F, y)     # final fit on all data (deployment)
        exported = str(out / "xqai_model.txt")
        export_native(mdl, exported, args.threshold)
        print(f"exported {best.name} -> {exported}" + ("" if kept else "  (FORCED: not statistically validated!)"))
    else:
        print("no model passed the out-of-sample significance test: run the EA with AI mode OFF")
    hgb = [r for r in reports if r.name == "HGB"]
    if hgb and hgb[0].keep(alpha=args.alpha):
        import joblib
        joblib.dump(make_model("HGB", args.seed).fit(F, y), out / "hgb.joblib")
        print(f"HGB validated -> {out / 'hgb.joblib'} (usable through the Python bridge)")
    save_report(args, "train", {"samples": len(y), "models": rows, "exported": exported,
                                "by_strategy": meta.groupby("strategy")["r"].agg(["count", "mean"]).to_dict()})


def cmd_walkforward(args):
    from xqai.optim.optimizers import OPTIMISERS
    from xqai.validation import monte_carlo, walk_forward
    cfg, data, X, _ = load(args)
    cfg = cfg.replace(max_drawdown_percent=0)   # research: measure the edge, the EA keeps its hard halt
    wf = walk_forward(data, X, cfg, OPTIMISERS[args.optimiser], is_days=args.is_days, oos_days=args.oos_days,
                      budget=args.budget, seed=args.seed)
    tr = wf["oos_trades"]
    print(f"windows={len(wf['windows'])} OOS trades={len(tr)} WF efficiency={wf['wf_efficiency']:.2f}")
    for w in wf["windows"]:
        print(f"  {pd.Timestamp(w.is_end, unit='s').date()} IS={w.is_obj:+.2f} OOS={w.oos_obj:+.2f} "
              f"trades={w.oos_metrics['trades']} PF={w.oos_metrics['profit_factor']:.2f}")
    mc = monte_carlo(tr["r"].to_numpy(), cfg.risk_percent, ruin_dd_pct=cfg.max_drawdown_percent or 5) if len(tr) else {}
    save_report(args, f"walkforward_{args.optimiser}", {
        "optimiser": args.optimiser, "wf_efficiency": wf["wf_efficiency"],
        "oos_expectancy_r": float(tr["r"].mean()) if len(tr) else None, "oos_trades": len(tr),
        "windows": [{**w.__dict__} for w in wf["windows"]], "monte_carlo": mc})


def cmd_optimisers(args):
    """Equal-budget comparison of optimisers, judged on the OUT-OF-SAMPLE part."""
    from xqai.metrics import compute_metrics as cm
    from xqai.optim.optimizers import OPTIMISERS
    from xqai.validation import robust_objective
    cfg, data, X, _ = load(args)
    cfg = cfg.replace(max_drawdown_percent=0)
    tv = X.loc[X["valid"], "T"]
    split = int(tv.quantile(0.7))

    def make_obj(lo, hi):
        def obj(params):
            c2 = cfg.replace(**params)
            r = run_backtest(data, c2, X, evaluate(X, c2), start_time=lo, end_time=hi)
            return robust_objective(cm(r.trades, r.equity, c2.initial_balance))
        return obj

    is_obj, oos_obj = make_obj(None, split), make_obj(split, None)
    rows = []
    for name, opt in OPTIMISERS.items():
        for s in range(args.seeds):
            t = time.time()
            best, v = opt(is_obj, args.budget, s)
            o = oos_obj(best)
            rows.append({"optimiser": name, "seed": s, "is": v, "oos": o, "seconds": time.time() - t})
            print(f"{name:<10} seed={s} IS={v:+.3f} OOS={o:+.3f} ({time.time() - t:.0f}s)")
    df = pd.DataFrame(rows)
    summ = df.groupby("optimiser")[["is", "oos", "seconds"]].agg(["mean", "std"])
    print(summ)
    save_report(args, "optimisers", {"budget": args.budget, "runs": rows,
                                     "summary": {"_".join(k): v for k, v in summ.round(4).to_dict().items()}})


def cmd_featsel(args):
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import roc_auc_score
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    from xqai.ml.dataset import build_meta_dataset
    from xqai.optim.annealing import sa_solve, sqa_solve
    from xqai.optim.optimizers import feature_selection_qubo, greedy_mrmr
    cfg, data, X, _ = load(args)
    F, y, meta = build_meta_dataset(data, X, evaluate(X, cfg), cfg)
    order = np.argsort(meta["time"].to_numpy())
    cut = int(0.7 * len(order))
    tr, te = order[:cut], order[cut:]
    res = {}
    sels = {"all": np.ones(F.shape[1], dtype=int), "greedy_mrmr": greedy_mrmr(F[tr], y[tr], args.k)}
    Q = feature_selection_qubo(F[tr], y[tr], args.k)
    sels["qubo_sa"] = sa_solve(Q, sweeps=400, seed=args.seed)[0]
    sels["qubo_sqa_simulated"] = sqa_solve(Q, sweeps=400, seed=args.seed)[0]
    for name, x in sels.items():
        cols = np.where(x == 1)[0]
        if len(cols) == 0 or len(np.unique(y[tr])) < 2:
            continue
        m = make_pipeline(StandardScaler(), LogisticRegression(C=0.1, max_iter=2000)).fit(F[tr][:, cols], y[tr])
        auc = roc_auc_score(y[te], m.predict_proba(F[te][:, cols])[:, 1]) if len(np.unique(y[te])) > 1 else 0.5
        res[name] = {"n": int(len(cols)), "oos_auc": float(auc), "features": cols.tolist()}
        print(f"{name:<20} n={len(cols):2d} OOS AUC={auc:.3f}")
    save_report(args, "feature_selection", res)


def cmd_bandit(args):
    from xqai.config import DEFAULT_REGIME_MATRIX
    from xqai.ml.bandit import matrix_filter, replay
    from xqai.ml.dataset import build_meta_dataset
    cfg, data, X, _ = load(args)
    cfg_all = cfg.replace(regime_matrix="TU:PB,BO,SW,RV,MO,MR|TD:PB,BO,SW,RV,MO,MR|SQ:PB,BO,SW,RV,MO,MR|"
                                        "RG:PB,BO,SW,RV,MO,MR|TR:PB,BO,SW,RV,MO,MR|VO:")
    F, y, meta = build_meta_dataset(data, X, evaluate(X, cfg_all), cfg_all, score_floor=cfg.min_score)
    split = int(meta["time"].quantile(0.6))
    out = replay(meta, split, seed=args.seed)
    oos = meta["time"].to_numpy() >= split
    dm = matrix_filter(meta, DEFAULT_REGIME_MATRIX) & oos
    out["oos_default_matrix_n"] = int(dm.sum())
    out["oos_default_matrix_mean_r"] = float(meta["r"].to_numpy()[dm].mean()) if dm.any() else 0.0
    out.pop("gate")
    for k, v in out.items():
        print(f"{k:<28} {v}")
    save_report(args, "bandit", out)


def cmd_regimes(args):
    from xqai.ml.dataset import build_meta_dataset
    from xqai.ml.regime_cluster import compare_regimes
    cfg, data, X, _ = load(args)
    F, y, meta = build_meta_dataset(data, X, evaluate(X, cfg), cfg)
    split = int(meta["time"].quantile(0.6))
    r = compare_regimes(X, meta, split, seed=args.seed)
    r.pop("gmm"); r.pop("scaler")
    print(r)
    save_report(args, "regimes", r)


def cmd_stress(args):
    """Robustness: spreads x1.5/x2, +slippage, commission, parameter jitter."""
    cfg, data, X, cal = load(args)
    cfg = cfg.replace(max_drawdown_percent=0)
    scen = {"nominal": {}, "spread_x1.5": {"spread_multiplier": 1.5}, "spread_x2": {"spread_multiplier": 2.0},
            "slippage_x3": {"slippage_points": cfg.slippage_points * 3},
            "commission_7rt": {"commission_per_lot_side": 3.5},
            "min_score+5": {"min_score": cfg.min_score + 5}, "min_score-5": {"min_score": cfg.min_score - 5},
            "sl_buffer_0.5": {"sl_buffer_atr": 0.5}, "no_partial": {"use_partial": False},
            "no_trailing": {"use_trailing": False}}
    out = {}
    for name, kw in scen.items():
        c2 = cfg.replace(**kw)
        r = run_backtest(data, c2, X, evaluate(X, c2), calendar=cal, record_decisions=True)
        m = compute_metrics(r.trades, r.equity, c2.initial_balance)
        m["top_refusals"] = (r.decisions["decision"].value_counts().head(6).to_dict() if not r.decisions.empty else {})
        out[name] = m
        print(f"{name:<16} trades={m['trades']:4d} PF={m['profit_factor']:.2f} expR={m['expectancy_r']:+.3f} "
              f"DD={m['max_drawdown_pct']:.2f}% ret={m['return_pct']:+.2f}%")
        if m["trades"] == 0:
            print("    no trade - main refusal reasons:", m["top_refusals"])
    save_report(args, "stress", out)


def cmd_parity(args):
    """Compare features dumped by the EA (InpDumpFeatures=true) with Python's."""
    from xqai.ml.dataset import build_meta_dataset  # noqa: F401
    from xqai.signals import ai_features
    cfg, data, X, _ = load(args)
    ev = evaluate(X, cfg)
    dump = pd.read_csv(args.ea_dump)
    errs = []
    for _, row in dump.iterrows():
        T = int(row["time"])
        k = np.searchsorted(X["T"].to_numpy(), T)
        if k >= len(X) or X["T"].iat[k] != T:
            continue
        s, d = row["strategy"], int(row["dir"])
        from xqai.signals import subset_ev
        f_py = ai_features(X.iloc[[k]], subset_ev(ev, np.array([k])), s, d, cfg.point)[0]
        f_ea = row[[f"f{j}" for j in range(40)]].to_numpy(float)
        errs.append(np.abs(f_py - f_ea))
    if not errs:
        print("no matching timestamps between EA dump and Python data")
        return
    E = np.array(errs)
    worst = np.argsort(-E.max(0))[:10]
    print(f"rows compared: {len(E)}  max abs diff: {E.max():.3g}  mean: {E.mean():.3g}")
    for j in worst:
        print(f"  f{j:<3} max={E[:, j].max():.4g} mean={E[:, j].mean():.4g}")
    save_report(args, "parity", {"rows": len(E), "max_abs": float(E.max()),
                                 "per_feature_max": E.max(0).tolist()})


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", choices=["synth", "backtest", "train", "walkforward", "optimisers", "featsel",
                                        "bandit", "regimes", "stress", "parity"])
    ap.add_argument("--data", default="../data/broker")
    ap.add_argument("--synthetic", action="store_true")
    ap.add_argument("--days", type=int, default=400)
    ap.add_argument("--config", default=None)
    ap.add_argument("--balance", type=float, default=None)
    ap.add_argument("--reports", default="../reports")
    ap.add_argument("--out", default="../models")
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--seeds", type=int, default=3)
    ap.add_argument("--budget", type=int, default=30)
    ap.add_argument("--optimiser", default="bayes", choices=["random", "annealing", "bayes", "fmqa_sqa", "fmqa_sa"])
    ap.add_argument("--is-days", type=int, default=180)
    ap.add_argument("--oos-days", type=int, default=60)
    ap.add_argument("--threshold", type=float, default=0.55)
    ap.add_argument("--alpha", type=float, default=0.05)
    ap.add_argument("--with-qml", action="store_true")
    ap.add_argument("--force-export", action="store_true")
    ap.add_argument("--k", type=int, default=15)
    ap.add_argument("--ea-dump", default="XQAI_features_dump.csv")
    args = ap.parse_args()
    {"synth": cmd_synth, "backtest": cmd_backtest, "train": cmd_train, "walkforward": cmd_walkforward,
     "optimisers": cmd_optimisers, "featsel": cmd_featsel, "bandit": cmd_bandit, "regimes": cmd_regimes,
     "stress": cmd_stress, "parity": cmd_parity}[args.command](args)


if __name__ == "__main__":
    main()
