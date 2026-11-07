"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import { Logo } from "@/components/app/Logo";
import { Button, Card, LinkButton, Notice } from "@/components/ui/primitives";

type Mode = "login" | "signup" | "reset" | "update";

const MESSAGES: Record<string, string> = {
  "Invalid login credentials": "Email ou mot de passe incorrect.",
  "Email not confirmed": "Confirmez votre adresse email (lien reçu par email) avant de vous connecter.",
  "User already registered": "Un compte existe déjà avec cet email.",
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { user } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!supabaseConfigured) {
    return (
      <Shell title="Comptes non configurés">
        <Notice tone="amber" title="Supabase n'est pas configuré sur ce déploiement">
          L&apos;application fonctionne en mode local : votre progression est enregistrée dans ce navigateur. Pour activer les comptes et la synchronisation multi-appareils, renseignez <code>NEXT_PUBLIC_SUPABASE_URL</code> et <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (voir le README).
        </Notice>
        <LinkButton href="/dashboard" iconRight="arrowRight" className="w-full">Continuer en mode local</LinkButton>
      </Shell>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabase()!;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "login") {
        const { error: err } = await sb.auth.signInWithPassword({ email, password });
        if (err) throw err;
        router.push("/dashboard");
      } else if (mode === "signup") {
        const { data, error: err } = await sb.auth.signUp({ email, password, options: { data: { display_name: name.trim().slice(0, 40) || "Apprenant" }, emailRedirectTo: `${window.location.origin}/dashboard` } });
        if (err) throw err;
        if (data.session) router.push("/placement");
        else setInfo("Compte créé ! Vérifiez votre boîte mail pour confirmer votre adresse, puis connectez-vous.");
      } else if (mode === "reset") {
        const { error: err } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password?update=1` });
        if (err) throw err;
        setInfo("Si un compte existe pour cet email, un lien de réinitialisation vient d'être envoyé.");
      } else {
        const { error: err } = await sb.auth.updateUser({ password });
        if (err) throw err;
        setInfo("Mot de passe mis à jour.");
        router.push("/dashboard");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(MESSAGES[msg] ?? msg);
    } finally {
      setLoading(false);
    }
  }

  const titles: Record<Mode, string> = { login: "Connexion", signup: "Créer un compte", reset: "Mot de passe oublié", update: "Nouveau mot de passe" };
  return (
    <Shell title={titles[mode]}>
      {user && mode !== "update" ? <Notice tone="green" title={`Déjà connecté : ${user.email}`}><Link href="/dashboard" className="font-semibold text-primary underline">Aller au tableau de bord</Link></Notice> : null}
      <form onSubmit={submit} className="space-y-4" noValidate>
        {mode === "signup" ? (
          <Field label="Pseudo" id="name"><input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="nickname" className="input" /></Field>
        ) : null}
        {mode !== "update" ? (
          <Field label="Email" id="email"><input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="input" /></Field>
        ) : null}
        {mode !== "reset" ? (
          <Field label="Mot de passe" id="password" hint={mode === "signup" || mode === "update" ? "8 caractères minimum" : undefined}>
            <input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} className="input" />
          </Field>
        ) : null}
        {error ? <Notice tone="red" title="Erreur">{error}</Notice> : null}
        {info ? <Notice tone="green" title="C'est noté">{info}</Notice> : null}
        <Button type="submit" className="w-full" size="lg" loading={loading} disabled={(mode !== "update" && !email.includes("@")) || (mode !== "reset" && password.length < 8)}>
          {titles[mode]}
        </Button>
      </form>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        {mode === "login" ? <><Link href="/signup" className="text-primary hover:underline">Créer un compte</Link><Link href="/reset-password" className="text-muted hover:underline">Mot de passe oublié ?</Link></> : <Link href="/login" className="text-primary hover:underline">J&apos;ai déjà un compte</Link>}
      </div>
      <p className="text-center text-xs text-faint">Vous pouvez aussi <Link href="/dashboard" className="underline">continuer sans compte</Link> : la progression restera sur cet appareil et sera reprise à la connexion.</p>
    </Shell>
  );
}

function Field({ label, id, hint, children }: { label: string; id: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-semibold">{label}</label>
      {children}
      {hint ? <p className="text-xs text-faint">{hint}</p> : null}
    </div>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="app-backdrop" />
      <div className="w-full max-w-md space-y-6">
        <Link href="/" className="flex justify-center" aria-label="Accueil English Quest"><Logo /></Link>
        <Card className="space-y-5 p-6">
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          {children}
        </Card>
      </div>
    </main>
  );
}
