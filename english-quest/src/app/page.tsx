import Link from "next/link";
import { contentStats } from "@/content";
import { Logo } from "@/components/app/Logo";
import { Icon } from "@/components/ui/Icon";
import { HeroCta } from "@/components/app/HeroCta";

const MODULES = [
  { icon: "book", title: "Vocabulary Master", text: "Mots, phrasal verbs, idiomes et collocations avec IPA, audio UK/US, exemples réels et répétition espacée.", color: "#22c7d6" },
  { icon: "pen", title: "Grammar Academy", text: "Du present perfect au subjonctif : explications FR/EN, erreurs fréquentes, 3 niveaux d'exercices et mini-examen.", color: "#9b6bff" },
  { icon: "headphones", title: "Listening Lab", text: "Dialogues, interviews, actualités, débats et conférences, accents britannique, américain et international.", color: "#2fd58b" },
  { icon: "mic", title: "Speaking Studio", text: "Reconnaissance vocale, intelligibilité, débit, pauses et retour détaillé — sans exiger d'accent natif.", color: "#ff5d73" },
  { icon: "chat", title: "AI Conversation", text: "Six personnages, cinq modes, corrections en direct et bilan personnalisé à la fin de chaque échange.", color: "#ff7ab6" },
  { icon: "library", title: "Reading Center", text: "Textes de plus en plus complexes, dictionnaire au toucher, inférence et résumés corrigés.", color: "#3d7bff" },
  { icon: "feather", title: "Writing Workshop", text: "Emails, essais, rapports, propositions : texte annoté, version corrigée et version améliorée expliquées.", color: "#ffb547" },
  { icon: "trophy", title: "Exam Center", text: "Examens blancs chronométrés inspirés de Cambridge et de l'IELTS, résultat par compétence.", color: "#e8ebfa" },
];

const LEVELS = [
  { l: "B1", t: "Consolider les bases et gagner en autonomie" },
  { l: "B1+", t: "Enrichir le vocabulaire, complexifier les structures" },
  { l: "B2", t: "Maîtriser conversations et situations complexes" },
  { l: "B2+", t: "Fluidité, nuances et argumentation" },
  { l: "C1", t: "Précision, spontanéité, contenus complexes" },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh overflow-x-hidden">
      <div className="app-backdrop" />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2 text-sm" aria-label="Navigation publique">
          <Link href="/login" className="rounded-xl px-3 py-2 font-semibold text-muted hover:text-fg">Connexion</Link>
          <Link href="/dashboard" className="rounded-xl bg-primary px-4 py-2 font-semibold text-white">Ouvrir l&apos;app</Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-2 lg:pt-16">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-sm text-muted"><Icon name="sparkles" size={16} className="text-violet" />De B1 à C1, comme dans un jeu</p>
            <h1 className="font-display text-4xl font-bold leading-[1.05] sm:text-6xl">
              Votre quête vers un anglais <span className="text-gradient">C1</span> commence ici.
            </h1>
            <p className="max-w-xl text-lg text-muted">
              Un vrai parcours CECRL, un professeur IA, des personnages pour parler, des boss à vaincre et un tableau de bord qui mesure vos progrès réels — compétence par compétence.
            </p>
            <HeroCta />
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <li><strong className="text-fg">{contentStats.grammarTopics}</strong> cours de grammaire</li>
              <li><strong className="text-fg">{contentStats.grammarItems}+</strong> exercices</li>
              <li><strong className="text-fg">{contentStats.words}</strong> mots et expressions</li>
              <li><strong className="text-fg">{contentStats.lessons}</strong> leçons · {contentStats.chapters} boss</li>
            </ul>
          </div>
          <div className="relative" aria-hidden>
            <div className="absolute -inset-10 rounded-full bg-hero opacity-25 blur-3xl" />
            <div className="card relative space-y-4 p-6">
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-bold">Séance du jour</span>
                <span className="rounded-full bg-amber-soft px-3 py-1 text-sm font-bold text-amber">🔥 12 jours</span>
              </div>
              {[["book", "Vocabulaire", "15 mots · répétition espacée", 1], ["pen", "Grammaire", "Conditionnels mixtes", 0.7], ["headphones", "Écoute", "Débat — accent britannique", 0.35], ["mic", "Conversation", "Daniel · Debate Mode", 0]].map(([icon, t, d, p]) => (
                <div key={t as string} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary"><Icon name={icon as string} /></span>
                  <span className="flex-1"><span className="block font-semibold">{t}</span><span className="block text-xs text-muted">{d}</span>
                    <span className="mt-1.5 block h-1.5 rounded-full bg-line-strong/60"><span className="block h-full rounded-full bg-hero" style={{ width: `${(p as number) * 100}%` }} /></span>
                  </span>
                </div>
              ))}
              <p className="text-center text-xs text-faint">Illustration de l&apos;interface</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="mb-2 font-display text-3xl font-bold">Huit modules, une seule application</h2>
          <p className="mb-8 max-w-2xl text-muted">Chaque compétence est réellement travaillée — pas seulement des QCM : textes à trous, transformations, corrections d&apos;erreurs, remises en ordre, productions libres, oral et écrit évalués.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((m) => (
              <div key={m.title} className="card p-5">
                <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl text-[#070b1a]" style={{ background: m.color }}><Icon name={m.icon} /></span>
                <h3 className="font-display font-bold">{m.title}</h3>
                <p className="mt-1 text-sm text-muted">{m.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="card grid gap-8 p-6 sm:p-10 lg:grid-cols-2">
            <div className="space-y-4">
              <h2 className="font-display text-3xl font-bold">On ne passe pas de niveau en accumulant des points.</h2>
              <p className="text-muted">Chaque chapitre se termine par un boss (80 % de réussite requis) et chaque niveau par un examen de validation couvrant les six compétences. Le moteur de personnalisation repère vos erreurs récurrentes, vous propose une leçon ciblée et vérifie que la difficulté est corrigée.</p>
              <ul className="space-y-2 text-sm">
                {["Test de positionnement adaptatif par compétence", "Répétition espacée et récupération active", "Référentiel d'objectifs inspiré du CECRL", "Points de grammaire faibles détectés automatiquement"].map((x) => (
                  <li key={x} className="flex items-center gap-2"><Icon name="check" size={18} className="text-green" />{x}</li>
                ))}
              </ul>
            </div>
            <ol className="space-y-3">
              {LEVELS.map((x, i) => (
                <li key={x.l} className="flex items-center gap-4 rounded-2xl bg-surface-2 p-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-hero font-display font-bold text-white">{x.l}</span>
                  <span className="flex-1 text-sm">{x.t}</span>
                  {i < LEVELS.length - 1 ? <Icon name="sword" size={18} className="text-red" /> : <Icon name="crown" size={18} className="text-amber" />}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: "flame", t: "Gamification qui récompense l'apprentissage", d: "XP gagnée par des réussites réelles, séries, quêtes quotidiennes et hebdomadaires, badges, carte du monde et classement facultatif." },
              { icon: "shield", t: "Transparent et honnête", d: "Aucune statistique inventée, aucune IA simulée : si un service n'est pas connecté, l'application le dit. Les examens sont des entraînements, pas des certifications." },
              { icon: "cloud", t: "Partout, même hors ligne", d: "Responsive mobile/tablette/ordinateur, installable (PWA), progression sauvegardée automatiquement et synchronisée avec un compte." },
            ].map((x) => (
              <div key={x.t} className="card p-6">
                <Icon name={x.icon} size={28} className="mb-3 text-primary" />
                <h3 className="font-display text-lg font-bold">{x.t}</h3>
                <p className="mt-2 text-sm text-muted">{x.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Prêt à commencer l&apos;aventure ?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">Commencez par le test de positionnement : 15 minutes pour savoir où vous en êtes vraiment.</p>
          <div className="mt-6 flex justify-center"><HeroCta /></div>
        </section>
      </main>
      <footer className="border-t border-line py-8 text-center text-sm text-faint">
        English Quest — projet éducatif. Contenus pédagogiques originaux. Les résultats d&apos;entraînement ne sont pas des certifications officielles.
      </footer>
    </div>
  );
}
