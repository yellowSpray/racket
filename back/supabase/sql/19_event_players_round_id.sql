-- ===================================
-- 19 - INSCRIPTIONS RATTACHÉES À UNE SÉRIE
-- ===================================
-- Prolonge la migration 14, qui avait rattaché groupes, matchs, absences et
-- paiements aux séries, mais avait laissé `event_players` au niveau de
-- l'événement.
--
-- Problème corrigé : `event_players` ne connaît que l'événement. La série 2 de
-- l'événement 2 se pré-remplissait donc avec tout ce que la table contenait
-- pour cet événement, y compris des lignes venues d'ailleurs.
--
-- Après cette migration, une inscription peut désigner une série précise.
-- Les lignes existantes gardent round_id = NULL et valent « inscrit à
-- l'événement », ce qui reste le sens des inscriptions par lien d'invitation.

-- ===========================================================================
-- A. Migration
-- ===========================================================================

alter table public.event_players
    add column if not exists round_id uuid references public.event_rounds(id) on delete cascade;

comment on column public.event_players.round_id is
    'Série concernée par l''inscription. NULL = inscription au niveau de l''événement (lien d''invitation).';

create index if not exists idx_event_players_round_id
    on public.event_players (round_id);

-- L'unicité doit maintenant tolérer le même joueur sur plusieurs séries du même
-- événement. On remplace la contrainte (event_id, profile_id) par un triplet.
-- `nulls not distinct` empêche les doublons sur les lignes au niveau événement,
-- que Postgres considérerait sinon comme toutes différentes.
do $$
declare
    target text;
begin
    select con.conname into target
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
     where nsp.nspname = 'public'
       and rel.relname = 'event_players'
       and con.contype = 'u'
       -- attname est de type `name` : sans le cast, la comparaison avec un
       -- tableau de littéraux text est refusée par Postgres.
       and (
            select array_agg(att.attname::text order by att.attname::text)
              from unnest(con.conkey) as k(attnum)
              join pg_attribute att
                on att.attrelid = con.conrelid and att.attnum = k.attnum
           ) = array['event_id', 'profile_id']::text[]
     limit 1;

    if target is not null then
        execute format('alter table public.event_players drop constraint %I', target);
    end if;
end $$;

alter table public.event_players
    drop constraint if exists event_players_event_profile_round_key;

alter table public.event_players
    add constraint event_players_event_profile_round_key
    unique nulls not distinct (event_id, profile_id, round_id);


-- ===========================================================================
-- B. Inspection des lignes suspectes, à exécuter et à me renvoyer
-- ===========================================================================

-- Inscriptions d'un événement pour des joueurs qui n'ont jamais été placés dans
-- un tableau de cet événement. Ce sont les candidates au ménage : soit des
-- inscriptions légitimes jamais concrétisées, soit les lignes parasites.
-- Rien n'est supprimé ici.
select e.event_name,
       p.first_name,
       p.last_name,
       ep.round_id,
       (
         select string_agg(distinct e2.event_name, ', ')
           from public.group_players gp2
           join public.groups g2 on g2.id = gp2.group_id
           join public.event_rounds r2 on r2.id = g2.round_id
           join public.events e2 on e2.id = r2.event_id
          where gp2.profile_id = ep.profile_id
       ) as a_joue_dans
  from public.event_players ep
  join public.events   e on e.id = ep.event_id
  join public.profiles p on p.id = ep.profile_id
 where not exists (
        select 1
          from public.group_players gp
          join public.groups g on g.id = gp.group_id
          join public.event_rounds r on r.id = g.round_id
         where gp.profile_id = ep.profile_id
           and r.event_id    = ep.event_id
       )
 order by e.event_name, p.last_name;
