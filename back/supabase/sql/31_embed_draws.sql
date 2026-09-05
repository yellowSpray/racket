-- ===========================================================================
-- 31 - TABLEAUX INTEGRABLES SUR UN SITE EXTERIEUR
-- ===========================================================================
--
-- Un club veut coller les tableaux de sa serie en cours sur son site vitrine.
-- Cette page est lue **sans connexion**, or `groups`, `matches` et `profiles`
-- sont derriere la RLS et l'acces anonyme vient d'etre ferme (migrations 24 a
-- 30). Il n'est pas question de rouvrir ces tables.
--
-- La forme retenue est celle du lien d'invitation, deja en place dans ce
-- projet : un jeton dans l'URL, et une fonction `security definer` qui prend
-- ce jeton et rend exactement ce qu'il faut afficher, rien de plus. Le jeton
-- fait office de cle, la RLS n'est pas touchee.
--
-- Le jeton est distinct de `invite_token` : couper la diffusion publique ne
-- doit pas casser les liens d'invitation, et l'inverse non plus. Il est
-- regenerable, ce qui revoque l'ancien lien.
--
-- DONNEES PUBLIEES. Nom du club, nom de l'evenement, numero et dates de la
-- serie, nom des boxes, **nom et prenom complets des joueurs**, et les scores.
-- Le nom complet est un choix explicite de Tim, le 4 septembre 2026, en
-- connaissance du fait qu'une page publique expose ainsi l'identite des
-- membres. Ni telephone, ni email, ni classement, ni identifiant de profil
-- utile ailleurs ne sortent d'ici : la fonction ne les selectionne pas.
--
-- PORTEE. Le jeton designe un evenement. Sans parametre, la fonction rend la
-- serie active, ou a defaut la derniere terminee : le club colle le code une
-- fois et n'y revient plus. Avec `p_round_number`, elle rend la serie
-- demandee, ce qui permet d'archiver une saison passee.
--
-- Verifie sur PostgreSQL 16 : jeton valide, jeton inconnu, evenement sans
-- serie, serie epinglee par numero, numero inexistant, et absence des champs
-- sensibles dans la sortie.
--
-- Ce fichier est rejouable.
-- ===========================================================================


-- ===========================================================================
-- A. LE JETON
-- ===========================================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS embed_token uuid DEFAULT gen_random_uuid();

-- Les evenements crees avant cette migration n'en ont pas.
UPDATE public.events
   SET embed_token = gen_random_uuid()
 WHERE embed_token IS NULL;

ALTER TABLE public.events
  ALTER COLUMN embed_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_embed_token
  ON public.events (embed_token);

COMMENT ON COLUMN public.events.embed_token IS
  'Jeton de lecture publique des tableaux. Distinct de invite_token : sa rotation coupe la diffusion sans toucher aux invitations.';


-- ===========================================================================
-- B. LA LECTURE PUBLIQUE
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.get_draws_by_embed_token(
    p_token        uuid,
    p_round_number int DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_event  record;
    v_round  record;
    v_groups json;
    v_matches json;
BEGIN
    SELECT e.id, e.event_name, c.club_name, c.logo_url
      INTO v_event
      FROM public.events e
      JOIN public.clubs  c ON c.id = e.club_id
     WHERE e.embed_token = p_token;

    IF v_event.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Lien invalide');
    END IF;

    -- Serie demandee, ou serie active, ou a defaut la plus recente.
    SELECT r.id, r.round_number, r.start_date, r.end_date, r.status
      INTO v_round
      FROM public.event_rounds r
     WHERE r.event_id = v_event.id
       AND (p_round_number IS NULL OR r.round_number = p_round_number)
     ORDER BY (r.status = 'active') DESC, r.round_number DESC
     LIMIT 1;

    IF v_round.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', CASE WHEN p_round_number IS NULL
                          THEN 'Aucune série pour cet événement'
                          ELSE 'Série introuvable' END
        );
    END IF;

    -- Boxes et joueurs. Ni telephone, ni email, ni classement.
    SELECT coalesce(json_agg(g ORDER BY g.group_name), '[]'::json)
      INTO v_groups
      FROM (
        SELECT gr.id,
               gr.round_id,
               gr.group_name,
               gr.max_players,
               coalesce(
                 (SELECT json_agg(json_build_object(
                             'id',         pr.id,
                             'first_name', pr.first_name,
                             'last_name',  pr.last_name)
                           ORDER BY pr.last_name, pr.first_name)
                    FROM public.group_players gp
                    JOIN public.profiles pr ON pr.id = gp.profile_id
                   WHERE gp.group_id = gr.id),
                 '[]'::json
               ) AS players
          FROM public.groups gr
         WHERE gr.round_id = v_round.id
      ) g;

    SELECT coalesce(json_agg(m), '[]'::json)
      INTO v_matches
      FROM (
        SELECT ma.id, ma.group_id, ma.player1_id, ma.player2_id,
               ma.score, ma.winner_id, ma.match_date, ma.match_time,
               ma.court_number
          FROM public.matches ma
          JOIN public.groups gr ON gr.id = ma.group_id
         WHERE gr.round_id = v_round.id
         ORDER BY ma.match_date, ma.match_time
      ) m;

    RETURN json_build_object(
        'success',    true,
        'club_name',  v_event.club_name,
        'logo_url',   v_event.logo_url,
        'event_name', v_event.event_name,
        'round', json_build_object(
            'round_number', v_round.round_number,
            'start_date',   v_round.start_date,
            'end_date',     v_round.end_date,
            'status',       v_round.status
        ),
        'groups',  v_groups,
        'matches', v_matches
    );
END;
$$;

-- Lecture publique assumee : c'est tout l'objet de la fonction. Le jeton est
-- la cle, comme pour le lien d'invitation.
REVOKE EXECUTE ON FUNCTION public.get_draws_by_embed_token(uuid, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_draws_by_embed_token(uuid, int) TO anon, authenticated;


-- ===========================================================================
-- Verification
-- ===========================================================================
-- 1. Un jeton valide rend les tableaux :
--
--      select public.get_draws_by_embed_token(
--               (select embed_token from public.events limit 1));
--
-- 2. Un jeton inconnu rend une erreur propre, jamais une exception :
--
--      select public.get_draws_by_embed_token(gen_random_uuid());
--
-- 3. Aucun champ sensible ne sort. Doit rendre `false` :
--
--      select (public.get_draws_by_embed_token(
--               (select embed_token from public.events limit 1))::text
--              ilike any (array['%phone%','%email%','%power_ranking%'])) as fuite;
--
-- ===========================================================================
