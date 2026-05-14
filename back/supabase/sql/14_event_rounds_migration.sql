-- ===================================
-- 14 - MIGRATION ÉVÉNEMENTS → SÉRIES + ROUNDS
-- ===================================
-- Transforme le modèle "event unique" en "série (event) + cycles (event_rounds)".
-- Les joueurs s'inscrivent une fois à la série ; groupes, matchs, absences
-- et paiements sont rattachés à chaque round individuel.
--
-- ORDRE D'EXÉCUTION :
--   1. Créer event_rounds
--   2. Migrer les données existantes
--   3. Ajouter round_id aux tables dépendantes
--   4. Supprimer les vues et policies obsolètes
--   5. Supprimer les colonnes event_id / date-statut migrées
--   6. Ajouter contraintes NOT NULL / UNIQUE sur round_id
--   7. Mettre à jour functions, triggers, RLS, vues
--   8. Créer les nouveaux index

-- ===================================
-- ÉTAPE 1 : TABLE EVENT_ROUNDS
-- ===================================

CREATE TABLE IF NOT EXISTS public.event_rounds (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                 uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  round_number             int         NOT NULL DEFAULT 1,
  start_date               date        NOT NULL,
  end_date                 date        NOT NULL,
  start_time               time with time zone,
  end_time                 time with time zone,
  number_of_courts         int         NOT NULL DEFAULT 1,
  estimated_match_duration interval    DEFAULT interval '00:30:00',
  playing_dates            date[]      DEFAULT NULL,
  deadline                 date        DEFAULT NULL,
  status                   text        NOT NULL DEFAULT 'upcoming'
                           CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now(),
  UNIQUE (event_id, round_number)
);

-- ===================================
-- ÉTAPE 2 : MIGRATION DES DONNÉES EXISTANTES
-- ===================================
-- Chaque event existant devient une série + round 1 avec les mêmes paramètres.

INSERT INTO public.event_rounds (
  id, event_id, round_number,
  start_date, end_date,
  start_time, end_time,
  number_of_courts, estimated_match_duration,
  playing_dates, deadline, status,
  created_at, updated_at
)
SELECT
  gen_random_uuid(),
  id,                        -- event_id
  1,                         -- round_number
  start_date,
  end_date,
  start_time,
  end_time,
  number_of_courts,
  estimated_match_duration,
  playing_dates,
  deadline,
  status,
  created_at,
  updated_at
FROM public.events
ON CONFLICT DO NOTHING;

-- ===================================
-- ÉTAPE 3 : AJOUTER ROUND_ID AUX TABLES DÉPENDANTES
-- ===================================

ALTER TABLE public.groups       ADD COLUMN IF NOT EXISTS round_id uuid REFERENCES public.event_rounds(id) ON DELETE CASCADE;
ALTER TABLE public.absences     ADD COLUMN IF NOT EXISTS round_id uuid REFERENCES public.event_rounds(id) ON DELETE CASCADE;
ALTER TABLE public.payments     ADD COLUMN IF NOT EXISTS round_id uuid REFERENCES public.event_rounds(id) ON DELETE CASCADE;
ALTER TABLE public.event_courts ADD COLUMN IF NOT EXISTS round_id uuid REFERENCES public.event_rounds(id) ON DELETE CASCADE;

-- Populer round_id à partir de event_id via event_rounds (round 1 créé à l'étape 2)
UPDATE public.groups g
SET round_id = er.id
FROM public.event_rounds er
WHERE er.event_id = g.event_id
  AND g.round_id IS NULL;

UPDATE public.absences a
SET round_id = er.id
FROM public.event_rounds er
WHERE er.event_id = a.event_id
  AND a.event_id IS NOT NULL
  AND a.round_id IS NULL;

UPDATE public.payments p
SET round_id = er.id
FROM public.event_rounds er
WHERE er.event_id = p.event_id
  AND p.round_id IS NULL;

UPDATE public.event_courts ec
SET round_id = er.id
FROM public.event_rounds er
WHERE er.event_id = ec.event_id
  AND ec.round_id IS NULL;

-- ===================================
-- ÉTAPE 4 : SUPPRIMER LES VUES ET POLICIES QUI RÉFÉRENCENT LES COLONNES À SUPPRIMER
-- ===================================

-- Vue dépendante de groups.event_id et payments.event_id
DROP VIEW IF EXISTS public.admin_event_players_view;

-- Trigger dépendant de events.status
DROP TRIGGER IF EXISTS trg_auto_elo_on_event_complete ON public.events;
DROP TRIGGER IF EXISTS trg_cleanup_absences_on_event_complete ON public.events;

-- Policies dépendantes de groups.event_id
DROP POLICY IF EXISTS "Users can select their club groups"  ON public.groups;
DROP POLICY IF EXISTS "Admins can insert club groups"       ON public.groups;
DROP POLICY IF EXISTS "Admins can update club groups"       ON public.groups;
DROP POLICY IF EXISTS "Admins can delete club groups"       ON public.groups;

-- Policies dépendantes de groups.event_id (via jointures)
DROP POLICY IF EXISTS "Users can see club group memberships"  ON public.group_players;
DROP POLICY IF EXISTS "Admins can insert club group players"  ON public.group_players;
DROP POLICY IF EXISTS "Admins can delete club group players"  ON public.group_players;

DROP POLICY IF EXISTS "Users can see club matches"    ON public.matches;
DROP POLICY IF EXISTS "Admins can insert club matches" ON public.matches;
DROP POLICY IF EXISTS "Admins can update club matches" ON public.matches;
DROP POLICY IF EXISTS "Admins can delete club matches" ON public.matches;

-- Policy profiles dépendante de groups.event_id
DROP POLICY IF EXISTS "Users can select relevant profiles" ON public.profiles;

-- Policies event_courts dépendantes de event_courts.event_id
DROP POLICY IF EXISTS "Users can select club event courts"   ON public.event_courts;
DROP POLICY IF EXISTS "Admins can insert club event courts"  ON public.event_courts;
DROP POLICY IF EXISTS "Admins can update club event courts"  ON public.event_courts;
DROP POLICY IF EXISTS "Admins can delete club event courts"  ON public.event_courts;

-- Trigger auto_renew sur events
DROP TRIGGER IF EXISTS trg_auto_renew_event_players ON public.events;
DROP FUNCTION IF EXISTS public.auto_renew_event_players();

-- ===================================
-- ÉTAPE 5 : SUPPRIMER LES COLONNES OBSOLÈTES
-- ===================================

-- Supprimer les contraintes uniques AVANT de supprimer les colonnes
ALTER TABLE public.groups       DROP CONSTRAINT IF EXISTS groups_pkey CASCADE;  -- récrée via PK existante
ALTER TABLE public.payments     DROP CONSTRAINT IF EXISTS payments_profile_id_event_id_key;
ALTER TABLE public.absences     DROP CONSTRAINT IF EXISTS absences_profile_id_event_id_absent_date_key;

-- Supprimer event_id des tables rattachées au round
ALTER TABLE public.groups       DROP COLUMN IF EXISTS event_id;
ALTER TABLE public.absences     DROP COLUMN IF EXISTS event_id;
ALTER TABLE public.payments     DROP COLUMN IF EXISTS event_id;
ALTER TABLE public.event_courts DROP COLUMN IF EXISTS event_id;

-- Supprimer de events les colonnes qui migrent vers event_rounds
ALTER TABLE public.events DROP COLUMN IF EXISTS start_date;
ALTER TABLE public.events DROP COLUMN IF EXISTS end_date;
ALTER TABLE public.events DROP COLUMN IF EXISTS start_time;
ALTER TABLE public.events DROP COLUMN IF EXISTS end_time;
ALTER TABLE public.events DROP COLUMN IF EXISTS number_of_courts;
ALTER TABLE public.events DROP COLUMN IF EXISTS estimated_match_duration;
ALTER TABLE public.events DROP COLUMN IF EXISTS playing_dates;
ALTER TABLE public.events DROP COLUMN IF EXISTS deadline;
ALTER TABLE public.events DROP COLUMN IF EXISTS status;

-- ===================================
-- ÉTAPE 6 : CONTRAINTES NOT NULL ET UNIQUE SUR ROUND_ID
-- ===================================

-- groups.round_id — obligatoire (un groupe appartient toujours à un round)
ALTER TABLE public.groups ALTER COLUMN round_id SET NOT NULL;

-- payments.round_id — obligatoire
ALTER TABLE public.payments ALTER COLUMN round_id SET NOT NULL;
ALTER TABLE public.payments ADD CONSTRAINT payments_profile_id_round_id_key UNIQUE (profile_id, round_id);

-- absences — round_id optionnel (NULL = absence globale)
-- Contrainte partielle pour éviter les doublons sur les absences sans round
CREATE UNIQUE INDEX IF NOT EXISTS absences_global_unique
  ON public.absences (profile_id, absent_date)
  WHERE round_id IS NULL;

ALTER TABLE public.absences ADD CONSTRAINT absences_profile_id_round_id_absent_date_key
  UNIQUE (profile_id, round_id, absent_date) DEFERRABLE INITIALLY DEFERRED;

-- ===================================
-- ÉTAPE 7 : RLS SUR EVENT_ROUNDS
-- ===================================

ALTER TABLE public.event_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select club event rounds"
ON public.event_rounds FOR SELECT TO public
USING (
  public.is_superadmin()
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id = public.get_user_club_id()
  )
);

CREATE POLICY "Admins can insert club event rounds"
ON public.event_rounds FOR INSERT TO public
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id = public.get_user_club_id()
  ))
);

CREATE POLICY "Admins can update club event rounds"
ON public.event_rounds FOR UPDATE TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id = public.get_user_club_id()
  ))
);

CREATE POLICY "Admins can delete club event rounds"
ON public.event_rounds FOR DELETE TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id = public.get_user_club_id()
  ))
);

-- ===================================
-- ÉTAPE 8 : NOUVELLES POLICIES RLS (round_id → event_rounds → events)
-- ===================================

-- GROUPS
CREATE POLICY "Users can select their club groups"
ON public.groups FOR SELECT TO public
USING (
  public.is_superadmin()
  OR EXISTS (
    SELECT 1 FROM public.event_rounds er
    JOIN public.events e ON e.id = er.event_id
    WHERE er.id = round_id AND e.club_id = public.get_user_club_id()
  )
);

CREATE POLICY "Admins can insert club groups"
ON public.groups FOR INSERT TO public
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.event_rounds er
    JOIN public.events e ON e.id = er.event_id
    WHERE er.id = round_id AND e.club_id = public.get_user_club_id()
  ))
);

CREATE POLICY "Admins can update club groups"
ON public.groups FOR UPDATE TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.event_rounds er
    JOIN public.events e ON e.id = er.event_id
    WHERE er.id = round_id AND e.club_id = public.get_user_club_id()
  ))
);

CREATE POLICY "Admins can delete club groups"
ON public.groups FOR DELETE TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.event_rounds er
    JOIN public.events e ON e.id = er.event_id
    WHERE er.id = round_id AND e.club_id = public.get_user_club_id()
  ))
);

-- GROUP_PLAYERS (via groups.round_id)
CREATE POLICY "Users can see club group memberships"
ON public.group_players FOR SELECT TO public
USING (
  auth.uid() = profile_id
  OR public.is_superadmin()
  OR EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.event_rounds er ON er.id = g.round_id
    JOIN public.events e ON e.id = er.event_id
    WHERE g.id = group_id AND e.club_id = public.get_user_club_id()
  )
);

CREATE POLICY "Admins can insert club group players"
ON public.group_players FOR INSERT TO public
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.event_rounds er ON er.id = g.round_id
    JOIN public.events e ON e.id = er.event_id
    WHERE g.id = group_id AND e.club_id = public.get_user_club_id()
  ))
);

CREATE POLICY "Admins can delete club group players"
ON public.group_players FOR DELETE TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.event_rounds er ON er.id = g.round_id
    JOIN public.events e ON e.id = er.event_id
    WHERE g.id = group_id AND e.club_id = public.get_user_club_id()
  ))
);

-- MATCHES (via groups.round_id)
CREATE POLICY "Users can see club matches"
ON public.matches FOR SELECT TO public
USING (
  auth.uid() IN (player1_id, player2_id)
  OR public.is_superadmin()
  OR EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.event_rounds er ON er.id = g.round_id
    JOIN public.events e ON e.id = er.event_id
    WHERE g.id = group_id AND e.club_id = public.get_user_club_id()
  )
);

CREATE POLICY "Admins can insert club matches"
ON public.matches FOR INSERT TO public
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.event_rounds er ON er.id = g.round_id
    JOIN public.events e ON e.id = er.event_id
    WHERE g.id = group_id AND e.club_id = public.get_user_club_id()
  ))
);

CREATE POLICY "Admins can update club matches"
ON public.matches FOR UPDATE TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.event_rounds er ON er.id = g.round_id
    JOIN public.events e ON e.id = er.event_id
    WHERE g.id = group_id AND e.club_id = public.get_user_club_id()
  ))
);

CREATE POLICY "Admins can delete club matches"
ON public.matches FOR DELETE TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.event_rounds er ON er.id = g.round_id
    JOIN public.events e ON e.id = er.event_id
    WHERE g.id = group_id AND e.club_id = public.get_user_club_id()
  ))
);

-- EVENT_COURTS (via round_id → event_rounds → events)
CREATE POLICY "Users can select club event courts"
ON public.event_courts FOR SELECT TO public
USING (
  public.is_superadmin()
  OR EXISTS (
    SELECT 1 FROM public.event_rounds er
    JOIN public.events e ON e.id = er.event_id
    WHERE er.id = round_id AND e.club_id = public.get_user_club_id()
  )
);

CREATE POLICY "Admins can insert club event courts"
ON public.event_courts FOR INSERT TO public
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.event_rounds er
    JOIN public.events e ON e.id = er.event_id
    WHERE er.id = round_id AND e.club_id = public.get_user_club_id()
  ))
);

CREATE POLICY "Admins can update club event courts"
ON public.event_courts FOR UPDATE TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.event_rounds er
    JOIN public.events e ON e.id = er.event_id
    WHERE er.id = round_id AND e.club_id = public.get_user_club_id()
  ))
);

CREATE POLICY "Admins can delete club event courts"
ON public.event_courts FOR DELETE TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.event_rounds er
    JOIN public.events e ON e.id = er.event_id
    WHERE er.id = round_id AND e.club_id = public.get_user_club_id()
  ))
);

-- PROFILES : mise à jour de la policy qui référence groups.event_id → groups.round_id
CREATE POLICY "Users can select relevant profiles"
ON public.profiles FOR SELECT TO public
USING (
  auth.uid() = id
  OR id IN (
    SELECT gp2.profile_id FROM public.group_players gp2
    JOIN public.groups g2 ON g2.id = gp2.group_id
    WHERE g2.round_id IN (
      SELECT g.round_id FROM public.group_players gp
      JOIN public.groups g ON g.id = gp.group_id
      WHERE gp.profile_id = auth.uid()
    )
  )
  OR id IN (
    SELECT ep2.profile_id FROM public.event_players ep2
    WHERE ep2.event_id IN (
      SELECT ep.event_id FROM public.event_players ep
      WHERE ep.profile_id = auth.uid()
    )
  )
);

-- ===================================
-- ÉTAPE 9 : MISE À JOUR DES FONCTIONS
-- ===================================

-- update_event_statuses : travaille maintenant sur event_rounds
CREATE OR REPLACE FUNCTION public.update_event_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.event_rounds
  SET status = 'completed', updated_at = now()
  WHERE status != 'completed'
    AND (
      (deadline IS NOT NULL AND deadline < CURRENT_DATE)
      OR (deadline IS NULL AND end_date < CURRENT_DATE)
    );

  UPDATE public.event_rounds
  SET status = 'active', updated_at = now()
  WHERE status = 'upcoming'
    AND start_date <= CURRENT_DATE
    AND (
      (deadline IS NOT NULL AND deadline >= CURRENT_DATE)
      OR (deadline IS NULL AND end_date >= CURRENT_DATE)
    );
END;
$$;

-- apply_event_elo : utilise round_id au lieu de event_id pour accéder aux matchs
-- DROP requis car le paramètre est renommé (p_event_id → p_round_id)
DROP FUNCTION IF EXISTS public.apply_event_elo(uuid);
CREATE OR REPLACE FUNCTION public.apply_event_elo(p_round_id uuid)
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
  updated_count int := 0;
BEGIN
  FOR rec IN
    SELECT
      m.winner_id,
      CASE WHEN m.winner_id = m.player1_id THEN m.player2_id ELSE m.player1_id END AS loser_id,
      m.score
    FROM public.matches m
    JOIN public.groups g ON g.id = m.group_id
    WHERE g.round_id = p_round_id
      AND m.winner_id IS NOT NULL
      AND m.score IS NOT NULL
  LOOP
    SELECT COALESCE(p.power_ranking, 1000) INTO winner_rating
    FROM public.profiles p WHERE p.id = rec.winner_id;

    SELECT COALESCE(p.power_ranking, 1000) INTO loser_rating
    FROM public.profiles p WHERE p.id = rec.loser_id;

    multiplier := public.elo_margin_multiplier(rec.score);
    IF multiplier = 0 THEN CONTINUE; END IF;

    expected := 1.0 / (1.0 + power(10.0, (loser_rating - winner_rating) / 400.0));
    delta := round(k_factor * multiplier * (1.0 - expected));

    deltas := jsonb_set(deltas, ARRAY[rec.winner_id::text],
      to_jsonb(COALESCE((deltas ->> rec.winner_id::text)::int, 0) + delta));
    deltas := jsonb_set(deltas, ARRAY[rec.loser_id::text],
      to_jsonb(COALESCE((deltas ->> rec.loser_id::text)::int, 0) - delta));
  END LOOP;

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

-- auto_create_visitor_payment : utilise round_id
CREATE OR REPLACE FUNCTION public.auto_create_visitor_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_visitor boolean;
  v_club_id uuid;
  v_visitor_fee numeric(10,2);
  v_round_id uuid;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.player_status
    WHERE profile_id = NEW.profile_id AND status = 'visitor'
  ) INTO v_is_visitor;

  IF NOT v_is_visitor THEN
    RETURN NEW;
  END IF;

  -- Trouver le round actif ou le plus récent de la série
  SELECT er.id, c.id, c.visitor_fee
  INTO v_round_id, v_club_id, v_visitor_fee
  FROM public.events e
  JOIN public.clubs c ON c.id = e.club_id
  JOIN public.event_rounds er ON er.event_id = e.id
  WHERE e.id = NEW.event_id
  ORDER BY
    CASE er.status WHEN 'active' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END,
    er.round_number DESC
  LIMIT 1;

  IF v_round_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.payments (profile_id, round_id, amount, status)
  VALUES (NEW.profile_id, v_round_id, COALESCE(v_visitor_fee, 0), 'unpaid')
  ON CONFLICT (profile_id, round_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- cleanup_absences_on_event_complete : fonctionne maintenant sur event_rounds
CREATE OR REPLACE FUNCTION public.cleanup_absences_on_event_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    DELETE FROM public.absences
    WHERE round_id IS NULL
      AND absent_date BETWEEN NEW.start_date AND NEW.end_date
      AND profile_id IN (
        SELECT profile_id FROM public.event_players WHERE event_id = NEW.event_id
      );
  END IF;
  RETURN NEW;
END;
$$;

-- auto_elo_on_event_complete : fonctionne sur event_rounds
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

-- ===================================
-- ÉTAPE 10 : TRIGGERS SUR EVENT_ROUNDS
-- ===================================

DROP TRIGGER IF EXISTS trg_cleanup_absences_on_event_complete ON public.event_rounds;
CREATE TRIGGER trg_cleanup_absences_on_event_complete
  AFTER UPDATE ON public.event_rounds
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_absences_on_event_complete();

DROP TRIGGER IF EXISTS trg_auto_elo_on_event_complete ON public.event_rounds;
CREATE TRIGGER trg_auto_elo_on_event_complete
  AFTER UPDATE ON public.event_rounds
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_elo_on_event_complete();

-- ===================================
-- ÉTAPE 11 : RPC CREATE_NEW_ROUND
-- ===================================
-- Crée un nouveau round pour une série existante.
-- Copie la config du dernier round et décale les dates proportionnellement.
-- Crée automatiquement les paiements pour les visiteurs déjà inscrits.

CREATE OR REPLACE FUNCTION public.create_new_round(p_event_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_round   public.event_rounds%ROWTYPE;
  v_new_round_id uuid;
  v_new_number   int;
  v_duration     int;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Seuls les admins peuvent créer un nouveau round';
  END IF;

  -- Vérifier que la série appartient au club de l'admin
  IF NOT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = p_event_id AND e.club_id = public.get_user_club_id()
  ) AND NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Accès refusé à cette série';
  END IF;

  SELECT * INTO v_last_round
  FROM public.event_rounds
  WHERE event_id = p_event_id
  ORDER BY round_number DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aucun round trouvé pour cette série';
  END IF;

  v_new_number   := v_last_round.round_number + 1;
  v_new_round_id := gen_random_uuid();
  -- Durée du round précédent en jours (au moins 1)
  v_duration     := GREATEST(v_last_round.end_date - v_last_round.start_date + 1, 1);

  INSERT INTO public.event_rounds (
    id, event_id, round_number,
    start_date, end_date,
    start_time, end_time,
    number_of_courts, estimated_match_duration,
    playing_dates, deadline, status
  )
  VALUES (
    v_new_round_id,
    p_event_id,
    v_new_number,
    v_last_round.end_date + 1,
    v_last_round.end_date + v_duration,
    v_last_round.start_time,
    v_last_round.end_time,
    v_last_round.number_of_courts,
    v_last_round.estimated_match_duration,
    NULL,
    NULL,
    'upcoming'
  );

  -- Créer un paiement unpaid pour chaque visiteur déjà inscrit à la série
  INSERT INTO public.payments (profile_id, round_id, amount, status)
  SELECT
    ep.profile_id,
    v_new_round_id,
    COALESCE(c.visitor_fee, 0),
    'unpaid'
  FROM public.event_players ep
  JOIN public.events e ON e.id = ep.event_id
  JOIN public.clubs c ON c.id = e.club_id
  WHERE ep.event_id = p_event_id
    AND EXISTS (
      SELECT 1 FROM public.player_status ps
      WHERE ps.profile_id = ep.profile_id AND ps.status = 'visitor'
    )
  ON CONFLICT (profile_id, round_id) DO NOTHING;

  RETURN json_build_object(
    'success', true,
    'round_id', v_new_round_id,
    'round_number', v_new_number
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_new_round TO authenticated;

-- ===================================
-- ÉTAPE 12 : NOUVELLE VUE ADMIN_EVENT_PLAYERS_VIEW
-- ===================================

CREATE OR REPLACE VIEW public.admin_event_players_view AS
SELECT
  e.id           AS event_id,
  e.event_name,
  er.id          AS round_id,
  er.round_number,
  g.group_name   AS table_number,
  p.id           AS player_id,
  p.first_name,
  p.last_name,
  p.avatar_url,
  p.power_ranking,
  au.email,
  au.phone,
  s.arrival,
  s.departure,
  array_agg(DISTINCT a.absent_date ORDER BY a.absent_date) AS absences,
  array_agg(DISTINCT ps.status)                            AS player_statuses,
  pay.status                                               AS payment_status,
  pay.amount                                               AS payment_amount
FROM public.events e
LEFT JOIN public.event_rounds er ON er.event_id = e.id
LEFT JOIN public.groups g ON g.round_id = er.id
LEFT JOIN public.group_players gp ON gp.group_id = g.id
LEFT JOIN public.profiles p ON p.id = gp.profile_id
LEFT JOIN auth.users au ON au.id = p.id
LEFT JOIN public.schedule s ON s.profile_id = p.id AND s.event_id IS NULL
LEFT JOIN public.absences a ON a.profile_id = p.id AND a.round_id = er.id
LEFT JOIN public.player_status ps ON ps.profile_id = p.id
LEFT JOIN public.payments pay ON pay.profile_id = p.id AND pay.round_id = er.id
GROUP BY
  e.id, e.event_name, er.id, er.round_number,
  g.group_name, p.id, p.first_name, p.last_name,
  p.avatar_url, p.power_ranking, au.email, au.phone,
  s.arrival, s.departure, pay.status, pay.amount;

-- ===================================
-- ÉTAPE 13 : INDEX
-- ===================================

CREATE INDEX IF NOT EXISTS idx_event_rounds_event_id ON public.event_rounds(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rounds_status   ON public.event_rounds(status);
CREATE INDEX IF NOT EXISTS idx_groups_round_id       ON public.groups(round_id);
CREATE INDEX IF NOT EXISTS idx_event_courts_round_id ON public.event_courts(round_id);
CREATE INDEX IF NOT EXISTS idx_payments_round_id     ON public.payments(round_id);
CREATE INDEX IF NOT EXISTS idx_absences_round_id     ON public.absences(round_id);

-- Supprimer les anciens index devenus obsolètes
DROP INDEX IF EXISTS public.idx_groups_event_id;
DROP INDEX IF EXISTS public.idx_event_courts_event_id;
