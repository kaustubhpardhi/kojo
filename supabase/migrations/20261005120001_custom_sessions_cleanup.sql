-- ═══════════════════════════════════════════════════════════════════════════
-- kōjō — cleanup AFTER 20261005120000_custom_sessions.sql
--
-- ⚠️  DESTRUCTIVE. DO NOT RUN UNTIL YOU HAVE:
--     1. taken a Supabase backup,
--     2. run the main migration and confirmed its three VERIFY queries,
--     3. run the new app against the migrated data for a few sessions.
--
-- Step 1 deletes duplicate set_logs rows. Step 2 is reversible. Step 3 drops
-- legacy columns and is NOT reversible — it is commented out on purpose.
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- STEP 1 — Remove duplicate sets, then make duplicates impossible.
--
-- The old logSet() read-then-wrote with no constraint, so a double tap or a
-- racing offline sync could insert the same set twice. Inspect first:
--
--   select session_id, exercise_id, set_number, count(*)
--   from public.set_logs
--   group by 1, 2, 3 having count(*) > 1;
--
-- This keeps the most recently logged row in each duplicate group.
-- ───────────────────────────────────────────────────────────────────────────

begin;

with ranked as (
  select id,
         row_number() over (
           partition by session_id, exercise_id, set_number
           order by logged_at desc, id
         ) as rn
  from public.set_logs
)
delete from public.set_logs where id in (select id from ranked where rn > 1);

create unique index if not exists idx_set_logs_unique_set
  on public.set_logs(session_id, exercise_id, set_number);

commit;

-- ───────────────────────────────────────────────────────────────────────────
-- STEP 2 — Archive the legacy per-day plan rows.
--
-- After the migration these seeds live on as library exercises; only their
-- day/order/sets columns are obsolete. Reversible: set is_archived = false.
-- Run only if you do NOT want the old seeds in the exercise picker.
-- ───────────────────────────────────────────────────────────────────────────

-- update public.exercises set is_archived = true
-- where owner_id is null and day is not null
--   and id not in (select exercise_id from public.set_logs)
--   and id not in (select exercise_id from public.template_exercises);

-- ───────────────────────────────────────────────────────────────────────────
-- STEP 3 — Drop legacy columns. NOT REVERSIBLE. Leave commented until the
-- new app has been running happily for a while; nothing reads these now.
-- ───────────────────────────────────────────────────────────────────────────

-- alter table public.exercises
--   drop column day,
--   drop column "order",
--   drop column sets,
--   drop column rep_range_low,
--   drop column rep_range_high,
--   drop column is_priority,
--   drop column amrap_last_set;
--
-- alter table public.sessions drop column day;
--
-- -- set_logs.override_exercise_name is superseded by session_exercises.
-- -- swapped_from_exercise_id; step 7 of the main migration already moved
-- -- those sets onto real exercises.
-- alter table public.set_logs drop column override_exercise_name;
