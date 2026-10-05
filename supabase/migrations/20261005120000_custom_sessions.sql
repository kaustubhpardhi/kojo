-- ═══════════════════════════════════════════════════════════════════════════
-- kōjō — custom sessions: user-defined templates replace the fixed A/B/C split
--
-- SAFE TO RUN: additive and idempotent. No DROP, no DELETE. Every existing
-- session and set_log is preserved; A/B/C becomes template rows.
--
-- Destructive follow-ups (dedupe set_logs, unique index, dropping legacy
-- columns) live in 20261005120001_custom_sessions_cleanup.sql — review first.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. EXERCISES become a library: global seeds + per-user custom rows
-- ───────────────────────────────────────────────────────────────────────────

alter table public.exercises
  add column if not exists owner_id uuid references auth.users(id) on delete cascade,
  add column if not exists source text not null default 'seed',
  add column if not exists primary_muscle text,
  add column if not exists secondary_muscles text[] not null default '{}',
  add column if not exists equipment text,
  add column if not exists wger_id integer,
  add column if not exists is_archived boolean not null default false,
  add column if not exists merged_into_id uuid references public.exercises(id) on delete set null;

comment on column public.exercises.owner_id is 'NULL = global seeded library row; otherwise a user-created exercise.';
comment on column public.exercises.source is 'seed | wger | custom';
comment on column public.exercises.merged_into_id is 'Set when this row was superseded by a duplicate merge; kept for audit.';

do $$ begin
  alter table public.exercises add constraint exercises_source_check
    check (source in ('seed', 'wger', 'custom'));
exception when duplicate_object then null; end $$;

-- The per-day plan columns move to template_exercises; keep the data, drop the
-- NOT NULL so library rows no longer need a day/plan.
alter table public.exercises
  alter column day drop not null,
  alter column "order" drop not null,
  alter column sets drop not null,
  alter column rep_range_low drop not null,
  alter column rep_range_high drop not null;

do $$ begin
  alter table public.exercises drop constraint exercises_day_check;
exception when undefined_object then null; end $$;

create index if not exists idx_exercises_owner on public.exercises(owner_id) where is_archived = false;
create index if not exists idx_exercises_name on public.exercises(lower(name));
create unique index if not exists idx_exercises_wger_unique on public.exercises(wger_id) where wger_id is not null;

-- Muscle + equipment metadata for the seeded rows (drives volume-by-muscle).
update public.exercises e set
  primary_muscle = m.primary_muscle,
  secondary_muscles = m.secondary,
  equipment = m.equipment
from (values
  ('Flat Barbell Bench Press',        'chest',      array['triceps','shoulders'], 'barbell'),
  ('Incline Dumbbell Press (30–45°)', 'chest',      array['shoulders','triceps'], 'dumbbell'),
  ('Cable Chest Fly (Low to High)',   'chest',      array[]::text[],              'cable'),
  ('Weighted Pull-Ups / Lat Pulldown','back',       array['biceps'],              'bodyweight'),
  ('Barbell Bicep Curl',              'biceps',     array['forearms'],            'barbell'),
  ('Hammer Curl',                     'biceps',     array['forearms'],            'dumbbell'),
  ('Weighted Cable Crunches',         'core',       array[]::text[],              'cable'),
  ('Barbell Back Squat',              'quads',      array['glutes','core'],       'barbell'),
  ('Romanian Deadlift',               'hamstrings', array['glutes','back'],       'barbell'),
  ('Bulgarian Split Squat',           'quads',      array['glutes'],              'dumbbell'),
  ('Face Pulls (High Cable)',         'shoulders',  array['back'],                'cable'),
  ('Standing Calf Raises',            'calves',     array[]::text[],              'machine'),
  ('Seated Calf Raises',              'calves',     array[]::text[],              'machine'),
  ('Hanging Leg Raises',              'core',       array[]::text[],              'bodyweight'),
  ('Barbell Overhead Press',          'shoulders',  array['triceps','core'],      'barbell'),
  ('Seated Cable Rows',               'back',       array['biceps'],              'cable'),
  ('Single-Arm Dumbbell Row',         'back',       array['biceps'],              'dumbbell'),
  ('Cable Lateral Raises',            'shoulders',  array[]::text[],              'cable'),
  ('Low-to-High Cable Fly',           'chest',      array['shoulders'],           'cable'),
  ('Overhead Triceps Extension',      'triceps',    array[]::text[],              'dumbbell'),
  ('Cable Pushdown',                  'triceps',    array[]::text[],              'cable')
) as m(name, primary_muscle, secondary, equipment)
where e.name = m.name and e.primary_muscle is null;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. TEMPLATES + their ordered exercise list
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.templates (
  id uuid primary key default uuid_generate_v4(),
  -- NULL + is_starter = global starter template, importable by anyone.
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  emoji text,
  color text,
  position integer not null default 0,
  is_starter boolean not null default false,
  is_archived boolean not null default false,
  source_template_id uuid references public.templates(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint templates_owner_check check (user_id is not null or is_starter)
);

create index if not exists idx_templates_user on public.templates(user_id, position)
  where is_archived = false;
create index if not exists idx_templates_starter on public.templates(is_starter)
  where is_starter = true;

create table if not exists public.template_exercises (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references public.templates(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position integer not null default 0,
  target_sets integer not null default 3,
  rep_range_low integer not null default 8,
  rep_range_high integer not null default 12,
  target_weight numeric(6,2),
  rest_seconds integer not null default 90,
  amrap_last_set boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_template_exercises_template
  on public.template_exercises(template_id, position);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. SESSIONS reference a template, and snapshot their own exercise list
-- ───────────────────────────────────────────────────────────────────────────

alter table public.sessions
  add column if not exists template_id uuid references public.templates(id) on delete set null,
  add column if not exists title text,
  add column if not exists notes text,
  add column if not exists started_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- Freestyle sessions have no day; new sessions stop writing this column.
alter table public.sessions alter column day drop not null;

do $$ begin
  alter table public.sessions drop constraint sessions_day_check;
exception when undefined_object then null; end $$;

comment on column public.sessions.day is 'Legacy A/B/C marker. Read-only history; new sessions use template_id + title.';
comment on column public.sessions.title is 'Snapshot of the template name at start, so renaming a template never rewrites history.';

/* A session owns a copy of its plan. Editing a template never changes a
   session already in progress or in the past. */
create table if not exists public.session_exercises (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position integer not null default 0,
  target_sets integer not null default 3,
  rep_range_low integer,
  rep_range_high integer,
  target_weight numeric(6,2),
  rest_seconds integer not null default 90,
  amrap_last_set boolean not null default false,
  notes text,
  status text not null default 'pending',
  swapped_from_exercise_id uuid references public.exercises(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint session_exercises_status_check check (status in ('pending', 'done', 'skipped'))
);

create index if not exists idx_session_exercises_session
  on public.session_exercises(session_id, position);

alter table public.set_logs
  add column if not exists session_exercise_id uuid
    references public.session_exercises(id) on delete cascade,
  add column if not exists override_exercise_name text;

create index if not exists idx_set_logs_session_exercise
  on public.set_logs(session_exercise_id);
create index if not exists idx_set_logs_exercise on public.set_logs(exercise_id);

-- Deleting an exercise must never silently delete logged history.
do $$ begin
  alter table public.set_logs drop constraint set_logs_exercise_id_fkey;
  alter table public.set_logs add constraint set_logs_exercise_id_fkey
    foreign key (exercise_id) references public.exercises(id) on delete restrict;
exception when undefined_object then null; end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. FAVORITES (the picker's "recent" list is derived from set_logs)
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.exercise_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

-- ───────────────────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY
-- ───────────────────────────────────────────────────────────────────────────

alter table public.exercises enable row level security;
alter table public.templates enable row level security;
alter table public.template_exercises enable row level security;
alter table public.session_exercises enable row level security;
alter table public.exercise_favorites enable row level security;

drop policy if exists "Exercises are readable by all authenticated users" on public.exercises;
drop policy if exists "exercises_select" on public.exercises;
create policy "exercises_select" on public.exercises for select to authenticated
  using (owner_id is null or owner_id = auth.uid());

drop policy if exists "exercises_insert" on public.exercises;
create policy "exercises_insert" on public.exercises for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "exercises_update" on public.exercises;
create policy "exercises_update" on public.exercises for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "exercises_delete" on public.exercises;
create policy "exercises_delete" on public.exercises for delete to authenticated
  using (owner_id = auth.uid());

drop policy if exists "templates_select" on public.templates;
create policy "templates_select" on public.templates for select to authenticated
  using (user_id = auth.uid() or is_starter);

drop policy if exists "templates_insert" on public.templates;
create policy "templates_insert" on public.templates for insert to authenticated
  with check (user_id = auth.uid() and not is_starter);

drop policy if exists "templates_update" on public.templates;
create policy "templates_update" on public.templates for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "templates_delete" on public.templates;
create policy "templates_delete" on public.templates for delete to authenticated
  using (user_id = auth.uid());

-- template_exercises inherit access from their template.
drop policy if exists "template_exercises_select" on public.template_exercises;
create policy "template_exercises_select" on public.template_exercises for select to authenticated
  using (exists (
    select 1 from public.templates t
    where t.id = template_id and (t.user_id = auth.uid() or t.is_starter)
  ));

drop policy if exists "template_exercises_write" on public.template_exercises;
create policy "template_exercises_write" on public.template_exercises for all to authenticated
  using (exists (select 1 from public.templates t where t.id = template_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.templates t where t.id = template_id and t.user_id = auth.uid()));

drop policy if exists "session_exercises_select" on public.session_exercises;
create policy "session_exercises_select" on public.session_exercises for select to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id and s.user_id = auth.uid()));

drop policy if exists "session_exercises_write" on public.session_exercises;
create policy "session_exercises_write" on public.session_exercises for all to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.sessions s where s.id = session_id and s.user_id = auth.uid()));

drop policy if exists "favorites_all" on public.exercise_favorites;
create policy "favorites_all" on public.exercise_favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Sessions were missing a delete policy.
drop policy if exists "Users can delete their own sessions" on public.sessions;
create policy "Users can delete their own sessions" on public.sessions for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own set logs" on public.set_logs;
create policy "Users can delete their own set logs" on public.set_logs for delete to authenticated
  using (session_id in (select id from public.sessions where user_id = auth.uid()));

-- ───────────────────────────────────────────────────────────────────────────
-- 6. MERGE DUPLICATE SEEDS ("Barbell Bicep Curl" existed in both day A and C)
--    History is combined onto the oldest row; the loser is archived, not
--    deleted, so the change stays auditable and reversible.
-- ───────────────────────────────────────────────────────────────────────────

do $$
declare
  dup record;
  keeper uuid;
begin
  for dup in
    select lower(name) as lname
    from public.exercises
    where owner_id is null and merged_into_id is null and is_archived = false
    group by lower(name)
    having count(*) > 1
  loop
    select id into keeper from public.exercises
    where owner_id is null and lower(name) = dup.lname and merged_into_id is null
    order by created_at, day nulls last, "order" nulls last
    limit 1;

    update public.set_logs sl set exercise_id = keeper
    where sl.exercise_id in (
      select id from public.exercises
      where owner_id is null and lower(name) = dup.lname and id <> keeper
    );

    update public.exercises
    set is_archived = true, merged_into_id = keeper
    where owner_id is null and lower(name) = dup.lname and id <> keeper;

    raise notice 'Merged duplicates of "%" into %', dup.lname, keeper;
  end loop;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 7. REPOINT REPLACED SETS onto real exercises
--    Sets logged via "Replace" only carried a display name, so their weight
--    counted toward the original lift's PRs. Give each replacement name its
--    own user-owned exercise and move those sets to it.
-- ───────────────────────────────────────────────────────────────────────────

do $$
declare
  ov record;
  target uuid;
  moved integer;
begin
  for ov in
    select distinct s.user_id, sl.override_exercise_name as name
    from public.set_logs sl
    join public.sessions s on s.id = sl.session_id
    where sl.override_exercise_name is not null
      and length(trim(sl.override_exercise_name)) > 0
  loop
    select id into target from public.exercises
    where lower(name) = lower(ov.name)
      and (owner_id = ov.user_id or owner_id is null)
      and is_archived = false
    order by owner_id nulls last
    limit 1;

    if target is null then
      insert into public.exercises (name, owner_id, source, notes)
      values (ov.name, ov.user_id, 'custom',
              'Created during migration from a session replacement.')
      returning id into target;
    end if;

    update public.set_logs sl set exercise_id = target
    from public.sessions s
    where s.id = sl.session_id
      and s.user_id = ov.user_id
      and lower(sl.override_exercise_name) = lower(ov.name)
      and sl.exercise_id <> target;

    get diagnostics moved = row_count;
    raise notice 'Repointed % set(s) to "%"', moved, ov.name;
  end loop;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 8. STARTER TEMPLATES — the original A/B/C split, importable by anyone
-- ───────────────────────────────────────────────────────────────────────────

do $$
declare
  d record;
  tid uuid;
begin
  for d in
    select * from (values
      ('A', 'Push & Pull', '💪', 'sunrise', 0),
      ('B', 'Legs & Posterior', '🦵', 'matcha', 1),
      ('C', 'Back & Shoulders', '🔱', 'grape', 2)
    ) as v(day, name, emoji, color, position)
  loop
    select id into tid from public.templates
    where is_starter and user_id is null and name = d.name limit 1;

    if tid is null then
      insert into public.templates (user_id, name, emoji, color, position, is_starter)
      values (null, d.name, d.emoji, d.color, d.position, true)
      returning id into tid;

      insert into public.template_exercises (
        template_id, exercise_id, position, target_sets,
        rep_range_low, rep_range_high, rest_seconds, amrap_last_set, notes
      )
      select tid,
             coalesce(e.merged_into_id, e.id),
             e."order",
             e.sets,
             e.rep_range_low,
             e.rep_range_high,
             case when e.is_priority then 180 else 90 end,
             coalesce(e.amrap_last_set, false),
             e.notes
      from public.exercises e
      where e.day = d.day and e.owner_id is null
      order by e."order";
    end if;
  end loop;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 9. BACKFILL each existing user: A/B/C become their own editable templates
-- ───────────────────────────────────────────────────────────────────────────

do $$
declare
  u record;
  d record;
  tid uuid;
begin
  for u in select distinct user_id from public.sessions loop
    for d in
      select * from (values
        ('A', 'Push & Pull', '💪', 'sunrise', 0),
        ('B', 'Legs & Posterior', '🦵', 'matcha', 1),
        ('C', 'Back & Shoulders', '🔱', 'grape', 2)
      ) as v(day, name, emoji, color, position)
    loop
      -- Only for day types this user actually trained.
      if not exists (
        select 1 from public.sessions s where s.user_id = u.user_id and s.day = d.day
      ) then
        continue;
      end if;

      select id into tid from public.templates
      where user_id = u.user_id and name = d.name limit 1;

      if tid is null then
        insert into public.templates (user_id, name, emoji, color, position)
        values (u.user_id, d.name, d.emoji, d.color, d.position)
        returning id into tid;

        insert into public.template_exercises (
          template_id, exercise_id, position, target_sets,
          rep_range_low, rep_range_high, rest_seconds, amrap_last_set, notes
        )
        select tid,
               coalesce(e.merged_into_id, e.id),
               e."order",
               e.sets,
               e.rep_range_low,
               e.rep_range_high,
               case when e.is_priority then 180 else 90 end,
               coalesce(e.amrap_last_set, false),
               e.notes
        from public.exercises e
        where e.day = d.day and e.owner_id is null
        order by e."order";
      end if;

      update public.sessions
      set template_id = tid, title = coalesce(title, d.name)
      where user_id = u.user_id and day = d.day and template_id is null;
    end loop;
  end loop;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 10. BACKFILL session_exercises from what was actually logged, then link
--     every set_log to its session_exercise row.
-- ───────────────────────────────────────────────────────────────────────────

insert into public.session_exercises (
  session_id, exercise_id, position, target_sets,
  rep_range_low, rep_range_high, rest_seconds, amrap_last_set, status
)
select
  logged.session_id,
  logged.exercise_id,
  row_number() over (partition by logged.session_id order by logged.first_logged) - 1,
  greatest(logged.set_count, 1),
  ex.rep_range_low,
  ex.rep_range_high,
  90,
  coalesce(logged.had_amrap, false),
  'done'
from (
  select sl.session_id,
         sl.exercise_id,
         min(sl.logged_at) as first_logged,
         count(*) as set_count,
         bool_or(sl.is_amrap) as had_amrap
  from public.set_logs sl
  group by sl.session_id, sl.exercise_id
) logged
join public.exercises ex on ex.id = logged.exercise_id
where not exists (
  select 1 from public.session_exercises se
  where se.session_id = logged.session_id and se.exercise_id = logged.exercise_id
);

update public.set_logs sl
set session_exercise_id = se.id
from public.session_exercises se
where se.session_id = sl.session_id
  and se.exercise_id = sl.exercise_id
  and sl.session_exercise_id is null;

update public.sessions s
set started_at = coalesce(started_at, s.created_at)
where started_at is null;

commit;

-- ───────────────────────────────────────────────────────────────────────────
-- VERIFY (run after; all three should return 0)
-- ───────────────────────────────────────────────────────────────────────────
-- select count(*) from public.set_logs where session_exercise_id is null;
-- select count(*) from public.sessions where template_id is null and day is not null;
-- select count(*) from public.set_logs sl
--   left join public.exercises e on e.id = sl.exercise_id where e.id is null;
