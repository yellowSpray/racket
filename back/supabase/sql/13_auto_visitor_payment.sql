-- ===================================
-- TRIGGER : PAIEMENT AUTOMATIQUE POUR LES VISITEURS
-- ===================================
-- Quand un joueur est inscrit a un evenement (insert dans event_players),
-- si le joueur a le statut "visitor", un paiement "unpaid" est cree
-- automatiquement avec le visitor_fee du club.

CREATE OR REPLACE FUNCTION public.auto_create_visitor_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_visitor boolean;
  v_club_id uuid;
  v_visitor_fee numeric(10,2);
BEGIN
  -- Verifier si le joueur a le statut "visitor"
  SELECT EXISTS (
    SELECT 1 FROM public.player_status
    WHERE profile_id = NEW.profile_id
      AND status = 'visitor'
  ) INTO v_is_visitor;

  IF NOT v_is_visitor THEN
    RETURN NEW;
  END IF;

  -- Recuperer le club_id et le visitor_fee via l'evenement
  SELECT c.id, c.visitor_fee
  INTO v_club_id, v_visitor_fee
  FROM public.events e
  JOIN public.clubs c ON c.id = e.club_id
  WHERE e.id = NEW.event_id;

  IF v_club_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Creer le paiement unpaid (ignore si deja existant)
  INSERT INTO public.payments (profile_id, event_id, amount, status)
  VALUES (NEW.profile_id, NEW.event_id, COALESCE(v_visitor_fee, 0), 'unpaid')
  ON CONFLICT (profile_id, event_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger sur event_players
DROP TRIGGER IF EXISTS trg_auto_visitor_payment ON public.event_players;

CREATE TRIGGER trg_auto_visitor_payment
  AFTER INSERT ON public.event_players
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_visitor_payment();
