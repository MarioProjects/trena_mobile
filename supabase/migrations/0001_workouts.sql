-- Workouts + method instances (Bilbo + 5/3/1) MVP schema
-- Run in Supabase Dashboard → SQL editor.

create extension if not exists pgcrypto;

-- Shared helper for updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1) Method Instances
create table if not exists public.method_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  method_key text not null check (method_key in ('bilbo', 'wendler_531')),
  scope text not null check (scope in ('exercise', 'group')),
  name text not null,
  config jsonb not null default '{}'::jsonb,
  state jsonb not null default '{}'::jsonb,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists method_instances_user_id_idx on public.method_instances(user_id);
create index if not exists method_instances_created_at_idx on public.method_instances(created_at);

drop trigger if exists set_method_instances_updated_at on public.method_instances;
create trigger set_method_instances_updated_at
before update on public.method_instances
for each row execute function public.set_updated_at();

alter table public.method_instances enable row level security;

drop policy if exists method_instances_select_own on public.method_instances;
create policy method_instances_select_own
on public.method_instances
for select
using (auth.uid() = user_id);

drop policy if exists method_instances_insert_own on public.method_instances;
create policy method_instances_insert_own
on public.method_instances
for insert
with check (auth.uid() = user_id);

drop policy if exists method_instances_update_own on public.method_instances;
create policy method_instances_update_own
on public.method_instances
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists method_instances_delete_own on public.method_instances;
create policy method_instances_delete_own
on public.method_instances
for delete
using (auth.uid() = user_id);

-- 2) Workout Templates
create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workout_templates_user_id_idx on public.workout_templates(user_id);
create index if not exists workout_templates_created_at_idx on public.workout_templates(created_at);

drop trigger if exists set_workout_templates_updated_at on public.workout_templates;
create trigger set_workout_templates_updated_at
before update on public.workout_templates
for each row execute function public.set_updated_at();

alter table public.workout_templates enable row level security;

drop policy if exists workout_templates_select_own on public.workout_templates;
create policy workout_templates_select_own
on public.workout_templates
for select
using (auth.uid() = user_id);

drop policy if exists workout_templates_insert_own on public.workout_templates;
create policy workout_templates_insert_own
on public.workout_templates
for insert
with check (auth.uid() = user_id);

drop policy if exists workout_templates_update_own on public.workout_templates;
create policy workout_templates_update_own
on public.workout_templates
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists workout_templates_delete_own on public.workout_templates;
create policy workout_templates_delete_own
on public.workout_templates
for delete
using (auth.uid() = user_id);

-- 3) Workout Sessions
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid null references public.workout_templates(id) on delete set null,
  title text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workout_sessions_user_id_idx on public.workout_sessions(user_id);
create index if not exists workout_sessions_started_at_idx on public.workout_sessions(started_at);

drop trigger if exists set_workout_sessions_updated_at on public.workout_sessions;
create trigger set_workout_sessions_updated_at
before update on public.workout_sessions
for each row execute function public.set_updated_at();

alter table public.workout_sessions enable row level security;

drop policy if exists workout_sessions_select_own on public.workout_sessions;
create policy workout_sessions_select_own
on public.workout_sessions
for select
using (auth.uid() = user_id);

drop policy if exists workout_sessions_insert_own on public.workout_sessions;
create policy workout_sessions_insert_own
on public.workout_sessions
for insert
with check (auth.uid() = user_id);

drop policy if exists workout_sessions_update_own on public.workout_sessions;
create policy workout_sessions_update_own
on public.workout_sessions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists workout_sessions_delete_own on public.workout_sessions;
create policy workout_sessions_delete_own
on public.workout_sessions
for delete
using (auth.uid() = user_id);
