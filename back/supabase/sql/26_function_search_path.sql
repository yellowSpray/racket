-- ===========================================================================
-- 26 - FIGER LE SEARCH_PATH DE TOUTES LES FONCTIONS DU SCHEMA PUBLIC
-- ===========================================================================
--
-- L'advisor Supabase signale « Function Search Path Mutable » pour chaque
-- fonction dont le `search_path` n'est pas fixe. La fonction herite alors de
-- celui de la session appelante.
--
-- Le risque porte sur les fonctions `security definer`, qui s'executent avec
-- les droits de leur proprietaire. Si le corps de la fonction reference une
-- table sans la qualifier, un appelant capable de creer des objets peut poser
-- une table de meme nom dans un schema a lui, l'amener en tete du
-- `search_path`, et faire lire la sienne a une fonction privilegiee. La
-- creation d'objets n'est pas accordee a `anon` ni a `authenticated`, ce qui
-- explique que l'advisor classe le point en avertissement et non en erreur,
-- mais epingler le chemin supprime la question.
--
-- Le choix retenu est `public, pg_temp` plutot que le `''` recommande par
-- Supabase. La chaine vide est plus stricte, mais elle exige que chaque
-- reference du corps soit qualifiee, sans quoi la fonction casse au premier
-- appel, en silence, parfois des mois plus tard. `public, pg_temp` retire a
-- l'appelant toute prise sur la resolution des noms, ce qui est le fond du
-- probleme, sans risquer de casser un corps non qualifie. `pg_temp` est place
-- en dernier volontairement : sinon une table temporaire de l'appelant
-- primerait sur la vraie.
--
-- La migration est construite depuis `pg_proc`, donc elle agit sur ce qui
-- existe reellement en base. Elle ignore :
--   - les fonctions qui ont deja un search_path,
--   - celles qui appartiennent a une extension, qui ne nous regardent pas,
--   - les agregats, qui n'acceptent pas cette option.
--
-- Verifie sur PostgreSQL 16 : fonction sans chemin epinglee, fonction deja
-- epinglee laissee telle quelle, fonction d'extension ignoree, procedure
-- traitee, et detournement par search_path devenu inoperant.
--
-- Ce fichier est rejouable.
-- ===========================================================================

DO $migration$
DECLARE
    r         record;
    v_touched int := 0;
    v_kept    int := 0;
BEGIN
    FOR r IN
        SELECT p.oid,
               p.prokind,
               p.oid::regprocedure AS signature,
               (p.proconfig IS NOT NULL
                AND EXISTS (SELECT 1 FROM unnest(p.proconfig) c
                             WHERE c LIKE 'search\_path=%')) AS deja_epinglee
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public'
           AND p.prokind IN ('f', 'p')          -- fonctions et procedures
           AND NOT EXISTS (                      -- rien qui vienne d'une extension
                 SELECT 1 FROM pg_depend d
                  WHERE d.objid = p.oid
                    AND d.deptype = 'e'
               )
         ORDER BY p.oid::regprocedure::text
    LOOP
        IF r.deja_epinglee THEN
            v_kept := v_kept + 1;
            CONTINUE;
        END IF;

        EXECUTE format(
            '%s %s SET search_path = public, pg_temp',
            CASE r.prokind WHEN 'p' THEN 'ALTER PROCEDURE' ELSE 'ALTER FUNCTION' END,
            r.signature
        );

        v_touched := v_touched + 1;
        RAISE NOTICE 'chemin fige : %', r.signature;
    END LOOP;

    RAISE NOTICE '% fonctions epinglees, % deja en ordre', v_touched, v_kept;
END
$migration$;

-- ===========================================================================
-- Verification
-- ===========================================================================
-- Doit rendre zero ligne : plus aucune fonction du schema public sans
-- search_path fixe.
--
--   select p.oid::regprocedure as fonction,
--          p.prosecdef         as security_definer
--     from pg_proc p
--     join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public'
--      and p.prokind in ('f', 'p')
--      and not exists (select 1 from pg_depend d
--                       where d.objid = p.oid and d.deptype = 'e')
--      and not (p.proconfig is not null
--               and exists (select 1 from unnest(p.proconfig) c
--                            where c like 'search\_path=%'))
--    order by 1;
--
-- ===========================================================================
