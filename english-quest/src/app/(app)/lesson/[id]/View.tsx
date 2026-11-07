"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { chapterOfLesson, getGrammar, getLesson, getListening, getReading, getSpeaking, getWriting, lessonWords, objectives } from "@/content";
import { useActiveTime, useStore } from "@/lib/store";
import { addXp, recordProgress, today } from "@/lib/engine/actions";
import { isLessonUnlocked } from "@/lib/engine/progression";
import { XP } from "@/lib/engine/xp";
import { ExerciseSet, ResultPanel, type SetResult } from "@/components/learn/Exercise";
import { VocabSession } from "@/components/learn/VocabSession";
import { GrammarExplanation } from "@/components/learn/GrammarExplanation";
import { ListeningPlayer } from "@/components/learn/ListeningPlayer";
import { ReadingView } from "@/components/learn/ReadingView";
import { Button, Card, Empty, LinkButton, Notice, PageHeader, cx } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

type StepId = "intro" | "vocab" | "grammar" | "skill" | "practice" | "done";
const PASS = 0.7;

export default function View() {
  const { id } = useParams<{ id: string }>();
  const lesson = getLesson(id);
  const chapter = chapterOfLesson(id);
  const { state, act } = useStore();
  useActiveTime("lesson");
  const [step, setStep] = useState<StepId>("intro");
  const [scores, setScores] = useState<Partial<Record<StepId, SetResult>>>({});
  const [final, setFinal] = useState<{ score: number; passed: boolean } | null>(null);

  const topic = lesson?.grammarTopic ? getGrammar(lesson.grammarTopic) : undefined;
  const words = useMemo(() => (lesson ? lessonWords(lesson.id) : []), [lesson]);
  const track = lesson?.listening ? getListening(lesson.listening) : undefined;
  const text = lesson?.reading ? getReading(lesson.reading) : undefined;
  const writing = lesson?.writing ? getWriting(lesson.writing) : undefined;
  const speaking = lesson?.speaking ? getSpeaking(lesson.speaking) : undefined;

  if (!lesson || !chapter) return <Empty icon="alert" title="Leçon introuvable"><Link href="/map" className="text-primary underline">Retour à la carte</Link></Empty>;
  if (!state) return null;
  if (!isLessonUnlocked(state, chapter, lesson.id))
    return (
      <Empty icon="lock" title="Leçon verrouillée">
        Terminez les leçons précédentes du chapitre « {chapter.titleFr} » pour débloquer celle-ci. <Link href="/map" className="text-primary underline">Voir le parcours</Link>
      </Empty>
    );

  const steps: { id: StepId; label: string; icon: string }[] = [
    { id: "intro", label: "Objectifs", icon: "target" },
    ...(words.length ? [{ id: "vocab" as const, label: "Vocabulaire", icon: "book" }] : []),
    ...(topic ? [{ id: "grammar" as const, label: "Grammaire", icon: "pen" }] : []),
    ...(track || text ? [{ id: "skill" as const, label: track ? "Écoute" : "Lecture", icon: track ? "headphones" : "library" }] : []),
    ...(topic ? [{ id: "practice" as const, label: "Pratique", icon: "bolt" }] : []),
    { id: "done", label: "Bilan", icon: "trophy" },
  ];
  const idx = steps.findIndex((s) => s.id === step);
  const goNext = () => {
    const n = steps[idx + 1];
    if (n?.id === "done") complete();
    else if (n) setStep(n.id);
  };

  function stepDone(id: StepId, r: SetResult) {
    setScores((s) => ({ ...s, [id]: r }));
  }

  function complete(extra?: Partial<Record<StepId, SetResult>>) {
    const all = Object.values({ ...scores, ...extra }).filter(Boolean) as SetResult[];
    const evaluated = all.reduce((a, r) => a + r.evaluated, 0);
    const correct = all.reduce((a, r) => a + r.correct, 0);
    const score = evaluated ? correct / evaluated : 0;
    const passed = score >= PASS;
    setFinal({ score, passed });
    setStep("done");
    act((d, now) => {
      const first = !d.progress[`lesson:${lesson!.id}`]?.completedAt;
      recordProgress(d, `lesson:${lesson!.id}`, score, now, passed);
      if (passed && first) {
        today(d, now).lessonsDone += 1;
        return addXp(d, XP.lessonComplete, now);
      }
    });
  }

  const practiceItems = topic ? topic.exercises.hard : [];
  const grammarItems = topic ? [...topic.exercises.easy, ...topic.exercises.medium] : [];

  return (
    <div className="space-y-6">
      <PageHeader kicker={`${chapter.level} · ${chapter.titleFr}`} title={lesson.titleFr} subtitle={lesson.title} icon="play">
        <LinkButton href="/map" variant="ghost" icon="arrowLeft">Parcours</LinkButton>
      </PageHeader>

      <nav aria-label="Étapes de la leçon" className="overflow-x-auto">
        <ol className="flex min-w-max gap-2">
          {steps.map((s, i) => (
            <li key={s.id} className={cx("flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold", i === idx ? "bg-primary text-white" : i < idx ? "bg-green-soft text-green" : "bg-surface-2 text-faint")} aria-current={i === idx ? "step" : undefined}>
              <Icon name={i < idx ? "check" : s.icon} size={15} />
              {s.label}
            </li>
          ))}
        </ol>
      </nav>

      {step === "intro" ? (
        <Card className="space-y-5">
          <h2 className="font-display text-xl font-bold">Ce que vous allez maîtriser</h2>
          <ul className="space-y-2">
            {lesson.objectives.map((oid) => {
              const o = objectives.find((x) => x.id === oid);
              return o ? (
                <li key={oid} className="flex items-start gap-2">
                  <Icon name="target" size={18} className="mt-0.5 text-primary" />
                  <span>{o.descriptorFr}</span>
                </li>
              ) : null;
            })}
          </ul>
          <div className="grid gap-2 sm:grid-cols-2 text-sm">
            {words.length ? <p className="rounded-xl bg-surface-2 p-3"><Icon name="book" size={16} className="mr-1 inline text-primary" />{words.length} mots et expressions</p> : null}
            {topic ? <p className="rounded-xl bg-surface-2 p-3"><Icon name="pen" size={16} className="mr-1 inline text-violet" />{topic.titleFr}</p> : null}
            {track ? <p className="rounded-xl bg-surface-2 p-3"><Icon name="headphones" size={16} className="mr-1 inline text-green" />Écoute : {track.title}</p> : null}
            {text ? <p className="rounded-xl bg-surface-2 p-3"><Icon name="library" size={16} className="mr-1 inline text-primary" />Lecture : {text.title}</p> : null}
          </div>
          <Notice tone="blue" icon="info">La leçon est validée avec au moins {Math.round(PASS * 100)} % de bonnes réponses. Les erreurs sont automatiquement programmées en révision.</Notice>
          <div className="flex justify-end">
            <Button onClick={goNext} iconRight="arrowRight">Commencer</Button>
          </div>
        </Card>
      ) : null}

      {step === "vocab" ? (
        <VocabSession
          wordIds={words.map((w) => w.id)}
          mode="learn"
          onFinish={(st) => {
            stepDone("vocab", { correct: st.correct, evaluated: st.total, total: st.total, score: st.total ? st.correct / st.total : 0 });
            goNext();
          }}
        />
      ) : null}

      {step === "grammar" && topic ? (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <GrammarExplanation topic={topic} short />
            <Link href={`/grammar/${topic.id}`} className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">Cours complet →</Link>
          </Card>
          <Card className="lg:col-span-3">
            <ExerciseSet
              items={grammarItems}
              source="lesson"
              title={topic.titleFr}
              onComplete={(r) => {
                stepDone("grammar", r);
                goNext();
              }}
            />
          </Card>
        </div>
      ) : null}

      {step === "skill" ? (
        track ? (
          <ListeningPlayer track={track} source="lesson" onComplete={(r) => stepDone("skill", r)} />
        ) : text ? (
          <ReadingView text={text} source="lesson" onComplete={(r) => stepDone("skill", r)} />
        ) : null
      ) : null}
      {step === "skill" && scores.skill ? (
        <div className="flex justify-end">
          <Button onClick={goNext} iconRight="arrowRight">Étape suivante</Button>
        </div>
      ) : null}

      {step === "practice" ? (
        <Card>
          <ExerciseSet
            items={practiceItems}
            source="lesson"
            title="Pratique avancée"
            onComplete={(r) => {
              stepDone("practice", r);
              complete({ practice: r });
            }}
          />
        </Card>
      ) : null}

      {step === "done" && final ? (
        <div className="space-y-4">
          <ResultPanel result={summary(scores)} passMark={PASS} onRetry={() => { setScores({}); setFinal(null); setStep("intro"); }}>
            {final.passed ? <LinkButton href="/map" iconRight="arrowRight">Continuer l&apos;aventure</LinkButton> : null}
          </ResultPanel>
          {(writing || speaking) && final.passed ? (
            <Card className="space-y-3">
              <h3 className="font-semibold">Pour aller plus loin : production</h3>
              <p className="text-sm text-muted">Mettez en pratique la leçon dans une production évaluée (elle compte pour vos compétences orales et écrites).</p>
              <div className="flex flex-wrap gap-2">
                {writing ? <LinkButton href={`/writing/${writing.id}`} variant="secondary" icon="feather">{writing.title}</LinkButton> : null}
                {speaking ? <LinkButton href={`/speaking/${speaking.id}`} variant="secondary" icon="mic">{speaking.title}</LinkButton> : null}
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}

    </div>
  );
}

function summary(scores: Partial<Record<StepId, SetResult>>) {
  const all = Object.values(scores).filter(Boolean) as SetResult[];
  const evaluated = all.reduce((a, r) => a + r.evaluated, 0);
  const correct = all.reduce((a, r) => a + r.correct, 0);
  return { evaluated, correct, total: all.reduce((a, r) => a + r.total, 0), score: evaluated ? correct / evaluated : 0 };
}
