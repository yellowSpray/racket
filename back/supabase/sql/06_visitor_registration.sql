-- ===================================
-- MIGRATION : Inscription visiteur cross-club
-- Permet aux joueurs de decouvrir et demander a rejoindre
-- des evenements d'autres clubs en tant que visiteur
-- ===================================

-- ===================================
-- 1. ENUM ET TABLE
-- ===================================

CREATE TYPE visitor_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TABLE IF NOT EXISTS public.visitor_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status visitor_request_status NOT NULL DEFAULT 'pending',
  message text,                                          -- message optionnel du demandeur
  reviewed_by uuid REFERENCES public.profiles(id),       -- admin qui a traite la demande
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, profile_id)                           -- une seule demande par joueur par event
);

CREATE INDEX IF NOT EXISTS idx_visitor_requests_event_id ON public.visitor_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_visitor_requests_profile_id ON public.visitor_requests(profile_id);
CREATE INDEX IF NOT EXISTS idx_visitor_requests_status ON public.visitor_requests(status);

-- ===================================
-- 2. NOUVELLES COLONNES SUR EVENTS
-- ===================================

-- Flag pour rendre un event visible aux joueurs d'autres clubs
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS open_to_visitors boolean NOT NULL DEFAULT false;

-- Token unique pour les liens de partage
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS invite_token uuid DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_invite_token ON public.events(invite_token);

-- ===================================
-- 3. POLITIQUES RLS - VISITOR_REQUESTS
-- ===================================

ALTER TABLE public.visitor_requests ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs voient leurs propres demandes
CREATE POLICY "Users can view own visitor requests"
ON public.visitor_requests FOR SELECT TO public
USING (auth.uid() = profile_id);

-- Les admins voient les demandes pour les events de leur club
CREATE POLICY "Admins can view club visitor requests"
ON public.visitor_requests FOR SELECT TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id = public.get_user_club_id()
  ))
);

-- Les utilisateurs peuvent creer des demandes pour des events ouverts d'autres clubs
CREATE POLICY "Users can create visitor requests"
ON public.visitor_requests FOR INSERT TO public
WITH CHECK (
  auth.uid() = profile_id
  AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id
      AND e.open_to_visitors = true
      AND e.club_id != public.get_user_club_id()
  )
);

-- Les utilisateurs peuvent annuler leurs demandes en attente
CREATE POLICY "Users can cancel own pending requests"
ON public.visitor_requests FOR UPDATE TO public
USING (auth.uid() = profile_id AND status = 'pending')
WITH CHECK (status = 'cancelled');

-- Les admins peuvent approuver/rejeter les demandes de leur club
CREATE POLICY "Admins can review visitor requests"
ON public.visitor_requests FOR UPDATE TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id = public.get_user_club_id()
  ))
);

-- ===================================
-- 4. MISE A JOUR RLS EVENTS (SELECT)
-- Ajouter la visibilite des events ouverts aux visiteurs
-- ===================================

-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "Users can select their club events" ON public.events;

-- Nouvelle politique : events du club + events ouverts aux visiteurs
CREATE POLICY "Users can select visible events"
ON public.events FOR SELECT TO public
USING (
  public.is_superadmin()
  OR club_id = public.get_user_club_id()
  OR open_to_visitors = true
);

-- ===================================
-- 5. FONCTIONS RPC
-- ===================================

-- 5.1 Demander a rejoindre un event comme visiteur
CREATE OR REPLACE FUNCTION public.request_visitor_registration(
  p_event_id uuid,
  p_message text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_user_club_id uuid;
  v_event_club_id uuid;
  v_club_open boolean;
  v_existing_status visitor_request_status;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non authentifie');
  END IF;

  -- Club du joueur
  SELECT club_id INTO v_user_club_id FROM public.profiles WHERE id = v_user_id;

  -- Infos de l'event + club
  SELECT e.club_id, c.open_to_visitors INTO v_event_club_id, v_club_open
  FROM public.events e
  JOIN public.clubs c ON c.id = e.club_id
  WHERE e.id = p_event_id;

  IF v_event_club_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Evenement introuvable');
  END IF;

  -- Pas son propre club
  IF v_user_club_id = v_event_club_id THEN
    RETURN json_build_object('success', false, 'error', 'Vous etes deja membre de ce club');
  END IF;

  -- Club ouvert aux visiteurs
  IF NOT v_club_open THEN
    RETURN json_build_object('success', false, 'error', 'Ce club n''accepte pas les visiteurs');
  END IF;

  -- Verifier s'il y a deja une demande active
  SELECT status INTO v_existing_status
  FROM public.visitor_requests
  WHERE event_id = p_event_id AND profile_id = v_user_id;

  IF v_existing_status IS NOT NULL AND v_existing_status IN ('pending', 'approved') THEN
    RETURN json_build_object('success', false, 'error', 'Vous avez deja une demande pour cet evenement');
  END IF;

  -- Creer ou re-soumettre la demande (si precedemment rejetee/annulee)
  INSERT INTO public.visitor_requests (event_id, profile_id, status, message)
  VALUES (p_event_id, v_user_id, 'pending', p_message)
  ON CONFLICT (event_id, profile_id)
  DO UPDATE SET
    status = 'pending',
    message = p_message,
    updated_at = now(),
    reviewed_by = NULL,
    reviewed_at = NULL;

  RETURN json_build_object('success', true, 'message', 'Demande envoyee');
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_visitor_registration TO authenticated;

-- 5.2 Approuver ou rejeter une demande (admin)
CREATE OR REPLACE FUNCTION public.review_visitor_request(
  p_request_id uuid,
  p_decision text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request record;
  v_visitor_fee numeric(10,2);
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'error', 'Acces refuse');
  END IF;

  IF p_decision NOT IN ('approved', 'rejected') THEN
    RETURN json_build_object('success', false, 'error', 'Decision invalide');
  END IF;

  -- Recuperer la demande et verifier qu'elle appartient au club de l'admin
  SELECT vr.*, e.club_id AS event_club_id
  INTO v_request
  FROM public.visitor_requests vr
  JOIN public.events e ON e.id = vr.event_id
  WHERE vr.id = p_request_id;

  IF v_request IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Demande introuvable');
  END IF;

  IF v_request.event_club_id != public.get_user_club_id() AND NOT public.is_superadmin() THEN
    RETURN json_build_object('success', false, 'error', 'Acces refuse');
  END IF;

  IF v_request.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Cette demande a deja ete traitee');
  END IF;

  -- Mettre a jour la demande
  UPDATE public.visitor_requests
  SET status = p_decision::visitor_request_status,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_request_id;

  -- Si approuvee : inscrire le joueur + creer le paiement
  IF p_decision = 'approved' THEN
    -- Ajouter aux event_players
    INSERT INTO public.event_players (event_id, profile_id)
    VALUES (v_request.event_id, v_request.profile_id)
    ON CONFLICT (event_id, profile_id) DO NOTHING;

    -- Ajouter le statut visitor
    INSERT INTO public.player_status (id, profile_id, status)
    VALUES (gen_random_uuid(), v_request.profile_id, 'visitor')
    ON CONFLICT DO NOTHING;

    -- Creer l'enregistrement de paiement avec le visitor_fee du club
    SELECT visitor_fee INTO v_visitor_fee
    FROM public.clubs WHERE id = v_request.event_club_id;

    INSERT INTO public.payments (id, profile_id, event_id, amount, status)
    VALUES (gen_random_uuid(), v_request.profile_id, v_request.event_id, COALESCE(v_visitor_fee, 0), 'unpaid')
    ON CONFLICT (profile_id, event_id) DO NOTHING;
  END IF;

  RETURN json_build_object('success', true, 'message',
    CASE WHEN p_decision = 'approved' THEN 'Demande approuvee' ELSE 'Demande rejetee' END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_visitor_request TO authenticated;

-- 5.3 Recuperer un event par son token d'invitation
CREATE OR REPLACE FUNCTION public.get_event_by_invite_token(p_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER STABLE
AS $$
DECLARE
  v_event record;
BEGIN
  SELECT e.id, e.event_name, e.description, e.start_date, e.end_date,
         c.open_to_visitors, e.status,
         c.club_name, c.visitor_fee
  INTO v_event
  FROM public.events e
  JOIN public.clubs c ON c.id = e.club_id
  WHERE e.invite_token = p_token;

  IF v_event IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Lien invalide');
  END IF;

  RETURN json_build_object(
    'success', true,
    'event', json_build_object(
      'id', v_event.id,
      'event_name', v_event.event_name,
      'description', v_event.description,
      'start_date', v_event.start_date,
      'end_date', v_event.end_date,
      'open_to_visitors', v_event.open_to_visitors,
      'status', v_event.status,
      'club_name', v_event.club_name,
      'visitor_fee', v_event.visitor_fee
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_by_invite_token TO authenticated;
