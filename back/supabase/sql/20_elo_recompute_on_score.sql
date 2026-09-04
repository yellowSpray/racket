-- ===================================
-- 20 - ELO ACCROCHÉ AUX SCORES
-- ===================================
-- Remplace le déclenchement posé par la migration 11, dont le trigger
-- `trg_auto_elo_on_event_complete` est supprimé en fin de fichier.
--
-- Défaut corrigé. `trg_auto_elo_on_event_complete` appelait `apply_event_elo`
-- au passage d'une série en `completed`, bascule déclenchée par la seule date
-- de fin. Or les résultats sont saisis après, parfois dix jours après. La
-- fonction tournait donc systématiquement sur zéro match, et la garde
-- `OLD.status IS DISTINCT FROM 'completed'` l'empêchait de repasser.
--
-- Nouveau principe. Chaque application est consignée dans `elo_adjustments`.
-- Une saisie de score annule les ajustements de sa série et de toutes les
-- séries suivantes du club, puis les rejoue dans l'ordre chronologique. Le
-- calcul devient donc rejouable et réversible : corriger un score corrige
-- l'Elo, saisir en retard ne change rien au résultat.
--
-- Le classement de départ de chaque joueur n'a pas besoin d'être stocké : il se
-- reconstruit à tout moment par `power_ranking - somme des ajustements`.

-- ===========================================================================
-- A. Retrait d'une fausse piste
--
-- La colonne `elo_applied_at` avait été ajoutée pour servir de garde
-- d'idempotence, avant de constater que le déclenchement lui-même était en
-- cause. Plus rien ne la lit.
-- ===========================================================================

alter table public.event_rounds
    drop column if exists elo_applied_at;


-- ===========================================================================
-- B. Registre des ajustements
-- ===========================================================================

create table if not exists public.elo_adjustments (
    id         uuid primary key default gen_random_uuid(),
    round_id   uuid not null references public.event_rounds(id) on delete cascade,
    profile_id uuid not null references public.profiles(id)     on delete cascade,
    delta      integer not null,
    applied_at timestamptz not null default now(),
    constraint elo_adjustments_round_profile_key unique (round_id, profile_id)
);

comment on table public.elo_adjustments is
    'Variation d''Elo appliquée à un joueur pour une série. Permet d''annuler et de rejouer le calcul.';

create index if not exists idx_elo_adjustments_round_id   on public.elo_adjustments (round_id);
create index if not exists idx_elo_adjustments_profile_id on public.elo_adjustments (profile_id);

alter table public.elo_adjustments enable row level security;

-- Lecture réservée au club concerné, écriture réservée aux fonctions
-- `security definer` ci-dessous : aucune politique d'insertion n'est ouverte.
drop policy if exists elo_adjustments_select on public.elo_adjustments;
create policy elo_adjustments_select on public.elo_adjustments
    for select using (
        exists (
            select 1
              from public.event_rounds r
              join public.events e on e.id = r.event_id
             where r.id = elo_adjustments.round_id
               and (e.club_id = public.get_user_club_id() or public.is_superadmin())
        )
    );


-- ===========================================================================
-- C. Appliquer, annuler, rejouer
-- ===========================================================================

/*
 * Applique une série et consigne les deltas.
 *
 * Tous les deltas sont calculés à partir des classements tels qu'ils sont au
 * début de l'appel : la boucle de lecture ne modifie rien, l'écriture vient
 * après. L'ordre des matchs à l'intérieur d'une série n'influence donc pas le
 * résultat.
 */
create or replace function public.elo_apply_round(p_round_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
    rec           record;
    k_factor      constant numeric := 32;
    winner_rating numeric;
    loser_rating  numeric;
    expected      numeric;
    multiplier    numeric;
    delta         integer;
    deltas        jsonb := '{}';
    player_id     text;
    player_delta  integer;
    updated_count integer := 0;
begin
    for rec in
        select m.winner_id,
               case when m.winner_id = m.player1_id then m.player2_id else m.player1_id end as loser_id,
               m.score
          from public.matches m
          join public.groups g on g.id = m.group_id
         where g.round_id     = p_round_id
           and m.winner_id is not null
           and m.score     is not null
    loop
        multiplier := public.elo_margin_multiplier(rec.score);
        -- Une absence ne fait bouger aucun classement.
        if multiplier = 0 then continue; end if;

        select coalesce(p.power_ranking, 1000) into winner_rating
          from public.profiles p where p.id = rec.winner_id;
        select coalesce(p.power_ranking, 1000) into loser_rating
          from public.profiles p where p.id = rec.loser_id;

        -- Un match dont un joueur a été supprimé ne doit pas interrompre le calcul.
        if winner_rating is null or loser_rating is null then continue; end if;

        expected := 1.0 / (1.0 + power(10.0, (loser_rating - winner_rating) / 400.0));
        delta    := round(k_factor * multiplier * (1.0 - expected));

        deltas := jsonb_set(deltas, array[rec.winner_id::text],
            to_jsonb(coalesce((deltas ->> rec.winner_id::text)::int, 0) + delta));
        deltas := jsonb_set(deltas, array[rec.loser_id::text],
            to_jsonb(coalesce((deltas ->> rec.loser_id::text)::int, 0) - delta));
    end loop;

    for player_id, player_delta in
        select key, value::int from jsonb_each_text(deltas)
    loop
        if player_delta <> 0 then
            update public.profiles
               set power_ranking = coalesce(power_ranking, 1000) + player_delta
             where id = player_id::uuid;

            insert into public.elo_adjustments (round_id, profile_id, delta)
            values (p_round_id, player_id::uuid, player_delta)
            on conflict (round_id, profile_id)
            do update set delta = excluded.delta, applied_at = now();

            updated_count := updated_count + 1;
        end if;
    end loop;

    return updated_count;
end;
$$;

/*
 * Annule une série : retranche les deltas consignés et vide le registre.
 * Sans effet si la série n'a jamais été appliquée.
 */
create or replace function public.elo_revert_round(p_round_id uuid)
returns void
language plpgsql
security definer
as $$
begin
    update public.profiles p
       set power_ranking = coalesce(p.power_ranking, 1000) - a.delta
      from public.elo_adjustments a
     where a.round_id = p_round_id
       and p.id       = a.profile_id;

    delete from public.elo_adjustments where round_id = p_round_id;
end;
$$;

/*
 * Rejoue une série et toutes celles qui la suivent dans le club.
 *
 * L'Elo est séquentiel : les classements d'arrivée d'une série sont les
 * classements de départ de la suivante. Modifier un score de la série 2 impose
 * donc de rejouer aussi les séries 3 et 4, sinon leurs deltas resteraient
 * calculés sur des classements de départ périmés.
 *
 * L'ordre est celui des dates de début, pas des numéros : un club fait tourner
 * plusieurs événements en parallèle, et la série 1 d'un nouvel événement peut
 * suivre la série 3 d'un autre.
 */
create or replace function public.elo_recompute_from_round(p_round_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
    v_club_id    uuid;
    v_start_date date;
    r            record;
    total        integer := 0;
begin
    select e.club_id, r0.start_date
      into v_club_id, v_start_date
      from public.event_rounds r0
      join public.events e on e.id = r0.event_id
     where r0.id = p_round_id;

    if v_club_id is null then return 0; end if;

    -- Annulation d'abord, dans son intégralité, pour repartir des classements
    -- tels qu'ils étaient avant cette série.
    for r in
        select r1.id
          from public.event_rounds r1
          join public.events e1 on e1.id = r1.event_id
         where e1.club_id     = v_club_id
           and r1.start_date >= v_start_date
    loop
        perform public.elo_revert_round(r.id);
    end loop;

    for r in
        select r1.id
          from public.event_rounds r1
          join public.events e1 on e1.id = r1.event_id
         where e1.club_id     = v_club_id
           and r1.start_date >= v_start_date
         order by r1.start_date asc, r1.round_number asc, r1.id asc
    loop
        total := total + public.elo_apply_round(r.id);
    end loop;

    return total;
end;
$$;

/* Rejoue tout l'historique Elo d'un club, depuis les classements de départ. */
create or replace function public.elo_recompute_club(p_club_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
    v_first uuid;
begin
    select r.id into v_first
      from public.event_rounds r
      join public.events e on e.id = r.event_id
     where e.club_id = p_club_id
     order by r.start_date asc, r.round_number asc, r.id asc
     limit 1;

    if v_first is null then return 0; end if;
    return public.elo_recompute_from_round(v_first);
end;
$$;


-- ===========================================================================
-- D. Déclenchement sur la saisie des scores
-- ===========================================================================

create or replace function public.trg_elo_on_match_result()
returns trigger
language plpgsql
security definer
as $$
declare
    v_group_id uuid;
    v_round_id uuid;
begin
    if tg_op = 'DELETE' then
        v_group_id := old.group_id;
    else
        v_group_id := new.group_id;
    end if;

    -- Une modification qui ne touche ni le vainqueur ni le score ne change
    -- aucun Elo : inutile de rejouer tout l'historique pour un changement
    -- d'horaire ou de terrain.
    if tg_op = 'UPDATE'
       and new.winner_id is not distinct from old.winner_id
       and new.score     is not distinct from old.score
    then
        return null;
    end if;

    select round_id into v_round_id from public.groups where id = v_group_id;
    if v_round_id is not null then
        perform public.elo_recompute_from_round(v_round_id);
    end if;

    return null;
end;
$$;

drop trigger if exists trg_elo_on_match_result on public.matches;
create trigger trg_elo_on_match_result
after insert or delete or update of winner_id, score on public.matches
for each row
execute function public.trg_elo_on_match_result();

-- L'ancien déclencheur devient nuisible : il appliquerait une seconde fois.
drop trigger if exists trg_auto_elo_on_event_complete on public.event_rounds;


-- ===========================================================================
-- E. Rattrapage des séries déjà jouées
--
-- À exécuter une fois, après les sections A à D. Le registre est vide, donc
-- les `power_ranking` actuels sont les classements de départ : le rejeu part
-- d'eux et applique les séries dans l'ordre chronologique.
-- ===========================================================================

select c.club_name, public.elo_recompute_club(c.id) as joueurs_mis_a_jour
  from public.clubs c;

-- Ce que le rejeu a changé, joueur par joueur.
-- `avant` se reconstitue en retranchant les ajustements consignés.
select p.first_name,
       p.last_name,
       p.power_ranking - coalesce(sum(a.delta), 0) as avant,
       p.power_ranking                            as apres,
       coalesce(sum(a.delta), 0)                  as variation
  from public.profiles p
  left join public.elo_adjustments a on a.profile_id = p.id
 group by p.id, p.first_name, p.last_name, p.power_ranking
 order by variation desc, p.last_name;
