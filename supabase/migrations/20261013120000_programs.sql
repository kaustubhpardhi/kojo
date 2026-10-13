-- ═══════════════════════════════════════════════════════════════════════════
-- Reps — programs (Block 1 hypertrophy) + session/plan extensions
--
-- SAFE TO RUN: additive and idempotent. No DROP of user data. Existing
-- sessions and set_logs are untouched. J&T Block 1 templates are kept and
-- marked is_superseded (not deleted).
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Extend existing plan / log columns
-- ───────────────────────────────────────────────────────────────────────────

alter table public.templates
  add column if not exists program_id uuid,
  add column if not exists is_superseded boolean not null default false;

alter table public.template_exercises
  add column if not exists role text,
  add column if not exists slot_key text,
  add column if not exists superset_group text,
  add column if not exists superset_order integer,
  add column if not exists increment_kg numeric(5,2) not null default 2.5,
  add column if not exists keep_weight boolean not null default false,
  add column if not exists unilateral boolean not null default false,
  add column if not exists rir_label text;

do $$ begin
  alter table public.template_exercises
    add constraint template_exercises_role_check
    check (role is null or role in ('main', 'accessory'));
exception when duplicate_object then null; end $$;

alter table public.session_exercises
  add column if not exists role text,
  add column if not exists slot_key text,
  add column if not exists superset_group text,
  add column if not exists superset_order integer,
  add column if not exists increment_kg numeric(5,2) not null default 2.5,
  add column if not exists keep_weight boolean not null default false,
  add column if not exists unilateral boolean not null default false,
  add column if not exists rir_label text,
  add column if not exists program_slot_id uuid,
  add column if not exists failure_last_set boolean not null default false;

do $$ begin
  alter table public.session_exercises
    add constraint session_exercises_role_check
    check (role is null or role in ('main', 'accessory'));
exception when duplicate_object then null; end $$;

alter table public.set_logs
  add column if not exists set_type text not null default 'working';

do $$ begin
  alter table public.set_logs
    add constraint set_logs_set_type_check
    check (set_type in ('warmup', 'working', 'failure'));
exception when duplicate_object then null; end $$;

comment on column public.set_logs.set_type is
  'warmup | working | failure. Existing rows default to working; warm-ups excluded from progression and volume.';

alter table public.sessions
  add column if not exists program_run_id uuid,
  add column if not exists program_week_number integer,
  add column if not exists program_day_number integer;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Program definition tables
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.programs (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name text not null,
  description text,
  week_count integer not null default 4,
  is_starter boolean not null default false,
  is_archived boolean not null default false,
  superseded_by uuid references public.programs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.program_weeks (
  id uuid primary key default uuid_generate_v4(),
  program_id uuid not null references public.programs(id) on delete cascade,
  week_number integer not null,
  is_deload boolean not null default false,
  main_rir_label text not null,
  accessory_to_failure_last boolean not null default false,
  accessory_set_delta integer not null default 0,
  notes text,
  unique (program_id, week_number)
);

create table if not exists public.program_days (
  id uuid primary key default uuid_generate_v4(),
  program_id uuid not null references public.programs(id) on delete cascade,
  day_number integer not null,
  name text not null,
  short_label text not null,
  emoji text,
  estimated_minutes integer,
  template_id uuid references public.templates(id) on delete set null,
  unique (program_id, day_number)
);

create table if not exists public.program_slots (
  id uuid primary key default uuid_generate_v4(),
  program_day_id uuid not null references public.program_days(id) on delete cascade,
  position integer not null default 0,
  slot_key text not null,
  role text not null default 'accessory',
  main_lift_key text,
  superset_group text,
  superset_order integer,
  target_sets integer not null default 3,
  rep_min integer not null default 8,
  rep_max integer not null default 12,
  rest_seconds integer not null default 90,
  increment_kg numeric(5,2) not null default 2.5,
  keep_weight boolean not null default false,
  unilateral boolean not null default false,
  notes text,
  constraint program_slots_role_check check (role in ('main', 'accessory')),
  unique (program_day_id, slot_key)
);

create table if not exists public.program_slot_exercises (
  slot_id uuid not null references public.program_slots(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  is_default boolean not null default false,
  position integer not null default 0,
  primary key (slot_id, exercise_id)
);

create table if not exists public.program_slot_week_overrides (
  slot_id uuid not null references public.program_slots(id) on delete cascade,
  week_number integer not null,
  target_sets integer not null,
  rep_min integer,
  rep_max integer,
  primary key (slot_id, week_number)
);

create table if not exists public.program_runs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete restrict,
  block_number integer not null default 1,
  start_date date not null,
  current_week integer not null default 1,
  status text not null default 'active',
  incline_variant text not null default 'barbell',
  source_run_id uuid references public.program_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_runs_status_check check (status in ('active', 'completed', 'abandoned')),
  constraint program_runs_incline_check check (incline_variant in ('barbell', 'dumbbell'))
);

create unique index if not exists idx_program_runs_one_active
  on public.program_runs (user_id, program_id)
  where status = 'active';

create table if not exists public.program_run_days (
  id uuid primary key default uuid_generate_v4(),
  run_id uuid not null references public.program_runs(id) on delete cascade,
  week_number integer not null,
  day_number integer not null,
  session_id uuid references public.sessions(id) on delete set null,
  completed_at timestamptz,
  unique (run_id, week_number, day_number)
);

-- Late FKs that reference tables created above
do $$ begin
  alter table public.templates
    add constraint templates_program_id_fkey
    foreign key (program_id) references public.programs(id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.sessions
    add constraint sessions_program_run_id_fkey
    foreign key (program_run_id) references public.program_runs(id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.session_exercises
    add constraint session_exercises_program_slot_id_fkey
    foreign key (program_slot_id) references public.program_slots(id) on delete set null;
exception when duplicate_object then null; end $$;

create index if not exists idx_program_days_program on public.program_days(program_id, day_number);
create index if not exists idx_program_slots_day on public.program_slots(program_day_id, position);
create index if not exists idx_program_runs_user on public.program_runs(user_id, status);
create index if not exists idx_program_run_days_run on public.program_run_days(run_id, week_number, day_number);
create index if not exists idx_sessions_program_run on public.sessions(program_run_id)
  where program_run_id is not null;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. RLS
-- ───────────────────────────────────────────────────────────────────────────

alter table public.programs enable row level security;
alter table public.program_weeks enable row level security;
alter table public.program_days enable row level security;
alter table public.program_slots enable row level security;
alter table public.program_slot_exercises enable row level security;
alter table public.program_slot_week_overrides enable row level security;
alter table public.program_runs enable row level security;
alter table public.program_run_days enable row level security;

drop policy if exists "Programs readable by authenticated" on public.programs;
create policy "Programs readable by authenticated" on public.programs
  for select to authenticated using (true);

drop policy if exists "Program weeks readable" on public.program_weeks;
create policy "Program weeks readable" on public.program_weeks
  for select to authenticated using (true);

drop policy if exists "Program days readable" on public.program_days;
create policy "Program days readable" on public.program_days
  for select to authenticated using (true);

drop policy if exists "Program slots readable" on public.program_slots;
create policy "Program slots readable" on public.program_slots
  for select to authenticated using (true);

drop policy if exists "Program slot exercises readable" on public.program_slot_exercises;
create policy "Program slot exercises readable" on public.program_slot_exercises
  for select to authenticated using (true);

drop policy if exists "Program slot week overrides readable" on public.program_slot_week_overrides;
create policy "Program slot week overrides readable" on public.program_slot_week_overrides
  for select to authenticated using (true);

drop policy if exists "Users manage own program runs" on public.program_runs;
create policy "Users manage own program runs" on public.program_runs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own program run days" on public.program_run_days;
create policy "Users manage own program run days" on public.program_run_days
  for all to authenticated
  using (
    exists (
      select 1 from public.program_runs r
      where r.id = run_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.program_runs r
      where r.id = run_id and r.user_id = auth.uid()
    )
  );

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Seed missing library exercises (idempotent)
-- ───────────────────────────────────────────────────────────────────────────

with needed (name, primary_muscle, equipment, notes) as (
  values
    ('Incline Barbell Press',     'chest',      'barbell',    'Default Day 4 incline for Block 1; swap with dumbbell each block'),
    ('Pull-Up',                   'back',       'bodyweight', 'Alternative to lat pulldown'),
    ('Overhand Lat Pulldown',     'back',       'cable',      'Alternative to pull-up'),
    ('Incline Dumbbell Curl',     'biceps',     'dumbbell',   null),
    ('Cable Crunch',              'core',       'cable',      null)
)
insert into public.exercises (name, owner_id, source, primary_muscle, equipment, notes, secondary_muscles)
select n.name, null, 'seed', n.primary_muscle, n.equipment, n.notes, '{}'::text[]
from needed n
where not exists (
  select 1 from public.exercises e
  where lower(e.name) = lower(n.name) and e.is_archived = false
);

-- Fill metadata on the user's incline curl if the custom row exists without muscles.
update public.exercises
set
  primary_muscle = coalesce(primary_muscle, 'biceps'),
  equipment = coalesce(equipment, 'dumbbell')
where lower(name) = lower('Incline dumbbell curl')
  and (primary_muscle is null or equipment is null);

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Mark J&T Block 1 templates superseded (keep rows)
-- ───────────────────────────────────────────────────────────────────────────

update public.templates
set is_superseded = true
where name in (
  'J&T · Squat Day',
  'J&T · Bench Day',
  'J&T · Deadlift Day',
  'J&T · OHP Day'
);

commit;
