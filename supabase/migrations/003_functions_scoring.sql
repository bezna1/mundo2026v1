-- ============================================================
-- 003_functions_scoring.sql  —  Funkcje RPC + Scoring
-- ============================================================

-- ─── Invite preview ──────────────────────────────────────────────────────────
create or replace function get_invite_group(
  p_group_slug text,
  p_invite_code text
)
returns table (
  id uuid,
  name text,
  slug text,
  bonus_deadline timestamptz
) language sql stable security definer as $$
  select g.id, g.name, g.slug, g.bonus_deadline
  from groups g
  where g.slug = p_group_slug
    and g.invite_code = p_invite_code
  limit 1;
$$;

-- ─── join_group_with_invite ──────────────────────────────────────────────────
drop function if exists join_group_with_invite(text, text, uuid);

create or replace function join_group_with_invite(
  p_group_slug text,
  p_invite_code text,
  p_nickname text
)
returns jsonb language plpgsql security definer as $$
declare
  v_group groups%rowtype;
  v_existing group_members%rowtype;
  v_user_id uuid := auth.uid();
  v_nickname text := trim(p_nickname);
begin
  if v_user_id is null then
    return jsonb_build_object('error', 'Nie jesteś zalogowany.');
  end if;

  if length(v_nickname) < 2 or length(v_nickname) > 20 then
    return jsonb_build_object('error', 'Nick musi mieć od 2 do 20 znaków.');
  end if;

  -- Znajdź grupę
  select * into v_group from groups where slug = p_group_slug;
  if not found then
    return jsonb_build_object('error', 'Nie znaleziono grupy o podanym slug.');
  end if;

  -- Sprawdź kod zaproszenia
  if v_group.invite_code != p_invite_code then
    return jsonb_build_object('error', 'Nieprawidłowy kod zaproszenia.');
  end if;

  -- Sprawdź czy już należy
  select * into v_existing
  from group_members
  where group_id = v_group.id and user_id = v_user_id;

  if found then
    return jsonb_build_object('ok', true, 'already_member', true, 'group_id', v_group.id);
  end if;

  if exists (
    select 1
    from profiles p
    join group_members gm on gm.user_id = p.id
    where gm.group_id = v_group.id
      and lower(p.nickname) = lower(v_nickname)
      and p.id <> v_user_id
  ) then
    return jsonb_build_object('error', 'Ten nick jest już zajęty w tej grupie.');
  end if;

  insert into profiles (id, nickname)
  values (v_user_id, v_nickname)
  on conflict (id) do update set nickname = excluded.nickname;

  -- Dodaj do grupy
  insert into group_members (group_id, user_id, role)
  values (v_group.id, v_user_id, 'player');

  return jsonb_build_object('ok', true, 'group_id', v_group.id);
end;
$$;

-- ─── can_predict ─────────────────────────────────────────────────────────────
create or replace function can_predict(p_match_id integer)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from matches
    where id = p_match_id
      and now() < kickoff_at
      and status = 'scheduled'
  );
$$;

-- ─── save_prediction ─────────────────────────────────────────────────────────
create or replace function save_prediction(
  p_group_id uuid,
  p_match_id integer,
  p_home_goals integer,
  p_away_goals integer,
  p_advance_team_id integer default null,
  p_resolution_prediction text default null
)
returns jsonb language plpgsql security definer as $$
declare
  v_user_id uuid := auth.uid();
  v_kickoff timestamptz;
begin
  if v_user_id is null then
    return jsonb_build_object('error', 'Nie jesteś zalogowany.');
  end if;

  if not exists (
    select 1 from group_members
    where group_id = p_group_id and user_id = v_user_id
  ) then
    return jsonb_build_object('error', 'Nie należysz do tej grupy.');
  end if;

  if p_home_goals < 0 or p_away_goals < 0 then
    return jsonb_build_object('error', 'Wynik nie może być ujemny.');
  end if;

  -- Sprawdź blokadę na podstawie czasu serwera
  select kickoff_at into v_kickoff from matches where id = p_match_id;
  if v_kickoff is null then
    return jsonb_build_object('error', 'Nie znaleziono meczu.');
  end if;

  if now() >= v_kickoff then
    return jsonb_build_object('error', 'Mecz już się rozpoczął — typowanie zablokowane.');
  end if;

  -- Wstaw lub zaktualizuj typ
  insert into predictions (
    group_id, user_id, match_id,
    home_goals, away_goals,
    advance_team_id, resolution_prediction
  )
  values (
    p_group_id, v_user_id, p_match_id,
    p_home_goals, p_away_goals,
    p_advance_team_id,
    p_resolution_prediction::match_resolution
  )
  on conflict (group_id, user_id, match_id)
  do update set
    home_goals = excluded.home_goals,
    away_goals = excluded.away_goals,
    advance_team_id = excluded.advance_team_id,
    resolution_prediction = excluded.resolution_prediction,
    updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

-- ─── save_bonus_prediction ───────────────────────────────────────────────────
create or replace function save_bonus_prediction(
  p_group_id uuid,
  p_bonus_type text,
  p_value jsonb
)
returns jsonb language plpgsql security definer as $$
declare
  v_user_id uuid := auth.uid();
  v_deadline timestamptz;
begin
  if v_user_id is null then
    return jsonb_build_object('error', 'Nie jesteś zalogowany.');
  end if;

  if not exists (
    select 1 from group_members
    where group_id = p_group_id and user_id = v_user_id
  ) then
    return jsonb_build_object('error', 'Nie należysz do tej grupy.');
  end if;

  select bonus_deadline into v_deadline from groups where id = p_group_id;
  if v_deadline is null then
    return jsonb_build_object('error', 'Nie znaleziono grupy.');
  end if;

  if now() >= v_deadline then
    return jsonb_build_object('error', 'Deadline bonusów minął.');
  end if;

  insert into bonus_predictions (group_id, user_id, bonus_type, value)
  values (p_group_id, v_user_id, p_bonus_type, p_value)
  on conflict (group_id, user_id, bonus_type)
  do update set value = excluded.value, updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

-- ─── recalculate_match_scores ────────────────────────────────────────────────
create or replace function recalculate_match_scores(p_match_id integer)
returns integer language plpgsql security definer as $$
declare
  v_result match_results%rowtype;
  v_match  matches%rowtype;
  v_pred   predictions%rowtype;
  v_is_knockout boolean;
  v_pred_outcome text;
  v_res_outcome  text;
  v_pred_diff    integer;
  v_res_diff     integer;
  v_exact        boolean;
  v_outcome_ok   boolean;
  v_diff_ok      boolean;
  v_advance_ok   boolean;
  v_resolution_ok boolean;
  v_points       integer;
  v_breakdown    jsonb;
  v_count        integer := 0;
begin
  if not exists (
    select 1 from group_members
    where user_id = auth.uid()
      and role in ('admin', 'owner')
  ) then
    raise exception 'Brak uprawnień admina.';
  end if;

  select * into v_result from match_results where match_id = p_match_id;
  if not found then return 0; end if;

  select * into v_match from matches where id = p_match_id;

  v_is_knockout := v_match.phase not in ('Grupa');

  for v_pred in
    select * from predictions where match_id = p_match_id
  loop
    -- Oblicz wynik po 90 min
    if v_result.home_goals_90 > v_result.away_goals_90 then v_res_outcome := '1';
    elsif v_result.home_goals_90 < v_result.away_goals_90 then v_res_outcome := '2';
    else v_res_outcome := 'X'; end if;

    if v_pred.home_goals > v_pred.away_goals then v_pred_outcome := '1';
    elsif v_pred.home_goals < v_pred.away_goals then v_pred_outcome := '2';
    else v_pred_outcome := 'X'; end if;

    v_exact := (v_pred.home_goals = v_result.home_goals_90 and v_pred.away_goals = v_result.away_goals_90);
    v_outcome_ok := (v_pred_outcome = v_res_outcome);
    v_res_diff := v_result.home_goals_90 - v_result.away_goals_90;
    v_pred_diff := v_pred.home_goals - v_pred.away_goals;
    v_diff_ok := (v_pred_diff = v_res_diff);
    v_advance_ok := (v_pred.advance_team_id is not null and v_pred.advance_team_id = v_result.winner_team_id);
    v_resolution_ok := (v_pred.resolution_prediction is not null and v_pred.resolution_prediction = v_result.resolution);

    -- Punkty
    -- Nowy system:
    -- exact = 3
    -- outcome = 1
    -- knockout: advance = +1, resolution = +1
    -- bez punktów za różnicę bramek
    -- bez limitu max 8
    v_points := 0;

    if v_exact then
      v_points := 3;
    elsif v_outcome_ok then
      v_points := 1;
    end if;

    if v_is_knockout then
      if v_advance_ok then v_points := v_points + 1; end if;
      if v_resolution_ok then v_points := v_points + 1; end if;
    end if;

    v_breakdown := jsonb_build_object(
      'exact', v_exact,
      'outcome', v_outcome_ok,
      'goal_diff', false,
      'advance', v_advance_ok,
      'resolution', v_resolution_ok,
      'points_exact', case when v_exact then 3 else 0 end,
      'points_outcome', case when not v_exact and v_outcome_ok then 1 else 0 end,
      'points_diff', 0,
      'points_advance', case when v_is_knockout and v_advance_ok then 1 else 0 end,
      'points_resolution', case when v_is_knockout and v_resolution_ok then 1 else 0 end
    );

    insert into prediction_scores (
      prediction_id, group_id, user_id, match_id,
      score_breakdown, total_points, calculated_at
    )
    values (
      v_pred.id, v_pred.group_id, v_pred.user_id, p_match_id,
      v_breakdown, v_points, now()
    )
    on conflict (prediction_id)
    do update set
      score_breakdown = excluded.score_breakdown,
      total_points = excluded.total_points,
      calculated_at = excluded.calculated_at;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ─── get_leaderboard ─────────────────────────────────────────────────────────
create or replace function get_leaderboard(p_group_id uuid)
returns table (
  user_id         uuid,
  nickname        text,
  match_points    bigint,
  bonus_points    bigint,
  total_points    bigint,
  exact_scores    bigint,
  correct_outcomes bigint,
  correct_advances bigint,
  matches_predicted bigint
) language sql stable security definer as $$
  with match_agg as (
    select
      user_id,
      group_id,
      coalesce(sum(total_points), 0) as match_points,
      coalesce(sum(case when (score_breakdown->>'exact')::boolean then 1 else 0 end), 0) as exact_scores,
      coalesce(sum(case when (score_breakdown->>'outcome')::boolean then 1 else 0 end), 0) as correct_outcomes,
      coalesce(sum(case when (score_breakdown->>'advance')::boolean then 1 else 0 end), 0) as correct_advances,
      count(distinct match_id) as matches_predicted
    from prediction_scores
    where group_id = p_group_id
    group by user_id, group_id
  ),
  bonus_agg as (
    select
      user_id,
      group_id,
      coalesce(sum(points), 0) as bonus_points
    from bonus_scores
    where group_id = p_group_id
    group by user_id, group_id
  )
  select
    gm.user_id,
    p.nickname,
    coalesce(ma.match_points, 0) as match_points,
    coalesce(ba.bonus_points, 0) as bonus_points,
    coalesce(ma.match_points, 0) + coalesce(ba.bonus_points, 0) as total_points,
    coalesce(ma.exact_scores, 0) as exact_scores,
    coalesce(ma.correct_outcomes, 0) as correct_outcomes,
    coalesce(ma.correct_advances, 0) as correct_advances,
    coalesce(ma.matches_predicted, 0) as matches_predicted
  from group_members gm
  join profiles p on p.id = gm.user_id
  left join match_agg ma on ma.user_id = gm.user_id and ma.group_id = p_group_id
  left join bonus_agg ba on ba.user_id = gm.user_id and ba.group_id = p_group_id
  where gm.group_id = p_group_id
    and exists (
      select 1 from group_members viewer
      where viewer.group_id = p_group_id
        and viewer.user_id = auth.uid()
    )
  order by total_points desc, exact_scores desc, matches_predicted desc;
$$;

-- ─── get_visible_predictions ─────────────────────────────────────────────────
create or replace function get_visible_predictions(
  p_match_id integer,
  p_group_id uuid
)
returns table (
  prediction_id uuid,
  user_id       uuid,
  nickname      text,
  home_goals    integer,
  away_goals    integer,
  total_points  integer
) language sql stable security definer as $$
  select
    pred.id,
    pred.user_id,
    prof.nickname,
    pred.home_goals,
    pred.away_goals,
    coalesce(ps.total_points, null)
  from predictions pred
  join profiles prof on prof.id = pred.user_id
  left join prediction_scores ps on ps.prediction_id = pred.id
  where pred.match_id = p_match_id
    and pred.group_id = p_group_id
    and exists (
      select 1 from group_members viewer
      where viewer.group_id = p_group_id
        and viewer.user_id = auth.uid()
    )
    and exists (
      select 1 from matches m
      where m.id = p_match_id and now() >= m.kickoff_at
    );
$$;

-- ─── recalculate_bonus_scores ────────────────────────────────────────────────
-- Wywoływana ręcznie przez admina po wpisaniu oficjalnych danych turnieju.
-- Admini wpisują klucz JSON 'official_results' w settings grupy.
create or replace function recalculate_bonus_scores(p_group_id uuid)
returns integer language plpgsql security definer as $$
declare
  v_settings jsonb;
  v_bp       bonus_predictions%rowtype;
  v_points   integer;
  v_notes    text;
  v_count    integer := 0;
begin
  if not exists (
    select 1 from group_members
    where group_id = p_group_id
      and user_id = auth.uid()
      and role in ('admin', 'owner')
  ) then
    raise exception 'Brak uprawnień admina dla tej grupy.';
  end if;

  select settings into v_settings from groups where id = p_group_id;

  for v_bp in select * from bonus_predictions where group_id = p_group_id loop
    v_points := 0;
    v_notes := null;

    case v_bp.bonus_type
      when 'champion' then
        if v_settings->'official'->'champion_team_id' is not null then
          if (v_bp.value->>'team_id')::int = (v_settings->'official'->>'champion_team_id')::int
          then v_points := 15; end if;
        end if;

      when 'runner_up' then
        if v_settings->'official'->'runner_up_team_id' is not null then
          if (v_bp.value->>'team_id')::int = (v_settings->'official'->>'runner_up_team_id')::int
          then v_points := 10; end if;
        end if;

      when 'top_scoring_team' then
        if v_settings->'official'->'top_scoring_team_id' is not null then
          if (v_bp.value->>'team_id')::int = (v_settings->'official'->>'top_scoring_team_id')::int
          then v_points := 8; end if;
        end if;

      when 'total_goals_range' then
        if v_settings->'official'->'total_goals' is not null then
          declare
            v_total int := (v_settings->'official'->>'total_goals')::int;
            v_min   int := (v_bp.value->>'min')::int;
            v_max   int := (v_bp.value->>'max')::int;
          begin
            if v_total >= v_min and v_total <= v_max then v_points := 5; end if;
          end;
        end if;

      when 'final_penalties' then
        if v_settings->'official'->'final_penalties' is not null then
          if (v_bp.value->>'answer')::boolean = (v_settings->'official'->>'final_penalties')::boolean
          then v_points := 3; end if;
        end if;

      when 'best_keeper' then
        if v_settings->'official'->>'best_keeper' is not null then
          if lower(v_bp.value->>'player_name') = lower(v_settings->'official'->>'best_keeper')
          then v_points := 8; end if;
        end if;

      when 'best_player' then
        if v_settings->'official'->>'best_player' is not null then
          if lower(v_bp.value->>'player_name') = lower(v_settings->'official'->>'best_player')
          then v_points := 8; end if;
        end if;

      when 'top_scorer' then
        if v_settings->'official'->>'top_scorer' is not null then
          if lower(v_bp.value->>'player_name') = lower(v_settings->'official'->>'top_scorer')
          then
            if (v_settings->'official'->>'top_scorer_shared')::boolean
            then v_points := 7; v_notes := 'Współlider';
            else v_points := 10;
            end if;
          end if;
        end if;

      else null;
    end case;

    insert into bonus_scores (
      bonus_prediction_id, group_id, user_id, bonus_type, points, notes, calculated_at
    )
    values (v_bp.id, p_group_id, v_bp.user_id, v_bp.bonus_type, v_points, v_notes, now())
    on conflict (bonus_prediction_id)
    do update set points = excluded.points, notes = excluded.notes, calculated_at = excluded.calculated_at;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
