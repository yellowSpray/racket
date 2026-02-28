-- ===================================
-- 04 - MIGRATION MULTI-CLUB
-- ===================================
-- Ce script ajoute l'isolation multi-club aux donnees existantes.
-- A executer MANUELLEMENT dans Supabase SQL Editor apres deploiement.

-- ===================================
-- ETAPE 1 : NOUVELLES FONCTIONS HELPERS
-- ===================================

-- Fonction pour verifier si l'utilisateur est superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  );
END;
$$;

-- Fonction pour recuperer le club_id de l'utilisateur connecte
CREATE OR REPLACE FUNCTION public.get_user_club_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN (SELECT club_id FROM public.profiles WHERE id = auth.uid());
END;
$$;

-- Marquer is_admin() comme STABLE (optimisation)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  );
END;
$$;

-- ===================================
-- ETAPE 2 : AJOUTER club_id A EVENTS
-- ===================================

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_events_club_id ON public.events(club_id);

-- Assigner tous les events existants au club
UPDATE public.events SET club_id = 'f1a1a082-3b7d-4c2f-9cf3-29826750f121' WHERE club_id IS NULL;

-- ===================================
-- ETAPE 3 : METTRE A JOUR LES POLICIES RLS
-- ===================================

-- --- PROFILES ---
DROP POLICY IF EXISTS "Admins can select all profiles" ON public.profiles;
CREATE POLICY "Admins can select club profiles"
ON public.profiles FOR SELECT TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND club_id = public.get_user_club_id())
);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update club profiles"
ON public.profiles FOR UPDATE TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND club_id = public.get_user_club_id())
);

DROP POLICY IF EXISTS "Admins can insert any profile" ON public.profiles;
CREATE POLICY "Admins can insert club profiles"
ON public.profiles FOR INSERT TO public
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND club_id = public.get_user_club_id())
);

-- --- EVENTS ---
DROP POLICY IF EXISTS "Everyone can select events" ON public.events;
CREATE POLICY "Users can select their club events"
ON public.events FOR SELECT TO public
USING (
  public.is_superadmin()
  OR club_id = public.get_user_club_id()
);

DROP POLICY IF EXISTS "Admins can insert events" ON public.events;
CREATE POLICY "Admins can insert club events"
ON public.events FOR INSERT TO public
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND club_id = public.get_user_club_id())
);

DROP POLICY IF EXISTS "Admins can update events" ON public.events;
CREATE POLICY "Admins can update club events"
ON public.events FOR UPDATE TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND club_id = public.get_user_club_id())
);

DROP POLICY IF EXISTS "Admins can delete events" ON public.events;
CREATE POLICY "Admins can delete club events"
ON public.events FOR DELETE TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND club_id = public.get_user_club_id())
);

-- --- GROUPS (scoped via events.club_id) ---
DROP POLICY IF EXISTS "Everyone can select groups" ON public.groups;
CREATE POLICY "Users can select their club groups"
ON public.groups FOR SELECT TO public
USING (
  public.is_superadmin()
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id = public.get_user_club_id()
  )
);

DROP POLICY IF EXISTS "Admins can insert groups" ON public.groups;
CREATE POLICY "Admins can insert club groups"
ON public.groups FOR INSERT TO public
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id = public.get_user_club_id()
  ))
);

DROP POLICY IF EXISTS "Admins can update groups" ON public.groups;
CREATE POLICY "Admins can update club groups"
ON public.groups FOR UPDATE TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id = public.get_user_club_id()
  ))
);

DROP POLICY IF EXISTS "Admins can delete groups" ON public.groups;
CREATE POLICY "Admins can delete club groups"
ON public.groups FOR DELETE TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id = public.get_user_club_id()
  ))
);

-- --- GROUP_PLAYERS (scoped via group -> event -> club) ---
DROP POLICY IF EXISTS "Users can see their own group membership" ON public.group_players;
CREATE POLICY "Users can see club group memberships"
ON public.group_players FOR SELECT TO public
USING (
  auth.uid() = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.events e ON e.id = g.event_id
    WHERE g.id = group_id AND e.club_id = public.get_user_club_id()
  ))
);

DROP POLICY IF EXISTS "Admins can insert any group player" ON public.group_players;
CREATE POLICY "Admins can insert club group players"
ON public.group_players FOR INSERT TO public
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.events e ON e.id = g.event_id
    WHERE g.id = group_id AND e.club_id = public.get_user_club_id()
  ))
);

DROP POLICY IF EXISTS "Admins can delete any group player" ON public.group_players;
CREATE POLICY "Admins can delete club group players"
ON public.group_players FOR DELETE TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.events e ON e.id = g.event_id
    WHERE g.id = group_id AND e.club_id = public.get_user_club_id()
  ))
);

-- --- MATCHES (scoped via group -> event -> club) ---
DROP POLICY IF EXISTS "Users can see their own matches" ON public.matches;
CREATE POLICY "Users can see club matches"
ON public.matches FOR SELECT TO public
USING (
  auth.uid() IN (player1_id, player2_id)
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.events e ON e.id = g.event_id
    WHERE g.id = group_id AND e.club_id = public.get_user_club_id()
  ))
);

DROP POLICY IF EXISTS "Admins can insert matches" ON public.matches;
CREATE POLICY "Admins can insert club matches"
ON public.matches FOR INSERT TO public
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.events e ON e.id = g.event_id
    WHERE g.id = group_id AND e.club_id = public.get_user_club_id()
  ))
);

DROP POLICY IF EXISTS "Admins can update matches" ON public.matches;
CREATE POLICY "Admins can update club matches"
ON public.matches FOR UPDATE TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.events e ON e.id = g.event_id
    WHERE g.id = group_id AND e.club_id = public.get_user_club_id()
  ))
);

DROP POLICY IF EXISTS "Admins can delete matches" ON public.matches;
CREATE POLICY "Admins can delete club matches"
ON public.matches FOR DELETE TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.events e ON e.id = g.event_id
    WHERE g.id = group_id AND e.club_id = public.get_user_club_id()
  ))
);

-- --- EVENT_PLAYERS (scoped via event -> club) ---
DROP POLICY IF EXISTS "Users can see their own event registrations" ON public.event_players;
CREATE POLICY "Users can see club event registrations"
ON public.event_players FOR SELECT TO public
USING (
  auth.uid() = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id = public.get_user_club_id()
  ))
);

DROP POLICY IF EXISTS "Users can register themselves" ON public.event_players;
CREATE POLICY "Users can register to club events"
ON public.event_players FOR INSERT TO public
WITH CHECK (
  (auth.uid() = profile_id AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id = public.get_user_club_id()
  ))
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id = public.get_user_club_id()
  ))
);

DROP POLICY IF EXISTS "Users can unregister themselves" ON public.event_players;
CREATE POLICY "Users can unregister from club events"
ON public.event_players FOR DELETE TO public
USING (
  (auth.uid() = profile_id)
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id = public.get_user_club_id()
  ))
);

-- --- SCHEDULE (scoped via profile -> club) ---
DROP POLICY IF EXISTS "Users can select their own schedule" ON public.schedule;
CREATE POLICY "Users can select club schedules"
ON public.schedule FOR SELECT TO public
USING (
  auth.uid() = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

DROP POLICY IF EXISTS "Admins can insert any schedule" ON public.schedule;
CREATE POLICY "Admins can insert club schedules"
ON public.schedule FOR INSERT TO public
WITH CHECK (
  auth.uid() = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

DROP POLICY IF EXISTS "Admins can update any schedule" ON public.schedule;
CREATE POLICY "Admins can update club schedules"
ON public.schedule FOR UPDATE TO public
USING (
  auth.uid() = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

-- Remove duplicate user policies that are now covered above
DROP POLICY IF EXISTS "Users can insert their own schedule" ON public.schedule;
DROP POLICY IF EXISTS "Users can update their own schedule" ON public.schedule;

-- --- ABSENCES (scoped via profile -> club) ---
DROP POLICY IF EXISTS "Users can select their own absences" ON public.absences;
CREATE POLICY "Users can select club absences"
ON public.absences FOR SELECT TO public
USING (
  auth.uid() = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

DROP POLICY IF EXISTS "Admins can insert any absence" ON public.absences;
DROP POLICY IF EXISTS "Users can insert their own absences" ON public.absences;
CREATE POLICY "Users and admins can insert club absences"
ON public.absences FOR INSERT TO public
WITH CHECK (
  auth.uid() = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

DROP POLICY IF EXISTS "Admins can delete any absence" ON public.absences;
DROP POLICY IF EXISTS "Users can delete their own absences" ON public.absences;
CREATE POLICY "Users and admins can delete club absences"
ON public.absences FOR DELETE TO public
USING (
  auth.uid() = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

-- --- PLAYER_STATUS (scoped via profile -> club) ---
DROP POLICY IF EXISTS "Users can view their own status" ON public.player_status;
CREATE POLICY "Users can view club player statuses"
ON public.player_status FOR SELECT TO public
USING (
  auth.uid() = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

DROP POLICY IF EXISTS "Admins can insert any status" ON public.player_status;
CREATE POLICY "Admins can insert club player statuses"
ON public.player_status FOR INSERT TO public
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

DROP POLICY IF EXISTS "Admins can update any status" ON public.player_status;
CREATE POLICY "Admins can update club player statuses"
ON public.player_status FOR UPDATE TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

DROP POLICY IF EXISTS "Admins can delete any status" ON public.player_status;
CREATE POLICY "Admins can delete club player statuses"
ON public.player_status FOR DELETE TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

-- --- PAYMENTS (scoped via profile -> club) ---
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view club payments"
ON public.payments FOR SELECT TO public
USING (
  auth.uid() = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

DROP POLICY IF EXISTS "Admins can insert or update any payments" ON public.payments;
CREATE POLICY "Admins can manage club payments"
ON public.payments FOR ALL TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);
