import { connectSupabase, runSqlFiles, verifyTables } from "./lib/supabase-migration.mjs";

async function main() {
  const client = await connectSupabase();

  try {
    await runSqlFiles(client, ["supabase/ai-core-migration.sql"]);

    const { missing } = await verifyTables(client, [
      "generation_runs",
      "generation_steps",
      "usage_events",
    ]);
    if (missing.length > 0) {
      throw new Error(`No se pudo verificar: ${missing.join(", ")}`);
    }
  } finally {
    await client.end();
  }

  console.log("Migracion AI core completada.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
