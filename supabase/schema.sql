-- kōjō (工場) Workout Logger — Supabase Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- EXERCISES (seeded, not user-editable)
-- ============================================
create table public.exercises (
  id uuid default uuid_generate_v4() primary key,
  day text not null check (day in ('A', 'B', 'C')),
  "order" integer not null,
  name text not null,
  sets integer not null,
  rep_range_low integer not null,
  rep_range_high integer not null,
  is_priority boolean default false,
  amrap_last_set boolean default false,
  notes text,
  created_at timestamptz default now()
);

-- ============================================
-- SESSIONS
-- ============================================
create table public.sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  day text not null check (day in ('A', 'B', 'C')),
  date date not null,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================
-- SET LOGS
-- ============================================
create table public.set_logs (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid not null references public.sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  set_number integer not null,
  weight numeric(6,2) not null default 0,
  reps integer not null default 0,
  is_amrap boolean default false,
  logged_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================
create index idx_sessions_user_date on public.sessions(user_id, date);
create index idx_sessions_user_day on public.sessions(user_id, day);
create index idx_set_logs_session on public.set_logs(session_id);
create index idx_exercises_day on public.exercises(day, "order");

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Exercises: readable by everyone (seeded data)
alter table public.exercises enable row level security;
create policy "Exercises are readable by all authenticated users"
  on public.exercises for select
  to authenticated
  using (true);

-- Sessions: users can only access their own
alter table public.sessions enable row level security;
create policy "Users can view their own sessions"
  on public.sessions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own sessions"
  on public.sessions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own sessions"
  on public.sessions for update
  to authenticated
  using (auth.uid() = user_id);

-- Set logs: users can access logs for their sessions
alter table public.set_logs enable row level security;
create policy "Users can view their own set logs"
  on public.set_logs for select
  to authenticated
  using (
    session_id in (
      select id from public.sessions where user_id = auth.uid()
    )
  );

create policy "Users can create set logs for their sessions"
  on public.set_logs for insert
  to authenticated
  with check (
    session_id in (
      select id from public.sessions where user_id = auth.uid()
    )
  );

create policy "Users can update their own set logs"
  on public.set_logs for update
  to authenticated
  using (
    session_id in (
      select id from public.sessions where user_id = auth.uid()
    )
  );

-- ============================================
-- SEED EXERCISES
-- ============================================

-- Day A — Legs & Core
insert into public.exercises (day, "order", name, sets, rep_range_low, rep_range_high, is_priority, amrap_last_set, notes) values
  ('A', 1, 'Barbell Squat',             4, 4, 6,   true,  true,  'Main compound. Brace hard, full depth.'),
  ('A', 2, 'Romanian Deadlift',         3, 8, 10,  false, false, 'Hinge at hips, feel the hamstrings.'),
  ('A', 3, 'Leg Press',                 3, 10, 12, false, false, 'Controlled tempo, full range.'),
  ('A', 4, 'Leg Curl',                  3, 10, 12, false, false, 'Squeeze at the top.'),
  ('A', 5, 'Calf Raise',               4, 12, 15, false, false, 'Pause at bottom stretch.'),
  ('A', 6, 'Ab Rollout',               3, 8, 12,  false, false, 'Slow eccentric, tight core.');

-- Day B — Push
insert into public.exercises (day, "order", name, sets, rep_range_low, rep_range_high, is_priority, amrap_last_set, notes) values
  ('B', 1, 'Barbell Bench Press',       4, 4, 6,   true,  true,  'Main compound. Arch, leg drive, control.'),
  ('B', 2, 'Incline Dumbbell Press',    3, 8, 10,  false, false, '30° incline, stretch at bottom.'),
  ('B', 3, 'Overhead Press',            3, 6, 8,   true,  true,  'Strict form, no leg drive.'),
  ('B', 4, 'Lateral Raise',             3, 12, 15, false, false, 'Light weight, control the negative.'),
  ('B', 5, 'Tricep Pushdown',           3, 10, 12, false, false, 'Lock elbows, squeeze at bottom.'),
  ('B', 6, 'Overhead Tricep Extension', 3, 10, 12, false, false, 'Deep stretch, full extension.');

-- Day C — Pull
insert into public.exercises (day, "order", name, sets, rep_range_low, rep_range_high, is_priority, amrap_last_set, notes) values
  ('C', 1, 'Barbell Row',               4, 4, 6,   true,  true,  'Main compound. Chest to bar, squeeze back.'),
  ('C', 2, 'Pull-Up / Lat Pulldown',    3, 6, 10,  false, false, 'Full range, dead hang at bottom.'),
  ('C', 3, 'Cable Row',                 3, 10, 12, false, false, 'Squeeze shoulder blades together.'),
  ('C', 4, 'Face Pull',                 3, 15, 20, false, false, 'Externally rotate at the top.'),
  ('C', 5, 'Barbell Curl',              3, 8, 10,  false, false, 'No swinging, strict form.'),
  ('C', 6, 'Hammer Curl',               3, 10, 12, false, false, 'Neutral grip, control both phases.');
