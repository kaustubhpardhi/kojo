-- Reps — a four day standalone hypertrophy split.
-- Keeps sessions and historical templates; replaces the old public starter
-- catalog with four independent, editable workout templates.

begin;

-- Ensure all exercises in the split exist in the shared library.
with needed (name, primary_muscle, equipment, notes) as (
  values
    ('Flat Barbell Bench Press', 'chest', 'barbell', null),
    ('Seated Cable Rows', 'back', 'cable', null),
    ('Incline Dumbbell Press (30–45°)', 'chest', 'dumbbell', null),
    ('Cable Lateral Raises', 'shoulders', 'cable', null),
    ('Face Pulls (High Cable)', 'shoulders', 'cable', null),
    ('Incline Dumbbell Curl', 'biceps', 'dumbbell', null),
    ('Overhead Triceps Extension', 'triceps', 'cable', null),
    ('Barbell Back Squat', 'quads', 'barbell', null),
    ('Romanian Deadlift', 'hamstrings', 'barbell', null),
    ('Leg Press', 'quads', 'machine', null),
    ('Standing Calf Raises', 'calves', 'machine', null),
    ('Hanging Leg Raises', 'core', 'bodyweight', null),
    ('Barbell Overhead Press', 'shoulders', 'barbell', null),
    ('Underhand Lat Pulldown', 'back', 'cable', null),
    ('Incline Barbell Press', 'chest', 'barbell', null),
    ('Cable Chest Fly (Low to High)', 'chest', 'cable', null),
    ('Hammer Curl', 'biceps', 'dumbbell', null),
    ('Cable Pushdown', 'triceps', 'cable', null),
    ('Bulgarian Split Squat', 'quads', 'dumbbell', null),
    ('Lying Leg Curl', 'hamstrings', 'machine', null),
    ('Leg Extension', 'quads', 'machine', null),
    ('Overhand Lat Pulldown', 'back', 'cable', null),
    ('Seated Calf Raises', 'calves', 'machine', null),
    ('Weighted Cable Crunches', 'core', 'cable', null),
    ('Rear Delt Fly', 'shoulders', 'dumbbell', null),
    ('Cable Curl', 'biceps', 'cable', null)
)
insert into public.exercises (name, owner_id, source, primary_muscle, equipment, notes, secondary_muscles)
select n.name, null, 'seed', n.primary_muscle, n.equipment, n.notes, '{}'::text[]
from needed n
where not exists (
  select 1 from public.exercises e
  where lower(e.name) = lower(n.name) and e.owner_id is null and not e.is_archived
);

create temporary table split_plan (
  workout text,
  exercise text,
  position integer,
  target_sets integer,
  rep_low integer,
  rep_high integer,
  rest_seconds integer,
  notes text,
  superset_group text,
  superset_order integer,
  unilateral boolean default false
) on commit drop;

insert into split_plan values
  ('Upper A','Flat Barbell Bench Press',0,3,6,8,150,'2 ramp-up sets. Standalone.',null,null,false),
  ('Upper A','Seated Cable Rows',1,3,8,12,90,'Replaces the chest-supported row. Standalone.',null,null,false),
  ('Upper A','Incline Dumbbell Press (30–45°)',2,2,8,12,90,'Bench at about 30°.',null,null,false),
  ('Upper A','Cable Lateral Raises',3,3,15,20,45,'Superset A. Keep the weight steady; go straight to face pulls.','ua-1',0,false),
  ('Upper A','Face Pulls (High Cable)',4,3,15,20,45,'Superset B. Rest 45 seconds after the pair.','ua-1',1,false),
  ('Upper A','Incline Dumbbell Curl',5,3,10,12,45,'Superset A. Keep the curl weight steady; go straight to triceps.','ua-2',0,false),
  ('Upper A','Overhead Triceps Extension',6,3,10,12,45,'Superset B. Rest 45 seconds after the pair.','ua-2',1,false),

  ('Lower A','Barbell Back Squat',0,3,6,8,150,'2 ramp-up sets. Standalone.',null,null,false),
  ('Lower A','Romanian Deadlift',1,3,6,8,120,'Heavy hinge day. Soft knees, bar close; 1 ramp-up set.',null,null,false),
  ('Lower A','Leg Press',2,2,10,12,90,'Stop 1–2 reps short of failure.',null,null,false),
  ('Lower A','Cable Lateral Raises',3,3,15,20,45,'Superset A; go straight to standing calf raises.','la-1',0,false),
  ('Lower A','Standing Calf Raises',4,3,10,15,45,'Superset B. Rest 45 seconds after the pair.','la-1',1,false),
  ('Lower A','Hanging Leg Raises',5,2,10,15,60,'No swinging.',null,null,false),

  ('Upper B','Barbell Overhead Press',0,3,6,8,150,'2 ramp-up sets. Glutes tight. Standalone.',null,null,false),
  ('Upper B','Underhand Lat Pulldown',1,3,10,12,90,'Drive elbows toward your body. Standalone.',null,null,false),
  ('Upper B','Incline Barbell Press',2,2,8,12,90,null,null,null,false),
  ('Upper B','Cable Chest Fly (Low to High)',3,2,12,15,45,'Soft elbows.',null,null,false),
  ('Upper B','Hammer Curl',4,3,10,12,45,'Superset A. Keep curl weight steady; go straight to pushdowns.','ub-1',0,false),
  ('Upper B','Cable Pushdown',5,3,10,12,45,'Superset B. Rest 45 seconds after the pair.','ub-1',1,false),

  ('Lower B + Weak Points','Bulgarian Split Squat',0,3,8,10,120,'Same weight on both sides. Reps are per leg.',null,null,true),
  ('Lower B + Weak Points','Lying Leg Curl',1,3,10,12,90,'Second hamstring stimulus; avoid a second hard hinge.',null,null,false),
  ('Lower B + Weak Points','Leg Extension',2,3,12,15,60,null,null,null,false),
  ('Lower B + Weak Points','Overhand Lat Pulldown',3,3,8,10,90,'Alternative: weighted pull-up. Pick one and keep it for the block.',null,null,false),
  ('Lower B + Weak Points','Cable Lateral Raises',4,4,15,20,45,'Superset A. Shoulder priority; go straight to seated calf raises.','lb-1',0,false),
  ('Lower B + Weak Points','Seated Calf Raises',5,3,12,15,45,'Superset B. Rest 45 seconds after the pair.','lb-1',1,false),
  ('Lower B + Weak Points','Weighted Cable Crunches',6,3,10,15,60,'Squeeze at the bottom.',null,null,false),
  ('Lower B + Weak Points','Rear Delt Fly',7,3,10,15,60,'Weak-point slot 1. Swap for a lagging area exercise if preferred.',null,null,false),
  ('Lower B + Weak Points','Cable Curl',8,3,10,15,60,'Weak-point slot 2. Swap for a lagging area exercise if preferred.',null,null,false);

-- Create/update the shared templates and their plans. Imported user copies
-- remain independent and editable.
do $$
declare
  d record;
  tid uuid;
begin
  for d in
    select * from (values
      ('Upper A','💪','sunrise',0),
      ('Lower A','🦵','matcha',1),
      ('Upper B','⚡','sunrise',2),
      ('Lower B + Weak Points','🧱','grape',3)
    ) as v(name, emoji, color, position)
  loop
    select id into tid from public.templates
    where user_id is null and is_starter and name = d.name
    limit 1;

    if tid is null then
      insert into public.templates (user_id,name,emoji,color,position,is_starter)
      values (null,d.name,d.emoji,d.color,d.position,true)
      returning id into tid;
    else
      update public.templates set emoji=d.emoji,color=d.color,position=d.position,
        is_archived=false,is_superseded=false,updated_at=now()
      where id=tid;
      delete from public.template_exercises where template_id=tid;
    end if;

    insert into public.template_exercises (
      template_id,exercise_id,position,target_sets,rep_range_low,rep_range_high,
      rest_seconds,amrap_last_set,notes,superset_group,superset_order,unilateral
    )
    select tid,e.id,p.position,p.target_sets,p.rep_low,p.rep_high,p.rest_seconds,
      false,p.notes,p.superset_group,p.superset_order,p.unilateral
    from split_plan p
    join public.exercises e on lower(e.name)=lower(p.exercise)
      and e.owner_id is null and not e.is_archived
    where p.workout=d.name
    order by p.position;
  end loop;
end $$;

-- Hide obsolete public starter plans. Historical sessions and user copies
-- remain intact.
update public.templates
set is_superseded=true
where user_id is null and is_starter
  and name not in ('Upper A','Lower A','Upper B','Lower B + Weak Points');

-- Add the new split to existing active users as personal templates, matching
-- the app's earlier starter-split rollout. Existing same-named templates win.
do $$
declare
  u record;
  source_row record;
  new_tid uuid;
  next_pos integer;
begin
  for u in select distinct user_id from public.sessions loop
    select coalesce(max(position),-1)+1 into next_pos
    from public.templates where user_id=u.user_id;

    for source_row in
      select * from public.templates
      where user_id is null and is_starter and name in
        ('Upper A','Lower A','Upper B','Lower B + Weak Points')
      order by position
    loop
      if exists (
        select 1 from public.templates
        where user_id=u.user_id and name=source_row.name and not is_archived
      ) then
        continue;
      end if;

      insert into public.templates (user_id,name,emoji,color,position,source_template_id)
      values (u.user_id,source_row.name,source_row.emoji,source_row.color,next_pos,source_row.id)
      returning id into new_tid;
      next_pos := next_pos+1;

      insert into public.template_exercises (
        template_id,exercise_id,position,target_sets,rep_range_low,rep_range_high,
        rest_seconds,amrap_last_set,notes,superset_group,superset_order,unilateral
      )
      select new_tid,exercise_id,position,target_sets,rep_range_low,rep_range_high,
        rest_seconds,amrap_last_set,notes,superset_group,superset_order,unilateral
      from public.template_exercises where template_id=source_row.id
      order by position;
    end loop;
  end loop;
end $$;

commit;
