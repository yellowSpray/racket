-- ===================================
-- 01 - TYPES ET TABLES
-- ===================================
-- Ce fichier contient tous les types ENUM et toutes les tables
-- À exécuter en PREMIER

-- ===================================
-- TYPES ENUM
-- ===================================

-- Type pour les rôles utilisateurs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'admin', 'superadmin');
    END IF;
END $$;

-- Type pour les statuts de joueur
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'player_status_enum') THEN
    CREATE TYPE player_status_enum AS ENUM ('active', 'inactive', 'member', 'visitor');
  END IF;
END $$;

-- Type pour les statuts de paiement
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
    CREATE TYPE payment_status_enum AS ENUM ('paid', 'unpaid');
  END IF;
END $$;

-- ===================================
-- TABLES
-- ===================================

-- Table CLUBS : Représente les clubs de badminton
CREATE TABLE IF NOT EXISTS public.clubs (
  id uuid primary key default gen_random_uuid(),
  club_name text not null,
  club_address text,
  club_email text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Table SPORTS : Liste des sports disponibles (badminton, tennis, etc.)
CREATE TABLE IF NOT EXISTS public.sports (
  id uuid primary key default gen_random_uuid(),
  sport_name text not null unique,
  created_at timestamp with time zone default now()
);

-- Table PROFILES : Profils utilisateurs liés à auth.users
-- Note: phone est ici ET dans auth.users (synchronisé via trigger)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  phone text,  -- Synchronisé avec auth.users
  club_id uuid references public.clubs(id) on delete set null,
  avatar_url text,
  power_ranking int4,  -- Classement du joueur (ex: 1400)
  role user_role not null default 'user',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  activation_token uuid,  -- Token pour l'activation du compte
  is_linked boolean  -- Indique si le profil est lié à un compte auth
);

-- Table de liaison many-to-many entre profiles et sports
-- Un joueur peut pratiquer plusieurs sports
CREATE TABLE IF NOT EXISTS public.profile_sports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sport_id uuid not null references public.sports(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(profile_id, sport_id)  -- Un joueur ne peut avoir le même sport qu'une fois
);

-- TABLE EVENTS : Représente une série d'événements (ex: "Série 36")
-- Contient les dates de début/fin et les paramètres de l'événement
CREATE TABLE IF NOT EXISTS public.events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null unique,
  description text,
  start_date date not null,  -- Date de début de la série
  end_date date not null,    -- Date de fin de la série
  start_time time with time zone,  -- Heure de début des matchs
  end_time time with time zone,    -- Heure de fin des matchs
  number_of_courts int not null default 1,  -- Nombre de terrains disponibles
  estimated_match_duration interval default interval '00:30:00',  -- Durée estimée d'un match
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- TABLE GROUPS : Tableaux de joueurs (généralement 5 ou 6 joueurs par groupe)
-- Chaque groupe génère des matchs en round-robin
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  group_name text not null,  -- Ex: "Tableau A", "Groupe 1"
  max_players int not null default 5,  -- Nombre max de joueurs dans le groupe
  created_at timestamp with time zone default now()
);

-- TABLE GROUP_PLAYERS : Liaison many-to-many entre joueurs et groupes
-- Assigne les joueurs aux différents tableaux
CREATE TABLE IF NOT EXISTS public.group_players (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(group_id, profile_id)  -- Un joueur ne peut être qu'une fois par groupe
);

-- TABLE MATCHES : Planification et résultats des matchs
-- Contient les informations de chaque match individuel
CREATE TABLE IF NOT EXISTS public.matches (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  player1_id uuid not null references public.profiles(id) on delete cascade,
  player2_id uuid not null references public.profiles(id) on delete cascade,
  match_date date not null,  -- Date du match
  match_time time with time zone not null,  -- Heure du match
  court_number text,  -- Numéro du terrain
  winner_id uuid references public.profiles(id),  -- ID du gagnant
  score text,  -- Score du match (ex: "21-15, 21-18")
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- TABLE SCHEDULE : Horaires d'arrivée et de départ des joueurs
-- IMPORTANT: arrival et departure sont des timestamps complets (date + heure)
-- Pour un événement, on combine la date de l'événement avec l'heure saisie
CREATE TABLE IF NOT EXISTS public.schedule (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  arrival timestamp with time zone,   -- Date/heure d'arrivée prévue
  departure timestamp with time zone, -- Date/heure de départ prévue
  created_at timestamp with time zone default now(),
  unique(profile_id, event_id)  -- Un seul horaire par joueur par événement
);

-- TABLE ABSENCES : Gestion des absences par date
-- Permet de marquer un joueur absent pour une date spécifique
CREATE TABLE IF NOT EXISTS public.absences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  absent_date date not null,  -- Date de l'absence
  reason text,  -- Raison de l'absence (optionnel)
  created_at timestamp with time zone default now(),
  unique(profile_id, event_id, absent_date)  -- Une absence unique par joueur/événement/date
);

-- TABLE PLAYER STATUS : État d'un joueur (active/inactive, member/visitor)
-- Note: Un joueur peut avoir plusieurs status simultanément
CREATE TABLE IF NOT EXISTS public.player_status (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status player_status_enum not null,
  updated_at timestamp with time zone default now()
);

-- TABLE PAYMENTS : Historique des paiements par événement
-- Les "visitors" doivent payer pour participer à un événement
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  amount numeric(10,2) not null default 0,  -- Montant à payer
  status payment_status_enum not null default 'unpaid',  -- État du paiement
  paid_at timestamp with time zone,  -- Date/heure du paiement
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(profile_id, event_id)  -- Un seul paiement par joueur par événement
);

-- ===================================
-- INDEX POUR PERFORMANCES
-- ===================================

CREATE INDEX IF NOT EXISTS idx_profiles_club_id ON public.profiles(club_id);
CREATE INDEX IF NOT EXISTS idx_profile_sports_profile_id ON public.profile_sports(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_sports_sport_id ON public.profile_sports(sport_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_groups_event_id ON public.groups(event_id);
CREATE INDEX IF NOT EXISTS idx_matches_group_id ON public.matches(group_id);
CREATE INDEX IF NOT EXISTS idx_matches_player1_id ON public.matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2_id ON public.matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_schedule_profile_id ON public.schedule(profile_id);
CREATE INDEX IF NOT EXISTS idx_schedule_event_id ON public.schedule(event_id);

-- Index unique : un joueur ne peut avoir qu'une seule fois chaque status
CREATE UNIQUE INDEX IF NOT EXISTS uniq_player_status_per_profile ON public.player_status(profile_id, status);
