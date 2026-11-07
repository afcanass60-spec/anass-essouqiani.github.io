"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* =========================================================
   Synthèse vocale (Web Speech API) et reconnaissance vocale.
   Fonctionne sans service payant ; la qualité des voix dépend
   du navigateur et du système (Chrome, Edge et Safari en
   proposent plusieurs en anglais britannique et américain).
   ========================================================= */

export type Lang = "en-GB" | "en-US" | "intl";

let voicesCache: SpeechSynthesisVoice[] = [];

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  const v = window.speechSynthesis.getVoices();
  if (v.length) voicesCache = v;
  return voicesCache;
}

const FEMALE = /female|woman|samantha|victoria|karen|moira|tessa|serena|kate|susan|libby|sonia|jenny|aria|emma|amy|olivia|zira|hazel|fiona|allison|ava|joanna|salli|kimberly/i;
const MALE = /male|man|daniel|alex|fred|oliver|arthur|george|ryan|guy|davis|tony|aaron|david|mark|james|thomas|rishi|brian|matthew|joey|justin/i;

/** Choisit une voix : langue/accent, puis genre si possible, puis variété (index). */
export function pickVoice(lang: Lang, gender?: "f" | "m", index = 0): SpeechSynthesisVoice | undefined {
  const voices = loadVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  if (!voices.length) return undefined;
  const wanted = lang === "intl" ? ["en-IE", "en-AU", "en-IN", "en-ZA", "en-NZ", "en-CA"] : [lang];
  let pool = voices.filter((v) => wanted.some((w) => v.lang.replace("_", "-").toLowerCase() === w.toLowerCase()));
  if (!pool.length) pool = voices.filter((v) => v.lang.replace("_", "-").toLowerCase() === (lang === "en-US" ? "en-us" : "en-gb"));
  if (!pool.length) pool = voices;
  const byGender = gender ? pool.filter((v) => (gender === "f" ? FEMALE.test(v.name) && !/\bmale\b/i.test(v.name) : MALE.test(v.name) && !FEMALE.test(v.name))) : [];
  const final = byGender.length ? byGender : pool;
  // Privilégie les voix réseau/naturelles, souvent de meilleure qualité.
  const sorted = [...final].sort((a, b) => Number(/natural|neural|online|google|premium|enhanced/i.test(b.name)) - Number(/natural|neural|online|google|premium|enhanced/i.test(a.name)));
  return sorted[index % sorted.length];
}

export function ttsSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export interface SpeakOptions {
  lang?: Lang;
  gender?: "f" | "m";
  voiceIndex?: number;
  rate?: number;
  onEnd?: () => void;
}

export function speak(text: string, opts: SpeakOptions = {}): SpeechSynthesisUtterance | null {
  if (!ttsSupported()) return null;
  const u = new SpeechSynthesisUtterance(text);
  const lang = opts.lang ?? "en-GB";
  u.lang = lang === "intl" ? "en-GB" : lang;
  const voice = pickVoice(lang, opts.gender, opts.voiceIndex ?? 0);
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
  }
  u.rate = opts.rate ?? 1;
  if (opts.onEnd) {
    u.onend = opts.onEnd;
    u.onerror = opts.onEnd;
  }
  window.speechSynthesis.speak(u);
  return u;
}

export function stopSpeaking() {
  if (ttsSupported()) window.speechSynthesis.cancel();
}

/** Indique si des voix anglaises sont disponibles (chargement asynchrone dans Chrome). */
export function useVoicesReady() {
  const [ready, setReady] = useState(false);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!ttsSupported()) return;
    const update = () => {
      const n = loadVoices().filter((v) => v.lang.toLowerCase().startsWith("en")).length;
      setCount(n);
      setReady(true);
    };
    update();
    window.speechSynthesis.addEventListener("voiceschanged", update);
    const t = setTimeout(update, 1200);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", update);
      clearTimeout(t);
    };
  }, []);
  return { supported: ttsSupported(), ready, englishVoices: count };
}

/* ---------- Reconnaissance vocale ---------- */

interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getRecognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface RecognitionResult {
  transcript: string;
  durationSec: number;
  longPauses: number;
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Accès au micro refusé. Autorisez le micro dans les paramètres du navigateur.",
  "service-not-allowed": "La reconnaissance vocale n'est pas autorisée sur ce navigateur.",
  "no-speech": "Aucune parole détectée. Rapprochez-vous du micro et réessayez.",
  "audio-capture": "Aucun micro détecté.",
  network: "La reconnaissance vocale du navigateur nécessite une connexion Internet.",
};

export function useRecognition(lang: "en-GB" | "en-US" = "en-GB") {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<RecognitionLike | null>(null);
  const startedAt = useRef(0);
  const lastResultAt = useRef(0);
  const pauses = useRef(0);
  const finalRef = useRef("");
  const wantStop = useRef(false);
  const resolver = useRef<((r: RecognitionResult) => void) | null>(null);

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
  }, []);

  const finish = useCallback(() => {
    setListening(false);
    setInterim("");
    const result = { transcript: finalRef.current.trim(), durationSec: Math.max(0.5, (Date.now() - startedAt.current) / 1000), longPauses: pauses.current };
    resolver.current?.(result);
    resolver.current = null;
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    setError(null);
    finalRef.current = "";
    setFinalText("");
    setInterim("");
    pauses.current = 0;
    wantStop.current = false;
    const r = new Ctor();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const now = Date.now();
      if (lastResultAt.current && now - lastResultAt.current > 2000) pauses.current += 1;
      lastResultAt.current = now;
      let inter = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalRef.current += " " + res[0].transcript;
        else inter += res[0].transcript;
      }
      setFinalText(finalRef.current.trim());
      setInterim(inter);
    };
    r.onerror = (e) => {
      if (e.error !== "aborted") setError(ERRORS[e.error] ?? `Erreur de reconnaissance vocale (${e.error}).`);
    };
    r.onend = () => {
      // Chrome coupe parfois la session après un silence : on relance tant que l'utilisateur n'a pas arrêté.
      if (!wantStop.current) {
        try {
          r.start();
          return;
        } catch {
          /* fin réelle */
        }
      }
      finish();
    };
    rec.current = r;
    startedAt.current = Date.now();
    lastResultAt.current = 0;
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
    }
  }, [lang, finish]);

  /** Arrête l'écoute et retourne la transcription finale. */
  const stop = useCallback(
    () =>
      new Promise<RecognitionResult>((resolve) => {
        resolver.current = resolve;
        wantStop.current = true;
        if (rec.current) rec.current.stop();
        else finish();
      }),
    [finish],
  );

  useEffect(
    () => () => {
      wantStop.current = true;
      rec.current?.abort();
    },
    [],
  );

  return { supported, listening, transcript: finalText, interim, error, start, stop };
}

/* ---------- Enregistrement de sa propre voix (réécoute) ---------- */

export function useVoiceRecorder() {
  const [url, setUrl] = useState<string | null>(null);
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const supported = typeof window !== "undefined" && "MediaRecorder" in window && !!navigator.mediaDevices?.getUserMedia;

  const start = useCallback(async () => {
    if (!supported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(new Blob(chunks.current, { type: rec.mimeType }));
        });
      };
      rec.start();
      mr.current = rec;
    } catch {
      /* micro refusé : la reconnaissance affichera l'erreur */
    }
  }, [supported]);

  const stop = useCallback(() => {
    if (mr.current && mr.current.state !== "inactive") mr.current.stop();
  }, []);

  return { supported, url, start, stop };
}
