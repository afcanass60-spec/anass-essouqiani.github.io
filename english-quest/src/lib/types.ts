/* Types partagés : contenu pédagogique, état de l'apprenant, IA. */

export const LEVELS = ["B1", "B1+", "B2", "B2+", "C1"] as const;
export type Cefr = (typeof LEVELS)[number];

export const SKILLS = ["listening", "speaking", "reading", "writing", "grammar", "vocabulary"] as const;
export type Skill = (typeof SKILLS)[number];

export type Accent = "en-GB" | "en-US" | "intl";
export type Difficulty = "easy" | "medium" | "hard";

/* ---------- Exercices ---------- */

interface ItemBase {
  id: string;
  skill: Skill;
  level: Cefr;
  /** Identifiant d'un sujet de grammaire (pour la personnalisation). */
  topic?: string;
  /** Identifiant d'un objectif du référentiel CECRL. */
  objective?: string;
  difficulty?: Difficulty;
  /** Consigne affichée au-dessus de l'item. */
  instruction?: string;
  /** Explication affichée après correction (FR). */
  explanation?: string;
}

export interface McqItem extends ItemBase {
  type: "mcq";
  question: string;
  options: string[];
  answer: number;
}

/** Texte à trous : chaque "___" correspond à une entrée de `answers`. */
export interface GapItem extends ItemBase {
  type: "gap";
  text: string;
  answers: string[][];
  hint?: string;
}

/** Transformation (type Cambridge « key word transformation » ou reformulation). */
export interface TransformItem extends ItemBase {
  type: "transform";
  source: string;
  keyword?: string;
  /** Début imposé de la réponse, ex. "If I ___". */
  frame?: string;
  answers: string[];
}

/** Phrase contenant une erreur à corriger : on demande la phrase corrigée. */
export interface CorrectItem extends ItemBase {
  type: "correct";
  sentence: string;
  answers: string[];
}

/** Remettre les mots dans l'ordre. */
export interface OrderItem extends ItemBase {
  type: "order";
  words: string[];
  answers: string[];
}

/** Production libre : évaluée par l'IA si elle est configurée. */
export interface FreeItem extends ItemBase {
  type: "free";
  task: string;
  minWords: number;
  /** Ce qui est attendu (structure ciblée), transmis à l'IA. */
  target: string;
  /** Exemple de bonne réponse, affiché après envoi. */
  model?: string;
}

export type Item = McqItem | GapItem | TransformItem | CorrectItem | OrderItem | FreeItem;
export type AutoItem = Exclude<Item, FreeItem>;

/* ---------- Vocabulaire ---------- */

export type VocabKind = "word" | "phrasal" | "idiom" | "collocation";

export type Theme =
  | "work"
  | "tech"
  | "ai"
  | "business"
  | "travel"
  | "daily"
  | "social"
  | "society"
  | "science"
  | "culture"
  | "education"
  | "environment";

export interface VocabEntry {
  id: string;
  word: string;
  kind: VocabKind;
  pos: string;
  ipa: string;
  /** Prononciation américaine si elle diffère. */
  ipaUs?: string;
  level: Cefr;
  theme: Theme;
  defEn: string;
  fr: string;
  example: string;
  synonyms?: string[];
  antonyms?: string[];
  collocations?: string[];
  /** Différence britannique / américaine (orthographe, mot, usage). */
  ukUs?: string;
}

/* ---------- Grammaire ---------- */

export interface GrammarTopic {
  id: string;
  title: string;
  titleFr: string;
  level: Cefr;
  summaryFr: string;
  explanationFr: string[];
  explanationEn: string[];
  forms: { label: string; pattern: string; example: string }[];
  examples: { en: string; fr: string; note?: string }[];
  mistakes: { wrong: string; right: string; why: string }[];
  exercises: { easy: Item[]; medium: Item[]; hard: Item[] };
  exam: Item[];
}

/* ---------- Listening / Reading / Writing / Speaking ---------- */

export interface ListeningSpeaker {
  name: string;
  accent: Accent;
  gender: "f" | "m";
}

export interface ListeningTrack {
  id: string;
  title: string;
  level: Cefr;
  genre: "conversation" | "professional" | "interview" | "podcast" | "news" | "debate" | "lecture" | "academic";
  context: string;
  speakers: ListeningSpeaker[];
  lines: { speaker: number; text: string }[];
  questions: Item[];
  expressions: { en: string; fr: string }[];
  /** Vitesse de lecture recommandée (1 = normale). */
  baseRate: number;
}

export interface ReadingText {
  id: string;
  title: string;
  level: Cefr;
  genre: "news" | "story" | "science" | "tech" | "essay" | "academic" | "professional";
  intro: string;
  paragraphs: string[];
  questions: Item[];
  summaryTask: { instruction: string; minWords: number; maxWords: number };
  keyVocab: { term: string; meaning: string }[];
}

export type WritingGenre =
  | "email"
  | "formal-letter"
  | "informal-letter"
  | "minutes"
  | "essay"
  | "article"
  | "summary"
  | "report"
  | "proposal"
  | "academic";

export interface WritingTask {
  id: string;
  level: Cefr;
  genre: WritingGenre;
  title: string;
  prompt: string;
  minWords: number;
  maxWords: number;
  register: "formal" | "neutral" | "informal";
  structure: string[];
  usefulLanguage: string[];
}

export type SpeakingKind =
  | "repeat"
  | "read-aloud"
  | "describe"
  | "question"
  | "story"
  | "opinion"
  | "argue"
  | "interview"
  | "presentation"
  | "debate";

export interface SpeakingTask {
  id: string;
  kind: SpeakingKind;
  level: Cefr;
  title: string;
  instructionFr: string;
  /** Texte à répéter / lire (repeat, read-aloud). */
  target?: string;
  /** Question ou sujet (tâches libres). */
  prompt?: string;
  /** Scène illustrée (describe). */
  scene?: string;
  /** Durée conseillée en secondes. */
  seconds: number;
  hints?: string[];
}

/* ---------- Parcours ---------- */

export interface Lesson {
  id: string;
  title: string;
  titleFr: string;
  grammarTopic?: string;
  vocabTheme?: Theme;
  /** Nombre de mots du thème introduits dans la leçon. */
  vocabCount?: number;
  listening?: string;
  reading?: string;
  writing?: string;
  speaking?: string;
  objectives: string[];
}

export interface Chapter {
  id: string;
  level: Cefr;
  title: string;
  titleFr: string;
  story: string;
  lessons: Lesson[];
  boss: { name: string; title: string; lore: string; avatar: string };
}

export interface Objective {
  id: string;
  level: Cefr;
  skill: Skill;
  descriptor: string;
  descriptorFr: string;
}

export interface Exam {
  id: string;
  level: Cefr;
  title: string;
  format: "cambridge" | "ielts" | "level";
  minutes: number;
  description: string;
  sections: ExamSection[];
}

export interface ExamSection {
  skill: Skill;
  title: string;
  minutes: number;
  /** Items à correction automatique ou libre. */
  items: Item[];
  listening?: string;
  reading?: string;
  writing?: string;
  speaking?: string;
}

/* ---------- Conversation IA ---------- */

export type PersonaId = "alex" | "james" | "michael" | "sarah" | "emma" | "daniel";
export type ConversationMode = "free" | "debate" | "professional" | "daily" | "academic";

export interface Correction {
  original: string;
  corrected: string;
  explanationFr: string;
  topic?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  corrections?: Correction[];
  /** Formulation plus naturelle proposée pour un message de l'apprenant. */
  better?: string;
  ts: number;
}

export interface ConversationReport {
  errors: Correction[];
  newWords: { term: string; meaning: string }[];
  expressions: { en: string; fr: string }[];
  score: number;
  cefr: Cefr | "A2";
  strengths: string;
  advice: string;
  exercise: { instruction: string; items: { prompt: string; answer: string }[] };
}

export interface WritingFeedback {
  issues: { original: string; correction: string; category: string; explanationFr: string }[];
  corrected: string;
  improved: string;
  scores: { task: number; organisation: number; vocabulary: number; grammar: number; register: number };
  cefr: Cefr | "A2";
  summaryFr: string;  /** Sujets de grammaire à l'origine des erreurs (personnalisation). */
  topics?: string[];
}

export interface SpeakingFeedback {
  summaryFr: string;
  errors: Correction[];
  betterVersion: string;
  scores: { fluency: number; accuracy: number; range: number; coherence: number };
  cefr: Cefr | "A2";
}
