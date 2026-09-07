-- ===========================================================================
-- INVENTAIRE DE STRUCTURE
-- ===========================================================================
--
-- A quoi ca sert : comparer deux bases sans lire une seule donnee metier.
-- La requete rend une ligne par categorie d'objet, avec le nombre d'objets et
-- une empreinte md5 de leur description triee. Deux bases dont toutes les
-- empreintes concordent ont exactement la meme structure.
--
-- Usage : on la lance sur la production et sur une base reconstruite a partir
-- des fichiers du depot. Toute categorie qui differe designe un objet cree a
-- la main dans le tableau de bord, donc absent du depot, donc perdu a la
-- prochaine reconstruction.
--
-- Deux categories different toujours et c'est normal :
--   - `extensions`, parce que Supabase en installe d'office une dizaine ;
--   - `droits_tables`, parce que Supabase accorde d'office tous les droits
--     sur `public` a anon, authenticated et service_role.
--
-- Les empreintes de `fonctions` et de `vues` ne sont comparables qu'entre
-- deux serveurs de meme version majeure : le texte rendu par
-- `pg_get_functiondef` change d'une version a l'autre. La premiere ligne du
-- resultat donne la version, verifier qu'elle correspond avant de conclure.
-- ===========================================================================

with
colonnes as (
  select format('%s.%s %s %s %s',
                c.table_name, c.column_name, c.data_type,
                c.is_nullable, coalesce(c.column_default,'-')) as t
  from information_schema.columns c
  where c.table_schema = 'public'
),
contraintes as (
  select format('%s %s %s', rel.relname, con.conname, pg_get_constraintdef(con.oid)) as t
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace n on n.oid = rel.relnamespace
  where n.nspname = 'public'
),
indexes as (
  select indexdef as t from pg_indexes where schemaname = 'public'
),
fonctions as (
  select format('%s | %s | %s | %s',
                p.oid::regprocedure,
                case p.prosecdef when true then 'definer' else 'invoker' end,
                coalesce(array_to_string(p.proconfig, ','), '-'),
                md5(pg_get_functiondef(p.oid))) as t
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind in ('f','p')
),
droits_execute as (
  select format('%s | %s', p.oid::regprocedure,
                coalesce(array_to_string(p.proacl, ','), '(defaut)')) as t
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind in ('f','p')
),
declencheurs as (
  select format('%s.%s %s', n.nspname, rel.relname, tg.tgname) as t
  from pg_trigger tg
  join pg_class rel on rel.oid = tg.tgrelid
  join pg_namespace n on n.oid = rel.relnamespace
  where not tg.tgisinternal and n.nspname in ('public','auth')
),
policies_public as (
  select format('%s | %s | %s | %s | %s | %s',
                tablename, policyname, cmd, roles::text,
                coalesce(qual,'-'), coalesce(with_check,'-')) as t
  from pg_policies where schemaname = 'public'
),
rls_active as (
  select format('%s rls=%s force=%s', rel.relname, rel.relrowsecurity, rel.relforcerowsecurity) as t
  from pg_class rel
  join pg_namespace n on n.oid = rel.relnamespace
  where n.nspname = 'public' and rel.relkind = 'r'
),
vues as (
  select format('%s | %s', c.relname, md5(pg_get_viewdef(c.oid))) as t
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('v','m')
),
types_enum as (
  select format('%s = %s', t.typname, string_agg(e.enumlabel, ',' order by e.enumsortorder)) as t
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
  group by t.typname
),
droits_tables as (
  select format('%s | %s | %s', table_name, grantee,
                string_agg(privilege_type, ',' order by privilege_type)) as t
  from information_schema.role_table_grants
  where table_schema = 'public' and grantee in ('anon','authenticated','service_role')
  group by table_name, grantee
),
policies_storage as (
  select format('%s | %s | %s | %s | %s',
                tablename, policyname, cmd,
                coalesce(qual,'-'), coalesce(with_check,'-')) as t
  from pg_policies where schemaname = 'storage'
),
seaux as (
  select format('%s public=%s', id, public) as t from storage.buckets
),
extensions as (
  select format('%s %s', extname, extversion) as t from pg_extension
),
tout as (
  select 'colonnes' as categorie, t from colonnes union all
  select 'contraintes', t from contraintes union all
  select 'indexes', t from indexes union all
  select 'fonctions', t from fonctions union all
  select 'droits_execute', t from droits_execute union all
  select 'declencheurs', t from declencheurs union all
  select 'policies_public', t from policies_public union all
  select 'rls_active', t from rls_active union all
  select 'vues', t from vues union all
  select 'types_enum', t from types_enum union all
  select 'droits_tables', t from droits_tables union all
  select 'policies_storage', t from policies_storage union all
  select 'seaux', t from seaux union all
  select 'extensions', t from extensions
)
select categorie, nombre, empreinte from (
  select '00_version' as categorie, 1 as nombre,
         substring(version() from 'PostgreSQL [0-9.]+') as empreinte
  union all
  select categorie, count(*)::int, md5(string_agg(t, e'\n' order by t))
  from tout group by categorie
) x order by categorie;


-- ===========================================================================
-- DETAIL D'UNE CATEGORIE
-- ===========================================================================
-- Quand une empreinte ne concorde pas, remplacer le nom de la categorie dans
-- la derniere ligne et relancer le bloc ci-dessus jusqu'a `tout`, puis :
--
--   select regexp_replace(t, '\s+', ' ', 'g') as objet
--   from tout
--   where categorie = 'indexes'
--   order by 1;
-- ===========================================================================
