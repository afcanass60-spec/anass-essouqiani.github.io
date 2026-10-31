"""QUBO utilities, classical simulated annealing and SIMULATED quantum annealing.

HONESTY NOTE
------------
``sqa_solve`` is *Simulated Quantum Annealing*: a classical path-integral Monte
Carlo (Suzuki-Trotter decomposition) emulation of a transverse-field Ising
annealer.  It runs on the CPU.  It is a "quantum-inspired" algorithm, not
quantum computing.  The same QUBO matrices can be submitted unchanged to a
real quantum annealer (D-Wave Leap, via ``dwave-ocean-sdk``) -- see
docs/ARCHITECTURE.md for when this could make sense (it does not for problems
of this size, which classical solvers handle exactly or near-optimally).

QUBO convention: minimise  E(x) = sum_i Q_ii x_i + sum_{i<j} Q_ij x_i x_j,  x in {0,1}^n,
with Q stored upper-triangular.
"""
from __future__ import annotations

import math

import numpy as np


def qubo_energy(Q: np.ndarray, x: np.ndarray) -> float:
    x = np.asarray(x, float)
    return float(x @ np.triu(Q) @ x)


def qubo_to_ising(Q: np.ndarray):
    """x = (1 + s) / 2 ; returns (h, J_sym, const) with E = h.s + 0.5 s.J_sym.s + const."""
    Q = np.triu(Q)
    n = len(Q)
    diag = np.diag(Q).copy()
    off = Q - np.diag(diag)
    J = off / 4.0
    h = diag / 2.0 + (off.sum(axis=1) + off.sum(axis=0)) / 4.0
    const = diag.sum() / 2.0 + off.sum() / 4.0
    J_sym = J + J.T
    return h, J_sym, const


def sa_solve(Q: np.ndarray, sweeps: int = 300, t0: float = 2.0, t1: float = 0.01, seed: int = 0, restarts: int = 4):
    """Classical simulated annealing (single spin-flip Metropolis on the Ising form)."""
    rng = np.random.default_rng(seed)
    h, J, const = qubo_to_ising(Q)
    scale = max(np.abs(h).max(initial=0), np.abs(J).max(initial=0), 1e-12)
    h, J = h / scale, J / scale
    n = len(h)
    best_s, best_e = None, np.inf
    for _ in range(restarts):
        s = rng.choice([-1.0, 1.0], size=n)
        field = h + J @ s
        for k in range(sweeps):
            T = t0 * (t1 / t0) ** (k / max(1, sweeps - 1))
            for i in rng.permutation(n):
                dE = -2.0 * s[i] * field[i]
                if dE <= 0 or rng.random() < math.exp(-dE / T):
                    s[i] = -s[i]
                    field += 2.0 * s[i] * J[:, i]
            e = h @ s + 0.5 * s @ J @ s
            if e < best_e:
                best_e, best_s = e, s.copy()
    x = ((best_s + 1) / 2).astype(int)
    return x, qubo_energy(Q, x)


def sqa_solve(Q: np.ndarray, sweeps: int = 300, trotter: int = 16, temperature: float = 0.05,
              gamma0: float = 3.0, gamma1: float = 1e-3, seed: int = 0):
    """Simulated quantum annealing (path-integral Monte Carlo, transverse-field schedule).

    P Trotter replicas of the spin system are coupled along the imaginary-time
    axis with J_perp = -(P T / 2) ln tanh(Gamma / (P T)).  Gamma decreases from
    gamma0 to gamma1; replicas progressively lock together into a low-energy
    classical state.  Checkerboard updates over replicas keep it vectorised.
    """
    rng = np.random.default_rng(seed)
    h, J, _ = qubo_to_ising(Q)
    scale = max(np.abs(h).max(initial=0), np.abs(J).max(initial=0), 1e-12)
    h, J = h / scale, J / scale
    n, P, T = len(h), trotter, temperature
    S = rng.choice([-1.0, 1.0], size=(P, n))
    best_s, best_e = None, np.inf
    even, odd = np.arange(0, P, 2), np.arange(1, P, 2)
    for k in range(sweeps):
        gamma = gamma0 * (gamma1 / gamma0) ** (k / max(1, sweeps - 1))
        jp = -0.5 * P * T * math.log(math.tanh(gamma / (P * T)))   # >= 0, grows as gamma -> 0
        for i in rng.permutation(n):
            for grp in (even, odd):
                s_i = S[grp, i]
                local = h[i] + S[grp] @ J[:, i]
                nb = S[(grp - 1) % P, i] + S[(grp + 1) % P, i]
                dE = -2.0 * s_i * local / P + 2.0 * jp * s_i * nb / P
                acc = (dE <= 0) | (rng.random(len(grp)) < np.exp(-np.clip(dE, 0, 50) / T))
                S[grp[acc], i] = -s_i[acc]
        E = S @ h + 0.5 * np.einsum("ki,ij,kj->k", S, J, S)
        kb = int(np.argmin(E))
        if E[kb] < best_e:
            best_e, best_s = E[kb], S[kb].copy()
    x = ((best_s + 1) / 2).astype(int)
    return x, qubo_energy(Q, x)


def brute_force(Q: np.ndarray):
    n = len(Q)
    best, be = None, np.inf
    for m in range(1 << n):
        x = np.array([(m >> i) & 1 for i in range(n)])
        e = qubo_energy(Q, x)
        if e < be:
            best, be = x, e
    return best, be


def one_hot_penalty(Q: np.ndarray, groups: list, weight: float) -> np.ndarray:
    """Add weight * (sum_{i in g} x_i - 1)^2 for each group (constant dropped)."""
    Q = np.triu(Q).copy()
    for g in groups:
        for a_i, i in enumerate(g):
            Q[i, i] -= weight
            for j in g[a_i + 1:]:
                Q[min(i, j), max(i, j)] += 2 * weight
    return Q
