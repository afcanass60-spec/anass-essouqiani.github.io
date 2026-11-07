import type { SVGProps } from "react";

/* Jeu d'icônes cohérent (trait 1.8, coins arrondis), dessiné pour l'application. */

const P: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  map: "M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5zM9 4v13M15 6.5v13",
  book: "M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5zM4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3",
  pen: "M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16zM13.5 6.5l4 4",
  headphones: "M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v6H5a1 1 0 0 1-1-1zM20 14h-3v6h2a1 1 0 0 0 1-1z",
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  chat: "M4 5h16v11H9l-5 4z",
  library: "M4 4h4v16H4zM10 4h4v16h-4zM16 5l3.5-.8 2.5 15.6-3.5.8z",
  feather: "M20 4c-6 0-12 4-13 13l-3 3M7 17h7M10 13h7c1-3 2-6 3-9",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 13v4M8 21h8M9 17h6v4H9z",
  chart: "M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L15 3.5h-4L10.6 6a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L6.6 11a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.4z",
  flame: "M12 21c-4 0-7-2.7-7-6.5 0-3.5 2.5-5.5 4-8 .5 2 1.5 3 3 3.5C12 7 13 5 14 3c2.5 2.5 5 6 5 10.5 0 4.4-3 7.5-7 7.5zM12 21c-1.7 0-3-1.2-3-3 0-2 1.5-2.8 2-4 1 .8 4 2 4 4 0 1.8-1.3 3-3 3z",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9z",
  check: "m5 12.5 4.5 4.5L19 7.5",
  x: "M6 6l12 12M18 6 6 18",
  play: "M7 4.5v15l12-7.5z",
  pause: "M7 4h3.5v16H7zM13.5 4H17v16h-3.5z",
  stop: "M6 6h12v12H6z",
  volume: "M4 9.5v5h4l5 4v-13l-5 4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12",
  repeat: "M4 12V9a3 3 0 0 1 3-3h12l-3-3M20 12v3a3 3 0 0 1-3 3H5l3 3",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
  alert: "M12 3 2 20h20zM12 10v4M12 17h.01",
  lock: "M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11",
  unlock: "M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 0 1 6.8-1.2",
  sword: "M14.5 3H21v6.5L10 20.5l-3-3zM4 17l3 3M3 21l2.5-2.5M7.5 13.5l3 3",
  compass: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5z",
  flag: "M5 21V4M5 4h12l-2 4 2 4H5",
  crown: "M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z",
  mountain: "M3 20 10 7l4 6 2-3 5 10zM9.2 8.5 10 10l1.3-1",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  eyeOff: "M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.9 0 3.6-.6 5-1.4M9.9 9.9a3 3 0 0 0 4.2 4.2",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  arrowLeft: "M19 12H5M11 6l-6 6 6 6",
  chevronDown: "m6 9 6 6 6-6",
  chevronRight: "m9 6 6 6-6 6",
  sparkles: "M12 3l1.8 4.6L18 9l-4.2 1.6L12 15l-1.8-4.4L6 9l4.2-1.4zM19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8zM5 15l.6 1.5L7 17l-1.4.6L5 19l-.6-1.4L3 17l1.4-.5z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  calendar: "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4",
  send: "M4 12 20 4l-6 16-2.5-6.5z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z",
  logout: "M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5M10 16l-4-4 4-4M6 12h10",
  cloud: "M7 18a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4 1.5A3.8 3.8 0 0 1 17.5 18z",
  wifiOff: "M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 4-2.3M12 20h.01M19 13a10 10 0 0 0-2.7-1.8M2 9.5a15 15 0 0 1 4.3-2.6M22 9.5A15 15 0 0 0 11 6",
  shield: "M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  upload: "M12 20V9M7 14l5-5 5 5M5 4h14",
  menu: "M4 6h16M4 12h16M4 18h16",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  heart: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z",
  layers: "m12 3 9 5-9 5-9-5zM3 13l9 5 9-5",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5h.01",
  bookmark: "M6 3h12v18l-6-4-6 4z",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15 9.5h.01",
  slow: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 12l-4-3",
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 20, ...rest }: { name: IconName | string; size?: number } & SVGProps<SVGSVGElement>) {
  const d = P[name] ?? P.star;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
      <path d={d} />
    </svg>
  );
}
