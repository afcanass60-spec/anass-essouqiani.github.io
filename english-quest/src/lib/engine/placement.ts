import { LEVELS, type Cefr, type Skill } from "@/lib/types";
import { placementItems, type PlacementEntry } from "@/content/placement";
import type { PlacementResult } from "@/lib/state";
import { levelIndex } from "@/content";

/* =========================================================
   Test de positionnement adaptatif
   ========================================================= */

export const PLACEMENT_SKILLS: Skill[] = ["grammar", "vocabulary", "reading", "listening"];
export const LEVEL_PASS = 0.6;

export type Answers = Record<string, boolean>;

const entriesFor = (skill: Skill, level: Cefr) => placementItems.filter((e) => e.item.skill === skill && e.item.level === level);

/** Une compétence s'arrête dès qu'un niveau est échoué (précision < 60 %). */
function skillStopped(skill: Skill, answers: Answers): boolean {
  for (const level of LEVELS) {
    const entries = entriesFor(skill, level);
    if (!entries.length) continue;
    const answered = entries.filter((e) => e.item.id in answers);
    if (answered.length < entries.length) return false;
    const correct = answered.filter((e) => answers[e.item.id]).length;
    if (correct / entries.length < LEVEL_PASS) return true;
  }
  return false;
}

export function nextPlacementItem(answers: Answers): PlacementEntry | null {
  for (const skill of PLACEMENT_SKILLS) {
    if (skillStopped(skill, answers)) continue;
    for (const level of LEVELS) {
      const next = entriesFor(skill, level).find((e) => !(e.item.id in answers));
      if (next) return next;
    }
  }
  return null;
}

export function placementProgress(answers: Answers) {
  const total = placementItems.length;
  const answered = Object.keys(answers).length;
  return { answered, total };
}

export function scorePlacement(answers: Answers, now = Date.now()): PlacementResult {
  const skills: PlacementResult["skills"] = {};
  for (const skill of PLACEMENT_SKILLS) {
    let reached: Cefr | "A2" = "A2";
    for (const level of LEVELS) {
      const entries = entriesFor(skill, level);
      if (!entries.length) continue;
      const answered = entries.filter((e) => e.item.id in answers);
      if (answered.length < entries.length) break;
      const ok = answered.filter((e) => answers[e.item.id]).length / entries.length >= LEVEL_PASS;
      if (!ok) break;
      reached = level;
    }
    skills[skill] = reached;
  }
  const idx = PLACEMENT_SKILLS.map((k) => (skills[k] === "A2" ? -1 : levelIndex(skills[k] as Cefr)));
  const mean = Math.floor(idx.reduce((a, b) => a + b, 0) / idx.length);
  const overall: Cefr | "A2" = mean < 0 ? "A2" : LEVELS[mean];
  // Le parcours démarre au minimum en B1 ; un niveau inférieur déclenche des conseils de remise à niveau.
  const startLevel: Cefr = overall === "A2" ? "B1" : overall;
  return { ts: now, skills, overall, startLevel };
}
