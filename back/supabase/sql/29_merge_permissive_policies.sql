-- ===========================================================================
-- 29 - FUSIONNER LES POLICIES PERMISSIVES QUI SE CUMULENT
-- ===========================================================================
--
-- L'advisor Supabase signale « Multiple Permissive Policies » sur neuf
-- couples table + commande. Deux policies permissives couvrant la meme
-- commande sont toutes deux evaluees, pour chaque ligne examinee.
--
-- La fusion est exacte, et c'est ce qui la rend sure : pour des policies
-- permissives, PostgreSQL combine en OU les clauses USING entre elles, et
-- separement en OU les clauses WITH CHECK entre elles. Une policy unique
-- portant USING (u1 OR u2) et WITH CHECK (c1 OR c2) se comporte donc
-- exactement comme les deux policies qu'elle remplace.
--
-- Deux details a ne pas manquer, tous deux verifies :
--
--   1. Une policy sans WITH CHECK explicite reutilise son USING comme
--      controle d'ecriture. C'est le cas de « Admins can manage club
--      payments », de « Admins can update club profiles » et de « Admins can
--      review visitor requests ». La fusion doit donc ecrire ce controle noir
--      sur blanc, sans quoi les admins perdent le droit d'ecrire.
--
--   2. `payments` portait une policy FOR ALL a cote d'une policy SELECT. FOR
--      ALL couvre les quatre commandes, donc le cumul portait sur la lecture.
--      Elle est remplacee par trois policies d'ecriture, une par commande,
--      plus la policy de lecture qui absorbe les deux anciennes.
--
-- Les policies restent declarees TO public, comme les autres tables. Les
-- basculer sur `authenticated` eviterait une evaluation inutile pour les
-- visiteurs non connectes, mais ce n'est pas necessaire pour lever
-- l'avertissement, et cela demanderait de passer en revue toutes les routes
-- publiques. A traiter separement si le besoin s'en fait sentir.
--
-- Verifie sur PostgreSQL 16 : vingt-huit scenarios joues avant et apres, en
-- tant qu'admin du club A, admin du club B, joueur de chaque club et
-- superadmin. Resultats identiques ligne a ligne.
--
-- Ce fichier est rejouable.
-- ===========================================================================


-- ===========================================================================
-- A. PAYMENTS
-- ===========================================================================

DROP POLICY IF EXISTS "Users can view club payments"    ON public.payments;
DROP POLICY IF EXISTS "Admins can manage club payments" ON public.payments;
DROP POLICY IF EXISTS "payments_select" ON public.payments;
DROP POLICY IF EXISTS "payments_insert" ON public.payments;
DROP POLICY IF EXISTS "payments_update" ON public.payments;
DROP POLICY IF EXISTS "payments_delete" ON public.payments;

-- Lecture : son propre paiement, ou ceux des joueurs de son club pour un admin.
CREATE POLICY "payments_select" ON public.payments FOR SELECT TO public
USING (
  (select auth.uid()) = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
        SELECT 1 FROM public.profiles p
         WHERE p.id = payments.profile_id
           AND p.club_id = public.get_user_club_id()))
);

-- Ecritures : reservees a l'administration du club concerne.
CREATE POLICY "payments_insert" ON public.payments FOR INSERT TO public
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
        SELECT 1 FROM public.profiles p
         WHERE p.id = payments.profile_id
           AND p.club_id = public.get_user_club_id()))
);

CREATE POLICY "payments_update" ON public.payments FOR UPDATE TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
        SELECT 1 FROM public.profiles p
         WHERE p.id = payments.profile_id
           AND p.club_id = public.get_user_club_id()))
)
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
        SELECT 1 FROM public.profiles p
         WHERE p.id = payments.profile_id
           AND p.club_id = public.get_user_club_id()))
);

CREATE POLICY "payments_delete" ON public.payments FOR DELETE TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
        SELECT 1 FROM public.profiles p
         WHERE p.id = payments.profile_id
           AND p.club_id = public.get_user_club_id()))
);


-- ===========================================================================
-- B. PROFILE_SPORTS
-- ===========================================================================

DROP POLICY IF EXISTS "Admins can select club profile sports" ON public.profile_sports;
DROP POLICY IF EXISTS "Users can select their own sports"     ON public.profile_sports;
DROP POLICY IF EXISTS "Admins can insert club profile sports" ON public.profile_sports;
DROP POLICY IF EXISTS "Users can insert their own sports"     ON public.profile_sports;
DROP POLICY IF EXISTS "Admins can delete club profile sports" ON public.profile_sports;
DROP POLICY IF EXISTS "Users can delete their own sports"     ON public.profile_sports;
DROP POLICY IF EXISTS "profile_sports_select" ON public.profile_sports;
DROP POLICY IF EXISTS "profile_sports_insert" ON public.profile_sports;
DROP POLICY IF EXISTS "profile_sports_delete" ON public.profile_sports;

CREATE POLICY "profile_sports_select" ON public.profile_sports FOR SELECT TO public
USING (
  (select auth.uid()) = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
        SELECT 1 FROM public.profiles p
         WHERE p.id = profile_sports.profile_id
           AND p.club_id = public.get_user_club_id()))
);

CREATE POLICY "profile_sports_insert" ON public.profile_sports FOR INSERT TO public
WITH CHECK (
  (select auth.uid()) = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
        SELECT 1 FROM public.profiles p
         WHERE p.id = profile_sports.profile_id
           AND p.club_id = public.get_user_club_id()))
);

CREATE POLICY "profile_sports_delete" ON public.profile_sports FOR DELETE TO public
USING (
  (select auth.uid()) = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
        SELECT 1 FROM public.profiles p
         WHERE p.id = profile_sports.profile_id
           AND p.club_id = public.get_user_club_id()))
);


-- ===========================================================================
-- C. PROFILES
-- ===========================================================================
-- La policy de modification est celle laissee par la migration 27 : la garde
-- sur la colonne `role` vit desormais dans les privileges, plus dans une
-- sous-requete. La policy admin, elle, n'avait pas de WITH CHECK explicite ;
-- son USING en tenait lieu, d'ou sa reprise des deux cotes.
-- La policy DELETE est seule sur sa commande et n'est pas touchee.

DROP POLICY IF EXISTS "Admins can select club profiles"     ON public.profiles;
DROP POLICY IF EXISTS "Users can select relevant profiles"  ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert club profiles"     ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their profile"      ON public.profiles;
DROP POLICY IF EXISTS "Admins can update club profiles"     ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

-- Lecture : soi-meme, ses partenaires de box, les inscrits de ses evenements,
-- et pour un admin les membres de son club.
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO public
USING (
  (select auth.uid()) = id
  OR id IN (
       SELECT gp2.profile_id
         FROM public.group_players gp2
         JOIN public.groups g2 ON g2.id = gp2.group_id
        WHERE g2.round_id IN (
              SELECT g.round_id
                FROM public.group_players gp
                JOIN public.groups g ON g.id = gp.group_id
               WHERE gp.profile_id = (select auth.uid())))
  OR id IN (
       SELECT ep2.profile_id
         FROM public.event_players ep2
        WHERE ep2.event_id IN (
              SELECT ep.event_id
                FROM public.event_players ep
               WHERE ep.profile_id = (select auth.uid())))
  OR public.is_superadmin()
  OR (public.is_admin() AND club_id = public.get_user_club_id())
);

CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO public
WITH CHECK (
  (select auth.uid()) = id
  OR public.is_superadmin()
  OR (public.is_admin() AND club_id = public.get_user_club_id())
);

CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO public
USING (
  (select auth.uid()) = id
  OR public.is_superadmin()
  OR (public.is_admin() AND club_id = public.get_user_club_id())
)
WITH CHECK (
  (select auth.uid()) = id
  OR public.is_superadmin()
  OR (public.is_admin() AND club_id = public.get_user_club_id())
);


-- ===========================================================================
-- D. VISITOR_REQUESTS
-- ===========================================================================
-- La policy INSERT est seule sur sa commande et n'est pas touchee.
-- En modification, l'admin peut poser n'importe quel statut, le joueur
-- uniquement `cancelled` et seulement sur une demande encore en attente. Les
-- deux conditions de visibilite et les deux controles d'ecriture sont mis en
-- OU separement, ce qui reproduit exactement le comportement actuel.

DROP POLICY IF EXISTS "Admins can view club visitor requests" ON public.visitor_requests;
DROP POLICY IF EXISTS "Users can view own visitor requests"   ON public.visitor_requests;
DROP POLICY IF EXISTS "Admins can review visitor requests"    ON public.visitor_requests;
DROP POLICY IF EXISTS "Users can cancel own pending requests" ON public.visitor_requests;
DROP POLICY IF EXISTS "visitor_requests_select" ON public.visitor_requests;
DROP POLICY IF EXISTS "visitor_requests_update" ON public.visitor_requests;

CREATE POLICY "visitor_requests_select" ON public.visitor_requests FOR SELECT TO public
USING (
  (select auth.uid()) = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
        SELECT 1 FROM public.events e
         WHERE e.id = visitor_requests.event_id
           AND e.club_id = public.get_user_club_id()))
);

CREATE POLICY "visitor_requests_update" ON public.visitor_requests FOR UPDATE TO public
USING (
  ((select auth.uid()) = profile_id AND status = 'pending'::visitor_request_status)
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
        SELECT 1 FROM public.events e
         WHERE e.id = visitor_requests.event_id
           AND e.club_id = public.get_user_club_id()))
)
WITH CHECK (
  status = 'cancelled'::visitor_request_status
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
        SELECT 1 FROM public.events e
         WHERE e.id = visitor_requests.event_id
           AND e.club_id = public.get_user_club_id()))
);


-- ===========================================================================
-- Verification
-- ===========================================================================
-- Doit rendre zero ligne : plus aucune commande couverte par deux policies
-- permissives.
--
--   with developpees as (
--     select tablename, policyname,
--            unnest(case cmd when 'ALL'
--                   then array['SELECT','INSERT','UPDATE','DELETE']
--                   else array[cmd] end) as cmd
--       from pg_policies
--      where schemaname = 'public' and permissive = 'PERMISSIVE'
--   )
--   select tablename, cmd, count(*)
--     from developpees
--    group by tablename, cmd
--   having count(*) > 1;
--
-- ===========================================================================
