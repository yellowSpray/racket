-- ===================================
-- MIGRATION : Accès visiteurs au niveau club
-- Déplace le toggle open_to_visitors de la table events vers clubs
-- ===================================

-- 1. Ajouter la colonne au niveau club
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS open_to_visitors boolean NOT NULL DEFAULT false;

-- 2. Mettre à jour la RLS events SELECT
DROP POLICY IF EXISTS "Users can select visible events" ON public.events;

CREATE POLICY "Users can select visible events"
ON public.events FOR SELECT TO public
USING (
  public.is_superadmin()
  OR club_id = public.get_user_club_id()
  OR EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = club_id AND c.open_to_visitors = true
  )
);

-- 3. Mettre à jour la RLS visitor_requests INSERT
DROP POLICY IF EXISTS "Users can create visitor requests" ON public.visitor_requests;

CREATE POLICY "Users can create visitor requests"
ON public.visitor_requests FOR INSERT TO public
WITH CHECK (
  auth.uid() = profile_id
  AND EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.clubs c ON c.id = e.club_id
    WHERE e.id = event_id
      AND c.open_to_visitors = true
      AND e.club_id != public.get_user_club_id()
  )
);
