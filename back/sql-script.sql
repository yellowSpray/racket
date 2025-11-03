-- Création du type enum pour les rôles
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'admin', 'superadmin');
    END IF;
END $$;

-- ========================================
-- CRÉATION DES TABLES DANS L'ORDRE
-- ========================================

-- 1. Création de la table clubs (AVANT profiles car profiles la référence)
create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  club_name text not null,
  club_address text,
  club_email text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. Création de la table sports
create table public.sports (
  id uuid primary key default gen_random_uuid(),
  sport_name text not null unique,
  created_at timestamp with time zone default now()
);

-- 3. Création de la table profiles (AVEC la relation vers clubs)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  avatar_url text,
  role user_role not null default 'user',
  club_id uuid references public.clubs(id) on delete set null,  -- RELATION VERS CLUBS
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 4. Table de liaison many-to-many entre profiles et sports
create table public.profile_sports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sport_id uuid not null references public.sports(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(profile_id, sport_id)
);

-- Index pour améliorer les performances
create index idx_profiles_club_id on public.profiles(club_id);
create index idx_profile_sports_profile_id on public.profile_sports(profile_id);
create index idx_profile_sports_sport_id on public.profile_sports(sport_id);

-- Activer Row-Level Security
alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.sports enable row level security;
alter table public.profile_sports enable row level security;

-- Fonction pour créer le profil complet
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name, phone, club_id, role)
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'phone',
    nullif(new.raw_user_meta_data->>'club_id', '')::uuid,
    'user'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Fonction helper pour vérifier si l'utilisateur est admin
create function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'superadmin')
  );
end;
$$ language plpgsql security definer;

-- ========================================
-- POLICIES RLS - PROFILES
-- ========================================

-- Chaque utilisateur peut lire son propre profil
create policy "Users can select their own profile"
on public.profiles
for select
to public
using (auth.uid() = id);

-- Chaque utilisateur peut modifier son propre profil (sauf le role)
create policy "Users can update their own profile"
on public.profiles
for update
to public
using (auth.uid() = id)
with check (
  auth.uid() = id 
  and role = (select role from public.profiles where id = auth.uid())
);

-- Les admins et superadmins peuvent lire tous les profils
create policy "Admins can select all profiles"
on public.profiles
for select
to public
using (public.is_admin());

-- Les admins et superadmins peuvent modifier tous les profils
create policy "Admins can update all profiles"
on public.profiles
for update
to public
using (public.is_admin());

-- Chaque utilisateur peut créer son profil (via trigger)
create policy "Users can insert their profile"
on public.profiles
for insert
to public
with check (auth.uid() = id);

-- ========================================
-- POLICIES RLS - CLUBS
-- ========================================

-- Tout le monde peut lire les clubs
create policy "Everyone can select clubs"
on public.clubs
for select
to public
using (true);

-- Seuls les admins peuvent créer des clubs
create policy "Admins can insert clubs"
on public.clubs
for insert
to public
with check (public.is_admin());

-- Seuls les admins peuvent modifier des clubs
create policy "Admins can update clubs"
on public.clubs
for update
to public
using (public.is_admin());

-- Seuls les admins peuvent supprimer des clubs
create policy "Admins can delete clubs"
on public.clubs
for delete
to public
using (public.is_admin());

-- ========================================
-- POLICIES RLS - SPORTS
-- ========================================

-- Tout le monde peut lire les sports
create policy "Everyone can select sports"
on public.sports
for select
to public
using (true);

-- Seuls les admins peuvent créer des sports
create policy "Admins can insert sports"
on public.sports
for insert
to public
with check (public.is_admin());

-- Seuls les admins peuvent modifier des sports
create policy "Admins can update sports"
on public.sports
for update
to public
using (public.is_admin());

-- Seuls les admins peuvent supprimer des sports
create policy "Admins can delete sports"
on public.sports
for delete
to public
using (public.is_admin());

-- ========================================
-- POLICIES RLS - PROFILE_SPORTS
-- ========================================

-- Les utilisateurs peuvent voir leurs propres sports
create policy "Users can select their own sports"
on public.profile_sports
for select
to public
using (auth.uid() = profile_id);

-- Les admins peuvent voir tous les sports des utilisateurs
create policy "Admins can select all profile sports"
on public.profile_sports
for select
to public
using (public.is_admin());

-- Les utilisateurs peuvent ajouter des sports à leur profil
create policy "Users can insert their own sports"
on public.profile_sports
for insert
to public
with check (auth.uid() = profile_id);

-- Les admins peuvent ajouter des sports à n'importe quel profil
create policy "Admins can insert any profile sports"
on public.profile_sports
for insert
to public
with check (public.is_admin());

-- Les utilisateurs peuvent supprimer leurs propres sports
create policy "Users can delete their own sports"
on public.profile_sports
for delete
to public
using (auth.uid() = profile_id);

-- Les admins peuvent supprimer n'importe quel sport
create policy "Admins can delete any profile sports"
on public.profile_sports
for delete
to public
using (public.is_admin());