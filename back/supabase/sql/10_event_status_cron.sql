-- Migration : mise a jour automatique du statut des evenements
-- Fonction qui met a jour les statuts en fonction des dates et de la deadline

CREATE OR REPLACE FUNCTION public.update_event_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Passer en 'completed' les evenements dont la deadline ou la end_date est depassee
  UPDATE public.events
  SET status = 'completed', updated_at = now()
  WHERE status != 'completed'
    AND (
      (deadline IS NOT NULL AND deadline < CURRENT_DATE)
      OR (deadline IS NULL AND end_date < CURRENT_DATE)
    );

  -- Passer en 'active' les evenements upcoming dont la start_date est atteinte
  UPDATE public.events
  SET status = 'active', updated_at = now()
  WHERE status = 'upcoming'
    AND start_date <= CURRENT_DATE
    AND (
      (deadline IS NOT NULL AND deadline >= CURRENT_DATE)
      OR (deadline IS NULL AND end_date >= CURRENT_DATE)
    );
END;
$$;

-- Job pg_cron : execution tous les jours a minuit (UTC)
-- Note : pg_cron doit etre active dans le dashboard Supabase (Database > Extensions)
SELECT cron.schedule(
  'update-event-statuses',
  '0 0 * * *',
  $$SELECT public.update_event_statuses()$$
);
