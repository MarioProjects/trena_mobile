-- Add explicit status for workout sessions (backwards-compatible).

alter table public.workout_sessions
add column if not exists status text null;

alter table public.workout_sessions drop constraint if exists workout_sessions_status_allowed;
alter table public.workout_sessions
add constraint workout_sessions_status_allowed
check (status is null or status in ('pending', 'in_progress', 'done', 'cancelled'));

-- Backfill for existing rows (best-effort; keeps nulls untouched if already set).
update public.workout_sessions
set status = 'done'
where status is null
  and ended_at is not null;

update public.workout_sessions
set status = 'pending'
where status is null
  and ended_at is null
  and started_at > now();

