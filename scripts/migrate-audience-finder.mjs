import { connectSupabase, runSqlFiles, verifyTables } from "./lib/supabase-migration.mjs";

async function main() {
  const client = await connectSupabase();

  try {
    await runSqlFiles(client, ["supabase/audience-finder-migration.sql"]);

    const { missing } = await verifyTables(client, ["audience_finder_reports"]);
    if (missing.length > 0) {
      throw new Error(`No se pudo verificar: ${missing.join(", ")}`);
    }
  } finally {
    await client.end();
  }

  console.log("Migracion Audience Finder completada.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
