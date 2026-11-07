"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { translate, type I18nKey } from "@/lib/i18n";
import { playerLevel } from "@/lib/engine/xp";
import { currentStreak } from "@/lib/engine/actions";
import { supabaseConfigured } from "@/lib/supabase/client";
import { Icon } from "@/components/ui/Icon";
import { Loading, cx } from "@/components/ui/primitives";
import { Logo } from "./Logo";

const NAV: { group: string; items: { href: string; key: I18nKey; icon: string }[] }[] = [
  {
    group: "Aventure",
    items: [
      { href: "/dashboard", key: "dashboard", icon: "home" },
      { href: "/session", key: "session", icon: "bolt" },
      { href: "/map", key: "map", icon: "map" },
      { href: "/courses", key: "courses", icon: "layers" },
      { href: "/review", key: "review", icon: "repeat" },
    ],
  },
  {
    group: "Modules",
    items: [
      { href: "/vocabulary", key: "vocabulary", icon: "book" },
      { href: "/grammar", key: "grammar", icon: "pen" },
      { href: "/listening", key: "listening", icon: "headphones" },
      { href: "/speaking", key: "speaking", icon: "mic" },
      { href: "/conversation", key: "conversation", icon: "chat" },
      { href: "/reading", key: "reading", icon: "library" },
      { href: "/writing", key: "writing", icon: "feather" },
      { href: "/exams", key: "exams", icon: "trophy" },
    ],
  },
  {
    group: "Moi",
    items: [
      { href: "/library", key: "library", icon: "bookmark" },
      { href: "/stats", key: "stats", icon: "chart" },
      { href: "/leaderboard", key: "leaderboard", icon: "crown" },
      { href: "/profile", key: "profile", icon: "user" },
      { href: "/settings", key: "settings", icon: "settings" },
    ],
  },
];

const BOTTOM: { href: string; key: I18nKey; icon: string; match: string[] }[] = [
  { href: "/dashboard", key: "home", icon: "home", match: ["/dashboard", "/session", "/review"] },
  { href: "/map", key: "mapShort", icon: "map", match: ["/map", "/lesson", "/boss"] },
  { href: "/courses", key: "learn", icon: "layers", match: ["/courses", "/vocabulary", "/grammar", "/listening", "/reading", "/writing", "/exams", "/exam"] },
  { href: "/conversation", key: "talk", icon: "chat", match: ["/conversation", "/speaking"] },
  { href: "/profile", key: "me", icon: "user", match: ["/profile", "/settings", "/stats", "/library", "/leaderboard"] },
];

function SyncBadge() {
  const { syncStatus, user, state } = useStore();
  const lang = state?.settings.uiLang ?? "fr";
  if (!supabaseConfigured) return <span className="flex items-center gap-1.5 text-xs text-faint" title="Progression enregistrée sur cet appareil"><Icon name="shield" size={14} />{translate(lang, "localMode")}</span>;
  if (!user)
    return (
      <Link href="/login" className="flex items-center gap-1.5 text-xs text-amber hover:underline">
        <Icon name="wifiOff" size={14} />
        {translate(lang, "notSignedIn")}
      </Link>
    );
  const map = { synced: ["cloud", "text-green", "synced"], syncing: ["cloud", "text-muted", "syncing"], error: ["alert", "text-red", "syncError"], offline: ["wifiOff", "text-amber", "notSignedIn"], local: ["shield", "text-faint", "localMode"] } as const;
  const [icon, color, key] = map[syncStatus];
  return <span className={cx("flex items-center gap-1.5 text-xs", color)}><Icon name={icon} size={14} />{translate(lang, key)}</span>;
}

function Toasts() {
  const { toasts, dismiss } = useStore();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite" aria-atomic="false">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={() => dismiss(t.id)}
            className={cx(
              "pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-xl",
              t.kind === "xp" && "bg-green text-[#04130b]",
              t.kind === "badge" && "bg-hero text-white",
              t.kind === "info" && "bg-surface text-fg border border-line",
              t.kind === "error" && "bg-red text-white",
            )}
          >
            <Icon name={t.kind === "xp" ? "bolt" : t.kind === "badge" ? "trophy" : t.kind === "error" ? "alert" : "info"} size={16} />
            {t.text}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state, ready } = useStore();
  const lang = state?.settings.uiLang ?? "fr";

  useEffect(() => {
    document.documentElement.lang = lang === "en" ? "en" : "fr";
  }, [lang]);

  const now = Date.now();
  const lvl = state ? playerLevel(state.xp) : null;
  const streak = state ? currentStreak(state, now) : 0;
  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-dvh">
      <div className="app-backdrop" />
      <a href="#main" className="sr-only-focusable fixed left-3 top-3 z-[70] rounded-lg bg-primary px-3 py-2 text-white">
        Aller au contenu
      </a>
      <Toasts />

      {/* Barre latérale (ordinateur) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-elevated/80 backdrop-blur-xl lg:flex">
        <div className="px-5 py-5">
          <Link href="/dashboard" aria-label="English Quest — tableau de bord">
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-6" aria-label="Navigation principale">
          {NAV.map((g) => (
            <div key={g.group} className="mb-4">
              <p className="px-3 pb-1.5 text-[0.7rem] font-semibold uppercase tracking-widest text-faint">{g.group}</p>
              <ul className="space-y-0.5">
                {g.items.map((it) => (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      aria-current={active(it.href) ? "page" : undefined}
                      className={cx(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                        active(it.href) ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-fg",
                      )}
                    >
                      <Icon name={it.icon} size={18} />
                      {translate(lang, it.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-line px-5 py-3">
          <SyncBadge />
        </div>
      </aside>

      {/* Barre supérieure */}
      <header className="sticky top-0 z-30 border-b border-line bg-bg/75 backdrop-blur-xl lg:pl-64">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/dashboard" className="lg:hidden" aria-label="Accueil">
            <Logo compact />
          </Link>
          <div className="hidden lg:block">
            <SyncBadge />
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {state && lvl ? (
              <>
                <Link href="/stats" className="flex items-center gap-1.5 rounded-full bg-amber-soft px-2.5 py-1 text-sm font-bold text-amber" title={`Série : ${streak} jour(s)`}>
                  <Icon name="flame" size={16} />
                  <span>{streak}</span>
                  <span className="sr-only">jours de série</span>
                </Link>
                <Link href="/stats" className="flex items-center gap-1.5 rounded-full bg-green-soft px-2.5 py-1 text-sm font-bold text-green" title="Expérience totale">
                  <Icon name="bolt" size={16} />
                  <span>{state.xp.toLocaleString("fr-FR")}</span>
                  <span className="sr-only">XP</span>
                </Link>
                <Link href="/profile" className="flex items-center gap-2 rounded-full border border-line bg-surface px-2 py-0.5" title="Niveau de joueur et niveau CECRL débloqué">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-hero text-[0.7rem] font-bold text-white">{lvl.level}</span>
                  <span className="text-xs font-semibold text-muted">{state.profile.level}</span>
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main id="main" className="pb-safe-nav lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{ready ? children : <Loading label="Chargement de votre progression…" />}</div>
      </main>

      {/* Navigation inférieure (mobile / tablette) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-elevated/95 backdrop-blur-xl lg:hidden" aria-label="Navigation mobile" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {BOTTOM.map((b) => {
            const on = b.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
            return (
              <li key={b.href}>
                <Link href={b.href} aria-current={on ? "page" : undefined} className={cx("flex flex-col items-center gap-0.5 py-2.5 text-[0.7rem] font-semibold", on ? "text-primary" : "text-faint")}>
                  <span className={cx("grid h-8 w-12 place-items-center rounded-full transition", on && "bg-primary-soft")}>
                    <Icon name={b.icon} size={20} />
                  </span>
                  {translate(lang, b.key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
