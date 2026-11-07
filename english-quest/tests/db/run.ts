/* Tests de la base de données sur un PostgreSQL réel :
   migration + seed, déclencheur de profil, politiques RLS (isolation entre
   utilisateurs), classement facultatif, et aller-retour de la synchronisation
   (état local → lignes SQL → état) avec le même code que l'application.
   Usage : DATABASE_URL=postgres://postgres@localhost:54329/postgres npm run test:db */
import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { createInitialState } from "../../src/lib/state";
import { recordAttempt, recordVocab, addXp } from "../../src/lib/engine/actions";
import { grammarItems } from "../../src/content";
import { CONFLICT_KEYS, TABLE_ORDER, rowsToState, stateToRows, type Rows } from "../../src/lib/sync/mapping";

const URL = process.env.DATABASE_URL ?? "postgres://postgres@localhost:54329/postgres";
const DB = "eq_test";
const root = path.resolve(__dirname, "../..");
let failures = 0;
const log: string[] = [];

async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    log.push(`✓ ${name}`);
  } catch (e) {
    failures++;
    log.push(`✗ ${name}\n    ${(e as Error).message}`);
  }
}
const assert = (c: unknown, m: string) => {
  if (!c) throw new Error(m);
};

const STUB = `
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
create or replace function auth.uid() returns uuid language sql stable as $f$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $f$;
grant usage on schema auth to anon, authenticated;
`;
const GRANTS = `
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
`;

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

async function as(c: Client, user: string | null, sql: string, params: unknown[] = []) {
  await c.query("begin");
  try {
    await c.query(`set local role ${user ? "authenticated" : "anon"}`);
    await c.query(`select set_config('request.jwt.claim.sub', $1, true)`, [user ?? ""]);
    const r = await c.query(sql, params);
    await c.query("commit");
    return r;
  } catch (e) {
    await c.query("rollback");
    throw e;
  }
}

/** Upsert d'un lot de lignes, comme PostgREST (on conflict … do update). */
async function upsert(c: Client, user: string, table: keyof Rows, rows: Record<string, unknown>[]) {
  for (const r of rows) {
    const cols = Object.keys(r);
    const vals = cols.map((k) => (r[k] !== null && typeof r[k] === "object" ? JSON.stringify(r[k]) : r[k]));
    const conflict = CONFLICT_KEYS[table];
    const updates = cols.filter((k) => !conflict.split(",").includes(k)).map((k) => `${k} = excluded.${k}`);
    await as(c, user, `insert into ${table} (${cols.join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")}) on conflict (${conflict}) do ${updates.length ? `update set ${updates.join(",")}` : "nothing"}`, vals);
  }
}

(async () => {
  const admin = new Client({ connectionString: URL });
  await admin.connect();
  await admin.query(`drop database if exists ${DB}`);
  await admin.query(`create database ${DB}`);
  await admin.end();
  const c = new Client({ connectionString: URL.replace(/\/[^/]*$/, `/${DB}`) });
  await c.connect();

  await check("Migration appliquée", async () => {
    await c.query(STUB);
    for (const f of ["20261107000000_init.sql"]) await c.query(readFileSync(path.join(root, "supabase/migrations", f), "utf8"));
    await c.query(GRANTS);
  });
  await check("Seed du contenu pédagogique", async () => {
    await c.query(readFileSync(path.join(root, "supabase/seed.sql"), "utf8"));
    const { rows } = await c.query("select (select count(*) from vocabulary) v, (select count(*) from questions) q, (select count(*) from lessons) l");
    assert(Number(rows[0].v) > 200 && Number(rows[0].q) > 500 && Number(rows[0].l) > 15, JSON.stringify(rows[0]));
  });
  await check("Profil créé automatiquement à l'inscription", async () => {
    await c.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1,'a@x.io','{"display_name":"Alice"}'), ($2,'b@x.io','{}')`, [A, B]);
    const { rows } = await c.query("select id, display_name from profiles order by display_name");
    assert(rows.length === 2 && rows.some((r) => r.display_name === "Alice"), JSON.stringify(rows));
  });
  await check("Contenu lisible par un visiteur anonyme", async () => {
    const r = await as(c, null, "select count(*) from grammar_topics");
    assert(Number(r.rows[0].count) === 19, "grammar topics");
  });
  await check("Un visiteur anonyme ne voit aucun profil", async () => {
    const r = await as(c, null, "select count(*) from profiles");
    assert(Number(r.rows[0].count) === 0, "anon sees profiles");
  });

  // État réaliste produit par le moteur de l'application
  const now = Date.now();
  const s = createInitialState(now, "Alice");
  const items = grammarItems("passive");
  recordAttempt(s, items[0], true, "grammar", now);
  recordAttempt(s, items[1], false, "grammar", now + 1, { response: "x", expected: "y" });
  recordVocab(s, "deadline", "recall", true, now + 2, true);
  addXp(s, 40, now + 3);
  s.achievements["first-lesson"] = now;
  s.quests["d:2026-03-10:learn-words"] = now;
  s.progress["lesson:b1-l1"] = { best: 0.8, tries: 1, completedAt: now, updatedAt: now };
  s.writing.push({ id: "33333333-3333-4333-8333-333333333333", taskId: "w-email-colleague", level: "B1", ts: now, text: "Hello", wordCount: 1 });
  s.conversations.push({ id: "44444444-4444-4444-8444-444444444444", persona: "alex", mode: "free", startedAt: now, updatedAt: now, messages: [{ role: "assistant", content: "Hi", ts: now }, { role: "user", content: "Hello", ts: now }] });
  s.exams.push({ id: "55555555-5555-4555-8555-555555555555", examId: "exam-b1", kind: "mock", level: "B1", startedAt: now, finishedAt: now, results: [{ skill: "grammar", score: 6, max: 8, evaluated: true }] });

  await check("Synchronisation : toutes les tables acceptent les lignes de l'application (RLS)", async () => {
    const rows = stateToRows(s, A, 0, now);
    for (const t of TABLE_ORDER) await upsert(c, A, t, rows[t]);
    // Deuxième push identique : idempotent
    for (const t of TABLE_ORDER) await upsert(c, A, t, rows[t]);
  });
  await check("Synchronisation : aller-retour fidèle", async () => {
    const back: Partial<Rows> = {};
    for (const t of TABLE_ORDER) {
      const col = t === "profiles" ? "id" : "user_id";
      const r = await as(c, A, `select * from ${t} where ${col} = $1`, [A]);
      back[t] = r.rows.map((x) => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v])));
    }
    const restored = rowsToState(back, now);
    assert(restored.xp === s.xp, `xp ${restored.xp} vs ${s.xp}`);
    assert(restored.attempts.length === 2, "attempts");
    assert(restored.cards.deadline?.learnedAt, "card learned");
    assert(Object.keys(restored.revision).length === 1, "revision");
    assert(restored.errors.length === 1 && restored.errors[0].topic === "passive", "errors");
    assert(restored.conversations[0]?.messages.length === 2, "messages");
    assert(restored.exams[0]?.results[0]?.score === 6, "exam results");
    assert(restored.profile.displayName === "Alice", "profile");
  });
  await check("RLS : B ne lit aucune donnée de A", async () => {
    for (const t of ["user_vocabulary", "exercise_attempts", "error_history", "conversations", "conversation_messages", "writing_submissions", "exam_results", "learning_sessions"]) {
      const r = await as(c, B, `select count(*) from ${t}`);
      assert(Number(r.rows[0].count) === 0, `${t} visible by B`);
    }
    const p = await as(c, B, "select id from profiles");
    assert(p.rows.length === 1 && p.rows[0].id === B, "profiles isolation");
  });
  await check("RLS : B ne peut pas écrire pour A", async () => {
    let blocked = false;
    try {
      await as(c, B, `insert into user_vocabulary (user_id, word_key, vocabulary_id) values ($1, 'deadline', 'deadline')`, [A]);
    } catch {
      blocked = true;
    }
    assert(blocked, "insert for other user allowed");
    const u = await as(c, B, `update profiles set xp = 999999 where id = $1`, [A]);
    assert(u.rowCount === 0, "update other profile allowed");
  });
  await check("RLS : impossible d'ajouter un message dans la conversation d'un autre", async () => {
    let blocked = false;
    try {
      await as(c, B, `insert into conversation_messages (conversation_id, user_id, position, role, content) values ('44444444-4444-4444-8444-444444444444', $1, 9, 'user', 'hack')`, [B]);
    } catch {
      blocked = true;
    }
    assert(blocked, "cross-conversation insert allowed");
  });
  await check("Validation des données (contraintes)", async () => {
    let blocked = false;
    try {
      await as(c, A, `update profiles set xp = -5 where id = $1`, [A]);
    } catch {
      blocked = true;
    }
    assert(blocked, "negative xp accepted");
  });
  await check("Classement : seuls les profils volontaires apparaissent", async () => {
    let r = await as(c, B, "select * from leaderboard(10)");
    assert(r.rows.length === 0, "not opted in yet");
    await as(c, A, "update profiles set leaderboard_opt_in = true where id = $1", [A]);
    r = await as(c, B, "select * from leaderboard(10)");
    assert(r.rows.length === 1 && r.rows[0].display_name === "Alice" && r.rows[0].is_me === false, JSON.stringify(r.rows));
    assert(!("id" in r.rows[0]), "leaks ids");
    let anonBlocked = false;
    try {
      await as(c, null, "select * from leaderboard(10)");
    } catch {
      anonBlocked = true;
    }
    assert(anonBlocked, "anon can call leaderboard");
  });

  await c.end();
  console.log(log.join("\n"));
  console.log(failures ? `\n${failures} échec(s)` : "\nTous les tests base de données sont passés.");
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
