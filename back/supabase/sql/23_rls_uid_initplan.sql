-- ===========================================================================
-- 23 - AUTH.UID() EVALUE UNE FOIS PAR REQUETE, ET NON PAR LIGNE
-- ===========================================================================
--
-- Ecrit tel quel dans une policy, `auth.uid()` est appele pour chaque ligne
-- examinee par PostgreSQL. Sur la liste des joueurs d'un club, cela fait un
-- appel par profil, avant meme le filtrage.
--
-- Enveloppe en `(select auth.uid())`, l'appel devient une sous-requete scalaire
-- sans correlation avec la ligne courante. Le planificateur la hisse en
-- InitPlan et l'evalue une seule fois pour toute la requete. Le resultat est
-- identique : `auth.uid()` est declaree STABLE et ne depend d'aucune ligne.
-- C'est le reglage recommande par Supabase lui-meme.
--
-- Ce script ne reecrit pas les policies a la main. Il les lit dans le
-- catalogue, ce qui garantit qu'il agit sur ce qui existe reellement en base
-- et non sur ce que les fichiers de migration decrivent. Chaque policy est
-- modifiee par ALTER POLICY, qui remplace les expressions sans supprimer la
-- policy : son nom, sa commande, ses roles et son caractere permissif ou
-- restrictif sont conserves.
--
-- Le script est rejouable : une policy deja enveloppee est ramenee a sa forme
-- nue avant d'etre re-enveloppee, ce qui evite les empilements.
--
-- Verifie sur PostgreSQL 16 sur sept formes de policy : SELECT avec deux
-- occurrences, INSERT sans USING, UPDATE avec USING et WITH CHECK, ALL,
-- policy restrictive, policy deja enveloppee, et policy sans auth.uid().
-- ===========================================================================

DO $migration$
DECLARE
    r          record;
    v_qual     text;
    v_check    text;
    v_stmt     text;
    v_touched  int := 0;
BEGIN
    FOR r IN
        SELECT schemaname, tablename, policyname, cmd, qual, with_check
          FROM pg_policies
         WHERE schemaname = 'public'
           AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
         ORDER BY tablename, policyname
    LOOP
        -- Ramener a la forme nue : PostgreSQL redonne une expression deja
        -- enveloppee sous la forme "( SELECT auth.uid() AS uid)".
        v_qual  := regexp_replace(coalesce(r.qual, ''),
                                  '\(\s*SELECT\s+auth\.uid\(\)\s+AS\s+uid\s*\)',
                                  'auth.uid()', 'gi');
        v_check := regexp_replace(coalesce(r.with_check, ''),
                                  '\(\s*SELECT\s+auth\.uid\(\)\s+AS\s+uid\s*\)',
                                  'auth.uid()', 'gi');

        v_qual  := replace(v_qual,  'auth.uid()', '(select auth.uid())');
        v_check := replace(v_check, 'auth.uid()', '(select auth.uid())');

        -- Une policy SELECT ou DELETE n'accepte pas WITH CHECK ; une policy
        -- INSERT n'accepte pas USING. On ne pose que ce que la commande admet.
        v_stmt := format('ALTER POLICY %I ON %I.%I',
                         r.policyname, r.schemaname, r.tablename);

        IF r.qual IS NOT NULL THEN
            v_stmt := v_stmt || format(' USING (%s)', v_qual);
        END IF;

        IF r.with_check IS NOT NULL THEN
            v_stmt := v_stmt || format(' WITH CHECK (%s)', v_check);
        END IF;

        EXECUTE v_stmt;
        v_touched := v_touched + 1;

        RAISE NOTICE 'policy enveloppee : %.% / %',
            r.schemaname, r.tablename, r.policyname;
    END LOOP;

    RAISE NOTICE '% policies modifiees', v_touched;
END
$migration$;

-- ===========================================================================
-- Verification
-- ===========================================================================
-- Doit rendre zero ligne : plus aucun auth.uid() nu dans une policy publique.
--
--   select tablename, policyname
--     from pg_policies
--    where schemaname = 'public'
--      and (
--            regexp_replace(coalesce(qual, ''),
--              '\(\s*SELECT\s+auth\.uid\(\)\s+AS\s+uid\s*\)', '', 'gi')
--            like '%auth.uid()%'
--         or regexp_replace(coalesce(with_check, ''),
--              '\(\s*SELECT\s+auth\.uid\(\)\s+AS\s+uid\s*\)', '', 'gi')
--            like '%auth.uid()%'
--          );
--
-- ===========================================================================
