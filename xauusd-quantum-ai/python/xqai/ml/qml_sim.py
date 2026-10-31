"""SIMULATED variational quantum classifier (VQC).

HONESTY NOTE: this is a classical numpy state-vector simulation of a small
parameterised quantum circuit.  No quantum hardware is used.  It exists to
measure -- under the same out-of-sample protocol as the classical models --
whether a quantum-ML model class brings anything on this problem.  With 4
qubits the model is a smooth, low-capacity function; on tabular financial data
it is not expected to beat logistic regression.  The same circuit could be run
on real hardware (IBM Quantum via Qiskit, IonQ/Rigetti via Amazon Braket), but
this would add latency, shot noise and cost, and cannot be called from MQL5 in
the Strategy Tester.  It is therefore research-only and never exported.

Circuit (data re-uploading): for each layer l
    RY(x_q) on every qubit q   (x = PCA-reduced features scaled to [0, pi])
    RY(theta_lq) RZ(phi_lq) on every qubit
    CNOT ring q -> (q+1) mod n
Output p(y=1) = (1 - <Z_0>) / 2.  Trained with the parameter-shift rule + Adam.
"""
from __future__ import annotations

import numpy as np
from sklearn.decomposition import PCA
from sklearn.preprocessing import MinMaxScaler, StandardScaler


def _ry(state, q, ang, nq):
    c, s = np.cos(ang / 2), np.sin(ang / 2)
    st = np.moveaxis(state, q + 1, 1)
    a0, a1 = st[:, 0].copy(), st[:, 1].copy()
    shape = (-1,) + (1,) * (nq - 1)
    c, s = np.reshape(c, shape) if np.ndim(c) else c, np.reshape(s, shape) if np.ndim(s) else s
    st[:, 0] = c * a0 - s * a1
    st[:, 1] = s * a0 + c * a1
    return np.moveaxis(st, 1, q + 1)


def _rz(state, q, ang, nq):
    st = np.moveaxis(state, q + 1, 1)
    st[:, 0] *= np.exp(-0.5j * ang)
    st[:, 1] *= np.exp(0.5j * ang)
    return np.moveaxis(st, 1, q + 1)


def _cnot(state, c, t):
    st = state.copy()
    idx = [slice(None)] * state.ndim
    idx[c + 1] = 1
    idx = tuple(idx)
    ax = t + 1 if t < c else t          # target axis once the control axis is sliced away
    st[idx] = np.flip(st[idx], axis=ax)
    return st


class VQCClassifier:
    def __init__(self, n_qubits: int = 4, layers: int = 2, epochs: int = 40, lr: float = 0.05, seed: int = 0):
        self.nq, self.layers, self.epochs, self.lr, self.seed = n_qubits, layers, epochs, lr, seed

    def _prep(self, F, fit=False):
        if fit:
            self.sc = StandardScaler().fit(F)
            self.pca = PCA(n_components=self.nq, random_state=self.seed).fit(self.sc.transform(F))
            self.mm = MinMaxScaler((0, np.pi)).fit(self.pca.transform(self.sc.transform(F)))
        Z = self.mm.transform(self.pca.transform(self.sc.transform(F)))
        return np.clip(Z, 0, np.pi)

    def _expect(self, Z, theta):
        N, nq = len(Z), self.nq
        state = np.zeros((N,) + (2,) * nq, dtype=complex)
        state[(slice(None),) + (0,) * nq] = 1.0
        for l in range(self.layers):
            for q in range(nq):
                state = _ry(state, q, Z[:, q], nq)
            for q in range(nq):
                state = _ry(state, q, theta[l, q, 0], nq)
                state = _rz(state, q, theta[l, q, 1], nq)
            for q in range(nq):                       # ring of CNOTs (entangles the read-out qubit)
                state = _cnot(state, q, (q + 1) % nq)
        prob = np.abs(state) ** 2
        p0 = prob[(slice(None), 0)].reshape(N, -1).sum(axis=1)
        return 2 * p0 - 1  # <Z_0>

    def fit(self, F, y):
        rng = np.random.default_rng(self.seed)
        Z = self._prep(F, fit=True)
        y = np.asarray(y, float)
        th = rng.normal(0, 0.3, size=(self.layers, self.nq, 2))
        m = np.zeros_like(th); v = np.zeros_like(th)
        for ep in range(1, self.epochs + 1):
            E = self._expect(Z, th)
            p = np.clip((1 - E) / 2, 1e-6, 1 - 1e-6)
            dL_dE = -0.5 * (p - y) / (p * (1 - p))
            g = np.zeros_like(th)
            for idx in np.ndindex(th.shape):
                tp, tm = th.copy(), th.copy()
                tp[idx] += np.pi / 2
                tm[idx] -= np.pi / 2
                dE = (self._expect(Z, tp) - self._expect(Z, tm)) / 2
                g[idx] = np.mean(dL_dE * dE)
            m = 0.9 * m + 0.1 * g
            v = 0.999 * v + 0.001 * g ** 2
            th -= self.lr * (m / (1 - 0.9 ** ep)) / (np.sqrt(v / (1 - 0.999 ** ep)) + 1e-8)
        self.theta = th
        return self

    def predict_proba(self, F):
        p = (1 - self._expect(self._prep(F), self.theta)) / 2
        return np.column_stack([1 - p, p])
