/* =========================================================
   Analyse d'une production orale guidée (répéter / lire).
   La transcription provient de la reconnaissance vocale du
   navigateur : on mesure l'intelligibilité (mots reconnus),
   le débit et les pauses — pas la « ressemblance » à un accent.
   ========================================================= */

export type TokenStatus = "ok" | "missing" | "extra";

export interface AlignedToken {
  word: string;
  status: TokenStatus;
}

const NUMBERS: Record<string, string> = {
  "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten",
};

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => NUMBERS[w] ?? w);
}

/** Alignement par plus longue sous-séquence commune. */
export function align(target: string, spoken: string): AlignedToken[] {
  const a = tokenize(target);
  const b = tokenize(spoken);
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: AlignedToken[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ word: a[i], status: "ok" });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ word: a[i], status: "missing" });
      i++;
    } else {
      out.push({ word: b[j], status: "extra" });
      j++;
    }
  }
  while (i < a.length) out.push({ word: a[i++], status: "missing" });
  while (j < b.length) out.push({ word: b[j++], status: "extra" });
  return out;
}

export interface GuidedResult {
  tokens: AlignedToken[];
  accuracy: number; // mots cibles reconnus / mots cibles
  wpm: number;
  missing: string[];
  feedbackFr: string;
}

export function scoreGuided(target: string, transcript: string, durationSec: number, longPauses: number): GuidedResult {
  const tokens = align(target, transcript);
  const targetLen = tokenize(target).length || 1;
  const ok = tokens.filter((t) => t.status === "ok").length;
  const accuracy = ok / targetLen;
  const spokenWords = tokenize(transcript).length;
  const wpm = durationSec > 0 ? Math.round((spokenWords / durationSec) * 60) : 0;
  const missing = [...new Set(tokens.filter((t) => t.status === "missing").map((t) => t.word))];

  const parts: string[] = [];
  if (accuracy >= 0.95) parts.push("Excellent : la quasi-totalité des mots a été reconnue, votre énoncé est très intelligible.");
  else if (accuracy >= 0.8) parts.push("Bon résultat : votre énoncé est globalement intelligible.");
  else if (accuracy >= 0.6) parts.push("Intelligibilité partielle : plusieurs mots n'ont pas été reconnus.");
  else parts.push("Une grande partie de l'énoncé n'a pas été reconnue. Réécoutez le modèle et articulez davantage, sans forcer l'accent.");
  if (missing.length) parts.push(`Mots à retravailler : ${missing.slice(0, 8).join(", ")}. Cliquez dessus pour les écouter.`);
  if (wpm > 0 && wpm < 80) parts.push(`Débit lent (${wpm} mots/min) : visez 110–150 mots/min en enchaînant les mots d'un même groupe.`);
  else if (wpm > 190) parts.push(`Débit très rapide (${wpm} mots/min) : ralentissez légèrement pour rester clair.`);
  else if (wpm > 0) parts.push(`Débit naturel (${wpm} mots/min).`);
  if (longPauses > 1) parts.push(`${longPauses} pauses longues détectées : entraînez-vous à lire par groupes de sens.`);
  return { tokens, accuracy, wpm, missing, feedbackFr: parts.join(" ") };
}
