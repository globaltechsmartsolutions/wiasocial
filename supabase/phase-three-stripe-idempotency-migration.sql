-- Phase 3: Stripe becomes a reconcilable source of truth.
--
-- Before this migration the webhook had no event log, so a redelivery reapplied
-- the mutation and an out-of-order event could silently downgrade a paying
-- customer. The plan was also taken from session metadata, which is set by our
-- own checkout call and therefore proves nothing about what was actually billed.

CREATE TABLE IF NOT EXISTS stripe_events (
  event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processed', 'ignored', 'failed')),
  event_created_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 1,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS stripe_events_status_idx
  ON stripe_events(status, received_at DESC);

-- Ordering guard: an event older than the one already applied is discarded.
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS stripe_event_created_at TIMESTAMPTZ;

-- Server-only table. RLS is on with no policies, so PostgREST exposes nothing
-- to anon/authenticated; only the service role (which bypasses RLS) can use it.
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON stripe_events FROM anon;
REVOKE ALL ON stripe_events FROM authenticated;
GRANT ALL ON stripe_events TO service_role;

-- stripe_event_created_at is deliberately absent from the authenticated column
-- grants in phase-one-billing-rls-migration.sql, like the rest of the billing state.
