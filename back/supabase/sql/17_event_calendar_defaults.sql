-- ===================================
-- 17 - EVENT CALENDAR DEFAULTS
-- ===================================
-- Ajoute les préférences de calendrier au niveau de l'événement :
-- - default_days_of_week : jours de la semaine préférés (0=dim … 6=sam), NULL = tous
-- - exclude_public_holidays : exclure les jours fériés lors de la génération automatique

ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS default_days_of_week integer[] DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS exclude_public_holidays boolean NOT NULL DEFAULT false;
