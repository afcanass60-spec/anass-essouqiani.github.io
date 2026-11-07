import { LEVELS, type AutoItem, type Cefr, type Chapter, type GapItem, type VocabEntry } from "@/lib/types";
import type { LearnerState } from "@/lib/state";
import {
  chapters,
  chaptersOf,
  getGrammar,
  getListening,
  getReading,
  levelIndex,
  lessonWords,
  listeningTracks,
  readingTexts,
  speakingTasks,
  vocabulary,
  writingTasks,
} from "@/content";
import { isAuto } from "./answer";

/* =========================================================
   Déblocage du parcours et construction des évaluations
   ========================================================= */

export const nextLevel = (l: Cefr): Cefr | undefined => LEVELS[levelIndex(l) + 1];

export const isLevelUnlocked = (s: LearnerState, level: Cefr) => levelIndex(level) <= levelIndex(s.profile.level);

export const lessonDone = (s: LearnerState, lessonId: string) => !!s.progress[`lesson:${lessonId}`]?.completedAt;
export const bossDefeated = (s: LearnerState, chapterId: string) => !!s.progress[`boss:${chapterId}`]?.completedAt;

export function isChapterUnlocked(s: LearnerState, chapter: Chapter): boolean {
  if (!isLevelUnlocked(s, chapter.level)) return false;
  // Niveaux validés (examen ou test de positionnement) : tout est accessible.
  if (s.profile.validations[chapter.level]) return true;
  const siblings = chaptersOf(chapter.level);
  const idx = siblings.indexOf(chapter);
  return idx === 0 || bossDefeated(s, siblings[idx - 1].id);
}

export function isLessonUnlocked(s: LearnerState, chapter: Chapter, lessonId: string): boolean {
  if (!isChapterUnlocked(s, chapter)) return false;
  if (s.profile.validations[chapter.level]) return true;
  const idx = chapter.lessons.findIndex((l) => l.id === lessonId);
  return idx <= 0 || lessonDone(s, chapter.lessons[idx - 1].id);
}

export const isBossUnlocked = (s: LearnerState, chapter: Chapter) =>
  isChapterUnlocked(s, chapter) && chapter.lessons.every((l) => lessonDone(s, l.id));

export const isLevelExamUnlocked = (s: LearnerState, level: Cefr) =>
  isLevelUnlocked(s, level) && chaptersOf(level).every((c) => bossDefeated(s, c.id));

/** Prochaine leçon du parcours (première non terminée et débloquée). */
export function nextLesson(s: LearnerState) {
  for (const c of chapters) {
    if (!isChapterUnlocked(s, c)) continue;
    for (const l of c.lessons) {
      if (!lessonDone(s, l.id) && isLessonUnlocked(s, c, l.id)) return { chapter: c, lesson: l };
    }
    if (!bossDefeated(s, c.id) && isBossUnlocked(s, c) && !s.profile.validations[c.level]) return { chapter: c, lesson: null };
  }
  return null;
}

/* ---------- Générateur d'items de vocabulaire ---------- */

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Phrase d'exemple avec le mot masqué (si le mot y apparaît tel quel). */
export function clozeFromExample(w: VocabEntry): string | null {
  const re = new RegExp(`\\b${escapeRe(w.word)}\\b`, "i");
  if (!re.test(w.example)) return null;
  return w.example.replace(re, "___");
}

export function vocabItem(w: VocabEntry): GapItem {
  const cloze = clozeFromExample(w);
  return {
    id: `vq-${w.id}`,
    type: "gap",
    skill: "vocabulary",
    level: w.level,
    objective: `${w.level === "B1+" ? "b1p" : w.level === "B2+" ? "b2p" : w.level.toLowerCase()}-vo-range`,
    difficulty: "medium",
    instruction: cloze ? `Complétez avec le mot ou l'expression qui signifie : « ${w.fr} »` : `Écrivez le mot ou l'expression : « ${w.fr} »`,
    text: cloze ?? `${w.defEn} → ___`,
    answers: [[w.word]],
    hint: `${w.pos} · ${w.word.length} caractères`,
    explanation: `${w.word} — ${w.defEn}`,
  };
}

/* ---------- Mélange déterministe ---------- */

export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let x = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    const j = x % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- Boss de chapitre ---------- */

export const BOSS_PASS = 0.8;

export function bossItems(chapter: Chapter, seed: number): AutoItem[] {
  const pool: AutoItem[] = [];
  for (const lesson of chapter.lessons) {
    const topic = lesson.grammarTopic ? getGrammar(lesson.grammarTopic) : undefined;
    if (topic) {
      pool.push(...topic.exam.filter(isAuto), ...topic.exercises.hard.filter(isAuto));
    }
  }
  const grammar = seededShuffle(pool, seed).slice(0, 12);
  const words = chapter.lessons.flatMap((l) => lessonWords(l.id));
  const vocab = seededShuffle(words, seed + 7)
    .slice(0, grammar.length ? 4 : 12)
    .map(vocabItem);
  return seededShuffle([...grammar, ...vocab], seed + 13);
}

/** Nombre d'erreurs autorisées pour vaincre le boss (≥ 80 % de réussite). */
export const bossHearts = (n: number) => Math.floor(n * (1 - BOSS_PASS));

/* ---------- Examen de validation de niveau ---------- */

export interface LevelExamPlan {
  level: Cefr;
  grammar: AutoItem[];
  vocabulary: AutoItem[];
  listening?: string;
  reading?: string;
  writing?: string;
  speaking?: string;
}

export const LEVEL_EXAM_PASS = { section: 0.6, overall: 0.7, productive: 3 };

export function levelExamPlan(level: Cefr, seed: number): LevelExamPlan {
  const topics = chaptersOf(level)
    .flatMap((c) => c.lessons.map((l) => l.grammarTopic))
    .filter((x): x is string => !!x)
    .map((id) => getGrammar(id)!);
  const grammar = seededShuffle(
    topics.flatMap((t) => seededShuffle([...t.exercises.medium, ...t.exercises.hard, ...t.exam].filter(isAuto), seed).slice(0, 4)),
    seed,
  );
  const words = vocabulary.filter((w) => w.level === level);
  const vocab = seededShuffle(words, seed + 3).slice(0, 10).map(vocabItem);
  const pick = <T extends { level: Cefr }>(arr: T[]) => {
    const own = arr.filter((x) => x.level === level);
    return own.length ? own[seed % own.length] : undefined;
  };
  const track = pick(listeningTracks) ?? listeningTracks.find((t) => levelIndex(t.level) < levelIndex(level));
  const text = pick(readingTexts) ?? [...readingTexts].reverse().find((t) => levelIndex(t.level) <= levelIndex(level));
  return {
    level,
    grammar,
    vocabulary: vocab,
    listening: track?.id,
    reading: text?.id,
    writing: (pick(writingTasks) ?? writingTasks.find((w) => levelIndex(w.level) <= levelIndex(level)))?.id,
    speaking: (pick(speakingTasks.filter((t) => t.kind !== "repeat" && t.kind !== "read-aloud")) ?? speakingTasks[0]).id,
  };
}

export const listeningOrReadingItems = (id: string, kind: "listening" | "reading") =>
  ((kind === "listening" ? getListening(id)?.questions : getReading(id)?.questions) ?? []).filter(isAuto);
