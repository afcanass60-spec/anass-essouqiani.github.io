import { LEVELS, type Cefr, type Objective, type Skill } from "@/lib/types";
import type { Attempt, LearnerState } from "@/lib/state";
import { grammarTopics, levelIndex, objectives, vocabulary } from "@/content";
import { isMature } from "./srs";

/* =========================================================
   Analyse des performances : compétences, objectifs, lacunes
   ========================================================= */

const recent = <T>(arr: T[], n: number) => arr.slice(Math.max(0, arr.length - n));
const acc = (a: Attempt[]) => (a.length ? a.filter((x) => x.correct).length / a.length : 0);

export interface SkillEstimate {
  skill: Skill;
  /** Niveau estimé à partir des résultats récents, ou null si données insuffisantes. */
  level: Cefr | "A2" | null;
  /** Score 0..100 (précision pondérée par la difficulté du niveau). */
  score: number;
  attempts: number;
  source: "practice" | "placement" | "none";
}

/** Notes /5 issues des productions évaluées par l'IA (écrit, oral). */
function productiveRatings(s: LearnerState, skill: "speaking" | "writing") {
  if (skill === "writing") {
    return s.writing
      .filter((w) => w.feedback)
      .map((w) => {
        const sc = w.feedback!.scores;
        return { level: w.level, rating: (sc.task + sc.organisation + sc.vocabulary + sc.grammar + sc.register) / 5 };
      });
  }
  return s.speaking
    .map((a) => {
      if (a.feedback) {
        const sc = a.feedback.scores;
        return { level: a.level, rating: (sc.fluency + sc.accuracy + sc.range + sc.coherence) / 4 };
      }
      if (typeof a.accuracy === "number") return { level: a.level, rating: a.accuracy * 5 };
      return null;
    })
    .filter((x): x is { level: Cefr; rating: number } => !!x);
}

export function estimateSkill(s: LearnerState, skill: Skill): SkillEstimate {
  let perLevel: { level: Cefr; acc: number; n: number }[] = [];
  let total = 0;
  if (skill === "speaking" || skill === "writing") {
    const r = productiveRatings(s, skill);
    total = r.length;
    perLevel = LEVELS.map((level) => {
      const items = recent(r.filter((x) => x.level === level), 6);
      return { level, acc: items.length ? items.reduce((a, b) => a + b.rating, 0) / items.length / 5 : 0, n: items.length };
    });
  } else {
    const relevant = s.attempts.filter((a) => a.skill === skill && a.source !== "placement");
    total = relevant.length;
    perLevel = LEVELS.map((level) => {
      const items = recent(relevant.filter((a) => a.level === level), 30);
      return { level, acc: acc(items), n: items.length };
    });
  }

  const minN = skill === "speaking" || skill === "writing" ? 2 : 6;
  const threshold = skill === "speaking" || skill === "writing" ? 0.6 : 0.7;
  let level: Cefr | "A2" | null = null;
  for (const p of perLevel) {
    if (p.n < minN) continue;
    if (p.acc >= threshold) level = p.level;
    else if (level === null) level = levelIndex(p.level) === 0 ? "A2" : LEVELS[levelIndex(p.level) - 1];
  }

  const weighted = perLevel.filter((p) => p.n > 0);
  const score = weighted.length
    ? Math.round(
        (weighted.reduce((sum, p) => sum + p.acc * (levelIndex(p.level) + 1) * p.n, 0) /
          weighted.reduce((sum, p) => sum + 5 * p.n, 0)) *
          100,
      )
    : 0;

  if (level === null && s.profile.placement?.skills[skill]) {
    return { skill, level: s.profile.placement.skills[skill]!, score, attempts: total, source: "placement" };
  }
  return { skill, level, score, attempts: total, source: level ? "practice" : "none" };
}

export function allSkillEstimates(s: LearnerState): Record<Skill, SkillEstimate> {
  const out = {} as Record<Skill, SkillEstimate>;
  (["listening", "speaking", "reading", "writing", "grammar", "vocabulary"] as Skill[]).forEach((k) => (out[k] = estimateSkill(s, k)));
  return out;
}

/** Niveau global estimé : moyenne arrondie à l'inférieur des compétences connues. */
export function overallLevel(est: Record<Skill, SkillEstimate>): Cefr | "A2" | null {
  const known = Object.values(est)
    .map((e) => e.level)
    .filter((l): l is Cefr | "A2" => !!l);
  if (!known.length) return null;
  const idx = known.map((l) => (l === "A2" ? -1 : levelIndex(l)));
  const mean = Math.floor(idx.reduce((a, b) => a + b, 0) / idx.length);
  return mean < 0 ? "A2" : LEVELS[mean];
}

/* ---------- Référentiel d'objectifs ---------- */

export type ObjectiveStatus = "mastered" | "in-progress" | "not-started";

export interface ObjectiveProgress {
  objective: Objective;
  status: ObjectiveStatus;
  accuracy: number;
  evidence: number;
}

export function objectiveProgress(s: LearnerState, o: Objective): ObjectiveProgress {
  if (o.skill === "vocabulary") {
    const words = vocabulary.filter((w) => w.level === o.level);
    const cards = words.map((w) => s.cards[w.id]).filter(Boolean);
    const mature = cards.filter((c) => isMature(c) || (c.interval >= 7 && c.context.correct > 0)).length;
    const ratio = words.length ? mature / words.length : 0;
    return {
      objective: o,
      status: ratio >= 0.8 ? "mastered" : cards.length ? "in-progress" : "not-started",
      accuracy: ratio,
      evidence: cards.length,
    };
  }
  if (o.skill === "speaking" || o.skill === "writing") {
    const ratings = productiveRatings(s, o.skill).filter((r) => r.level === o.level);
    const avg = ratings.length ? ratings.reduce((a, b) => a + b.rating, 0) / ratings.length / 5 : 0;
    const status: ObjectiveStatus = ratings.length >= 2 && avg >= 0.6 ? "mastered" : ratings.length ? "in-progress" : "not-started";
    return { objective: o, status, accuracy: avg, evidence: ratings.length };
  }
  const items = recent(
    s.attempts.filter((a) => a.objective === o.id && a.source !== "placement"),
    12,
  );
  const a = acc(items);
  const status: ObjectiveStatus = items.length >= 6 && a >= 0.8 ? "mastered" : items.length ? "in-progress" : "not-started";
  return { objective: o, status, accuracy: a, evidence: items.length };
}

export function levelObjectives(s: LearnerState, level: Cefr) {
  return objectives.filter((o) => o.level === level).map((o) => objectiveProgress(s, o));
}

/** Avancement vers C1 : niveaux validés + part des objectifs maîtrisés du niveau en cours. */
export function progressToC1(s: LearnerState): number {
  let validated = 0;
  for (const l of LEVELS) if (s.profile.validations[l]) validated += 1;
  if (validated >= LEVELS.length) return 100;
  const current = LEVELS[validated];
  const obj = levelObjectives(s, current);
  const frac = obj.length ? obj.filter((o) => o.status === "mastered").length / obj.length : 0;
  return Math.round(((validated + frac) / LEVELS.length) * 100);
}

/* ---------- Lacunes (personnalisation) ---------- */

export interface Weakness {
  topic: string;
  title: string;
  level: Cefr;
  accuracy: number;
  attempts: number;
  aiErrors: number;
  status: "weak" | "improving" | "resolved";
}

/**
 * Détecte les sujets de grammaire fragiles :
 * - « weak » : précision < 70 % sur les 10 dernières tentatives (≥ 4) ou erreurs IA récurrentes
 * - « improving » : était faible mais les dernières tentatives remontent
 * - « resolved » : 5 dernières tentatives ≥ 80 % après une période faible
 */
export function weaknesses(s: LearnerState, now = Date.now()): Weakness[] {
  const out: Weakness[] = [];
  const monthAgo = now - 30 * 24 * 3600_000;
  for (const t of grammarTopics) {
    const att = s.attempts.filter((a) => a.topic === t.id && a.source !== "placement");
    const aiErrors = s.errors.filter(
      (e) => e.topic === t.id && e.ts > monthAgo && (e.source === "conversation" || e.source === "writing" || e.source === "speaking"),
    ).length;
    if (att.length < 4 && aiErrors < 2) continue;
    const last10 = recent(att, 10);
    const last5 = recent(att, 5);
    const a10 = acc(last10);
    const a5 = acc(last5);
    const everWeak = att.length >= 8 ? acc(att.slice(0, att.length - 5)) < 0.7 : false;
    let status: Weakness["status"] | null = null;
    if (a10 < 0.7 || aiErrors >= 3) status = a5 >= 0.8 && last5.length === 5 ? "improving" : "weak";
    else if (everWeak && a5 >= 0.8) status = "resolved";
    if (status) out.push({ topic: t.id, title: t.titleFr, level: t.level, accuracy: a10, attempts: att.length, aiErrors, status });
  }
  return out.sort((a, b) => a.accuracy - b.accuracy);
}
