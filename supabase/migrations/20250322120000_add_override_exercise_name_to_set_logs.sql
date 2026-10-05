-- Session-only display name for replaced exercises; exercise_id stays the canonical exercise.
alter table public.set_logs
  add column if not exists override_exercise_name text;

comment on column public.set_logs.override_exercise_name is
  'Optional display name when the user replaced this exercise for the session only; analytics still use exercise_id.';
