-- ===========================================================================
-- 27 - REPARER LA MODIFICATION DE PROFIL
-- ===========================================================================
--
-- BUG EN PRODUCTION. Modifier son propre profil depuis la page de profil ne
-- fait rien, et rien ne le signale.
--
-- La policy « Users can update their own profile » porte ce controle :
--
--     WITH CHECK (auth.uid() = id
--                 AND role = (SELECT role FROM profiles WHERE id = auth.uid()))
--
-- La sous-requete interroge `profiles` depuis une policy posee sur `profiles`.
-- PostgreSQL detecte la boucle et refuse :
--
--     ERROR: infinite recursion detected in policy for relation "profiles"
--
-- Cote application, `ProfilePage.saveProfile` ne recupere pas l'erreur, a la
-- difference de tous les autres appels du meme fichier. Elle est donc jetee,
-- la boite de dialogue se ferme et l'ecran se recharge avec les anciennes
-- valeurs. L'echec est invisible.
--
-- Ce que la sous-requete voulait garantir, c'est qu'un utilisateur ne se
-- promeuve pas lui-meme. Cette garantie passe du niveau policy au niveau
-- privilege, ou elle ne peut pas boucler : le role connecte perd simplement
-- le droit d'ecrire la colonne `role`.
--
-- ATTENTION, meme piege qu'a la migration 25 : un droit UPDATE pose sur la
-- table entiere l'emporte sur les droits par colonne. Revoquer la seule
-- colonne `role` n'a aucun effet tant que le droit sur la table subsiste.
-- Verifie sur PostgreSQL 16 : avec le droit sur la table, l'ecriture de
-- `role` passe malgre la revocation ; apres revocation de la table et droits
-- par colonne, elle est refusee.
--
-- Les changements de role legitimes continuent de fonctionner : ils passent
-- par `update_member_role`, en `security definer`, qui ecrit avec les droits
-- de son proprietaire. Verifie aussi.
--
-- Ce fichier est rejouable.
-- ===========================================================================


-- ===========================================================================
-- A. LE CONTROLE PASSE AU NIVEAU DES PRIVILEGES
-- ===========================================================================
-- La liste des colonnes est calculee depuis le catalogue : on decrit ce qui
-- est interdit, `id` et `role`, plutot que d'enumerer ce qui est permis. Une
-- colonne ajoutee plus tard a `profiles` devra malgre tout etre accordee ici,
-- sinon elle sera lisible mais non modifiable par son proprietaire.

DO $privileges$
DECLARE
    v_cols text;
BEGIN
    SELECT string_agg(quote_ident(c.column_name), ', ' ORDER BY c.ordinal_position)
      INTO v_cols
      FROM information_schema.columns c
     WHERE c.table_schema = 'public'
       AND c.table_name   = 'profiles'
       AND c.column_name NOT IN ('id', 'role');

    -- Revoquer d'abord : sans cela, les droits par colonne sont sans effet.
    EXECUTE 'REVOKE UPDATE ON public.profiles FROM authenticated, anon';

    -- Un visiteur non connecte n'a rien a modifier : il ne recupere rien.
    EXECUTE format('GRANT UPDATE (%s) ON public.profiles TO authenticated', v_cols);

    RAISE NOTICE 'colonnes modifiables par authenticated : %', v_cols;
END
$privileges$;


-- ===========================================================================
-- B. LA POLICY PERD SA SOUS-REQUETE
-- ===========================================================================
-- Il reste `auth.uid() = id` des deux cotes : on ne modifie que sa propre
-- ligne, et on ne peut pas la reattribuer a quelqu'un d'autre au passage.

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO public
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);


-- ===========================================================================
-- Verification
-- ===========================================================================
-- 1. La modification de son propre profil doit passer, et non plus lever
--    « infinite recursion » :
--
--      begin;
--      set local role authenticated;
--      set local request.jwt.claims = '{"sub":"UN_UUID_DE_PROFIL"}';
--      update public.profiles set first_name = first_name where id = 'UN_UUID_DE_PROFIL';
--      rollback;
--
-- 2. L'ecriture de la colonne role doit etre refusee :
--
--      begin;
--      set local role authenticated;
--      set local request.jwt.claims = '{"sub":"UN_UUID_DE_PROFIL"}';
--      update public.profiles set role = 'admin' where id = 'UN_UUID_DE_PROFIL';
--      rollback;
--
--    Attendu : permission denied for table profiles
--
-- 3. Les colonnes accordees :
--
--      select string_agg(column_name, ', ' order by column_name)
--        from information_schema.column_privileges
--       where grantee = 'authenticated' and table_schema = 'public'
--         and table_name = 'profiles' and privilege_type = 'UPDATE';
--
-- ===========================================================================
