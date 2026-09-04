-- ===========================================================================
-- 24 - UN ADMIN N'AGIT QUE SUR SON CLUB
-- ===========================================================================
--
-- `is_admin()` repond « cette personne est admin quelque part », jamais
-- « admin de ce club » :
--
--     RETURN EXISTS (SELECT 1 FROM public.profiles
--                    WHERE id = auth.uid() AND role IN ('admin','superadmin'));
--
-- Partout ou elle etait employee seule, la separation entre clubs tombait.
-- Un admin du club A pouvait modifier et supprimer le club B, lire et ecrire
-- les inscriptions de ses evenements, et toucher aux sports de ses joueurs.
--
-- Ce fichier cadre chaque droit admin sur le club de l'admin, et reserve au
-- superadmin ce qui est global par nature : creer ou supprimer un club, et
-- modifier la table de reference `sports`, partagee par tous les clubs.
--
-- Deux pieges rencontres en l'ecrivant :
--
--   1. Les policies permissives se combinent en OU. La policy
--      « Admins have full access to event_players », qui donnait les quatre
--      commandes a tout admin, annulait la policy voisine qui verifiait
--      pourtant le club. Une regle large posee a cote d'une regle stricte
--      rend la stricte inutile. Elle est supprimee, pas cadree.
--
--   2. Les inscriptions entre clubs ne passent pas par ces policies. Un
--      visiteur rejoint l'evenement d'un autre club via
--      `review_visitor_request`, en `security definer`, qui ecrit au-dessus
--      de la RLS. Cadrer l'insertion cliente ne ferme donc pas ce chemin.
--
-- Verifie sur PostgreSQL 16 sur quatorze scenarios, joues avant et apres, en
-- tant qu'admin du club A, admin du club B, joueur simple et superadmin.
--
-- Ce fichier est rejouable.
-- ===========================================================================


-- ===========================================================================
-- A. CLUBS
-- ===========================================================================
-- La lecture reste ouverte : la liste des clubs alimente le menu deroulant de
-- la page d'inscription, affichee avant toute connexion.
--
-- Creation et suppression deviennent l'affaire du superadmin. L'application
-- ne fait ni l'une ni l'autre, seules des lectures et la mise a jour des
-- reglages passent par elle.

DROP POLICY IF EXISTS "Admins can insert clubs" ON public.clubs;
DROP POLICY IF EXISTS "Superadmins can insert clubs" ON public.clubs;
CREATE POLICY "Superadmins can insert clubs"
ON public.clubs FOR INSERT TO public
WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "Admins can delete clubs" ON public.clubs;
DROP POLICY IF EXISTS "Superadmins can delete clubs" ON public.clubs;
CREATE POLICY "Superadmins can delete clubs"
ON public.clubs FOR DELETE TO public
USING (public.is_superadmin());

-- Modification : son propre club, ou n'importe lequel pour un superadmin.
-- Le WITH CHECK empeche de faire sortir la ligne de sa portee au passage.
DROP POLICY IF EXISTS "Admins can update clubs" ON public.clubs;
DROP POLICY IF EXISTS "Admins can update their own club" ON public.clubs;
CREATE POLICY "Admins can update their own club"
ON public.clubs FOR UPDATE TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND id = public.get_user_club_id())
)
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND id = public.get_user_club_id())
);


-- ===========================================================================
-- B. SPORTS
-- ===========================================================================
-- Table de reference partagee par tous les clubs. Supprimer un sport cascade
-- sur les profile_sports de tout le monde, ce n'est pas un droit d'admin de
-- club. La lecture reste ouverte, c'est une simple liste.

DROP POLICY IF EXISTS "Admins can insert sports" ON public.sports;
DROP POLICY IF EXISTS "Superadmins can insert sports" ON public.sports;
CREATE POLICY "Superadmins can insert sports"
ON public.sports FOR INSERT TO public
WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "Admins can update sports" ON public.sports;
DROP POLICY IF EXISTS "Superadmins can update sports" ON public.sports;
CREATE POLICY "Superadmins can update sports"
ON public.sports FOR UPDATE TO public
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "Admins can delete sports" ON public.sports;
DROP POLICY IF EXISTS "Superadmins can delete sports" ON public.sports;
CREATE POLICY "Superadmins can delete sports"
ON public.sports FOR DELETE TO public
USING (public.is_superadmin());


-- ===========================================================================
-- C. PROFILE_SPORTS
-- ===========================================================================
-- Les trois regles admin ne regardaient pas a quel club appartient le joueur
-- concerne. Elles le regardent maintenant. Les regles « ses propres sports »
-- restent inchangees.

DROP POLICY IF EXISTS "Admins can select all profile sports" ON public.profile_sports;
DROP POLICY IF EXISTS "Admins can select club profile sports" ON public.profile_sports;
CREATE POLICY "Admins can select club profile sports"
ON public.profile_sports FOR SELECT TO public
USING (
  public.is_superadmin()
  OR (
    public.is_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = profile_sports.profile_id
         AND p.club_id = public.get_user_club_id()
    )
  )
);

DROP POLICY IF EXISTS "Admins can insert any profile sports" ON public.profile_sports;
DROP POLICY IF EXISTS "Admins can insert club profile sports" ON public.profile_sports;
CREATE POLICY "Admins can insert club profile sports"
ON public.profile_sports FOR INSERT TO public
WITH CHECK (
  public.is_superadmin()
  OR (
    public.is_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = profile_sports.profile_id
         AND p.club_id = public.get_user_club_id()
    )
  )
);

DROP POLICY IF EXISTS "Admins can delete any profile sports" ON public.profile_sports;
DROP POLICY IF EXISTS "Admins can delete club profile sports" ON public.profile_sports;
CREATE POLICY "Admins can delete club profile sports"
ON public.profile_sports FOR DELETE TO public
USING (
  public.is_superadmin()
  OR (
    public.is_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = profile_sports.profile_id
         AND p.club_id = public.get_user_club_id()
    )
  )
);


-- ===========================================================================
-- D. EVENT_PLAYERS
-- ===========================================================================
-- Trois suppressions, aucune reecriture : les regles cadrees existaient deja,
-- elles etaient simplement court-circuitees par des regles plus larges posees
-- a cote.
--
--   « Admins have full access »            is_admin() sur les quatre commandes
--   « Users can register themselves »      auth.uid() = profile_id, sans club
--   « Users can view their own »           deja contenue dans la regle club
--   « Users can unregister from events »   deja contenue dans la regle club
--
-- Restent en place, et suffisent :
--   SELECT  « Users can see club event registrations »
--   INSERT  « Users can register to club events »
--   DELETE  « Users can unregister from club events »
--
-- Plus aucune policy UPDATE : rien dans l'application ne modifie une ligne
-- d'inscription. Les deux `upsert` du front passent en ON CONFLICT DO NOTHING
-- et ne reclament que le droit d'insertion.

DROP POLICY IF EXISTS "Admins have full access to event_players" ON public.event_players;
DROP POLICY IF EXISTS "Users can register themselves to events" ON public.event_players;
DROP POLICY IF EXISTS "Users can view their own event registrations" ON public.event_players;
DROP POLICY IF EXISTS "Users can unregister from events" ON public.event_players;


-- ===========================================================================
-- Verification
-- ===========================================================================
-- Doit rendre zero ligne : plus aucune policy ne s'appuie sur is_admin() sans
-- rattacher l'acces a un club.
--
--   select tablename, policyname, cmd
--     from pg_policies
--    where schemaname = 'public'
--      and (coalesce(qual,'') || coalesce(with_check,'')) like '%is_admin()%'
--      and (coalesce(qual,'') || coalesce(with_check,'')) not like '%get_user_club_id()%'
--    order by tablename, policyname;
--
-- ===========================================================================
