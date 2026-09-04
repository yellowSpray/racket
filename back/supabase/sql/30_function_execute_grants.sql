-- ===========================================================================
-- 30 - QUI PEUT EXECUTER QUOI
-- ===========================================================================
--
-- Aucun `revoke` n'a jamais ete pose sur les fonctions : les vingt-neuf sont
-- executables par tout le monde, y compris par un visiteur non connecte. Or
-- vingt-six d'entre elles sont en `security definer`, donc s'executent avec
-- les droits de leur proprietaire. C'est ce que l'advisor Supabase signale
-- sous « Public Can Execute SECURITY DEFINER Function ».
--
-- Concretement, aujourd'hui n'importe qui peut appeler `elo_recompute_club`
-- et rejouer le classement de n'importe quel club, ou `upsert_player` et
-- creer un joueur.
--
-- Trois familles, trois traitements.
--
-- 1. DECLENCHEURS. Douze fonctions rendent un `trigger`. PostgreSQL les
--    appelle lui-meme, sans consulter les droits d'execution : leur retirer
--    l'execution ne les empeche pas de se declencher. Verifie sur PG16.
--
-- 2. ROUAGES INTERNES. Les fonctions Elo sont appelees par le declencheur,
--    jamais depuis le client. `create_new_round`, creee par la migration 14,
--    n'est appelee nulle part, ni dans le front ni dans le SQL : elle est
--    morte et pourra etre supprimee. `apply_event_elo` est l'ancienne version
--    remplacee par la 20. Toutes perdent l'execution.
--
-- 3. RPC DE L'APPLICATION. Sept fonctions, relevees dans le code :
--       get_event_by_invite_token   useInviteLink
--       remove_club_member          useClubMembers
--       request_visitor_registration useVisitorRequests
--       review_visitor_request      useVisitorRequests
--       update_event_statuses       EventContext
--       update_member_role          useClubMembers
--       upsert_player               useAdminPlayers
--    Elles gardent l'execution pour `authenticated` et la perdent pour
--    `anon`. La page d'invitation est derriere `ProtectedRoute`, donc aucune
--    de ces sept n'est appelee sans connexion.
--
-- LES TROIS HELPERS RLS NE SONT PAS TOUCHES : `is_admin()`, `is_superadmin()`
-- et `get_user_club_id()` sont appelees depuis l'interieur des policies. Le
-- role qui interroge une table doit pouvoir les executer, sinon la requete
-- tombe en erreur au lieu de rendre zero ligne. L'advisor continuera de les
-- signaler ; c'est un faux positif assume, et sans consequence : elles ne
-- renvoient que des faits sur l'appelant lui-meme, es-tu admin et quel est
-- ton club, qu'il connait deja.
--
-- `postgres` et `service_role` ne sont pas touches non plus.
--
-- Ce fichier est rejouable.
-- ===========================================================================

DO $migration$
DECLARE
    r         record;
    v_revoked int := 0;
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS signature, p.prokind
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public'
           AND p.prokind IN ('f', 'p')
           AND p.proname NOT IN ('is_admin', 'is_superadmin', 'get_user_club_id')
           AND NOT EXISTS (
                 SELECT 1 FROM pg_depend d
                  WHERE d.objid = p.oid AND d.deptype = 'e'
               )
         ORDER BY p.oid::regprocedure::text
    LOOP
        EXECUTE format(
            'REVOKE EXECUTE ON %s %s FROM PUBLIC, anon, authenticated',
            CASE r.prokind WHEN 'p' THEN 'PROCEDURE' ELSE 'FUNCTION' END,
            r.signature
        );
        v_revoked := v_revoked + 1;
    END LOOP;

    RAISE NOTICE '% fonctions fermees', v_revoked;
END
$migration$;


-- ===========================================================================
-- Rendre l'execution aux sept RPC que l'application appelle
-- ===========================================================================
-- Une fonction absente de cette liste n'est plus appelable depuis le client.
-- C'est volontairement le seul endroit ou cette decision se prend.

GRANT EXECUTE ON FUNCTION public.get_event_by_invite_token(uuid)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_club_member(uuid)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_visitor_registration(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_visitor_request(uuid, text)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_event_statuses()                TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_member_role(uuid, user_role)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_player(
    uuid, text, text, text, text, integer, text, uuid, text[],
    time without time zone, time without time zone, uuid, uuid, date, numeric
) TO authenticated;


-- ===========================================================================
-- Verification
-- ===========================================================================
-- 1. Il ne doit plus rester que les trois helpers ouverts a PUBLIC :
--
--      select p.oid::regprocedure as fonction
--        from pg_proc p
--        join pg_namespace n on n.oid = p.pronamespace
--       where n.nspname = 'public'
--         and p.prokind in ('f','p')
--         and not exists (select 1 from pg_depend d
--                          where d.objid = p.oid and d.deptype = 'e')
--         and exists (select 1 from aclexplode(p.proacl) a
--                      where a.privilege_type = 'EXECUTE' and a.grantee = 0)
--       order by 1;
--
--    Attendu : get_user_club_id(), is_admin(), is_superadmin()
--
-- 2. Les sept RPC doivent rester appelables par authenticated :
--
--      select p.oid::regprocedure as fonction
--        from pg_proc p
--        join pg_namespace n on n.oid = p.pronamespace
--       where n.nspname = 'public'
--         and exists (select 1 from aclexplode(p.proacl) a
--                      where a.privilege_type = 'EXECUTE'
--                        and pg_get_userbyid(a.grantee) = 'authenticated')
--       order by 1;
--
-- 3. Et surtout, l'application doit continuer de tourner : ajouter un joueur,
--    saisir un score, ouvrir un lien d'invitation, changer un role.
--
-- ===========================================================================
