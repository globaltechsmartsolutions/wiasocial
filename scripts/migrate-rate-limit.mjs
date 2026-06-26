import { connectSupabase, runSqlFiles, verifyTables } from "./lib/supabase-migration.mjs";

async function main() {
  const client = await connectSupabase();

  try {
    await runSqlFiles(client, ["supabase/rate-limit-migration.sql"]);

    const { missing } = await verifyTables(client, ["rate_limits"]);
    if (missing.length > 0) {
      throw new Error(`No se pudo verificar: ${missing.join(", ")}`);
    }
  } finally {
    await client.end();
  }

  console.log("Migracion Rate Limit completada.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
