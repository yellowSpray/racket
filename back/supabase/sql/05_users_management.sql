-- ===================================
-- 05 - GESTION DES UTILISATEURS
-- ===================================
-- Ce fichier contient les fonctions pour la gestion des membres du club
-- et la modification du trigger handle_new_user pour supporter les invitations
-- À exécuter APRÈS 02_functions_and_triggers.sql

-- ===================================
-- MODIFICATION DU TRIGGER handle_new_user
-- ===================================
-- Ajoute le support du club_id via les métadonnées d'invitation
-- et marque le profil comme lié (is_linked = true)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, phone, email, club_id, role, is_linked)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    new.raw_user_meta_data->>'phone',
    new.email,
    nullif(new.raw_user_meta_data->>'club_id', '')::uuid,
    'user',
    true
  );
  RETURN new;
END;
$$;

-- ===================================
-- FONCTION update_member_role
-- ===================================
-- Permet de changer le rôle d'un membre du club
-- Admin : peut changer user ↔ admin
-- Superadmin : tous les droits, y compris promouvoir en superadmin

CREATE OR REPLACE FUNCTION public.update_member_role(p_profile_id uuid, p_new_role user_role)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role user_role;
  v_target_role user_role;
BEGIN
  -- Vérifier que l'appelant est au moins admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Seuls les admins peuvent modifier les rôles';
  END IF;

  -- Interdire de modifier son propre rôle
  IF p_profile_id = auth.uid() THEN
    RAISE EXCEPTION 'Vous ne pouvez pas modifier votre propre rôle';
  END IF;

  -- Récupérer le rôle de l'appelant
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  -- Récupérer le rôle de la cible (doit être dans le même club)
  SELECT role INTO v_target_role
  FROM public.profiles
  WHERE id = p_profile_id AND club_id = get_user_club_id();

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Membre non trouvé dans votre club';
  END IF;

  -- Restrictions pour les admins (non superadmin)
  IF v_caller_role = 'admin' THEN
    IF v_target_role = 'superadmin' THEN
      RAISE EXCEPTION 'Un admin ne peut pas modifier un superadmin';
    END IF;
    IF p_new_role = 'superadmin' THEN
      RAISE EXCEPTION 'Un admin ne peut pas promouvoir en superadmin';
    END IF;
  END IF;

  -- Superadmin : aucune restriction supplémentaire

  UPDATE public.profiles
  SET role = p_new_role, updated_at = now()
  WHERE id = p_profile_id AND club_id = get_user_club_id();

  RETURN json_build_object('success', true, 'message', 'Rôle modifié avec succès');

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION public.update_member_role TO authenticated;

-- ===================================
-- FONCTION remove_club_member
-- ===================================
-- Retire un membre du club en mettant club_id à NULL
-- Ne supprime pas le profil ni le compte auth
-- Admin : peut retirer tout le monde sauf superadmin
-- Superadmin : peut retirer n'importe qui

CREATE OR REPLACE FUNCTION public.remove_club_member(p_profile_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role user_role;
  v_target_role user_role;
BEGIN
  -- Vérifier que l'appelant est au moins admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Seuls les admins peuvent retirer des membres';
  END IF;

  -- Interdire de se retirer soi-même
  IF p_profile_id = auth.uid() THEN
    RAISE EXCEPTION 'Vous ne pouvez pas vous retirer vous-même';
  END IF;

  -- Récupérer le rôle de l'appelant
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  -- Récupérer le rôle de la cible (doit être dans le même club)
  SELECT role INTO v_target_role
  FROM public.profiles
  WHERE id = p_profile_id AND club_id = get_user_club_id();

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Membre non trouvé dans votre club';
  END IF;

  -- Admin ne peut pas retirer un superadmin
  IF v_caller_role = 'admin' AND v_target_role = 'superadmin' THEN
    RAISE EXCEPTION 'Un admin ne peut pas retirer un superadmin';
  END IF;

  -- Retirer le membre du club (ne supprime pas le profil)
  UPDATE public.profiles
  SET club_id = NULL, updated_at = now()
  WHERE id = p_profile_id AND club_id = get_user_club_id();

  RETURN json_build_object('success', true, 'message', 'Membre retiré du club');

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION public.remove_club_member TO authenticated;
