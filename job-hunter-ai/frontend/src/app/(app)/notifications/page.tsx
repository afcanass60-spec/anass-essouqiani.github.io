"use client";

import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge, Button, Empty, PageHeader, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";

type N = { id: number; kind: string; title: string; body: string; link: string | null; read: boolean; created_at: string };
const KIND: Record<string, string> = { report: "Rapport", match: "Excellent match", urgent: "Urgent", followup: "Relance", company: "Entreprise", system: "Système" };

export default function NotificationsPage() {
  const [items, setItems] = useState<N[] | null>(null);
  const load = () => api.get<{ items: N[] }>("/api/notifications").then((r) => setItems(r.items));
  useEffect(() => { load(); }, []);
  if (!items) return <Spinner />;
  return (
    <div>
      <PageHeader title="Notifications" subtitle="Nouvelles offres pertinentes, rapports de l'agent, relances."
        actions={<Button icon={<CheckCheck className="size-4" />} onClick={async () => { await api.post("/api/notifications/read-all"); load(); }}>Tout marquer comme lu</Button>} />
      {items.length === 0 ? <Empty icon={<Bell className="size-6" />} title="Aucune notification" /> : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {items.map((n) => {
            const inner = (
              <div className="flex gap-3 px-4 py-3">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-accent"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{n.title}</span><Badge>{KIND[n.kind] ?? n.kind}</Badge></div>
                  {n.body && <pre className="mt-1 whitespace-pre-wrap font-sans text-sm text-muted">{n.body}</pre>}
                  <div className="mt-1 text-xs text-muted">{fmtDateTime(n.created_at)}</div>
                </div>
              </div>
            );
            return <li key={n.id}>{n.link?.startsWith("/") ? <Link href={n.link} className="block hover:bg-surface-2">{inner}</Link> : n.link?.startsWith("http") ? <a href={n.link} target="_blank" rel="noopener noreferrer" className="block hover:bg-surface-2">{inner}</a> : inner}</li>;
          })}
        </ul>
      )}
    </div>
  );
}
