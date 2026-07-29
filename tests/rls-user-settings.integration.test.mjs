// Isolation test for user_settings: proves an authenticated user cannot grant
// themselves a paid plan, and that legitimate settings writes still work.
//
// Requires an explicit SUPABASE_TEST_DB_URL. It never falls back to DATABASE_URL
// or SUPABASE_DB_URL, so it cannot be pointed at production by accident.
// Everything runs inside a transaction that is always rolled back.
//
//   npm run test:rls

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

const USER_A = "00000000-0000-4000-8000-00000000a001";
const USER_B = "00000000-0000-4000-8000-00000000b002";

// The exact column list PostgREST sends for saveSettings() in src/lib/db.ts.
const SETTINGS_COLUMNS = [
  "user_id",
  "brand_name",
  "instagram_handle",
  "niche",
  "target_audience",
  "offer",
  "default_tone",
  "default_goal",
  "brand_memory",
  "updated_at",
];

function upsertSettingsSql(columns) {
  const values = columns.map((_, index) => `$${index + 1}`).join(", ");
  const assignments = columns.map((column) => `${column} = EXCLUDED.${column}`).join(", ");
  return `
    INSERT INTO user_settings (${columns.join(", ")})
    VALUES (${values})
    ON CONFLICT (user_id) DO UPDATE SET ${assignments}
  `;
}

describe.skipIf(!connectionString)("RLS de user_settings", () => {
  /** @type {pg.Client} */
  let client;

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

  async function currentPlan(userId) {
    const result = await client.query("SELECT plan FROM user_settings WHERE user_id = $1", [userId]);
    return result.rows[0]?.plan;
  }

  beforeAll(async () => {
    client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();
    await client.query("BEGIN");

    for (const [id, email] of [
      [USER_A, "rls-a@wiasocial.test"],
      [USER_B, "rls-b@wiasocial.test"],
    ]) {
      await client.query(
        `INSERT INTO auth.users (id, email, aud, role)
         VALUES ($1, $2, 'authenticated', 'authenticated')
         ON CONFLICT (id) DO NOTHING`,
        [id, email]
      );
      // Independent of the on_auth_user_created trigger.
      await client.query(
        "INSERT INTO user_settings (user_id, plan) VALUES ($1, 'free') ON CONFLICT (user_id) DO NOTHING",
        [id]
      );
    }
  }, 30_000);

  afterAll(async () => {
    if (!client) return;
    await client.query("ROLLBACK").catch(() => undefined);
    await client.end().catch(() => undefined);
  });

  it("impide que un usuario se asigne un plan de pago", async () => {
    const result = await runAsUser(USER_A, "UPDATE user_settings SET plan = 'agency' WHERE user_id = $1", [
      USER_A,
    ]);

    expect(result.ok).toBe(false);
    expect(result.code).toBe(INSUFFICIENT_PRIVILEGE);
    expect(await currentPlan(USER_A)).toBe("free");
  });

  it("impide escribir el estado de Stripe", async () => {
    const result = await runAsUser(
      USER_A,
      "UPDATE user_settings SET stripe_customer_id = 'cus_fake', plan_expires_at = NULL WHERE user_id = $1",
      [USER_A]
    );

    expect(result.ok).toBe(false);
    expect(result.code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it("impide colar el plan a través de un upsert", async () => {
    const columns = [...SETTINGS_COLUMNS, "plan"];
    const result = await runAsUser(USER_A, upsertSettingsSql(columns), [
      USER_A,
      "Marca",
      "@marca",
      "fitness",
      "coaches",
      "oferta",
      "professional",
      "leads",
      "{}",
      new Date().toISOString(),
      "agency",
    ]);

    expect(result.ok).toBe(false);
    expect(result.code).toBe(INSUFFICIENT_PRIVILEGE);
    expect(await currentPlan(USER_A)).toBe("free");
  });

  it("permite el upsert legítimo de ajustes de marca", async () => {
    const result = await runAsUser(USER_A, upsertSettingsSql(SETTINGS_COLUMNS), [
      USER_A,
      "Marca real",
      "@marca_real",
      "fitness",
      "coaches",
      "oferta",
      "professional",
      "leads",
      "{}",
      new Date().toISOString(),
    ]);

    expect(result.ok).toBe(true);

    const saved = await client.query("SELECT brand_name FROM user_settings WHERE user_id = $1", [USER_A]);
    expect(saved.rows[0]?.brand_name).toBe("Marca real");
  });

  it("permite guardar la URL de webhook", async () => {
    const result = await runAsUser(
      USER_A,
      "UPDATE user_settings SET webhook_url = $2, updated_at = NOW() WHERE user_id = $1",
      [USER_A, "https://example.com/hook"]
    );

    expect(result.ok).toBe(true);
    expect(result.rowCount).toBe(1);
  });

  it("no deja leer los ajustes de otro usuario", async () => {
    const result = await runAsUser(USER_A, "SELECT user_id FROM user_settings WHERE user_id = $1", [USER_B]);

    expect(result.ok).toBe(true);
    expect(result.rowCount).toBe(0);
  });

  it("no deja modificar los ajustes de otro usuario", async () => {
    const result = await runAsUser(
      USER_A,
      "UPDATE user_settings SET brand_name = 'secuestrada' WHERE user_id = $1",
      [USER_B]
    );

    expect(result.ok).toBe(true);
    expect(result.rowCount).toBe(0);
  });

  it("no deja reasignar la fila propia a otro usuario", async () => {
    const result = await runAsUser(USER_A, "UPDATE user_settings SET user_id = $2 WHERE user_id = $1", [
      USER_A,
      USER_B,
    ]);

    // Rejected by settings_update_own's WITH CHECK.
    expect(result.ok).toBe(false);
  });

  it("permite al service_role cambiar el plan (webhook de Stripe)", async () => {
    await client.query("UPDATE user_settings SET plan = 'agency' WHERE user_id = $1", [USER_A]);
    expect(await currentPlan(USER_A)).toBe("agency");
  });
});
