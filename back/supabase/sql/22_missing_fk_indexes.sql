-- ===========================================================================
-- 22 - INDEX MANQUANTS SUR TROIS CLES ETRANGERES
-- ===========================================================================
--
-- Une contrainte d'unicite fournit un index, mais PostgreSQL ne sait s'en
-- servir que si la colonne cherchee est en tete de l'index. Trois tables
-- sont interrogees par une colonne qui n'est pas la premiere de leur
-- contrainte, et se font donc parcourir en entier a chaque lecture.
--
--   group_players  unique (group_id, profile_id)         cherchee par profile_id
--   payments       unique (profile_id, round_id)         cherchee par round_id
--   absences       unique (profile_id, round_id, date)   cherchee par round_id
--
-- Le cas de group_players est le plus couteux : la policy RLS de profiles
-- joint cette table par profile_id, donc le parcours complet a lieu a chaque
-- lecture de la liste des joueurs, pour chaque ligne examinee.
--
-- Verifie sur PostgreSQL 16 avec 12 000 lignes dans group_players, 5 760 dans
-- payments et 2 880 dans absences : les trois requetes passent d'un parcours
-- sequentiel a une lecture d'index.
--
-- CREATE INDEX pose un verrou en ecriture le temps de la construction. Sur ces
-- volumes c'est de l'ordre de la milliseconde. La variante CONCURRENTLY, qui
-- l'eviterait, ne peut pas s'executer dans une transaction et passerait donc
-- mal dans l'editeur SQL de Supabase.
--
-- Ce fichier est rejouable.
-- ===========================================================================

-- Joueurs d'un joueur : « dans quelles box suis-je ? »
CREATE INDEX IF NOT EXISTS idx_group_players_profile_id
  ON public.group_players (profile_id);

-- Paiements d'une serie : carte des impayes, page des paiements.
CREATE INDEX IF NOT EXISTS idx_payments_round_id
  ON public.payments (round_id);

-- Absences d'une serie : grille des tableaux et planification des matchs.
CREATE INDEX IF NOT EXISTS idx_absences_round_id
  ON public.absences (round_id);

-- Les statistiques du planificateur doivent connaitre les nouveaux index.
ANALYZE public.group_players;
ANALYZE public.payments;
ANALYZE public.absences;

-- ===========================================================================
-- Verification
-- ===========================================================================
-- A executer apres coup : les trois plans doivent montrer un Index Scan et
-- non plus un Seq Scan.
--
--   explain (analyze, buffers, costs off)
--   select group_id from public.group_players
--    where profile_id = (select id from public.profiles limit 1);
--
-- ===========================================================================
