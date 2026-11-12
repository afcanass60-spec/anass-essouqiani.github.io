"use client";

import clsx from "clsx";
import {
  Bell, Briefcase, Building2, FileText, LayoutDashboard, LogOut, Menu, Moon, Radar, Search, Settings, Sun, X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

import { api, Me } from "@/lib/api";
import { Spinner } from "./ui";

const NAV = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/offers", label: "Offres", icon: Search },
  { href: "/applications", label: "Candidatures", icon: Briefcase },
  { href: "/studio", label: "Career Studio", icon: FileText },
  { href: "/companies", label: "Entreprises", icon: Building2 },
  { href: "/searches", label: "Recherches & agent", icon: Radar },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  useEffect(() => {
    try {
      const t = (localStorage.getItem("theme") as "light" | "dark" | null) ?? "system";
      setTheme(t);
    } catch {}
  }, []);
  const apply = (t: "light" | "dark" | "system") => {
    setTheme(t);
    const root = document.documentElement;
    if (t === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", t);
    try {
      if (t === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", t);
    } catch {}
  };
  return { theme, apply };
}

export default function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { theme, apply } = useTheme();

  useEffect(() => {
    api.get<Me>("/api/auth/me").then(setMe).catch(() => router.replace("/login"));
  }, [router]);
  useEffect(() => {
    if (!me) return;
    const load = () => api.get<{ unread: number }>("/api/notifications").then((n) => setUnread(n.unread)).catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [me, pathname]);
  useEffect(() => setOpen(false), [pathname]);

  if (!me) return <div className="grid min-h-screen place-items-center"><Spinner /></div>;

  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-3">
      <Link href="/" className="mb-4 flex items-center gap-2 px-2 pt-1">
        <div className="grid size-7 place-items-center rounded-lg bg-accent text-accent-text"><Radar className="size-4" /></div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Job Hunter AI</div>
          <div className="text-[11px] text-muted">Agent de recherche d&apos;emploi</div>
        </div>
      </Link>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link key={href} href={href}
            className={clsx("flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
              active ? "bg-surface-2 font-medium text-text" : "text-muted hover:bg-surface-2 hover:text-text")}>
            <Icon className="size-4" />
            <span className="flex-1">{label}</span>
            {href === "/notifications" && unread > 0 && <span className="rounded-full bg-accent px-1.5 text-[10px] font-semibold text-accent-text">{unread}</span>}
          </Link>
        );
      })}
      <div className="mt-auto space-y-1 border-t border-border pt-3">
        <button onClick={() => apply(isDark ? "light" : "dark")} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-text">
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />} {isDark ? "Mode clair" : "Mode sombre"}
        </button>
        <button onClick={async () => { await api.post("/api/auth/logout"); router.replace("/login"); }}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-text">
          <LogOut className="size-4" /> Déconnexion
        </button>
        <div className="truncate px-2.5 pt-1 text-[11px] text-muted">{me.email}</div>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border bg-surface lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)}>
          <aside className="h-full w-64 border-r border-border bg-surface" onClick={(e) => e.stopPropagation()}>{sidebar}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur">
          <button className="rounded-md p-1.5 hover:bg-surface-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Menu">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <form className="relative max-w-md flex-1" onSubmit={(e) => { e.preventDefault(); router.push(`/offers?q=${encodeURIComponent(q)}`); }}>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une offre, une entreprise, une techno…"
              className="h-9 w-full rounded-lg border border-border bg-surface pl-8 pr-3 text-sm placeholder:text-muted focus:border-accent focus:outline-none" />
          </form>
          <Link href="/notifications" className="relative rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-text" aria-label="Notifications">
            <Bell className="size-5" />
            {unread > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-accent" />}
          </Link>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
