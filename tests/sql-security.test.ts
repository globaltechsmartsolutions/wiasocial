import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sqlDirectory = join(process.cwd(), "supabase");
const sql = readdirSync(sqlDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(join(sqlDirectory, file), "utf8"))
  .join("\n");
const executableSql = sql.replace(/--.*$/gmu, "");

describe("Supabase SQL security", () => {
  it("enables RLS for every table created by the project", () => {
    const tables = new Set(
      [...executableSql.matchAll(/CREATE TABLE IF NOT EXISTS\s+(?:public\.)?([a-z_][a-z0-9_]*)/giu)]
        .map((match) => match[1].toLowerCase())
    );
    const rlsTables = new Set(
      [...executableSql.matchAll(/ALTER TABLE\s+(?:public\.)?([a-z_][a-z0-9_]*)\s+ENABLE ROW LEVEL SECURITY/giu)]
        .map((match) => match[1].toLowerCase())
    );

    expect(tables.size).toBeGreaterThan(0);
    expect([...tables].filter((table) => !rlsTables.has(table))).toEqual([]);
  });

  it("defines a user policy unless a table is explicitly server-only", () => {
    const tables = new Set(
      [...executableSql.matchAll(/CREATE TABLE IF NOT EXISTS\s+(?:public\.)?([a-z_][a-z0-9_]*)/giu)]
        .map((match) => match[1].toLowerCase())
    );
    const policyTables = new Set(
      [...executableSql.matchAll(/CREATE POLICY\s+[^\r\n]+?\s+ON\s+(?:public\.)?([a-z_][a-z0-9_]*)/giu)]
        .map((match) => match[1].toLowerCase())
    );
    // Tablas sin política de usuario a propósito: solo las escribe y lee el
    // servidor. ai_usage_reservations guarda identificadores de reserva de
    // cuota; exponerlos permitiría al titular liberar su propia reserva en
    // vuelo y quedarse con la generación sin consumirla.
    const serverOnlyTables = new Set(["rate_limits", "stripe_events", "ai_usage_reservations"]);

    expect(
      [...tables].filter((table) => !policyTables.has(table) && !serverOnlyTables.has(table))
    ).toEqual([]);
  });

  it("pins search_path on every SECURITY DEFINER function", () => {
    const definerIndexes = [...executableSql.matchAll(/SECURITY DEFINER/giu)].map((match) => match.index);
    expect(definerIndexes.length).toBeGreaterThan(0);

    for (const index of definerIndexes) {
      const functionDeclaration = executableSql.slice(Math.max(0, index - 300), index + 300);
      expect(functionDeclaration).toMatch(/SET search_path\s*=\s*public/iu);
    }
  });
});
