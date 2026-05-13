-- ============================================================
-- 005_realtime_publication.sql  —  Tabele dla Supabase Realtime
-- ============================================================

do $$
begin
  begin
    alter publication supabase_realtime add table public.matches;
  exception
    when duplicate_object then null;
    when undefined_object then raise notice 'Publikacja supabase_realtime nie istnieje w tym środowisku.';
  end;

  begin
    alter publication supabase_realtime add table public.match_results;
  exception
    when duplicate_object then null;
    when undefined_object then raise notice 'Publikacja supabase_realtime nie istnieje w tym środowisku.';
  end;

  begin
    alter publication supabase_realtime add table public.predictions;
  exception
    when duplicate_object then null;
    when undefined_object then raise notice 'Publikacja supabase_realtime nie istnieje w tym środowisku.';
  end;

  begin
    alter publication supabase_realtime add table public.prediction_scores;
  exception
    when duplicate_object then null;
    when undefined_object then raise notice 'Publikacja supabase_realtime nie istnieje w tym środowisku.';
  end;

  begin
    alter publication supabase_realtime add table public.bonus_predictions;
  exception
    when duplicate_object then null;
    when undefined_object then raise notice 'Publikacja supabase_realtime nie istnieje w tym środowisku.';
  end;

  begin
    alter publication supabase_realtime add table public.bonus_scores;
  exception
    when duplicate_object then null;
    when undefined_object then raise notice 'Publikacja supabase_realtime nie istnieje w tym środowisku.';
  end;

  begin
    alter publication supabase_realtime add table public.team_tournament_stats;
  exception
    when duplicate_object then null;
    when undefined_object then raise notice 'Publikacja supabase_realtime nie istnieje w tym środowisku.';
  end;

  begin
    alter publication supabase_realtime add table public.player_tournament_stats;
  exception
    when duplicate_object then null;
    when undefined_object then raise notice 'Publikacja supabase_realtime nie istnieje w tym środowisku.';
  end;

  begin
    alter publication supabase_realtime add table public.match_events;
  exception
    when duplicate_object then null;
    when undefined_object then raise notice 'Publikacja supabase_realtime nie istnieje w tym środowisku.';
  end;
end $$;
