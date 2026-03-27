-- ===================================
-- SEED : 50 JOUEURS DE TEST
-- ===================================
-- Script a executer dans le SQL Editor de Supabase (en tant que postgres)
-- Insere 50 joueurs fictifs lies a un club existant
-- Idempotent : peut etre relance sans creer de doublons (UUIDs deterministes)

-- ===================================
-- CONFIGURATION
-- ===================================
-- Modifier le club_id ci-dessous si necessaire

-- Bypass des FK (profiles.id -> auth.users) et des triggers
SET session_replication_role = 'replica';

DO $$
DECLARE
  v_club_id uuid := 'f1a1a082-3b7d-4c2f-9cf3-29826750f121';
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
    -- 5 debutants (800-999)
    820, 870, 910, 950, 990,
    -- 15 intermediaires (1000-1299)
    1010, 1040, 1080, 1110, 1140,
    1170, 1200, 1220, 1250, 1280,
    1050, 1130, 1190, 1260, 1290,
    -- 15 bons joueurs (1300-1599)
    1310, 1340, 1370, 1400, 1430,
    1460, 1490, 1520, 1550, 1580,
    1320, 1380, 1450, 1510, 1570,
    -- 10 confirmes (1600-1799)
    1610, 1640, 1670, 1700, 1730,
    1760, 1620, 1680, 1720, 1750,
    -- 5 experts (1800-2000)
    1810, 1860, 1920, 1960, 2000
  ];
  v_arrivals time[] := ARRAY[
    '18:00', '18:15', '18:30', '18:45', '19:00',
    '19:15', '19:30', '19:45', '20:00', '18:00'
  ];
  v_departures time[] := ARRAY[
    '21:00', '21:15', '21:30', '21:45', '22:00',
    '22:15', '22:30', '22:45', '23:00', '21:30'
  ];
  v_id uuid;
  v_arrival_idx int;
  v_departure_idx int;
  i int;
BEGIN
  -- Verifier que le club existe
  IF NOT EXISTS (SELECT 1 FROM public.clubs WHERE id = v_club_id) THEN
    RAISE EXCEPTION 'Club non trouve : %. Verifiez le club_id.', v_club_id;
  END IF;

  -- ===================================
  -- CLEANUP (decommentez pour purger les joueurs seeds)
  -- ===================================
  -- DELETE FROM public.profiles
  -- WHERE is_linked = false AND club_id = v_club_id;

  FOR i IN 1..50 LOOP
    -- UUID deterministe base sur le nom
    v_id := md5(v_first_names[i] || '.' || v_last_names[i] || '.seed')::uuid;

    -- Index cyclique pour les horaires
    v_arrival_idx := ((i - 1) % 10) + 1;
    v_departure_idx := ((i - 1) % 10) + 1;

    -- ===================================
    -- PROFIL
    -- ===================================
    INSERT INTO public.profiles (
      id, first_name, last_name, phone, email,
      power_ranking, club_id, role, is_linked, created_at, updated_at
    )
    VALUES (
      v_id,
      v_first_names[i],
      v_last_names[i],
      '+324' || lpad((56000000 + i * 137)::text, 8, '0'),
      lower(v_first_names[i]) || '.' || lower(v_last_names[i]) || '@test.com',
      v_rankings[i],
      v_club_id,
      'user',
      false,
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING;

    -- ===================================
    -- STATUTS
    -- ===================================
    IF i <= 35 THEN
      -- 70% : active + member
      INSERT INTO public.player_status (profile_id, status)
      VALUES (v_id, 'active'::player_status_enum)
      ON CONFLICT (profile_id, status) DO NOTHING;

      INSERT INTO public.player_status (profile_id, status)
      VALUES (v_id, 'member'::player_status_enum)
      ON CONFLICT (profile_id, status) DO NOTHING;

    ELSIF i <= 40 THEN
      -- 10% : inactive + member
      INSERT INTO public.player_status (profile_id, status)
      VALUES (v_id, 'inactive'::player_status_enum)
      ON CONFLICT (profile_id, status) DO NOTHING;

      INSERT INTO public.player_status (profile_id, status)
      VALUES (v_id, 'member'::player_status_enum)
      ON CONFLICT (profile_id, status) DO NOTHING;

    ELSIF i <= 45 THEN
      -- 10% : active + visitor
      INSERT INTO public.player_status (profile_id, status)
      VALUES (v_id, 'active'::player_status_enum)
      ON CONFLICT (profile_id, status) DO NOTHING;

      INSERT INTO public.player_status (profile_id, status)
      VALUES (v_id, 'visitor'::player_status_enum)
      ON CONFLICT (profile_id, status) DO NOTHING;

    ELSE
      -- 10% : inactive + visitor
      INSERT INTO public.player_status (profile_id, status)
      VALUES (v_id, 'inactive'::player_status_enum)
      ON CONFLICT (profile_id, status) DO NOTHING;

      INSERT INTO public.player_status (profile_id, status)
      VALUES (v_id, 'visitor'::player_status_enum)
      ON CONFLICT (profile_id, status) DO NOTHING;
    END IF;

    -- ===================================
    -- HORAIRES (schedule general, sans event)
    -- ===================================
    INSERT INTO public.schedule (profile_id, event_id, arrival, departure)
    SELECT
      v_id,
      NULL,
      (CURRENT_DATE + v_arrivals[v_arrival_idx])::timestamptz,
      (CURRENT_DATE + v_departures[v_departure_idx])::timestamptz
    WHERE NOT EXISTS (
      SELECT 1 FROM public.schedule
      WHERE profile_id = v_id AND event_id IS NULL
    );

  END LOOP;

  RAISE NOTICE 'Seed termine : 50 joueurs inseres pour le club %', v_club_id;
END;
$$;

-- Restaurer le comportement normal
RESET session_replication_role;
