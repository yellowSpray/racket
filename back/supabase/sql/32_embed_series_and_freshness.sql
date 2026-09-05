-- ===========================================================================
-- 32 - NAVIGATION ENTRE SERIES ET DATE DE MISE A JOUR DANS L'EMBED
-- ===========================================================================
--
-- L'embed portait une seule serie. Un club qui publie ses tableaux veut aussi
-- donner acces aux series precedentes, et surtout dire si ce qui est affiche
-- est a jour.
--
-- Deux ajouts a `get_draws_by_embed_token`, la signature ne change pas :
--
--   `series`      la liste des series de l'evenement, numero et statut, pour
--                 que le cadre affiche sa propre navigation. Un seul iframe
--                 remplace alors une page par serie.
--
--   `updated_at`  la derniere saisie de score de la serie affichee, et non la
--                 date de la serie. C'est la question que se pose un joueur
--                 devant un tableau : est-ce que c'est a jour. `null` tant
--                 qu'aucun score n'a ete saisi.
--
-- Rien de nouveau ne sort de la base : ni telephone, ni email, ni classement.
--
-- Verifie sur PostgreSQL 16 : liste des series ordonnee, date de derniere
-- saisie correcte, `null` sans aucun score, et serie epinglee inchangee.
--
-- Ce fichier est rejouable.
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
    v_event    record;
    v_round    record;
    v_groups   json;
    v_matches  json;
    v_series   json;
    v_updated  timestamptz;
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

    -- Toutes les series de l'evenement, pour la navigation du cadre.
    SELECT coalesce(json_agg(s ORDER BY s.round_number), '[]'::json)
      INTO v_series
      FROM (
        SELECT r.round_number, r.status
          FROM public.event_rounds r
         WHERE r.event_id = v_event.id
      ) s;

    -- Derniere saisie de score sur la serie affichee.
    SELECT max(ma.updated_at)
      INTO v_updated
      FROM public.matches ma
      JOIN public.groups gr ON gr.id = ma.group_id
     WHERE gr.round_id = v_round.id
       AND ma.score IS NOT NULL;

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
            'status',       v_round.status,
            'updated_at',   v_updated
        ),
        'series',  v_series,
        'groups',  v_groups,
        'matches', v_matches
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_draws_by_embed_token(uuid, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_draws_by_embed_token(uuid, int) TO anon, authenticated;

-- ===========================================================================
-- Verification
-- ===========================================================================
--   select public.get_draws_by_embed_token(
--            (select embed_token from public.events limit 1))->'series';
--
--   select public.get_draws_by_embed_token(
--            (select embed_token from public.events limit 1))->'round'->>'updated_at';
-- ===========================================================================
