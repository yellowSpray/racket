-- ===========================================================================
-- 25 - LIMITER CE QUE LE ROLE ANONYME LIT DANS CLUBS
-- ===========================================================================
--
-- La policy « Everyone can select clubs » vaut `true`, et c'est voulu : la
-- liste des clubs alimente le menu deroulant de la page d'inscription,
-- affichee avant toute connexion. Mais la RLS filtre des lignes, jamais des
-- colonnes. N'importe qui muni de la cle anonyme pouvait donc lire l'email et
-- l'adresse de tous les clubs, ainsi que leur tarif visiteur et leurs
-- reglages par defaut.
--
-- Le filtrage par colonne se fait avec des droits, pas avec une policy. On
-- retire au role `anon` le droit de lecture sur la table entiere, puis on le
-- lui redonne colonne par colonne. `authenticated` n'est pas touche et
-- continue de lire la ligne complete, ce dont la page de decouverte a besoin
-- pour afficher le tarif visiteur des autres clubs.
--
-- ATTENTION, ordre obligatoire : un droit pose sur la table entiere l'emporte
-- sur les droits par colonne. Il faut donc revoquer avant d'accorder, sans
-- quoi le resserrage n'a aucun effet.
--
-- A savoir pour plus tard : rejouer un `GRANT SELECT ON ALL TABLES IN SCHEMA
-- public TO anon`, ce que font certains scripts d'initialisation Supabase,
-- rendrait le droit sur la table entiere et rouvrirait silencieusement les
-- colonnes. Ce fichier est rejouable, il suffit de le repasser derriere.
--
-- Le front a ete ajuste en meme temps : `useClubs` ne demandait `club_address`
-- et `club_email` que par habitude, aucun ecran ne les affichait.
--
-- Effet de bord bienvenu : une colonne ajoutee plus tard a `clubs` n'est
-- couverte par aucun droit et reste donc invisible au role anonyme tant qu'on
-- ne l'accorde pas explicitement. Le defaut penche du bon cote.
--
-- Verifie sur PostgreSQL 16 : lecture des colonnes publiques acceptee,
-- lecture de club_email et club_address refusee, `select *` refuse, comptage
-- toujours possible, role connecte inchange, colonne ajoutee apres coup
-- refusee, et fichier rejouable.
-- ===========================================================================

-- Retirer le droit sur la table entiere avant de le redonner par colonne.
REVOKE SELECT ON public.clubs FROM anon;

-- Ce qu'un visiteur non connecte a besoin de voir : de quoi choisir son club
-- a l'inscription, et de quoi situer un club a la decouverte.
GRANT SELECT (id, club_name, country, region) ON public.clubs TO anon;

-- Le role connecte garde la ligne complete.
GRANT SELECT ON public.clubs TO authenticated;

-- ===========================================================================
-- Verification
-- ===========================================================================
-- Doit rendre exactement les quatre colonnes accordees a anon :
--
--   select column_name
--     from information_schema.column_privileges
--    where grantee = 'anon'
--      and table_schema = 'public'
--      and table_name = 'clubs'
--      and privilege_type = 'SELECT'
--    order by column_name;
--
-- Et ceci doit echouer sur « permission denied » :
--
--   set role anon;
--   select club_email from public.clubs limit 1;
--   reset role;
--
-- ===========================================================================
