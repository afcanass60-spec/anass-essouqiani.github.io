"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LearnerState } from "@/lib/state";
import { CONFLICT_KEYS, TABLE_ORDER, rowsToState, stateToRows, type Rows } from "./mapping";

/* Synchronisation avec Supabase : push incrémental (upsert idempotent),
   pull complet à la connexion. Toutes les requêtes passent par RLS. */

const CHUNK = 500;

export async function pushState(sb: SupabaseClient, userId: string, s: LearnerState, since: number): Promise<void> {
  const rows = stateToRows(s, userId, since);
  for (const table of TABLE_ORDER) {
    const list = rows[table];
    for (let i = 0; i < list.length; i += CHUNK) {
      const { error } = await sb.from(table).upsert(list.slice(i, i + CHUNK), { onConflict: CONFLICT_KEYS[table] });
      if (error) throw new Error(`${table}: ${error.message}`);
    }
  }
}

export async function pullState(sb: SupabaseClient, userId: string): Promise<LearnerState | null> {
  const rows: Partial<Rows> = {};
  for (const table of TABLE_ORDER) {
    const col = table === "profiles" ? "id" : "user_id";
    let query = sb.from(table).select("*").eq(col, userId);
    if (table === "exercise_attempts") query = query.order("created_at", { ascending: false }).limit(6000);
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows[table] = (data ?? []) as Record<string, unknown>[];
  }
  const hasData = (rows.learning_sessions?.length ?? 0) > 0 || (rows.user_vocabulary?.length ?? 0) > 0 || !!rows.profiles?.[0]?.placement;
  if (!hasData) return null;
  return rowsToState(rows);
}

export async function deleteRemoteData(sb: SupabaseClient, userId: string): Promise<void> {
  for (const table of [...TABLE_ORDER].reverse()) {
    if (table === "profiles") continue;
    const { error } = await sb.from(table).delete().eq("user_id", userId);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}
