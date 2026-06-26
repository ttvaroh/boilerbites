-- RLS hardening migration (audit date: 2026-06-25)
--
-- Audit summary (via Supabase MCP against project dlgjvdnigvjzzplxmidm):
--   All public tables already have RLS enabled with appropriate policies.
--   refresh_log: RLS on, zero policies → API roles see no rows (intentional lockdown).
--   custom_food: had an extra SELECT policy allowing any authenticated user to read all rows.
--
-- Apply after review: supabase db push  OR  supabase migration up  (see ACTION_REQUIRED.md)

-- Idempotent: ensure RLS is on for every public application table.
ALTER TABLE IF EXISTS public.app_runtime_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.collection_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.custom_food ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.day_meal ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.day_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.day_station ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.day_station_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.favorite_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.food_entry ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.health_app_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.health_app_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.health_app_synced_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.item ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.location ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.nutrition_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.refresh_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_daily_nutrition ENABLE ROW LEVEL SECURITY;

-- Remove overly permissive read-all policy on custom_food.
-- Owner-scoped CRUD ("CRUD On Own Authenticated") remains sufficient for the app.
DROP POLICY IF EXISTS "Read For Authenticateed" ON public.custom_food;

-- refresh_log: no anon/authenticated policies by design (service-role / cron only).
COMMENT ON TABLE public.refresh_log IS
  'Internal materialized-view refresh log. RLS enabled with no public policies — not exposed via Data API to clients.';
