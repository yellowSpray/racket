-- ===========================================================================
-- 41 - LES ABSENCES S'EFFACENT UNE FOIS LEUR SERIE TERMINEE
-- ===========================================================================
--
-- Remplace la definition de `update_event_statuses` posee par la migration
-- 14, et supprime le declencheur `trg_cleanup_absences_on_event_complete` et
-- sa fonction `cleanup_absences_on_event_complete`, poses par la meme
-- migration. Le front ne change pas.
--
-- LE DEFAUT. Sur la page des joueurs, les absences restaient affichees
-- indefiniment, series terminees comprises. Le declencheur cense les effacer
-- avait deux trous :
--
--   1. il n'effacait que les absences generales (`round_id IS NULL`). Celles
--      saisies depuis la page des joueurs portent la serie affichee : il ne
--      les touchait jamais ;
--   2. il etait accroche au passage de la serie en `completed`, statut qui
--      bascule sur la `deadline` quand elle existe. Une deadline posee avant
--      la fin de la serie effacait les absences generales en pleine serie,
--      et une regeneration des matchs ne les voyait plus. C'est le piege deja
--      rencontre avec l'Elo : ne pas accrocher une regle a ce statut.
--
-- LA REGLE, decidee avec Tim le 10 octobre 2026. Une absence s'efface le
-- lendemain de la fin de la serie qu'elle concerne, sur la seule base des
-- dates, jamais du statut :
--
--   - absence d'une serie (`round_id` renseigne) : effacee des que la
--     `end_date` de cette serie est passee ;
--   - absence generale (`round_id` nul) : effacee des que sa date est passee
--     ET qu'aucune serie encore en cours du club du joueur ne la couvre. Une
--     absence du 12 octobre reste donc tant que la serie qui contient le 12
--     n'est pas finie, ce qui garde la regeneration des matchs juste.
--
-- OU. Dans `update_event_statuses`, que le cron de la migration 10 appelle
-- chaque nuit et que le front appelle a chaque chargement des evenements. Le
-- nettoyage ne depend donc ni d'un ecran ni d'une bascule de statut.
--
-- `CREATE OR REPLACE` conserve les droits poses par la migration 30 (seul
-- `authenticated` execute). Le `search_path` doit en revanche etre repose :
-- un remplacement efface celui que la migration 26 avait fixe.
--
-- Verifie sur PostgreSQL 16 : matrice de scenarios jouee avant et apres,
-- comparee ligne a ligne.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.update_event_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.event_rounds
  SET status = 'completed', updated_at = now()
  WHERE status != 'completed'
    AND (
      (deadline IS NOT NULL AND deadline < CURRENT_DATE)
      OR (deadline IS NULL AND end_date < CURRENT_DATE)
    );

  UPDATE public.event_rounds
  SET status = 'active', updated_at = now()
  WHERE status = 'upcoming'
    AND start_date <= CURRENT_DATE
    AND (
      (deadline IS NOT NULL AND deadline >= CURRENT_DATE)
      OR (deadline IS NULL AND end_date >= CURRENT_DATE)
    );

  -- Absences d'une serie terminee.
  DELETE FROM public.absences a
  USING public.event_rounds r
  WHERE a.round_id = r.id
    AND r.end_date < CURRENT_DATE;

  -- Absences generales passees, qu'aucune serie en cours du club ne couvre.
  DELETE FROM public.absences a
  WHERE a.round_id IS NULL
    AND a.absent_date < CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.events e        ON e.club_id = p.club_id
      JOIN public.event_rounds r  ON r.event_id = e.id
      WHERE p.id = a.profile_id
        AND r.end_date >= CURRENT_DATE
        AND a.absent_date BETWEEN r.start_date AND r.end_date
    );
END;
$$;

-- Remplace par la regle ci-dessus.
DROP TRIGGER IF EXISTS trg_cleanup_absences_on_event_complete ON public.event_rounds;
DROP FUNCTION IF EXISTS public.cleanup_absences_on_event_complete();

-- Rattrapage immediat : les absences deja perimees partent maintenant, sans
-- attendre la nuit.
SELECT public.update_event_statuses();
