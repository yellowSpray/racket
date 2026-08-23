-- ===================================
-- 18 - CLUB COUNTRY CODE
-- ===================================
-- Ajoute le code pays au club pour la génération automatique des jours fériés.
-- Codes supportés : FR, BE, NL, DE, CH, ES, PT, LU, IT

ALTER TABLE public.clubs
    ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT 'FR';
