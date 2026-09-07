-- ===================================
-- 02 - FONCTIONS ET TRIGGERS
-- ===================================
-- Ce fichier contient toutes les fonctions et triggers
-- À exécuter APRÈS 01_types_and_tables.sql

-- ===================================
-- FONCTIONS UTILITAIRES
-- ===================================

-- Fonction helper pour vérifier si l'utilisateur connecté est admin (admin ou superadmin)
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

-- Fonction helper pour vérifier si l'utilisateur connecté est superadmin
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

-- Fonction helper pour récupérer le club_id de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.get_user_club_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN (SELECT club_id FROM public.profiles WHERE id = auth.uid());
END;
$$;

-- ===================================
-- TRIGGERS
-- ===================================

-- Fonction pour créer automatiquement le profil lors de l'inscription
-- Copie les métadonnées de auth.users vers profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- ON CONFLICT DO NOTHING : si un profil avec cet UUID existe déjà
  -- (ex: profil importé Excel dont l'invite a été créée avec l'UUID existant),
  -- on ne crée pas de doublon.
  INSERT INTO public.profiles (id, first_name, last_name, phone, club_id, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'phone',
    nullif(new.raw_user_meta_data->>'club_id', '')::uuid,
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Trigger qui s'exécute après création d'un utilisateur dans auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- ===================================
-- VUES
-- ===================================
--
-- Il n'y en a plus. `admin_event_players_view` agregeait les informations d'un
-- joueur pour un evenement, et n'etait appelee nulle part : ni dans le front,
-- ni dans les Edge Functions. Elle a ete supprimee a la main en production.
--
-- Elle est retiree d'ici pour qu'une base neuve ne la recree pas, et pour une
-- raison de fond : elle joignait `auth.users` et sortait `email` et `phone`
-- dans une vue du schema `public`. Une vue n'a pas de RLS a elle, et Supabase
-- accorde d'office la lecture sur `public` a `anon` et `authenticated` :
-- l'adresse et le telephone de tout le monde etaient lisibles depuis le
-- client.
--
-- La migration 14 en creait une seconde version, adaptee aux series. Elle est
-- retiree aussi. Le `DROP VIEW IF EXISTS` de la migration 14 reste en place,
-- comme filet pour une base qui la porterait encore.

-- ===================================
-- TRIGGER : NETTOYAGE DES ABSENCES APRES FIN D'EVENEMENT
-- ===================================
-- Quand un evenement passe en 'completed', supprime les absences globales
-- (event_id IS NULL) dont la date tombe dans la plage de l'evenement,
-- uniquement pour les joueurs inscrits a cet evenement.

CREATE OR REPLACE FUNCTION public.cleanup_absences_on_event_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    DELETE FROM public.absences
    WHERE event_id IS NULL
      AND absent_date BETWEEN NEW.start_date AND NEW.end_date
      AND profile_id IN (
        SELECT profile_id FROM public.event_players WHERE event_id = NEW.id
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_absences_on_event_complete ON public.events;
CREATE TRIGGER trg_cleanup_absences_on_event_complete
  AFTER UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_absences_on_event_complete();

-- ===================================
-- SYNC STATUT ACTIVE/INACTIVE VIA EVENT_PLAYERS
-- ===================================

-- Inscription à un event → active
CREATE OR REPLACE FUNCTION public.sync_active_on_event_register()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.player_status
  WHERE profile_id = NEW.profile_id AND status = 'inactive';

  INSERT INTO public.player_status (profile_id, status)
  VALUES (NEW.profile_id, 'active')
  ON CONFLICT (profile_id, status) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_players_insert ON public.event_players;
CREATE TRIGGER trg_event_players_insert
  AFTER INSERT ON public.event_players
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_active_on_event_register();

-- Désinscription d'un event → inactive si plus aucun event
CREATE OR REPLACE FUNCTION public.sync_inactive_on_event_unregister()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.event_players
    WHERE profile_id = OLD.profile_id
  ) THEN
    DELETE FROM public.player_status
    WHERE profile_id = OLD.profile_id AND status = 'active';

    INSERT INTO public.player_status (profile_id, status)
    VALUES (OLD.profile_id, 'inactive')
    ON CONFLICT (profile_id, status) DO NOTHING;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_players_delete ON public.event_players;
CREATE TRIGGER trg_event_players_delete
  AFTER DELETE ON public.event_players
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_inactive_on_event_unregister();
