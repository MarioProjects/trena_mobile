-- Extend allowed workout tag keys (additional batch).
-- Run after 0003_workout_tags_extend_allowed.sql.

alter table public.workout_templates drop constraint if exists workout_templates_tags_allowed;
alter table public.workout_templates
add constraint workout_templates_tags_allowed
check (
  tags <@ array[
    'snow','hourglass','pin','pizza','rollerskate','apple','backpack','mountain','bug','rain','car','video',
    'battery','muscle','leaf','ball',
    'drop','fire','shoe','happy','neutral','sad','dumbbell','star'
  ]::text[]
);

alter table public.workout_sessions drop constraint if exists workout_sessions_tags_allowed;
alter table public.workout_sessions
add constraint workout_sessions_tags_allowed
check (
  tags <@ array[
    'snow','hourglass','pin','pizza','rollerskate','apple','backpack','mountain','bug','rain','car','video',
    'battery','muscle','leaf','ball',
    'drop','fire','shoe','happy','neutral','sad','dumbbell','star'
  ]::text[]
);

