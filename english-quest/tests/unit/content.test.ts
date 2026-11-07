import { describe, expect, it } from "vitest";
import {
  allLessons,
  chapters,
  contentStats,
  exams,
  getGrammar,
  getListening,
  getReading,
  getSpeaking,
  getWriting,
  grammarItems,
  grammarTopics,
  itemIndex,
  lessonWords,
  objectives,
  vocabulary,
} from "@/content";
import { placementItems } from "@/content/placement";
import { countGaps, checkItem, isAuto } from "@/lib/engine/answer";
import type { Item } from "@/lib/types";

const allItems: Item[] = [
  ...grammarTopics.flatMap((t) => grammarItems(t.id)),
  ...placementItems.map((p) => p.item),
  ...[...itemIndex.values()],
];

describe("contenu pédagogique", () => {
  it("a des identifiants uniques", () => {
    const ids = new Map<string, Item>();
    for (const it of allItems) {
      const prev = ids.get(it.id);
      if (prev) expect(prev).toBe(it);
      ids.set(it.id, it);
    }
    const words = new Set(vocabulary.map((w) => w.id));
    expect(words.size).toBe(vocabulary.length);
  });

  it("chaque cours de grammaire est complet (FR, EN, exemples, erreurs, 3 niveaux, examen)", () => {
    for (const t of grammarTopics) {
      expect(t.explanationFr.length, t.id).toBeGreaterThan(0);
      expect(t.explanationEn.length, t.id).toBeGreaterThan(0);
      expect(t.examples.length, t.id).toBeGreaterThanOrEqual(3);
      expect(t.mistakes.length, t.id).toBeGreaterThanOrEqual(3);
      expect(t.exercises.easy.length, t.id).toBeGreaterThanOrEqual(3);
      expect(t.exercises.medium.length, t.id).toBeGreaterThanOrEqual(3);
      expect(t.exercises.hard.length, t.id).toBeGreaterThanOrEqual(3);
      expect(t.exam.length, t.id).toBeGreaterThanOrEqual(5);
      const types = new Set(grammarItems(t.id).map((i) => i.type));
      expect(types.size, `${t.id} doit varier les types d'exercices`).toBeGreaterThanOrEqual(3);
    }
  });

  it("les items sont bien formés et la réponse attendue est acceptée", () => {
    for (const it of allItems) {
      if (!isAuto(it)) continue;
      if (it.type === "mcq") {
        expect(it.answer, it.id).toBeGreaterThanOrEqual(0);
        expect(it.answer, it.id).toBeLessThan(it.options.length);
        expect(checkItem(it, it.answer).correct, it.id).toBe(true);
      } else if (it.type === "gap") {
        expect(countGaps(it.text), it.id).toBe(it.answers.length);
        expect(checkItem(it, it.answers.map((a) => a[0])).correct, it.id).toBe(true);
      } else {
        expect(it.answers.length, it.id).toBeGreaterThan(0);
        expect(checkItem(it, it.answers[0]).correct, it.id).toBe(true);
      }
    }
  });

  it("les mots à remettre dans l'ordre correspondent à une réponse", () => {
    for (const it of allItems) {
      if (it.type !== "order") continue;
      const sorted = (s: string) => s.toLowerCase().replace(/[^a-z' ]/g, "").split(/\s+/).filter(Boolean).sort().join(" ");
      expect(sorted(it.answers[0]), it.id).toBe(sorted(it.words.join(" ")));
    }
  });

  it("toutes les références du parcours existent", () => {
    for (const l of allLessons) {
      if (l.grammarTopic) expect(getGrammar(l.grammarTopic), l.id).toBeDefined();
      if (l.listening) expect(getListening(l.listening), l.id).toBeDefined();
      if (l.reading) expect(getReading(l.reading), l.id).toBeDefined();
      if (l.writing) expect(getWriting(l.writing), l.id).toBeDefined();
      if (l.speaking) expect(getSpeaking(l.speaking), l.id).toBeDefined();
      for (const o of l.objectives) expect(objectives.find((x) => x.id === o), `${l.id}:${o}`).toBeDefined();
      if (l.vocabTheme) expect(lessonWords(l.id).length, l.id).toBeGreaterThanOrEqual(4);
    }
    for (const e of exams)
      for (const s of e.sections) {
        if (s.listening) expect(getListening(s.listening), e.id).toBeDefined();
        if (s.reading) expect(getReading(s.reading), e.id).toBeDefined();
        if (s.writing) expect(getWriting(s.writing), e.id).toBeDefined();
        if (s.speaking) expect(getSpeaking(s.speaking), e.id).toBeDefined();
      }
  });

  it("les objectifs référencés par les items existent", () => {
    const ids = new Set(objectives.map((o) => o.id));
    for (const it of allItems) if (it.objective) expect(ids.has(it.objective), `${it.id}:${it.objective}`).toBe(true);
  });

  it("chaque niveau a des chapitres et un boss", () => {
    for (const lvl of ["B1", "B1+", "B2", "B2+", "C1"]) {
      expect(chapters.filter((c) => c.level === lvl).length).toBeGreaterThanOrEqual(2);
    }
    expect(contentStats.grammarTopics).toBeGreaterThanOrEqual(16);
    expect(contentStats.words).toBeGreaterThanOrEqual(200);
  });

  it("le vocabulaire est complet", () => {
    for (const w of vocabulary) {
      expect(w.ipa.startsWith("/"), w.id).toBe(true);
      expect(w.defEn.length, w.id).toBeGreaterThan(5);
      expect(w.fr.length, w.id).toBeGreaterThan(1);
      expect(w.example.length, w.id).toBeGreaterThan(10);
    }
  });
});
