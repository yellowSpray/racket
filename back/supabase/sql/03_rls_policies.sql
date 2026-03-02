-- ===================================
-- 03 - ROW LEVEL SECURITY POLICIES
-- ===================================
-- Ce fichier contient toutes les policies RLS
-- À exécuter APRÈS 02_functions_and_triggers.sql
--
-- MODELE DE SECURITE :
-- - superadmin : voit/modifie tout (bypass club filter)
-- - admin : voit/modifie uniquement les donnees de son club (via get_user_club_id())
-- - user : voit ses propres donnees + les donnees de son groupe/event

-- ===================================
-- ACTIVER RLS SUR TOUTES LES TABLES
-- ===================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ===================================
-- POLICIES RLS - PROFILES
-- ===================================

-- Chaque utilisateur peut voir son propre profil
CREATE POLICY "Users can select their own profile"
ON public.profiles
FOR SELECT
TO public
USING (auth.uid() = id);

-- Chaque utilisateur peut modifier son propre profil (sauf le role)
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO public
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
);

-- Les admins peuvent lire les profils de leur club, superadmin voit tout
CREATE POLICY "Admins can select club profiles"
ON public.profiles
FOR SELECT
TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND club_id = public.get_user_club_id())
);

-- Les admins peuvent modifier les profils de leur club
CREATE POLICY "Admins can update club profiles"
ON public.profiles
FOR UPDATE
TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND club_id = public.get_user_club_id())
);

-- Chaque utilisateur peut créer son profil (via trigger)
CREATE POLICY "Users can insert their profile"
ON public.profiles
FOR INSERT
TO public
WITH CHECK (auth.uid() = id);

-- Les admins peuvent créer des profils pour leur club
CREATE POLICY "Admins can insert club profiles"
ON public.profiles
FOR INSERT
TO public
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND club_id = public.get_user_club_id())
);

-- ===================================
-- POLICIES RLS - CLUBS
-- ===================================

-- Tout le monde peut lire les clubs (pour le dropdown d'inscription)
CREATE POLICY "Everyone can select clubs"
ON public.clubs
FOR SELECT
TO public
USING (true);

-- Seuls les admins peuvent créer des clubs
CREATE POLICY "Admins can insert clubs"
ON public.clubs
FOR INSERT
TO public
WITH CHECK (public.is_admin());

-- Seuls les admins peuvent modifier des clubs
CREATE POLICY "Admins can update clubs"
ON public.clubs
FOR UPDATE
TO public
USING (public.is_admin());

-- Seuls les admins peuvent supprimer des clubs
CREATE POLICY "Admins can delete clubs"
ON public.clubs
FOR DELETE
TO public
USING (public.is_admin());

-- ===================================
-- POLICIES RLS - SPORTS
-- ===================================

-- Tout le monde peut lire les sports
CREATE POLICY "Everyone can select sports"
ON public.sports
FOR SELECT
TO public
USING (true);

-- Seuls les admins peuvent créer des sports
CREATE POLICY "Admins can insert sports"
ON public.sports
FOR INSERT
TO public
WITH CHECK (public.is_admin());

-- Seuls les admins peuvent modifier des sports
CREATE POLICY "Admins can update sports"
ON public.sports
FOR UPDATE
TO public
USING (public.is_admin());

-- Seuls les admins peuvent supprimer des sports
CREATE POLICY "Admins can delete sports"
ON public.sports
FOR DELETE
TO public
USING (public.is_admin());

-- ===================================
-- POLICIES RLS - PROFILE_SPORTS
-- ===================================

-- Les utilisateurs peuvent voir leurs propres sports
CREATE POLICY "Users can select their own sports"
ON public.profile_sports
FOR SELECT
TO public
USING (auth.uid() = profile_id);

-- Les admins peuvent voir les sports des profils de leur club
CREATE POLICY "Admins can select club profile sports"
ON public.profile_sports
FOR SELECT
TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

-- Les utilisateurs peuvent ajouter des sports à leur profil
CREATE POLICY "Users can insert their own sports"
ON public.profile_sports
FOR INSERT
TO public
WITH CHECK (auth.uid() = profile_id);

-- Les admins peuvent ajouter des sports aux profils de leur club
CREATE POLICY "Admins can insert club profile sports"
ON public.profile_sports
FOR INSERT
TO public
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

-- Les utilisateurs peuvent supprimer leurs propres sports
CREATE POLICY "Users can delete their own sports"
ON public.profile_sports
FOR DELETE
TO public
USING (auth.uid() = profile_id);

-- Les admins peuvent supprimer les sports des profils de leur club
CREATE POLICY "Admins can delete club profile sports"
ON public.profile_sports
FOR DELETE
TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

-- ===================================
-- POLICIES RLS - EVENTS (scoped par club_id)
-- ===================================

-- Les utilisateurs voient les events de leur club
CREATE POLICY "Users can select their club events"
ON public.events
FOR SELECT
TO public
USING (
  public.is_superadmin()
  OR club_id = public.get_user_club_id()
);

-- Les admins peuvent créer des events pour leur club
CREATE POLICY "Admins can insert club events"
ON public.events
FOR INSERT
TO public
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND club_id = public.get_user_club_id())
);

-- Les admins peuvent modifier les events de leur club
CREATE POLICY "Admins can update club events"
ON public.events
FOR UPDATE
TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND club_id = public.get_user_club_id())
);

-- Les admins peuvent supprimer les events de leur club
CREATE POLICY "Admins can delete club events"
ON public.events
FOR DELETE
TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND club_id = public.get_user_club_id())
);

-- ===================================
-- POLICIES RLS - EVENT_PLAYERS (scoped via event -> club)
-- ===================================

-- Les utilisateurs voient les inscriptions de leur club
CREATE POLICY "Users can see club event registrations"
ON public.event_players
FOR SELECT
TO public
USING (
  auth.uid() = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id = public.get_user_club_id()
  ))
);

-- Les utilisateurs peuvent s'inscrire aux events de leur club
CREATE POLICY "Users can register to club events"
ON public.event_players
FOR INSERT
TO public
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

-- Les utilisateurs peuvent se desinscrire
CREATE POLICY "Users can unregister from club events"
ON public.event_players
FOR DELETE
TO public
USING (
  auth.uid() = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id = public.get_user_club_id()
  ))
);

-- ===================================
-- POLICIES RLS - GROUPS (scoped via event -> club)
-- ===================================

-- Les utilisateurs voient les groupes de leur club
CREATE POLICY "Users can select their club groups"
ON public.groups
FOR SELECT
TO public
USING (
  public.is_superadmin()
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id = public.get_user_club_id()
  )
);

-- Les admins peuvent créer des groupes pour leur club
CREATE POLICY "Admins can insert club groups"
ON public.groups
FOR INSERT
TO public
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id = public.get_user_club_id()
  ))
);

-- Les admins peuvent modifier les groupes de leur club
CREATE POLICY "Admins can update club groups"
ON public.groups
FOR UPDATE
TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id = public.get_user_club_id()
  ))
);

-- Les admins peuvent supprimer les groupes de leur club
CREATE POLICY "Admins can delete club groups"
ON public.groups
FOR DELETE
TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id = public.get_user_club_id()
  ))
);

-- ===================================
-- POLICIES RLS - GROUP_PLAYERS (scoped via group -> event -> club)
-- ===================================

-- Les utilisateurs voient les membres de leur club
CREATE POLICY "Users can see club group memberships"
ON public.group_players
FOR SELECT
TO public
USING (
  auth.uid() = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.events e ON e.id = g.event_id
    WHERE g.id = group_id AND e.club_id = public.get_user_club_id()
  ))
);

-- Les admins peuvent ajouter des joueurs aux groupes de leur club
CREATE POLICY "Admins can insert club group players"
ON public.group_players
FOR INSERT
TO public
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.events e ON e.id = g.event_id
    WHERE g.id = group_id AND e.club_id = public.get_user_club_id()
  ))
);

-- Les admins peuvent supprimer des joueurs des groupes de leur club
CREATE POLICY "Admins can delete club group players"
ON public.group_players
FOR DELETE
TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.events e ON e.id = g.event_id
    WHERE g.id = group_id AND e.club_id = public.get_user_club_id()
  ))
);

-- ===================================
-- POLICIES RLS - MATCHES (scoped via group -> event -> club)
-- ===================================

-- Les utilisateurs voient leurs propres matchs + admins voient les matchs du club
CREATE POLICY "Users can see club matches"
ON public.matches
FOR SELECT
TO public
USING (
  auth.uid() IN (player1_id, player2_id)
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.events e ON e.id = g.event_id
    WHERE g.id = group_id AND e.club_id = public.get_user_club_id()
  ))
);

-- Les admins peuvent créer des matchs pour leur club
CREATE POLICY "Admins can insert club matches"
ON public.matches
FOR INSERT
TO public
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.events e ON e.id = g.event_id
    WHERE g.id = group_id AND e.club_id = public.get_user_club_id()
  ))
);

-- Les admins peuvent modifier des matchs de leur club
CREATE POLICY "Admins can update club matches"
ON public.matches
FOR UPDATE
TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.events e ON e.id = g.event_id
    WHERE g.id = group_id AND e.club_id = public.get_user_club_id()
  ))
);

-- Les admins peuvent supprimer des matchs de leur club
CREATE POLICY "Admins can delete club matches"
ON public.matches
FOR DELETE
TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.events e ON e.id = g.event_id
    WHERE g.id = group_id AND e.club_id = public.get_user_club_id()
  ))
);

-- ===================================
-- POLICIES RLS - SCHEDULE (scoped via profile -> club)
-- ===================================

-- Les utilisateurs voient leur propre horaire + admins voient ceux du club
CREATE POLICY "Users can select club schedules"
ON public.schedule
FOR SELECT
TO public
USING (
  auth.uid() = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

-- Les utilisateurs/admins peuvent créer des horaires pour leur club
CREATE POLICY "Users and admins can insert club schedules"
ON public.schedule
FOR INSERT
TO public
WITH CHECK (
  auth.uid() = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

-- Les utilisateurs/admins peuvent modifier des horaires de leur club
CREATE POLICY "Users and admins can update club schedules"
ON public.schedule
FOR UPDATE
TO public
USING (
  auth.uid() = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

-- ===================================
-- POLICIES RLS - ABSENCES (scoped via profile -> club)
-- ===================================

-- Les utilisateurs voient leurs propres absences + admins voient celles du club
CREATE POLICY "Users can select club absences"
ON public.absences
FOR SELECT
TO public
USING (
  auth.uid() = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

-- Les utilisateurs/admins peuvent créer des absences pour leur club
CREATE POLICY "Users and admins can insert club absences"
ON public.absences
FOR INSERT
TO public
WITH CHECK (
  auth.uid() = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

-- Les utilisateurs/admins peuvent supprimer des absences de leur club
CREATE POLICY "Users and admins can delete club absences"
ON public.absences
FOR DELETE
TO public
USING (
  auth.uid() = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

-- ===================================
-- POLICIES RLS - PLAYER STATUS (scoped via profile -> club)
-- ===================================

-- Les utilisateurs voient leur propre statut + admins voient ceux du club
CREATE POLICY "Users can view club player statuses"
ON public.player_status
FOR SELECT
TO public
USING (
  auth.uid() = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

-- Les admins peuvent créer des statuts pour les joueurs de leur club
CREATE POLICY "Admins can insert club player statuses"
ON public.player_status
FOR INSERT
TO public
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

-- Les admins peuvent modifier des statuts de leur club
CREATE POLICY "Admins can update club player statuses"
ON public.player_status
FOR UPDATE
TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

-- Les admins peuvent supprimer des statuts de leur club
CREATE POLICY "Admins can delete club player statuses"
ON public.player_status
FOR DELETE
TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

-- ===================================
-- POLICIES RLS - PAYMENTS (scoped via profile -> club)
-- ===================================

-- Les utilisateurs voient leurs propres paiements + admins voient ceux du club
CREATE POLICY "Users can view club payments"
ON public.payments
FOR SELECT
TO public
USING (
  auth.uid() = profile_id
  OR public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

-- Les admins peuvent gérer les paiements de leur club
CREATE POLICY "Admins can manage club payments"
ON public.payments
FOR ALL
TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_id AND p.club_id = public.get_user_club_id()
  ))
);

-- ===================================
-- POLICIES RLS - SCORING_RULES (scoped par club)
-- ===================================

ALTER TABLE public.scoring_rules ENABLE ROW LEVEL SECURITY;

-- Les membres du club peuvent voir les regles de scoring
CREATE POLICY "Users can select their club scoring rules"
ON public.scoring_rules
FOR SELECT
TO public
USING (
  public.is_superadmin()
  OR club_id = public.get_user_club_id()
);

-- Les admins peuvent creer les regles de scoring de leur club
CREATE POLICY "Admins can insert club scoring rules"
ON public.scoring_rules
FOR INSERT
TO public
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND club_id = public.get_user_club_id())
);

-- Les admins peuvent modifier les regles de scoring de leur club
CREATE POLICY "Admins can update club scoring rules"
ON public.scoring_rules
FOR UPDATE
TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND club_id = public.get_user_club_id())
);

-- ===================================
-- POLICIES RLS - PROMOTION_RULES (scoped par club)
-- ===================================

ALTER TABLE public.promotion_rules ENABLE ROW LEVEL SECURITY;

-- Les membres du club peuvent voir les regles de promotion
CREATE POLICY "Users can select their club promotion rules"
ON public.promotion_rules
FOR SELECT
TO public
USING (
  public.is_superadmin()
  OR club_id = public.get_user_club_id()
);

-- Les admins peuvent creer les regles de promotion de leur club
CREATE POLICY "Admins can insert club promotion rules"
ON public.promotion_rules
FOR INSERT
TO public
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND club_id = public.get_user_club_id())
);

-- Les admins peuvent modifier les regles de promotion de leur club
CREATE POLICY "Admins can update club promotion rules"
ON public.promotion_rules
FOR UPDATE
TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND club_id = public.get_user_club_id())
);

-- ===================================
-- POLICIES RLS - EVENT_COURTS (scoped via event -> club)
-- ===================================

ALTER TABLE public.event_courts ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs voient les terrains des events de leur club
CREATE POLICY "Users can select club event courts"
ON public.event_courts
FOR SELECT
TO public
USING (
  public.is_superadmin()
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id = public.get_user_club_id()
  )
);

-- Les admins peuvent creer des terrains pour les events de leur club
CREATE POLICY "Admins can insert club event courts"
ON public.event_courts
FOR INSERT
TO public
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id = public.get_user_club_id()
  ))
);

-- Les admins peuvent modifier les terrains des events de leur club
CREATE POLICY "Admins can update club event courts"
ON public.event_courts
FOR UPDATE
TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id = public.get_user_club_id()
  ))
);

-- Les admins peuvent supprimer les terrains des events de leur club
CREATE POLICY "Admins can delete club event courts"
ON public.event_courts
FOR DELETE
TO public
USING (
  public.is_superadmin()
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id = public.get_user_club_id()
  ))
);
