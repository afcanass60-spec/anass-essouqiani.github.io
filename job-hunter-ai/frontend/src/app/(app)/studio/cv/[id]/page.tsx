"use client";

import { ArrowLeft, Download, Gauge, History, Save } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AtsPanel } from "@/components/Analysis";
import { CVForm, CVPreview, ThemeControls } from "@/components/CVEditor";
import { useToast } from "@/components/toast";
import { Button, Card, Input, Modal, Spinner } from "@/components/ui";
import { api, AtsAnalysis, CV, CVContent } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";

export default function CVEditorPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [cv, setCv] = useState<CV | null>(null);
  const [templates, setTemplates] = useState<{ key: string; label: string; accent: string }[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ats, setAts] = useState<AtsAnalysis | null>(null);
  const [revs, setRevs] = useState<{ id: number; revision: number; note: string; created_at: string }[] | null>(null);
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  const load = useCallback(() => api.get<CV>(`/api/studio/cvs/${id}`).then((c) => { setCv(c); setDirty(false); }), [id]);
  useEffect(() => { load(); api.get<{ templates: typeof templates }>("/api/studio/templates").then((t) => setTemplates(t.templates)); }, [load]);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
  if (!cv || !cv.content) return <Spinner />;
  const update = (p: Partial<CV>) => { setCv({ ...cv, ...p }); setDirty(true); };

  async function save() {
    setSaving(true);
    try { setCv(await api.put<CV>(`/api/studio/cvs/${id}`, { name: cv!.name, template: cv!.template, theme: cv!.theme, content: cv!.content, note: "Édition" })); setDirty(false); toast("CV enregistré (nouvelle révision)", "success"); }
    catch (e) { toast((e as Error).message, "error"); } finally { setSaving(false); }
  }
  async function analyze() {
    if (dirty) await save();
    setAts(await api.post<AtsAnalysis>(`/api/studio/cvs/${id}/analyze${cv!.target_offer_id ? `?offer_id=${cv!.target_offer_id}` : ""}`));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/studio?tab=cv" className="inline-flex items-center gap-1 text-sm text-muted hover:text-text"><ArrowLeft className="size-4" />CV</Link>
        <Input className="max-w-md font-semibold" value={cv.name} onChange={(e) => update({ name: e.target.value })} />
        <div className="ml-auto flex flex-wrap gap-2">
          <Button icon={<History className="size-4" />} onClick={() => api.get<typeof revs>(`/api/studio/cvs/${id}/revisions`).then(setRevs)}>Historique</Button>
          <Button icon={<Gauge className="size-4" />} onClick={analyze}>Analyse ATS</Button>
          <a href={`/api/studio/cvs/${id}/export?format=pdf`} onClick={(e) => dirty && (e.preventDefault(), toast("Enregistrez avant d'exporter", "error"))}><Button icon={<Download className="size-4" />}>PDF</Button></a>
          <a href={`/api/studio/cvs/${id}/export?format=docx`} onClick={(e) => dirty && (e.preventDefault(), toast("Enregistrez avant d'exporter", "error"))}><Button icon={<Download className="size-4" />}>DOCX</Button></a>
          <Button variant="primary" loading={saving} disabled={!dirty} icon={<Save className="size-4" />} onClick={save}>Enregistrer</Button>
        </div>
      </div>
      <Card><ThemeControls template={cv.template} theme={cv.theme} templates={templates} onTemplate={(template) => update({ template })} onTheme={(theme) => update({ theme })} /></Card>
      <div className="flex gap-1 lg:hidden">
        <Button size="sm" variant={tab === "edit" ? "primary" : "secondary"} onClick={() => setTab("edit")}>Édition</Button>
        <Button size="sm" variant={tab === "preview" ? "primary" : "secondary"} onClick={() => setTab("preview")}>Aperçu</Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={tab === "preview" ? "hidden lg:block" : ""}><CVForm cv={cv.content} onChange={(content: CVContent) => update({ content })} /></div>
        <div className={`space-y-4 lg:sticky lg:top-20 lg:self-start ${tab === "edit" ? "hidden lg:block" : ""}`}>
          <CVPreview content={cv.content} template={cv.template} theme={cv.theme} />
          {ats && <Card title="Analyse ATS"><AtsPanel a={ats} /></Card>}
        </div>
      </div>
      <Modal open={!!revs} onClose={() => setRevs(null)} title="Historique des révisions">
        <ul className="divide-y divide-border">
          {revs?.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2 text-sm">
              <span>Rév. {r.revision} · {r.note} <span className="text-xs text-muted">{fmtDateTime(r.created_at)}</span></span>
              <Button size="sm" onClick={async () => { setCv(await api.post<CV>(`/api/studio/cvs/${id}/revisions/${r.id}/restore`)); setRevs(null); toast("Révision restaurée", "success"); }}>Restaurer</Button>
            </li>
          ))}
          {revs?.length === 0 && <li className="py-2 text-sm text-muted">Aucune révision antérieure.</li>}
        </ul>
      </Modal>
    </div>
  );
}
