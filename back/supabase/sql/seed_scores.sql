-- ===================================
-- SEED : SCORES ALEATOIRES POUR UN EVENEMENT
-- ===================================
-- Remplit les matchs sans score avec un gagnant et un score aleatoire
-- Modifier v_event_id ci-dessous avant d'executer

DO $$
DECLARE
  v_event_id uuid := '9ac228c4-7d55-422f-8bb9-3b6a30282272';
  v_scores text[] := ARRAY['3-0', '3-1', '3-2'];
  v_match record;
  v_hash int;
  v_winner uuid;
  v_score text;
  v_count int := 0;
BEGIN
  FOR v_match IN
    SELECT id, player1_id, player2_id
    FROM public.matches
    WHERE group_id IN (SELECT id FROM public.groups WHERE event_id = v_event_id)
      AND winner_id IS NULL
  LOOP
    -- Hash deterministe mais varie par match
    v_hash := get_byte(decode(md5(v_match.id::text || now()::text), 'hex'), 0);

    -- Gagnant : ~50/50
    IF v_hash % 2 = 0 THEN
      v_winner := v_match.player1_id;
    ELSE
      v_winner := v_match.player2_id;
    END IF;

    -- Score aleatoire
    v_score := v_scores[(v_hash % 3) + 1];

    UPDATE public.matches
    SET winner_id = v_winner,
        score = v_score,
        updated_at = now()
    WHERE id = v_match.id;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Scores generes : % matchs mis a jour pour event %', v_count, v_event_id;
END;
$$;
