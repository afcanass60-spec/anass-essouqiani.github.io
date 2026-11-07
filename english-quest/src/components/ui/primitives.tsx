"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Icon } from "./Icon";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-strong shadow-[0_8px_24px_-10px_var(--primary)]",
  secondary: "bg-surface-2 text-fg border border-line hover:border-line-strong",
  ghost: "text-muted hover:text-fg hover:bg-surface-2",
  danger: "bg-red text-white hover:opacity-90",
  success: "bg-green text-[#04130b] hover:opacity-90",
};
const sizes = { sm: "h-9 px-3 text-sm", md: "h-11 px-5 text-[0.95rem]", lg: "h-13 px-7 text-base" };

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  loading,
  className,
  children,
  ...rest
}: ComponentProps<"button"> & { variant?: Variant; size?: keyof typeof sizes; icon?: string; iconRight?: string; loading?: boolean }) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={loading || rest.disabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : icon ? <Icon name={icon} size={18} /> : null}
      {children}
      {iconRight && !loading ? <Icon name={iconRight} size={18} /> : null}
    </button>
  );
}

export function LinkButton({ href, variant = "primary", size = "md", icon, iconRight, className, children }: { href: string; variant?: Variant; size?: keyof typeof sizes; icon?: string; iconRight?: string; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={cx("inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.98]", variants[variant], sizes[size], className)}>
      {icon ? <Icon name={icon} size={18} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={18} /> : null}
    </Link>
  );
}

export function Card({ className, children, as: As = "div", ...rest }: { className?: string; children: ReactNode; as?: "div" | "section" | "article" } & Record<string, unknown>) {
  return (
    <As className={cx("card p-5", className)} {...rest}>
      {children}
    </As>
  );
}

const pillTone = {
  blue: "bg-primary-soft text-primary",
  violet: "bg-violet-soft text-violet",
  green: "bg-green-soft text-green",
  amber: "bg-amber-soft text-amber",
  red: "bg-red-soft text-red",
  gray: "bg-surface-2 text-muted border border-line",
};
export function Pill({ tone = "gray", icon, children, className }: { tone?: keyof typeof pillTone; icon?: string; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", pillTone[tone], className)}>
      {icon ? <Icon name={icon} size={13} /> : null}
      {children}
    </span>
  );
}

export function Progress({ value, tone = "blue", label, className, height = 8 }: { value: number; tone?: "blue" | "violet" | "green" | "amber" | "grad"; label?: string; className?: string; height?: number }) {
  const v = Math.max(0, Math.min(1, value));
  const bg = tone === "grad" ? "var(--grad-hero)" : `var(--${tone === "blue" ? "primary" : tone})`;
  return (
    <div className={cx("w-full rounded-full bg-line-strong/60 overflow-hidden", className)} style={{ height }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label={label}>
      <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${v * 100}%`, background: bg }} />
    </div>
  );
}

export function Ring({ value, size = 64, stroke = 7, color = "var(--primary)", children, label }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-2)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: "stroke-dashoffset .8s ease" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" fill="none" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Loading({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted" role="status">
      <Spinner /> <span>{label}</span>
    </div>
  );
}

export function Notice({ tone = "blue", icon = "info", title, children, className }: { tone?: "blue" | "amber" | "red" | "green" | "violet"; icon?: string; title?: string; children?: ReactNode; className?: string }) {
  const t = { blue: "border-primary/30 bg-primary-soft", amber: "border-amber/30 bg-amber-soft", red: "border-red/30 bg-red-soft", green: "border-green/30 bg-green-soft", violet: "border-violet/30 bg-violet-soft" }[tone];
  const ic = { blue: "text-primary", amber: "text-amber", red: "text-red", green: "text-green", violet: "text-violet" }[tone];
  return (
    <div className={cx("flex gap-3 rounded-2xl border p-4 text-sm", t, className)} role={tone === "red" ? "alert" : undefined}>
      <Icon name={icon} size={20} className={cx("shrink-0 mt-0.5", ic)} />
      <div className="min-w-0">
        {title ? <p className="font-semibold text-fg">{title}</p> : null}
        {children ? <div className="text-muted mt-0.5 leading-relaxed">{children}</div> : null}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, icon, children, kicker }: { title: string; subtitle?: string; icon?: string; children?: ReactNode; kicker?: string }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-4 min-w-0">
        {icon ? (
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-hero text-white shadow-lg">
            <Icon name={icon} size={24} />
          </div>
        ) : null}
        <div className="min-w-0">
          {kicker ? <p className="text-xs font-semibold uppercase tracking-widest text-primary">{kicker}</p> : null}
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-muted max-w-2xl">{subtitle}</p> : null}
        </div>
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </header>
  );
}

export function Tabs<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-xl border border-line bg-surface-2 p-1 gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx("rounded-lg px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition", value === o.value ? "bg-surface text-fg shadow" : "text-muted hover:text-fg")}
        >
          {o.label}
          {typeof o.count === "number" ? <span className="ml-1.5 rounded-full bg-primary-soft px-1.5 text-xs text-primary">{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Empty({ icon = "sparkles", title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return (
    <div className="card-flat flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
        <Icon name={icon} size={24} />
      </div>
      <p className="font-semibold">{title}</p>
      {children ? <div className="text-sm text-muted max-w-md">{children}</div> : null}
    </div>
  );
}

export function Stat({ icon, label, value, hint, tone = "blue" }: { icon: string; label: string; value: ReactNode; hint?: string; tone?: "blue" | "violet" | "green" | "amber" | "red" }) {
  const t = { blue: "bg-primary-soft text-primary", violet: "bg-violet-soft text-violet", green: "bg-green-soft text-green", amber: "bg-amber-soft text-amber", red: "bg-red-soft text-red" }[tone];
  return (
    <div className="card p-4 flex items-center gap-3 min-w-0">
      <div className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-xl", t)}>
        <Icon name={icon} size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted truncate">{label}</p>
        <p className="font-display text-xl font-bold leading-tight">{value}</p>
        {hint ? <p className="text-xs text-faint truncate">{hint}</p> : null}
      </div>
    </div>
  );
}

export const LEVEL_TONE: Record<string, "blue" | "violet" | "green" | "amber" | "gray"> = { A2: "gray", B1: "blue", "B1+": "blue", B2: "violet", "B2+": "violet", C1: "green" };
export function LevelPill({ level }: { level: string }) {
  return <Pill tone={LEVEL_TONE[level] ?? "gray"}>{level}</Pill>;
}
