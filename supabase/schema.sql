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
  logged_at timestamptz default now(),
  override_exercise_name text
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
-- SEED EXERCISES — Lean Bulk 3-Day (Mon/Wed/Fri)
-- ============================================
-- If replacing existing exercises: DELETE FROM public.exercises; then run inserts below.

-- Day A — Chest + Back + Arms (Monday)
insert into public.exercises (day, "order", name, sets, rep_range_low, rep_range_high, is_priority, amrap_last_set, notes) values
  ('A', 1, 'Flat Barbell Bench Press',    4, 6, 8,  true,  true,  '3s eccentric, explosive up. Retract scapula, drive feet, elbows 45–75°.'),
  ('A', 2, 'Incline Dumbbell Press (30–45°)', 4, 10, 12, true,  false, 'Deep stretch at bottom, elbows 45°, squeeze at top. Don’t go steeper than 45°.'),
  ('A', 3, 'Cable Chest Fly (Low to High)',  3, 15, 15, false, false, 'Arc motion, feel pec stretch. Superset with pull-ups.'),
  ('A', 4, 'Weighted Pull-Ups / Lat Pulldown', 3, 6, 8, false, false, 'Depress & retract shoulders first. Elbows down to hips. Superset with fly.'),
  ('A', 5, 'Barbell Bicep Curl',          3, 8, 10, false, false, 'Strict form, full ROM, pause at peak.'),
  ('A', 6, 'Hammer Curl',                 2, 10, 12, false, false, 'Neutral grip. Controlled tempo, no momentum.'),
  ('A', 7, 'Weighted Cable Crunches',    3, 15, 15, false, false, 'Round the spine, don’t pull neck. Abs not hip flexors.');

-- Day B — Legs + Posterior Chain + Rear Delts (Wednesday)
insert into public.exercises (day, "order", name, sets, rep_range_low, rep_range_high, is_priority, amrap_last_set, notes) values
  ('B', 1, 'Barbell Back Squat',         4, 6, 8,  true,  true,  'Below parallel, full brace. Top set RPE 9, then 3 back-off at 85–90%.'),
  ('B', 2, 'Romanian Deadlift',           3, 10, 12, false, false, 'Hips back, soft knee, bar close. Strong hamstring stretch at bottom.'),
  ('B', 3, 'Bulgarian Split Squat',      3, 10, 10, false, false, 'Rear foot on bench. Torso upright, drive through front heel.'),
  ('B', 4, 'Face Pulls (High Cable)',    4, 20, 20, false, false, 'Pull to forehead, full external rotation. Range of motion over load.'),
  ('B', 5, 'Standing Calf Raises',       4, 15, 20, false, false, 'Full ROM, pause at stretch, control negative.'),
  ('B', 6, 'Seated Calf Raises',         4, 15, 20, false, false, 'Knee flexed = soleus. Go slow, full stretch.'),
  ('B', 7, 'Hanging Leg Raises',         3, 8, 15, false, false, 'To failure, controlled. Posterior pelvic tilt at top.');

-- Day C — Back Thickness + Shoulders + Arms (Friday)
insert into public.exercises (day, "order", name, sets, rep_range_low, rep_range_high, is_priority, amrap_last_set, notes) values
  ('C', 1, 'Barbell Overhead Press',     4, 6, 8,  true,  true,  'Warm shoulders first. Glutes squeezed, straight bar path, full lockout.'),
  ('C', 2, 'Seated Cable Rows',          4, 10, 12, false, false, 'Pull to lower chest. Full scap retraction, chest tall.'),
  ('C', 3, 'Single-Arm Dumbbell Row',   3, 10, 12, false, false, 'Elbow toward hip. Mid-back thickness.'),
  ('C', 4, 'Cable Lateral Raises',      4, 15, 20, false, false, 'Slight forward lean, lead with elbow.'),
  ('C', 5, 'Low-to-High Cable Fly',      2, 15, 20, false, false, 'Upper chest finisher. Squeeze at top, controlled.'),
  ('C', 6, 'Barbell Bicep Curl',         3, 8, 10, false, false, 'Superset with triceps. Strict, full ROM.'),
  ('C', 7, 'Overhead Triceps Extension', 3, 10, 12, false, false, 'Full stretch at bottom. Long head. Superset with curl.'),
  ('C', 8, 'Cable Pushdown',             2, 12, 15, false, false, 'Full extension, squeeze lockout. Finisher.');
