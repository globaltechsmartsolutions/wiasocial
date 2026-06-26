import { readFileSync } from "fs";
import { join } from "path";
import pg from "pg";

function getProjectRef() {
  const explicit = process.env.SUPABASE_PROJECT_REF?.trim();
  if (explicit && !isPlaceholder(explicit)) return explicit;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) return "";

  try {
    const hostname = new URL(supabaseUrl).hostname;
    if (!hostname.endsWith(".supabase.co")) return "";
    const projectRef = hostname.split(".")[0] ?? "";
    return isPlaceholder(projectRef) ? "" : projectRef;
  } catch {
    return "";
  }
}

function isPlaceholder(value) {
  return value.includes("your_") || value.includes("tu_") || value === "xxxxx";
}

function buildConnectionStrings() {
  const directUrl = process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (directUrl) return [directUrl];

  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  const projectRef = getProjectRef();

  if (!password) {
    throw new Error("Falta SUPABASE_DB_PASSWORD, SUPABASE_DB_URL o DATABASE_URL en .env.local");
  }

  if (!projectRef) {
    throw new Error("Falta SUPABASE_PROJECT_REF o NEXT_PUBLIC_SUPABASE_URL en .env.local");
  }

  const encodedPassword = encodeURIComponent(password);
  const poolerHost = process.env.SUPABASE_POOLER_HOST?.trim();
  const poolerPort = process.env.SUPABASE_POOLER_PORT?.trim() || "6543";
  const urls = [];

  if (poolerHost) {
    urls.push(`postgresql://postgres.${projectRef}:${encodedPassword}@${poolerHost}:${poolerPort}/postgres`);
  }

  urls.push(`postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`);
  return urls;
}

export function readSqlFile(file) {
  return readFileSync(join(process.cwd(), file), "utf8");
}

export async function connectSupabase() {
  let lastError = null;

  for (const connectionString of buildConnectionStrings()) {
    const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      await client.query("SELECT 1");
      const host = connectionString.split("@")[1]?.split("/")[0] ?? "configured database";
      console.log(`Conectado a Supabase (${host})`);
      return client;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      await client.end().catch(() => undefined);
    }
  }

  throw lastError ?? new Error("No se pudo conectar a Supabase");
}

export async function runSqlFiles(client, files) {
  for (const file of files) {
    console.log(`Ejecutando ${file}...`);
    await client.query(readSqlFile(file));
    console.log(`${file} OK`);
  }
}

export async function verifyTables(client, tableNames) {
  const placeholders = tableNames.map((_, index) => `$${index + 1}`).join(", ");
  const result = await client.query(
    `
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (${placeholders})
      ORDER BY table_name
    `,
    tableNames
  );

  const found = new Set(result.rows.map((row) => row.table_name));
  const missing = tableNames.filter((name) => !found.has(name));
  return { rows: result.rows, missing };
}
