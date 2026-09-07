-- ===========================================================================
-- 37 - LES DEUX INDEX QUE LA PRODUCTION N'A JAMAIS RECUS, ET LE SEAU DES LOGOS
-- ===========================================================================
--
-- Deux constats du diff de structure entre la production et une base
-- reconstruite depuis le depot.
--
-- ---------------------------------------------------------------------------
-- 1. Deux index de cle etrangere absents de la production
-- ---------------------------------------------------------------------------
--
-- Le fichier 01 declare `idx_event_players_event_id` et
-- `idx_event_players_profile_id`. La production ne les a pas : ils ont
-- manifestement ete ajoutes au fichier apres son passage. Or `event_players`
-- porte deux cles etrangeres sur ces colonnes, elle est jointe a chaque
-- affichage d'evenement, et une cle etrangere sans index oblige PostgreSQL a
-- parcourir toute la table a chaque suppression du cote reference.
--
-- C'est le meme travail que la migration 22, qui avait couvert les autres
-- tables et laisse celle-ci de cote.
--
-- ---------------------------------------------------------------------------
-- 2. Le seau `club-logos` n'a aucune policy, nulle part
-- ---------------------------------------------------------------------------
--
-- Le fichier 01 cree le seau, en public. Aucun fichier ne dit qui a le droit
-- d'y deposer quoi que ce soit, et la production n'en a pas davantage : le
-- diff ne montre aucune policy sur `storage.objects` d'un cote ni de l'autre.
--
-- `ClubLogoCard` televerse pourtant depuis le navigateur, sous le chemin
-- `<club_id>/logo.<ext>`, avec `upsert: true`. Sans policy, RLS refuse, et
-- l'envoi d'un logo echoue.
--
-- Le chemin porte l'identifiant du club en premier segment, ce qui suffit a
-- cloisonner : un admin n'ecrit que dans le dossier de son club. La lecture
-- reste ouverte, le seau est public et l'application sert les logos par leur
-- URL publique.
--
-- `upsert: true` se traduit par un INSERT si l'objet est neuf et un UPDATE
-- s'il existe deja, d'ou les deux policies d'ecriture. Remplacer un logo est
-- le cas courant, pas l'exception.
--
-- Note : si l'editeur SQL refuse de creer une policy sur `storage.objects`
-- faute d'etre proprietaire de la table, les memes regles se posent depuis
-- Storage > Policies dans le tableau de bord. Le texte ci-dessous reste la
-- reference de ce qui doit exister.
--
-- Ce fichier est rejouable.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. Index de cle etrangere sur event_players
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_event_players_event_id
  ON public.event_players(event_id);

CREATE INDEX IF NOT EXISTS idx_event_players_profile_id
  ON public.event_players(profile_id);


-- ---------------------------------------------------------------------------
-- 2. Policies du seau club-logos
-- ---------------------------------------------------------------------------

-- Lecture ouverte : le seau est public et les logos sont servis par leur URL.
DROP POLICY IF EXISTS "Lecture publique des logos de club" ON storage.objects;
CREATE POLICY "Lecture publique des logos de club"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'club-logos');

-- Depot d'un logo : l'admin, dans le dossier de son club seulement.
DROP POLICY IF EXISTS "Un admin depose le logo de son club" ON storage.objects;
CREATE POLICY "Un admin depose le logo de son club"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'club-logos'
  AND (
    public.is_superadmin()
    OR (public.is_admin()
        AND split_part(name, '/', 1) = public.get_user_club_id()::text)
  )
);

-- Remplacement d'un logo : c'est ce que fait `upsert: true` quand le fichier
-- existe deja. La condition est la meme des deux cotes, sur l'objet remplace
-- comme sur l'objet ecrit, pour qu'on ne puisse pas deplacer un fichier d'un
-- club vers un autre.
DROP POLICY IF EXISTS "Un admin remplace le logo de son club" ON storage.objects;
CREATE POLICY "Un admin remplace le logo de son club"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'club-logos'
  AND (
    public.is_superadmin()
    OR (public.is_admin()
        AND split_part(name, '/', 1) = public.get_user_club_id()::text)
  )
)
WITH CHECK (
  bucket_id = 'club-logos'
  AND (
    public.is_superadmin()
    OR (public.is_admin()
        AND split_part(name, '/', 1) = public.get_user_club_id()::text)
  )
);

-- Suppression : meme regle.
DROP POLICY IF EXISTS "Un admin supprime le logo de son club" ON storage.objects;
CREATE POLICY "Un admin supprime le logo de son club"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'club-logos'
  AND (
    public.is_superadmin()
    OR (public.is_admin()
        AND split_part(name, '/', 1) = public.get_user_club_id()::text)
  )
);


-- ===========================================================================
-- Verification
-- ===========================================================================
--   select policyname, cmd from pg_policies
--    where schemaname = 'storage' and tablename = 'objects'
--    order by cmd, policyname;
--
-- Et dans l'application : Parametres > Club, envoyer un logo, puis le
-- remplacer par un autre.
-- ===========================================================================
