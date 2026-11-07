/* =========================================================
   Répétition espacée (algorithme SM-2 adapté)
   - qualité 0..5 ; < 3 = échec → la carte revient le lendemain
   - les échecs pendant une séance sont réinjectés dans la file
   ========================================================= */

export const DAY = 24 * 60 * 60 * 1000;

export interface SrsState {
  ease: number;
  interval: number; // en jours
  reps: number;
  lapses: number;
  due: number; // timestamp
  lastReview?: number;
}

export const newSrs = (now: number): SrsState => ({ ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now });

export function review(s: SrsState, quality: number, now: number): SrsState {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  let { ease, interval, reps, lapses } = s;
  if (q < 3) {
    reps = 0;
    interval = 1;
    lapses += 1;
  } else {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 3;
    else interval = Math.round(interval * ease);
    reps += 1;
  }
  ease = Math.max(1.3, ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  // Les échéances sont alignées sur le début de journée locale + 4 h pour
  // qu'une carte « à revoir demain » soit disponible dès le matin.
  const due = startOfDay(now + interval * DAY) + 4 * 60 * 60 * 1000;
  return { ease: Math.round(ease * 100) / 100, interval, reps, lapses, due, lastReview: now };
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const isDue = (s: SrsState, now: number) => s.due <= now;

/** Une carte est considérée « retenue » au-delà de 21 jours d'intervalle. */
export const isMature = (s: SrsState) => s.interval >= 21;

/* ---------- Révision des items (exercices ratés) ---------- */

export interface RevisionState {
  due: number;
  interval: number;
  streak: number;
}

/** Programme la révision d'un item après une réponse. Retourne null si l'item est acquis. */
export function scheduleItem(prev: RevisionState | undefined, correct: boolean, now: number): RevisionState | null {
  if (!correct) return { due: startOfDay(now + DAY) + 4 * 3600_000, interval: 1, streak: 0 };
  if (!prev) return null; // réussi du premier coup et jamais raté : pas de révision
  const streak = prev.streak + 1;
  if (streak >= 3) return null; // réussi 3 fois d'affilée en révision : acquis
  const interval = Math.min(30, Math.max(2, Math.round(prev.interval * 2.5)));
  return { due: startOfDay(now + interval * DAY) + 4 * 3600_000, interval, streak };
}
