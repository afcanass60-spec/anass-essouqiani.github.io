import type { Cefr, Correction, Item, Skill } from "@/lib/types";
import {
  type Attempt,
  type Card,
  type DayStats,
  type ErrorEntry,
  type LearnerState,
  type ModuleKey,
  type Source,
  MAX_ATTEMPTS,
  MAX_ERRORS,
  dayKey,
  emptyDay,
  uid,
} from "@/lib/state";
import { DAY, newSrs, review, scheduleItem } from "./srs";
import { STREAK_MIN_XP, XP } from "./xp";

/* =========================================================
   Mutations de l'état. Toutes opèrent sur un brouillon
   (copie) fourni par le store et retournent l'XP gagnée.
   ========================================================= */

export function today(s: LearnerState, now: number): DayStats {
  const k = dayKey(now);
  if (!s.days[k]) s.days[k] = emptyDay(now);
  s.days[k].updatedAt = now;
  return s.days[k];
}

export function addXp(s: LearnerState, amount: number, now: number): number {
  if (amount <= 0) return 0;
  s.xp += amount;
  const d = today(s, now);
  d.xp += amount;
  if (d.xp >= STREAK_MIN_XP) touchStreak(s, now);
  return amount;
}

export function touchStreak(s: LearnerState, now: number) {
  const k = dayKey(now);
  if (s.streak.lastDay === k) return;
  const yesterday = dayKey(now - DAY);
  s.streak.current = s.streak.lastDay === yesterday ? s.streak.current + 1 : 1;
  s.streak.best = Math.max(s.streak.best, s.streak.current);
  s.streak.lastDay = k;
}

/** Série affichée : 0 si aucune activité hier ni aujourd'hui. */
export function currentStreak(s: LearnerState, now: number): number {
  const k = dayKey(now);
  const y = dayKey(now - DAY);
  return s.streak.lastDay === k || s.streak.lastDay === y ? s.streak.current : 0;
}

export function logError(s: LearnerState, e: Omit<ErrorEntry, "id" | "ts">, now: number) {
  s.errors.push({ ...e, id: uid(), ts: now });
  if (s.errors.length > MAX_ERRORS) s.errors.splice(0, s.errors.length - MAX_ERRORS);
}

/**
 * Enregistre une réponse à un item auto-corrigé :
 * tentative, XP (si méritée), file de révision, historique d'erreurs.
 */
export function recordAttempt(
  s: LearnerState,
  item: Pick<Item, "id" | "skill" | "level" | "topic" | "objective" | "difficulty"> & { explanation?: string },
  correct: boolean,
  source: Source,
  now: number,
  detail?: { response?: string; expected?: string },
): number {
  const attempt: Attempt = {
    id: uid(),
    itemId: item.id,
    skill: item.skill,
    level: item.level,
    topic: item.topic,
    objective: item.objective,
    correct,
    source,
    ts: now,
  };
  s.attempts.push(attempt);
  if (s.attempts.length > MAX_ATTEMPTS) s.attempts.splice(0, s.attempts.length - MAX_ATTEMPTS);

  const d = today(s, now);
  d.attempts += 1;
  if (correct) d.correct += 1;
  if (correct && item.skill === "grammar") d.grammarCorrect += 1;

  const prevRev = s.revision[item.id];
  const wasDue = prevRev ? prevRev.due <= now : false;
  if (source !== "placement") {
    const next = scheduleItem(prevRev, correct, now);
    if (next) s.revision[item.id] = { ...next, updatedAt: now };
    else delete s.revision[item.id];
  }
  if (source === "review") d.reviewsDone += 1;

  let gained = 0;
  if (correct && source !== "placement") {
    if (!s.itemXp[item.id]) {
      s.itemXp[item.id] = now;
      gained = addXp(s, XP.itemFirstCorrect[item.difficulty ?? "default"], now);
    } else if (wasDue) {
      gained = addXp(s, XP.itemReviewCorrect, now);
    }
  }

  if (!correct && source !== "placement") {
    logError(
      s,
      {
        skill: item.skill,
        topic: item.topic,
        itemId: item.id,
        original: detail?.response,
        corrected: detail?.expected,
        explanation: item.explanation,
        source,
      },
      now,
    );
  }
  return gained;
}

/* ---------- Vocabulaire ---------- */

export function ensureCard(s: LearnerState, wordId: string, now: number, custom?: Card["custom"]): Card {
  if (!s.cards[wordId]) {
    s.cards[wordId] = {
      wordId,
      ...newSrs(now),
      addedAt: now,
      updatedAt: now,
      recognition: { seen: 0, correct: 0 },
      recall: { seen: 0, correct: 0 },
      context: { seen: 0, correct: 0 },
      use: { seen: 0, correct: 0 },
      custom,
    };
  }
  return s.cards[wordId];
}

export type VocabQuestion = "recognition" | "recall" | "context";

/**
 * Réponse à une question de vocabulaire.
 * `graded` : la réponse compte pour l'algorithme de répétition espacée
 * (une seule fois par carte et par séance).
 */
export function recordVocab(
  s: LearnerState,
  wordId: string,
  kind: VocabQuestion,
  correct: boolean,
  now: number,
  graded: boolean,
): number {
  const card = ensureCard(s, wordId, now);
  card[kind].seen += 1;
  if (correct) card[kind].correct += 1;
  card.updatedAt = now;
  if (!graded) return 0;

  const wasDue = card.reps > 0 && card.due <= now;
  const firstLearn = !card.learnedAt && correct && (kind === "recall" || kind === "context");
  // Qualité : rappel / contexte réussis = 4 ; reconnaissance réussie = 3 ; échec = 1.
  const quality = correct ? (kind === "recognition" ? 3 : 4) : 1;
  Object.assign(card, review(card, quality, now));

  const d = today(s, now);
  let gained = 0;
  if (firstLearn) {
    card.learnedAt = now;
    d.wordsLearned += 1;
    gained += addXp(s, XP.wordLearned, now);
  } else if (wasDue) {
    d.wordsReviewed += 1;
    if (correct) gained += addXp(s, XP.wordReviewDue, now);
  }
  if (!correct) logError(s, { skill: "vocabulary", itemId: `word:${wordId}`, source: "vocab" }, now);
  return gained;
}

export function recordWordUse(s: LearnerState, wordId: string, correct: boolean, now: number) {
  const card = ensureCard(s, wordId, now);
  card.use.seen += 1;
  if (correct) card.use.correct += 1;
  card.updatedAt = now;
}

/* ---------- Progression ---------- */

export function recordProgress(
  s: LearnerState,
  key: string,
  score: number,
  now: number,
  complete: boolean,
  data?: Record<string, number | string | boolean>,
) {
  const p = s.progress[key] ?? { best: 0, tries: 0, updatedAt: now };
  p.tries += 1;
  p.best = Math.max(p.best, score);
  p.updatedAt = now;
  if (complete && !p.completedAt) p.completedAt = now;
  if (data) p.data = { ...(p.data ?? {}), ...data };
  s.progress[key] = p;
  return p;
}

export function trackTime(s: LearnerState, module: ModuleKey, seconds: number, now: number) {
  const d = today(s, now);
  d.seconds[module] = (d.seconds[module] ?? 0) + seconds;
}

/** Corrections issues de l'IA (conversation, écrit, oral) → historique d'erreurs. */
export function recordCorrections(
  s: LearnerState,
  corrections: Correction[],
  skill: Skill,
  source: ErrorEntry["source"],
  now: number,
) {
  for (const c of corrections) {
    logError(s, { skill, topic: c.topic, original: c.original, corrected: c.corrected, explanation: c.explanationFr, source }, now);
  }
}

export function validateLevel(s: LearnerState, level: Cefr, next: Cefr | undefined, source: "exam" | "placement", productiveVerified: boolean, now: number) {
  if (!s.profile.validations[level]) {
    s.profile.validations[level] = { ts: now, source, productiveVerified };
    if (source === "exam") addXp(s, XP.levelValidated, now);
  } else if (productiveVerified) {
    s.profile.validations[level]!.productiveVerified = true;
  }
  if (next) {
    const order = ["B1", "B1+", "B2", "B2+", "C1"];
    if (order.indexOf(next) > order.indexOf(s.profile.level)) s.profile.level = next;
  }
}
