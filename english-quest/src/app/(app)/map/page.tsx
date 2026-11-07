"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { allSkillEstimates } from "@/lib/engine/mastery";
import { isLevelUnlocked } from "@/lib/engine/progression";
import { PageHeader } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { LearningPath } from "@/components/app/Path";
import type { Skill } from "@/lib/types";

/* Carte illustrée originale : chaque région correspond à une compétence. */

interface Region {
  id: string;
  name: string;
  skill?: Skill;
  href: string;
  x: number;
  y: number;
  color: string;
  icon: string;
  shape: string;
}

const REGIONS: Region[] = [
  { id: "vocab", name: "Vocabulary Kingdom", skill: "vocabulary", href: "/vocabulary", x: 170, y: 150, color: "#22c7d6", icon: "book", shape: "M80 150c0-50 50-85 105-80 55 4 95 35 92 80-3 48-50 80-100 78-55-2-97-28-97-78z" },
  { id: "grammar", name: "Grammar Castle", skill: "grammar", href: "/grammar", x: 430, y: 120, color: "#9b6bff", icon: "pen", shape: "M340 120c5-45 55-70 100-65 50 6 85 30 82 70-3 45-45 75-95 72-52-3-92-30-87-77z" },
  { id: "listening", name: "Listening Forest", skill: "listening", href: "/listening", x: 180, y: 380, color: "#2fd58b", icon: "headphones", shape: "M70 380c-2-55 55-90 115-85 60 6 100 42 95 90-5 50-55 78-110 74-58-4-98-30-100-79z" },
  { id: "speaking", name: "Speaking City", skill: "speaking", href: "/speaking", x: 440, y: 340, color: "#ff5d73", icon: "mic", shape: "M350 345c3-48 52-78 100-74 52 4 90 36 86 78-4 46-48 74-98 70-52-4-91-28-88-74z" },
  { id: "reading", name: "Reading Library", skill: "reading", href: "/reading", x: 700, y: 170, color: "#3d7bff", icon: "library", shape: "M610 170c2-50 50-82 102-78 55 4 93 36 90 80-3 46-48 76-100 73-55-3-94-28-92-75z" },
  { id: "writing", name: "Writing Academy", skill: "writing", href: "/writing", x: 700, y: 410, color: "#ffb547", icon: "feather", shape: "M610 410c0-48 48-80 100-76 54 4 92 34 90 76-2 46-46 76-98 73-54-3-92-27-92-73z" },
  { id: "summit", name: "C1 Summit", href: "/exams", x: 885, y: 290, color: "#e8ebfa", icon: "mountain", shape: "M820 360 885 215l65 145z" },
];

export default function MapPage() {
  const { state } = useStore();
  const router = useRouter();
  if (!state) return null;
  const est = allSkillEstimates(state);
  const summitOpen = isLevelUnlocked(state, "C1");

  return (
    <div className="space-y-8">
      <PageHeader icon="map" title="Carte du monde" subtitle="Chaque région représente une compétence. Votre niveau dans chaque région se met à jour avec vos résultats réels." />

      <div className="card overflow-hidden p-0">
        <svg viewBox="0 0 1000 540" className="h-auto w-full" role="group" aria-label="Carte des régions d'English Quest">
          <defs>
            <radialGradient id="sea" cx="50%" cy="40%" r="75%">
              <stop offset="0" stopColor="var(--surface-2)" />
              <stop offset="1" stopColor="var(--bg)" />
            </radialGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="14" />
            </filter>
            <pattern id="waves" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M0 10q10-6 20 0t20 0" stroke="var(--border)" fill="none" />
            </pattern>
          </defs>
          <rect width="1000" height="540" fill="url(#sea)" />
          <rect width="1000" height="540" fill="url(#waves)" opacity=".7" />
          {/* Routes entre les régions */}
          <path d="M260 160 Q340 100 360 125 M520 130 Q600 120 620 160 M200 240 L190 300 M440 200 L440 275 M700 260 L700 340 M520 350 Q570 380 615 400 M790 190 Q840 230 860 260 M790 410 Q840 370 860 340" stroke="var(--border-strong)" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" fill="none" />
          {REGIONS.map((r) => {
            const e = r.skill ? est[r.skill] : null;
            const locked = r.id === "summit" && !summitOpen;
            return (
              <g
                key={r.id}
                role="link"
                tabIndex={0}
                aria-label={`${r.name}${e?.level ? `, niveau estimé ${e.level}` : ""}${locked ? ", verrouillé" : ""}`}
                onClick={() => router.push(r.href)}
                onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && router.push(r.href)}
                className="cursor-pointer outline-none [&:focus-visible_.ring]:opacity-100 [&:hover_.ring]:opacity-100"
              >
                <path d={r.shape} fill={r.color} opacity=".35" filter="url(#glow)" />
                <path d={r.shape} fill={r.color} fillOpacity={locked ? 0.08 : 0.18} stroke={r.color} strokeWidth="2.5" />
                <path className="ring opacity-0 transition" d={r.shape} fill="none" stroke="var(--text)" strokeWidth="3" />
                <circle cx={r.x} cy={r.y - 18} r="26" fill={r.color} opacity={locked ? 0.4 : 1} />
                <foreignObject x={r.x - 13} y={r.y - 31} width="26" height="26">
                  <div style={{ color: "#070b1a", display: "grid", placeItems: "center", width: 26, height: 26 }}>
                    <Icon name={locked ? "lock" : r.icon} size={22} />
                  </div>
                </foreignObject>
                <text x={r.x} y={r.y + (r.id === "summit" ? 95 : 30)} textAnchor="middle" fill="var(--text)" fontWeight="700" fontSize="17" fontFamily="var(--font-display)">
                  {r.name}
                </text>
                <text x={r.x - (r.id === "summit" ? 10 : 0)} y={r.y + (r.id === "summit" ? 113 : 50)} textAnchor="middle" fill="var(--text-muted)" fontSize="13">
                  {r.id === "summit" ? (summitOpen ? "Ouvert : examens C1" : "Débloqué au niveau C1") : e?.level ? `Niveau estimé ${e.level} · ${e.score} pts` : "À explorer"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REGIONS.map((r) => (
          <Link key={r.id} href={r.href} className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl text-[#070b1a]" style={{ background: r.color }}>
              <Icon name={r.icon} />
            </span>
            <span className="font-semibold">{r.name}</span>
          </Link>
        ))}
      </div>

      <section>
        <h2 className="mb-4 font-display text-2xl font-bold">Le parcours de l&apos;aventure</h2>
        <LearningPath />
      </section>
    </div>
  );
}
