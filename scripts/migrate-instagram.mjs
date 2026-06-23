import { readFileSync } from "fs";
import { join } from "path";
import pg from "pg";

const projectRef = "birkkohkenkxcpuhhyih";
const password = process.env.SUPABASE_DB_PASSWORD?.trim();
const poolerHost = process.env.SUPABASE_POOLER_HOST ?? "aws-1-ap-northeast-1.pooler.supabase.com";
const poolerPort = process.env.SUPABASE_POOLER_PORT ?? "6543";

if (!password) {
  console.error("❌ Falta SUPABASE_DB_PASSWORD en .env.local");
  process.exit(1);
}

const encoded = encodeURIComponent(password);

const files = [
  "supabase/instagram-migration.sql",
  "supabase/instagram-full-data-migration.sql",
];

function buildUrls() {
  return [
    `postgresql://postgres.${projectRef}:${encoded}@${poolerHost}:${poolerPort}/postgres`,
  ];
}

async function connect() {
  let lastError = null;
  for (const connectionString of buildUrls()) {
    const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      await client.query("SELECT 1");
      const host = connectionString.split("@")[1]?.split("/")[0];
      console.log(`✅ Conectado (${host})`);
      return client;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      await client.end().catch(() => undefined);
    }
  }
  throw lastError ?? new Error("No se pudo conectar a Supabase");
}

async function main() {
  const client = await connect();

  for (const file of files) {
    const sql = readFileSync(join(process.cwd(), file), "utf8");
    console.log(`\n▶ Ejecutando ${file}...`);
    await client.query(sql);
    console.log(`✅ ${file} OK`);
  }

  const verify = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('instagram_connections', 'instagram_media_items')
    ORDER BY table_name
  `);

  console.log("\n📋 Tablas verificadas:");
  for (const row of verify.rows) {
    console.log(`   ✓ ${row.table_name}`);
  }

  if (verify.rows.length < 2) {
    console.error("❌ Faltan tablas.");
    process.exit(1);
  }

  await client.end();
  console.log("\n🎉 Migraciones Instagram completadas.");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
