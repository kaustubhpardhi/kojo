-- ═══════════════════════════════════════════════════════════════════════════
-- Reps — Jacked & Tan Block 1 starters (4-day GZCL-style wave)
--
-- SAFE TO RUN: additive and idempotent. Seeds library exercises that are
-- missing, four is_starter templates, and a personal copy for every user
-- who already has sessions (so Kaustubh gets them without an import tap).
--
-- Prescription is Week 3 of the 4-week wave on the card:
--   T1  5×3   rest 120s  AMRAP last set
--   T2  3×8   rest 90s
--   T2b 3×10  rest 90s
--   T3a 3×14  rest 60s   (the progressing accessory)
--   T3b 3×15 / 4×15 calves  rest 60s
-- Target weights left null — you set those in the logger.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- Library rows used by the split (global seeds).
with needed (name, primary_muscle, equipment, notes) as (
  values
    ('Barbell Back Squat',            'quads',      'barbell',    null),
    ('Romanian Deadlift',             'hamstrings', 'barbell',    'Barbell or dumbbells'),
    ('Leg Press',                     'quads',      'machine',    null),
    ('Leg Extension',                 'quads',      'machine',    null),
    ('Standing Calf Raises',          'calves',     'machine',    null),
    ('Flat Barbell Bench Press',      'chest',      'barbell',    null),
    ('Incline Dumbbell Press (30–45°)', 'chest',    'dumbbell',   null),
    ('Chest-Supported Row',           'back',       'machine',    null),
    ('Cable Lateral Raises',          'shoulders',  'cable',      null),
    ('Tricep Extension',              'triceps',    'cable',      null),
    ('Conventional Deadlift',         'back',       'barbell',    'Adjust by feel / form'),
    ('Front Squat',                   'quads',      'barbell',    'Or pause squat'),
    ('Weighted Pull-Ups / Lat Pulldown', 'back',    'cable',      null),
    ('Lying Leg Curl',                'hamstrings', 'machine',    null),
    ('Ab Work',                       'core',       'bodyweight', 'Plank, cable crunch, or hanging raise — your call'),
    ('Barbell Overhead Press',        'shoulders',  'barbell',    null),
    ('Push Press',                    'shoulders',  'barbell',    'Or incline bench'),
    ('Underhand Lat Pulldown',        'back',       'cable',      null),
    ('Dumbbell Curl',                 'biceps',     'dumbbell',   null),
    ('Face Pulls (High Cable)',       'shoulders',  'cable',      null)
)
insert into public.exercises (name, owner_id, source, primary_muscle, equipment, notes, secondary_muscles)
select n.name, null, 'seed', n.primary_muscle, n.equipment, n.notes, '{}'::text[]
from needed n
where not exists (
  select 1 from public.exercises e
  where lower(e.name) = lower(n.name) and e.owner_id is null and e.is_archived = false
);

-- Helper: resolve a library exercise id by name (prefers unmerged seed).
create temporary table jnt_ex (name text primary key, id uuid) on commit drop;

insert into jnt_ex (name, id)
select distinct on (lower(n.name)) n.name, coalesce(e.merged_into_id, e.id)
from (values
  ('Barbell Back Squat'),
  ('Romanian Deadlift'),
  ('Leg Press'),
  ('Leg Extension'),
  ('Standing Calf Raises'),
  ('Flat Barbell Bench Press'),
  ('Incline Dumbbell Press (30–45°)'),
  ('Chest-Supported Row'),
  ('Cable Lateral Raises'),
  ('Tricep Extension'),
  ('Conventional Deadlift'),
  ('Front Squat'),
  ('Weighted Pull-Ups / Lat Pulldown'),
  ('Lying Leg Curl'),
  ('Ab Work'),
  ('Barbell Overhead Press'),
  ('Push Press'),
  ('Underhand Lat Pulldown'),
  ('Dumbbell Curl'),
  ('Face Pulls (High Cable)')
) as n(name)
join public.exercises e on lower(e.name) = lower(n.name)
where e.owner_id is null and e.is_archived = false
order by lower(n.name), e.created_at;

-- Day definitions: (day_key, template_name, emoji, color, position)
-- Exercises: (day_key, exercise_name, position, sets, low, high, rest, amrap, notes)
create temporary table jnt_days (
  day_key text primary key,
  name text not null,
  emoji text not null,
  color text not null,
  position int not null
) on commit drop;

insert into jnt_days values
  ('d1', 'J&T · Squat Day',    '🦵', 'matcha',  10),
  ('d2', 'J&T · Bench Day',    '💪', 'sunrise', 11),
  ('d3', 'J&T · Deadlift Day', '🧱', 'grape',   12),
  ('d4', 'J&T · OHP Day',      '⚡', 'sunrise', 13);

create temporary table jnt_plans (
  day_key text,
  exercise_name text,
  position int,
  target_sets int,
  rep_low int,
  rep_high int,
  rest_seconds int,
  amrap boolean,
  notes text
) on commit drop;

insert into jnt_plans values
  -- Day 1
  ('d1', 'Barbell Back Squat',              0, 5, 3, 3, 120, true,  'T1 · Week 3 Block 1 — your working weight'),
  ('d1', 'Romanian Deadlift',               1, 3, 8, 8,  90, false, 'T2 · Barbell or DB'),
  ('d1', 'Leg Press',                       2, 3, 10,10, 90, false, 'T2b'),
  ('d1', 'Leg Extension',                   3, 3, 14,14, 60, false, 'T3 · Week 3 of 12→15'),
  ('d1', 'Standing Calf Raises',            4, 4, 15,15, 60, false, 'T3'),
  -- Day 2
  ('d2', 'Flat Barbell Bench Press',        0, 5, 3, 3, 120, true,  'T1 · Week 3 Block 1 — your working weight'),
  ('d2', 'Incline Dumbbell Press (30–45°)', 1, 3, 8, 8,  90, false, 'T2'),
  ('d2', 'Chest-Supported Row',             2, 3, 10,10, 90, false, 'T2b'),
  ('d2', 'Cable Lateral Raises',            3, 3, 15,15, 60, false, 'T3'),
  ('d2', 'Tricep Extension',                4, 3, 14,14, 60, false, 'T3 · Week 3 of 12→15'),
  -- Day 3
  ('d3', 'Conventional Deadlift',           0, 5, 3, 3, 120, true,  'T1 · Week 3 — adjust by feel / form'),
  ('d3', 'Front Squat',                     1, 3, 8, 8,  90, false, 'T2 · Or pause squat'),
  ('d3', 'Weighted Pull-Ups / Lat Pulldown',2, 3, 10,10, 90, false, 'T2b'),
  ('d3', 'Lying Leg Curl',                  3, 3, 14,14, 60, false, 'T3 · Week 3 of 12→15'),
  ('d3', 'Ab Work',                         4, 3, 15,15, 60, false, 'T3'),
  -- Day 4
  ('d4', 'Barbell Overhead Press',          0, 5, 3, 3, 120, true,  'T1 · Week 3 Block 1 — your working weight'),
  ('d4', 'Push Press',                      1, 3, 8, 8,  90, false, 'T2 · Or incline bench'),
  ('d4', 'Underhand Lat Pulldown',          2, 3, 10,10, 90, false, 'T2b'),
  ('d4', 'Dumbbell Curl',                   3, 3, 14,14, 60, false, 'T3 · Week 3 of 12→15'),
  ('d4', 'Face Pulls (High Cable)',         4, 3, 15,15, 60, false, 'T3');

-- 1) Global starter templates (importable by anyone)
do $$
declare
  d record;
  tid uuid;
begin
  for d in select * from jnt_days order by position loop
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
      select tid, x.id, p.position, p.target_sets,
             p.rep_low, p.rep_high, p.rest_seconds, p.amrap, p.notes
      from jnt_plans p
      join jnt_ex x on x.name = p.exercise_name
      where p.day_key = d.day_key
      order by p.position;
    end if;
  end loop;
end $$;

-- 2) Personal copies for every user who already logs (idempotent by name)
do $$
declare
  u record;
  d record;
  tid uuid;
  max_pos int;
begin
  for u in select distinct user_id from public.sessions loop
    select coalesce(max(position), -1) into max_pos
    from public.templates where user_id = u.user_id;

    for d in select * from jnt_days order by position loop
      select id into tid from public.templates
      where user_id = u.user_id and name = d.name and is_archived = false
      limit 1;

      if tid is null then
        max_pos := max_pos + 1;
        insert into public.templates (user_id, name, emoji, color, position, is_starter)
        values (u.user_id, d.name, d.emoji, d.color, max_pos, false)
        returning id into tid;

        insert into public.template_exercises (
          template_id, exercise_id, position, target_sets,
          rep_range_low, rep_range_high, rest_seconds, amrap_last_set, notes
        )
        select tid, x.id, p.position, p.target_sets,
               p.rep_low, p.rep_high, p.rest_seconds, p.amrap, p.notes
        from jnt_plans p
        join jnt_ex x on x.name = p.exercise_name
        where p.day_key = d.day_key
        order by p.position;
      end if;
    end loop;
  end loop;
end $$;

commit;
