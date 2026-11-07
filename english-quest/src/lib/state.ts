import type {
  Cefr,
  ChatMessage,
  ConversationMode,
  ConversationReport,
  PersonaId,
  Skill,
  SpeakingFeedback,
  WritingFeedback,
} from "./types";
import type { RevisionState, SrsState } from "./engine/srs";

/* =========================================================
   État de l'apprenant (local-first, synchronisé si Supabase)
   ========================================================= */

export const STATE_VERSION = 1;

export type Source =
  | "lesson"
  | "grammar"
  | "listening"
  | "reading"
  | "boss"
  | "exam"
  | "level-exam"
  | "review"
  | "placement"
  | "vocab";

export interface Attempt {
  id: string;
  itemId: string;
  skill: Skill;
  level: Cefr;
  topic?: string;
  objective?: string;
  correct: boolean;
  source: Source;
  ts: number;
}

export interface CardCounters {
  seen: number;
  correct: number;
}

export interface CustomWord {
  word: string;
  defEn: string;
  fr?: string;
  example?: string;
  ipa?: string;
}

export interface Card extends SrsState {
  wordId: string;
  addedAt: number;
  updatedAt: number;
  learnedAt?: number;
  recognition: CardCounters;
  recall: CardCounters;
  context: CardCounters;
  /** Utilisation productive validée (phrase personnelle corrigée par l'IA). */
  use: CardCounters;
  custom?: CustomWord;
}

export interface ErrorEntry {
  id: string;
  ts: number;
  skill: Skill;
  topic?: string;
  itemId?: string;
  original?: string;
  corrected?: string;
  explanation?: string;
  source: Source | "conversation" | "writing" | "speaking";
}

export type ModuleKey =
  | "vocabulary"
  | "grammar"
  | "listening"
  | "speaking"
  | "conversation"
  | "reading"
  | "writing"
  | "exam"
  | "lesson"
  | "review";

export interface DayStats {
  xp: number;
  seconds: Partial<Record<ModuleKey, number>>;
  wordsLearned: number;
  wordsReviewed: number;
  grammarCorrect: number;
  attempts: number;
  correct: number;
  listeningDone: number;
  readingDone: number;
  speakingSeconds: number;
  speakingTasks: number;
  conversationMessages: number;
  writingDone: number;
  lessonsDone: number;
  bossesWon: number;
  examsDone: number;
  reviewsDone: number;
  updatedAt: number;
}

export interface ProgressRecord {
  best: number; // 0..1
  tries: number;
  completedAt?: number;
  updatedAt: number;
  data?: Record<string, number | string | boolean>;
}

export interface SpeakingAttempt {
  id: string;
  taskId: string;
  level: Cefr;
  ts: number;
  transcript: string;
  durationSec: number;
  wpm: number;
  accuracy?: number; // tâches guidées (0..1)
  feedback?: SpeakingFeedback;
}

export interface WritingSubmission {
  id: string;
  taskId: string;
  level: Cefr;
  ts: number;
  text: string;
  wordCount: number;
  feedback?: WritingFeedback;
}

export interface ConversationRecord {
  id: string;
  persona: PersonaId;
  mode: ConversationMode;
  startedAt: number;
  updatedAt: number;
  endedAt?: number;
  messages: ChatMessage[];
  report?: ConversationReport;
}

export interface ExamResult {
  skill: Skill;
  score: number; // points obtenus
  max: number;
  /** Productions évaluées par l'IA : note /5. */
  rating?: number;
  evaluated: boolean;
}

export interface ExamAttemptRecord {
  id: string;
  examId: string;
  kind: "mock" | "level" | "boss";
  level: Cefr;
  startedAt: number;
  finishedAt: number;
  results: ExamResult[];
  passed?: boolean;
}

export interface PlacementResult {
  ts: number;
  skills: Partial<Record<Skill, Cefr | "A2">>;
  overall: Cefr | "A2";
  startLevel: Cefr;
}

export interface LevelValidation {
  ts: number;
  source: "exam" | "placement";
  /** Production écrite et orale vérifiées par l'IA. */
  productiveVerified: boolean;
}

export interface Settings {
  uiLang: "fr" | "en";
  theme: "dark" | "light";
  accent: "en-GB" | "en-US";
  sessionMinutes: 30 | 45 | 60;
  mode: "light" | "normal" | "intensive";
  dailyNewWords: number;
  speechRate: number;
  leaderboardOptIn: boolean;
  showTranslations: boolean;
}

export interface LearnerState {
  version: number;
  createdAt: number;
  updatedAt: number;
  profile: {
    displayName: string;
    placement?: PlacementResult;
    /** Plus haut niveau débloqué. */
    level: Cefr;
    validations: Partial<Record<Cefr, LevelValidation>>;
  };
  settings: Settings;
  xp: number;
  streak: { current: number; best: number; lastDay?: string };
  days: Record<string, DayStats>;
  attempts: Attempt[];
  /** Items ayant déjà rapporté de l'XP (anti-farming). */
  itemXp: Record<string, number>;
  cards: Record<string, Card>;
  revision: Record<string, RevisionState & { updatedAt: number }>;
  errors: ErrorEntry[];
  progress: Record<string, ProgressRecord>; // clé : "lesson:b1-l1", "grammar:passive:easy", "listening:id", "reading:id", "boss:b1-c1"
  speaking: SpeakingAttempt[];
  writing: WritingSubmission[];
  conversations: ConversationRecord[];
  exams: ExamAttemptRecord[];
  achievements: Record<string, number>;
  quests: Record<string, number>; // clé de quête réclamée → ts
  sync: { lastPushAt?: number; lastPullAt?: number };
}

export const MAX_ATTEMPTS = 6000;
export const MAX_ERRORS = 1500;

export function defaultSettings(): Settings {
  return {
    uiLang: "fr",
    theme: "dark",
    accent: "en-GB",
    sessionMinutes: 45,
    mode: "normal",
    dailyNewWords: 20,
    speechRate: 1,
    leaderboardOptIn: false,
    showTranslations: true,
  };
}

export function emptyDay(now = Date.now()): DayStats {
  return {
    xp: 0,
    seconds: {},
    wordsLearned: 0,
    wordsReviewed: 0,
    grammarCorrect: 0,
    attempts: 0,
    correct: 0,
    listeningDone: 0,
    readingDone: 0,
    speakingSeconds: 0,
    speakingTasks: 0,
    conversationMessages: 0,
    writingDone: 0,
    lessonsDone: 0,
    bossesWon: 0,
    examsDone: 0,
    reviewsDone: 0,
    updatedAt: now,
  };
}

export function createInitialState(now = Date.now(), displayName = "Apprenant"): LearnerState {
  return {
    version: STATE_VERSION,
    createdAt: now,
    updatedAt: now,
    profile: { displayName, level: "B1", validations: {} },
    settings: defaultSettings(),
    xp: 0,
    streak: { current: 0, best: 0 },
    days: {},
    attempts: [],
    itemXp: {},
    cards: {},
    revision: {},
    errors: [],
    progress: {},
    speaking: [],
    writing: [],
    conversations: [],
    exams: [],
    achievements: {},
    quests: {},
    sync: {},
  };
}

/** Clé de jour locale AAAA-MM-JJ. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Migration/validation douce d'un état chargé depuis le stockage. */
export function hydrateState(raw: unknown): LearnerState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<LearnerState>;
  if (typeof r.version !== "number" || !r.profile) return null;
  const base = createInitialState(r.createdAt ?? Date.now());
  return {
    ...base,
    ...r,
    profile: { ...base.profile, ...r.profile, validations: r.profile.validations ?? {} },
    settings: { ...base.settings, ...(r.settings ?? {}) },
    streak: { ...base.streak, ...(r.streak ?? {}) },
    sync: { ...(r.sync ?? {}) },
    version: STATE_VERSION,
  } as LearnerState;
}
