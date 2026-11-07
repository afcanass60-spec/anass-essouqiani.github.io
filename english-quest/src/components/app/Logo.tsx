import { useId } from "react";

export function LogoMark({ size = 34 }: { size?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id={`eq-g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3d7bff" />
          <stop offset=".6" stopColor="#9b6bff" />
          <stop offset="1" stopColor="#2fd58b" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill={`url(#eq-g${id})`} />
      {/* Montagne / sommet C1 + drapeau */}
      <path d="M7 30 16 15l5 7 3-4 9 12z" fill="#fff" fillOpacity=".95" />
      <path d="M24 18V8.5l6 2.2-6 2.3" stroke="#fff" strokeWidth="2" strokeLinejoin="round" fill="none" />
      <path d="M13.6 19 16 15l2.6 3.6-2.6-1.2z" fill="#3d7bff" fillOpacity=".55" />
    </svg>
  );
}

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={compact ? 30 : 34} />
      {!compact ? (
        <span className="font-display text-lg font-bold leading-none">
          English <span className="text-gradient">Quest</span>
        </span>
      ) : null}
    </span>
  );
}
