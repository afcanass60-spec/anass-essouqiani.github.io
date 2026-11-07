"use client";

import { useEffect, useState } from "react";

export interface AiStatus {
  loading: boolean;
  configured: boolean;
  provider: string | null;
  model: string | null;
  requiresAuth: boolean;
}

let cache: Omit<AiStatus, "loading"> | null = null;
let pending: Promise<Omit<AiStatus, "loading">> | null = null;

function fetchStatus() {
  if (!pending)
    pending = fetch("/api/ai/status")
      .then((r) => r.json())
      .then((d) => (cache = { configured: !!d.configured, provider: d.provider, model: d.model, requiresAuth: !!d.requiresAuth }))
      .catch(() => (cache = { configured: false, provider: null, model: null, requiresAuth: false }));
  return pending;
}

/** État réel de la connexion IA côté serveur (aucune simulation). */
export function useAiStatus(): AiStatus {
  const [s, setS] = useState<Omit<AiStatus, "loading"> | null>(cache);
  useEffect(() => {
    if (!cache) fetchStatus().then(setS);
  }, []);
  return s ? { ...s, loading: false } : { loading: true, configured: false, provider: null, model: null, requiresAuth: false };
}
