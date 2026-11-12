"use client";

import { Copy, FileText, GitCompare, Mail, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import ProfileEditor from "@/components/ProfileEditor";
import { useToast } from "@/components/toast";
import { Badge, Button, Empty, Field, Input, Modal, PageHeader, Select, Spinner, Tabs } from "@/components/ui";
import { api, CV, Letter } from "@/lib/api";
import { relDate } from "@/lib/format";

type Templates = { templates: { key: string; label: string }[]; styles: { key: string; description: string }[]; kinds: { key: string; label: string }[] };

function CVLibrary({ templates }: { templates: Templates }) {
  const router = useRouter();
  const toast = useToast();
  const [cvs, setCvs] = useState<CV[] | null>(null);
  const [create, setCreate] = useState<{ name: string; template: string; from_cv_id: number | null } | null>(null);
  const [cmp, setCmp] = useState<{ a: number; b: number } | null>(null);
  const [diff, setDiff] = useState<{ diff: { op: string; text: string }[]; similarity: number } | null>(null);
  const load = useCallback(() => api.get<CV[]>("/api/studio/cvs").then(setCvs), []);
  useEffect(() => { load(); }, [load]);
  if (!cvs) return <Spinner />;
  const tpl = (k: string) => templates.templates.find((t) => t.key === k)?.label ?? k;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button icon={<GitCompare className="size-4" />} disabled={cvs.length < 2} onClick={() => setCmp({ a: cvs[0].id, b: cvs[1].id })}>Comparer</Button>
        <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreate({ name: "Nouveau CV", template: "minimal", from_cv_id: null })}>Nouveau CV</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cvs.map((c) => (
          <div key={c.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
            <Link href={`/studio/cv/${c.id}`} className="font-semibold hover:text-accent">{c.name}</Link>
            <div className="flex flex-wrap gap-1"><Badge>{tpl(c.template)}</Badge><Badge tone={c.origin === "tailored" ? "accent" : "neutral"}>{{ tailored: "Adapté à une offre", import: "Importé", manual: "Manuel" }[c.origin] ?? c.origin}</Badge><Badge>rév. {c.revision}</Badge></div>
            <div className="text-xs text-muted">Modifié {relDate(c.updated_at)}</div>
            <div className="mt-auto flex gap-1 pt-1">
              <Link href={`/studio/cv/${c.id}`}><Button size="sm" variant="primary">Éditer</Button></Link>
              <a href={`/api/studio/cvs/${c.id}/export?format=pdf`}><Button size="sm" variant="ghost">PDF</Button></a>
              <a href={`/api/studio/cvs/${c.id}/export?format=docx`}><Button size="sm" variant="ghost">DOCX</Button></a>
              <Button size="sm" variant="ghost" icon={<Copy className="size-3.5" />} onClick={() => setCreate({ name: `${c.name} (copie)`, template: c.template, from_cv_id: c.id })} aria-label="Dupliquer" />
              <Button size="sm" variant="ghost" icon={<Trash2 className="size-3.5" />} onClick={async () => { if (confirm("Supprimer ce CV ?")) { await api.del(`/api/studio/cvs/${c.id}`); load(); } }} aria-label="Supprimer" />
            </div>
          </div>
        ))}
      </div>
      <Modal open={!!create} onClose={() => setCreate(null)} title={create?.from_cv_id ? "Dupliquer le CV" : "Nouveau CV (depuis le profil)"}>
        {create && (
          <div className="space-y-3">
            <Field label="Nom"><Input value={create.name} onChange={(e) => setCreate({ ...create, name: e.target.value })} /></Field>
            {!create.from_cv_id && <Field label="Modèle"><Select value={create.template} onChange={(e) => setCreate({ ...create, template: e.target.value })}>{templates.templates.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</Select></Field>}
            <div className="flex justify-end"><Button variant="primary" onClick={async () => {
              try { const c = await api.post<CV>("/api/studio/cvs", create); router.push(`/studio/cv/${c.id}`); } catch (e) { toast((e as Error).message, "error"); }
            }}>Créer</Button></div>
          </div>
        )}
      </Modal>
      <Modal open={!!cmp} onClose={() => { setCmp(null); setDiff(null); }} title="Comparer deux versions" wide>
        {cmp && (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {(["a", "b"] as const).map((k) => <Select key={k} value={cmp[k]} onChange={(e) => setCmp({ ...cmp, [k]: Number(e.target.value) })}>{cvs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>)}
            </div>
            <Button onClick={() => api.get<typeof diff>(`/api/studio/cvs/${cmp.a}/compare/${cmp.b}`).then(setDiff)}>Comparer</Button>
            {diff && (
              <div>
                <p className="mb-2 text-xs text-muted">Similarité : {diff.similarity} %</p>
                <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border font-mono text-xs">
                  {diff.diff.map((l, i) => <div key={i} className={l.op === "+" ? "bg-success-soft px-2 text-success" : l.op === "-" ? "bg-danger-soft px-2 text-danger" : "px-2 text-muted"}>{l.op} {l.text}</div>)}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Letters({ templates }: { templates: Templates }) {
  const [items, setItems] = useState<Letter[] | null>(null);
  useEffect(() => { api.get<Letter[]>("/api/studio/letters").then(setItems); }, []);
  if (!items) return <Spinner />;
  const kind = (k: string) => templates.kinds.find((x) => x.key === k)?.label ?? k;
  return items.length === 0 ? (
    <Empty icon={<Mail className="size-6" />} title="Aucune lettre ni message">Depuis une offre, cliquez sur « Préparer ma candidature » : l&apos;agent génère lettre, email, message LinkedIn…</Empty>
  ) : (
    <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
      {items.map((l) => (
        <li key={l.id}><Link href={`/studio/letters/${l.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-surface-2">
          <FileText className="size-4 text-muted" />
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{l.title}</div><div className="text-xs text-muted">{kind(l.kind)} · style {l.style} · {relDate(l.updated_at)}</div></div>
          <Badge tone={l.generated_by === "template" ? "warning" : "neutral"}>{{ ai: "IA", "ai+edited": "IA + retouches", template: "Brouillon sans IA", manual: "Manuel" }[l.generated_by] ?? l.generated_by}</Badge>
          {"global" in l.analysis && <Badge tone={l.analysis.global >= 75 ? "success" : l.analysis.global >= 55 ? "warning" : "danger"}>Qualité {l.analysis.global}</Badge>}
        </Link></li>
      ))}
    </ul>
  );
}

function StudioInner() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get("tab") ?? "profile";
  const [templates, setTemplates] = useState<Templates | null>(null);
  useEffect(() => { api.get<Templates>("/api/studio/templates").then(setTemplates); }, []);
  return (
    <div className="space-y-4">
      <PageHeader title="AI Career Studio" subtitle="Profil centralisé, bibliothèque de CV, lettres et messages de candidature." />
      <Tabs value={tab} onChange={(k) => router.replace(`/studio?tab=${k}`)} tabs={[{ key: "profile", label: "Profil (source de vérité)" }, { key: "cv", label: "Mes CV" }, { key: "letters", label: "Lettres & messages" }]} />
      {tab === "profile" && <ProfileEditor />}
      {tab === "cv" && (templates ? <CVLibrary templates={templates} /> : <Spinner />)}
      {tab === "letters" && (templates ? <Letters templates={templates} /> : <Spinner />)}
    </div>
  );
}

export default function StudioPage() {
  return <Suspense fallback={<Spinner />}><StudioInner /></Suspense>;
}
