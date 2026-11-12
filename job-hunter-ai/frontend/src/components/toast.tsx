"use client";

import clsx from "clsx";
import { createContext, ReactNode, useCallback, useContext, useState } from "react";

type Toast = { id: number; text: string; tone: "info" | "error" | "success" };
const Ctx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, text, tone }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 4500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex max-w-sm flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={clsx("pointer-events-auto rounded-lg border px-3 py-2 text-sm shadow-lg",
            t.tone === "error" ? "border-danger/30 bg-danger-soft text-danger" : t.tone === "success" ? "border-success/30 bg-success-soft text-success" : "border-border bg-surface")}>
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
