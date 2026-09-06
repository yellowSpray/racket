-- ===========================================================================
-- 34 - CLOISONNER upsert_player PAR CLUB
-- ===========================================================================
--
-- `upsert_player` est `security definer` : la RLS ne s'applique pas a
-- l'interieur. Elle verifiait bien `is_admin()`, mais `is_admin()` n'a aucune
-- portee de club. Sept chemins laissaient donc un admin agir chez le voisin,
-- dont un atteignable depuis l'ecran d'ajout d'un joueur, sans aucun detour
-- par l'API :
--
--   1. creer un joueur en designant le club du voisin (`p_club_id` non verifie)
--   2. modifier n'importe quel joueur de la base (`WHERE id = ...` sans club)
--   3. deplacer un joueur du voisin vers son propre club
--   4. aspirer un joueur du voisin en saisissant son email dans le formulaire
--      d'ajout : la recherche dans `auth.users` ignorait le club, et la mise a
--      jour reecrivait nom, telephone, classement et club
--   5. inscrire un joueur a l'evenement d'un autre club (`p_event_id`)
--   6. ecrire un paiement sur la serie d'un autre club (`p_round_id`)
--   7. et, sans rapport avec le cloisonnement : la recherche par email ne
--      regardait que `auth.users`. Un profil non lie, cree par l'import Excel,
--      n'y figure pas : la fonction creait un second profil avec le meme email
--      au lieu de retrouver le premier.
--
-- Le club de reference n'est plus le parametre mais `get_user_club_id()`.
-- Le superadmin garde le droit de designer un club par `p_club_id` ; a defaut
-- c'est le sien qui s'applique, ce qui evite qu'une modification sans
-- parametre ne deplace un joueur par accident.
--
-- Verifie sur PostgreSQL 16, matrice de douze scenarios passee avant et apres.
--
-- Ce fichier est rejouable.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- L'index dont depend l'etape des horaires.
--
-- `ON CONFLICT (profile_id) WHERE event_id IS NULL` exige un index unique
-- partiel. Il existe bien en production, sous le nom
-- `idx_schedule_profile_no_event`, mais il n'apparait dans aucun fichier du
-- depot : il a ete pose a la main. Rejouer les fichiers dans un projet neuf,
-- celui de developpement par exemple, donnerait donc une base ou la saisie
-- des horaires echoue. On le recree ici, sous le meme nom, sans effet sur la
-- base existante.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_profile_no_event
  ON public.schedule (profile_id) WHERE event_id IS NULL;

-- Supprimer toutes les surcharges existantes.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS sig
    FROM pg_proc
    WHERE proname = 'upsert_player' AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_player(
  p_profile_id uuid,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_email text,
  p_power_ranking int4,
  p_avatar_url text DEFAULT NULL,
  p_club_id uuid DEFAULT NULL,
  p_statuses text[] DEFAULT NULL,
  p_arrival_time time DEFAULT NULL,
  p_departure_time time DEFAULT NULL,
  p_event_id uuid DEFAULT NULL,
  p_round_id uuid DEFAULT NULL,
  p_event_date date DEFAULT NULL,
  p_payment_amount numeric(10,2) DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile_id uuid;
  v_user_id uuid;
  v_club_id uuid;
  v_is_super boolean;
  v_found_club uuid;
  v_is_visitor boolean;
  v_is_paid boolean;
  v_arrival_timestamp timestamptz;
  v_departure_timestamp timestamptz;
  v_status text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Seuls les admins peuvent creer/modifier des joueurs';
  END IF;

  v_is_super := public.is_superadmin();

  -- Le club de reference. Pour un admin ordinaire c'est le sien, quoi qu'il
  -- envoie. Le superadmin peut en designer un autre ; sans parametre, le sien.
  v_club_id := CASE WHEN v_is_super THEN coalesce(p_club_id, public.get_user_club_id())
                    ELSE public.get_user_club_id() END;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'Votre compte n est rattache a aucun club';
  END IF;

  -- Les cibles hors du club sont refusees avant toute ecriture.
  IF p_event_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.events e
                      WHERE e.id = p_event_id AND e.club_id = v_club_id) THEN
    RAISE EXCEPTION 'Cet evenement n appartient pas a votre club';
  END IF;

  IF p_round_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.event_rounds r
                       JOIN public.events e ON e.id = r.event_id
                      WHERE r.id = p_round_id AND e.club_id = v_club_id) THEN
    RAISE EXCEPTION 'Cette serie n appartient pas a votre club';
  END IF;

  -- ===================================
  -- ETAPE 1: GESTION DU PROFIL
  -- ===================================

  IF p_profile_id IS NULL THEN
    -- MODE CREATION

    /*
     * On cherche d'abord dans `profiles`, et non dans `auth.users` seule : un
     * joueur importe par fichier n'a pas de compte d'authentification, il
     * etait donc invisible et se dedoublait a chaque reajout.
     *
     * `useAdminPlayers` envoie `player.email || ''` : une case laissee vide
     * arrive comme chaine vide, pas comme NULL. Sans la garde ci-dessous, un
     * joueur sans email serait rapproche du premier profil sans email trouve
     * et l'ecraserait. La base en compte deja plusieurs.
     *
     * L'ordre rend le choix previsible quand plusieurs profils partagent une
     * adresse, ce que l'ancien defaut a produit : on prend celui qui a un
     * compte, puis le plus ancien.
     */
    IF p_email IS NOT NULL AND btrim(p_email) <> '' THEN
      SELECT p.id, p.club_id INTO v_profile_id, v_found_club
      FROM public.profiles p
      WHERE lower(btrim(p.email)) = lower(btrim(p_email))
      ORDER BY p.is_linked DESC NULLS LAST, p.created_at
      LIMIT 1;

      IF v_profile_id IS NULL THEN
        -- Pas de profil : reste le cas du compte cree sans profil.
        SELECT u.id INTO v_user_id FROM auth.users u
        WHERE lower(btrim(u.email)) = lower(btrim(p_email));
        v_profile_id := v_user_id;
        v_found_club := NULL;
      END IF;
    END IF;

    IF v_profile_id IS NOT NULL THEN
      -- Un joueur deja connu. On ne l'adopte que s'il est deja chez nous, ou
      -- sans club. Sinon c'est le joueur d'un autre club, et le reprendre
      -- reviendrait a le lui voler.
      IF v_found_club IS NOT NULL AND v_found_club <> v_club_id THEN
        RAISE EXCEPTION 'Cette adresse appartient deja a un joueur d un autre club';
      END IF;

      IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_profile_id) THEN
        UPDATE public.profiles
        SET first_name    = p_first_name,
            last_name     = p_last_name,
            phone         = p_phone,
            email         = p_email,
            power_ranking = p_power_ranking,
            avatar_url    = coalesce(p_avatar_url, avatar_url),
            club_id       = v_club_id,
            updated_at    = now()
        WHERE id = v_profile_id;
      ELSE
        INSERT INTO public.profiles (
          id, first_name, last_name, phone, email, power_ranking,
          avatar_url, club_id, role, is_linked
        )
        VALUES (
          v_profile_id, p_first_name, p_last_name, p_phone, p_email, p_power_ranking,
          p_avatar_url, v_club_id, 'user', true
        );
      END IF;

    ELSE
      -- Joueur inconnu : profil sans compte d'authentification.
      v_profile_id := gen_random_uuid();

      INSERT INTO public.profiles (
        id, first_name, last_name, phone, email, power_ranking,
        avatar_url, club_id, role, is_linked
      )
      VALUES (
        v_profile_id, p_first_name, p_last_name, p_phone, p_email, p_power_ranking,
        p_avatar_url, v_club_id, 'user', false
      );
    END IF;

  ELSE
    -- MODE EDITION
    v_profile_id := p_profile_id;

    /*
     * Le club figure dans le WHERE : un profil d'un autre club ne remonte pas,
     * le NOT FOUND ci-dessous rend « Profil non trouve », et rien ne revele
     * qu'il existe ailleurs. Un profil sans club est adoptable.
     */
    UPDATE public.profiles
    SET first_name    = p_first_name,
        last_name     = p_last_name,
        phone         = p_phone,
        email         = p_email,
        power_ranking = p_power_ranking,
        avatar_url    = coalesce(p_avatar_url, avatar_url),
        -- Le club ne bouge que s'il a ete demande explicitement.
        club_id       = CASE WHEN p_club_id IS NOT NULL THEN v_club_id ELSE club_id END,
        updated_at    = now()
    WHERE id = v_profile_id
      AND (v_is_super OR club_id = v_club_id OR club_id IS NULL);

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Profil non trouve avec l ID %', p_profile_id;
    END IF;
  END IF;

  -- ===================================
  -- ETAPE 2: GESTION DES STATUTS
  -- ===================================

  DELETE FROM public.player_status WHERE profile_id = v_profile_id;

  IF p_statuses IS NOT NULL AND array_length(p_statuses, 1) > 0 THEN
    FOREACH v_status IN ARRAY p_statuses LOOP
      IF v_status IN ('active', 'inactive', 'member', 'visitor') THEN
        INSERT INTO public.player_status (profile_id, status)
        VALUES (v_profile_id, v_status::player_status_enum)
        ON CONFLICT (profile_id, status) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  v_is_visitor := 'visitor' = ANY(p_statuses);
  v_is_paid    := 'paid'    = ANY(p_statuses);

  -- ===================================
  -- ETAPE 3: GESTION DU SCHEDULE
  -- ===================================

  IF p_arrival_time IS NOT NULL OR p_departure_time IS NOT NULL THEN
    IF p_arrival_time IS NOT NULL THEN
      v_arrival_timestamp := (CURRENT_DATE + p_arrival_time)::timestamptz;
    END IF;

    IF p_departure_time IS NOT NULL THEN
      v_departure_timestamp := (CURRENT_DATE + p_departure_time)::timestamptz;
    END IF;

    INSERT INTO public.schedule (profile_id, event_id, arrival, departure)
    VALUES (v_profile_id, NULL, v_arrival_timestamp, v_departure_timestamp)
    ON CONFLICT (profile_id) WHERE event_id IS NULL
    DO UPDATE SET
      arrival    = EXCLUDED.arrival,
      departure  = EXCLUDED.departure,
      created_at = now();
  END IF;

  -- ===================================
  -- ETAPE 4: GESTION DES PAIEMENTS (par round)
  -- ===================================

  IF p_round_id IS NOT NULL AND v_is_visitor THEN
    INSERT INTO public.payments (profile_id, round_id, amount, status, paid_at)
    VALUES (
      v_profile_id,
      p_round_id,
      p_payment_amount,
      CASE WHEN v_is_paid THEN 'paid'::payment_status_enum ELSE 'unpaid'::payment_status_enum END,
      CASE WHEN v_is_paid THEN now() ELSE NULL END
    )
    ON CONFLICT (profile_id, round_id)
    DO UPDATE SET
      amount     = EXCLUDED.amount,
      status     = EXCLUDED.status,
      paid_at    = EXCLUDED.paid_at,
      updated_at = now();
  ELSIF p_round_id IS NOT NULL AND NOT v_is_visitor THEN
    DELETE FROM public.payments
    WHERE profile_id = v_profile_id AND round_id = p_round_id;
  END IF;

  -- ===================================
  -- ETAPE 5: INSCRIPTION A L'EVENEMENT
  -- ===================================

  IF p_event_id IS NOT NULL AND 'active' = ANY(p_statuses) THEN
    INSERT INTO public.event_players (event_id, profile_id)
    VALUES (p_event_id, v_profile_id)
    ON CONFLICT (event_id, profile_id) DO NOTHING;
  END IF;

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
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Un DROP puis CREATE rend l'execution a PUBLIC par defaut : sans ces deux
-- lignes, cette migration deferait discretement la migration 30 pour cette
-- fonction.
REVOKE EXECUTE ON FUNCTION public.upsert_player(uuid, text, text, text, text, int4, text, uuid, text[], time, time, uuid, uuid, date, numeric) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.upsert_player(uuid, text, text, text, text, int4, text, uuid, text[], time, time, uuid, uuid, date, numeric) TO authenticated;
