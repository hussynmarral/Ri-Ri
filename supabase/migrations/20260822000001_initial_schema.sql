-- ============================================================
-- Ri Ri -- Initial Schema
-- ============================================================

-- profiles
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone     text not null default 'Asia/Karachi',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- user_settings
create table public.user_settings (
  id                              uuid primary key default gen_random_uuid(),
  user_id                         uuid not null unique references public.profiles(id) on delete cascade,
  water_target_ml                 integer not null default 3000,
  wake_hour                       smallint not null default 12,
  wake_minute                     smallint not null default 0,
  sleep_hour                      smallint not null default 5,
  sleep_minute                    smallint not null default 0,
  enabled_markets                 text[] not null default array['nyc','chi','lax','lon','ist'],
  water_reminder_times            text[] not null default array['13:00','15:00','17:00','19:00','21:00','23:00','01:00','03:00'],
  water_reminder_amount_ml        integer not null default 375,
  water_followup_interval_minutes integer not null default 30,
  theme                           text not null default 'system' check (theme in ('system','light','dark')),
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

-- devices
create table public.devices (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references public.profiles(id) on delete cascade,
  platform                text not null check (platform in ('ios','android','web')),
  push_token              text,
  device_name             text,
  is_notification_primary boolean not null default false,
  last_active_at          timestamptz not null default now(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- routine_templates: recurring blueprint for daily blocks
create table public.routine_templates (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  category         text not null,
  title            text not null,
  start_hour       smallint not null,
  start_minute     smallint not null,
  duration_minutes integer not null,
  days_of_week     smallint[] not null default array[1,2,3,4,5,6,7],
  is_active        boolean not null default true,
  is_flex_window   boolean not null default false,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- schedule_overrides: temporary single-day changes
create table public.schedule_overrides (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  template_id       uuid references public.routine_templates(id) on delete set null,
  override_date     date not null,
  is_cancelled      boolean not null default false,
  replacement_start timestamptz,
  replacement_end   timestamptz,
  replacement_title text,
  reason            text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- schedule_instances: daily expanded instances
create table public.schedule_instances (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  template_id        uuid references public.routine_templates(id) on delete set null,
  override_id        uuid references public.schedule_overrides(id) on delete set null,
  instance_date      date not null,
  category           text not null,
  title              text not null,
  scheduled_start    timestamptz not null,
  scheduled_end      timestamptz not null,
  actual_start       timestamptz,
  actual_end         timestamptz,
  status             text not null default 'pending'
                       check (status in ('pending','in_progress','completed','skipped','partial')),
  is_flex_window     boolean not null default false,
  lateness_minutes   integer not null default 0,
  completion_percent smallint not null default 0,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- water_logs
create table public.water_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  logged_at  timestamptz not null default now(),
  amount_ml  integer not null check (amount_ml > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- habit_logs
create table public.habit_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  habit_key     text not null,
  log_date      date not null,
  completed     boolean not null default false,
  value_numeric numeric,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, habit_key, log_date)
);

-- workout_sessions
create table public.workout_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  session_date     date not null,
  gym_day          smallint not null check (gym_day between 1 and 7),
  label            text not null,
  started_at       timestamptz,
  completed_at     timestamptz,
  duration_minutes integer,
  completed        boolean not null default false,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- daily_stats
create table public.daily_stats (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  stat_date            date not null,
  total_scheduled      integer not null default 0,
  total_completed      integer not null default 0,
  total_skipped        integer not null default 0,
  total_late           integer not null default 0,
  avg_lateness_minutes numeric not null default 0,
  water_ml             integer not null default 0,
  water_target_ml      integer not null default 3000,
  reading_completed    boolean not null default false,
  english_completed    boolean not null default false,
  turkish_completed    boolean not null default false,
  workout_completed    boolean not null default false,
  discipline_score     numeric not null default 0 check (discipline_score between 0 and 100),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id, stat_date)
);

-- weekly_stats
create table public.weekly_stats (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  week_start        date not null,
  completion_rate   numeric not null default 0,
  adherence_rate    numeric not null default 0,
  consistency_score numeric not null default 0,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, week_start)
);

-- ai_interactions
create table public.ai_interactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  user_message     text not null,
  ai_response      text not null,
  proposed_actions jsonb not null default '[]'::jsonb,
  confirmed_at     timestamptz,
  rejected_at      timestamptz,
  created_at       timestamptz not null default now()
);

-- notification_logs
create table public.notification_logs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  device_id         uuid references public.devices(id) on delete set null,
  notification_type text not null,
  reference_id      uuid,
  sent_at           timestamptz not null default now(),
  acknowledged_at   timestamptz,
  created_at        timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================

create index idx_schedule_instances_user_date  on public.schedule_instances(user_id, instance_date);
create index idx_schedule_instances_status      on public.schedule_instances(user_id, status);
create index idx_water_logs_user_logged         on public.water_logs(user_id, logged_at);
create index idx_habit_logs_user_date           on public.habit_logs(user_id, log_date);
create index idx_workout_sessions_user_date     on public.workout_sessions(user_id, session_date);
create index idx_daily_stats_user_date          on public.daily_stats(user_id, stat_date);
create index idx_weekly_stats_user_week         on public.weekly_stats(user_id, week_start);
create index idx_ai_interactions_user           on public.ai_interactions(user_id, created_at desc);
create index idx_notification_logs_user         on public.notification_logs(user_id, sent_at desc);
create index idx_routine_templates_user_active  on public.routine_templates(user_id, is_active);
create index idx_devices_user                   on public.devices(user_id);
create index idx_schedule_overrides_user_date   on public.schedule_overrides(user_id, override_date);

-- ============================================================
-- updated_at triggers
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','user_settings','devices','routine_templates',
    'schedule_overrides','schedule_instances','water_logs',
    'habit_logs','workout_sessions','daily_stats','weekly_stats'
  ] loop
    execute format(
      'create trigger trg_%s_updated_at before update on public.%s
       for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- ============================================================
-- Auto-create profile + settings on sign-up
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');

  insert into public.user_settings (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles           enable row level security;
alter table public.user_settings      enable row level security;
alter table public.devices            enable row level security;
alter table public.routine_templates  enable row level security;
alter table public.schedule_overrides enable row level security;
alter table public.schedule_instances enable row level security;
alter table public.water_logs         enable row level security;
alter table public.habit_logs         enable row level security;
alter table public.workout_sessions   enable row level security;
alter table public.daily_stats        enable row level security;
alter table public.weekly_stats       enable row level security;
alter table public.ai_interactions    enable row level security;
alter table public.notification_logs  enable row level security;

create policy "profiles: own row" on public.profiles
  for all using (id = auth.uid());

do $$
declare
  t text;
begin
  foreach t in array array[
    'user_settings','devices','routine_templates','schedule_overrides',
    'schedule_instances','water_logs','habit_logs','workout_sessions',
    'daily_stats','weekly_stats','ai_interactions','notification_logs'
  ] loop
    execute format(
      'create policy "%s: own data" on public.%s for all using (user_id = auth.uid())',
      t, t
    );
  end loop;
end;
$$;
