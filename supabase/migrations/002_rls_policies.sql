-- ============================================================
-- 002_rls_policies.sql  —  Row Level Security
-- ============================================================

-- Włącz RLS na wszystkich tabelach
alter table profiles            enable row level security;
alter table groups              enable row level security;
alter table group_members       enable row level security;
alter table teams               enable row level security;
alter table matches             enable row level security;
alter table match_results       enable row level security;
alter table predictions         enable row level security;
alter table prediction_scores   enable row level security;
alter table bonus_predictions   enable row level security;
alter table bonus_scores        enable row level security;
alter table players_catalog     enable row level security;
alter table match_events        enable row level security;
alter table team_tournament_stats   enable row level security;
alter table player_tournament_stats enable row level security;
alter table sync_logs           enable row level security;

-- ─── Helper: czy zalogowany user należy do grupy? ────────────────────────────
create or replace function is_group_member(p_group_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from group_members
    where group_id = p_group_id
      and user_id = auth.uid()
  );
$$;

create or replace function get_member_role(p_group_id uuid)
returns member_role language sql stable security definer as $$
  select role from group_members
  where group_id = p_group_id
    and user_id = auth.uid()
  limit 1;
$$;

create or replace function is_group_admin(p_group_id uuid)
returns boolean language sql stable security definer as $$
  select get_member_role(p_group_id) in ('admin', 'owner');
$$;

-- ─── profiles ────────────────────────────────────────────────────────────────
create policy "Każdy widzi własny profil"
  on profiles for select
  using (id = auth.uid());

create policy "Wszyscy mogą czytać profile w swoich grupach"
  on profiles for select
  using (
    exists (
      select 1 from group_members gm1
      join group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid()
        and gm2.user_id = profiles.id
    )
  );

create policy "Użytkownik może wstawiać własny profil"
  on profiles for insert
  with check (id = auth.uid());

create policy "Użytkownik może aktualizować własny profil"
  on profiles for update
  using (id = auth.uid());

-- ─── groups ──────────────────────────────────────────────────────────────────
create policy "Gracz widzi grupy do których należy"
  on groups for select
  using (is_group_member(id));

create policy "Owner może aktualizować grupę"
  on groups for update
  using (owner_id = auth.uid());

-- ─── group_members ───────────────────────────────────────────────────────────
create policy "Gracz widzi członków swoich grup"
  on group_members for select
  using (is_group_member(group_id));

create policy "Admin może zarządzać członkami"
  on group_members for all
  using (is_group_admin(group_id))
  with check (is_group_admin(group_id));

-- ─── teams (dane publiczne) ───────────────────────────────────────────────────
create policy "Wszyscy czytają drużyny"
  on teams for select
  using (true);

-- ─── matches (dane publiczne) ─────────────────────────────────────────────────
create policy "Wszyscy czytają mecze"
  on matches for select
  using (true);

create policy "Admin może edytować status meczu"
  on matches for update
  using (
    exists (
      select 1 from group_members
      where user_id = auth.uid()
        and role in ('admin', 'owner')
    )
  );

-- ─── match_results ───────────────────────────────────────────────────────────
create policy "Wszyscy czytają wyniki"
  on match_results for select
  using (true);

create policy "Admin może wpisywać wyniki"
  on match_results for insert
  with check (
    exists (
      select 1 from group_members
      where user_id = auth.uid()
        and role in ('admin', 'owner')
    )
  );

create policy "Admin może edytować wyniki"
  on match_results for update
  using (
    exists (
      select 1 from group_members
      where user_id = auth.uid()
        and role in ('admin', 'owner')
    )
  );

-- ─── predictions ─────────────────────────────────────────────────────────────
-- Gracz może czytać własne typy zawsze
create policy "Gracz czyta własne typy"
  on predictions for select
  using (user_id = auth.uid() and is_group_member(group_id));

-- Typy innych graczy widoczne TYLKO po kickoffie (czas serwera)
create policy "Typy innych widoczne po kickoffie"
  on predictions for select
  using (
    user_id != auth.uid()
    and is_group_member(group_id)
    and exists (
      select 1 from matches m
      where m.id = predictions.match_id
        and now() >= m.kickoff_at
    )
  );

-- Gracz może dodać typ TYLKO przed kickoffem
create policy "Gracz może dodawać typy przed kickoffem"
  on predictions for insert
  with check (
    user_id = auth.uid()
    and is_group_member(group_id)
    and exists (
      select 1 from matches m
      where m.id = match_id
        and now() < m.kickoff_at
    )
  );

-- Gracz może edytować typ TYLKO przed kickoffem
create policy "Gracz może edytować typy przed kickoffem"
  on predictions for update
  using (
    user_id = auth.uid()
    and is_group_member(group_id)
  )
  with check (
    exists (
      select 1 from matches m
      where m.id = match_id
        and now() < m.kickoff_at
    )
  );

-- ─── prediction_scores ───────────────────────────────────────────────────────
create policy "Gracz widzi punkty w swoich grupach"
  on prediction_scores for select
  using (is_group_member(group_id));

create policy "Brak bezpośredniego wstawiania punktów z klienta"
  on prediction_scores for insert
  with check (false);

create policy "Brak bezpośredniej aktualizacji punktów z klienta"
  on prediction_scores for update
  using (false)
  with check (false);

-- ─── bonus_predictions ───────────────────────────────────────────────────────
-- Własne bonusy widoczne zawsze
create policy "Gracz czyta własne bonusy"
  on bonus_predictions for select
  using (user_id = auth.uid() and is_group_member(group_id));

-- Bonusy innych widoczne TYLKO po deadline grupy
create policy "Bonusy innych widoczne po deadline"
  on bonus_predictions for select
  using (
    user_id != auth.uid()
    and is_group_member(group_id)
    and exists (
      select 1 from groups g
      where g.id = bonus_predictions.group_id
        and now() >= g.bonus_deadline
    )
  );

-- Gracz może dodawać/edytować bonusy TYLKO przed deadline
create policy "Gracz może dodawać bonusy przed deadline"
  on bonus_predictions for insert
  with check (
    user_id = auth.uid()
    and is_group_member(group_id)
    and exists (
      select 1 from groups g
      where g.id = group_id
        and now() < g.bonus_deadline
    )
  );

create policy "Gracz może edytować bonusy przed deadline"
  on bonus_predictions for update
  using (user_id = auth.uid() and is_group_member(group_id))
  with check (
    exists (
      select 1 from groups g
      where g.id = group_id
        and now() < g.bonus_deadline
    )
  );

-- ─── bonus_scores ────────────────────────────────────────────────────────────
create policy "Gracz widzi bonus_scores swojej grupy"
  on bonus_scores for select
  using (is_group_member(group_id));

create policy "Brak bezpośredniego zarządzania bonus_scores z klienta"
  on bonus_scores for all
  using (false)
  with check (false);

-- ─── players_catalog (publiczne) ─────────────────────────────────────────────
create policy "Wszyscy czytają katalog zawodników"
  on players_catalog for select
  using (true);

-- ─── match_events ────────────────────────────────────────────────────────────
create policy "Gracz czyta zdarzenia meczowe"
  on match_events for select
  using (true);

create policy "Admin może zarządzać zdarzeniami meczowymi"
  on match_events for all
  using (
    exists (
      select 1 from group_members
      where user_id = auth.uid()
        and role in ('admin', 'owner')
    )
  )
  with check (
    exists (
      select 1 from group_members
      where user_id = auth.uid()
        and role in ('admin', 'owner')
    )
  );

-- ─── team_tournament_stats ───────────────────────────────────────────────────
create policy "Gracz widzi statystyki drużyn w swojej grupie"
  on team_tournament_stats for select
  using (is_group_member(group_id));

create policy "Admin może edytować statystyki drużyn"
  on team_tournament_stats for all
  using (is_group_admin(group_id))
  with check (is_group_admin(group_id));

-- ─── player_tournament_stats ─────────────────────────────────────────────────
create policy "Gracz widzi statystyki zawodników w swojej grupie"
  on player_tournament_stats for select
  using (is_group_member(group_id));

create policy "Admin może edytować statystyki zawodników"
  on player_tournament_stats for all
  using (is_group_admin(group_id))
  with check (is_group_admin(group_id));

-- ─── sync_logs ───────────────────────────────────────────────────────────────
create policy "Admin widzi logi synchronizacji"
  on sync_logs for select
  using (
    exists (
      select 1 from group_members
      where user_id = auth.uid()
        and role in ('admin', 'owner')
    )
  );
