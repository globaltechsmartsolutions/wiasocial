import { connectSupabase, runSqlFiles, verifyTables } from "./lib/supabase-migration.mjs";

const files = [
  "supabase/schema.sql",
  "supabase/ai-features-migration.sql",
  "supabase/instagram-migration.sql",
  "supabase/instagram-full-data-migration.sql",
  "supabase/instagram-audit-migration.sql",
  "supabase/growth-radar-migration.sql",
  "supabase/marketing-os-migration.sql",
  "supabase/audience-finder-migration.sql",
  "supabase/brand-profile-migration.sql",
  "supabase/rate-limit-migration.sql",
  "supabase/persistence-fixes-migration.sql",
  "supabase/phase-zero-stabilization-migration.sql",
  "supabase/phase-one-billing-rls-migration.sql",
  "supabase/phase-two-ai-usage-hardening-migration.sql",
  "supabase/phase-three-stripe-idempotency-migration.sql",
  "supabase/phase-four-security-cleanup-migration.sql",
  "supabase/ai-core-migration.sql",
];

const expectedTables = [
  "ai_coach_messages",
  "ai_usage",
  "audience_finder_reports",
  "calendar_items",
  "clients",
  "competitors",
  "content_series",
  "daily_briefs",
  "engagement_targets",
  "engagement_tasks",
  "follow_ups",
  "follower_snapshots",
  "generated_content",
  "generation_runs",
  "generation_steps",
  "growth_radar_reports",
  "instagram_audits",
  "instagram_connections",
  "instagram_funnels",
  "instagram_media_items",
  "lead_ai_scores",
  "leads",
  "monthly_marketing_plans",
  "monthly_reports",
  "post_performance",
  "rate_limits",
  "reel_scripts",
  "story_sets",
  "stripe_events",
  "trend_detector_cache",
  "usage_events",
  "user_settings",
];

async function main() {
  const client = await connectSupabase();

  try {
    await runSqlFiles(client, files);
    const { rows, missing } = await verifyTables(client, expectedTables);

    console.log(`Tablas verificadas: ${rows.length}/${expectedTables.length}`);
    if (missing.length > 0) {
      throw new Error(`Faltan tablas: ${missing.join(", ")}`);
    }
  } finally {
    await client.end();
  }

  console.log("Esquema completo de WIASocial actualizado.");
}

main().catch((error) => {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
