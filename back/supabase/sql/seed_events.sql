-- ===================================
-- SEED : EVENEMENTS COMPLETS (PASSES)
-- ===================================
-- Cree 3 evenements termines avec :
--   - 5 lundis de jeu chacun
--   - 40 joueurs actifs inscrits
--   - 8 groupes de 5 joueurs (distribution snake par ranking)
--   - 10 matchs round-robin par groupe (80 matchs/evenement)
--   - Scores et gagnants pour chaque match
-- PREREQUIS : executer seed_players.sql d'abord

SET session_replication_role = 'replica';

DO $$
DECLARE
  v_club_id uuid := 'f1a1a082-3b7d-4c2f-9cf3-29826750f121';

  -- Memes tableaux que seed_players (pour generer les UUIDs deterministes)
  v_first_names text[] := ARRAY[
    'Jean', 'Pierre', 'Marie', 'Sophie', 'Luc',
    'Thomas', 'Camille', 'Nicolas', 'Julie', 'Antoine',
    'Francois', 'Isabelle', 'Laurent', 'Nathalie', 'Philippe',
    'Celine', 'Benoit', 'Aurelie', 'Christophe', 'Emilie',
    'Maxime', 'Delphine', 'Sebastien', 'Virginie', 'Olivier',
    'Sandrine', 'Mathieu', 'Caroline', 'Damien', 'Stephanie',
    'Julien', 'Helene', 'Romain', 'Pauline', 'Guillaume',
    'Manon', 'Arnaud', 'Lea', 'Florian', 'Charlotte',
    'Kevin', 'Melanie', 'Hugo', 'Clara', 'Alexandre',
    'Lucie', 'Thibault', 'Anais', 'Adrien', 'Elise'
  ];
  v_last_names text[] := ARRAY[
    'Dupont', 'Martin', 'Durand', 'Lefebvre', 'Petit',
    'Moreau', 'Vandenberghe', 'Claessens', 'Lambert', 'Dubois',
    'Leroy', 'Janssens', 'Peeters', 'Bernard', 'Robert',
    'Richard', 'Simon', 'Laurent', 'Michel', 'Garcia',
    'Maes', 'Willems', 'Jacobs', 'Mertens', 'Wouters',
    'Lemaire', 'Girard', 'Bonhomme', 'Fontaine', 'Rousseau',
    'Delvaux', 'Hermans', 'Leclercq', 'Gauthier', 'Mercier',
    'Picard', 'Delcourt', 'Renard', 'Collin', 'Marchand',
    'Bertrand', 'De Smet', 'Carlier', 'Schmitz', 'Roux',
    'Brasseur', 'Henrard', 'Dumont', 'Pauwels', 'Lejeune'
  ];
  v_rankings int[] := ARRAY[
    820, 870, 910, 950, 990,
    1010, 1040, 1080, 1110, 1140,
    1170, 1200, 1220, 1250, 1280,
    1050, 1130, 1190, 1260, 1290,
    1310, 1340, 1370, 1400, 1430,
    1460, 1490, 1520, 1550, 1580,
    1320, 1380, 1450, 1510, 1570,
    1610, 1640, 1670, 1700, 1730,
    1760, 1620, 1680, 1720, 1750,
    1810, 1860, 1920, 1960, 2000
  ];

  v_event_ids uuid[] := ARRAY[
    md5('seed.event.serie34')::uuid,
    md5('seed.event.serie35')::uuid,
    md5('seed.event.serie36')::uuid
  ];
  v_event_names text[] := ARRAY['Série 34', 'Série 35', 'Série 36'];

  -- Joueurs actifs tries par ranking
  v_active_ids uuid[];
  v_active_ranks int[];
  v_temp_id uuid;
  v_temp_rank int;

  -- Affectation groupe pour chaque joueur trie
  v_player_groups int[];  -- v_player_groups[p] = groupe du p-eme joueur trie
  v_row int;
  v_col int;

  -- Dates et evenements
  v_base_date date;
  v_dates date[];
  v_event_id uuid;

  -- Groupes
  v_group_ids uuid[];
  v_group_id uuid;

  -- Joueurs d'un groupe (pour generer les matchs)
  v_gp_ids uuid[];

  -- Matchs
  v_match_idx int;
  v_match_id uuid;
  v_p1_id uuid;
  v_p2_id uuid;
  v_winner_id uuid;
  v_score text;
  v_hash int;
  v_day_idx int;
  v_slot_idx int;
  v_court_idx int;
  v_match_date date;
  v_match_time time;
  v_scores text[] := ARRAY['3-0', '3-1', '3-2'];
  v_time_slots time[] := ARRAY['19:00'::time, '19:30'::time, '20:00'::time, '20:30'::time,
                                '21:00'::time, '21:30'::time, '22:00'::time, '22:30'::time];

  i int;
  j int;
  a int;
  b int;
  e int;
  g int;
BEGIN
  -- ===================================
  -- VERIFICATION
  -- ===================================
  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE id = v_club_id) THEN
    RAISE EXCEPTION 'Club non trouve : %', v_club_id;
  END IF;

  -- ===================================
  -- CLEANUP (decommentez pour purger)
  -- ===================================
  -- DELETE FROM public.events WHERE id = ANY(v_event_ids);

  -- ===================================
  -- ETAPE 1 : CONSTRUIRE LA LISTE DES JOUEURS ACTIFS TRIES PAR RANKING DESC
  -- ===================================
  v_active_ids := ARRAY[]::uuid[];
  v_active_ranks := ARRAY[]::int[];

  FOR i IN 1..50 LOOP
    -- Indices 1-35 (active+member) et 41-45 (active+visitor)
    IF i <= 35 OR (i >= 41 AND i <= 45) THEN
      v_active_ids := v_active_ids || md5(v_first_names[i] || '.' || v_last_names[i] || '.seed')::uuid;
      v_active_ranks := v_active_ranks || v_rankings[i];
    END IF;
  END LOOP;
  -- 40 joueurs actifs

  -- Tri bulle par ranking decroissant
  FOR i IN 1..40 LOOP
    FOR j IN 1..(40 - i) LOOP
      IF v_active_ranks[j] < v_active_ranks[j + 1] THEN
        v_temp_rank := v_active_ranks[j];
        v_active_ranks[j] := v_active_ranks[j + 1];
        v_active_ranks[j + 1] := v_temp_rank;
        v_temp_id := v_active_ids[j];
        v_active_ids[j] := v_active_ids[j + 1];
        v_active_ids[j + 1] := v_temp_id;
      END IF;
    END LOOP;
  END LOOP;

  -- ===================================
  -- ETAPE 2 : DISTRIBUTION SNAKE (8 groupes de 5)
  -- ===================================
  -- Rang 1→ Box1, Rang 2→ Box2, ..., Rang 8→ Box8
  -- Rang 9→ Box8, Rang 10→ Box7, ..., Rang 16→ Box1  (sens inverse)
  -- etc.
  v_player_groups := ARRAY[]::int[];
  FOR i IN 1..40 LOOP
    v_row := ((i - 1) / 8) + 1;
    v_col := ((i - 1) % 8) + 1;
    IF v_row % 2 = 1 THEN
      v_player_groups := v_player_groups || v_col;
    ELSE
      v_player_groups := v_player_groups || (9 - v_col);
    END IF;
  END LOOP;

  -- ===================================
  -- ETAPE 3 : CREER LES EVENEMENTS
  -- ===================================
  -- Trouver le lundi de cette semaine, reculer de 20 semaines
  v_base_date := CURRENT_DATE - ((extract(isodow from CURRENT_DATE)::int - 1) || ' days')::interval;
  v_base_date := v_base_date - interval '20 weeks';

  FOR e IN 1..3 LOOP
    v_event_id := v_event_ids[e];

    -- 5 lundis pour cet evenement
    v_dates := ARRAY[]::date[];
    FOR j IN 0..4 LOOP
      v_dates := v_dates || (v_base_date + (((e - 1) * 5 + j) * 7 || ' days')::interval)::date;
    END LOOP;

    -- ===================================
    -- EVENEMENT
    -- ===================================
    INSERT INTO public.events (
      id, club_id, event_name, description,
      start_date, end_date, start_time, end_time,
      number_of_courts, estimated_match_duration,
      playing_dates, status, deadline
    )
    VALUES (
      v_event_id, v_club_id, v_event_names[e],
      'Événement de test généré par seed',
      v_dates[1], v_dates[5],
      '19:00'::time, '23:00'::time,
      4, interval '30 minutes',
      v_dates, 'completed', v_dates[5]
    )
    ON CONFLICT (id) DO NOTHING;

    -- ===================================
    -- INSCRIPTIONS (event_players)
    -- ===================================
    FOR i IN 1..40 LOOP
      INSERT INTO public.event_players (event_id, profile_id)
      VALUES (v_event_id, v_active_ids[i])
      ON CONFLICT (event_id, profile_id) DO NOTHING;
    END LOOP;

    -- ===================================
    -- GROUPES (8 x Box)
    -- ===================================
    v_group_ids := ARRAY[]::uuid[];
    FOR g IN 1..8 LOOP
      v_group_id := md5('seed.group.' || v_event_names[e] || '.box' || g)::uuid;
      v_group_ids := v_group_ids || v_group_id;

      INSERT INTO public.groups (id, event_id, group_name, max_players)
      VALUES (v_group_id, v_event_id, 'Box ' || g, 5)
      ON CONFLICT (id) DO NOTHING;
    END LOOP;

    -- ===================================
    -- AFFECTATION DES JOUEURS AUX GROUPES
    -- ===================================
    FOR i IN 1..40 LOOP
      INSERT INTO public.group_players (group_id, profile_id)
      VALUES (v_group_ids[v_player_groups[i]], v_active_ids[i])
      ON CONFLICT (group_id, profile_id) DO NOTHING;
    END LOOP;

    -- ===================================
    -- MATCHS ROUND-ROBIN + SCORES
    -- ===================================
    -- 10 matchs par groupe (C(5,2)), 80 matchs au total
    -- Repartis sur 5 jours x 4 terrains x time slots
    v_match_idx := 0;

    FOR g IN 1..8 LOOP
      -- Collecter les 5 joueurs de ce groupe
      v_gp_ids := ARRAY[]::uuid[];
      FOR i IN 1..40 LOOP
        IF v_player_groups[i] = g THEN
          v_gp_ids := v_gp_ids || v_active_ids[i];
        END IF;
      END LOOP;

      -- Generer toutes les paires round-robin
      FOR a IN 1..4 LOOP
        FOR b IN (a + 1)..5 LOOP
          v_p1_id := v_gp_ids[a];  -- joueur mieux classe
          v_p2_id := v_gp_ids[b];

          -- UUID deterministe pour le match
          v_match_id := md5('seed.match.' || v_event_names[e] || '.g' || g || '.p' || a || 'v' || b)::uuid;

          -- Hash deterministe pour le resultat
          v_hash := get_byte(decode(md5(v_p1_id::text || v_p2_id::text || v_event_id::text), 'hex'), 0);

          -- Gagnant : 70% le mieux classe, 30% l'autre
          IF v_hash % 10 < 7 THEN
            v_winner_id := v_p1_id;
          ELSE
            v_winner_id := v_p2_id;
          END IF;

          -- Score : 3-0, 3-1 ou 3-2
          v_score := v_scores[(v_hash % 3) + 1];

          -- Planification : 16 matchs/jour, 4 terrains/slot
          v_day_idx := (v_match_idx / 16) + 1;
          IF v_day_idx > 5 THEN v_day_idx := 5; END IF;
          v_slot_idx := ((v_match_idx % 16) / 4) + 1;
          v_court_idx := (v_match_idx % 4) + 1;

          v_match_date := v_dates[v_day_idx];
          v_match_time := v_time_slots[v_slot_idx];

          INSERT INTO public.matches (
            id, group_id, player1_id, player2_id,
            match_date, match_time, court_number,
            winner_id, score
          )
          VALUES (
            v_match_id,
            v_group_ids[g],
            v_p1_id,
            v_p2_id,
            v_match_date,
            v_match_time,
            'Terrain ' || v_court_idx,
            v_winner_id,
            v_score
          )
          ON CONFLICT (id) DO NOTHING;

          v_match_idx := v_match_idx + 1;
        END LOOP;
      END LOOP;
    END LOOP;

    -- ===================================
    -- PAIEMENTS VISITEURS
    -- ===================================
    -- 5 visiteurs actifs (indices 41-45) avec des impayes repartis :
    --   Kevin (41)      : tout paye
    --   Melanie (42)    : tout paye
    --   Hugo (43)       : impaye Serie 36 (event 3)
    --   Clara (44)      : impayee les 3 evenements
    --   Alexandre (45)  : impaye Serie 35 + 36 (events 2-3)
    FOR i IN 41..45 LOOP
      v_p1_id := md5(v_first_names[i] || '.' || v_last_names[i] || '.seed')::uuid;

      INSERT INTO public.payments (
        profile_id, event_id, amount, status, paid_at
      )
      VALUES (
        v_p1_id,
        v_event_id,
        35.00,
        CASE
          WHEN i <= 42 THEN 'paid'::payment_status_enum                        -- Kevin, Melanie : toujours paye
          WHEN i = 43 AND e <= 2 THEN 'paid'::payment_status_enum              -- Hugo : paye S34+S35
          WHEN i = 45 AND e = 1 THEN 'paid'::payment_status_enum               -- Alexandre : paye S34 seulement
          ELSE 'unpaid'::payment_status_enum                                    -- le reste : impaye
        END,
        CASE
          WHEN i <= 42 THEN v_dates[1]::timestamptz
          WHEN i = 43 AND e <= 2 THEN v_dates[1]::timestamptz
          WHEN i = 45 AND e = 1 THEN v_dates[1]::timestamptz
          ELSE NULL
        END
      )
      ON CONFLICT (profile_id, event_id) DO NOTHING;
    END LOOP;

    RAISE NOTICE 'Event "%" : 8 groupes, 40 joueurs, % matchs, 5 paiements', v_event_names[e], v_match_idx;
  END LOOP;

  RAISE NOTICE 'Seed termine : 3 evenements complets crees';
END;
$$;

RESET session_replication_role;
