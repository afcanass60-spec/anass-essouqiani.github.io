import type { AutoItem, Item } from "@/lib/types";

/* =========================================================
   Correction automatique des réponses
   ========================================================= */

const CONTRACTIONS: [RegExp, string][] = [
  [/\bcan't\b/g, "cannot"],
  [/\bcan not\b/g, "cannot"],
  [/\bwon't\b/g, "will not"],
  [/\bshan't\b/g, "shall not"],
  [/\bain't\b/g, "is not"],
  [/n't\b/g, " not"],
  [/'re\b/g, " are"],
  [/'ve\b/g, " have"],
  [/'ll\b/g, " will"],
  [/'m\b/g, " am"],
  [/\bit's\b/g, "it is"],
  [/\bthat's\b/g, "that is"],
  [/\bwhat's\b/g, "what is"],
  [/\bthere's\b/g, "there is"],
  [/\blet's\b/g, "let us"],
];

/** Normalise une réponse : casse, apostrophes, espaces, ponctuation finale, contractions. */
export function normalize(input: string): string {
  let s = input
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  for (const [re, rep] of CONTRACTIONS) s = s.replace(re, rep);
  s = s
    .replace(/\s*([,;:!?.])\s*/g, "$1 ")
    .replace(/["]/g, "")
    .replace(/[.!?]+\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

/** Variante orthographique UK/US acceptée des deux côtés (-ise/-ize, -our/-or…). */
function spellingVariants(s: string): string {
  return s
    .replace(/(\w{3,})is(e|ed|es|ing|ation)\b/g, "$1iz$2")
    .replace(/(\w{2,})our\b/g, "$1or")
    .replace(/\blearnt\b/g, "learned")
    .replace(/\bgotten\b/g, "got")
    .replace(/\bspelt\b/g, "spelled")
    .replace(/\bdreamt\b/g, "dreamed")
    .replace(/\bburnt\b/g, "burned")
    .replace(/(\w)ll(ed|ing)\b/g, "$1l$2");
}

/** Pour la comparaison de phrases complètes : on ignore aussi les virgules. */
function loose(s: string): string {
  return spellingVariants(normalize(s).replace(/[,;:—-]/g, " ").replace(/\s+/g, " ").trim());
}

export function matches(response: string, accepted: string[]): boolean {
  const r = loose(response);
  if (!r) return false;
  return accepted.some((a) => loose(a) === r);
}

export function countGaps(text: string): number {
  return (text.match(/___/g) ?? []).length;
}

export type Response = number | string | string[];

export interface CheckResult {
  correct: boolean;
  /** Pour un texte à trous : correction gap par gap. */
  perGap?: boolean[];
  /** Réponse attendue (première réponse acceptée) pour l'affichage. */
  expected: string;
}

export function isAuto(item: Item): item is AutoItem {
  return item.type !== "free";
}

export function checkItem(item: AutoItem, response: Response): CheckResult {
  switch (item.type) {
    case "mcq": {
      return { correct: response === item.answer, expected: item.options[item.answer] };
    }
    case "gap": {
      const values = Array.isArray(response) ? response : [String(response)];
      const perGap = item.answers.map((accepted, i) => matches(values[i] ?? "", accepted));
      return { correct: perGap.every(Boolean), perGap, expected: item.answers.map((a) => a[0]).join(" / ") };
    }
    case "transform":
    case "correct":
    case "order": {
      const value = Array.isArray(response) ? response.join(" ") : String(response);
      return { correct: matches(value, item.answers), expected: item.answers[0] };
    }
  }
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w)).length;
}
