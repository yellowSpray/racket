-- ===================================
-- MIGRATION 16 : suppression du trigger obsolète
-- ===================================
-- La migration 14 a remplacé event_courts.event_id par event_courts.round_id.
-- Le trigger auto_copy_club_courts_to_event référençait event_id → cassé.
-- La copie des terrains doit désormais se faire au niveau du round, pas de l'event.

DROP TRIGGER IF EXISTS trg_auto_copy_club_courts ON public.events;
