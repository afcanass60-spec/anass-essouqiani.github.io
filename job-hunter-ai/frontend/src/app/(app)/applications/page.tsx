"use client";

import clsx from "clsx";
import { Briefcase, Columns3, List, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useToast } from "@/components/toast";
import { Badge, Button, Empty, Field, Input, Modal, PageHeader, Spinner } from "@/components/ui";
import { api, Application } from "@/lib/api";
import { APP_STATUSES, fmtDate, relDate, statusLabel } from "@/lib/format";

export default function ApplicationsPage() {
  const toast = useToast();
  const [items, setItems] = useState<Application[] | null>(null);
  const [view, setView] = useState<"board" | "list">("board");
  const [dragging, setDragging] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ company: "", title: "", url: "" });

  const load = useCallback(() => api.get<{ items: Application[] }>("/api/applications").then((r) => setItems(r.items)), []);
  useEffect(() => { load(); }, [load]);

  async function move(id: number, status: string) {
    setItems((xs) => xs?.map((a) => (a.id === id ? { ...a, status } : a)) ?? null);
    try { await api.patch(`/api/applications/${id}`, { status }); } catch (e) { toast((e as Error).message, "error"); load(); }
  }
  async function create() {
    await api.post("/api/applications", { ...form, url: form.url || null });
    setOpen(false); setForm({ company: "", title: "", url: "" }); load();
  }

  if (!items) return <Spinner />;
  return (
    <div>
      <PageHeader title="Candidatures" subtitle="Votre CRM de recrutement : glissez une carte pour changer son statut."
        actions={<>
          <div className="flex rounded-lg border border-border p-0.5">
            <button className={clsx("rounded-md p-1.5", view === "board" && "bg-surface-2")} onClick={() => setView("board")} aria-label="Vue tableau"><Columns3 className="size-4" /></button>
            <button className={clsx("rounded-md p-1.5", view === "list" && "bg-surface-2")} onClick={() => setView("list")} aria-label="Vue liste"><List className="size-4" /></button>
          </div>
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>Ajouter</Button>
        </>} />
      {items.length === 0 ? (
        <Empty icon={<Briefcase className="size-6" />} title="Aucune candidature">Depuis une offre, cliquez sur « Candidater » ou ajoutez une candidature spontanée.</Empty>
      ) : view === "board" ? (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 scrollbar-thin">
          {APP_STATUSES.map((s) => {
            const col = items.filter((a) => a.status === s.key);
            return (
              <div key={s.key} className="flex w-64 shrink-0 flex-col rounded-xl bg-surface-2/60 p-2"
                onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragging != null) move(dragging, s.key); setDragging(null); }}>
                <div className="mb-2 flex items-center justify-between px-1.5 pt-1 text-xs font-semibold text-muted">
                  <span>{s.label}</span><span className="tabular-nums">{col.length}</span>
                </div>
                <div className="flex min-h-16 flex-col gap-2">
                  {col.map((a) => (
                    <Link key={a.id} href={`/applications/${a.id}`} draggable onDragStart={() => setDragging(a.id)}
                      className="rounded-lg border border-border bg-surface p-3 shadow-sm transition-colors hover:border-accent/40">
                      <div className="text-xs text-muted">{a.company}</div>
                      <div className="mt-0.5 line-clamp-2 text-sm font-medium">{a.title}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-muted">
                        <span>maj {relDate(a.updated_at)}</span>
                        {a.validated && <Badge tone="success">Dossier validé</Badge>}
                        {a.next_action_at && new Date(a.next_action_at) <= new Date(Date.now() + 86400000) && ["envoyee", "relance", "en_attente"].includes(a.status) && <Badge tone="warning">Relance</Badge>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted"><tr>
              <th className="px-4 py-2 font-medium">Entreprise</th><th className="px-4 py-2 font-medium">Poste</th><th className="px-4 py-2 font-medium">Statut</th>
              <th className="px-4 py-2 font-medium">Envoyée</th><th className="px-4 py-2 font-medium">Prochaine action</th><th className="px-4 py-2 font-medium">Docs</th></tr></thead>
            <tbody className="divide-y divide-border">
              {items.map((a) => (
                <tr key={a.id} className="hover:bg-surface-2">
                  <td className="px-4 py-2.5"><Link href={`/applications/${a.id}`} className="font-medium hover:text-accent">{a.company}</Link></td>
                  <td className="px-4 py-2.5">{a.title}</td>
                  <td className="px-4 py-2.5"><Badge tone={APP_STATUSES.find((s) => s.key === a.status)?.tone as "neutral"}>{statusLabel(a.status)}</Badge></td>
                  <td className="px-4 py-2.5 text-muted">{fmtDate(a.applied_at)}</td>
                  <td className="px-4 py-2.5 text-muted">{fmtDate(a.next_action_at)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-muted">{a.documents_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle candidature">
        <div className="space-y-3">
          <Field label="Entreprise"><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
          <Field label="Poste"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Lien (optionnel)"><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></Field>
          <div className="flex justify-end"><Button variant="primary" disabled={!form.company || !form.title} onClick={create}>Créer</Button></div>
        </div>
      </Modal>
    </div>
  );
}
