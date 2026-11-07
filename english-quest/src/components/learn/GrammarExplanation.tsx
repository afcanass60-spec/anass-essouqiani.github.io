"use client";

import { Fragment, type ReactNode } from "react";
import type { GrammarTopic } from "@/lib/types";
import { SpeakButton } from "./shared";
import { Icon } from "@/components/ui/Icon";

/** Rendu minimal du gras (**…**) et de l'italique (*…*) dans les explications. */
export function Rich({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Fragment key={k++}>{text.slice(last, m.index)}</Fragment>);
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    else out.push(<em key={k++} lang="en" className="text-primary not-italic font-medium">{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(<Fragment key={k++}>{text.slice(last)}</Fragment>);
  return <>{out}</>;
}

export function GrammarExplanation({ topic, short }: { topic: GrammarTopic; short?: boolean }) {
  return (
    <div className="space-y-6">
      <section className="prose-eq">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold">🇫🇷 Explication</h3>
        {(short ? topic.explanationFr.slice(0, 2) : topic.explanationFr).map((p, i) => (
          <p key={i}>
            <Rich text={p} />
          </p>
        ))}
      </section>

      <section>
        <h3 className="mb-3 font-display text-lg font-bold">Formes</h3>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wider text-faint">
              <tr>
                <th className="p-3">Forme</th>
                <th className="p-3">Structure</th>
                <th className="p-3">Exemple</th>
              </tr>
            </thead>
            <tbody>
              {topic.forms.map((f) => (
                <tr key={f.label} className="border-t border-line">
                  <td className="p-3 font-semibold">{f.label}</td>
                  <td className="p-3 font-mono text-xs text-violet">{f.pattern}</td>
                  <td className="p-3" lang="en">{f.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {!short ? (
        <section className="prose-eq">
          <h3 className="font-display text-lg font-bold">🇬🇧 In English</h3>
          {topic.explanationEn.map((p, i) => (
            <p key={i} lang="en">{p}</p>
          ))}
        </section>
      ) : null}

      <section>
        <h3 className="mb-3 font-display text-lg font-bold">Exemples en contexte</h3>
        <ul className="space-y-2">
          {topic.examples.map((e) => (
            <li key={e.en} className="flex items-start gap-3 rounded-xl bg-surface-2 p-3">
              <SpeakButton text={e.en} size="sm" />
              <div className="min-w-0">
                <p className="font-medium" lang="en">{e.en}</p>
                <p className="text-sm text-muted">{e.fr}</p>
                {e.note ? <p className="mt-0.5 text-xs text-violet">{e.note}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-3 font-display text-lg font-bold">Erreurs fréquentes à éviter</h3>
        <ul className="space-y-2">
          {topic.mistakes.map((m) => (
            <li key={m.wrong} className="rounded-xl border border-line p-3">
              <p className="flex items-start gap-2 text-red" lang="en"><Icon name="x" size={16} className="mt-1 shrink-0" /><span className="line-through decoration-red/50">{m.wrong}</span></p>
              <p className="flex items-start gap-2 font-semibold text-green" lang="en"><Icon name="check" size={16} className="mt-1 shrink-0" />{m.right}</p>
              <p className="mt-1 text-sm text-muted">{m.why}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
