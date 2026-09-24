-- ===========================================================================
-- 40 - LE CADRE INTEGRE NE MONTRE QUE LES SERIES PUBLIEES
-- ===========================================================================
--
-- Remplace la definition de `get_draws_by_embed_token` posee par la migration
-- 38. La signature ne change pas, le front non plus.
--
-- LE DEFAUT. La fonction ne se demandait jamais si une serie avait des
-- tableaux. Deux consequences, visibles des qu'une nouvelle serie est creee :
--
--   1. la navigation du cadre listait toutes les series de l'evenement, y
--      compris celle qu'on venait de creer et qui etait encore vide ;
--   2. la serie affichee par defaut etait la serie active, sinon la plus
--      recente : une serie 5 vide, ou une serie 5 active dont l'assistant
--      n'etait pas termine, remplacait la serie 4 sur le site du club.
--
-- LE CRITERE. Une serie est publiee quand elle a **au moins un match**. Pas
-- seulement des boxes : l'assistant cree les `groups` a son etape Groupes et
-- les matchs a l'etape suivante. Avec « une box existe », une serie a moitie
-- configuree apparaissait avec des tableaux sans aucune date. Decide avec Tim
-- le 24 septembre 2026.
--
-- CE QUI CHANGE.
--
--   - La navigation ne liste que les series publiees.
--   - Par defaut : la serie active parmi les publiees, sinon la plus recente
--     des publiees. Pendant qu'on prepare la serie 5, le cadre reste sur la 4.
--   - Une serie epinglee par `?serie=N` qui existe mais n'est pas publiee
--     rend « Les tableaux de cette série ne sont pas encore publiés », au lieu
--     d'une page de tableaux vides. Une serie qui n'existe pas garde
--     « Série introuvable ».
--   - Un evenement sans aucune serie publiee rend « Aucun tableau publié pour
--     le moment », au lieu d'afficher sa serie vide.
--
-- Le reste est inchange : bareme, fraicheur, boxes, joueurs et matchs d'une
-- serie publiee sortent a l'identique, verifie colonne par colonne.
--
-- Verifie sur PostgreSQL 16 : matrice de dix scenarios, jouee en role `anon`
-- avant et apres, comparee ligne a ligne. Voir la fin du fichier.
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
    v_points   jsonb;
BEGIN
    SELECT e.id, e.club_id, e.event_name, c.club_name, c.logo_url
      INTO v_event
      FROM public.events e
      JOIN public.clubs  c ON c.id = e.club_id
     WHERE e.embed_token = p_token;

    IF v_event.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Lien invalide');
    END IF;

    -- Une serie est publiee quand l'un de ses tableaux porte au moins un match.
    SELECT r.id, r.round_number, r.start_date, r.end_date, r.status, r.updated_at,
           EXISTS (
             SELECT 1
               FROM public.matches ma
               JOIN public.groups gr ON gr.id = ma.group_id
              WHERE gr.round_id = r.id
           ) AS publiee
      INTO v_round
      FROM public.event_rounds r
     WHERE r.event_id = v_event.id
       AND (
             -- Epinglee : on la cherche telle quelle, pour distinguer
             -- « introuvable » de « pas encore publiee ».
             r.round_number = p_round_number
             OR (
               p_round_number IS NULL
               AND EXISTS (
                 SELECT 1
                   FROM public.matches ma
                   JOIN public.groups gr ON gr.id = ma.group_id
                  WHERE gr.round_id = r.id
               )
             )
           )
     ORDER BY (r.status = 'active') DESC, r.round_number DESC
     LIMIT 1;

    IF v_round.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', CASE WHEN p_round_number IS NULL
                          THEN 'Aucun tableau publié pour le moment'
                          ELSE 'Série introuvable' END
        );
    END IF;

    IF NOT v_round.publiee THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Les tableaux de cette série ne sont pas encore publiés'
        );
    END IF;

    SELECT coalesce(
             (SELECT esr.score_points
                FROM public.event_scoring_rules esr
               WHERE esr.event_id = v_event.id),
             (SELECT sr.score_points
                FROM public.scoring_rules sr
               WHERE sr.club_id = v_event.club_id)
           )
      INTO v_points;

    -- La navigation ne propose que les series publiees.
    SELECT coalesce(json_agg(s ORDER BY s.round_number), '[]'::json)
      INTO v_series
      FROM (
        SELECT r.round_number, r.status
          FROM public.event_rounds r
         WHERE r.event_id = v_event.id
           AND EXISTS (
                 SELECT 1
                   FROM public.matches ma
                   JOIN public.groups gr ON gr.id = ma.group_id
                  WHERE gr.round_id = r.id
               )
      ) s;

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
        'success',      true,
        'club_name',    v_event.club_name,
        'logo_url',     v_event.logo_url,
        'event_name',   v_event.event_name,
        'score_points', v_points,
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

-- `CREATE OR REPLACE` garde les droits, mais on les repose : ce fichier doit
-- decrire a lui seul ce qui tourne.
REVOKE EXECUTE ON FUNCTION public.get_draws_by_embed_token(uuid, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_draws_by_embed_token(uuid, int) TO anon, authenticated;


-- ===========================================================================
-- Verification
-- ===========================================================================
-- Les series que le cadre proposera, par evenement :
--
--   select e.event_name, r.round_number, r.status,
--          exists (select 1 from public.matches ma
--                    join public.groups gr on gr.id = ma.group_id
--                   where gr.round_id = r.id) as publiee
--     from public.event_rounds r
--     join public.events e on e.id = r.event_id
--    order by e.event_name, r.round_number;
--
-- Matrice jouee avant (38) et apres (40), en role anon :
--
--   cas                                          avant                 apres
--   A defaut : active 3, serie 4 vide            serie 3, nav 1-4      serie 3, nav 1-3
--   A epinglee 2 (publiee)                       serie 2               serie 2, identique
--   A epinglee 4 (vide)                          serie 4, vide         pas encore publies
--   A epinglee 9 (inexistante)                   introuvable           introuvable
--   B defaut : active 2, boxes sans match        serie 2, vide         serie 1, nav 1
--   B epinglee 2 (boxes sans match)              serie 2, vide         pas encore publies
--   C defaut : aucune serie publiee              serie 1, vide         aucun tableau publie
--   D defaut : active 1, 2 a venir publiee       serie 1, nav 1-2      serie 1, nav 1-2
--   E defaut : pas d'active, 3 vide              serie 3, vide         serie 2, nav 1-2
--   Jeton inconnu                                lien invalide         lien invalide
-- ===========================================================================
