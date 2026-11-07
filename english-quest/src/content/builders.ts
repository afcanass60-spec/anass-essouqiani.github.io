import type {
  Cefr,
  CorrectItem,
  Difficulty,
  FreeItem,
  GapItem,
  McqItem,
  OrderItem,
  Skill,
  TransformItem,
} from "@/lib/types";

/**
 * Petits constructeurs qui rendent le contenu pédagogique lisible.
 * Chaque item reçoit un identifiant stable dérivé du préfixe (important :
 * la progression de l'apprenant est indexée par ces identifiants, il ne faut
 * donc jamais réordonner les items d'un bloc publié — seulement en ajouter).
 */
export function itemFactory(prefix: string, level: Cefr, skill: Skill, topic?: string, objective?: string) {
  let n = 0;
  let difficulty: Difficulty | undefined;
  const base = () => {
    n += 1;
    return { id: `${prefix}-${n}`, level, skill, topic, objective, difficulty };
  };
  return {
    /** Change la difficulté des items suivants. */
    at(d: Difficulty) {
      difficulty = d;
      return this;
    },
    mcq(question: string, options: string[], answer: number, explanation?: string, instruction?: string): McqItem {
      return { ...base(), type: "mcq", question, options, answer, explanation, instruction };
    },
    gap(text: string, answers: string[][], explanation?: string, hint?: string, instruction?: string): GapItem {
      return { ...base(), type: "gap", text, answers, explanation, hint, instruction };
    },
    transform(
      source: string,
      answers: string[],
      opts: { keyword?: string; frame?: string; instruction?: string; explanation?: string } = {},
    ): TransformItem {
      return { ...base(), type: "transform", source, answers, ...opts };
    },
    correct(sentence: string, answers: string[], explanation?: string): CorrectItem {
      return {
        ...base(),
        type: "correct",
        sentence,
        answers,
        explanation,
        instruction: "Cette phrase contient une erreur. Réécrivez-la correctement.",
      };
    },
    order(words: string[], answers: string[], explanation?: string): OrderItem {
      return {
        ...base(),
        type: "order",
        words,
        answers,
        explanation,
        instruction: "Remettez les mots dans l'ordre pour former une phrase correcte.",
      };
    },
    free(task: string, target: string, minWords: number, model?: string): FreeItem {
      return { ...base(), type: "free", task, target, minWords, model, instruction: "Production libre" };
    },
  };
}
