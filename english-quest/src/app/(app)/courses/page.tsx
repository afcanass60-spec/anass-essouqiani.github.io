"use client";

import Link from "next/link";
import { contentStats } from "@/content";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/primitives";
import { LearningPath } from "@/components/app/Path";

const MODULES = [
  { href: "/vocabulary", icon: "book", title: "Vocabulary Master", text: `${contentStats.words} mots, idiomes et phrasal verbs en répétition espacée`, color: "#22c7d6" },
  { href: "/grammar", icon: "pen", title: "Grammar Academy", text: `${contentStats.grammarTopics} cours du B1 au C1, ${contentStats.grammarItems} exercices`, color: "#9b6bff" },
  { href: "/listening", icon: "headphones", title: "Listening Lab", text: `${contentStats.listening} écoutes : dialogues, interviews, débats, conférences`, color: "#2fd58b" },
  { href: "/speaking", icon: "mic", title: "Speaking Studio", text: `${contentStats.speaking} exercices oraux avec reconnaissance vocale`, color: "#ff5d73" },
  { href: "/conversation", icon: "chat", title: "AI Conversation", text: "6 personnages, 5 modes, corrections et bilans", color: "#ff7ab6" },
  { href: "/reading", icon: "library", title: "Reading Center", text: `${contentStats.reading} textes avec dictionnaire intégré`, color: "#3d7bff" },
  { href: "/writing", icon: "feather", title: "Writing Workshop", text: `${contentStats.writing} sujets : emails, essais, rapports…`, color: "#ffb547" },
  { href: "/exams", icon: "trophy", title: "Exam Center", text: `${contentStats.exams} examens blancs + validations de niveau`, color: "#e8ebfa" },
];

export default function CoursesPage() {
  return (
    <div className="space-y-8">
      <PageHeader icon="layers" title="Catalogue" subtitle="Le parcours structuré B1 → C1 et les modules d'entraînement libre." />
      <section aria-label="Modules">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((m) => (
            <Link key={m.href} href={m.href} className="card group p-5 transition hover:-translate-y-0.5">
              <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl text-[#070b1a]" style={{ background: m.color }}>
                <Icon name={m.icon} />
              </span>
              <p className="font-display font-bold group-hover:text-primary">{m.title}</p>
              <p className="mt-1 text-sm text-muted">{m.text}</p>
            </Link>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-4 font-display text-2xl font-bold">Parcours CECRL</h2>
        <p className="mb-5 max-w-3xl text-muted">
          {contentStats.chapters} chapitres, {contentStats.lessons} leçons. Chaque leçon combine vocabulaire, grammaire et une compétence (écoute, lecture, oral ou écrit). Un boss clôt chaque chapitre (80 % de réussite requis) et un examen de validation conditionne le passage au niveau suivant.
        </p>
        <LearningPath />
      </section>
    </div>
  );
}
