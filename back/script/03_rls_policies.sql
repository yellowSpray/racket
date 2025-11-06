-- ===================================
-- 03 - ROW LEVEL SECURITY POLICIES
-- ===================================
-- Ce fichier contient toutes les policies RLS
-- À exécuter APRÈS 02_functions_and_triggers.sql

-- ===================================
-- ACTIVER RLS SUR TOUTES LES TABLES
-- ===================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
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

-- Les admins et superadmins peuvent lire tous les profils
CREATE POLICY "Admins can select all profiles"
ON public.profiles
FOR SELECT
TO public
USING (public.is_admin());

-- Les admins et superadmins peuvent modifier tous les profils
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO public
USING (public.is_admin());

-- Chaque utilisateur peut créer son profil (via trigger)
CREATE POLICY "Users can insert their profile"
ON public.profiles
FOR INSERT
TO public
WITH CHECK (auth.uid() = id);

-- Les admins peuvent créer des profils pour d'autres utilisateurs
CREATE POLICY "Admins can insert any profile"
ON public.profiles
FOR INSERT
TO public
WITH CHECK (public.is_admin());

-- ===================================
-- POLICIES RLS - CLUBS
-- ===================================

-- Tout le monde peut lire les clubs
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

-- Les admins peuvent voir tous les sports des utilisateurs
CREATE POLICY "Admins can select all profile sports"
ON public.profile_sports
FOR SELECT
TO public
USING (public.is_admin());

-- Les utilisateurs peuvent ajouter des sports à leur profil
CREATE POLICY "Users can insert their own sports"
ON public.profile_sports
FOR INSERT
TO public
WITH CHECK (auth.uid() = profile_id);

-- Les admins peuvent ajouter des sports à n'importe quel profil
CREATE POLICY "Admins can insert any profile sports"
ON public.profile_sports
FOR INSERT
TO public
WITH CHECK (public.is_admin());

-- Les utilisateurs peuvent supprimer leurs propres sports
CREATE POLICY "Users can delete their own sports"
ON public.profile_sports
FOR DELETE
TO public
USING (auth.uid() = profile_id);

-- Les admins peuvent supprimer n'importe quel sport
CREATE POLICY "Admins can delete any profile sports"
ON public.profile_sports
FOR DELETE
TO public
USING (public.is_admin());

-- ===================================
-- POLICIES RLS - EVENTS
-- ===================================

-- Tout le monde peut voir les événements
CREATE POLICY "Everyone can select events"
ON public.events
FOR SELECT
TO public
USING (true);

-- Seuls les admins peuvent créer des événements
CREATE POLICY "Admins can insert events"
ON public.events
FOR INSERT
TO public
WITH CHECK (public.is_admin());

-- Seuls les admins peuvent modifier des événements
CREATE POLICY "Admins can update events"
ON public.events
FOR UPDATE
TO public
USING (public.is_admin());

-- Seuls les admins peuvent supprimer des événements
CREATE POLICY "Admins can delete events"
ON public.events
FOR DELETE
TO public
USING (public.is_admin());

-- ===================================
-- POLICIES RLS - GROUPS
-- ===================================

-- Tout le monde peut voir les groupes
CREATE POLICY "Everyone can select groups"
ON public.groups
FOR SELECT
TO public
USING (true);

-- Seuls les admins peuvent créer des groupes
CREATE POLICY "Admins can insert groups"
ON public.groups
FOR INSERT
TO public
WITH CHECK (public.is_admin());

-- Seuls les admins peuvent modifier des groupes
CREATE POLICY "Admins can update groups"
ON public.groups
FOR UPDATE
TO public
USING (public.is_admin());

-- Seuls les admins peuvent supprimer des groupes
CREATE POLICY "Admins can delete groups"
ON public.groups
FOR DELETE
TO public
USING (public.is_admin());

-- ===================================
-- POLICIES RLS - GROUP_PLAYERS
-- ===================================

-- Les utilisateurs peuvent voir leurs propres groupes
CREATE POLICY "Users can see their own group membership"
ON public.group_players
FOR SELECT
TO public
USING (auth.uid() = profile_id OR public.is_admin());

-- Seuls les admins peuvent ajouter des joueurs aux groupes
CREATE POLICY "Admins can insert any group player"
ON public.group_players
FOR INSERT
TO public
WITH CHECK (public.is_admin());

-- Seuls les admins peuvent supprimer des joueurs des groupes
CREATE POLICY "Admins can delete any group player"
ON public.group_players
FOR DELETE
TO public
USING (public.is_admin());

-- ===================================
-- POLICIES RLS - MATCHES
-- ===================================

-- Les utilisateurs peuvent voir leurs propres matchs
CREATE POLICY "Users can see their own matches"
ON public.matches
FOR SELECT
TO public
USING (auth.uid() IN (player1_id, player2_id) OR public.is_admin());

-- Seuls les admins peuvent créer des matchs
CREATE POLICY "Admins can insert matches"
ON public.matches
FOR INSERT
TO public
WITH CHECK (public.is_admin());

-- Seuls les admins peuvent modifier des matchs
CREATE POLICY "Admins can update matches"
ON public.matches
FOR UPDATE
TO public
USING (public.is_admin());

-- Seuls les admins peuvent supprimer des matchs
CREATE POLICY "Admins can delete matches"
ON public.matches
FOR DELETE
TO public
USING (public.is_admin());

-- ===================================
-- POLICIES RLS - SCHEDULE
-- ===================================

-- Les utilisateurs peuvent voir leur propre horaire
CREATE POLICY "Users can select their own schedule"
ON public.schedule
FOR SELECT
TO public
USING (auth.uid() = profile_id OR public.is_admin());

-- Les utilisateurs peuvent créer leur propre horaire
CREATE POLICY "Users can insert their own schedule"
ON public.schedule
FOR INSERT
TO public
WITH CHECK (auth.uid() = profile_id OR public.is_admin());

-- Les utilisateurs peuvent modifier leur propre horaire
CREATE POLICY "Users can update their own schedule"
ON public.schedule
FOR UPDATE
TO public
USING (auth.uid() = profile_id OR public.is_admin());

-- Les admins peuvent créer n'importe quel horaire
CREATE POLICY "Admins can insert any schedule"
ON public.schedule
FOR INSERT
TO public
WITH CHECK (public.is_admin());

-- Les admins peuvent modifier n'importe quel horaire
CREATE POLICY "Admins can update any schedule"
ON public.schedule
FOR UPDATE
TO public
USING (public.is_admin());

-- ===================================
-- POLICIES RLS - ABSENCES
-- ===================================

-- Les utilisateurs peuvent voir leurs propres absences
CREATE POLICY "Users can select their own absences"
ON public.absences
FOR SELECT
TO public
USING (auth.uid() = profile_id OR public.is_admin());

-- Les utilisateurs peuvent créer leurs propres absences
CREATE POLICY "Users can insert their own absences"
ON public.absences
FOR INSERT
TO public
WITH CHECK (auth.uid() = profile_id OR public.is_admin());

-- Les utilisateurs peuvent supprimer leurs propres absences
CREATE POLICY "Users can delete their own absences"
ON public.absences
FOR DELETE
TO public
USING (auth.uid() = profile_id OR public.is_admin());

-- Les admins peuvent créer n'importe quelle absence
CREATE POLICY "Admins can insert any absence"
ON public.absences
FOR INSERT
TO public
WITH CHECK (public.is_admin());

-- Les admins peuvent supprimer n'importe quelle absence
CREATE POLICY "Admins can delete any absence"
ON public.absences
FOR DELETE
TO public
USING (public.is_admin());

-- ===================================
-- POLICIES RLS - PLAYER STATUS
-- ===================================

-- Les utilisateurs peuvent voir leur propre statut
CREATE POLICY "Users can view their own status"
ON public.player_status
FOR SELECT
TO public
USING (auth.uid() = profile_id OR public.is_admin());

-- Seuls les admins peuvent modifier un statut
CREATE POLICY "Admins can update any status"
ON public.player_status
FOR UPDATE
TO public
USING (public.is_admin());

-- Seuls les admins peuvent créer un statut
CREATE POLICY "Admins can insert any status"
ON public.player_status
FOR INSERT
TO public
WITH CHECK (public.is_admin());

-- Seuls les admins peuvent supprimer un statut
CREATE POLICY "Admins can delete any status"
ON public.player_status
FOR DELETE
TO public
USING (public.is_admin());

-- ===================================
-- POLICIES RLS - PAYMENTS
-- ===================================

-- Les utilisateurs peuvent voir leurs propres paiements
CREATE POLICY "Users can view their own payments"
ON public.payments
FOR SELECT
TO public
USING (auth.uid() = profile_id OR public.is_admin());

-- Seuls les admins peuvent gérer tous les paiements
CREATE POLICY "Admins can insert or update any payments"
ON public.payments
FOR ALL
TO public
USING (public.is_admin());
