-- ===================================
-- 15 - RÈGLES PAR ÉVÉNEMENT + TYPE DE CALENDRIER
-- ===================================
-- Ajoute la notion de règles de scoring et de promotion/relégation
-- au niveau de l'event (et non plus seulement au niveau du club).
-- Ajoute également le type de calendrier par défaut pour les rounds
-- d'un event.
--
-- ORDRE D'EXÉCUTION :
--   1. Ajouter calendar_type à events
--   2. Créer event_scoring_rules
--   3. Créer event_promotion_rules
--   4. Migrer les données depuis les règles du club
--   5. RLS et index

-- ===================================
-- ÉTAPE 1 : CALENDAR_TYPE SUR EVENTS
-- ===================================
-- 'day_selection' : l'admin choisit des dates précises pour chaque round (comportement actuel)
-- 'period'        : l'admin définit une plage start_date → end_date

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS calendar_type text NOT NULL DEFAULT 'day_selection'
  CHECK (calendar_type IN ('day_selection', 'period'));

COMMENT ON COLUMN public.events.calendar_type IS
  'Mode de sélection des dates des rounds : day_selection (dates précises) ou period (plage continue)';

-- ===================================
-- ÉTAPE 2 : TABLE EVENT_SCORING_RULES
-- ===================================
-- Règles de pointage spécifiques à un event (une ligne par event).
-- score_points est un tableau JSON : [{ score, winner_points, loser_points }, ...]
-- Si absent → on peut fallback sur les scoring_rules du club.

CREATE TABLE IF NOT EXISTS public.event_scoring_rules (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid    NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  score_points jsonb   NOT NULL DEFAULT '[
    {"score":"3-0","winner_points":5,"loser_points":0},
    {"score":"3-1","winner_points":4,"loser_points":1},
    {"score":"3-2","winner_points":3,"loser_points":2},
    {"score":"ABS","winner_points":3,"loser_points":-1}
  ]'::jsonb,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (event_id)
);

COMMENT ON TABLE public.event_scoring_rules IS
  'Règles de pointage par event. Prend le dessus sur les scoring_rules du club.';

-- ===================================
-- ÉTAPE 3 : TABLE EVENT_PROMOTION_RULES
-- ===================================
-- Règles de promotion/relégation spécifiques à un event (une ligne par event).
-- Si absent → on peut fallback sur les promotion_rules du club.

CREATE TABLE IF NOT EXISTS public.event_promotion_rules (
  id              uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid  NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  promoted_count  int   NOT NULL DEFAULT 1 CHECK (promoted_count >= 0),
  relegated_count int   NOT NULL DEFAULT 1 CHECK (relegated_count >= 0),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (event_id)
);

COMMENT ON TABLE public.event_promotion_rules IS
  'Règles de promotion/relégation par event. Prend le dessus sur les promotion_rules du club.';

-- ===================================
-- ÉTAPE 4 : MIGRATION DES DONNÉES EXISTANTES
-- ===================================
-- Pour chaque event existant, on crée les règles à partir des règles du club
-- auquel l'event appartient (si disponibles), sinon on utilise les valeurs par défaut.

-- event_scoring_rules : copier depuis scoring_rules du club
INSERT INTO public.event_scoring_rules (event_id, score_points)
SELECT
  e.id AS event_id,
  COALESCE(sr.score_points, '[
    {"score":"3-0","winner_points":5,"loser_points":0},
    {"score":"3-1","winner_points":4,"loser_points":1},
    {"score":"3-2","winner_points":3,"loser_points":2},
    {"score":"ABS","winner_points":3,"loser_points":-1}
  ]'::jsonb) AS score_points
FROM public.events e
LEFT JOIN public.scoring_rules sr ON sr.club_id = e.club_id
ON CONFLICT (event_id) DO NOTHING;

-- event_promotion_rules : copier depuis promotion_rules du club
INSERT INTO public.event_promotion_rules (event_id, promoted_count, relegated_count)
SELECT
  e.id AS event_id,
  COALESCE(pr.promoted_count, 1) AS promoted_count,
  COALESCE(pr.relegated_count, 1) AS relegated_count
FROM public.events e
LEFT JOIN public.promotion_rules pr ON pr.club_id = e.club_id
ON CONFLICT (event_id) DO NOTHING;

-- ===================================
-- ÉTAPE 5 : RLS
-- ===================================

ALTER TABLE public.event_scoring_rules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_promotion_rules ENABLE ROW LEVEL SECURITY;

-- event_scoring_rules : SELECT public (admins + users du même club)
CREATE POLICY "event_scoring_rules_select" ON public.event_scoring_rules
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.profiles p ON p.club_id = e.club_id
      WHERE e.id = event_scoring_rules.event_id
        AND p.id = auth.uid()
    )
  );

-- event_scoring_rules : INSERT/UPDATE/DELETE réservés aux admins du club
CREATE POLICY "event_scoring_rules_insert" ON public.event_scoring_rules
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.profiles p ON p.club_id = e.club_id
      WHERE e.id = event_scoring_rules.event_id
        AND p.id = auth.uid()
        AND p.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "event_scoring_rules_update" ON public.event_scoring_rules
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.profiles p ON p.club_id = e.club_id
      WHERE e.id = event_scoring_rules.event_id
        AND p.id = auth.uid()
        AND p.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "event_scoring_rules_delete" ON public.event_scoring_rules
  FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.profiles p ON p.club_id = e.club_id
      WHERE e.id = event_scoring_rules.event_id
        AND p.id = auth.uid()
        AND p.role IN ('admin', 'superadmin')
    )
  );

-- event_promotion_rules : SELECT public
CREATE POLICY "event_promotion_rules_select" ON public.event_promotion_rules
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.profiles p ON p.club_id = e.club_id
      WHERE e.id = event_promotion_rules.event_id
        AND p.id = auth.uid()
    )
  );

-- event_promotion_rules : INSERT/UPDATE/DELETE réservés aux admins
CREATE POLICY "event_promotion_rules_insert" ON public.event_promotion_rules
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.profiles p ON p.club_id = e.club_id
      WHERE e.id = event_promotion_rules.event_id
        AND p.id = auth.uid()
        AND p.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "event_promotion_rules_update" ON public.event_promotion_rules
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.profiles p ON p.club_id = e.club_id
      WHERE e.id = event_promotion_rules.event_id
        AND p.id = auth.uid()
        AND p.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "event_promotion_rules_delete" ON public.event_promotion_rules
  FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.profiles p ON p.club_id = e.club_id
      WHERE e.id = event_promotion_rules.event_id
        AND p.id = auth.uid()
        AND p.role IN ('admin', 'superadmin')
    )
  );

-- ===================================
-- ÉTAPE 6 : INDEX
-- ===================================

CREATE INDEX IF NOT EXISTS idx_event_scoring_rules_event_id
  ON public.event_scoring_rules(event_id);

CREATE INDEX IF NOT EXISTS idx_event_promotion_rules_event_id
  ON public.event_promotion_rules(event_id);
