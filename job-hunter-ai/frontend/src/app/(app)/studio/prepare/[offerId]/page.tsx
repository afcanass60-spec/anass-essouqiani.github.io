"use client";

import clsx from "clsx";
import { ArrowLeft, Check, CheckCircle2, Download, ExternalLink, FileText, Mail, MessageSquare, Pencil, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { AtsPanel, LetterPanel } from "@/components/Analysis";
import { CVPreview } from "@/components/CVEditor";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, Chip, Field, Input, Notice, ScoreRing, Spinner, Textarea } from "@/components/ui";
import { api, ApplicationDetail, AtsAnalysis, CV, Letter, LetterAnalysis, OfferDetail } from "@/lib/api";

type Prep = { missions_summary: string[]; company_needs: string[]; ats_keywords: { keyword: string; in_profile: boolean; importance: string }[];
  hr_questions: { question: string; answer_outline: string }[]; technical_questions: { question: string; what_is_expected: string; topic: string }[];
  questions_to_ask: string[]; pitch: string; generated_by: string };
type Tailor = { cv: CV; changes: string[]; warnings: string[]; method: string; base_cv: CV | null; analysis: AtsAnalysis };
type Gen = Letter & { warnings: string[]; hook_rationale?: string; facts_used?: string[] };

const STYLES = [["professionnel", "Professionnel"], ["direct", "Direct"], ["original", "Original"], ["humain", "Naturel"], ["institutionnel", "Institutionnel"]];
const MSG_KINDS = [["email", "Email au recruteur"], ["linkedin", "Message LinkedIn"], ["form", "Formulaire"], ["followup", "Relance"], ["reply", "Réponse recruteur"], ["thanks", "Remerciement"]];
const STEPS = ["Analyse", "CV adapté", "Lettre", "Messages", "Validation"];

function Inner() {
  const { offerId } = useParams<{ offerId: string }>();
  const sp = useSearchParams();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [appId, setAppId] = useState<number | null>(sp.get("application") ? Number(sp.get("application")) : null);
  const [prep, setPrep] = useState<Prep | null>(null);
  const [tailor, setTailor] = useState<Tailor | null>(null);
  const [letter, setLetter] = useState<Gen | null>(null);
  const [style, setStyle] = useState("professionnel");
  const [companyInfo, setCompanyInfo] = useState("");
  const [instructions, setInstructions] = useState("");
  const [msgs, setMsgs] = useState<Gen[]>([]);
  const [ctx, setCtx] = useState("");
  const [busy, setBusy] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [validated, setValidated] = useState<ApplicationDetail | null>(null);

  useEffect(() => { api.get<OfferDetail>(`/api/offers/${offerId}`).then(setOffer); }, [offerId]);
  const run = useCallback(async <T,>(key: string, fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(key);
    try { return await fn(); } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(""); }
  }, [toast]);
  if (!offer) return <Spinner />;

  const doPrep = () => run("prep", async () => setPrep(await api.post<Prep>(`/api/studio/prepare/${offerId}`)));
  const doTailor = () => run("cv", async () => setTailor(await api.post<Tailor>("/api/studio/cvs/tailor", { offer_id: Number(offerId), use_ai: true })));
  const doLetter = () => run("letter", async () => {
    const l = await api.post<Gen>("/api/studio/letters/generate", { offer_id: Number(offerId), kind: "letter", style, company_info: companyInfo, instructions });
    setLetter(l); setSelected((s) => [...s, l.id]);
  });
  const saveLetter = () => run("save", async () => { const l = await api.put<Letter>(`/api/studio/letters/${letter!.id}`, { title: letter!.title, body: letter!.body }); setLetter({ ...letter!, ...l }); toast("Lettre enregistrée et réanalysée", "success"); });
  const doMsg = (kind: string) => run(kind, async () => {
    const m = await api.post<Gen>("/api/studio/letters/generate", { offer_id: Number(offerId), kind, style, context: ctx });
    setMsgs((x) => [m, ...x.filter((y) => y.kind !== kind)]);
  });
  const doValidate = () => run("validate", async () => {
    let id = appId;
    if (!id) { const a = await api.post<ApplicationDetail>(`/api/applications/from-offer/${offerId}`); id = a.id; setAppId(id); }
    const v = await api.post<ApplicationDetail>(`/api/applications/${id}/validate`, { cv_id: tailor?.cv.id ?? null, letter_ids: selected });
    setValidated(v); toast("Dossier validé et archivé dans votre CRM", "success");
  });

  return (
    <div className="space-y-5">
      <Link href={`/offers/${offerId}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-text"><ArrowLeft className="size-4" />Offre</Link>
      <div className="flex flex-wrap items-center gap-4">
        <ScoreRing score={offer.score} size={52} />
        <div className="min-w-0 flex-1">
          <div className="text-sm text-muted">Préparer ma candidature</div>
          <h1 className="text-lg font-semibold">{offer.title} <span className="font-normal text-muted">— {offer.company}</span></h1>
        </div>
        {offer.url && <a href={offer.url} target="_blank" rel="noopener noreferrer nofollow"><Button size="sm" icon={<ExternalLink className="size-3.5" />}>Annonce</Button></a>}
      </div>

      <ol className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button onClick={() => setStep(i)} className={clsx("flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
              step === i ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:text-text")}>
              <span className={clsx("grid size-4 place-items-center rounded-full text-[10px]", step > i ? "bg-success text-white" : "bg-surface-2")}>{step > i ? <Check className="size-3" /> : i + 1}</span>{s}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Adéquation" className="lg:col-span-1">
            <p className="text-sm">{offer.score_details.explanation}</p>
            <div className="mt-3 flex flex-wrap gap-1">{offer.score_details.skills.missing_required.map((s) => <Badge key={s} tone="danger">{s}</Badge>)}</div>
          </Card>
          <Card title="Analyse de l'offre & préparation d'entretien" className="lg:col-span-2"
            action={<Button size="sm" variant="primary" loading={busy === "prep"} icon={<Sparkles className="size-3.5" />} onClick={doPrep}>{prep ? "Relancer" : "Analyser l'offre"}</Button>}>
            {!prep ? <p className="text-sm text-muted">L&apos;agent lit l&apos;annonce, identifie les mots-clés ATS et prépare les questions RH et techniques probables.</p> : (
              <div className="space-y-4 text-sm">
                {prep.generated_by !== "ai" && <Notice tone="warning">IA indisponible : questions issues de la banque intégrée, à compléter.</Notice>}
                {prep.missions_summary.length > 0 && <div><h3 className="mb-1 text-xs font-semibold text-muted">Missions</h3><ul className="list-disc space-y-0.5 pl-4">{prep.missions_summary.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
                {prep.company_needs.length > 0 && <div><h3 className="mb-1 text-xs font-semibold text-muted">Besoins de l&apos;entreprise</h3><ul className="list-disc space-y-0.5 pl-4">{prep.company_needs.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
                <div><h3 className="mb-1 text-xs font-semibold text-muted">Mots-clés ATS</h3><div className="flex flex-wrap gap-1">{prep.ats_keywords.map((k) => <Badge key={k.keyword} tone={k.in_profile ? "success" : "neutral"}>{k.keyword}{k.importance === "indispensable" ? " *" : ""}</Badge>)}</div><p className="mt-1 text-[11px] text-muted">Vert : présent dans votre profil · * indispensable</p></div>
                <div><h3 className="mb-1 text-xs font-semibold text-muted">Questions RH probables</h3><ul className="space-y-2">{prep.hr_questions.map((q, i) => <li key={i}><b>{q.question}</b><div className="text-muted">{q.answer_outline}</div></li>)}</ul></div>
                <div><h3 className="mb-1 text-xs font-semibold text-muted">Questions techniques possibles</h3><ul className="space-y-2">{prep.technical_questions.map((q, i) => <li key={i}><Badge>{q.topic}</Badge> {q.question}{q.what_is_expected && <div className="text-muted">{q.what_is_expected}</div>}</li>)}</ul></div>
                <div><h3 className="mb-1 text-xs font-semibold text-muted">Questions à poser</h3><ul className="list-disc space-y-0.5 pl-4">{prep.questions_to_ask.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                {prep.pitch && <div><h3 className="mb-1 text-xs font-semibold text-muted">Pitch (45 s)</h3><p>{prep.pitch}</p></div>}
              </div>
            )}
          </Card>
          <div className="lg:col-span-3 flex justify-end"><Button variant="primary" onClick={() => setStep(1)}>Étape suivante : CV</Button></div>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <Card title="CV adapté à l'offre" action={<Button size="sm" variant="primary" loading={busy === "cv"} icon={<Wand2 className="size-3.5" />} onClick={doTailor}>{tailor ? "Regénérer" : "Adapter mon CV"}</Button>}>
              {!tailor ? <p className="text-sm text-muted">L&apos;agent choisit la meilleure version de votre CV, réordonne les rubriques, met en avant les technologies pertinentes et reformule vos expériences — sans rien inventer. Vous pourrez tout modifier.</p> : (
                <div className="space-y-3 text-sm">
                  <div className="flex flex-wrap gap-1"><Badge tone="accent">{tailor.method === "hybrid" ? "Règles + IA" : "Règles uniquement"}</Badge>{tailor.base_cv && <Badge>Base : {tailor.base_cv.name}</Badge>}</div>
                  <div><h3 className="mb-1 text-xs font-semibold text-muted">Modifications proposées</h3><ul className="list-disc space-y-0.5 pl-4">{tailor.changes.map((c, i) => <li key={i}>{c}</li>)}</ul></div>
                  {tailor.warnings.length > 0 && <Notice tone="warning"><ul className="list-disc pl-4">{tailor.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></Notice>}
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/studio/cv/${tailor.cv.id}`} target="_blank"><Button icon={<Pencil className="size-4" />}>Modifier chaque rubrique</Button></Link>
                    <a href={`/api/studio/cvs/${tailor.cv.id}/export?format=pdf`}><Button icon={<Download className="size-4" />}>PDF</Button></a>
                    <a href={`/api/studio/cvs/${tailor.cv.id}/export?format=docx`}><Button icon={<Download className="size-4" />}>DOCX</Button></a>
                    <Button onClick={async () => { const c = await api.get<CV>(`/api/studio/cvs/${tailor.cv.id}`); const a = await api.post<AtsAnalysis>(`/api/studio/cvs/${tailor.cv.id}/analyze?offer_id=${offerId}`); setTailor({ ...tailor, cv: c, analysis: a }); }}>Rafraîchir après édition</Button>
                  </div>
                </div>
              )}
            </Card>
            {tailor && <Card title="Analyse ATS"><AtsPanel a={tailor.analysis} /></Card>}
          </div>
          <div>{tailor?.cv.content && <CVPreview content={tailor.cv.content} template={tailor.cv.template} theme={tailor.cv.theme} />}</div>
          <div className="flex justify-end lg:col-span-2"><Button variant="primary" onClick={() => setStep(2)}>Étape suivante : lettre</Button></div>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card title="Lettre de motivation">
              <div className="space-y-3">
                <Field label="Style"><div className="flex flex-wrap gap-1.5">{STYLES.map(([k, l]) => <Chip key={k} active={style === k} onClick={() => setStyle(k)}>{l}</Chip>)}</div></Field>
                <Field label="Ce que vous savez de l'entreprise (activité, projets, actualité) — améliore fortement la personnalisation" hint="Copiez un extrait de leur page « À propos » ou une actualité. Traité comme donnée non fiable.">
                  <Textarea rows={3} value={companyInfo} onChange={(e) => setCompanyInfo(e.target.value)} />
                </Field>
                <Field label="Vos consignes (optionnel)"><Input value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="ex : mettre en avant mon projet de lab Proxmox" /></Field>
                <Button variant="primary" loading={busy === "letter"} icon={<Sparkles className="size-4" />} onClick={doLetter}>{letter ? "Regénérer" : "Générer la lettre"}</Button>
                {letter && (
                  <>
                    {letter.warnings.map((w, i) => <Notice key={i} tone="warning">{w}</Notice>)}
                    {letter.hook_rationale && <p className="text-xs text-muted">Accroche : {letter.hook_rationale}</p>}
                    <Input value={letter.title} onChange={(e) => setLetter({ ...letter, title: e.target.value })} />
                    <Textarea rows={18} className="leading-relaxed" value={letter.body} onChange={(e) => setLetter({ ...letter, body: e.target.value })} />
                    <div className="flex flex-wrap gap-2">
                      <Button loading={busy === "save"} onClick={saveLetter}>Enregistrer et réanalyser</Button>
                      <a href={`/api/studio/letters/${letter.id}/export?format=pdf`}><Button icon={<Download className="size-4" />}>PDF</Button></a>
                      <a href={`/api/studio/letters/${letter.id}/export?format=docx`}><Button icon={<Download className="size-4" />}>DOCX</Button></a>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
          <div>{letter && "global" in letter.analysis && <Card title="Analyse de la lettre"><LetterPanel a={letter.analysis as LetterAnalysis} /></Card>}</div>
          <div className="flex justify-end lg:col-span-3"><Button variant="primary" onClick={() => setStep(3)}>Étape suivante : messages</Button></div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <Card title="Messages de candidature">
            <Field label="Contexte (message reçu d'un recruteur, notes d'entretien…) — utilisé pour les réponses, relances et remerciements">
              <Textarea rows={3} value={ctx} onChange={(e) => setCtx(e.target.value)} />
            </Field>
            <div className="mt-3 flex flex-wrap gap-2">
              {MSG_KINDS.map(([k, l]) => <Button key={k} size="sm" loading={busy === k} icon={k === "email" ? <Mail className="size-3.5" /> : <MessageSquare className="size-3.5" />} onClick={() => doMsg(k)}>{l}</Button>)}
            </div>
          </Card>
          <div className="grid gap-3 md:grid-cols-2">
            {msgs.map((m) => (
              <Card key={m.id} title={MSG_KINDS.find(([k]) => k === m.kind)?.[1]} action={
                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={selected.includes(m.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, m.id] : selected.filter((x) => x !== m.id))} />Joindre au dossier</label>}>
                {m.warnings.map((w, i) => <Notice key={i} tone="warning" className="mb-2">{w}</Notice>)}
                <Textarea rows={8} value={m.body} onChange={(e) => setMsgs(msgs.map((x) => (x.id === m.id ? { ...x, body: e.target.value } : x)))} />
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={async () => { await api.put(`/api/studio/letters/${m.id}`, { title: m.title, body: m.body }); toast("Enregistré", "success"); }}>Enregistrer</Button>
                  <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(m.body).then(() => toast("Copié"))}>Copier</Button>
                </div>
              </Card>
            ))}
          </div>
          <div className="flex justify-end"><Button variant="primary" onClick={() => setStep(4)}>Étape suivante : validation</Button></div>
        </div>
      )}

      {step === 4 && (
        <Card title="Valider ma candidature">
          {validated ? (
            <div className="space-y-3">
              <Notice tone="success" className="flex items-center gap-2"><CheckCircle2 className="size-4" />Dossier figé et enregistré dans votre CRM. Rien n&apos;a été envoyé : l&apos;envoi reste sous votre contrôle.</Notice>
              <ul className="divide-y divide-border">
                {validated.documents.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span className="flex items-center gap-2"><FileText className="size-4 text-muted" />{d.title}</span>
                    <span className="flex gap-1">
                      {d.has_pdf && <a href={`/api/applications/${validated.id}/documents/${d.id}/download?format=pdf`}><Button size="sm">PDF</Button></a>}
                      {d.has_docx && <a href={`/api/applications/${validated.id}/documents/${d.id}/download?format=docx`}><Button size="sm">DOCX</Button></a>}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href={`/applications/${validated.id}`}><Button variant="primary">Ouvrir la candidature</Button></Link>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <p>Le dossier suivant sera <b>figé</b> (copie exacte, PDF + DOCX) et rattaché à la candidature avec le lien de l&apos;annonce :</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>{tailor ? <>CV : <b>{tailor.cv.name}</b> (dernière révision enregistrée)</> : <span className="text-warning">Aucun CV adapté — revenez à l&apos;étape 2 ou validez sans CV.</span>}</li>
                {selected.length ? selected.map((id) => <li key={id}>{[letter, ...msgs].find((x) => x?.id === id)?.title ?? `Document #${id}`}</li>) : <li className="text-muted">Aucune lettre ni message sélectionné.</li>}
              </ul>
              <Notice className="flex gap-2"><ShieldCheck className="size-4 shrink-0" />Relisez vos documents : vous gardez le contrôle final. Aucun envoi automatique — l&apos;envoi par email (si SMTP configuré) demande une seconde confirmation.</Notice>
              <Button variant="primary" loading={busy === "validate"} disabled={!tailor && !selected.length} onClick={doValidate}>Je valide ma candidature</Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default function PreparePage() {
  return <Suspense fallback={<Spinner />}><Inner /></Suspense>;
}
