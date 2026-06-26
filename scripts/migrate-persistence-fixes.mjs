import { connectSupabase, runSqlFiles } from "./lib/supabase-migration.mjs";

async function main() {
  const client = await connectSupabase();

  try {
    await runSqlFiles(client, [
      "supabase/ai-features-migration.sql",
      "supabase/persistence-fixes-migration.sql",
    ]);
  } finally {
    await client.end();
  }

  console.log("Migracion de persistencia completada.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
