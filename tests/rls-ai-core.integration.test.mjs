// Aislamiento y fiabilidad del núcleo IA: ledger de solo lectura para el
// cliente (generation_runs, generation_steps, usage_events), integridad de
// propietario y reservas de cuota de un solo uso.
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

// Una base local (supabase start) no expone TLS; una remota sí.
function sslOptionsFor(url) {
  try {
    const { hostname } = new URL(url);
    if (["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname)) return false;
  } catch {
    // Cadena no parseable: se intenta con TLS.
  }
  return { rejectUnauthorized: false };
}

const INSUFFICIENT_PRIVILEGE = "42501";
const FOREIGN_KEY_VIOLATION = "23503";

const USER_A = "00000000-0000-4000-8000-00000000c001";
const USER_B = "00000000-0000-4000-8000-00000000c002";

describe.skipIf(!connectionString)("RLS y fiabilidad del núcleo IA (ledger + reservas de cuota)", () => {
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

  async function usageCount(userId, monthKey) {
    const result = await runAsServer(
      "SELECT count FROM ai_usage WHERE user_id = $1 AND month_key = $2",
      [userId, monthKey]
    );
    expect(result.ok, result.message).toBe(true);
    return result.rows[0]?.count ?? 0;
  }

  /**
   * Ejecuta como servidor (equivalente a service_role): sin rol de sesión y
   * sin claims JWT. Es necesario limpiar `request.jwt.claims` porque
   * `runAsUser` lo fija con alcance de transacción y `RESET ROLE` no lo borra:
   * sin esto, una consulta "de servidor" heredaría la identidad del último
   * usuario simulado y `auth.uid()` no sería NULL.
   */
  async function runAsServer(sql, params = []) {
    await client.query("SAVEPOINT server_stmt");
    try {
      await client.query("SELECT set_config('request.jwt.claims', '{}', true)");
      const result = await client.query(sql, params);
      await client.query("RELEASE SAVEPOINT server_stmt");
      return { ok: true, rowCount: result.rowCount, rows: result.rows };
    } catch (error) {
      await client.query("ROLLBACK TO SAVEPOINT server_stmt");
      return { ok: false, code: error?.code, message: error?.message };
    }
  }

  // Las RPC de cuota son de servidor: nunca ejecutables como `authenticated`.
  async function reserveAsServer(userId, monthKey, limit = 5) {
    const result = await runAsServer("SELECT * FROM reserve_ai_usage($1, $2, $3)", [
      userId,
      monthKey,
      limit,
    ]);
    expect(result.ok, result.message).toBe(true);
    return result.rows[0];
  }

  async function releaseAsServer(userId, reservationId) {
    const result = await runAsServer("SELECT * FROM release_ai_usage_reservation($1, $2)", [
      userId,
      reservationId,
    ]);
    expect(result.ok, result.message).toBe(true);
    return result.rows[0];
  }

  beforeAll(async () => {
    client = new pg.Client({ connectionString, ssl: sslOptionsFor(connectionString) });
    await client.connect();

    const { rows } = await client.query(
      "SELECT to_regclass('public.generation_runs') AS runs, to_regclass('public.ai_usage_reservations') AS reservations"
    );
    if (!rows[0]?.runs || !rows[0]?.reservations) {
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

  // ── Aislamiento de lectura ─────────────────────────────────────────────────

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

  it("el titular puede leer sus propias filas del ledger", async () => {
    const result = await runAsUser(USER_B, "SELECT id, status FROM generation_runs WHERE user_id = $1", [USER_B]);
    expect(result.ok).toBe(true);
    expect(result.rowCount).toBe(1);
  });

  // ── El ledger no es falsificable por el cliente ────────────────────────────

  it("el cliente no puede insertar runs, ni propios ni ajenos", async () => {
    for (const target of [USER_A, USER_B]) {
      const result = await runAsUser(
        USER_A,
        `INSERT INTO generation_runs (user_id, task_id, status) VALUES ($1, 'content', 'running')`,
        [target]
      );
      expect(result.ok).toBe(false);
      expect(result.code).toBe(INSUFFICIENT_PRIVILEGE);
    }
  });

  it("el cliente no puede modificar estado, resultado, tokens ni coste de un run", async () => {
    const result = await runAsUser(
      USER_B,
      `UPDATE generation_runs SET status = 'completed', result = '{"fake":true}'::jsonb, output_tokens = 0, estimated_cost_usd = 0 WHERE id = $1`,
      [runOfB]
    );
    expect(result.ok).toBe(false);
    expect(result.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it("el cliente no puede insertar, modificar ni borrar steps ni usage_events", async () => {
    const attempts = [
      [`INSERT INTO generation_steps (run_id, user_id, step_id, status) VALUES ($1, $2, 'generate', 'running')`, [runOfB, USER_B]],
      [`UPDATE generation_steps SET status = 'succeeded' WHERE user_id = $1`, [USER_B]],
      [`INSERT INTO usage_events (user_id, task_id, event_type, units) VALUES ($1, 'content', 'reserve', 1)`, [USER_B]],
      [`UPDATE usage_events SET units = 0 WHERE user_id = $1`, [USER_B]],
      [`DELETE FROM usage_events WHERE user_id = $1`, [USER_B]],
    ];
    for (const [sql, params] of attempts) {
      const result = await runAsUser(USER_B, sql, params);
      expect(result.ok, sql).toBe(false);
      expect(result.code, sql).toBe(INSUFFICIENT_PRIVILEGE);
    }
  });

  // ── Integridad de propietario en escrituras de servidor ────────────────────

  it("ni siquiera el servidor puede colgar un step de un run con user_id distinto", async () => {
    await client.query("SAVEPOINT server_step");
    let error = null;
    try {
      await client.query(
        `INSERT INTO generation_steps (run_id, user_id, step_id, status) VALUES ($1, $2, 'generate', 'running')`,
        [runOfB, USER_A]
      );
    } catch (err) {
      error = err;
    }
    await client.query("ROLLBACK TO SAVEPOINT server_step");
    expect(error?.code).toBe(FOREIGN_KEY_VIOLATION);
  });

  it("un usage_event con run ajeno es rechazado por el trigger de propietario", async () => {
    await client.query("SAVEPOINT server_event");
    let error = null;
    try {
      await client.query(
        `INSERT INTO usage_events (user_id, run_id, task_id, event_type, units) VALUES ($1, $2, 'content', 'settle', 1)`,
        [USER_A, runOfB]
      );
    } catch (err) {
      error = err;
    }
    await client.query("ROLLBACK TO SAVEPOINT server_event");
    expect(error?.message).toMatch(/does not match the owner/);
  });

  // ── Reservas de cuota de un solo uso ───────────────────────────────────────

  it("ai_usage y ai_usage_reservations no admiten escritura directa del cliente", async () => {
    const usageWrite = await runAsUser(
      USER_A,
      "INSERT INTO ai_usage (user_id, month_key, count) VALUES ($1, '2099-01', 0)",
      [USER_A]
    );
    expect(usageWrite.ok).toBe(false);
    expect(usageWrite.code).toBe(INSUFFICIENT_PRIVILEGE);

    const reservationWrite = await runAsUser(
      USER_A,
      "INSERT INTO ai_usage_reservations (user_id, month_key, status) VALUES ($1, '2099-01', 'released')",
      [USER_A]
    );
    expect(reservationWrite.ok).toBe(false);
    expect(reservationWrite.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it("el cliente no puede ejecutar las funciones de cuota, ni sobre su propia reserva", async () => {
    // Este es el control que impide quedarse con la generación sin pagar
    // cuota: liberar una reserva propia en vuelo. Debe ser imposible desde el
    // navegador aunque el usuario conociera el identificador.
    const monthKey = "2099-10";
    const reservation = await reserveAsServer(USER_A, monthKey);
    expect(reservation.reserved).toBe(true);

    const attempts = [
      ["SELECT * FROM reserve_ai_usage($1, $2, 99)", [USER_A, monthKey]],
      ["SELECT settle_ai_usage_reservation($1, $2)", [USER_A, reservation.reservation_id]],
      ["SELECT * FROM release_ai_usage_reservation($1, $2)", [USER_A, reservation.reservation_id]],
    ];
    for (const [sql, params] of attempts) {
      const result = await runAsUser(USER_A, sql, params);
      expect(result.ok, sql).toBe(false);
      expect(result.code, sql).toBe(INSUFFICIENT_PRIVILEGE);
    }

    // La reserva sigue viva y el consumo intacto.
    expect(await usageCount(USER_A, monthKey)).toBe(1);
  });

  it("el cliente no puede leer los identificadores de reserva", async () => {
    const result = await runAsUser(USER_A, "SELECT id FROM ai_usage_reservations WHERE user_id = $1", [
      USER_A,
    ]);
    expect(result.ok).toBe(false);
    expect(result.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it("una reserva solo puede liberarse UNA vez", async () => {
    const monthKey = "2099-02";
    const reservation = await reserveAsServer(USER_A, monthKey);
    expect(reservation.reserved).toBe(true);
    expect(await usageCount(USER_A, monthKey)).toBe(1);

    const first = await releaseAsServer(USER_A, reservation.reservation_id);
    expect(first.released).toBe(true);
    expect(await usageCount(USER_A, monthKey)).toBe(0);

    // Repetir la liberación no vuelve a decrementar: ni siquiera el servidor
    // puede vaciar el contador llamando al RPC en bucle.
    for (let i = 0; i < 3; i += 1) {
      const again = await releaseAsServer(USER_A, reservation.reservation_id);
      expect(again.released).toBe(false);
    }
    expect(await usageCount(USER_A, monthKey)).toBe(0);
  });

  it("una reserva confirmada (settled) ya no puede liberarse", async () => {
    const monthKey = "2099-03";
    const reservation = await reserveAsServer(USER_A, monthKey);
    expect(await usageCount(USER_A, monthKey)).toBe(1);

    const settle = await runAsServer("SELECT settle_ai_usage_reservation($1, $2) AS settled", [
      USER_A,
      reservation.reservation_id,
    ]);
    expect(settle.ok, settle.message).toBe(true);
    expect(settle.rows[0].settled).toBe(true);

    const release = await releaseAsServer(USER_A, reservation.reservation_id);
    expect(release.released).toBe(false);
    // El consumo confirmado permanece.
    expect(await usageCount(USER_A, monthKey)).toBe(1);
  });

  it("reservar y liberar en bucle nunca genera cuota gratis", async () => {
    const monthKey = "2099-04";
    for (let i = 0; i < 3; i += 1) {
      const reservation = await reserveAsServer(USER_A, monthKey);
      const release = await releaseAsServer(USER_A, reservation.reservation_id);
      expect(release.released).toBe(true);
    }
    // Neto cero: cada liberación exige una reserva previa que incrementó.
    expect(await usageCount(USER_A, monthKey)).toBe(0);
  });

  it("el límite se sigue aplicando en la reserva", async () => {
    const monthKey = "2099-05";
    await reserveAsServer(USER_A, monthKey, 1);
    const second = await reserveAsServer(USER_A, monthKey, 1);
    expect(second.reserved).toBe(false);
    expect(second.reservation_id).toBeNull();
  });

  it("una reserva no puede liberarse a nombre de otro usuario", async () => {
    const monthKey = "2099-06";
    const reservation = await reserveAsServer(USER_A, monthKey);

    // Con el id de B, la reserva de A no existe: no se decrementa nada.
    const foreign = await releaseAsServer(USER_B, reservation.reservation_id);
    expect(foreign.released).toBe(false);
    expect(await usageCount(USER_A, monthKey)).toBe(1);
  });
});
