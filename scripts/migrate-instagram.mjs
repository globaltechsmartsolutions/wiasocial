import { connectSupabase, runSqlFiles, verifyTables } from "./lib/supabase-migration.mjs";

async function main() {
  const client = await connectSupabase();

  try {
    await runSqlFiles(client, [
      "supabase/instagram-migration.sql",
      "supabase/instagram-full-data-migration.sql",
    ]);

    const { rows, missing } = await verifyTables(client, ["instagram_connections", "instagram_media_items"]);

    console.log("Tablas verificadas:");
    for (const row of rows) {
      console.log(`- ${row.table_name}`);
    }

    if (missing.length > 0) {
      throw new Error(`Faltan tablas: ${missing.join(", ")}`);
    }
  } finally {
    await client.end();
  }

  console.log("Migraciones Instagram completadas.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
