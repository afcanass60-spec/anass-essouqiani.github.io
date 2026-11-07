"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Cefr, Item, Skill } from "@/lib/types";
import { getListening, getReading, getSpeaking, getWriting } from "@/content";
import { useStore } from "@/lib/store";
import { addXp, today } from "@/lib/engine/actions";
import { XP } from "@/lib/engine/xp";
import { uid, type ExamResult } from "@/lib/state";
import { isAuto } from "@/lib/engine/answer";
import { ExerciseSet } from "./Exercise";
import { ListeningPlayer } from "./ListeningPlayer";
import { ReadingView } from "./ReadingView";
import { WritingTaskView } from "./WritingTaskView";
import { SpeakingTaskView } from "./SpeakingTaskView";
import { SKILL_ICONS, SKILL_LABELS } from "@/lib/format";
import { Button, Card, Notice, Progress, cx } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

/* =========================================================
   Moteur d'examen : sections chronométrées, une compétence
   par section, résultat par compétence.
   ========================================================= */

export interface RunnerSection {
  skill: Skill;
  title: string;
  minutes: number;
  items?: Item[];
  listening?: string;
  reading?: string;
  writing?: string;
  speaking?: string;
}

function Timer({ minutes, onExpire, running }: { minutes: number; onExpire: () => void; running: boolean }) {
  const [left, setLeft] = useState(minutes * 60);
  const expireRef = useRef(onExpire);
  useEffect(() => {
    expireRef.current = onExpire;
  });
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);
  useEffect(() => {
    if (left === 0 && running) expireRef.current();
  }, [left, running]);
  const m = Math.floor(left / 60);
  const s = left % 60;
  return (
    <span className={cx("flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-sm font-bold", left < 60 ? "bg-red-soft text-red" : "bg-surface-2")} role="timer" aria-label={`Temps restant : ${m} minutes ${s} secondes`}>
      <Icon name="clock" size={15} />
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

export function ExamRunner({
  examId,
  title,
  level,
  kind,
  sections,
  onFinish,
}: {
  examId: string;
  title: string;
  level: Cefr;
  kind: "mock" | "level";
  sections: RunnerSection[];
  onFinish: (results: ExamResult[]) => void;
}) {
  const { act } = useStore();
  const [index, setIndex] = useState(-1);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [startedAt] = useState(() => Date.now());
  const [sectionDone, setSectionDone] = useState(false);
  const section = sections[index];

  const sectionItems = useMemo(() => {
    if (!section) return [];
    if (section.items?.length) return section.items;
    if (section.listening) return getListening(section.listening)?.questions.filter(isAuto) ?? [];
    if (section.reading) return getReading(section.reading)?.questions.filter(isAuto) ?? [];
    return [];
  }, [section]);

  function record(r: ExamResult) {
    setResults((prev) => [...prev.filter((x) => x.skill !== r.skill), r]);
    setSectionDone(true);
  }

  function next() {
    setSectionDone(false);
    if (index + 1 >= sections.length) {
      const final = results;
      act((d, now) => {
        d.exams.push({ id: uid(), examId, kind, level, startedAt, finishedAt: now, results: final });
        today(d, now).examsDone += 1;
        const auto = final.filter((r) => r.evaluated && r.max > 0);
        const pct = auto.length ? auto.reduce((a, r) => a + r.score / r.max, 0) / auto.length : 0;
        return addXp(d, kind === "mock" ? Math.round(XP.examComplete * (0.5 + pct / 2)) : 0, now);
      });
      onFinish(final);
    } else setIndex(index + 1);
  }

  // Temps écoulé : la section est clôturée avec les réponses déjà données.
  const expire = () => {
    if (!sectionDone && section) record({ skill: section.skill, score: 0, max: sectionItems.length || 0, evaluated: sectionItems.length > 0 });
  };

  if (index < 0) {
    return (
      <Card className="space-y-4">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        <ol className="space-y-2">
          {sections.map((s, i) => (
            <li key={i} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
              <Icon name={SKILL_ICONS[s.skill]} className="text-primary" />
              <span className="flex-1 font-medium">{s.title}</span>
              <span className="text-sm text-muted">{s.minutes} min</span>
            </li>
          ))}
        </ol>
        <Notice tone="amber" icon="info" title="Évaluation d'entraînement">
          Les résultats sont indicatifs et ne constituent pas une certification officielle. Chaque section est chronométrée ; à la fin du temps, la section est clôturée.
        </Notice>
        <div className="flex justify-end"><Button size="lg" onClick={() => setIndex(0)} iconRight="arrowRight">Démarrer l&apos;examen</Button></div>
      </Card>
    );
  }

  if (!section) return null;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 font-semibold"><Icon name={SKILL_ICONS[section.skill]} className="text-primary" />Section {index + 1}/{sections.length} — {section.title}</span>
        <span className="ml-auto"><Timer key={index} minutes={section.minutes} onExpire={expire} running={!sectionDone} /></span>
      </div>
      <Progress value={index / sections.length} tone="grad" label="Progression de l'examen" />

      {section.listening && !sectionDone ? (
        <ListeningPlayer track={getListening(section.listening)!} source={kind === "level" ? "level-exam" : "exam"} showQuestions={false} />
      ) : null}
      {section.reading && !sectionDone ? <ReadingView text={getReading(section.reading)!} source="exam" showQuestions={false} /> : null}

      {sectionItems.length && !sectionDone ? (
        <Card>
          <ExerciseSet key={`s${index}`} items={sectionItems} source={kind === "level" ? "level-exam" : "exam"} onComplete={(r) => record({ skill: section.skill, score: r.correct, max: r.evaluated, evaluated: true })} />
        </Card>
      ) : null}

      {section.writing && !sectionDone ? (
        <WritingTaskView task={getWriting(section.writing)!} examMode onComplete={(o) => record({ skill: "writing", score: o.rating ?? 0, max: o.evaluated ? 5 : 0, rating: o.rating, evaluated: o.evaluated })} />
      ) : null}
      {section.speaking && !sectionDone ? (
        <SpeakingTaskView task={getSpeaking(section.speaking)!} onComplete={(o) => record({ skill: "speaking", score: o.rating ?? 0, max: o.evaluated ? 5 : 0, rating: o.rating, evaluated: o.evaluated })} />
      ) : null}

      {sectionDone ? (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold">Section terminée.</p>
          <Button onClick={next} iconRight="arrowRight">{index + 1 >= sections.length ? "Voir les résultats" : "Section suivante"}</Button>
        </Card>
      ) : section.writing || section.speaking ? (
        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => record({ skill: section.skill, score: 0, max: 0, evaluated: false })}>Passer cette section (non évaluée)</Button>
        </div>
      ) : null}
    </div>
  );
}

export function ResultsTable({ results }: { results: ExamResult[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {results.map((r) => {
        const pct = r.max ? r.score / r.max : 0;
        return (
          <li key={r.skill} className="rounded-xl bg-surface-2 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 font-semibold"><Icon name={SKILL_ICONS[r.skill]} size={18} className="text-primary" />{SKILL_LABELS[r.skill]}</span>
              <span className="font-display text-lg font-bold">{r.evaluated ? (r.rating !== undefined ? `${r.rating.toFixed(1)}/5` : `${Math.round(pct * 100)} %`) : "—"}</span>
            </div>
            {r.evaluated ? <Progress value={pct} tone={pct >= 0.6 ? "green" : "amber"} label={SKILL_LABELS[r.skill]} /> : <p className="text-xs text-faint">Non évalué (IA non disponible ou section passée)</p>}
          </li>
        );
      })}
    </ul>
  );
}
