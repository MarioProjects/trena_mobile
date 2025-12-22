-- Add icon-only tags for workouts/templates (max 3).

alter table public.workout_templates
add column if not exists tags text[] not null default '{}'::text[];

alter table public.workout_sessions
add column if not exists tags text[] not null default '{}'::text[];

-- Enforce max 3 + allowed tag keys.
alter table public.workout_templates drop constraint if exists workout_templates_tags_max3;
alter table public.workout_templates
add constraint workout_templates_tags_max3
check (coalesce(array_length(tags, 1), 0) <= 3);

alter table public.workout_templates drop constraint if exists workout_templates_tags_allowed;
alter table public.workout_templates
add constraint workout_templates_tags_allowed
check (tags <@ array['drop','fire','shoe','happy','neutral','sad','dumbbell','star']::text[]);

alter table public.workout_sessions drop constraint if exists workout_sessions_tags_max3;
alter table public.workout_sessions
add constraint workout_sessions_tags_max3
check (coalesce(array_length(tags, 1), 0) <= 3);

alter table public.workout_sessions drop constraint if exists workout_sessions_tags_allowed;
alter table public.workout_sessions
add constraint workout_sessions_tags_allowed
check (tags <@ array['drop','fire','shoe','happy','neutral','sad','dumbbell','star']::text[]);

