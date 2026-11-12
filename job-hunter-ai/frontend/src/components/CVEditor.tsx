"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CVContent } from "@/lib/api";
import { Button, Card, Field, Input, Select, Textarea } from "./ui";

const SECTION_LABELS: Record<string, string> = { summary: "Profil", skills: "Compétences", experiences: "Expérience", education: "Formation",
  projects: "Projets", certifications: "Certifications", languages: "Langues", interests: "Centres d'intérêt" };

export const FONTS = ["Inter", "Source Sans 3", "IBM Plex Sans", "Lato", "Roboto", "Open Sans", "Georgia", "Merriweather"];

/** Aperçu temps réel : rendu serveur (même moteur que l'export PDF), injecté dans un iframe isolé. */
export function CVPreview({ content, template, theme }: { content: CVContent; template: string; theme: Record<string, string | number> }) {
  const [html, setHtml] = useState("");
  const seq = useRef(0);
  useEffect(() => {
    const n = ++seq.current;
    const t = setTimeout(async () => {
      const res = await fetch("/api/studio/cv-preview", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ content, template, theme }) });
      if (res.ok && n === seq.current) setHtml(await res.text());
    }, 350);
    return () => clearTimeout(t);
  }, [content, template, theme]);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <iframe title="Aperçu du CV" sandbox="" srcDoc={html} className="aspect-[210/297] w-full" />
    </div>
  );
}

export function CVForm({ cv, onChange }: { cv: CVContent; onChange: (c: CVContent) => void }) {
  const set = (p: Partial<CVContent>) => onChange({ ...cv, ...p });
  const moveSec = (i: number, d: number) => { const x = [...cv.sections_order]; const [m] = x.splice(i, 1); x.splice(i + d, 0, m); set({ sections_order: x }); };
  const toggleHidden = (s: string) => set({ hidden: cv.hidden.includes(s) ? cv.hidden.filter((x) => x !== s) : [...cv.hidden, s] });
  return (
    <div className="space-y-4">
      <Card title="Organisation des rubriques">
        <ul className="space-y-1">
          {cv.sections_order.map((s, i) => (
            <li key={s} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-surface-2">
              <span className={`flex-1 text-sm ${cv.hidden.includes(s) ? "text-muted line-through" : ""}`}>{SECTION_LABELS[s] ?? s}</span>
              <button onClick={() => toggleHidden(s)} className="rounded p-1 text-muted hover:text-text" aria-label="Afficher/masquer">{cv.hidden.includes(s) ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</button>
              <button disabled={i === 0} onClick={() => moveSec(i, -1)} className="rounded p-1 text-muted disabled:opacity-30" aria-label="Monter"><ArrowUp className="size-3.5" /></button>
              <button disabled={i === cv.sections_order.length - 1} onClick={() => moveSec(i, 1)} className="rounded p-1 text-muted disabled:opacity-30" aria-label="Descendre"><ArrowDown className="size-3.5" /></button>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="En-tête">
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries({ full_name: "Nom", email: "Email", phone: "Téléphone", city: "Ville", linkedin: "LinkedIn", website: "Site" }).map(([k, l]) => (
            <Field key={k} label={l}><Input value={cv.identity[k] ?? ""} onChange={(e) => set({ identity: { ...cv.identity, [k]: e.target.value } })} /></Field>
          ))}
        </div>
        <div className="mt-2 space-y-2">
          <Field label="Titre"><Input value={cv.headline} onChange={(e) => set({ headline: e.target.value })} /></Field>
          <Field label="Profil (résumé)"><Textarea rows={3} value={cv.summary} onChange={(e) => set({ summary: e.target.value })} /></Field>
        </div>
      </Card>
      <Card title="Compétences" action={<Button size="sm" variant="ghost" icon={<Plus className="size-3.5" />} onClick={() => set({ skills_groups: [...cv.skills_groups, { label: "Nouvelle rubrique", items: [] }] })}>Rubrique</Button>}>
        <div className="space-y-2">
          {cv.skills_groups.map((g, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[10rem_1fr_auto]">
              <Input value={g.label} onChange={(e) => set({ skills_groups: cv.skills_groups.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
              <Input value={g.items.join(", ")} onChange={(e) => set({ skills_groups: cv.skills_groups.map((x, j) => (j === i ? { ...x, items: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) } : x)) })} />
              <button onClick={() => set({ skills_groups: cv.skills_groups.filter((_, j) => j !== i) })} className="rounded p-2 text-danger hover:bg-danger-soft" aria-label="Supprimer"><Trash2 className="size-3.5" /></button>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Expériences">
        <div className="space-y-3">
          {cv.experiences.map((e, i) => {
            const up = (p: Partial<typeof e>) => set({ experiences: cv.experiences.map((x, j) => (j === i ? { ...x, ...p } : x)) });
            return (
              <div key={e.ref_id} className="space-y-2 rounded-lg border border-border p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input placeholder="Intitulé" value={e.title} onChange={(x) => up({ title: x.target.value })} />
                  <Input placeholder="Entreprise" value={e.company} onChange={(x) => up({ company: x.target.value })} />
                  <Input placeholder="Début" value={e.start} onChange={(x) => up({ start: x.target.value })} />
                  <Input placeholder="Fin" value={e.end} onChange={(x) => up({ end: x.target.value })} />
                </div>
                <Textarea rows={Math.max(3, e.bullets.length + 1)} placeholder="Une mission par ligne" value={e.bullets.join("\n")} onChange={(x) => up({ bullets: x.target.value.split("\n") })} />
              </div>
            );
          })}
          <p className="text-xs text-muted">Pour ajouter une expérience, complétez d&apos;abord votre profil (source de vérité), puis recréez une version.</p>
        </div>
      </Card>
      <Card title="Formation">
        <div className="space-y-2">
          {cv.education.map((e, i) => {
            const up = (p: Partial<typeof e>) => set({ education: cv.education.map((x, j) => (j === i ? { ...x, ...p } : x)) });
            return (
              <div key={e.ref_id} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
                <Input className="sm:col-span-2" value={e.degree} onChange={(x) => up({ degree: x.target.value })} />
                <Input placeholder="École" value={e.school} onChange={(x) => up({ school: x.target.value })} />
                <div className="grid grid-cols-2 gap-2"><Input placeholder="Début" value={e.start} onChange={(x) => up({ start: x.target.value })} /><Input placeholder="Fin" value={e.end} onChange={(x) => up({ end: x.target.value })} /></div>
                <Input className="sm:col-span-2" placeholder="Détails" value={e.details} onChange={(x) => up({ details: x.target.value })} />
              </div>
            );
          })}
        </div>
      </Card>
      <Card title="Langues & centres d'intérêt">
        <div className="space-y-2">
          <Field label="Langues (séparées par des virgules)"><Input value={cv.languages.join(", ")} onChange={(e) => set({ languages: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} /></Field>
          <Field label="Centres d'intérêt"><Input value={cv.interests.join(", ")} onChange={(e) => set({ interests: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} /></Field>
        </div>
      </Card>
    </div>
  );
}

export function ThemeControls({ template, theme, templates, onTemplate, onTheme }: {
  template: string; theme: Record<string, string | number>; templates: { key: string; label: string; accent: string }[];
  onTemplate: (t: string) => void; onTheme: (t: Record<string, string | number>) => void;
}) {
  const accent = (theme.accent as string) || templates.find((t) => t.key === template)?.accent || "#111827";
  return (
    <div className="grid gap-2 sm:grid-cols-5">
      <Field label="Modèle"><Select value={template} onChange={(e) => onTemplate(e.target.value)}>{templates.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</Select></Field>
      <Field label="Couleur"><input type="color" value={accent} onChange={(e) => onTheme({ ...theme, accent: e.target.value })} className="h-9 w-full cursor-pointer rounded-lg border border-border bg-surface p-1" /></Field>
      <Field label="Police"><Select value={(theme.font as string) || ""} onChange={(e) => onTheme({ ...theme, font: e.target.value })}><option value="">Par défaut</option>{FONTS.map((f) => <option key={f}>{f}</option>)}</Select></Field>
      <Field label="Taille (pt)"><Input type="number" step="0.5" min={8.5} max={12} value={theme.font_size ?? 10} onChange={(e) => onTheme({ ...theme, font_size: Number(e.target.value) })} /></Field>
      <Field label="Marges (mm)"><Input type="number" min={8} max={22} value={theme.margin ?? 14} onChange={(e) => onTheme({ ...theme, margin: Number(e.target.value) })} /></Field>
    </div>
  );
}
