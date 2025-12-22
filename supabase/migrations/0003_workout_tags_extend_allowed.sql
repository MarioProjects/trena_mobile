-- Extend allowed workout tag keys (keeps max-3 constraint intact).
-- Run after 0002_workout_tags.sql.

alter table public.workout_templates drop constraint if exists workout_templates_tags_allowed;
alter table public.workout_templates
add constraint workout_templates_tags_allowed
check (
  tags <@ array[
    'battery','muscle','leaf','ball',
    'drop','fire','shoe','happy','neutral','sad','dumbbell','star'
  ]::text[]
);

alter table public.workout_sessions drop constraint if exists workout_sessions_tags_allowed;
alter table public.workout_sessions
add constraint workout_sessions_tags_allowed
check (
  tags <@ array[
    'battery','muscle','leaf','ball',
    'drop','fire','shoe','happy','neutral','sad','dumbbell','star'
  ]::text[]
);

