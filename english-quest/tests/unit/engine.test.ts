import { describe, expect, it } from "vitest";
import { checkItem, matches, normalize } from "@/lib/engine/answer";
import { DAY, newSrs, review, scheduleItem } from "@/lib/engine/srs";
import { playerLevel, xpForLevel } from "@/lib/engine/xp";
import { addXp, currentStreak, recordAttempt, recordVocab } from "@/lib/engine/actions";
import { createInitialState, dayKey } from "@/lib/state";
import { weaknesses, estimateSkill, progressToC1 } from "@/lib/engine/mastery";
import { align, scoreGuided } from "@/lib/engine/speech";
import { nextPlacementItem, scorePlacement } from "@/lib/engine/placement";
import { placementItems } from "@/content/placement";
import { bossHearts, bossItems, isChapterUnlocked, isLessonUnlocked, levelExamPlan, nextLesson } from "@/lib/engine/progression";
import { chapters, getGrammar, grammarItems } from "@/content";
import { dailyQuests, dailyQuestStatus } from "@/lib/engine/quests";
import { checkAchievements } from "@/lib/engine/achievements";
import { recommendations, sessionPlan } from "@/lib/engine/recommend";
import type { GapItem } from "@/lib/types";

const NOW = new Date("2026-03-10T10:00:00").getTime();

describe("correction des réponses", () => {
  it("normalise contractions, casse, apostrophes et ponctuation", () => {
    expect(normalize("I’ve  LIVED here.")).toBe("i have lived here");
    expect(matches("She hasn't seen it", ["She has not seen it."])).toBe(true);
    expect(matches("I can't", ["I cannot"])).toBe(true);
    expect(matches("I realised", ["I realized"])).toBe(true);
    expect(matches("colour", ["color"])).toBe(true);
    expect(matches("", ["anything"])).toBe(false);
    expect(matches("I have living here", ["I have lived here"])).toBe(false);
  });
  it("corrige un texte à trous gap par gap", () => {
    const item: GapItem = { id: "t", type: "gap", skill: "grammar", level: "B1", text: "I ___ here since ___.", answers: [["have lived", "'ve lived"], ["2010"]] };
    const r = checkItem(item, ["'ve lived", "2011"]);
    expect(r.perGap).toEqual([true, false]);
    expect(r.correct).toBe(false);
    expect(checkItem(item, ["have lived", "2010"]).correct).toBe(true);
  });
});

describe("répétition espacée", () => {
  it("augmente l'intervalle après des succès et le réinitialise après un échec", () => {
    let s = newSrs(NOW);
    s = review(s, 4, NOW);
    expect(s.interval).toBe(1);
    s = review(s, 4, NOW + DAY);
    expect(s.interval).toBe(3);
    s = review(s, 5, NOW + 4 * DAY);
    expect(s.interval).toBeGreaterThanOrEqual(7);
    const failed = review(s, 1, NOW + 12 * DAY);
    expect(failed.interval).toBe(1);
    expect(failed.lapses).toBe(1);
    expect(failed.ease).toBeLessThan(s.ease);
    expect(failed.ease).toBeGreaterThanOrEqual(1.3);
  });
  it("programme puis retire un item raté une fois maîtrisé", () => {
    let r = scheduleItem(undefined, false, NOW)!;
    expect(r.interval).toBe(1);
    r = scheduleItem(r, true, NOW + DAY)!;
    r = scheduleItem(r, true, NOW + 4 * DAY)!;
    expect(scheduleItem(r, true, NOW + 12 * DAY)).toBeNull();
    expect(scheduleItem(undefined, true, NOW)).toBeNull();
  });
});

describe("XP, niveaux et série", () => {
  it("calcule le niveau de joueur", () => {
    expect(playerLevel(0).level).toBe(1);
    expect(playerLevel(xpForLevel(2)).level).toBe(2);
    expect(playerLevel(xpForLevel(5) - 1).level).toBe(4);
  });
  it("ne donne l'XP d'un item qu'une fois (pas de farming)", () => {
    const s = createInitialState(NOW);
    const item = grammarItems("present-perfect")[0];
    const g1 = recordAttempt(s, item, true, "grammar", NOW);
    const g2 = recordAttempt(s, item, true, "grammar", NOW + 1000);
    expect(g1).toBeGreaterThan(0);
    expect(g2).toBe(0);
    expect(s.attempts.length).toBe(2);
  });
  it("une erreur alimente l'historique et la file de révision", () => {
    const s = createInitialState(NOW);
    const item = grammarItems("passive")[0];
    recordAttempt(s, item, false, "grammar", NOW, { response: "x", expected: "y" });
    expect(s.errors[0].topic).toBe("passive");
    expect(s.revision[item.id]).toBeDefined();
    expect(recordAttempt(s, item, true, "review", NOW + 2 * DAY)).toBeGreaterThan(0);
  });
  it("gère la série de jours", () => {
    const s = createInitialState(NOW);
    addXp(s, 30, NOW);
    expect(currentStreak(s, NOW)).toBe(1);
    addXp(s, 30, NOW + DAY);
    expect(currentStreak(s, NOW + DAY)).toBe(2);
    expect(currentStreak(s, NOW + 3 * DAY)).toBe(0);
    addXp(s, 30, NOW + 3 * DAY);
    expect(s.streak.current).toBe(1);
    expect(s.streak.best).toBe(2);
  });
  it("une journée avec trop peu d'activité ne compte pas dans la série", () => {
    const s = createInitialState(NOW);
    addXp(s, 5, NOW);
    expect(currentStreak(s, NOW)).toBe(0);
  });
});

describe("vocabulaire", () => {
  it("un mot est « appris » au premier rappel réussi", () => {
    const s = createInitialState(NOW);
    recordVocab(s, "deadline", "recognition", true, NOW, true);
    expect(s.cards.deadline.learnedAt).toBeUndefined();
    const xp = recordVocab(s, "deadline", "recall", true, NOW + 1000, true);
    expect(xp).toBeGreaterThan(0);
    expect(s.cards.deadline.learnedAt).toBeDefined();
    expect(s.days[dayKey(NOW)].wordsLearned).toBe(1);
  });
});

describe("personnalisation", () => {
  it("détecte une faiblesse puis sa résolution", () => {
    const s = createInitialState(NOW);
    const items = grammarItems("present-perfect");
    for (let i = 0; i < 8; i++) recordAttempt(s, items[i % items.length], i % 4 === 0, "grammar", NOW + i);
    const w = weaknesses(s, NOW).find((x) => x.topic === "present-perfect");
    expect(w?.status).toBe("weak");
    const recs = recommendations(s, NOW);
    expect(recs.some((r) => r.id === "weak-present-perfect")).toBe(true);
    for (let i = 0; i < 10; i++) recordAttempt(s, items[i % items.length], true, "grammar", NOW + 100 + i);
    const w2 = weaknesses(s, NOW).find((x) => x.topic === "present-perfect");
    expect(w2?.status).toBe("resolved");
  });
  it("estime une compétence à partir des tentatives", () => {
    const s = createInitialState(NOW);
    expect(estimateSkill(s, "grammar").level).toBeNull();
    const items = grammarItems("present-perfect");
    for (let i = 0; i < 10; i++) recordAttempt(s, items[i], true, "grammar", NOW + i);
    expect(estimateSkill(s, "grammar").level).toBe("B1");
    expect(progressToC1(s)).toBeGreaterThanOrEqual(0);
  });
});

describe("progression du parcours", () => {
  it("débloque les leçons séquentiellement", () => {
    const s = createInitialState(NOW);
    const c = chapters[0];
    expect(isLessonUnlocked(s, c, c.lessons[0].id)).toBe(true);
    expect(isLessonUnlocked(s, c, c.lessons[1].id)).toBe(false);
    expect(isChapterUnlocked(s, chapters[1])).toBe(false);
    expect(nextLesson(s)?.lesson?.id).toBe(c.lessons[0].id);
  });
  it("construit un boss à ≥ 80 % de réussite", () => {
    const items = bossItems(chapters[0], 42);
    expect(items.length).toBeGreaterThanOrEqual(10);
    expect(bossHearts(items.length) / items.length).toBeLessThanOrEqual(0.2);
    const again = bossItems(chapters[0], 42).map((i) => i.id);
    expect(again).toEqual(items.map((i) => i.id));
  });
  it("planifie un examen de niveau complet", () => {
    for (const lvl of ["B1", "B1+", "B2", "B2+", "C1"] as const) {
      const p = levelExamPlan(lvl, 3);
      expect(p.grammar.length, lvl).toBeGreaterThan(4);
      expect(p.vocabulary.length, lvl).toBeGreaterThanOrEqual(5);
      expect(p.listening, lvl).toBeDefined();
      expect(p.reading, lvl).toBeDefined();
      expect(p.writing, lvl).toBeDefined();
      expect(p.speaking, lvl).toBeDefined();
    }
  });
});

describe("test de positionnement", () => {
  it("arrête une compétence après un niveau échoué", () => {
    const answers: Record<string, boolean> = {};
    let next = nextPlacementItem(answers);
    let guard = 0;
    while (next && guard++ < 100) {
      // Réussit tout jusqu'à B1+, échoue au-delà.
      answers[next.item.id] = next.item.level === "B1" || next.item.level === "B1+";
      next = nextPlacementItem(answers);
    }
    expect(Object.keys(answers).length).toBeLessThan(placementItems.length);
    const r = scorePlacement(answers, NOW);
    expect(r.skills.grammar).toBe("B1+");
    // La lecture n'a pas d'item B1+ : B2 échoué → B1 ; la moyenne arrondie à l'inférieur donne B1.
    expect(r.startLevel).toBe("B1");
  });
  it("place en B1 minimum", () => {
    const answers: Record<string, boolean> = {};
    let next = nextPlacementItem(answers);
    while (next) {
      answers[next.item.id] = false;
      next = nextPlacementItem(answers);
    }
    const r = scorePlacement(answers, NOW);
    expect(r.overall).toBe("A2");
    expect(r.startLevel).toBe("B1");
  });
});

describe("analyse orale", () => {
  it("aligne la transcription sur la cible", () => {
    const t = align("I have been to London twice", "I been to London twice");
    expect(t.filter((x) => x.status === "missing").map((x) => x.word)).toEqual(["have"]);
    const r = scoreGuided("I have been to London twice", "I have been to London twice", 3, 0);
    expect(r.accuracy).toBe(1);
    expect(r.wpm).toBe(120);
  });
});

describe("quêtes et badges", () => {
  it("génère 3 quêtes stables pour une journée", () => {
    const a = dailyQuests(NOW).map((q) => q.id);
    expect(a).toHaveLength(3);
    expect(new Set(a).size).toBe(3);
    expect(dailyQuests(NOW + 1000).map((q) => q.id)).toEqual(a);
    const s = createInitialState(NOW);
    expect(dailyQuestStatus(s, NOW).every((q) => !q.done)).toBe(true);
  });
  it("débloque un badge sur condition réelle", () => {
    const s = createInitialState(NOW);
    expect(checkAchievements(s, NOW)).toHaveLength(0);
    s.profile.placement = { ts: NOW, skills: {}, overall: "B1", startLevel: "B1" };
    expect(checkAchievements(s, NOW).map((a) => a.id)).toContain("placement-done");
    expect(checkAchievements(s, NOW)).toHaveLength(0);
  });
  it("produit un plan de séance de la bonne durée", () => {
    const s = createInitialState(NOW);
    const total = sessionPlan(s, NOW).reduce((a, b) => a + b.minutes, 0);
    expect(total).toBe(45);
    expect(getGrammar("passive")).toBeDefined();
  });
});
