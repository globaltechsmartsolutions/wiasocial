import { connectSupabase, runSqlFiles, verifyTables } from "./lib/supabase-migration.mjs";

async function main() {
  const client = await connectSupabase();

  try {
    await runSqlFiles(client, ["supabase/growth-radar-migration.sql"]);

    const { missing } = await verifyTables(client, ["growth_radar_reports"]);
    if (missing.length > 0) {
      throw new Error(`No se pudo verificar: ${missing.join(", ")}`);
    }
  } finally {
    await client.end();
  }

  console.log("Migracion Growth Radar completada.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
