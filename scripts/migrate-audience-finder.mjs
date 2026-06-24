import { readFileSync } from "fs";
import { join } from "path";
import pg from "pg";

const projectRef = "birkkohkenkxcpuhhyih";
const password = process.env.SUPABASE_DB_PASSWORD?.trim();
const poolerHost = process.env.SUPABASE_POOLER_HOST ?? "aws-1-ap-northeast-1.pooler.supabase.com";
const poolerPort = process.env.SUPABASE_POOLER_PORT ?? "6543";

if (!password) {
  console.error("Falta SUPABASE_DB_PASSWORD en .env.local");
  process.exit(1);
}

const connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@${poolerHost}:${poolerPort}/postgres`;

async function main() {
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const sql = readFileSync(join(process.cwd(), "supabase/audience-finder-migration.sql"), "utf8");
  console.log("Ejecutando supabase/audience-finder-migration.sql...");
  await client.query(sql);

  const verify = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'audience_finder_reports'
  `);

  await client.end();

  if (verify.rows.length !== 1) {
    console.error("No se pudo verificar audience_finder_reports.");
    process.exit(1);
  }

  console.log("Migracion Audience Finder completada.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
