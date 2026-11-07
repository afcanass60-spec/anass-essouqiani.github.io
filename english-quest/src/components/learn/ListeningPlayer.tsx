"use client";

import { useEffect, useRef, useState } from "react";
import type { ListeningTrack } from "@/lib/types";
import type { Source } from "@/lib/state";
import { speak, stopSpeaking, useVoicesReady } from "@/lib/audio";
import { useStore } from "@/lib/store";
import { recordProgress, today } from "@/lib/engine/actions";
import { ExerciseSet, ResultPanel, type SetResult } from "./Exercise";
import { Button, Card, LevelPill, Notice, Pill, cx } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

const ACCENT_LABEL = { "en-GB": "🇬🇧 britannique", "en-US": "🇺🇸 américain", intl: "🌍 international" } as const;
const SPEAKER_COLORS = ["#3d7bff", "#ff7ab6", "#2fd58b", "#ffb547"];

export function ListeningPlayer({ track, source = "listening", onComplete, showQuestions = true }: { track: ListeningTrack; source?: Source; onComplete?: (r: SetResult) => void; showQuestions?: boolean }) {
  const { state, act } = useStore();
  const voices = useVoicesReady();
  const [rate, setRate] = useState(() => Math.round(track.baseRate * (state?.settings.speechRate ?? 1) * 100) / 100);
  const [current, setCurrent] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [subtitles, setSubtitles] = useState(false);
  const [transcript, setTranscript] = useState(false);
  const [plays, setPlays] = useState(0);
  const [phase, setPhase] = useState<"listen" | "questions" | "done">("listen");
  const [result, setResult] = useState<SetResult | null>(null);
  const stopRef = useRef(false);

  useEffect(() => () => stopSpeaking(), []);

  function playLine(i: number, chain: boolean) {
    const line = track.lines[i];
    if (!line) {
      setPlaying(false);
      setCurrent(null);
      return;
    }
    const spk = track.speakers[line.speaker];
    setCurrent(i);
    speak(line.text, {
      lang: spk.accent,
      gender: spk.gender,
      voiceIndex: line.speaker,
      rate,
      onEnd: () => {
        if (stopRef.current) return;
        if (chain) playLine(i + 1, true);
        else {
          setPlaying(false);
          setCurrent(null);
        }
      },
    });
  }

  function playAll(from = 0) {
    stopSpeaking();
    stopRef.current = false;
    setPlaying(true);
    setPlays((p) => p + 1);
    playLine(from, true);
  }

  function stop() {
    stopRef.current = true;
    stopSpeaking();
    setPlaying(false);
    setCurrent(null);
  }

  function replay(i: number) {
    stopSpeaking();
    stopRef.current = false;
    setPlaying(true);
    playLine(i, false);
  }

  function finish(r: SetResult) {
    setResult(r);
    setPhase("done");
    setTranscript(true);
    act((d, now) => {
      const first = !d.progress[`listening:${track.id}`]?.completedAt;
      recordProgress(d, `listening:${track.id}`, r.score, now, true, { plays });
      if (first || source === "listening") today(d, now).listeningDone += 1;
    });
    onComplete?.(r);
  }

  const showLines = transcript || phase === "done";

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <LevelPill level={track.level} />
          <Pill tone="gray">{track.genre}</Pill>
          {[...new Set(track.speakers.map((s) => s.accent))].map((a) => (
            <Pill key={a} tone="blue">{ACCENT_LABEL[a]}</Pill>
          ))}
        </div>
        <p className="text-sm text-muted">{track.context}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {track.speakers.map((s, i) => (
            <span key={s.name} className="flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: SPEAKER_COLORS[i % 4] }} />
              {s.name}
            </span>
          ))}
        </div>

        {!voices.supported ? (
          <Notice tone="red" title="Synthèse vocale indisponible">Votre navigateur ne prend pas en charge la synthèse vocale. Utilisez Chrome, Edge ou Safari, ou affichez la transcription.</Notice>
        ) : voices.ready && voices.englishVoices === 0 ? (
          <Notice tone="amber" title="Aucune voix anglaise installée">Installez une voix anglaise dans les paramètres de votre système pour une écoute réaliste.</Notice>
        ) : null}

        {/* Lecteur */}
        <div className="rounded-2xl bg-surface-2 p-4">
          <div className="flex flex-wrap items-center gap-3">
            {!playing ? (
              <Button onClick={() => playAll(0)} icon="play" aria-label="Écouter l'enregistrement">
                {plays ? "Réécouter" : "Écouter"}
              </Button>
            ) : (
              <Button onClick={stop} variant="secondary" icon="stop">
                Arrêter
              </Button>
            )}
            <label className="flex items-center gap-2 text-sm">
              <Icon name="slow" size={16} className="text-muted" />
              <span className="sr-only">Vitesse</span>
              <input type="range" min={0.6} max={1.4} step={0.05} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-28 accent-[var(--primary)]" aria-valuetext={`${rate}×`} />
              <span className="w-10 font-mono text-xs">{rate.toFixed(2)}×</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={subtitles} onChange={(e) => setSubtitles(e.target.checked)} className="accent-[var(--primary)]" />
              Sous-titres
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={transcript} onChange={(e) => setTranscript(e.target.checked)} className="accent-[var(--primary)]" />
              Transcription
            </label>
          </div>
          <div className="mt-3 flex gap-1" aria-hidden>
            {track.lines.map((_, i) => (
              <button key={i} onClick={() => replay(i)} className={cx("h-2 flex-1 rounded-full transition", current === i ? "bg-primary" : current !== null && i < current ? "bg-primary/50" : "bg-line-strong")} title={`Réécouter le passage ${i + 1}`} tabIndex={-1} />
            ))}
          </div>
          {subtitles && current !== null ? (
            <p className="mt-3 rounded-xl bg-bg/60 p-3 text-center font-medium" aria-live="polite" lang="en">
              <span style={{ color: SPEAKER_COLORS[track.lines[current].speaker % 4] }}>{track.speakers[track.lines[current].speaker].name}: </span>
              {track.lines[current].text}
            </p>
          ) : null}
        </div>

        {showLines ? (
          <ol className="space-y-2">
            {track.lines.map((l, i) => (
              <li key={i} className={cx("flex items-start gap-2 rounded-xl p-2 text-sm", current === i && "bg-primary-soft")}>
                <button onClick={() => replay(i)} className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-muted hover:text-primary" aria-label={`Réécouter le passage ${i + 1}`}>
                  <Icon name="repeat" size={13} />
                </button>
                <p lang="en">
                  <span className="font-semibold" style={{ color: SPEAKER_COLORS[l.speaker % 4] }}>{track.speakers[l.speaker].name}: </span>
                  {l.text}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-faint">Transcription masquée. Écoutez d&apos;abord sans lire, puis répondez aux questions. Cliquez sur la barre de progression pour réécouter un passage.</p>
        )}
      </Card>

      {showQuestions ? (
        phase === "listen" ? (
          <div className="flex justify-end">
            <Button onClick={() => setPhase("questions")} iconRight="arrowRight" disabled={plays === 0 && voices.supported}>
              Répondre aux questions
            </Button>
          </div>
        ) : phase === "questions" ? (
          <Card>
            <ExerciseSet items={track.questions} source={source} onComplete={finish} title="Compréhension" />
          </Card>
        ) : result ? (
          <div className="space-y-4">
            <ResultPanel result={result} onRetry={() => { setPhase("questions"); setResult(null); }} />
            <Card>
              <h3 className="mb-3 font-semibold">Expressions à retenir</h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {track.expressions.map((e) => (
                  <li key={e.en} className="rounded-xl bg-surface-2 p-3 text-sm">
                    <p className="font-semibold" lang="en">{e.en}</p>
                    <p className="text-muted">{e.fr}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        ) : null
      ) : null}
    </div>
  );
}
