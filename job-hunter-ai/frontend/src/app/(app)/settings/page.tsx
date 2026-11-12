"use client";

import { CheckCircle2, CircleDashed, ExternalLink, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { useToast } from "@/components/toast";
import { Badge, Button, Card, Field, Input, Notice, PageHeader, Spinner } from "@/components/ui";
import { api, Scheduler, Source } from "@/lib/api";
import { relDate } from "@/lib/format";

type Status = { ai: { configured: boolean; model: string; scoring_enabled: boolean }; sources: Source[]; travel: { transit: boolean; car: boolean };
  scheduler: Scheduler; notifications: { smtp: boolean; email_to: boolean; webhook: boolean }; imap: boolean; environment: string };

function Dot({ ok, partial }: { ok: boolean; partial?: boolean }) {
  return ok ? <CheckCircle2 className="size-4 shrink-0 text-success" /> : partial ? <CircleDashed className="size-4 shrink-0 text-warning" /> : <XCircle className="size-4 shrink-0 text-muted" />;
}

export default function SettingsPage() {
  const toast = useToast();
  const [s, setS] = useState<Status | null>(null);
  const [hook, setHook] = useState("");
  const [pw, setPw] = useState({ current_password: "", new_password: "" });
  useEffect(() => { api.get<Status>("/api/settings/status").then(setS); }, []);
  if (!s) return <Spinner />;
  const groups: [string, Source[]][] = [
    ["API officielles", s.sources.filter((x) => x.kind === "api" || x.kind === "search")],
    ["Alertes email (plateformes sans API)", s.sources.filter((x) => x.kind === "email")],
    ["Pages carrières (API publiques des ATS)", s.sources.filter((x) => x.kind === "ats")],
    ["Non collectées automatiquement", s.sources.filter((x) => x.kind === "unsupported")],
  ];
  return (
    <div className="space-y-5">
      <PageHeader title="Paramètres" subtitle="État réel des intégrations. Les clés se configurent dans le fichier .env du serveur (jamais dans le navigateur)." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Intelligence artificielle">
          <div className="flex items-center gap-2 text-sm"><Dot ok={s.ai.configured} />{s.ai.configured ? `Claude configuré (${s.ai.model})` : "Non configurée"}</div>
          {!s.ai.configured && <p className="mt-2 text-xs text-muted">Ajoutez ANTHROPIC_API_KEY. Sans IA : scoring par règles, adaptation de CV par règles, brouillons de lettres structurés (signalés).</p>}
        </Card>
        <Card title="Planificateur">
          <div className="flex items-center gap-2 text-sm"><Dot ok={s.scheduler.active} />{s.scheduler.message}</div>
          {s.scheduler.last_beat && <p className="mt-2 text-xs text-muted">Dernier battement {relDate(s.scheduler.last_beat)}</p>}
        </Card>
        <Card title="Temps de trajet">
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2"><Dot ok={s.travel.transit} />Transports (PRIM_API_KEY — Île-de-France Mobilités)</div>
            <div className="flex items-center gap-2"><Dot ok={s.travel.car} />Voiture (OPENROUTESERVICE_API_KEY)</div>
          </div>
          <p className="mt-2 text-xs text-muted">Renseignez aussi votre adresse de départ dans Career Studio → Profil → Préférences.</p>
        </Card>
      </div>

      {groups.map(([title, list]) => (
        <Card key={title} title={title} pad={false}>
          <ul className="divide-y divide-border">
            {list.map((x) => (
              <li key={x.key} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <div className="pt-0.5"><Dot ok={x.configured && x.supported} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium">{x.label}
                    {x.supported ? (x.configured ? <Badge tone="success">Opérationnel</Badge> : <Badge tone="warning">À configurer</Badge>) : <Badge tone="danger">Non automatisable</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{x.notes || x.reason}</p>
                  {x.alternative && <p className="mt-0.5 text-xs">Alternative : {x.alternative}</p>}
                  {!x.configured && x.required_env.length > 0 && <p className="mt-1 font-mono text-[11px] text-muted">{x.required_env.join(" · ")}</p>}
                </div>
                {x.docs_url && <a href={x.docs_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-accent">Documentation <ExternalLink className="size-3" /></a>}
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Notifications externes">
          <div className="mb-3 space-y-1.5 text-sm">
            <div className="flex items-center gap-2"><Dot ok={s.notifications.smtp && s.notifications.email_to} partial={s.notifications.smtp} />Email (SMTP_* + NOTIFY_EMAIL_TO)</div>
            <div className="flex items-center gap-2"><Dot ok={s.notifications.webhook} />Webhook (ntfy.sh, Slack, Discord…)</div>
          </div>
          <Field label="URL de webhook (chiffrée en base)" hint="Ex : https://ntfy.sh/mon-sujet-secret — laissez vide pour supprimer.">
            <div className="flex gap-2"><Input value={hook} onChange={(e) => setHook(e.target.value)} placeholder="https://…" />
              <Button onClick={async () => { try { await api.put("/api/settings/webhook", { url: hook }); toast("Webhook enregistré", "success"); setS(await api.get<Status>("/api/settings/status")); } catch (e) { toast((e as Error).message, "error"); } }}>Enregistrer</Button></div>
          </Field>
        </Card>
        <Card title="Sécurité du compte">
          <div className="space-y-3">
            <Field label="Mot de passe actuel"><Input type="password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} /></Field>
            <Field label="Nouveau mot de passe"><Input type="password" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} /></Field>
            <Button onClick={async () => { try { await api.post("/api/auth/password", pw); toast("Mot de passe modifié", "success"); setPw({ current_password: "", new_password: "" }); } catch (e) { toast((e as Error).message, "error"); } }}>Modifier</Button>
          </div>
        </Card>
      </div>
      {s.environment !== "production" && <Notice tone="warning">Environnement : {s.environment}. En production, définissez ENVIRONMENT=production, SECRET_KEY, ENCRYPTION_KEY et COOKIE_SECURE=true (HTTPS).</Notice>}
    </div>
  );
}
