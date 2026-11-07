/* Génère supabase/seed.sql à partir du contenu pédagogique (src/content).
   Usage : npm run db:seed */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { chapters, exams, grammarTopics, LEVEL_INFO, listeningTracks, readingTexts, speakingTasks, vocabulary, writingTasks } from "../src/content";
import { placementItems } from "../src/content/placement";
import { examReadings, examTracks } from "../src/content/exams";
import { LEVELS, type Item } from "../src/lib/types";
import { ACHIEVEMENTS } from "../src/lib/engine/achievements";
import { DAILY_POOL, WEEKLY } from "../src/lib/engine/quests";
import { XP } from "../src/lib/engine/xp";

const q = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) return `array[${v.map(q).join(",")}]::text[]`;
  if (typeof v === "object") return `${q(JSON.stringify(v))}::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
};
const row = (vals: unknown[]) => `(${vals.map(q).join(", ")})`;
const insert = (table: string, cols: string[], rows: unknown[][], conflict = "id") =>
  rows.length ? `insert into ${table} (${cols.join(", ")}) values\n  ${rows.map(row).join(",\n  ")}\non conflict (${conflict}) do nothing;\n` : "";

const out: string[] = ["-- Généré par scripts/generate-seed.ts — ne pas modifier à la main.", "begin;"];

out.push(insert("learning_levels", ["id", "position", "name", "name_fr", "goal_fr"], LEVELS.map((l, i) => [l, i, LEVEL_INFO[l].name, LEVEL_INFO[l].nameFr, LEVEL_INFO[l].goalFr])));
out.push(insert("courses", ["id", "level_id", "title", "description"], LEVELS.map((l) => [`course-${l}`, l, `English ${l}`, LEVEL_INFO[l].goalFr])));
out.push(
  insert(
    "chapters",
    ["id", "course_id", "level_id", "position", "title", "title_fr", "story", "boss"],
    chapters.map((c) => [c.id, `course-${c.level}`, c.level, chapters.filter((x) => x.level === c.level).indexOf(c), c.title, c.titleFr, c.story, c.boss]),
  ),
);
out.push(
  insert(
    "grammar_topics",
    ["id", "level_id", "title", "title_fr", "summary_fr", "content"],
    grammarTopics.map((t) => [t.id, t.level, t.title, t.titleFr, t.summaryFr, { explanationFr: t.explanationFr, explanationEn: t.explanationEn, forms: t.forms, examples: t.examples, mistakes: t.mistakes }]),
  ),
);
out.push(
  insert(
    "lessons",
    ["id", "chapter_id", "position", "title", "title_fr", "grammar_topic_id", "vocab_theme", "resources", "objectives"],
    chapters.flatMap((c) =>
      c.lessons.map((l, i) => [l.id, c.id, i, l.title, l.titleFr, l.grammarTopic ?? null, l.vocabTheme ?? null, { listening: l.listening, reading: l.reading, writing: l.writing, speaking: l.speaking, vocabCount: l.vocabCount }, l.objectives]),
    ),
  ),
);

const exRows: unknown[][] = [];
const qRows: unknown[][] = [];
const addQuestions = (exerciseId: string, items: Item[]) =>
  items.forEach((it, i) => {
    const { id, type, skill, level, topic, objective, ...payload } = it;
    qRows.push([id, exerciseId, i, type, skill, level, topic ?? null, objective ?? null, payload]);
  });
for (const t of grammarTopics) {
  for (const d of ["easy", "medium", "hard"] as const) {
    exRows.push([`grammar:${t.id}:${d}`, "grammar", t.level, t.id, d, `${t.titleFr} — ${d}`, {}]);
    addQuestions(`grammar:${t.id}:${d}`, t.exercises[d]);
  }
  exRows.push([`grammar:${t.id}:exam`, "grammar", t.level, t.id, "exam", `${t.titleFr} — mini-examen`, {}]);
  addQuestions(`grammar:${t.id}:exam`, t.exam);
}
for (const t of [...listeningTracks, ...examTracks]) {
  const { questions, ...payload } = t;
  exRows.push([`listening:${t.id}`, "listening", t.level, null, null, t.title, payload]);
  addQuestions(`listening:${t.id}`, questions);
}
for (const t of [...readingTexts, ...examReadings]) {
  const { questions, ...payload } = t;
  exRows.push([`reading:${t.id}`, "reading", t.level, null, null, t.title, payload]);
  addQuestions(`reading:${t.id}`, questions);
}
for (const t of writingTasks) exRows.push([`writing:${t.id}`, "writing", t.level, null, null, t.title, t]);
for (const t of speakingTasks) exRows.push([`speaking:${t.id}`, "speaking", t.level, null, null, t.title, t]);
for (const e of exams) {
  exRows.push([`exam:${e.id}`, "exam", e.level, null, null, e.title, { format: e.format, minutes: e.minutes, description: e.description, sections: e.sections.map((s) => ({ ...s, items: s.items.map((i) => i.id) })) }]);
  addQuestions(`exam:${e.id}`, e.sections.flatMap((s) => s.items));
}
exRows.push(["placement", "placement", "B1", null, null, "Test de positionnement", {}]);
addQuestions("placement", placementItems.map((p) => p.item));

out.push(insert("exercises", ["id", "kind", "level_id", "grammar_topic_id", "difficulty", "title", "payload"], exRows));
out.push(insert("questions", ["id", "exercise_id", "position", "type", "skill", "level_id", "topic", "objective", "payload"], qRows));
out.push(
  insert(
    "vocabulary",
    ["id", "word", "kind", "pos", "ipa", "ipa_us", "level_id", "theme", "def_en", "fr", "example", "synonyms", "antonyms", "collocations", "uk_us"],
    vocabulary.map((w) => [w.id, w.word, w.kind, w.pos, w.ipa, w.ipaUs ?? null, w.level, w.theme, w.defEn, w.fr, w.example, w.synonyms ?? [], w.antonyms ?? [], w.collocations ?? [], w.ukUs ?? null]),
  ),
);
out.push(insert("achievements", ["id", "name", "description", "icon"], ACHIEVEMENTS.map((a) => [a.id, a.name, a.description, a.icon])));
out.push(
  insert("daily_quests", ["id", "period", "title", "icon", "reward_xp"], [
    ...DAILY_POOL.map((d) => [d.id, "daily", d.title, d.icon, XP.questDaily]),
    ...WEEKLY.map((w) => [w.id, "weekly", w.title, w.icon, XP.questWeekly]),
  ]),
);
out.push("commit;");

const file = path.resolve(__dirname, "../supabase/seed.sql");
writeFileSync(file, out.join("\n"));
console.log(`seed.sql : ${vocabulary.length} mots, ${grammarTopics.length} sujets, ${exRows.length} exercices, ${qRows.length} questions.`);
