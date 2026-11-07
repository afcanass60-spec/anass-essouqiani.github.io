import "server-only";

/* Bornage et nettoyage des sorties IA (robustesse face à un modèle
   qui renverrait des valeurs hors plage ou des champs manquants). */

const clamp = (v: unknown, min: number, max: number, dflt = min) => {
  const n = typeof v === "number" && Number.isFinite(v) ? v : dflt;
  return Math.max(min, Math.min(max, n));
};
const arr = <T,>(v: unknown, max = 50): T[] => (Array.isArray(v) ? (v.slice(0, max) as T[]) : []);
const s = (v: unknown) => (typeof v === "string" ? v : "");

export function normalizeOutput(task: string, raw: unknown): Record<string, unknown> {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  switch (task) {
    case "chat":
      return { reply: s(o.reply), corrections: arr(o.corrections, 10), betterPhrasing: s(o.betterPhrasing), expressions: arr(o.expressions, 3) };
    case "report":
      return {
        errors: arr(o.errors, 12),
        newWords: arr(o.newWords, 10),
        expressions: arr(o.expressions, 10),
        score: Math.round(clamp(o.score, 0, 100)),
        cefr: s(o.cefr) || "B1",
        strengths: s(o.strengths),
        advice: s(o.advice),
        exercise: o.exercise && typeof o.exercise === "object" ? { instruction: s((o.exercise as Record<string, unknown>).instruction), items: arr((o.exercise as Record<string, unknown>).items, 6) } : { instruction: "", items: [] },
      };
    case "writing": {
      const sc = (o.scores ?? {}) as Record<string, unknown>;
      return {
        issues: arr(o.issues, 30),
        corrected: s(o.corrected),
        improved: s(o.improved),
        scores: { task: clamp(sc.task, 0, 5), organisation: clamp(sc.organisation, 0, 5), vocabulary: clamp(sc.vocabulary, 0, 5), grammar: clamp(sc.grammar, 0, 5), register: clamp(sc.register, 0, 5) },
        cefr: s(o.cefr) || "B1",
        summaryFr: s(o.summaryFr),
        topics: arr(o.topics, 10),
      };
    }
    case "speaking": {
      const sc = (o.scores ?? {}) as Record<string, unknown>;
      return {
        summaryFr: s(o.summaryFr),
        errors: arr(o.errors, 12),
        betterVersion: s(o.betterVersion),
        scores: { fluency: clamp(sc.fluency, 0, 5), accuracy: clamp(sc.accuracy, 0, 5), range: clamp(sc.range, 0, 5), coherence: clamp(sc.coherence, 0, 5) },
        cefr: s(o.cefr) || "B1",
      };
    }
    case "free": {
      const score = clamp(o.score, 0, 5);
      return { score, correct: score >= 3, feedbackFr: s(o.feedbackFr), corrections: arr(o.corrections, 10), improved: s(o.improved) };
    }
    default:
      return o;
  }
}
