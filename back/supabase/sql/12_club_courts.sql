-- ===================================
-- TERRAINS AU NIVEAU DU CLUB
-- ===================================
-- Les clubs definissent leurs terrains une fois.
-- A chaque creation d'evenement, les terrains du club
-- sont automatiquement copies dans event_courts.

-- TABLE CLUB_COURTS
CREATE TABLE IF NOT EXISTS public.club_courts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  court_name text not null default 'Terrain 1',
  available_from time not null default '19:00',
  available_to time not null default '23:00',
  sort_order int not null default 0,
  created_at timestamp with time zone default now()
);

CREATE INDEX IF NOT EXISTS idx_club_courts_club_id ON public.club_courts(club_id);

-- RLS
ALTER TABLE public.club_courts ENABLE ROW LEVEL SECURITY;

-- SELECT : superadmin ou membre du club
CREATE POLICY "club_courts_select"
ON public.club_courts
FOR SELECT
USING (
  public.is_superadmin()
  OR club_id = public.get_user_club_id()
);

-- INSERT : superadmin ou admin du club
CREATE POLICY "club_courts_insert"
ON public.club_courts
FOR INSERT
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND club_id = public.get_user_club_id())
);

-- UPDATE : superadmin ou admin du club
CREATE POLICY "club_courts_update"
ON public.club_courts
FOR UPDATE
USING (
  public.is_superadmin()
  OR (public.is_admin() AND club_id = public.get_user_club_id())
);

-- DELETE : superadmin ou admin du club
CREATE POLICY "club_courts_delete"
ON public.club_courts
FOR DELETE
USING (
  public.is_superadmin()
  OR (public.is_admin() AND club_id = public.get_user_club_id())
);

-- ===================================
-- TRIGGER : copie automatique des terrains club -> event
-- ===================================

CREATE OR REPLACE FUNCTION public.auto_copy_club_courts_to_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.event_courts (event_id, court_name, available_from, available_to, sort_order)
  SELECT NEW.id, cc.court_name, cc.available_from, cc.available_to, cc.sort_order
  FROM public.club_courts cc
  WHERE cc.club_id = NEW.club_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_copy_club_courts ON public.events;
CREATE TRIGGER trg_auto_copy_club_courts
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_copy_club_courts_to_event();
