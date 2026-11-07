import "server-only";
import { z } from "zod";
import { grammarTopics, getWriting, getSpeaking } from "@/content";
import { LEVELS } from "@/lib/types";
import { PERSONAS, MODES } from "@/lib/personas";
import type { AIProvider } from "./provider";

/* =========================================================
   Tâches IA : validation de l'entrée, prompt, schéma de sortie
   ========================================================= */

const TOPICS = [...grammarTopics.map((t) => t.id), "vocabulary", "pronunciation", "register", "other"];
const LEVEL_OUT = ["A2", ...LEVELS];
const levelSchema = z.enum(LEVELS);

const str = { type: "string" } as const;
// Les bornes sont appliquées après coup (clamp) : les contraintes numériques ne sont pas
// prises en charge par tous les fournisseurs de sorties structurées.
const num = (_min: number, _max: number) => ({ type: "number" }) as const;
const obj = (properties: Record<string, unknown>) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
const arr = (items: unknown) => ({ type: "array", items });

const correctionSchema = obj({ original: str, corrected: str, explanationFr: str, topic: { type: "string", enum: TOPICS } });

const TOPIC_GUIDE = `When you tag a correction with "topic", use one of: ${grammarTopics.map((t) => `${t.id} (${t.title})`).join("; ")}; or vocabulary, pronunciation, register, other.`;

const LEVEL_GUIDE: Record<string, string> = {
  B1: "Use clear, everyday English with common vocabulary and mostly simple sentences. Avoid idioms unless you explain them.",
  "B1+": "Use natural everyday English, some phrasal verbs and a few idioms, moderate sentence complexity.",
  B2: "Use fluent, natural English with varied structures, phrasal verbs, idioms and some abstract topics.",
  "B2+": "Use rich, nuanced English with complex sentences, idiomatic language and precise vocabulary.",
  C1: "Use sophisticated, idiomatic English, including hedging, inversion, nuance and abstract argument, as with an educated native speaker.",
};

const MAX_TEXT = 6000;

/* ---------- Conversation ---------- */

const chatInput = z.object({
  persona: z.enum(Object.keys(PERSONAS) as [keyof typeof PERSONAS, ...(keyof typeof PERSONAS)[]]),
  mode: z.enum(Object.keys(MODES) as [keyof typeof MODES, ...(keyof typeof MODES)[]]),
  level: levelSchema,
  weakTopics: z.array(z.string().max(60)).max(5).default([]),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(MAX_TEXT) }))
    .min(1)
    .max(60),
});

function chatSystem(i: z.infer<typeof chatInput>) {
  const p = PERSONAS[i.persona];
  const m = MODES[i.mode];
  return [
    `You are ${p.name}, a character in ENGLISH QUEST, an English-learning app for French speakers progressing from B1 to C1.`,
    `Persona: ${p.prompt}`,
    `Conversation mode: ${m.prompt}`,
    `Learner's current CEFR level: ${i.level}. ${LEVEL_GUIDE[i.level]} Gradually stretch the learner slightly above their level.`,
    i.weakTopics.length ? `The learner has recurring difficulties with: ${i.weakTopics.join(", ")}. Naturally create opportunities to use these structures.` : "",
    "Rules:",
    "- Stay in character and keep the conversation going: end most replies with a question or prompt that invites the learner to speak more.",
    "- Keep replies concise (2–5 sentences) so the learner talks more than you.",
    "- Reply in English. Never switch to French in `reply`, even if the learner writes in French; gently encourage English.",
    "- In `corrections`, list the real mistakes in the learner's LAST message only (grammar, vocabulary, unnatural phrasing, register). Do not correct things that are acceptable. Explain each correction briefly in French in `explanationFr`. If there are no mistakes, return an empty array.",
    "- In `betterPhrasing`, optionally give a more natural way to say the learner's last message (empty string if it was already natural).",
    "- In `expressions`, give 0–2 useful expressions you used or that fit the context, with a French translation.",
    TOPIC_GUIDE,
    "Never claim to be human. Do not give medical, legal or financial advice beyond general conversation.",
  ]
    .filter(Boolean)
    .join("\n");
}

const chatOut = obj({
  reply: str,
  corrections: arr(correctionSchema),
  betterPhrasing: str,
  expressions: arr(obj({ en: str, fr: str })),
});

/* ---------- Bilan de conversation ---------- */

const reportInput = chatInput.omit({ weakTopics: true });

const reportOut = obj({
  errors: arr(correctionSchema),
  newWords: arr(obj({ term: str, meaning: str })),
  expressions: arr(obj({ en: str, fr: str })),
  score: num(0, 100),
  cefr: { type: "string", enum: LEVEL_OUT },
  strengths: str,
  advice: str,
  exercise: obj({ instruction: str, items: arr(obj({ prompt: str, answer: str })) }),
});

/* ---------- Écrit ---------- */

const writingInput = z.object({
  taskId: z.string().max(60),
  text: z.string().min(20).max(12000),
});

const scoreScale = num(0, 5);
const writingOut = obj({
  issues: arr(obj({ original: str, correction: str, category: { type: "string", enum: ["grammar", "spelling", "punctuation", "vocabulary", "structure", "coherence", "fluency", "register"] }, explanationFr: str })),
  corrected: str,
  improved: str,
  scores: obj({ task: scoreScale, organisation: scoreScale, vocabulary: scoreScale, grammar: scoreScale, register: scoreScale }),
  cefr: { type: "string", enum: LEVEL_OUT },
  summaryFr: str,
  topics: arr({ type: "string", enum: TOPICS }),
});

/* ---------- Oral ---------- */

const speakingInput = z.object({
  taskId: z.string().max(60),
  transcript: z.string().min(1).max(MAX_TEXT),
  durationSec: z.number().min(1).max(900),
  wpm: z.number().min(0).max(400),
  longPauses: z.number().min(0).max(200),
});

const speakingOut = obj({
  summaryFr: str,
  errors: arr(correctionSchema),
  betterVersion: str,
  scores: obj({ fluency: scoreScale, accuracy: scoreScale, range: scoreScale, coherence: scoreScale }),
  cefr: { type: "string", enum: LEVEL_OUT },
});

/* ---------- Production libre (exercices) ---------- */

const freeInput = z.object({
  task: z.string().max(1000),
  target: z.string().max(500),
  level: levelSchema,
  answer: z.string().min(1).max(MAX_TEXT),
});
const freeOut = obj({ score: num(0, 5), correct: { type: "boolean" }, feedbackFr: str, corrections: arr(correctionSchema), improved: str });

/* ---------- Utilisation d'un mot ---------- */

const wordUseInput = z.object({ word: z.string().max(80), meaning: z.string().max(300), sentence: z.string().min(3).max(500) });
const wordUseOut = obj({ correct: { type: "boolean" }, feedbackFr: str, improved: str });

/* ---------- Définition d'un mot hors banque ---------- */

const defineInput = z.object({ word: z.string().min(1).max(60), context: z.string().max(600).default("") });
const defineOut = obj({ word: str, pos: str, defEn: str, fr: str, example: str });

/* ---------- Registre des tâches ---------- */

export interface TaskDef<I extends z.ZodType> {
  input: I;
  run: (p: AIProvider, input: z.infer<I>) => Promise<unknown>;
}

function wordCount(t: string) {
  return t.trim().split(/\s+/).filter(Boolean).length;
}

export const TASKS = {
  chat: {
    input: chatInput,
    run: (p, i) => p.completeJSON({ system: chatSystem(i), messages: i.messages, schema: chatOut, maxTokens: 2000 }),
  } satisfies TaskDef<typeof chatInput>,

  report: {
    input: reportInput,
    run: (p, i) =>
      p.completeJSON({
        system: [
          "You are an expert English teacher (CEFR examiner) reviewing a practice conversation between a French-speaking learner and an AI character.",
          `The learner's current level is ${i.level}. Evaluate ONLY the learner's messages.`,
          "List the most important errors (max 10) with corrections and brief French explanations; useful new words and expressions that appeared or would have helped (max 8 each); a progress score 0–100 reflecting accuracy, range, fluency and interaction relative to the target level; an estimated CEFR level for this performance; strengths and advice in French (2–3 sentences each); and a personalised exercise in English (3–5 short items with answers) targeting the learner's main weakness.",
          "Be honest and calibrated: do not inflate the score. If the learner wrote very little, say so and keep the estimate cautious.",
          TOPIC_GUIDE,
        ].join("\n"),
        messages: [
          {
            role: "user",
            content: `Conversation (persona ${i.persona}, mode ${i.mode}):\n\n${i.messages.map((m) => `${m.role === "user" ? "LEARNER" : "AI"}: ${m.content}`).join("\n")}`,
          },
        ],
        schema: reportOut,
        maxTokens: 4000,
      }),
  } satisfies TaskDef<typeof reportInput>,

  writing: {
    input: writingInput,
    run: (p, i) => {
      const task = getWriting(i.taskId);
      if (!task) throw new Error("Tâche inconnue");
      return p.completeJSON({
        system: [
          "You are an experienced Cambridge-style writing examiner and English teacher for French-speaking learners.",
          `Task (${task.genre}, target level ${task.level}, register ${task.register}, ${task.minWords}–${task.maxWords} words): ${task.prompt}`,
          `Expected structure: ${task.structure.join(" | ")}`,
          "Assess the learner's text against criteria close to CEFR C1 writing descriptors: task achievement, organisation and cohesion, vocabulary range and accuracy, grammatical range and accuracy, register and style. Score each 0–5 (half points allowed), calibrated so that 3 = solid performance at the TARGET level of the task, 5 = clearly above it.",
          "`issues`: every significant error or weakness, quoting the exact original fragment, the correction, its category and a clear French explanation of WHY the correction is needed (max 25).",
          "`corrected`: the learner's text with only errors fixed (minimal changes). `improved`: a more natural, better-structured version at the target level that keeps the learner's ideas.",
          "`summaryFr`: 3–4 sentences of feedback in French, including the main priority for improvement. `topics`: grammar topics behind the errors.",
          `The text has ${wordCount(i.text)} words; mention it in the summary if outside the expected range.`,
          TOPIC_GUIDE,
        ].join("\n"),
        messages: [{ role: "user", content: i.text }],
        schema: writingOut,
        maxTokens: 8000,
      });
    },
  } satisfies TaskDef<typeof writingInput>,

  speaking: {
    input: speakingInput,
    run: (p, i) => {
      const task = getSpeaking(i.taskId);
      if (!task) throw new Error("Tâche inconnue");
      return p.completeJSON({
        system: [
          "You are an English speaking examiner and coach for French-speaking learners.",
          `Task (${task.kind}, target level ${task.level}): ${task.prompt ?? task.target ?? task.title}`,
          "You receive an automatic speech-recognition transcript plus timing metrics. Recognition errors are possible: do not penalise isolated odd words that are likely transcription artefacts.",
          "Do NOT judge the accent or reward sounding native. Assess intelligibility, fluency (rate, pauses), grammatical accuracy, range of vocabulary and structures, and coherence (organisation, linking, relevance to the task). Score each 0–5, where 3 = solid at the target level.",
          "`errors`: real language errors with corrections and French explanations (max 10). `betterVersion`: a more natural, well-organised version of what the learner tried to say, at the target level. `summaryFr`: 3–4 sentences in French with the main priority.",
          TOPIC_GUIDE,
        ].join("\n"),
        messages: [
          { role: "user", content: `Transcript: """${i.transcript}"""\nDuration: ${Math.round(i.durationSec)} s · ${Math.round(i.wpm)} words/min · long pauses: ${i.longPauses}` },
        ],
        schema: speakingOut,
        maxTokens: 3000,
      });
    },
  } satisfies TaskDef<typeof speakingInput>,

  free: {
    input: freeInput,
    run: (p, i) =>
      p.completeJSON({
        system: [
          "You are an English teacher correcting a short free-production exercise written by a French-speaking learner.",
          `Level: ${i.level}. Task: ${i.task}. Target structures: ${i.target}.`,
          "Score 0–5 (3 = acceptable at this level, uses the target structures mostly correctly). `correct` is true if score >= 3. Give concise French feedback, the corrections, and an improved version.",
          TOPIC_GUIDE,
        ].join("\n"),
        messages: [{ role: "user", content: i.answer }],
        schema: freeOut,
        maxTokens: 2000,
      }),
  } satisfies TaskDef<typeof freeInput>,

  "word-use": {
    input: wordUseInput,
    run: (p, i) =>
      p.completeJSON({
        system: `You check whether a French-speaking learner used the English word or expression "${i.word}" (meaning: ${i.meaning}) correctly and naturally in their own sentence. \`correct\` = the word is used with the right meaning and grammar (minor unrelated slips are acceptable). Give brief feedback in French and an improved sentence.`,
        messages: [{ role: "user", content: i.sentence }],
        schema: wordUseOut,
        maxTokens: 800,
      }),
  } satisfies TaskDef<typeof wordUseInput>,

  define: {
    input: defineInput,
    run: (p, i) =>
      p.completeJSON({
        system: "You are a learner's dictionary for French speakers. Give the base form of the word, its part of speech, a simple English definition for the meaning used in context, a French translation, and a short natural example sentence.",
        messages: [{ role: "user", content: `Word: ${i.word}\nContext: ${i.context}` }],
        schema: defineOut,
        maxTokens: 500,
      }),
  } satisfies TaskDef<typeof defineInput>,
} as const;

export type TaskName = keyof typeof TASKS;
export const isTaskName = (s: string): s is TaskName => s in TASKS;
