-- ===========================================================================
-- 39 - `matches.updated_at` TENU PAR LA BASE, PLUS PAR CONVENTION
-- ===========================================================================
--
-- Le badge « Mis à jour le » de la page publique lit
-- `max(matches.updated_at)` de la serie affichee. Il repond a la seule
-- question que se pose un joueur devant un tableau : est-ce que c'est a jour.
--
-- Or personne ne tenait cette colonne. Aucun declencheur sur `matches` ne la
-- touche : elle n'etait mise a jour que par convention, a un seul endroit du
-- front, `updateMatchResults` dans `useMatches`, qui l'envoie explicitement.
--
-- Ce qui echappe a cette convention passe donc en silence. Constate en
-- production le 8 septembre : dix matchs portent un score dont `updated_at`
-- est identique a `created_at` a la microseconde pres, c'est-a-dire des lignes
-- jamais modifiees depuis leur insertion. Des scores ecrits en SQL direct. Le
-- badge affichait le 5 septembre alors que ces resultats etaient posterieurs.
--
--   scores_sans_trace : 10
--   scores_avec_trace : 201
--
-- Et le trou va s'elargir : l'Edge Function `generate-box`, un import, une
-- correction tapee dans l'editeur SQL oublieront cette colonne aussi surement.
--
-- Un declencheur la rend vraie par construction. Effet de bord bienvenu :
-- l'heure vient desormais du serveur et non de l'horloge du navigateur, qui
-- pouvait etre fausse et faire mentir le badge dans l'autre sens.
--
-- PORTEE. `matches` seulement. Onze autres tables portent un `updated_at` dans
-- le meme etat, mais aucune n'alimente d'affichage aujourd'hui : les traiter
-- toutes serait un changement large sans besoin constate. La fonction est
-- ecrite pour etre reutilisable, y attacher une table de plus tiendra en deux
-- lignes le jour ou ce sera utile.
--
-- Le front peut continuer d'envoyer `updated_at`, le declencheur le remplace.
-- Rien a changer de ce cote.
--
-- Verifie sur PostgreSQL 16 : ecriture SQL directe, valeur perimee imposee par
-- le client, modification sans changement reel, insertion, et propagation
-- jusqu'au badge de l'embed.
--
-- Ce fichier est rejouable.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- `now()` est l'heure de debut de transaction : toutes les lignes touchees
  -- par une meme ecriture portent donc le meme horodatage, ce qui est ce qu'on
  -- veut pour une saisie en lot.
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.touch_updated_at() IS
  'Pose updated_at a l''heure du serveur avant toute modification. A attacher en BEFORE UPDATE sur les tables dont la fraicheur est affichee.';

DROP TRIGGER IF EXISTS trg_matches_updated_at ON public.matches;

-- La condition evite de faire bouger la date sur une ecriture qui ne change
-- rien. Sans elle, reenregistrer un score identique rajeunirait le badge et
-- ferait croire a une mise a jour qui n'a pas eu lieu.
CREATE TRIGGER trg_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.touch_updated_at();


-- ===========================================================================
-- Verification
-- ===========================================================================
-- 1. Une ecriture en SQL direct doit desormais laisser une trace :
--
--      update public.matches set score = score || '' where id = '<un match>';
--      select updated_at from public.matches where id = '<un match>';
--
-- 2. Et le badge doit suivre :
--
--      select j->'round'->>'updated_at'
--        from public.get_draws_by_embed_token('<jeton>') j;
--
-- 3. Les dix scores sans trace gardent leur date d'insertion : ce declencheur
--    ne regarde que l'avenir. Les rattraper demanderait de deviner quand ils
--    ont ete saisis, ce que personne ne sait.
-- ===========================================================================
