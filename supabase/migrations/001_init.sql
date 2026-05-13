-- ============================================================
-- 001_init.sql  —  Schemat bazy Mundial Typer
-- ============================================================

-- Rozszerzenia
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ─── profiles ────────────────────────────────────────────────────────────────
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nickname   text not null,
  created_at timestamptz not null default now()
);

comment on table profiles is 'Publiczny profil gracza — zawiera tylko nick, bez e-mail.';

-- ─── groups ──────────────────────────────────────────────────────────────────
create table groups (
  id             uuid primary key default uuid_generate_v4(),
  name           text not null,
  slug           text not null unique,
  invite_code    text not null,
  owner_id       uuid not null references profiles(id),
  bonus_deadline timestamptz not null default '2026-06-11T17:00:00Z',
  settings       jsonb not null default '{}',
  created_at     timestamptz not null default now()
);

create index on groups (slug);
comment on table groups is 'Grupy typujących. Każda grupa ma unikalny slug i kod zaproszenia.';

-- ─── group_members ───────────────────────────────────────────────────────────
create type member_role as enum ('player', 'admin', 'owner');

create table group_members (
  id        uuid primary key default uuid_generate_v4(),
  group_id  uuid not null references groups(id) on delete cascade,
  user_id   uuid not null references profiles(id) on delete cascade,
  role      member_role not null default 'player',
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create index on group_members (group_id);
create index on group_members (user_id);

-- ─── teams ───────────────────────────────────────────────────────────────────
create table teams (
  id          serial primary key,
  name        text not null unique,
  flag_emoji  text not null default '🏳️',
  group_code  text,
  federation  text
);

-- ─── matches ─────────────────────────────────────────────────────────────────
create type match_status as enum ('scheduled', 'live', 'finished', 'postponed');

create table matches (
  id                     integer primary key,
  stage                  text not null,
  phase                  text not null,
  group_code             text,
  home_team_placeholder  text not null,
  away_team_placeholder  text not null,
  home_team_id           integer references teams(id),
  away_team_id           integer references teams(id),
  venue                  text not null,
  kickoff_at             timestamptz not null,
  status                 match_status not null default 'scheduled',
  round_number           integer
);

create index on matches (kickoff_at);
create index on matches (status);
create index on matches (phase);

-- ─── match_results ───────────────────────────────────────────────────────────
create type match_resolution as enum ('90min', 'AET', 'PEN');

create table match_results (
  id              uuid primary key default uuid_generate_v4(),
  match_id        integer not null references matches(id) on delete cascade unique,
  home_goals_90   integer not null check (home_goals_90 >= 0),
  away_goals_90   integer not null check (away_goals_90 >= 0),
  home_goals_aet  integer check (home_goals_aet >= 0),
  away_goals_aet  integer check (away_goals_aet >= 0),
  home_goals_pen  integer check (home_goals_pen >= 0),
  away_goals_pen  integer check (away_goals_pen >= 0),
  outcome         text not null check (outcome in ('1', 'X', '2')),
  winner_team_id  integer references teams(id),
  resolution      match_resolution,
  is_confirmed    boolean not null default false,
  entered_by      uuid not null references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index on match_results (match_id);

-- ─── predictions ─────────────────────────────────────────────────────────────
create table predictions (
  id                    uuid primary key default uuid_generate_v4(),
  group_id              uuid not null references groups(id) on delete cascade,
  user_id               uuid not null references profiles(id) on delete cascade,
  match_id              integer not null references matches(id) on delete cascade,
  home_goals            integer not null check (home_goals >= 0),
  away_goals            integer not null check (away_goals >= 0),
  advance_team_id       integer references teams(id),
  resolution_prediction match_resolution,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (group_id, user_id, match_id)
);

create index on predictions (group_id, match_id);
create index on predictions (user_id);
create index on predictions (match_id);

-- ─── prediction_scores ───────────────────────────────────────────────────────
create table prediction_scores (
  id              uuid primary key default uuid_generate_v4(),
  prediction_id   uuid not null references predictions(id) on delete cascade unique,
  group_id        uuid not null references groups(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  match_id        integer not null references matches(id) on delete cascade,
  score_breakdown jsonb not null default '{}',
  total_points    integer not null default 0,
  calculated_at   timestamptz not null default now()
);

create index on prediction_scores (group_id, user_id);
create index on prediction_scores (match_id);

-- ─── bonus_predictions ───────────────────────────────────────────────────────
create table bonus_predictions (
  id         uuid primary key default uuid_generate_v4(),
  group_id   uuid not null references groups(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  bonus_type text not null,
  value      jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, user_id, bonus_type)
);

create index on bonus_predictions (group_id);
create index on bonus_predictions (user_id);

-- ─── bonus_scores ────────────────────────────────────────────────────────────
create table bonus_scores (
  id                  uuid primary key default uuid_generate_v4(),
  bonus_prediction_id uuid not null references bonus_predictions(id) on delete cascade unique,
  group_id            uuid not null references groups(id) on delete cascade,
  user_id             uuid not null references profiles(id) on delete cascade,
  bonus_type          text not null,
  points              integer not null default 0,
  notes               text,
  calculated_at       timestamptz not null default now()
);

create index on bonus_scores (group_id, user_id);

-- ─── players_catalog ─────────────────────────────────────────────────────────
create table players_catalog (
  id       serial primary key,
  name     text not null,
  team_id  integer not null references teams(id),
  position text not null check (position in ('GK', 'DF', 'MF', 'FW'))
);

-- ─── match_events ────────────────────────────────────────────────────────────
create table match_events (
  id           uuid primary key default uuid_generate_v4(),
  match_id     integer not null references matches(id) on delete cascade,
  team_id      integer references teams(id),
  player_id    integer references players_catalog(id),
  event_type   text not null check (event_type in ('goal', 'assist', 'yellow_card', 'red_card', 'penalty_goal', 'penalty_miss', 'own_goal')),
  minute       integer check (minute >= 0),
  extra_minute integer check (extra_minute >= 0),
  payload      jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

create index on match_events (match_id);
create index on match_events (team_id);
create index on match_events (player_id);

-- ─── team_tournament_stats ───────────────────────────────────────────────────
create table team_tournament_stats (
  id              uuid primary key default uuid_generate_v4(),
  group_id        uuid not null references groups(id) on delete cascade,
  team_id         integer not null references teams(id),
  goals_scored    integer not null default 0,
  goals_conceded  integer not null default 0,
  matches_played  integer not null default 0,
  wins            integer not null default 0,
  draws           integer not null default 0,
  losses          integer not null default 0,
  updated_at      timestamptz not null default now(),
  unique (group_id, team_id)
);

-- ─── player_tournament_stats ─────────────────────────────────────────────────
create table player_tournament_stats (
  id           uuid primary key default uuid_generate_v4(),
  group_id     uuid not null references groups(id) on delete cascade,
  player_id    integer not null references players_catalog(id),
  goals        integer not null default 0,
  assists      integer not null default 0,
  yellow_cards integer not null default 0,
  red_cards    integer not null default 0,
  updated_at   timestamptz not null default now(),
  unique (group_id, player_id)
);

-- ─── sync_logs ───────────────────────────────────────────────────────────────
create table sync_logs (
  id         uuid primary key default uuid_generate_v4(),
  source     text not null default 'manual',
  match_id   integer references matches(id),
  status     text not null check (status in ('success', 'error', 'info')),
  message    text,
  created_at timestamptz not null default now()
);

-- ─── Trigger: updated_at ─────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_predictions_updated_at
  before update on predictions
  for each row execute function update_updated_at();

create trigger trg_bonus_predictions_updated_at
  before update on bonus_predictions
  for each row execute function update_updated_at();

create trigger trg_match_results_updated_at
  before update on match_results
  for each row execute function update_updated_at();
