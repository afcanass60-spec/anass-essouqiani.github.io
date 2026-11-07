import { LEVELS } from "@/lib/types";
import type { DayStats, LearnerState } from "@/lib/state";
import { MAX_ATTEMPTS, MAX_ERRORS } from "@/lib/state";

/* =========================================================
   Fusion de deux états (ex. progression invité + compte, ou
   deux appareils). Règles : union des journaux, version la
   plus récente pour les enregistrements, maximum pour les
   compteurs journaliers ; l'XP totale est recalculée à partir
   des journées pour éviter tout double comptage.
   ========================================================= */

function unionById<T extends { id: string }>(a: T[], b: T[], newer?: (x: T, y: T) => T): T[] {
  const m = new Map<string, T>();
  for (const x of a) m.set(x.id, x);
  for (const y of b) {
    const x = m.get(y.id);
    m.set(y.id, x && newer ? newer(x, y) : (x ?? y));
  }
  return [...m.values()];
}

function latestRecord<T extends { updatedAt: number }>(a: Record<string, T>, b: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = { ...a };
  for (const [k, v] of Object.entries(b)) if (!out[k] || v.updatedAt > out[k].updatedAt) out[k] = v;
  return out;
}

function mergeDay(a: DayStats, b: DayStats): DayStats {
  const out = { ...a } as DayStats;
  for (const key of Object.keys(b) as (keyof DayStats)[]) {
    if (key === "seconds") {
      const sec: DayStats["seconds"] = { ...a.seconds };
      for (const [m, v] of Object.entries(b.seconds)) sec[m as keyof DayStats["seconds"]] = Math.max(sec[m as keyof DayStats["seconds"]] ?? 0, v ?? 0);
      out.seconds = sec;
    } else {
      (out[key] as number) = Math.max((a[key] as number) ?? 0, (b[key] as number) ?? 0);
    }
  }
  return out;
}

export function mergeStates(local: LearnerState, remote: LearnerState): LearnerState {
  const days: Record<string, DayStats> = { ...local.days };
  for (const [k, v] of Object.entries(remote.days)) days[k] = days[k] ? mergeDay(days[k], v) : v;
  const xp = Object.values(days).reduce((sum, d) => sum + d.xp, 0);

  const progress = { ...local.progress };
  for (const [k, r] of Object.entries(remote.progress)) {
    const l = progress[k];
    if (!l) progress[k] = r;
    else
      progress[k] = {
        best: Math.max(l.best, r.best),
        tries: Math.max(l.tries, r.tries),
        completedAt: l.completedAt && r.completedAt ? Math.min(l.completedAt, r.completedAt) : (l.completedAt ?? r.completedAt),
        updatedAt: Math.max(l.updatedAt, r.updatedAt),
        data: { ...(l.data ?? {}), ...(r.data ?? {}) },
      };
  }

  const achievements = { ...remote.achievements };
  for (const [k, v] of Object.entries(local.achievements)) achievements[k] = achievements[k] ? Math.min(achievements[k], v) : v;

  const newerSettings = remote.updatedAt >= local.updatedAt ? remote : local;
  const levelOf = (s: LearnerState) => LEVELS.indexOf(s.profile.level);
  const streakSrc = (remote.streak.lastDay ?? "") >= (local.streak.lastDay ?? "") ? remote : local;

  return {
    ...local,
    createdAt: Math.min(local.createdAt, remote.createdAt),
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
    profile: {
      displayName: newerSettings.profile.displayName,
      placement: remote.profile.placement ?? local.profile.placement,
      level: levelOf(remote) >= levelOf(local) ? remote.profile.level : local.profile.level,
      validations: { ...local.profile.validations, ...remote.profile.validations },
    },
    settings: newerSettings.settings,
    xp,
    streak: { ...streakSrc.streak, best: Math.max(local.streak.best, remote.streak.best) },
    days,
    attempts: unionById(local.attempts, remote.attempts)
      .sort((a, b) => a.ts - b.ts)
      .slice(-MAX_ATTEMPTS),
    itemXp: { ...remote.itemXp, ...local.itemXp },
    cards: latestRecord(local.cards, remote.cards),
    revision: latestRecord(local.revision, remote.revision),
    errors: unionById(local.errors, remote.errors)
      .sort((a, b) => a.ts - b.ts)
      .slice(-MAX_ERRORS),
    progress,
    speaking: unionById(local.speaking, remote.speaking).sort((a, b) => a.ts - b.ts),
    writing: unionById(local.writing, remote.writing, (x, y) => (y.feedback && !x.feedback ? y : x)).sort((a, b) => a.ts - b.ts),
    conversations: unionById(local.conversations, remote.conversations, (x, y) => (y.updatedAt > x.updatedAt ? y : x)).sort(
      (a, b) => a.startedAt - b.startedAt,
    ),
    exams: unionById(local.exams, remote.exams).sort((a, b) => a.finishedAt - b.finishedAt),
    achievements,
    quests: { ...remote.quests, ...local.quests },
    sync: local.sync,
  };
}
