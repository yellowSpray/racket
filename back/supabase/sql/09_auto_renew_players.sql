-- ===================================
-- RENOUVELLEMENT AUTOMATIQUE DES JOUEURS
-- ===================================
-- Quand un admin cree un nouvel evenement et que le club a active
-- le renouvellement automatique, les joueurs de l'evenement precedent
-- sont automatiquement inscrits au nouvel evenement.

-- Colonne sur clubs
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS auto_renew_players boolean DEFAULT false;

-- Fonction trigger
CREATE OR REPLACE FUNCTION public.auto_renew_event_players()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_previous_event_id uuid;
  v_auto_renew boolean;
BEGIN
  -- Verifier si le club a active le renouvellement automatique
  SELECT auto_renew_players INTO v_auto_renew
  FROM public.clubs
  WHERE id = NEW.club_id;

  IF v_auto_renew IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Trouver l'evenement precedent du meme club
  SELECT id INTO v_previous_event_id
  FROM public.events
  WHERE club_id = NEW.club_id
    AND id != NEW.id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Copier uniquement les joueurs actifs de l'evenement precedent
  IF v_previous_event_id IS NOT NULL THEN
    INSERT INTO public.event_players (event_id, profile_id)
    SELECT NEW.id, ep.profile_id
    FROM public.event_players ep
    JOIN public.player_status ps ON ps.profile_id = ep.profile_id AND ps.status = 'active'
    WHERE ep.event_id = v_previous_event_id
    ON CONFLICT (event_id, profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger AFTER INSERT sur events
DROP TRIGGER IF EXISTS trg_auto_renew_event_players ON public.events;
CREATE TRIGGER trg_auto_renew_event_players
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_renew_event_players();
