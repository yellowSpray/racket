-- ===========================================================================
-- 38 - LE BAREME DE L'EVENEMENT DANS LES TABLEAUX INTEGRES
-- ===========================================================================
--
-- Les totaux affiches dans le cadre integre ne correspondaient pas a ceux de
-- l'application. Sur le club pilote, une victoire 3-1 valait 5 points dans
-- l'ecran des tableaux et 4 dans l'iframe, un forfait 4 et 0 d'un cote, 3 et
-- -1 de l'autre.
--
-- La cause n'est pas un decalage entre deux niveaux de regles : c'est que le
-- cadre integre n'en recoit **aucune**. `DrawTable` prend un bareme optionnel
-- et retombe, a defaut, sur `DEFAULT_SCORE_POINTS`, ecrit en dur dans
-- `lib/effectiveRules.ts`. La page d'administration lui passe le bareme
-- resolu par `useEffectiveRules` ; la page integree ne lui passait rien.
--
-- Et elle ne pouvait pas le lire elle-meme : `useEffectiveRules` interroge
-- `event_scoring_rules` et `scoring_rules` en direct, deux tables derriere la
-- RLS, alors que le visiteur d'un cadre integre est anonyme. C'est bien ainsi.
-- Le bareme doit donc arriver par le meme chemin que le reste, cette fonction,
-- qui est `SECURITY DEFINER`.
--
-- RESOLUTION. Meme ordre que `resolveRules` cote front : le bareme de
-- l'evenement s'il existe, sinon celui du club, sinon `null`. Dans ce dernier
-- cas le front garde son repli, et les deux pages affichent alors la meme
-- chose puisqu'elles partagent la meme constante.
--
-- Le niveau serie n'existe pas : les regles vivent au club et a l'evenement,
-- `event_scoring_rules` porte un `UNIQUE (event_id)`. Une serie herite donc du
-- bareme de son evenement. Si un niveau serie apparait un jour, il suffira de
-- l'ajouter en tete du `coalesce` ci-dessous, sans toucher au front.
--
-- Rien de nouveau ne sort de la base : un bareme de points, c'est deja ce que
-- les joueurs lisent dans la colonne Total.
--
-- La signature ne change pas.
--
-- Verifie sur PostgreSQL 16 : bareme de l'evenement, repli sur le club,
-- absence des deux, et serie epinglee inchangee.
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
    -- `club_id` est desormais retenu : il sert au repli du bareme.
    SELECT e.id, e.club_id, e.event_name, c.club_name, c.logo_url
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

    -- Le bareme de l'evenement l'emporte sur celui du club. `null` si aucun
    -- des deux n'existe : le front applique alors son propre defaut, le meme
    -- que celui de l'application.
    SELECT coalesce(
             (SELECT esr.score_points
                FROM public.event_scoring_rules esr
               WHERE esr.event_id = v_event.id),
             (SELECT sr.score_points
                FROM public.scoring_rules sr
               WHERE sr.club_id = v_event.club_id)
           )
      INTO v_points;

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

REVOKE EXECUTE ON FUNCTION public.get_draws_by_embed_token(uuid, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_draws_by_embed_token(uuid, int) TO anon, authenticated;


-- ===========================================================================
-- Verification
-- ===========================================================================
-- Le bareme rendu doit etre celui de l'evenement, ou celui du club a defaut :
--
--   select j->'score_points'
--     from public.get_draws_by_embed_token(
--            (select embed_token from public.events limit 1)) j;
--
-- Et il doit correspondre a ce que l'ecran des tableaux applique, colonne
-- Total pour Total.
-- ===========================================================================
