-- ===========================================================================
-- 36 - RETIRER DEUX DECLENCHEURS HORS SERVICE, RAPATRIER LE RESTE
-- ===========================================================================
--
-- Un diff de structure entre la production et une base reconstruite a partir
-- des trente-cinq fichiers du depot a fait apparaitre sept objets qui
-- n'existaient qu'en production, crees a la main dans le tableau de bord.
-- Ce fichier les traite tous les sept, dans un sens ou dans l'autre.
--
-- ---------------------------------------------------------------------------
-- LES DEUX DECLENCHEURS SONT CASSES DEPUIS LA MIGRATION 14
-- ---------------------------------------------------------------------------
--
-- `auto_register_active_players`, en AFTER INSERT sur `events`, faisait :
--
--     ON CONFLICT (event_id, profile_id) DO NOTHING
--
-- Cette contrainte n'existe plus. Depuis les migrations 14 et 19,
-- `event_players` porte `UNIQUE NULLS NOT DISTINCT (event_id, profile_id,
-- round_id)`, sur trois colonnes. PostgreSQL ne sait pas rattacher un
-- ON CONFLICT a deux colonnes sur un index qui en a trois, et leve :
--
--     there is no unique or exclusion constraint matching
--     the ON CONFLICT specification
--
-- L'erreur ne depend pas des donnees : elle sort a la planification, meme
-- quand aucun joueur n'est actif. Le declencheur est en AFTER, donc son echec
-- annule la transaction : creer un evenement etait devenu impossible.
--
-- `unregister_from_future_events`, en AFTER UPDATE sur `player_status`, lisait
-- `e.start_date`. La table `events` n'a plus de date depuis la migration 14,
-- qui les a deplacees dans `event_rounds` :
--
--     column e.start_date does not exist
--
-- Meme consequence : passer un joueur en inactif etait devenu impossible.
--
-- Verifie sur PostgreSQL 16 avant correctif, sur une base alignee sur l'etat
-- reel de la production.
--
-- ---------------------------------------------------------------------------
-- POURQUOI ON LES SUPPRIME PLUTOT QUE DE LES REPARER
-- ---------------------------------------------------------------------------
--
-- Au-dela de la panne, ces deux fonctions ne font pas ce que le produit
-- attend. `auto_register_active_players` ne filtre pas par club : elle prend
-- tous les joueurs actifs de la base, tous clubs confondus, ce qui est
-- exactement le trou ferme par la migration 34 pour `upsert_player`. Et elle
-- ne lit jamais `events.auto_renew`, la colonne que l'interrupteur
-- « Renouvellement auto » de `EventsManager` ecrit pourtant.
--
-- Surtout, le renouvellement automatique vise autre chose : recreer la serie
-- suivante toute seule et la soumettre a l'admin pour validation avant son
-- debut. Cette fonctionnalite est remise a plus tard. La reparer aujourd'hui
-- reviendrait a figer une intention qui n'est pas celle qu'on gardera.
--
-- Supprimer n'enleve aucun service rendu : les deux gestes echouaient. Cette
-- migration debloque donc deux actions d'administration qui etaient
-- impossibles.
--
-- ---------------------------------------------------------------------------
-- CE QU'ON GARDE
-- ---------------------------------------------------------------------------
--
-- `events.auto_renew`, parce que le front l'ecrit et la lit deja, et parce
-- que la fonctionnalite reviendra. La colonne est simplement sans effet pour
-- l'instant.
--
-- `idx_profiles_email`, parce que `upsert_player` cherche un profil par son
-- adresse a chaque ajout de joueur.
--
-- Les quatre libelles supplementaires de `player_status_enum`. Ils ne servent
-- a rien : le front ne connait que `active`, `inactive`, `member` et
-- `visitor`. Mais PostgreSQL ne sait pas retirer un libelle d'un type enumere
-- sans le recreer entierement, ce qui obligerait a toucher la colonne, son
-- defaut et les policies qui la referencent. Le jeu n'en vaut pas la
-- chandelle. On les declare pour que le depot decrive la production, avec ce
-- commentaire pour dire qu'ils sont morts.
--
-- Ce fichier est rejouable.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. Les objets crees a la main que le depot doit connaitre
-- ---------------------------------------------------------------------------

-- Pilote le renouvellement automatique des series. Sans effet aujourd'hui.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT false;

-- Libelles inutilises, conserves faute de pouvoir les retirer proprement.
ALTER TYPE public.player_status_enum ADD VALUE IF NOT EXISTS 'withdrawn';
ALTER TYPE public.player_status_enum ADD VALUE IF NOT EXISTS 'new';
ALTER TYPE public.player_status_enum ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE public.player_status_enum ADD VALUE IF NOT EXISTS 'unpaid';

-- `upsert_player` cherche un profil par adresse a chaque ajout de joueur.
CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON public.profiles USING btree (email);


-- ---------------------------------------------------------------------------
-- 2. Les deux declencheurs hors service
-- ---------------------------------------------------------------------------
-- Le declencheur d'abord : une fonction dont un declencheur depend ne peut
-- pas etre supprimee.

DROP TRIGGER IF EXISTS on_event_created ON public.events;
DROP FUNCTION IF EXISTS public.auto_register_active_players();

DROP TRIGGER IF EXISTS on_player_status_change ON public.player_status;
DROP FUNCTION IF EXISTS public.unregister_from_future_events();


-- ===========================================================================
-- Verification
-- ===========================================================================
-- Les deux gestes doivent redevenir possibles :
--
--   -- creer un evenement
--   insert into public.events (club_id, event_name)
--   values ('<un club>', 'Essai');
--
--   -- passer un joueur en inactif
--   update public.player_status set status = 'inactive' where id = '<un statut>';
--
-- Et il ne doit plus rester ni declencheur ni fonction :
--
--   select tgname from pg_trigger
--    where tgname in ('on_event_created','on_player_status_change')
--      and not tgisinternal;
--
--   select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public'
--      and proname in ('auto_register_active_players','unregister_from_future_events');
-- ===========================================================================
