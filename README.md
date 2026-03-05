<!-- PROJECT LOGO -->
<a id="readme-top"></a>
<div align="center">
  <a href="#">
    <img src="./front/public/vite.svg" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Event Fest</h3>

  <p align="center">
    A web application that automates round-robin tournament management for racket sports clubs — from player registration to rankings, promotion/relegation, and scheduling.
    <br />
    <a href="https://github.com/yellowSpray/racket">View Demo</a>
  </p>
</div>

<!-- ABOUT THE PROJECT -->
## About The Project

Event Fest replaces the manual, fragmented workflow of managing round-robin "boxes" for racket sports clubs. Today, club administrators juggle Excel spreadsheets, WhatsApp groups, and paper to handle player registrations, group draws, match scheduling, scoring, and promotion/relegation between levels - a process that consumes hours of volunteer time per cycle.

Event Fest automates the entire box lifecycle: import players, calculate rankings, apply promotion/relegation rules, generate balanced groups, and publish - all validated in a single click. The platform targets all racket sports (squash, padel, tennis, badminton, table tennis, pickleball) and is designed to scale from a single club to a multi-club network.

### Three access levels

* **Player:** Views match schedule, tracks ranking progression, registers/unregisters for events.
* **Admin:** Creates boxes with one click, manages players, configures scoring and promotion/relegation rules, enters results.
* **Super Admin:** Oversees all clubs, manages admins, handles edge cases and platform-wide configuration.

### What Makes This Special

* **One-click box creation** — Transforms hours of manual admin work into an automated workflow. Rankings, promotions/relegations, group distribution, and scheduling are computed instantly.
* **Multi-sport by design** — Supports all racket sports from day one (squash, padel, tennis, badminton, table tennis, pickleball).
* **Configurable rules engine** — Scoring, promotion/relegation, table sizes vary by club. No hardcoded logic.
* **Smart Excel import** — Onboard new clubs without manual data entry. Auto-detects columns, previews mapping, imports in seconds.

### Built With

* [![React Badge][React.js]][React-url]
* [![Vite Badge][Vite]][Vite-url]
* [![TypeScript Badge][TypeScript]][TypeScript-url]
* [![Tailwind CSS Badge][TailwindCSS]][Tailwind-url]
* [![React Router Badge][ReactRouter]][ReactRouter-url]
* [![shadcn/ui Badge][shadcn/ui]][shadcn/ui-url]
* [![Supabase Badge][Supabase]][Supabase-url]

<!-- FEATURES -->
## Main Features

### Completed

* Secure authentication with role-based access (user / admin / superadmin)
* Player registration / unregistration for events
* Player roster management (add, edit, deactivate)
* Group / draw management with auto-distribution and multiple configuration choices
* Event settings and configuration
* Round-robin table display with groups and match details (date, time, court)
* Multi-constraint scheduling engine (player availability, arrival/departure windows, court slots, bye optimization)
* Smart absence management (soft constraints with bye/absence alignment for odd groups)
* Configurable scoring engine (per-club score-to-points mapping, including ABS handling)
* Configurable promotion/relegation rules (customizable promoted/relegated counts per club)
* Ranking engine with full standings computation (points, set diff, head-to-head tiebreakers)
* Promotion/relegation engine (automatic moves based on standings and club rules)
* Elo rating engine for player power ranking updates
* "Box precedent" wizard: generate new groups from previous event standings with automatic redistribution by power ranking
* Previous box preview with promotion/relegation indicators and unregistered player detection
* Drag & drop group management for proposed groups (with new player highlighting)
* Vitest + TDD test suite (600+ tests)

### In Progress (MVP — Phase 1)

* One-click new box workflow (rankings + promotions + groups + schedule — in one click)
* Smart Excel import with auto-detection and column mapping
* Admin preview before publishing

### Planned (Phase 2-4)

* Player-entered results with opponent confirmation
* Live results page during match nights (real-time)
* Complete player stats page (winrate, streaks, head-to-head)
* Calendar sync (Google/Apple/Outlook)
* Integrated communication center (replacing WhatsApp)
* Public club page with QR code for player acquisition
* Elo-based intelligent player placement (engine built, UI integration planned)
* FIFA-style player cards, badges, and achievements
* Participation streaks and gamification
* Multi-club network with cross-club player profiles

<!-- ARCHITECTURE -->
## Architecture

```
Event-Fest/
├── front/              # React 19 + TypeScript + Vite (SPA)
│   └── src/
│       ├── components/ # UI components (admin/, user/, shared/, ui/)
│       ├── contexts/   # React Context (Auth, Event, Players)
│       ├── hooks/      # Custom hooks (data fetching via Supabase)
│       ├── lib/        # Domain logic (ranking, promotion, Elo, scheduling, group distribution engines)
│       ├── pages/      # Page components (admin/, user/, auth/)
│       ├── routes/     # React Router v7 with role-based protection
│       └── types/      # TypeScript type definitions
├── back/               # Supabase backend (PostgreSQL + Auth + Realtime)
│   └── supabase/
│       ├── sql/        # Schema, functions, triggers, RLS policies
│       ├── functions/  # Edge Functions (generate-box, import-players)
│       └── migrations/
└── docs/               # PRD, architecture, brainstorming
```

**Key architectural decisions:**
- **Hybrid business logic:** Client-side for preview, Supabase Edge Functions for atomic operations (box generation)
- **Multi-tenant data isolation:** Row-Level Security (RLS) policies at the database level
- **Real-time updates:** Supabase Realtime subscriptions, scoped per club
- **No REST API layer:** Direct Supabase client queries from custom hooks

<!-- ROADMAP -->
## Roadmap

### Phase 1 — MVP (Target: 1 month)
- [x] Base project structure (React 19 + TypeScript + Vite + shadcn/ui)
- [x] Authentication and role management
- [x] Player roster management
- [x] Event settings and configuration
- [x] Group / draw management with distribution choices
- [x] Multi-constraint scheduling engine
- [x] Vitest + TDD setup (600+ tests)
- [x] Configurable scoring engine (score-to-points mapping)
- [x] Configurable promotion/relegation rules
- [x] Ranking engine (points, set diff, head-to-head)
- [x] Promotion/relegation engine
- [x] Elo rating engine
- [x] "Box precedent" wizard (generate groups from previous event)
- [ ] One-click new box workflow (final integration)
- [ ] Smart Excel import

### Phase 2 — Growth
- [ ] Player-entered results with confirmation
- [ ] Auto re-registration (opt-out)
- [ ] Live results page during match nights
- [ ] Complete player stats page
- [ ] Pre-match presence confirmation

### Phase 3 — Expansion
- [ ] Calendar sync (Google/Apple/Outlook)
- [ ] Integrated communication center
- [ ] Public club page with QR code
- [ ] Automated club/admin verification
- [ ] Smart match reminders

### Phase 4 — Engagement & Scale
- [ ] Elo-based intelligent player placement (UI integration)
- [ ] FIFA-style player cards and badges
- [ ] Participation streaks
- [ ] Multi-club network
- [ ] Monetization (freemium per club)

See the [open issues](https://github.com/yellowSpray/racket/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
[React.js]: https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[Vite]: https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white
[Vite-url]: https://vitejs.dev/
[TypeScript]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[TailwindCSS]: https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white
[Tailwind-url]: https://tailwindcss.com/
[ReactRouter]: https://img.shields.io/badge/React_Router_v7-F44250?style=for-the-badge&logo=react-router&logoColor=white
[ReactRouter-url]: https://reactrouter.com/en/main
[shadcn/ui]: https://img.shields.io/badge/shadcn/ui-000000?style=for-the-badge&logoColor=white
[shadcn/ui-url]: https://ui.shadcn.com/
[Supabase]: https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white
[Supabase-url]: https://supabase.com/
