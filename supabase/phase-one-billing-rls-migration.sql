-- Phase 1: the account holder must not be able to write their own billing state.
--
-- Before this migration `user_settings` had a single blanket policy:
--   CREATE POLICY "settings_own" ON user_settings FOR ALL USING (auth.uid() = user_id);
-- FOR ALL covers UPDATE, and the policy is row-level only, so any authenticated
-- user could PATCH /rest/v1/user_settings with {"plan":"agency"} from the browser
-- and grant themselves a paid plan without paying.
--
-- RLS decides WHICH ROW a user can touch. Column privileges decide WHICH COLUMN.
-- The billing columns need both layers.

-- 1. Replace the blanket policy with explicit per-command policies.
DROP POLICY IF EXISTS "settings_own" ON user_settings;

DO $$ BEGIN
  CREATE POLICY "settings_select_own" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "settings_insert_own" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "settings_update_own" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- No DELETE policy on purpose: the settings row is created by the
-- on_auth_user_created trigger and removed by ON DELETE CASCADE from auth.users.

-- 2. Column privileges. Everything not listed below is server-only.
REVOKE ALL ON user_settings FROM anon;
REVOKE ALL ON user_settings FROM authenticated;

-- Reading the whole row is fine: stripe_customer_id / stripe_subscription_id are
-- identifiers, not credentials, and the UI needs `plan` to render entitlements.
GRANT SELECT ON user_settings TO authenticated;

-- user_id is writable because PostgREST upserts send the conflict target in the
-- DO UPDATE SET clause. settings_update_own's WITH CHECK still pins it to auth.uid().
GRANT INSERT (
  user_id,
  brand_name,
  instagram_handle,
  niche,
  target_audience,
  offer,
  default_tone,
  default_goal,
  brand_memory,
  locale,
  webhook_url,
  updated_at
) ON user_settings TO authenticated;

GRANT UPDATE (
  user_id,
  brand_name,
  instagram_handle,
  niche,
  target_audience,
  offer,
  default_tone,
  default_goal,
  brand_memory,
  locale,
  webhook_url,
  updated_at
) ON user_settings TO authenticated;

-- plan, stripe_customer_id, stripe_subscription_id and plan_expires_at are
-- deliberately absent from both grants: only the Stripe webhook, which runs with
-- the service role, may write them.
GRANT ALL ON user_settings TO service_role;
