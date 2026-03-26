-- Migration : calcul automatique de l'ELO quand un evenement passe en 'completed'
-- Replique exactement la logique de eloEngine.ts cote frontend

-- Fonction utilitaire : multiplicateur de marge selon le score
CREATE OR REPLACE FUNCTION public.elo_margin_multiplier(score text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  parts text[];
  a int;
  b int;
  winner_sets int;
  loser_sets int;
  normalized text;
BEGIN
  IF score IS NULL OR score = '' THEN
    RETURN 1.00;
  END IF;

  IF score LIKE '%ABS%' THEN
    RETURN 0;
  END IF;

  -- Extraire les deux chiffres du score (ex: "3-1")
  parts := regexp_match(score, '^(\d+)-(\d+)$');
  IF parts IS NULL THEN
    RETURN 1.00;
  END IF;

  a := parts[1]::int;
  b := parts[2]::int;
  winner_sets := GREATEST(a, b);
  loser_sets := LEAST(a, b);
  normalized := winner_sets || '-' || loser_sets;

  RETURN CASE normalized
    WHEN '3-0' THEN 1.25
    WHEN '3-1' THEN 1.10
    WHEN '3-2' THEN 1.00
    ELSE 1.00
  END;
END;
$$;

-- Fonction principale : applique l'ELO batch pour un evenement
CREATE OR REPLACE FUNCTION public.apply_event_elo(p_event_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec record;
  k_factor constant numeric := 32;
  winner_rating numeric;
  loser_rating numeric;
  expected numeric;
  multiplier numeric;
  delta int;
  deltas jsonb := '{}';
  player_id text;
  player_delta numeric;
  current_rating int;
  updated_count int := 0;
BEGIN
  -- Collecter les ratings initiaux des joueurs concernes
  -- et calculer les deltas pour chaque match
  FOR rec IN
    SELECT
      m.winner_id,
      CASE WHEN m.winner_id = m.player1_id THEN m.player2_id ELSE m.player1_id END AS loser_id,
      m.score
    FROM public.matches m
    JOIN public.groups g ON g.id = m.group_id
    WHERE g.event_id = p_event_id
      AND m.winner_id IS NOT NULL
      AND m.score IS NOT NULL
  LOOP
    -- Recuperer les ratings initiaux (debut d'evenement, pas les deltas en cours)
    SELECT COALESCE(p.power_ranking, 1000) INTO winner_rating
    FROM public.profiles p WHERE p.id = rec.winner_id;

    SELECT COALESCE(p.power_ranking, 1000) INTO loser_rating
    FROM public.profiles p WHERE p.id = rec.loser_id;

    multiplier := public.elo_margin_multiplier(rec.score);

    IF multiplier = 0 THEN
      CONTINUE;
    END IF;

    -- E_A = 1 / (1 + 10^((R_B - R_A) / 400))
    expected := 1.0 / (1.0 + power(10.0, (loser_rating - winner_rating) / 400.0));
    delta := round(k_factor * multiplier * (1.0 - expected));

    -- Accumuler les deltas
    deltas := jsonb_set(
      deltas,
      ARRAY[rec.winner_id::text],
      to_jsonb(COALESCE((deltas ->> rec.winner_id::text)::int, 0) + delta)
    );
    deltas := jsonb_set(
      deltas,
      ARRAY[rec.loser_id::text],
      to_jsonb(COALESCE((deltas ->> rec.loser_id::text)::int, 0) - delta)
    );
  END LOOP;

  -- Appliquer les deltas aux profiles
  FOR player_id, player_delta IN
    SELECT key, value::int FROM jsonb_each_text(deltas)
  LOOP
    IF player_delta::int != 0 THEN
      UPDATE public.profiles
      SET power_ranking = COALESCE(power_ranking, 1000) + player_delta::int
      WHERE id = player_id::uuid;

      updated_count := updated_count + 1;
    END IF;
  END LOOP;

  RETURN updated_count;
END;
$$;

-- Trigger : appliquer l'ELO automatiquement au passage en 'completed'
CREATE OR REPLACE FUNCTION public.auto_elo_on_event_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    PERFORM public.apply_event_elo(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_elo_on_event_complete ON public.events;
CREATE TRIGGER trg_auto_elo_on_event_complete
  AFTER UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_elo_on_event_complete();
