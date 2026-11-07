import { describe, expect, it } from "vitest";
import { createInitialState } from "@/lib/state";
import { addXp, recordAttempt, recordVocab } from "@/lib/engine/actions";
import { mergeStates } from "@/lib/engine/merge";
import { rowsToState, stateToRows } from "@/lib/sync/mapping";
import { grammarItems } from "@/content";
import { DAY } from "@/lib/engine/srs";

const NOW = new Date("2026-03-10T10:00:00").getTime();

describe("fusion d'états (invité → compte, multi-appareils)", () => {
  it("unit les journaux sans double compter l'XP", () => {
    const a = createInitialState(NOW);
    const b = createInitialState(NOW);
    const it1 = grammarItems("passive")[0];
    const it2 = grammarItems("passive")[1];
    recordAttempt(a, it1, true, "grammar", NOW);
    recordAttempt(b, it2, true, "grammar", NOW + DAY);
    const merged = mergeStates(a, b);
    expect(merged.attempts).toHaveLength(2);
    expect(merged.xp).toBe(a.xp + b.xp);
    // Fusionner deux fois le même état ne change rien.
    const again = mergeStates(merged, merged);
    expect(again.xp).toBe(merged.xp);
    expect(again.attempts).toHaveLength(2);
  });
  it("garde la carte de vocabulaire la plus récente", () => {
    const a = createInitialState(NOW);
    const b = createInitialState(NOW);
    recordVocab(a, "deadline", "recall", true, NOW, true);
    recordVocab(b, "deadline", "recall", true, NOW, true);
    recordVocab(b, "deadline", "recall", true, NOW + 2 * DAY, true);
    expect(mergeStates(a, b).cards.deadline.reps).toBe(2);
  });
});

describe("correspondance état ⇄ lignes SQL", () => {
  it("fait un aller-retour fidèle", () => {
    const s = createInitialState(NOW, "Alice");
    recordAttempt(s, grammarItems("passive")[0], false, "grammar", NOW);
    recordVocab(s, "deadline", "recall", true, NOW, true);
    addXp(s, 50, NOW);
    const rows = stateToRows(s, "user-1", 0, NOW);
    expect(rows.profiles[0].xp).toBe(s.xp);
    // Simule le format renvoyé par PostgREST (dates en chaînes).
    const back = rowsToState(JSON.parse(JSON.stringify(rows)), NOW);
    expect(back.xp).toBe(s.xp);
    expect(back.attempts).toHaveLength(1);
    expect(back.errors).toHaveLength(1);
    expect(back.cards.deadline.learnedAt).toBe(s.cards.deadline.learnedAt);
    expect(Object.keys(back.days)).toEqual(Object.keys(s.days));
  });
  it("n'envoie que les changements depuis le dernier push", () => {
    const s = createInitialState(NOW);
    recordAttempt(s, grammarItems("passive")[0], true, "grammar", NOW);
    expect(stateToRows(s, "u", NOW + 1).exercise_attempts).toHaveLength(0);
    expect(stateToRows(s, "u", 0).exercise_attempts).toHaveLength(1);
  });
});
