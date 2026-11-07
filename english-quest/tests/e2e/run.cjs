/* Tests de bout en bout : démarre le serveur de production (next start) avec le
   faux fournisseur IA, puis parcourt l'application avec Playwright.
   Prérequis : `npm run build`. Lancement : `npm run test:e2e`. */
const { spawn } = require("node:child_process");
const path = require("node:path");
const { chromium, devices } = require("playwright");
const mock = require("./mock-ai.cjs");

const PORT = 3123;
const BASE = `http://localhost:${PORT}`;
const results = [];
let failures = 0;

async function step(name, fn) {
  const t = Date.now();
  try {
    await fn();
    results.push(`✓ ${name} (${Date.now() - t} ms)`);
  } catch (e) {
    failures++;
    results.push(`✗ ${name}\n    ${String(e && e.message ? e.message : e).split("\n").slice(0, 4).join("\n    ")}`);
  }
}

function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("server did not start");
}

(async () => {
  const ai = await mock.start(3999);
  const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "-p", String(PORT)], {
    cwd: path.resolve(__dirname, "../.."),
    env: { ...process.env, AI_PROVIDER: "openai-compatible", AI_BASE_URL: "http://localhost:3999/v1", AI_MODEL: "mock-model", NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "" },
    stdio: "ignore",
  });
  const browser = await chromium.launch();
  try {
    await waitFor(`${BASE}/api/ai/status`);
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && !/favicon|dictionaryapi|Failed to load resource/.test(m.text()) && errors.push(m.text()));

    await step("Statut IA exposé sans secret", async () => {
      const s = await (await fetch(`${BASE}/api/ai/status`)).json();
      expect(s.configured === true && s.provider === "openai-compatible", JSON.stringify(s));
      expect(!JSON.stringify(s).includes("key"), "no key leak");
    });

    await step("Route IA : validation des entrées", async () => {
      const r = await fetch(`${BASE}/api/ai/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ persona: "nobody" }) });
      expect(r.status === 400, `status ${r.status}`);
      const u = await fetch(`${BASE}/api/ai/unknown`, { method: "POST", body: "{}" });
      expect(u.status === 404, `unknown task ${u.status}`);
    });

    await step("Landing page", async () => {
      await page.goto(BASE);
      await page.getByRole("heading", { level: 1 }).waitFor();
      expect((await page.title()).includes("English Quest"), "title");
    });

    await step("Test de positionnement complet", async () => {
      await page.goto(`${BASE}/placement`);
      await page.getByRole("button", { name: "Commencer le test" }).click();
      for (let i = 0; i < 60; i++) {
        if (await page.getByText("Votre profil de niveau").isVisible().catch(() => false)) break;
        const options = page.locator("fieldset button");
        if (await options.count()) {
          await options.first().click();
        } else {
          const inputs = page.locator('input[aria-label^="Réponse"]');
          const n = await inputs.count();
          for (let k = 0; k < n; k++) await inputs.nth(k).fill("x");
        }
        await page.getByRole("button", { name: "Vérifier" }).click();
        await page.getByRole("button", { name: "Continuer" }).click();
      }
      await page.getByText("Votre profil de niveau").waitFor({ timeout: 5000 });
    });

    await step("Tableau de bord après le test", async () => {
      await page.goto(`${BASE}/dashboard`);
      await page.getByText("Recommandé pour vous").waitFor();
      expect(!(await page.getByText("Commencez par le test de positionnement").isVisible()), "placement banner should disappear");
    });

    await step("Leçon : découverte de vocabulaire + persistance", async () => {
      await page.goto(`${BASE}/lesson/b1-l1`);
      await page.getByRole("button", { name: "Commencer" }).click();
      await page.getByRole("button", { name: "J'ai compris" }).click();
      await page.getByText(/Que signifie/).waitFor();
      await page.locator("fieldset button").first().click();
      await page.getByRole("button", { name: "Vérifier" }).click();
      await page.getByRole("button", { name: "Continuer" }).click();
      await page.reload();
      await page.waitForLoadState("networkidle");
      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("eq:v1:guest") || "{}"));
      expect(Object.keys(stored.cards || {}).length >= 1, "card persisted");
      expect((stored.attempts || []).length > 0, "attempts persisted");
    });

    await step("Grammar Academy : exercice + XP + révision", async () => {
      await page.goto(`${BASE}/grammar/present-perfect`);
      await page.getByRole("tab", { name: /Facile/ }).click();
      // Item 1 : QCM « I ___ to Canada twice » → have been
      await page.getByRole("button", { name: /have been/ }).click();
      await page.getByRole("button", { name: "Vérifier" }).click();
      await page.getByText("Correct !").waitFor();
      await page.getByRole("button", { name: "Continuer" }).click();
      // Item 2 : texte à trous, réponse fausse volontaire → révision programmée
      await page.locator('input[aria-label="Réponse 1"]').fill("work");
      await page.getByRole("button", { name: "Vérifier" }).click();
      await page.getByText("Pas tout à fait.").waitFor();
      await page.waitForTimeout(500); // écriture locale différée (250 ms)
      const s = await page.evaluate(() => JSON.parse(localStorage.getItem("eq:v1:guest")));
      expect(s.xp > 0, "xp gained");
      expect(Object.keys(s.revision).includes("g-pp-2"), "failed item scheduled for review");
      expect(s.errors.some((e) => e.topic === "present-perfect"), "error logged with topic");
    });

    await step("Conversation IA (pipeline réel, fournisseur de test)", async () => {
      await page.goto(`${BASE}/conversation`);
      await page.getByRole("button", { name: /Commencer avec Alex/ }).click();
      await page.getByLabel("Votre message en anglais").fill("Yesterday I has a very long day at work");
      await page.getByRole("button", { name: "Envoyer" }).click();
      await page.getByText("Tell me more about it?").waitFor();
      await page.getByText("1 correction").click();
      await page.getByText("Avec I : have.").waitFor();
      await page.getByLabel("Votre message en anglais").fill("I think my manager gives me too much work");
      await page.getByRole("button", { name: "Envoyer" }).click();
      await page.getByText("Tell me more about it?").nth(1).waitFor();
      await page.getByRole("button", { name: /Terminer/ }).click();
      await page.getByText("Bilan de la conversation").waitFor();
      await page.getByText("Progression : 62/100").waitFor();
    });

    await step("Writing Workshop : correction annotée", async () => {
      await page.goto(`${BASE}/writing/w-email-colleague`);
      const text = "Hi Sam, I am agree to help you next week. " + "Could you please check the reports and answer the client emails while I am away? ".repeat(6) + "Thanks a lot, Anass";
      await page.getByLabel("Votre texte").fill(text);
      await page.getByRole("button", { name: "Envoyer pour correction" }).click();
      await page.getByText("Pourquoi ces corrections ?").waitFor();
      await page.locator("mark", { hasText: "I am agree" }).waitFor();
      await page.getByRole("tab", { name: "Version corrigée" }).click();
      await page.waitForTimeout(500);
      const s = await page.evaluate(() => JSON.parse(localStorage.getItem("eq:v1:guest")));
      expect(s.writing.length === 1 && s.writing[0].feedback, "submission saved with feedback");
    });

    await step("Reading Center : dictionnaire au toucher", async () => {
      await page.goto(`${BASE}/reading/repair-cafe`);
      await page.locator(".word-token", { hasText: /^volunteers$/ }).first().click();
      await page.getByRole("dialog").waitFor();
      await page.getByRole("button", { name: "Fermer" }).click();
    });

    await step("Paramètres : thème clair persistant", async () => {
      await page.goto(`${BASE}/settings`);
      await page.getByRole("tab", { name: "Clair" }).click();
      await page.reload();
      await page.waitForLoadState("networkidle");
      expect((await page.evaluate(() => document.documentElement.dataset.theme)) === "light", "theme persisted");
      await page.getByRole("tab", { name: "Sombre" }).click();
    });

    const routes = ["/dashboard", "/session", "/map", "/courses", "/review", "/vocabulary", "/grammar", "/listening", "/listening/flat-viewing", "/speaking", "/speaking/sp-rep-1", "/speaking/sp-desc-1", "/conversation", "/reading", "/writing", "/exams", "/exam/exam-b1", "/library", "/stats", "/leaderboard", "/profile", "/settings", "/login", "/signup", "/boss/b1-c1", "/exam/level/B1", "/does-not-exist"];
    await step(`Toutes les pages s'affichent (${routes.length})`, async () => {
      for (const r of routes) {
        const resp = await page.goto(BASE + r);
        expect(resp && (resp.status() < 400 || r === "/does-not-exist"), `${r} → ${resp && resp.status()}`);
        await page.locator("main").first().waitFor();
      }
    });

    await step("Mobile : navigation inférieure", async () => {
      const m = await browser.newContext({ ...devices["iPhone 13"] });
      const mp = await m.newPage();
      await mp.goto(`${BASE}/dashboard`);
      const nav = mp.getByRole("navigation", { name: "Navigation mobile" });
      await nav.waitFor();
      await nav.getByRole("link", { name: "Carte" }).click();
      await mp.waitForURL(/\/map/);
      const overflow = await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(!overflow, "no horizontal scroll on mobile");
      await m.close();
    });

    await step("Aucune erreur JavaScript", async () => {
      expect(errors.length === 0, errors.slice(0, 5).join("\n"));
    });
  } finally {
    await browser.close();
    server.kill();
    ai.close();
  }
  console.log(results.join("\n"));
  console.log(failures ? `\n${failures} échec(s)` : "\nTous les tests E2E sont passés.");
  process.exit(failures ? 1 : 0);
})();
