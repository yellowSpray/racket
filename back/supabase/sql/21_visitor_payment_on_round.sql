-- ===================================
-- 21 - PAIEMENT VISITEUR À L'INSCRIPTION À UNE SÉRIE
-- ===================================
-- Remplace la migration 13, dont le trigger raisonnait au niveau de
-- l'événement et écrivait un `event_id` que `payments` ne porte plus depuis
-- la migration 14.
--
-- Défaut corrigé. Seul le RPC `upsert_player`, à la création d'un profil,
-- créait une ligne dans `payments`. Un visiteur inscrit depuis l'écran
-- Inscriptions ou par le lien d'invitation n'en obtenait aucune, et n'affichait
-- donc aucun badge de paiement. Sur la série 4 de « Mixed », un seul visiteur
-- sur huit avait sa ligne.
--
-- La règle est posée en base, sur `event_players`, et non dans un écran : trois
-- chemins inscrivent déjà un joueur, et un quatrième viendra.
--
-- Le statut est figé au moment de l'inscription. Un membre qui devient visiteur
-- ne paie pas la série en cours mais la suivante, et un visiteur qui devient
-- membre paie encore celle en cours. Aucun trigger ne revient donc sur les
-- lignes existantes lors d'un changement de statut.

-- ===========================================================================
-- A. Création à l'inscription
-- ===========================================================================

create or replace function public.trg_visitor_payment_on_registration()
returns trigger
language plpgsql
security definer
as $$
declare
    v_fee numeric;
begin
    -- Une inscription au niveau de l'événement n'a pas de série à payer.
    if new.round_id is null then return null; end if;

    -- Statut tel qu'il est maintenant. Un changement ultérieur ne vaudra que
    -- pour les séries suivantes.
    if not exists (
        select 1 from public.player_status ps
         where ps.profile_id = new.profile_id
           and ps.status     = 'visitor'
    ) then
        return null;
    end if;

    -- Le tarif est celui du club **organisateur**, pas celui du club du joueur :
    -- un visiteur venu d'ailleurs paie le prix de la maison.
    select coalesce(c.visitor_fee, 0)
      into v_fee
      from public.events e
      join public.clubs  c on c.id = e.club_id
     where e.id = new.event_id;

    -- Garde explicite plutôt qu'un `on conflict` : rien ne garantit qu'une
    -- contrainte d'unicité existe sur (profile_id, round_id).
    if exists (
        select 1 from public.payments pay
         where pay.profile_id = new.profile_id
           and pay.round_id   = new.round_id
    ) then
        return null;
    end if;

    insert into public.payments (profile_id, round_id, amount, status)
    values (new.profile_id, new.round_id, coalesce(v_fee, 0), 'unpaid');

    return null;
end;
$$;

drop trigger if exists trg_visitor_payment_insert on public.event_players;
create trigger trg_visitor_payment_insert
after insert on public.event_players
for each row
execute function public.trg_visitor_payment_on_registration();


-- ===========================================================================
-- B. Retrait à la désinscription
-- ===========================================================================

/*
 * Une ligne déjà payée n'est jamais supprimée : l'argent a été encaissé, et
 * l'effacer ferait disparaître la trace de la recette.
 */
create or replace function public.trg_visitor_payment_on_unregistration()
returns trigger
language plpgsql
security definer
as $$
begin
    if old.round_id is null then return null; end if;

    delete from public.payments
     where profile_id = old.profile_id
       and round_id   = old.round_id
       and status     = 'unpaid';

    return null;
end;
$$;

drop trigger if exists trg_visitor_payment_delete on public.event_players;
create trigger trg_visitor_payment_delete
after delete on public.event_players
for each row
execute function public.trg_visitor_payment_on_unregistration();


-- ===========================================================================
-- C. Rattrapage des inscriptions déjà en place
-- ===========================================================================

-- Aperçu de ce qui va être créé.
select p.first_name, p.last_name, e.event_name, r.round_number,
       coalesce(c.visitor_fee, 0) as montant
  from public.event_players ep
  join public.profiles     p on p.id = ep.profile_id
  join public.event_rounds r on r.id = ep.round_id
  join public.events       e on e.id = ep.event_id
  join public.clubs        c on c.id = e.club_id
 where ep.round_id is not null
   and exists (select 1 from public.player_status ps
                where ps.profile_id = ep.profile_id and ps.status = 'visitor')
   and not exists (select 1 from public.payments pay
                    where pay.profile_id = ep.profile_id and pay.round_id = ep.round_id)
 order by e.event_name, r.round_number, p.last_name;

-- Création. Décommenter après avoir regardé l'aperçu ci-dessus.

-- insert into public.payments (profile_id, round_id, amount, status)
-- select ep.profile_id, ep.round_id, coalesce(c.visitor_fee, 0), 'unpaid'
--   from public.event_players ep
--   join public.events e on e.id = ep.event_id
--   join public.clubs  c on c.id = e.club_id
--  where ep.round_id is not null
--    and exists (select 1 from public.player_status ps
--                 where ps.profile_id = ep.profile_id and ps.status = 'visitor')
--    and not exists (select 1 from public.payments pay
--                     where pay.profile_id = ep.profile_id and pay.round_id = ep.round_id);
