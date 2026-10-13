-- Fix: template_exercises.superset_group was missing after the programs migration.
alter table public.template_exercises
  add column if not exists superset_group text;

-- Nudge PostgREST schema cache (no-op if reload isn't available).
notify pgrst, 'reload schema';
