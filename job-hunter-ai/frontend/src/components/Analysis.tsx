"use client";

import { AtsAnalysis, LetterAnalysis } from "@/lib/api";
import { Badge, Bar } from "./ui";

const tone = (v: number) => (v >= 75 ? "success" : v >= 55 ? "accent" : v >= 40 ? "warning" : "danger") as "success";

export function AtsPanel({ a }: { a: AtsAnalysis }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-3">
        {a.match_score != null && <div><div className="mb-1 flex justify-between text-xs"><span className="text-muted">Compatibilité offre</span><b>{a.match_score}</b></div><Bar value={a.match_score} max={100} tone={tone(a.match_score)} /></div>}
        <div><div className="mb-1 flex justify-between text-xs"><span className="text-muted">Lisibilité ATS</span><b>{a.ats_readability}</b></div><Bar value={a.ats_readability} max={100} tone={tone(a.ats_readability)} /></div>
      </div>
      {a.skills_found.length > 0 && <div><div className="mb-1 text-xs text-muted">Compétences recherchées présentes</div><div className="flex flex-wrap gap-1">{a.skills_found.map((s) => <Badge key={s} tone="success">{s}</Badge>)}</div></div>}
      {a.keywords_to_add.length > 0 && <div><div className="mb-1 text-xs text-muted">Mots-clés que vous possédez, à intégrer</div><div className="flex flex-wrap gap-1">{a.keywords_to_add.map((s) => <Badge key={s} tone="accent">{s}</Badge>)}</div></div>}
      {a.not_in_profile.length > 0 && <div><div className="mb-1 text-xs text-muted">Exigences absentes de votre parcours (ne pas inventer)</div><div className="flex flex-wrap gap-1">{a.not_in_profile.map((s) => <Badge key={s} tone="danger">{s}</Badge>)}</div></div>}
      {[["Points forts", a.strengths], ["À améliorer", a.improvements], ["Risques d'interprétation", a.risks]].map(([t, l]) => (l as string[]).length > 0 && (
        <div key={t as string}><div className="mb-1 text-xs font-medium text-muted">{t as string}</div><ul className="list-disc space-y-0.5 pl-4">{(l as string[]).map((x, i) => <li key={i}>{x}</li>)}</ul></div>
      ))}
      <p className="text-[11px] text-muted">{a.disclaimer}</p>
    </div>
  );
}

const LETTER_LABELS: Record<string, string> = { personnalisation: "Personnalisation", pertinence: "Pertinence", qualite: "Qualité rédactionnelle", originalite: "Originalité", coherence_cv: "Cohérence avec le CV" };

export function LetterPanel({ a }: { a: LetterAnalysis }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between"><span className="text-xs text-muted">Score global</span><Badge tone={tone(a.global)}>{a.global}/100</Badge></div>
      {Object.entries(a.scores).map(([k, v]) => (
        <div key={k}><div className="mb-1 flex justify-between text-xs"><span className="text-muted">{LETTER_LABELS[k] ?? k}</span><b>{v}</b></div><Bar value={v} max={100} tone={tone(v)} /></div>
      ))}
      <div className="text-xs text-muted">{a.word_count} mots</div>
      {a.issues.length > 0 && <div><div className="mb-1 text-xs font-medium text-muted">À corriger</div><ul className="list-disc space-y-0.5 pl-4">{a.issues.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
      {a.strengths.length > 0 && <div><div className="mb-1 text-xs font-medium text-muted">Points forts</div><ul className="list-disc space-y-0.5 pl-4">{a.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
      <p className="text-[11px] text-muted">{a.disclaimer}</p>
    </div>
  );
}
