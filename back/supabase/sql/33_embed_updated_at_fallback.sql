-- ===========================================================================
-- 33 - DATE DE MISE A JOUR VISIBLE AVANT LE PREMIER SCORE
-- ===========================================================================
--
-- La migration 32 calculait la date de mise a jour sur les seuls matchs ayant
-- un score :
--
--     WHERE gr.round_id = v_round.id AND ma.score IS NOT NULL
--
-- Une serie fraichement publiee n'a aucun score, la date valait donc `null` et
-- le badge disparaissait. Or c'est justement au moment ou le club publie ses
-- tableaux que les joueurs veulent savoir de quand ils datent.
--
-- « Mis a jour le » repond a la question « cet affichage est-il recent », pas
-- « un score a-t-il ete saisi ». On prend donc la derniere modification de
-- n'importe quel match de la serie, et a defaut celle de la serie elle-meme,
-- ce qui couvre le cas d'une serie sans aucun match.
--
-- Verifie sur PostgreSQL 16 : serie sans aucun score, serie avec scores, et
-- serie sans aucun match.
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

    SELECT r.id, r.round_number, r.start_date, r.end_date, r.status, r.updated_at
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

    SELECT coalesce(json_agg(s ORDER BY s.round_number), '[]'::json)
      INTO v_series
      FROM (
        SELECT r.round_number, r.status
          FROM public.event_rounds r
         WHERE r.event_id = v_event.id
      ) s;

    -- Derniere modification d'un match de la serie, quel que soit son etat,
    -- et a defaut celle de la serie : une serie publiee sans match a quand
    -- meme une date.
    SELECT coalesce(
             (SELECT max(ma.updated_at)
                FROM public.matches ma
                JOIN public.groups gr ON gr.id = ma.group_id
               WHERE gr.round_id = v_round.id),
             v_round.updated_at
           )
      INTO v_updated;

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
