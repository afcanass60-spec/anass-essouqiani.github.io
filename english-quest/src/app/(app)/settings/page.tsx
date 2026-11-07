"use client";

import { useRef, useState } from "react";
import { applyTheme, useStore } from "@/lib/store";
import { hydrateState, type Settings } from "@/lib/state";
import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";
import { deleteRemoteData } from "@/lib/sync/client";
import { useAiStatus } from "@/lib/useAi";
import { useVoicesReady, speak } from "@/lib/audio";
import { Button, Card, Notice, PageHeader, Tabs } from "@/components/ui/primitives";

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-line py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold">{label}</p>
        {hint ? <p className="text-sm text-muted">{hint}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { state, act, user, syncStatus, syncError, syncNow, resetLocal, replaceState, notify } = useStore();
  const ai = useAiStatus();
  const voices = useVoicesReady();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!state) return null;
  const s = state.settings;
  const set = (patch: Partial<Settings>) => act((d) => void Object.assign(d.settings, patch), { silent: true });

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `english-quest-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importData(file: File) {
    try {
      const parsed = hydrateState(JSON.parse(await file.text()));
      if (!parsed) throw new Error("format");
      replaceState({ ...parsed, sync: {} });
      applyTheme(parsed.settings.theme);
      notify("Progression importée");
    } catch {
      notify("Fichier invalide", "error");
    }
  }

  async function resetAll() {
    setBusy(true);
    try {
      const sb = getSupabase();
      if (sb && user) await deleteRemoteData(sb, user.id);
      resetLocal();
      notify("Progression réinitialisée");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Erreur", "error");
    } finally {
      setBusy(false);
      setConfirmReset(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader icon="settings" title="Paramètres" />

      <Card>
        <h2 className="font-display text-lg font-bold">Apparence et langue</h2>
        <Row label="Thème">
          <Tabs<Settings["theme"]> label="Thème" value={s.theme} onChange={(v) => { set({ theme: v }); applyTheme(v); }} options={[{ value: "dark", label: "Sombre" }, { value: "light", label: "Clair" }]} />
        </Row>
        <Row label="Langue de l'interface" hint="Passez l'interface en anglais pour une immersion totale.">
          <Tabs<Settings["uiLang"]> label="Langue de l'interface" value={s.uiLang} onChange={(v) => set({ uiLang: v })} options={[{ value: "fr", label: "Français" }, { value: "en", label: "English" }]} />
        </Row>
        <Row label="Traductions françaises" hint="Afficher la traduction des mots (désactivez-la pour progresser vers C1).">
          <input type="checkbox" checked={s.showTranslations} onChange={(e) => set({ showTranslations: e.target.checked })} className="h-5 w-5 accent-[var(--primary)]" aria-label="Afficher les traductions" />
        </Row>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-bold">Audio</h2>
        <Row label="Accent préféré" hint="Pour la prononciation des mots, la reconnaissance vocale et la lecture des textes.">
          <Tabs<Settings["accent"]> label="Accent" value={s.accent} onChange={(v) => set({ accent: v })} options={[{ value: "en-GB", label: "🇬🇧 Britannique" }, { value: "en-US", label: "🇺🇸 Américain" }]} />
        </Row>
        <Row label="Vitesse de la voix" hint={`${s.speechRate.toFixed(2)}×`}>
          <div className="flex items-center gap-2">
            <input type="range" min={0.6} max={1.3} step={0.05} value={s.speechRate} onChange={(e) => set({ speechRate: Number(e.target.value) })} className="w-40 accent-[var(--primary)]" aria-label="Vitesse de la voix" />
            <Button size="sm" variant="secondary" icon="volume" onClick={() => speak("This is how fast I will speak.", { lang: s.accent, rate: s.speechRate })}>Tester</Button>
          </div>
        </Row>
        <p className="pt-2 text-xs text-faint">{voices.supported ? `${voices.englishVoices} voix anglaise(s) détectée(s) sur cet appareil.` : "Synthèse vocale non prise en charge par ce navigateur."}</p>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-bold">Rythme d&apos;apprentissage</h2>
        <Row label="Durée des séances">
          <Tabs<string> label="Durée" value={String(s.sessionMinutes)} onChange={(v) => set({ sessionMinutes: Number(v) as Settings["sessionMinutes"] })} options={[{ value: "30", label: "30 min" }, { value: "45", label: "45 min" }, { value: "60", label: "60 min" }]} />
        </Row>
        <Row label="Mode" hint="Léger : 60 XP/jour · Normal : 120 · Intensif : 220">
          <Tabs<Settings["mode"]> label="Mode" value={s.mode} onChange={(v) => set({ mode: v })} options={[{ value: "light", label: "Léger" }, { value: "normal", label: "Normal" }, { value: "intensive", label: "Intensif" }]} />
        </Row>
        <Row label="Nouveaux mots par jour" hint={`${s.dailyNewWords} mots`}>
          <input type="range" min={5} max={30} step={1} value={s.dailyNewWords} onChange={(e) => set({ dailyNewWords: Number(e.target.value) })} className="w-40 accent-[var(--primary)]" aria-label="Nouveaux mots par jour" />
        </Row>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-bold">Services connectés</h2>
        <Row label="Intelligence artificielle" hint={ai.loading ? "Vérification…" : ai.configured ? `Connectée (${ai.provider} · ${ai.model})` : "Non configurée : conversation, correction de l'écrit et analyse de l'oral désactivées."}>
          <span className={ai.configured ? "font-semibold text-green" : "font-semibold text-amber"}>{ai.configured ? "Active" : "Inactive"}</span>
        </Row>
        <Row label="Compte et synchronisation" hint={!supabaseConfigured ? "Mode local : Supabase n'est pas configuré. Utilisez l'export pour sauvegarder." : user ? `Connecté (${user.email}) — état : ${syncStatus}${syncError ? ` (${syncError})` : ""}` : "Non connecté : progression stockée sur cet appareil."}>
          {user ? <Button size="sm" variant="secondary" icon="cloud" onClick={() => void syncNow()}>Synchroniser</Button> : null}
        </Row>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-bold">Données</h2>
        <Row label="Exporter ma progression" hint="Fichier JSON contenant toute votre progression.">
          <Button size="sm" variant="secondary" icon="download" onClick={exportData}>Exporter</Button>
        </Row>
        <Row label="Importer une progression" hint="Remplace la progression actuelle de cet appareil.">
          <>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && void importData(e.target.files[0])} />
            <Button size="sm" variant="secondary" icon="upload" onClick={() => fileRef.current?.click()}>Importer</Button>
          </>
        </Row>
        <Row label="Réinitialiser" hint={user ? "Efface la progression locale ET les données de votre compte." : "Efface la progression de cet appareil."}>
          {!confirmReset ? (
            <Button size="sm" variant="ghost" icon="trash" onClick={() => setConfirmReset(true)}>Réinitialiser…</Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="danger" loading={busy} onClick={() => void resetAll()}>Confirmer</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>Annuler</Button>
            </div>
          )}
        </Row>
      </Card>
      <Notice tone="blue" icon="shield">Vos données d&apos;apprentissage ne sont jamais partagées. Avec un compte, chaque ligne de la base est protégée par des règles d&apos;accès (RLS) : vous seul pouvez la lire ou la modifier.</Notice>
    </div>
  );
}
