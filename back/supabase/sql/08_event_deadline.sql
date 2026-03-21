-- Migration : ajout du champ deadline sur la table events
-- La deadline est la date a laquelle l'evenement est automatiquement considere comme termine

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS deadline date DEFAULT NULL;

COMMENT ON COLUMN public.events.deadline IS 'Date limite de l''evenement. Passe le statut a termine une fois depassee.';
