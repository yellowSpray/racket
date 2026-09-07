-- ===========================================================================
-- EXTRACTION DES OBJETS QUI N'EXISTENT QU'EN PRODUCTION
-- ===========================================================================
--
-- Le diff a designe sept objets crees a la main dans le tableau de bord et
-- absents du depot. Ils forment une seule fonctionnalite : l'inscription
-- automatique des joueurs actifs a la creation d'un evenement, et leur
-- desinscription quand leur statut change.
--
-- Cette requete en rend le texte exact, pour le recopier dans un fichier de
-- migration numerote. Elle ne modifie rien.
-- ===========================================================================

select 'A. COLONNE events.auto_renew' as bloc,
       format('ALTER TABLE public.events ADD COLUMN IF NOT EXISTS %I %s%s%s;',
              column_name,
              case when data_type = 'USER-DEFINED' then udt_name else data_type end,
              case when is_nullable = 'NO' then ' not null' else '' end,
              case when column_default is not null then ' default '||column_default else '' end) as texte
  from information_schema.columns
 where table_schema = 'public' and table_name = 'events' and column_name = 'auto_renew'

union all

select 'B. LIBELLES DE player_status_enum',
       format('-- ordre reel : %s',
              string_agg(e.enumlabel, ', ' order by e.enumsortorder))
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
 where n.nspname = 'public' and t.typname = 'player_status_enum'

union all

select 'C. FONCTION '||p.proname,
       pg_get_functiondef(p.oid)||';'
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('auto_register_active_players','unregister_from_future_events')

union all

select 'D. DECLENCHEUR '||tg.tgname,
       pg_get_triggerdef(tg.oid)||';'
  from pg_trigger tg
 where not tg.tgisinternal
   and tg.tgname in ('on_event_created','on_player_status_change')

union all

select 'E. INDEX idx_profiles_email',
       indexdef||';'
  from pg_indexes
 where schemaname = 'public' and indexname = 'idx_profiles_email'

order by 1;
