"use client";

import { Radar } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { Button, Field, Input, Notice } from "@/components/ui";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [canRegister, setCanRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<{ needs_setup: boolean; registration_open: boolean }>("/api/auth/bootstrap").then((b) => {
      setCanRegister(b.registration_open);
      if (b.needs_setup) setMode("register");
    }).catch(() => {});
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") await api.post("/api/auth/login", { email, password });
      else await api.post("/api/auth/register", { email, password, full_name: name });
      router.replace("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="grid size-11 place-items-center rounded-xl bg-accent text-accent-text"><Radar className="size-6" /></div>
          <div>
            <h1 className="text-lg font-semibold">Job Hunter AI</h1>
            <p className="text-sm text-muted">{mode === "login" ? "Connectez-vous à votre agent" : "Créez votre compte (premier utilisateur = administrateur)"}</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-surface p-5">
          {mode === "register" && <Field label="Nom complet"><Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>}
          <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
          <Field label="Mot de passe" hint={mode === "register" ? "10 caractères minimum, 3 types (minuscules, majuscules, chiffres, symboles)." : undefined}>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </Field>
          {error && <Notice tone="danger">{error}</Notice>}
          <Button variant="primary" className="w-full" loading={loading} type="submit">{mode === "login" ? "Se connecter" : "Créer le compte"}</Button>
          {canRegister && (
            <button type="button" className="w-full text-center text-xs text-muted hover:text-text" onClick={() => setMode(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Créer un compte" : "J'ai déjà un compte"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
