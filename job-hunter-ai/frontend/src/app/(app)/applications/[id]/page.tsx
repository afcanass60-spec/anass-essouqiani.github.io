"use client";

import { ArrowLeft, Download, ExternalLink, FileText, Mail, Plus, Send, Trash2, UserPlus, Wand2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useToast } from "@/components/toast";
import { Badge, Button, Card, Field, Input, Modal, Notice, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import { api, ApplicationDetail, Contact } from "@/lib/api";
import { APP_STATUSES, fmtDateTime, statusLabel } from "@/lib/format";

function eventText(e: ApplicationDetail["events"][number]): string {
  const p = e.payload as Record<string, string | string[]>;
  if (e.kind === "status") return `Statut : ${p.from ? statusLabel(String(p.from)) + " → " : ""}${statusLabel(String(p.to))}${p.note ? ` — ${p.note}` : ""}`;
  if (e.kind === "document") return `Dossier validé : ${(p.validated as string[] | undefined)?.join(", ") || "—"}`;
  if (e.kind === "email") return `Email envoyé à ${p.to} — « ${p.subject} »`;
  if (e.kind === "contact") return `Contacts mis à jour (${p.count})`;
  return String(p.text ?? "");
}

export default function ApplicationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [a, setA] = useState<ApplicationDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [note, setNote] = useState({ text: "", kind: "note" });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [send, setSend] = useState<{ open: boolean; to: string; subject: string; body: string; docs: number[]; confirm: boolean }>({ open: false, to: "", subject: "", body: "", docs: [], confirm: false });
  const load = useCallback(() => api.get<ApplicationDetail>(`/api/applications/${id}`).then((x) => { setA(x); setNotes(x.notes); setContacts(x.contacts); }), [id]);
  useEffect(() => { load(); }, [load]);
  if (!a) return <Spinner />;

  const patch = async (body: Record<string, unknown>) => { setA(await api.patch<ApplicationDetail>(`/api/applications/${id}`, body)); toast("Enregistré", "success"); };
  async function addEvent() { setA(await api.post<ApplicationDetail>(`/api/applications/${id}/events`, note)); setNote({ text: "", kind: "note" }); }
  async function doSend() {
    try {
      setA(await api.post<ApplicationDetail>(`/api/applications/${id}/send`, { to: send.to, subject: send.subject, body: send.body, attach_document_ids: send.docs, confirm: send.confirm }));
      setSend({ ...send, open: false }); toast("Email envoyé", "success");
    } catch (e) { toast((e as Error).message, "error"); }
  }

  return (
    <div className="space-y-5">
      <Link href="/applications" className="inline-flex items-center gap-1 text-sm text-muted hover:text-text"><ArrowLeft className="size-4" />Candidatures</Link>
      <PageHeader title={a.title} subtitle={<>{a.company}{a.url && <> · <a href={a.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-accent">annonce <ExternalLink className="size-3" /></a></>}</>}
        actions={<>
          <Select value={a.status} onChange={(e) => patch({ status: e.target.value })} className="w-56">
            {APP_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </Select>
          {a.offer_id && <Link href={`/studio/prepare/${a.offer_id}?application=${a.id}`}><Button icon={<Wand2 className="size-4" />}>Préparer le dossier</Button></Link>}
          <Button icon={<Send className="size-4" />} disabled={!a.validated} onClick={() => setSend({ ...send, open: true, subject: `Candidature — ${a.title}`, docs: a.documents.filter((d) => d.has_pdf).map((d) => d.id) })}>Envoyer par email</Button>
          <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={async () => { if (confirm("Supprimer cette candidature ?")) { await api.del(`/api/applications/${id}`); router.push("/applications"); } }} />
        </>} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Dossier documentaire" action={a.validated ? <Badge tone="success">Validé</Badge> : <Badge tone="warning">Non validé</Badge>}>
            {a.documents.length === 0 ? (
              <p className="text-sm text-muted">Aucun document figé. Préparez le CV et la lettre puis validez le dossier : la version exacte envoyée sera conservée ici.</p>
            ) : (
              <ul className="divide-y divide-border">
                {a.documents.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div className="flex items-center gap-2 text-sm"><FileText className="size-4 text-muted" /><span>{d.title}</span><span className="text-xs text-muted">{fmtDateTime(d.created_at)}</span></div>
                    <div className="flex gap-1">
                      {d.has_pdf && <a href={`/api/applications/${a.id}/documents/${d.id}/download?format=pdf`}><Button size="sm" icon={<Download className="size-3.5" />}>PDF</Button></a>}
                      {d.has_docx && <a href={`/api/applications/${a.id}/documents/${d.id}/download?format=docx`}><Button size="sm" icon={<Download className="size-3.5" />}>DOCX</Button></a>}
                      {!d.has_pdf && typeof d.content.body === "string" && <Button size="sm" onClick={() => navigator.clipboard.writeText(String(d.content.body)).then(() => toast("Copié"))}>Copier</Button>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Historique">
            <div className="mb-4 flex flex-wrap gap-2">
              <Select value={note.kind} onChange={(e) => setNote({ ...note, kind: e.target.value })} className="w-36">
                <option value="note">Note</option><option value="call">Appel</option><option value="email">Email</option><option value="interview">Entretien</option>
              </Select>
              <Input className="min-w-0 flex-1" placeholder="Ajouter un événement…" value={note.text} onChange={(e) => setNote({ ...note, text: e.target.value })} onKeyDown={(e) => e.key === "Enter" && note.text && addEvent()} />
              <Button icon={<Plus className="size-4" />} disabled={!note.text} onClick={addEvent}>Ajouter</Button>
            </div>
            <ol className="relative space-y-3 border-l border-border pl-4">
              {[...a.events].reverse().map((e) => (
                <li key={e.id} className="text-sm">
                  <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full border-2 border-surface bg-accent" />
                  <div>{eventText(e)}</div>
                  <div className="text-xs text-muted">{fmtDateTime(e.created_at)} · {e.kind}</div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Suivi">
            <div className="space-y-3">
              <Field label="Prochaine action / relance">
                <Input type="date" value={a.next_action_at?.slice(0, 10) ?? ""} onChange={(e) => e.target.value && patch({ next_action_at: new Date(e.target.value).toISOString() })} />
              </Field>
              <p className="text-xs text-muted">Envoyée le {a.applied_at ? fmtDateTime(a.applied_at) : "—"} · statut : {statusLabel(a.status)}</p>
            </div>
          </Card>
          <Card title="Contacts" action={<Button size="sm" variant="ghost" icon={<UserPlus className="size-3.5" />} onClick={() => setContacts([...contacts, {}])}>Ajouter</Button>}>
            <div className="space-y-3">
              {contacts.map((c, i) => (
                <div key={i} className="space-y-1.5 rounded-lg border border-border p-2.5">
                  {(["name", "role", "email", "phone", "linkedin"] as const).map((k) => (
                    <Input key={k} placeholder={{ name: "Nom", role: "Fonction", email: "Email", phone: "Téléphone", linkedin: "LinkedIn" }[k]} value={c[k] ?? ""}
                      onChange={(e) => setContacts(contacts.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} />
                  ))}
                  <button className="text-xs text-danger" onClick={() => setContacts(contacts.filter((_, j) => j !== i))}>Retirer</button>
                </div>
              ))}
              {contacts.length === 0 && <p className="text-sm text-muted">Aucun contact.</p>}
              <Button size="sm" onClick={() => patch({ contacts })}>Enregistrer les contacts</Button>
            </div>
          </Card>
          <Card title="Notes">
            <Textarea rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Préparation d'entretien, informations sur l'entreprise…" />
            <Button size="sm" className="mt-2" onClick={() => patch({ notes })}>Enregistrer</Button>
          </Card>
        </div>
      </div>

      <Modal open={send.open} onClose={() => setSend({ ...send, open: false })} title="Envoyer la candidature" wide>
        <div className="space-y-3">
          <Notice tone="warning">L&apos;email part uniquement après votre confirmation explicite ci-dessous. Vérifiez le destinataire et les pièces jointes.</Notice>
          <Field label="Destinataire"><Input type="email" value={send.to} onChange={(e) => setSend({ ...send, to: e.target.value })} /></Field>
          <Field label="Objet"><Input value={send.subject} onChange={(e) => setSend({ ...send, subject: e.target.value })} /></Field>
          <Field label="Message"><Textarea rows={8} value={send.body} onChange={(e) => setSend({ ...send, body: e.target.value })} /></Field>
          <div className="space-y-1">
            {a.documents.filter((d) => d.has_pdf).map((d) => (
              <label key={d.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={send.docs.includes(d.id)} onChange={(e) => setSend({ ...send, docs: e.target.checked ? [...send.docs, d.id] : send.docs.filter((x) => x !== d.id) })} />
                {d.title} (PDF)
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={send.confirm} onChange={(e) => setSend({ ...send, confirm: e.target.checked })} />Je confirme l&apos;envoi de cette candidature</label>
          <div className="flex justify-end gap-2"><Button onClick={() => setSend({ ...send, open: false })}>Annuler</Button>
            <Button variant="primary" icon={<Mail className="size-4" />} disabled={!send.confirm || !send.to} onClick={doSend}>Envoyer</Button></div>
        </div>
      </Modal>
    </div>
  );
}
