-- ===========================================================================
-- 28 - RESTREINDRE LES COLONNES DE PROFILES QU'UN JOUEUR PEUT ECRIRE
-- ===========================================================================
--
-- La migration 27 a rendu la modification de profil de nouveau possible, en
-- accordant a `authenticated` toutes les colonnes sauf `id` et `role`. C'etait
-- trop large, et la liste effective le montre :
--
--     activation_token, address, avatar_url, club_id, created_at, email,
--     first_name, is_linked, last_name, phone, power_ranking, updated_at
--
-- Un joueur pouvait donc, par un appel direct a l'API :
--   - se donner le classement Elo de son choix   (power_ranking)
--   - se rattacher au club de son choix          (club_id)
--   - toucher a la liaison de son compte         (activation_token, is_linked)
--
-- Ce n'est pas une regression apportee par la 27 : le droit portait deja sur
-- la table entiere, donc sur toutes les colonnes. C'est le bug de recursion
-- qui bloquait toute ecriture et masquait le probleme. Le reparer a ouvert
-- une porte qui n'etait fermee que par accident.
--
-- On passe donc d'une liste d'exclusion a une liste d'autorisation : les cinq
-- champs que la page de profil envoie, et rien d'autre. Tout le reste est du
-- ressort de l'administration, qui passe par `upsert_player` en
-- `security definer`, verifie : c'est le seul chemin par lequel
-- l'application modifie un joueur.
--
-- Ajouter un champ modifiable par son proprietaire demande d'ajouter une
-- colonne a la liste ci-dessous. C'est volontairement le seul endroit ou
-- cette decision se prend.
--
-- Verifie sur PostgreSQL 16 : les cinq champs restent modifiables par leur
-- proprietaire, power_ranking et club_id sont refuses, et `upsert_player`
-- continue d'ecrire ce qu'il veut.
--
-- Ce fichier est rejouable.
-- ===========================================================================

-- Revoquer d'abord : un droit sur la table entiere l'emporte sur les droits
-- par colonne, et la 27 en a laisse un.
REVOKE UPDATE ON public.profiles FROM authenticated, anon;

GRANT UPDATE (
    first_name,
    last_name,
    email,
    phone,
    address
) ON public.profiles TO authenticated;

-- ===========================================================================
-- Verification
-- ===========================================================================
-- 1. La liste doit rendre exactement : address, email, first_name, last_name, phone
--
--      select string_agg(column_name, ', ' order by column_name)
--        from information_schema.column_privileges
--       where grantee = 'authenticated' and table_schema = 'public'
--         and table_name = 'profiles' and privilege_type = 'UPDATE';
--
-- 2. Le classement ne doit plus etre modifiable par son proprietaire.
--    Attendu : permission denied for table profiles
--
--      begin;
--        select set_config('request.jwt.claims',
--               json_build_object('sub', (select id from public.profiles limit 1))::text, true);
--        set local role authenticated;
--        update public.profiles set power_ranking = 9999
--         where id = (current_setting('request.jwt.claims')::json->>'sub')::uuid;
--      rollback;
--
-- 3. Le prenom doit rester modifiable. Attendu : UPDATE 1
--
--      begin;
--        select set_config('request.jwt.claims',
--               json_build_object('sub', (select id from public.profiles limit 1))::text, true);
--        set local role authenticated;
--        update public.profiles set first_name = first_name
--         where id = (current_setting('request.jwt.claims')::json->>'sub')::uuid;
--      rollback;
--
-- ===========================================================================
