"use client";

import { useEffect } from "react";

/** Enregistre le service worker (PWA : installation et fonctionnement hors ligne). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_STATIC === "1" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
