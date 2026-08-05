// Aislamiento RLS de las tablas del núcleo IA (generation_runs,
// generation_steps, usage_events) y de las funciones de cuota.
//
// Requiere SUPABASE_TEST_DB_URL explícita (staging). Nunca usa SUPABASE_DB_URL
// ni DATABASE_URL, así que no puede apuntar a producción por accidente. Todo
// corre dentro de una transacción que siempre se revierte.
//
// Requiere haber aplicado antes la migración ai-core en esa base:
//   npm run migrate:ai-core
//   npm run test:rls:ai-core

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.trim().replace(/^["'](.*)["']$/, "$1");
  }
}

loadEnvLocal();

const connectionString = process.env.SUPABASE_TEST_DB_URL?.trim();
const INSUFFICIENT_PRIVILEGE = "42501";

const USER_A = "00000000-0000-4000-8000-00000000c001";
const USER_B = "00000000-0000-4000-8000-00000000c002";
const MONTH_KEY = "2099-01";

describe.skipIf(!connectionString)("RLS del núcleo IA (generation_runs, steps, usage_events, cuota)", () => {
  /** @type {pg.Client} */
  let client;
  /** @type {string} */
  let runOfB;

  async function runAsUser(userId, sql, params = []) {
    await client.query("SAVEPOINT statement");
    try {
      await client.query("SELECT set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userId, role: "authenticated" }),
      ]);
      await client.query("SET LOCAL ROLE authenticated");
      const result = await client.query(sql, params);
      await client.query("RESET ROLE");
      await client.query("RELEASE SAVEPOINT statement");
      return { ok: true, rowCount: result.rowCount, rows: result.rows };
    } catch (error) {
      await client.query("ROLLBACK TO SAVEPOINT statement");
      await client.query("RESET ROLE");
      return { ok: false, code: error?.code, message: error?.message };
    }
  }

  beforeAll(async () => {
    client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    const { rows } = await client.query(
      "SELECT to_regclass('public.generation_runs') AS runs, to_regclass('public.usage_events') AS events"
    );
    if (!rows[0]?.runs || !rows[0]?.events) {
      throw new Error(
        "Faltan las tablas del núcleo IA en esta base. Ejecuta 'npm run migrate:ai-core' contra la base de STAGING antes de este test."
      );
    }

    await client.query("BEGIN");

    for (const [id, email] of [
      [USER_A, "rls-ai-a@wiasocial.test"],
      [USER_B, "rls-ai-b@wiasocial.test"],
    ]) {
      await client.query(
        `INSERT INTO auth.users (id, email, aud, role)
         VALUES ($1, $2, 'authenticated', 'authenticated')
         ON CONFLICT (id) DO NOTHING`,
        [id, email]
      );
    }

    // Un run de B creado por el servidor, para probar el aislamiento de A.
    const inserted = await client.query(
      `INSERT INTO generation_runs (user_id, task_id, status, input)
       VALUES ($1, 'content', 'completed', '{"niche":"privado"}'::jsonb)
       RETURNING id`,
      [USER_B]
    );
    runOfB = inserted.rows[0].id;
    await client.query(
      `INSERT INTO generation_steps (run_id, user_id, step_id, status) VALUES ($1, $2, 'generate', 'succeeded')`,
      [runOfB, USER_B]
    );
    await client.query(
      `INSERT INTO usage_events (user_id, run_id, task_id, event_type, units) VALUES ($1, $2, 'content', 'settle', 1)`,
      [USER_B, runOfB]
    );
  }, 30_000);

  afterAll(async () => {
    if (!client) return;
    await client.query("ROLLBACK").catch(() => undefined);
    await client.end().catch(() => undefined);
  });

  it("un usuario nunca lee las ejecuciones de otro", async () => {
    for (const table of ["generation_runs", "generation_steps", "usage_events"]) {
      const result = await runAsUser(USER_A, `SELECT id FROM ${table} WHERE user_id = $1`, [USER_B]);
      expect(result.ok, table).toBe(true);
      expect(result.rowCount, table).toBe(0);
    }
  });

  it("un usuario no puede leer un run ajeno ni conociendo su id", async () => {
    const result = await runAsUser(USER_A, "SELECT input, result FROM generation_runs WHERE id = $1", [runOfB]);
    expect(result.ok).toBe(true);
    expect(result.rowCount).toBe(0);
  });

  it("permite registrar y leer las ejecuciones propias", async () => {
    const insert = await runAsUser(
      USER_A,
      `INSERT INTO generation_runs (user_id, task_id, status) VALUES ($1, 'content', 'running') RETURNING id`,
      [USER_A]
    );
    expect(insert.ok).toBe(true);

    const read = await runAsUser(USER_A, "SELECT id FROM generation_runs WHERE user_id = $1", [USER_A]);
    expect(read.ok).toBe(true);
    expect(read.rowCount).toBe(1);
  });

  it("impide insertar un run a nombre de otro usuario", async () => {
    const result = await runAsUser(
      USER_A,
      `INSERT INTO generation_runs (user_id, task_id, status) VALUES ($1, 'content', 'running')`,
      [USER_B]
    );
    expect(result.ok).toBe(false);
    expect(result.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it("impide modificar o reasignar el run de otro usuario", async () => {
    const update = await runAsUser(USER_A, "UPDATE generation_runs SET status = 'failed' WHERE id = $1", [runOfB]);
    expect(update.ok).toBe(true);
    expect(update.rowCount).toBe(0);

    const insertOwn = await runAsUser(
      USER_A,
      `INSERT INTO generation_runs (user_id, task_id, status) VALUES ($1, 'content', 'running') RETURNING id`,
      [USER_A]
    );
    const reassign = await runAsUser(USER_A, "UPDATE generation_runs SET user_id = $2 WHERE id = $1", [
      insertOwn.rows[0].id,
      USER_B,
    ]);
    expect(reassign.ok).toBe(false);
  });

  it("usage_events es contable: el titular no puede modificar ni borrar", async () => {
    const insert = await runAsUser(
      USER_A,
      `INSERT INTO usage_events (user_id, task_id, event_type, units) VALUES ($1, 'content', 'reserve', 1) RETURNING id`,
      [USER_A]
    );
    expect(insert.ok).toBe(true);
    const eventId = insert.rows[0].id;

    const update = await runAsUser(USER_A, "UPDATE usage_events SET units = 0 WHERE id = $1", [eventId]);
    expect(update.ok).toBe(false);
    expect(update.code).toBe(INSUFFICIENT_PRIVILEGE);

    const del = await runAsUser(USER_A, "DELETE FROM usage_events WHERE id = $1", [eventId]);
    expect(del.ok).toBe(false);
    expect(del.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it("la cuota se reserva y se libera solo mediante las funciones", async () => {
    // ai_usage sigue siendo de solo lectura para el titular.
    const directWrite = await runAsUser(
      USER_A,
      "INSERT INTO ai_usage (user_id, month_key, count) VALUES ($1, $2, 0)",
      [USER_A, MONTH_KEY]
    );
    expect(directWrite.ok).toBe(false);
    expect(directWrite.code).toBe(INSUFFICIENT_PRIVILEGE);

    const reserve = await runAsUser(USER_A, "SELECT * FROM increment_ai_usage($1, $2, 5)", [USER_A, MONTH_KEY]);
    expect(reserve.ok).toBe(true);
    expect(reserve.rows[0]).toMatchObject({ used: 1, incremented: true });

    const release = await runAsUser(USER_A, "SELECT * FROM release_ai_usage($1, $2)", [USER_A, MONTH_KEY]);
    expect(release.ok).toBe(true);
    expect(release.rows[0].used).toBe(0);

    // Liberar de nuevo no deja el contador en negativo.
    const releaseAgain = await runAsUser(USER_A, "SELECT * FROM release_ai_usage($1, $2)", [USER_A, MONTH_KEY]);
    expect(releaseAgain.ok).toBe(true);
    expect(releaseAgain.rows[0].used).toBe(0);
  });

  it("nadie puede liberar la cuota de otro usuario", async () => {
    const result = await runAsUser(USER_A, "SELECT * FROM release_ai_usage($1, $2)", [USER_B, MONTH_KEY]);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Not authorized/);
  });
});
