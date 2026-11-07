"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createInitialState, hydrateState, type LearnerState, type ModuleKey } from "./state";
import { checkAchievements } from "./engine/achievements";
import { trackTime } from "./engine/actions";
import { mergeStates } from "./engine/merge";
import { getSupabase, supabaseConfigured } from "./supabase/client";
import { pullState, pushState } from "./sync/client";

/* =========================================================
   Store client : état local persistant + synchronisation
   ========================================================= */

const storageKey = (userId?: string | null) => `eq:v1:${userId ?? "guest"}`;
const MAX_CONVERSATIONS = 100;

export type SyncStatus = "local" | "syncing" | "synced" | "error" | "offline";

export interface Toast {
  id: number;
  kind: "xp" | "badge" | "info" | "error";
  text: string;
}

type Mutator = (draft: LearnerState, now: number) => number | void;

interface StoreValue {
  state: LearnerState | null;
  ready: boolean;
  act: (fn: Mutator, opts?: { silent?: boolean }) => number;
  user: User | null;
  session: Session | null;
  authReady: boolean;
  syncStatus: SyncStatus;
  syncError?: string;
  syncNow: () => Promise<void>;
  signOut: () => Promise<void>;
  resetLocal: () => void;
  replaceState: (s: LearnerState) => void;
  toasts: Toast[];
  notify: (text: string, kind?: Toast["kind"]) => void;
  dismiss: (id: number) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function readLocal(key: string): LearnerState | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? hydrateState(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeLocal(key: string, s: LearnerState) {
  try {
    window.localStorage.setItem(key, JSON.stringify(s));
  } catch {
    /* stockage plein ou indisponible : la session continue en mémoire */
  }
}

export function applyTheme(theme: "dark" | "light") {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem("eq:theme", theme);
  } catch {
    /* ignore */
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LearnerState | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabaseConfigured);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(supabaseConfigured ? "offline" : "local");
  const [syncError, setSyncError] = useState<string>();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const stateRef = useRef<LearnerState | null>(null);
  const keyRef = useRef(storageKey(null));
  const userRef = useRef<User | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastId = useRef(0);

  const notify = useCallback((text: string, kind: Toast["kind"] = "info") => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "badge" ? 5000 : 2600);
  }, []);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const persist = useCallback((s: LearnerState) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => writeLocal(keyRef.current, s), 250);
  }, []);

  const push = useCallback(async () => {
    const sb = getSupabase();
    const u = userRef.current;
    const s = stateRef.current;
    if (!sb || !u || !s) return;
    const startedAt = Date.now();
    setSyncStatus("syncing");
    try {
      await pushState(sb, u.id, s, s.sync.lastPushAt ?? 0);
      const next = { ...stateRef.current!, sync: { ...stateRef.current!.sync, lastPushAt: startedAt } };
      stateRef.current = next;
      setState(next);
      writeLocal(keyRef.current, next);
      setSyncStatus("synced");
      setSyncError(undefined);
    } catch (e) {
      setSyncStatus("error");
      setSyncError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const schedulePush = useCallback(() => {
    if (!userRef.current) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => void push(), 2500);
  }, [push]);

  const commit = useCallback(
    (next: LearnerState) => {
      stateRef.current = next;
      setState(next);
      persist(next);
      schedulePush();
    },
    [persist, schedulePush],
  );

  const act = useCallback(
    (fn: Mutator, opts?: { silent?: boolean }) => {
      const current = stateRef.current;
      if (!current) return 0;
      const now = Date.now();
      const draft = structuredClone(current);
      const gained = fn(draft, now) || 0;
      draft.updatedAt = now;
      if (draft.conversations.length > MAX_CONVERSATIONS) draft.conversations.splice(0, draft.conversations.length - MAX_CONVERSATIONS);
      const badges = checkAchievements(draft, now);
      commit(draft);
      if (!opts?.silent && gained > 0) notify(`+${gained} XP`, "xp");
      for (const b of badges) notify(`Badge débloqué : ${b.name}`, "badge");
      return gained;
    },
    [commit, notify],
  );

  /* ---------- Chargement initial ---------- */
  const loadFor = useCallback(
    async (u: User | null) => {
      userRef.current = u;
      keyRef.current = storageKey(u?.id);
      let local = readLocal(keyRef.current);
      if (u && !local) {
        // Première connexion sur cet appareil : on reprend la progression invité.
        local = readLocal(storageKey(null));
      }
      let s = local ?? createInitialState(Date.now(), (u?.user_metadata?.display_name as string) || "Apprenant");
      stateRef.current = s;
      setState(s);
      applyTheme(s.settings.theme);
      const sb = getSupabase();
      if (u && sb) {
        setSyncStatus("syncing");
        try {
          const remote = await pullState(sb, u.id);
          if (remote) s = mergeStates(stateRef.current ?? s, remote);
          s = { ...s, sync: { ...s.sync, lastPullAt: Date.now() } };
          stateRef.current = s;
          setState(s);
          writeLocal(keyRef.current, s);
          await pushState(sb, u.id, s, 0);
          const done = { ...stateRef.current!, sync: { ...stateRef.current!.sync, lastPushAt: Date.now() } };
          stateRef.current = done;
          setState(done);
          writeLocal(keyRef.current, done);
          setSyncStatus("synced");
          setSyncError(undefined);
        } catch (e) {
          setSyncStatus("error");
          setSyncError(e instanceof Error ? e.message : String(e));
        }
      } else {
        setSyncStatus(supabaseConfigured ? "offline" : "local");
      }
    },
    [],
  );

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      void loadFor(null);
      return;
    }
    let active = true;
    sb.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setAuthReady(true);
      void loadFor(data.session?.user ?? null);
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      const nu = sess?.user ?? null;
      setUser(nu);
      if ((event === "SIGNED_IN" || event === "SIGNED_OUT") && (nu?.id ?? null) !== (userRef.current?.id ?? null)) void loadFor(nu);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadFor]);

  // Sauvegarde immédiate à la fermeture de l'onglet.
  useEffect(() => {
    const flush = () => {
      if (stateRef.current) writeLocal(keyRef.current, stateRef.current);
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    if (stateRef.current) writeLocal(keyRef.current, stateRef.current);
    if (sb) await sb.auth.signOut();
  }, []);

  const resetLocal = useCallback(() => {
    const fresh = createInitialState(Date.now(), stateRef.current?.profile.displayName);
    commit(fresh);
    applyTheme(fresh.settings.theme);
  }, [commit]);

  const replaceState = useCallback((s: LearnerState) => commit(s), [commit]);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      ready: state !== null,
      act,
      user,
      session,
      authReady,
      syncStatus,
      syncError,
      syncNow: push,
      signOut,
      resetLocal,
      replaceState,
      toasts,
      notify,
      dismiss,
    }),
    [state, act, user, session, authReady, syncStatus, syncError, push, signOut, resetLocal, replaceState, toasts, notify, dismiss],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

/** Mesure le temps d'apprentissage actif (onglet visible + interaction < 60 s). */
export function useActiveTime(module: ModuleKey) {
  const { act, ready } = useStore();
  useEffect(() => {
    if (!ready) return;
    let lastInteraction = Date.now();
    const mark = () => (lastInteraction = Date.now());
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    const TICK = 15;
    const id = setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - lastInteraction < 60_000) {
        act((d, now) => trackTime(d, module, TICK, now), { silent: true });
      }
    }, TICK * 1000);
    return () => {
      clearInterval(id);
      events.forEach((e) => window.removeEventListener(e, mark));
    };
  }, [act, module, ready]);
}

/** Appel authentifié aux routes IA. */
export function useApi() {
  const { session } = useStore();
  return useCallback(
    async <T,>(path: string, body: unknown): Promise<T> => {
      const res = await fetch(path, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiError(data?.error ?? `Erreur ${res.status}`, res.status, data?.code);
      return data as T;
    },
    [session],
  );
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}
