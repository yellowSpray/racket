-- ===================================
-- FONCTION POUR CREER/MODIFIER UN JOUEUR
-- ===================================

-- Cette fonction gere la creation ou modification complete d'un joueur
-- Elle s'occupe de toutes les tables impliquees de maniere transactionnelle

CREATE OR REPLACE FUNCTION public.upsert_player(
  -- Donnees du profil
  p_profile_id uuid,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_email text,
  p_power_ranking int4,
  p_avatar_url text DEFAULT NULL,
  p_club_id uuid DEFAULT NULL,
  
  -- Donnees de statut
  p_statuses text[] DEFAULT NULL,
  
  -- Donnees de schedule (horaires generaux, pas lies a un evenement)
  p_arrival_time time DEFAULT NULL,
  p_departure_time time DEFAULT NULL,
  
  -- Parametres non utilises pour l'instant (compatibilite future)
  p_event_id uuid DEFAULT NULL,
  p_event_date date DEFAULT NULL,
  p_payment_amount numeric(10,2) DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_id uuid;
  v_user_id uuid;
  v_is_visitor boolean;
  v_is_paid boolean;
  v_arrival_timestamp timestamptz;
  v_departure_timestamp timestamptz;
  v_status text;
BEGIN
  -- Verifier que l'utilisateur connecte est admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Seuls les admins peuvent creer/modifier des joueurs';
  END IF;

  -- ===================================
  -- ETAPE 1: GESTION DU PROFIL
  -- ===================================
  
  IF p_profile_id IS NULL THEN
    -- MODE CREATION : creer un nouvel utilisateur
    
    -- Verifier si l'email existe deja dans auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = p_email;
    
    IF v_user_id IS NOT NULL THEN
      -- L'utilisateur existe deja dans auth, recuperer son profil
      v_profile_id := v_user_id;
      
      -- Mettre a jour le profil existant
      UPDATE public.profiles
      SET 
        first_name = p_first_name,
        last_name = p_last_name,
        phone = p_phone,
        email = p_email,
        power_ranking = p_power_ranking,
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        club_id = COALESCE(p_club_id, club_id),
        updated_at = now()
      WHERE id = v_profile_id;
      
    ELSE
      -- Creer un nouveau profil sans compte auth (is_linked = false)
      v_profile_id := gen_random_uuid();
      
      INSERT INTO public.profiles (
        id, first_name, last_name, phone, email, power_ranking, 
        avatar_url, club_id, role, is_linked
      )
      VALUES (
        v_profile_id, p_first_name, p_last_name, p_phone, p_email, p_power_ranking,
        p_avatar_url, p_club_id, 'user', false
      );
    END IF;
  
  ELSE
    -- MODE EDITION : modifier un profil existant
    v_profile_id := p_profile_id;
    
    UPDATE public.profiles
    SET 
      first_name = p_first_name,
      last_name = p_last_name,
      phone = p_phone,
      email = p_email,
      power_ranking = p_power_ranking,
      avatar_url = COALESCE(p_avatar_url, avatar_url),
      club_id = COALESCE(p_club_id, club_id),
      updated_at = now()
    WHERE id = v_profile_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Profil non trouve avec l ID %', p_profile_id;
    END IF;
  END IF;

  -- ===================================
  -- ETAPE 2: GESTION DES STATUTS
  -- ===================================
  
  -- Supprimer tous les anciens statuts
  DELETE FROM public.player_status
  WHERE profile_id = v_profile_id;
  
  -- Inserer les nouveaux statuts
  IF p_statuses IS NOT NULL AND array_length(p_statuses, 1) > 0 THEN
    FOREACH v_status IN ARRAY p_statuses LOOP
      INSERT INTO public.player_status (profile_id, status)
      VALUES (v_profile_id, v_status::player_status_enum)
      ON CONFLICT (profile_id, status) DO NOTHING;
    END LOOP;
  END IF;
  
  -- Determiner si c'est un visitor et si c'est paye
  v_is_visitor := 'visitor' = ANY(p_statuses);
  v_is_paid := 'paid' = ANY(p_statuses);

  -- ===================================
  -- ETAPE 3: GESTION DU SCHEDULE
  -- ===================================
  
  IF p_arrival_time IS NOT NULL OR p_departure_time IS NOT NULL THEN
    -- Construire des timestamps pour aujourd'hui avec les heures fournies
    -- (on utilise CURRENT_DATE comme date de reference)
    IF p_arrival_time IS NOT NULL THEN
      v_arrival_timestamp := (CURRENT_DATE + p_arrival_time)::timestamptz;
    END IF;
    
    IF p_departure_time IS NOT NULL THEN
      v_departure_timestamp := (CURRENT_DATE + p_departure_time)::timestamptz;
    END IF;
    
    -- Inserer ou mettre a jour le schedule general (sans event_id)
    INSERT INTO public.schedule (profile_id, event_id, arrival, departure)
    VALUES (v_profile_id, NULL, v_arrival_timestamp, v_departure_timestamp)
    ON CONFLICT (profile_id) 
    WHERE event_id IS NULL
    DO UPDATE SET
      arrival = EXCLUDED.arrival,
      departure = EXCLUDED.departure,
      created_at = now();
  END IF;

  -- ===================================
  -- ETAPE 4: GESTION DES PAIEMENTS
  -- ===================================
  
  IF p_event_id IS NOT NULL AND v_is_visitor THEN
    -- Les visitors doivent payer, creer ou mettre a jour le paiement
    INSERT INTO public.payments (
      profile_id, 
      event_id, 
      amount, 
      status,
      paid_at
    )
    VALUES (
      v_profile_id,
      p_event_id,
      p_payment_amount,
      CASE WHEN v_is_paid THEN 'paid'::payment_status_enum ELSE 'unpaid'::payment_status_enum END,
      CASE WHEN v_is_paid THEN now() ELSE NULL END
    )
    ON CONFLICT (profile_id, event_id)
    DO UPDATE SET
      amount = EXCLUDED.amount,
      status = EXCLUDED.status,
      paid_at = EXCLUDED.paid_at,
      updated_at = now();
  ELSIF p_event_id IS NOT NULL AND NOT v_is_visitor THEN
    -- Si c'est un member, supprimer le paiement s'il existe
    DELETE FROM public.payments
    WHERE profile_id = v_profile_id AND event_id = p_event_id;
  END IF;

  -- ===================================
  -- RETOUR DU RESULTAT
  -- ===================================
  
  RETURN json_build_object(
    'success', true,
    'profile_id', v_profile_id,
    'message', CASE 
      WHEN p_profile_id IS NULL THEN 'Joueur cree avec succes'
      ELSE 'Joueur modifie avec succes'
    END
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION public.upsert_player TO authenticated;

-- ===================================
-- EXEMPLES D'UTILISATION
-- ===================================

-- Exemple 1: Creer un nouveau joueur membre actif
/*
SELECT public.upsert_player(
  p_profile_id := NULL,
  p_first_name := 'Jean',
  p_last_name := 'Dupont',
  p_phone := '+32456789012',
  p_email := 'jean.dupont@email.com',
  p_power_ranking := 1500,
  p_statuses := ARRAY['active', 'member']::text[],
  p_event_id := 'uuid-de-levenement',
  p_arrival_time := '19:00'::time,
  p_departure_time := '22:00'::time,
  p_event_date := '2024-12-15'::date
);
*/

-- Exemple 2: Creer un visitor inactif non paye
/*
SELECT public.upsert_player(
  p_profile_id := NULL,
  p_first_name := 'Marie',
  p_last_name := 'Martin',
  p_phone := '+32456789013',
  p_email := 'marie.martin@email.com',
  p_power_ranking := 1200,
  p_statuses := ARRAY['inactive', 'visitor', 'unpaid']::text[],
  p_event_id := 'uuid-de-levenement',
  p_arrival_time := '19:30'::time,
  p_departure_time := '21:30'::time,
  p_event_date := '2024-12-15'::date,
  p_payment_amount := 10.00
);
*/

-- Exemple 3: Modifier un joueur existant
/*
SELECT public.upsert_player(
  p_profile_id := 'uuid-du-joueur',
  p_first_name := 'Jean',
  p_last_name := 'Dupont',
  p_phone := '+32456789012',
  p_email := 'jean.dupont@email.com',
  p_power_ranking := 1600,
  p_statuses := ARRAY['active', 'visitor', 'paid']::text[],
  p_event_id := 'uuid-de-levenement',
  p_arrival_time := '18:30'::time,
  p_departure_time := '22:30'::time,
  p_event_date := '2024-12-15'::date,
  p_payment_amount := 10.00
);
*/