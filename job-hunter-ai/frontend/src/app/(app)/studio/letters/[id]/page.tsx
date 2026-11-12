"use client";

import { ArrowLeft, Copy, Download, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LetterPanel } from "@/components/Analysis";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, Field, Input, Notice, Spinner, Textarea } from "@/components/ui";
import { api, Letter, LetterAnalysis } from "@/lib/api";

export default function LetterPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [l, setL] = useState<Letter | null>(null);
  const [dirty, setDirty] = useState(false);
  const [recipient, setRecipient] = useState("");
  useEffect(() => { api.get<Letter>(`/api/studio/letters/${id}`).then(setL); }, [id]);
  if (!l) return <Spinner />;
  async function save() { setL(await api.put<Letter>(`/api/studio/letters/${id}`, { title: l!.title, body: l!.body })); setDirty(false); toast("Enregistré — analyse mise à jour", "success"); }
  const isLetter = l.kind === "letter";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/studio?tab=letters" className="inline-flex items-center gap-1 text-sm text-muted hover:text-text"><ArrowLeft className="size-4" />Lettres</Link>
        <Badge>{l.style}</Badge>
        {l.generated_by === "template" && <Badge tone="warning">Brouillon sans IA</Badge>}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button icon={<Copy className="size-4" />} onClick={() => navigator.clipboard.writeText(l.body).then(() => toast("Copié"))}>Copier</Button>
          {isLetter && <>
            <a href={`/api/studio/letters/${id}/export?format=pdf&recipient=${encodeURIComponent(recipient)}`}><Button icon={<Download className="size-4" />} disabled={dirty}>PDF</Button></a>
            <a href={`/api/studio/letters/${id}/export?format=docx&recipient=${encodeURIComponent(recipient)}`}><Button icon={<Download className="size-4" />} disabled={dirty}>DOCX</Button></a>
          </>}
          <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={async () => { if (confirm("Supprimer ?")) { await api.del(`/api/studio/letters/${id}`); router.push("/studio?tab=letters"); } }} />
          <Button variant="primary" disabled={!dirty} icon={<Save className="size-4" />} onClick={save}>Enregistrer</Button>
        </div>
      </div>
      {l.generated_by === "template" && <Notice tone="warning">Ce brouillon a été produit sans IA : complétez les zones [entre crochets] avec vos propres mots avant tout envoi.</Notice>}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Field label="Titre / objet"><Input value={l.title} onChange={(e) => { setL({ ...l, title: e.target.value }); setDirty(true); }} /></Field>
          {isLetter && <Field label="Destinataire (bloc adresse, optionnel)"><Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Service recrutement — Entreprise" /></Field>}
          <Textarea rows={22} className="font-[inherit] leading-relaxed" value={l.body} onChange={(e) => { setL({ ...l, body: e.target.value }); setDirty(true); }} />
        </div>
        <div>{"global" in l.analysis ? <Card title="Analyse de la lettre"><LetterPanel a={l.analysis as LetterAnalysis} /></Card> : <Card title="Analyse"><p className="text-sm text-muted">L&apos;analyse détaillée concerne les lettres de motivation.</p></Card>}</div>
      </div>
    </div>
  );
}
