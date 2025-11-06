-- ===================================
-- 02 - FONCTIONS ET TRIGGERS
-- ===================================
-- Ce fichier contient toutes les fonctions et triggers
-- À exécuter APRÈS 01_types_and_tables.sql

-- ===================================
-- FONCTIONS UTILITAIRES
-- ===================================

-- Fonction helper pour vérifier si l'utilisateur connecté est admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  );
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
  INSERT INTO public.profiles (id, first_name, last_name, phone, club_id, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'phone',
    nullif(new.raw_user_meta_data->>'club_id', '')::uuid,
    'user'
  );
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

-- Vue qui agrège toutes les informations d'un joueur pour un événement
CREATE OR REPLACE VIEW public.admin_event_players_view AS
SELECT
  e.id as event_id,
  e.event_name,
  g.group_name as table_number,
  p.id as player_id,
  p.first_name,
  p.last_name,
  p.avatar_url,
  p.power_ranking,
  au.email,
  au.phone,
  s.arrival,
  s.departure,
  array_agg(DISTINCT a.absent_date ORDER BY a.absent_date) as absences,
  array_agg(DISTINCT ps.status) as player_statuses,
  pay.status as payment_status,
  pay.amount as payment_amount
FROM public.events e
LEFT JOIN public.groups g ON g.event_id = e.id
LEFT JOIN public.group_players gp ON gp.group_id = g.id
LEFT JOIN public.profiles p ON p.id = gp.profile_id
LEFT JOIN auth.users au ON au.id = p.id
LEFT JOIN public.schedule s ON s.profile_id = p.id AND s.event_id = e.id
LEFT JOIN public.absences a ON a.profile_id = p.id AND a.event_id = e.id
LEFT JOIN public.player_status ps ON ps.profile_id = p.id
LEFT JOIN public.payments pay ON pay.profile_id = p.id AND pay.event_id = e.id
GROUP BY 
  e.id, e.event_name, g.group_name, p.id, p.first_name, p.last_name, 
  p.avatar_url, p.power_ranking, au.email, au.phone, 
  s.arrival, s.departure, pay.status, pay.amount;
