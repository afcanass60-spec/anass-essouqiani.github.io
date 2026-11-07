import { LEVELS, type Cefr, type Chapter, type Item, type Lesson, type VocabEntry } from "@/lib/types";
import { grammarB1 } from "./grammar/b1";
import { grammarB1Plus } from "./grammar/b1plus";
import { grammarB2 } from "./grammar/b2";
import { grammarB2Plus } from "./grammar/b2plus";
import { grammarC1 } from "./grammar/c1";
import { aiWords, businessWords, dailyWords, techWords, travelWords, workWords } from "./vocab/part1";
import { cultureWords, educationWords, environmentWords, scienceWords, socialWords, societyWords } from "./vocab/part2";
import { listeningTracks } from "./listening";
import { readingTexts } from "./reading";
import { writingTasks } from "./writing";
import { speakingTasks } from "./speaking";
import { chapters, objectives, LEVEL_INFO } from "./curriculum";
import { examReadings, examTracks, exams } from "./exams";

export { chapters, objectives, LEVEL_INFO, exams, listeningTracks, readingTexts, writingTasks, speakingTasks };

export const grammarTopics = [...grammarB1, ...grammarB1Plus, ...grammarB2, ...grammarB2Plus, ...grammarC1];

export const vocabulary: VocabEntry[] = [
  ...workWords,
  ...techWords,
  ...aiWords,
  ...businessWords,
  ...travelWords,
  ...dailyWords,
  ...socialWords,
  ...societyWords,
  ...scienceWords,
  ...cultureWords,
  ...educationWords,
  ...environmentWords,
];

export const THEME_LABELS: Record<VocabEntry["theme"], string> = {
  work: "Travail et carrière",
  tech: "Technologie et informatique",
  ai: "Intelligence artificielle",
  business: "Business et économie",
  travel: "Voyages",
  daily: "Vie quotidienne",
  social: "Relations sociales",
  society: "Actualité et société",
  science: "Sciences",
  culture: "Culture",
  education: "Éducation",
  environment: "Environnement",
};

export const levelIndex = (l: Cefr) => LEVELS.indexOf(l);

const byId = <T extends { id: string }>(arr: T[]) => new Map(arr.map((x) => [x.id, x]));
const grammarMap = byId(grammarTopics);
const vocabMap = byId(vocabulary);
const listeningMap = byId([...listeningTracks, ...examTracks]);
const readingMap = byId([...readingTexts, ...examReadings]);
const writingMap = byId(writingTasks);
const speakingMap = byId(speakingTasks);
const chapterMap = byId(chapters);
const examMap = byId(exams);

export const getGrammar = (id: string) => grammarMap.get(id);
export const getWord = (id: string) => vocabMap.get(id);
export const getListening = (id: string) => listeningMap.get(id);
export const getReading = (id: string) => readingMap.get(id);
export const getWriting = (id: string) => writingMap.get(id);
export const getSpeaking = (id: string) => speakingMap.get(id);
export const getChapter = (id: string) => chapterMap.get(id);
export const getExam = (id: string) => examMap.get(id);

export const allLessons: (Lesson & { chapterId: string; level: Cefr })[] = chapters.flatMap((c) =>
  c.lessons.map((l) => ({ ...l, chapterId: c.id, level: c.level })),
);
export const getLesson = (id: string) => allLessons.find((l) => l.id === id);
export const chaptersOf = (level: Cefr) => chapters.filter((c) => c.level === level);
export const chapterOfLesson = (lessonId: string) => chapters.find((c) => c.lessons.some((l) => l.id === lessonId));

/**
 * Attribue de façon déterministe les mots de vocabulaire aux leçons :
 * pour chaque leçon (dans l'ordre du parcours), on prend les mots du thème
 * dont le niveau est ≤ au niveau de la leçon, en commençant par les plus
 * faciles, sans réutiliser un mot déjà attribué.
 */
const lessonWordMap: Map<string, string[]> = (() => {
  const used = new Set<string>();
  const map = new Map<string, string[]>();
  for (const lesson of allLessons) {
    if (!lesson.vocabTheme || !lesson.vocabCount) continue;
    const candidates = vocabulary
      .filter((w) => w.theme === lesson.vocabTheme && levelIndex(w.level) <= levelIndex(lesson.level) && !used.has(w.id))
      .sort((a, b) => levelIndex(b.level) - levelIndex(a.level));
    // On privilégie les mots du niveau de la leçon, puis les niveaux inférieurs.
    const picked = candidates.slice(0, lesson.vocabCount).map((w) => w.id);
    picked.forEach((id) => used.add(id));
    map.set(lesson.id, picked);
  }
  return map;
})();

export const lessonWords = (lessonId: string) => (lessonWordMap.get(lessonId) ?? []).map((id) => vocabMap.get(id)!);

/** Tous les items d'un sujet de grammaire (exercices + mini-examen). */
export function grammarItems(topicId: string): Item[] {
  const t = grammarMap.get(topicId);
  if (!t) return [];
  return [...t.exercises.easy, ...t.exercises.medium, ...t.exercises.hard, ...t.exam];
}

/** Index de tous les items à correction automatique, par identifiant. */
export const itemIndex: Map<string, Item> = (() => {
  const m = new Map<string, Item>();
  const add = (it: Item) => m.set(it.id, it);
  grammarTopics.forEach((t) => grammarItems(t.id).forEach(add));
  [...listeningTracks, ...examTracks].forEach((t) => t.questions.forEach(add));
  [...readingTexts, ...examReadings].forEach((t) => t.questions.forEach(add));
  exams.forEach((e) => e.sections.forEach((s) => s.items.forEach(add)));
  return m;
})();

export const chapterLevelOrder = (c: Chapter) => levelIndex(c.level) * 10 + chapters.filter((x) => x.level === c.level).indexOf(c);

export const contentStats = {
  grammarTopics: grammarTopics.length,
  grammarItems: grammarTopics.reduce((n, t) => n + grammarItems(t.id).length, 0),
  words: vocabulary.length,
  listening: listeningTracks.length,
  reading: readingTexts.length,
  writing: writingTasks.length,
  speaking: speakingTasks.length,
  lessons: allLessons.length,
  chapters: chapters.length,
  exams: exams.length,
};
