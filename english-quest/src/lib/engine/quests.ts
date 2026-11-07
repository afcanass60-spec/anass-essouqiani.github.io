import type { DayStats, LearnerState } from "@/lib/state";
import { dayKey } from "@/lib/state";
import { DAY } from "./srs";
import { XP, dailyGoal } from "./xp";

/* =========================================================
   Quêtes quotidiennes et hebdomadaires
   La progression est calculée à partir de l'activité réelle
   (statistiques du jour / de la semaine).
   ========================================================= */

export interface QuestDef {
  id: string;
  title: string;
  icon: string;
  href: string;
  target: (s: LearnerState) => number;
  value: (d: DayStats, s: LearnerState) => number;
}

const modeScale = (s: LearnerState, light: number, normal: number, intensive: number) =>
  s.settings.mode === "light" ? light : s.settings.mode === "intensive" ? intensive : normal;

export const DAILY_POOL: QuestDef[] = [
  { id: "learn-words", title: "Apprendre de nouveaux mots", icon: "book", href: "/vocabulary", target: (s) => modeScale(s, 8, 15, 25), value: (d) => d.wordsLearned },
  { id: "grammar-correct", title: "Réussir des exercices de grammaire", icon: "pen", href: "/grammar", target: (s) => modeScale(s, 6, 12, 20), value: (d) => d.grammarCorrect },
  { id: "listening", title: "Terminer une écoute", icon: "headphones", href: "/listening", target: () => 1, value: (d) => d.listeningDone },
  { id: "reading", title: "Lire un article", icon: "library", href: "/reading", target: () => 1, value: (d) => d.readingDone },
  { id: "speak", title: "Parler anglais (minutes)", icon: "mic", href: "/speaking", target: (s) => modeScale(s, 3, 5, 10), value: (d) => Math.floor(d.speakingSeconds / 60) },
  { id: "review-words", title: "Réviser des mots dus", icon: "repeat", href: "/vocabulary?tab=review", target: (s) => modeScale(s, 8, 15, 30), value: (d) => d.wordsReviewed },
  { id: "converse", title: "Échanger avec un personnage IA", icon: "chat", href: "/conversation", target: (s) => modeScale(s, 4, 8, 15), value: (d) => d.conversationMessages },
  { id: "xp-goal", title: "Atteindre l'objectif d'XP du jour", icon: "bolt", href: "/session", target: (s) => dailyGoal(s.settings), value: (d) => d.xp },
];

/** Petite fonction de hachage déterministe. */
export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 3 quêtes du jour : l'objectif d'XP + 2 quêtes tirées selon la date. */
export function dailyQuests(now: number): QuestDef[] {
  const k = dayKey(now);
  const pool = DAILY_POOL.filter((q) => q.id !== "xp-goal");
  const h = hash(k);
  const a = pool[h % pool.length];
  const rest = pool.filter((q) => q !== a);
  const b = rest[(h >>> 8) % rest.length];
  return [a, b, DAILY_POOL.find((q) => q.id === "xp-goal")!];
}

export function weekStart(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // lundi = 0
  return d.getTime() - dow * DAY;
}

export function weekDays(s: LearnerState, now: number): DayStats[] {
  const start = weekStart(now);
  const out: DayStats[] = [];
  for (let i = 0; i < 7; i++) {
    const d = s.days[dayKey(start + i * DAY)];
    if (d) out.push(d);
  }
  return out;
}

export interface WeeklyDef {
  id: string;
  title: string;
  icon: string;
  href: string;
  target: number;
  value: (week: DayStats[], s: LearnerState) => number;
}

export const WEEKLY: WeeklyDef[] = [
  { id: "w-lessons", title: "Terminer 3 leçons du parcours", icon: "map", href: "/map", target: 3, value: (w) => w.reduce((a, d) => a + d.lessonsDone, 0) },
  { id: "w-active-days", title: "Être actif 5 jours cette semaine", icon: "flame", href: "/session", target: 5, value: (w) => w.filter((d) => d.xp >= 20).length },
  { id: "w-writing", title: "Rédiger 2 textes au Writing Workshop", icon: "pen", href: "/writing", target: 2, value: (w) => w.reduce((a, d) => a + d.writingDone, 0) },
  { id: "w-boss", title: "Vaincre un boss ou passer un examen", icon: "sword", href: "/map", target: 1, value: (w) => w.reduce((a, d) => a + d.bossesWon + d.examsDone, 0) },
];

export interface QuestStatus {
  key: string;
  id: string;
  title: string;
  icon: string;
  href: string;
  value: number;
  target: number;
  done: boolean;
  claimed: boolean;
  reward: number;
}

export function dailyQuestStatus(s: LearnerState, now: number): QuestStatus[] {
  const d = s.days[dayKey(now)];
  return dailyQuests(now).map((q) => {
    const target = q.target(s);
    const value = d ? q.value(d, s) : 0;
    const key = `d:${dayKey(now)}:${q.id}`;
    return { key, id: q.id, title: q.title, icon: q.icon, href: q.href, value: Math.min(value, target), target, done: value >= target, claimed: !!s.quests[key], reward: XP.questDaily };
  });
}

export function weeklyQuestStatus(s: LearnerState, now: number): QuestStatus[] {
  const w = weekDays(s, now);
  const wk = dayKey(weekStart(now));
  return WEEKLY.map((q) => {
    const value = q.value(w, s);
    const key = `w:${wk}:${q.id}`;
    return { key, id: q.id, title: q.title, icon: q.icon, href: q.href, value: Math.min(value, q.target), target: q.target, done: value >= q.target, claimed: !!s.quests[key], reward: XP.questWeekly };
  });
}
