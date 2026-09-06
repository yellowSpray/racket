-- ===========================================================================
-- 35 - INVITER UN JOUEUR DEJA IMPORTE
-- ===========================================================================
--
-- `invite-member` fait ce qu'il faut pour un joueur importe : elle appelle
-- `createUser` en imposant l'identifiant du profil existant, pour que le
-- compte et le profil soient la meme personne.
--
-- Mais la migration 05 a reecrit `handle_new_user` en retirant le
-- `ON CONFLICT (id) DO NOTHING` que la migration 02 portait. Le trigger fait
-- donc un INSERT sec dans `profiles` avec un identifiant qui existe deja. Il
-- est en AFTER INSERT sur `auth.users` : son echec annule la transaction, donc
-- `createUser` echoue et aucun compte n'est cree.
--
--   duplicate key value violates unique constraint "profiles_pkey"
--
-- Verifie sur PostgreSQL 16 avant correctif. Sur 95 profils du club pilote, 94
-- sont des joueurs importes : l'invitation ne marche donc pour presque personne.
--
-- Meme cause pour un second defaut, visible celui-la. `is_linked` ne passait a
-- `true` que dans l'INSERT, c'est-a-dire uniquement pour un profil cree par
-- l'inscription elle-meme. Un profil qui preexistait restait a `false` pour
-- toujours. L'ecran des membres lit cette colonne pour son badge « Lié » ou
-- « En attente » : tout le monde y etait en attente, y compris le seul compte
-- existant, et le bouton d'invitation restait propose a des gens deja inscrits.
--
-- Le `DO UPDATE` ne rapatrie que ce qui manque. Le nom, le club et le telephone
-- du profil importe ont ete saisis ou verifies par un admin ; les metadonnees
-- d'invitation, elles, sont souvent vides. Les ecraser ferait perdre un travail
-- de saisie au moment meme ou le joueur rejoint le club.
--
-- `email` fait exception et suit toujours le compte : c'est la regle posee
-- avec `syncProfileEmail`, pour un compte lie `auth.users.email` fait foi et
-- `profiles.email` n'en est qu'un reflet.
--
-- Ce fichier est rejouable.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, phone, email, club_id, role, is_linked)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.raw_user_meta_data->>'phone',
    new.email,
    nullif(new.raw_user_meta_data->>'club_id', '')::uuid,
    'user',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    -- Le compte existe desormais : c'est tout l'objet de cette migration.
    is_linked  = true,
    -- L'adresse du compte fait foi.
    email      = excluded.email,
    -- Le reste ne se remplit que s'il manque. Un profil importe porte le
    -- travail de saisie de l'admin, une invitation porte souvent des champs
    -- vides.
    first_name = coalesce(nullif(profiles.first_name, ''), excluded.first_name),
    last_name  = coalesce(nullif(profiles.last_name, ''),  excluded.last_name),
    phone      = coalesce(profiles.phone,   excluded.phone),
    club_id    = coalesce(profiles.club_id, excluded.club_id),
    updated_at = now();

  RETURN new;
END;
$$;

-- Le trigger est recree pour que le fichier tienne debout seul, meme sur une
-- base ou il aurait ete supprime.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Rattrapage : les profils qui ont deja un compte mais que l'ancien trigger
-- n'a jamais marques. Ils s'affichent « En attente » dans l'ecran des membres
-- alors que leur titulaire se connecte tous les jours.
-- ---------------------------------------------------------------------------
UPDATE public.profiles p
SET is_linked  = true,
    updated_at = now()
FROM auth.users a
WHERE a.id = p.id
  AND p.is_linked IS DISTINCT FROM true;
