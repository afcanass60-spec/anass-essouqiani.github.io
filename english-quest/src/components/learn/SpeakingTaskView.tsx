"use client";

import { useEffect, useRef, useState } from "react";
import type { SpeakingFeedback, SpeakingTask } from "@/lib/types";
import { SPEAKING_KIND_LABELS } from "@/content/speaking";
import { speak, stopSpeaking, useRecognition, useVoiceRecorder } from "@/lib/audio";
import { ApiError, useApi, useStore } from "@/lib/store";
import { addXp, recordCorrections, recordProgress, today } from "@/lib/engine/actions";
import { scoreGuided, type GuidedResult } from "@/lib/engine/speech";
import { XP } from "@/lib/engine/xp";
import { dayKey, uid } from "@/lib/state";
import { Scene } from "./Scenes";
import { SpeakButton, useAiUsable, AiNotice } from "./shared";
import { Button, Card, LevelPill, Notice, Pill, cx } from "@/components/ui/primitives";

const GUIDED = new Set(["repeat", "read-aloud"]);

export interface SpeakingOutcome {
  /** Note /5 si l'oral a été évalué (comparaison guidée ou IA). */
  rating?: number;
  evaluated: boolean;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm"><span>{label}</span><span className="font-semibold">{value}/5</span></div>
      <div className="mt-1 h-2 rounded-full bg-line-strong/60"><div className="h-full rounded-full bg-hero" style={{ width: `${(value / 5) * 100}%` }} /></div>
    </div>
  );
}

export function SpeakingTaskView({ task, onComplete }: { task: SpeakingTask; onComplete?: (o: SpeakingOutcome) => void }) {
  const { state, act } = useStore();
  const accent = state?.settings.accent ?? "en-GB";
  const rec = useRecognition(accent);
  const voice = useVoiceRecorder();
  const api = useApi();
  const ai = useAiUsable();
  const guided = GUIDED.has(task.kind);
  const [showText, setShowText] = useState(task.kind !== "repeat");
  const [elapsed, setElapsed] = useState(0);
  const [guidedResult, setGuidedResult] = useState<GuidedResult | null>(null);
  const [transcript, setTranscript] = useState<{ text: string; duration: number; pauses: number } | null>(null);
  const [feedback, setFeedback] = useState<SpeakingFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { stopSpeaking(); if (timer.current) clearInterval(timer.current); }, []);

  function start() {
    stopSpeaking();
    setGuidedResult(null);
    setTranscript(null);
    setFeedback(null);
    setError(null);
    setElapsed(0);
    rec.start();
    void voice.start();
    const t0 = Date.now();
    timer.current = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 500);
  }

  async function stop() {
    if (timer.current) clearInterval(timer.current);
    voice.stop();
    const r = await rec.stop();
    setTranscript({ text: r.transcript, duration: r.durationSec, pauses: r.longPauses });
    const words = r.transcript.split(/\s+/).filter(Boolean).length;
    const now = Date.now();
    if (guided && task.target) {
      const g = scoreGuided(task.target, r.transcript, r.durationSec, r.longPauses);
      setGuidedResult(g);
      act((d, n) => {
        const day = today(d, n);
        day.speakingSeconds += Math.round(r.durationSec);
        day.speakingTasks += 1;
        d.speaking.push({ id: uid(), taskId: task.id, level: task.level, ts: n, transcript: r.transcript, durationSec: r.durationSec, wpm: g.wpm, accuracy: g.accuracy });
        const p = recordProgress(d, `speaking:${task.id}`, g.accuracy, n, g.accuracy >= 0.8);
        if (g.accuracy >= 0.7 && p.data?.xpDay !== dayKey(n)) {
          p.data = { ...(p.data ?? {}), xpDay: dayKey(n) };
          return addXp(d, XP.speakingTask, n);
        }
      });
      onComplete?.({ rating: Math.round(g.accuracy * 50) / 10, evaluated: true });
    } else {
      act((d, n) => {
        const day = today(d, n);
        day.speakingSeconds += Math.round(r.durationSec);
        day.speakingTasks += 1;
      }, { silent: true });
      if (!ai.usable || words < 5) {
        act((d) => void d.speaking.push({ id: uid(), taskId: task.id, level: task.level, ts: now, transcript: r.transcript, durationSec: r.durationSec, wpm: Math.round((words / r.durationSec) * 60) }), { silent: true });
        onComplete?.({ evaluated: false });
      }
    }
  }

  async function analyse() {
    if (!transcript) return;
    setLoading(true);
    setError(null);
    const words = transcript.text.split(/\s+/).filter(Boolean).length;
    const wpm = Math.round((words / transcript.duration) * 60);
    try {
      const fb = await api<SpeakingFeedback>("/api/ai/speaking", { taskId: task.id, transcript: transcript.text, durationSec: transcript.duration, wpm, longPauses: transcript.pauses });
      setFeedback(fb);
      const avg = (fb.scores.fluency + fb.scores.accuracy + fb.scores.range + fb.scores.coherence) / 4;
      act((d, n) => {
        d.speaking.push({ id: uid(), taskId: task.id, level: task.level, ts: n, transcript: transcript.text, durationSec: transcript.duration, wpm, feedback: fb });
        recordCorrections(d, fb.errors, "speaking", "speaking", n);
        const p = recordProgress(d, `speaking:${task.id}`, avg / 5, n, avg >= 3);
        if (transcript.duration >= 20 && p.data?.xpDay !== dayKey(n)) {
          p.data = { ...(p.data ?? {}), xpDay: dayKey(n) };
          return addXp(d, XP.speakingTask + Math.round(avg * 3), n);
        }
      });
      onComplete?.({ rating: avg, evaluated: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  const words = transcript?.text.split(/\s+/).filter(Boolean).length ?? 0;

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="violet">{SPEAKING_KIND_LABELS[task.kind]}</Pill>
          <LevelPill level={task.level} />
          <Pill icon="clock">≈ {task.seconds} s</Pill>
        </div>
        <p className="text-muted">{task.instructionFr}</p>
        {task.scene ? <Scene name={task.scene} /> : null}
        {task.prompt ? <p className="font-display text-xl font-semibold" lang="en">{task.prompt}</p> : null}
        {task.target ? (
          <div className="space-y-2 rounded-xl bg-surface-2 p-4">
            <div className="flex items-center gap-2">
              <SpeakButton text={task.target} label="Écouter le modèle" />
              <SpeakButton text={task.target} rate={0.75} label="Écouter lentement" className="bg-violet-soft text-violet hover:bg-violet" />
              {task.kind === "repeat" ? (
                <Button size="sm" variant="ghost" icon={showText ? "eyeOff" : "eye"} onClick={() => setShowText(!showText)}>{showText ? "Masquer" : "Afficher"} le texte</Button>
              ) : null}
            </div>
            {showText ? <p className="text-lg leading-relaxed" lang="en">{task.target}</p> : <p className="text-sm text-faint">Écoutez puis répétez sans lire.</p>}
          </div>
        ) : null}
        {task.hints?.length ? (
          <div className="flex flex-wrap gap-2 text-sm">{task.hints.map((h) => <span key={h} className="rounded-lg border border-line px-2 py-1 text-muted" lang="en">{h}</span>)}</div>
        ) : null}
      </Card>

      {!rec.supported ? (
        <Notice tone="amber" icon="mic" title="Reconnaissance vocale indisponible sur ce navigateur">
          Utilisez Chrome ou Edge (ordinateur ou Android) pour l&apos;analyse automatique. Vous pouvez tout de même vous enregistrer et vous réécouter.
        </Notice>
      ) : null}
      {!guided ? <AiNotice what="L'analyse détaillée des réponses libres" /> : null}

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {!rec.listening ? (
            <Button onClick={start} icon="mic" size="lg" disabled={!rec.supported && !voice.supported}>
              {transcript ? "Recommencer" : "Parler"}
            </Button>
          ) : (
            <Button onClick={stop} variant="danger" icon="stop" size="lg">Terminer ({elapsed} s)</Button>
          )}
          {rec.listening ? <span className="flex items-center gap-2 text-sm text-red"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red" />Enregistrement…</span> : null}
          {voice.url && !rec.listening ? (
            <audio controls src={voice.url} className="h-10 max-w-full" aria-label="Réécouter mon enregistrement" />
          ) : null}
        </div>
        {rec.error ? <Notice tone="red" title="Micro">{rec.error}</Notice> : null}
        {rec.listening || transcript ? (
          <div className="rounded-xl bg-surface-2 p-4 min-h-16" aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-wide text-faint mb-1">Transcription</p>
            <p lang="en">{rec.listening ? `${rec.transcript} ${rec.interim}` : transcript?.text || <span className="text-faint">(rien n&apos;a été reconnu)</span>}</p>
          </div>
        ) : null}
      </Card>

      {guidedResult ? (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center gap-6">
            <div><p className="text-sm text-muted">Intelligibilité</p><p className="font-display text-3xl font-bold">{Math.round(guidedResult.accuracy * 100)} %</p></div>
            <div><p className="text-sm text-muted">Débit</p><p className="font-display text-3xl font-bold">{guidedResult.wpm}<span className="text-base font-normal text-muted"> mots/min</span></p></div>
          </div>
          <p className="leading-loose" lang="en">
            {guidedResult.tokens.map((t, i) => (
              <span key={i} className={cx("mr-1 rounded px-1", t.status === "ok" && "text-green", t.status === "missing" && "bg-red-soft text-red underline decoration-dotted cursor-pointer", t.status === "extra" && "text-faint line-through")} onClick={() => t.status === "missing" && speak(t.word, { lang: accent, rate: 0.8 })} title={t.status === "missing" ? "Non reconnu — cliquer pour écouter" : undefined}>
                {t.word}
              </span>
            ))}
          </p>
          <p className="text-sm text-muted">{guidedResult.feedbackFr}</p>
          <p className="text-xs text-faint">Méthode : comparaison de la transcription de la reconnaissance vocale avec le texte cible. L&apos;accent n&apos;est pas noté — seule compte la compréhension de votre énoncé.</p>
        </Card>
      ) : null}

      {transcript && !guided ? (
        <Card className="space-y-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <span>Durée : <strong>{Math.round(transcript.duration)} s</strong></span>
            <span>Mots : <strong>{words}</strong></span>
            <span>Débit : <strong>{Math.round((words / transcript.duration) * 60)} mots/min</strong></span>
            <span>Pauses longues : <strong>{transcript.pauses}</strong></span>
          </div>
          {!feedback ? (
            ai.usable ? (
              <Button onClick={analyse} loading={loading} disabled={words < 5} icon="sparkles">Analyser ma réponse</Button>
            ) : (
              <p className="text-sm text-faint">Votre production a été enregistrée comme pratique. L&apos;analyse détaillée (fluidité, précision, richesse, cohérence) nécessite l&apos;IA.</p>
            )
          ) : null}
          {error ? <Notice tone="red" title="Analyse impossible">{error}</Notice> : null}
          {feedback ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <ScoreBar label="Fluidité" value={feedback.scores.fluency} />
                <ScoreBar label="Précision" value={feedback.scores.accuracy} />
                <ScoreBar label="Richesse" value={feedback.scores.range} />
                <ScoreBar label="Cohérence" value={feedback.scores.coherence} />
              </div>
              <Notice tone="violet" icon="sparkles" title={`Estimation de la performance : ${feedback.cefr}`}>{feedback.summaryFr}</Notice>
              {feedback.errors.length ? (
                <ul className="space-y-2">
                  {feedback.errors.map((c, i) => (
                    <li key={i} className="card-flat p-3 text-sm">
                      <span className="text-red line-through" lang="en">{c.original}</span> → <span className="font-semibold text-green" lang="en">{c.corrected}</span>
                      <p className="mt-1 text-muted">{c.explanationFr}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
              {feedback.betterVersion ? (
                <div className="rounded-xl bg-surface-2 p-4">
                  <div className="mb-1 flex items-center gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-faint">Version plus naturelle</p><SpeakButton text={feedback.betterVersion} size="sm" /></div>
                  <p lang="en">{feedback.betterVersion}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
