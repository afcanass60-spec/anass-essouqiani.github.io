import type { Difficulty } from "@/lib/types";
import type { Settings } from "@/lib/state";

/* =========================================================
   XP et niveaux de joueur
   L'XP récompense des réussites (premières bonnes réponses,
   révisions dues réussies, validations), pas le temps passé.
   ========================================================= */

export const XP = {
  itemFirstCorrect: { easy: 8, medium: 12, hard: 16, default: 10 } as Record<Difficulty | "default", number>,
  itemReviewCorrect: 4,
  wordLearned: 5,
  wordReviewDue: 3,
  lessonComplete: 40,
  bossFirstWin: 150,
  bossRetake: 30,
  levelValidated: 300,
  examComplete: 100,
  writingSubmitted: 10,
  writingEvaluatedBonus: 20,
  speakingTask: 12,
  conversationMessage: 3,
  conversationDailyCap: 60,
  questDaily: 25,
  questWeekly: 120,
};

/** XP cumulée nécessaire pour atteindre un niveau de joueur. */
export const xpForLevel = (level: number) => (100 * (level - 1) * level) / 2;

export function playerLevel(xp: number) {
  const level = Math.floor((Math.sqrt(1 + (8 * Math.max(0, xp)) / 100) - 1) / 2) + 1;
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, current, next, progress: (xp - current) / (next - current) };
}

export const PLAYER_TITLES = [
  { min: 1, title: "Novice Explorer" },
  { min: 5, title: "Wordsmith Apprentice" },
  { min: 10, title: "Grammar Squire" },
  { min: 15, title: "Fluent Ranger" },
  { min: 20, title: "Eloquent Knight" },
  { min: 30, title: "Master of Nuance" },
  { min: 40, title: "Summit Sage" },
];

export const titleFor = (level: number) => [...PLAYER_TITLES].reverse().find((t) => level >= t.min)!.title;

export function dailyGoal(settings: Pick<Settings, "mode">) {
  return settings.mode === "light" ? 60 : settings.mode === "intensive" ? 220 : 120;
}

/** Seuil d'activité réelle pour qu'une journée compte dans la série. */
export const STREAK_MIN_XP = 20;
