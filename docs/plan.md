# Revue de Code -- Event-Fest

**Date :** 2026-02-28
**Derniere mise a jour :** 2026-03-06
**Auteur :** Revue automatisee via Claude Code
**Sources :** `docs/prd.md`, `docs/architecture.md`, code source existant

---

## 0. Changelog des corrections appliquees

| Date | Action | Fichiers modifies |
|---|---|---|
| 2026-02-28 | **P1.3** Fix UserSidebar liens `/admin` → `/user` | `UserSidebar.tsx` |
| 2026-02-28 | **Scripts SQL** Ajout `email` a profiles, table `event_players`, RLS event_players | `01_types_and_tables.sql`, `03_rls_policies.sql` |
| 2026-02-28 | **P1.4** Isolation multi-club : `club_id` sur events, `get_user_club_id()`, `is_superadmin()`, refonte RLS | `01_types_and_tables.sql`, `02_functions_and_triggers.sql`, `03_rls_policies.sql`, `04_migration_multi_club.sql` |
| 2026-02-28 | **P1.4** Frontend multi-club : fix types, EventDialog, AdminSidebar, useAdminPlayers | `auth.ts`, `event.ts`, `EventDialog.tsx`, `AdminSidebar.tsx`, `useAdminPlayers.tsx` |
| 2026-02-28 | **P2.7** Nettoyage 25 `console.log/trace/debug` | `EditPlayers.tsx`, `useAdminPlayers.tsx`, `Login.tsx` |
| 2026-02-28 | **P2.6** Creation `.env.example` | `front/.env.example` |
| 2026-02-28 → 2026-03-03 | **P2.1-2.8** Fondations archi toutes completees | Voir section P2 |
| 2026-02-28 → 2026-03-03 | **P3.1-3.4** Settings UI complete (scoring, promo, group sizes, courts) | `components/admin/settings/`, `hooks/`, `lib/schemas/` |
| 2026-02-28 → 2026-03-03 | **P3.7 (partiel)** matchScheduler.ts implemente | `lib/matchScheduler.ts` |
| 2026-02-28 → 2026-03-03 | **P3.8 (partiel)** Grille match schedule admin (read-only) | `components/admin/matches/` |
| 2026-02-28 → 2026-03-03 | **Wizard** Wizard evenement 3 etapes avec DnD groupes | `components/admin/settings/wizard/` |
| 2026-03-04 | **P3.5** rankingEngine.ts implemente (TDD) : `getPointsForScore`, `calculateGroupStandings`, bareme par score | `lib/rankingEngine.ts`, `lib/rankingEngine.test.ts` |
| 2026-03-04 | **P3.8** Saisie resultats match complete : selects score (0-3 + ABS), auto-disable ABS, toggle score/points | `MatchCell.tsx`, `Match.tsx`, `DrawPage.tsx` |
| 2026-03-04 | **FR8 refacto** Scoring refonte : champs plats → bareme `ScorePointsEntry[]` (score_points jsonb) | `types/settings.ts`, `schemas/scoring.schema.ts`, `ScoringRulesCard.tsx`, `useClubConfig.tsx`, `DrawTable.tsx`, `01_types_and_tables.sql` |
| 2026-03-04 | **UI Settings** Redesign cards : icones neutres, slider GroupSize, badges couleur PromotionRules, boutons outline | `GroupSizeCard.tsx`, `PromotionRulesCard.tsx`, `ScoringRulesCard.tsx`, `slider.tsx` |
| 2026-03-04 | **DrawTable** Toggle score/points, affichage ABS ambre, separation date/score | `DrawTable.tsx`, `DrawPage.tsx` |
| 2026-03-05 | **Vue liste matchs** Nouvelle vue liste par jour/box avec toggle grille/liste, restrictions joueurs, saisie scores inline | `MatchListView.tsx`, `Match.tsx` |
| 2026-03-05 | **MatchCell refacto** Layout single-line, noms complets, largeurs egales flex-1 | `MatchCell.tsx` |
| 2026-03-05 | **MatchScheduleGrid** Suppression bordure/padding externe, date label dans TableHeader | `MatchScheduleGrid.tsx` |
| 2026-03-05 | **DrawTable** Scores orientes (perspective joueur ligne), hover ambre sur absences, bordures uniformes gray-300 | `DrawTable.tsx` |
| 2026-03-05 | **Export PDF** Export des tableaux en PDF (html2canvas-pro + jsPDF), 1 tableau/page, A4 paysage, haute resolution | `exportPdf.ts`, `DrawPage.tsx` |
| 2026-03-05 | **UI DrawPage** Suppression bouton "Gerer les groupes", toggle points icon-only (Star/Hash), bouton Export PDF | `DrawPage.tsx` |
| 2026-03-05 | **P3.6** promotionEngine.ts implemente (TDD) : `applyPromotions`, promoted/relegated configurables | `lib/promotionEngine.ts`, `lib/promotionEngine.test.ts`, `types/draw.ts` |
| 2026-03-05 | **Elo Engine** eloEngine.ts implemente (TDD) : calcul Elo pour mise a jour power_ranking | `lib/eloEngine.ts`, `lib/eloEngine.test.ts` |
| 2026-03-05 | **Wizard prev box** Mode wizard generation groupes depuis classements box precedent | `components/admin/settings/wizard/PreviousBoxPreview.tsx`, `lib/buildProposedGroups.ts` |
| 2026-03-05 | **Match scheduler refacto** Restructuration en group rounds avec date mapping | `lib/matchScheduler.ts` |
| 2026-03-05 | **UI Event** Bouton creation evenement sous la table des evenements | `EventSelector.tsx` |
| 2026-03-06 | **Code review fixes** Correction warnings hooks, extraction PlayerActions, separation statut joueur/paiement | `PlayerActions.tsx`, `useAdminPlayers.tsx`, hooks divers |
| 2026-03-06 | **Error handling** Centralisation gestion erreurs hooks via `handleHookError.ts` + useMemo MatchScheduleGrid | `lib/handleHookError.ts`, `MatchScheduleGrid.tsx` |

---

## 1. Resume de l'avancement global

### Estimation par domaine

| Domaine | Avancement MVP | Commentaire |
|---------|:-:|---|
| Authentification & Roles (FR34-FR36) | 90% | Fonctionnel. Manque lazy loading (fait), ErrorBoundary (fait). Quasi complet |
| Gestion des joueurs (FR1-FR7) | 45% | CRUD admin OK. Separation statut joueur/paiement. Import Excel, disponibilites UI, inscription joueur absents |
| Parametres & Configuration (FR8-FR11) | 90% | Scoring (bareme par score), promo, group sizes, courts. Redesign UI complet. Manque creneaux horaires par terrain |
| Moteur de scoring/ranking (FR16-FR17) | 80% | `rankingEngine.ts` implemente : `getPointsForScore`, `calculateGroupStandings`, bareme par score, tiebreakers. Manque tiebreakers avances |
| Moteur de promotion (FR18) | 80% | `promotionEngine.ts` implemente (TDD) : `applyPromotions`, promoted/relegated configurables. Manque integration dans le workflow |
| Moteur Elo | 80% | `eloEngine.ts` implemente (TDD) : calcul Elo pour mise a jour power_ranking. Manque integration dans le workflow |
| Scheduler (FR24-FR28) | 50% | `matchScheduler.ts` restructure (group rounds, date mapping). Manque detection/resolution conflits, ajustement manuel |
| Match management (FR23) | 90% | Saisie scores via selects (0-3 + ABS), auto-disable ABS, toggle score/points dans DrawTable. Vue liste par jour/box. Export PDF tableaux. Manque saisie depuis DrawTable directement |
| Workflow "One-click box" (FR15, FR18-FR22) | 45% | Distribution groupes OK + wizard + match scheduling + ranking + promo engine + wizard prev box. Manque preview/publish |
| Experience joueur (FR29-FR33) | 5% | UserPage existe (shell). Sidebar avec liens. Aucune page de contenu, aucune route enfant |
| Infrastructure (CI/CD, tests, monitoring) | 40% | Tests OK (47 fichiers, 658 tests, vitest). Pas de CI/CD, Sentry, Vercel |

**Avancement global estime : ~62% du MVP Phase 1**

---

## 2. Analyse de couverture PRD (FR par FR)

### 2.1 Gestion des joueurs (FR1-FR7)

| FR | Description | Statut | Detail |
|---|---|:-:|---|
| FR1 | Vue roster complet (status, level, membership) | FAIT | `ListPlayerPage.tsx` + `useAdminPlayers.tsx` + TanStack Table |
| FR2 | Ajout, edition, desactivation joueurs | PARTIEL | Ajout/edition via `EditPlayers.tsx` + `upsert_player()`. Pas de desactivation UI dediee |
| FR3 | Import Excel bulk | NON FAIT | Aucun code d'import. Pas d'Edge Function `import-players` |
| FR4 | Assignation level/ranking | FAIT | Champ `power_ranking` dans le formulaire joueur |
| FR5 | Gestion disponibilites joueurs | PARTIEL | Tables `schedule` et `absences` en DB. `useMatches` lit les contraintes. UI absences = placeholder |
| FR6 | Inscription/desinscription joueur a un box | NON FAIT | Pas d'UI joueur. Table `event_players` existe en DB |
| FR7 | Joueur met a jour ses disponibilites | NON FAIT | Pas d'interface joueur |

### 2.2 Configuration club & plateforme (FR8-FR14)

| FR | Description | Statut | Detail |
|---|---|:-:|---|
| FR8 | Regles de scoring configurables | FAIT | Refonte bareme par score (`ScorePointsEntry[]`). `ScoringRulesCard.tsx` tableau editable + `scoringRulesSchema` + `score_points` jsonb + `useClubConfig` |
| FR9 | Regles promo/relegation configurables | FAIT | `PromotionRulesCard.tsx` + `promotionRulesSchema` + table `promotion_rules` + `useClubConfig` |
| FR10 | Tailles de tableaux configurables | FAIT | `GroupSizeCard.tsx` + `default_max_players_per_group` dans clubs |
| FR11 | Nombre de terrains + creneaux | PARTIEL | `CourtsManager.tsx` + `useEventCourts` + table `event_courts`. Available_from/to par court. Manque gestion fine des creneaux |
| FR12 | Vue superadmin multi-club | NON FAIT | L'UI n'a pas de vue superadmin dediee |
| FR13 | Intervention superadmin sur donnees | NON FAIT | |
| FR14 | Auto-inscription clubs | NON FAIT | |

### 2.3 Cycle de vie des boxes (FR15-FR23)

| FR | Description | Statut | Detail |
|---|---|:-:|---|
| FR15 | Creation box one-click | PARTIEL | Wizard 3 etapes (config, groupes DnD, matchs). Manque ranking + promo/releg auto dans le flow |
| FR16 | Calcul classements finaux | FAIT | `rankingEngine.ts` : `calculateGroupStandings`, `getPointsForScore`, bareme par score (3-0, 3-1, 3-2, ABS) |
| FR17 | Resolution tiebreakers | PARTIEL | Tri par points, puis victoires, puis sets. Tiebreakers avances (confrontation directe) non implementes |
| FR18 | Promo/relegation automatique | PARTIEL | `promotionEngine.ts` implemente (TDD) : `applyPromotions`, promoted/relegated configurables. Pas encore integre dans le workflow wizard |
| FR19 | Distribution joueurs en groupes | FAIT | `groupDistribution.ts` + `groupDistributionCalculator.ts` + wizard DnD + mode generation depuis box precedent (`buildProposedGroups.ts`) |
| FR20 | Placement nouvelles inscriptions | PARTIEL | `suggestGroupForPlayer()` existe mais pas connecte au workflow |
| FR21 | Preview avant publication | NON FAIT | |
| FR22 | Publication box | NON FAIT | |
| FR23 | Saisie resultats match | FAIT | Saisie scores via selects (0-3 + ABS) dans `MatchCell`. Auto-disable ABS. Toggle score/points dans `DrawTable`. Vue liste par jour/box (`MatchListView`). Export PDF tableaux (`exportPdf.ts`). Scores orientes par joueur. Sauvegarde via `updateMatchResults` |

### 2.4 Moteur de scheduling (FR24-FR28)

| FR | Description | Statut | Detail |
|---|---|:-:|---|
| FR24 | Generation schedule (dispo x terrains) | PARTIEL | `matchScheduler.ts` genere les pairings round-robin, calcule les slots, assigne les matchs aux creneaux avec contraintes joueurs. `useMatches` orchestre le pipeline |
| FR25 | Detection conflits | NON FAIT | Pas de detection/affichage des conflits |
| FR26 | Suggestions resolution conflits | NON FAIT | |
| FR27 | Ajustement manuel schedule | NON FAIT | Grille read-only, pas d'edition |
| FR28 | Calcul duree box | PARTIEL | `matchScheduler.ts` calcule dates et slots. Pas d'affichage de la duree estimee |

### 2.5 Experience joueur (FR29-FR33)

| FR | Description | Statut | Detail |
|---|---|:-:|---|
| FR29 | Vue tableau avec membres et classement | NON FAIT | UserPage = shell vide, sidebar pointe vers routes non enregistrees |
| FR30 | Vue schedule personnel | NON FAIT | |
| FR31 | Suivi ranking/progression | NON FAIT | |
| FR32 | Vue "qui joue ce soir" | NON FAIT | |
| FR33 | Historique matchs | NON FAIT | |

### 2.6 Auth & Roles (FR34-FR36)

| FR | Description | Statut | Detail |
|---|---|:-:|---|
| FR34 | Inscription/connexion securisee | FAIT | Login + Register + Supabase Auth |
| FR35 | RBAC (player, admin, superadmin) | FAIT | `ProtectedRoute` + RLS policies + lazy loading routes |
| FR36 | Admin gere les comptes joueurs | PARTIEL | Admin peut creer/editer des joueurs mais pas via comptes auth |

### 2.7 Donnees & Vie privee (FR37-FR38)

| FR | Description | Statut | Detail |
|---|---|:-:|---|
| FR37 | GDPR compliance | NON FAIT | Pas de mecanisme de soft-delete/anonymisation |
| FR38 | Droit d'acces/suppression donnees | NON FAIT | |

### Tableau recapitulatif

| Statut | Nombre de FRs | Pourcentage |
|--------|:-:|:-:|
| FAIT | 13 | 34% |
| PARTIEL | 10 | 26% |
| NON FAIT | 15 | 40% |
| **Total** | **38** | |

---

## 3. Conformite Architecture

### 3.1 Elements conformes

| Element Architecture | Statut | Fichiers |
|---|:-:|---|
| React 19 + TypeScript + Vite | OK | Stack en place |
| Tailwind CSS 4 + shadcn/ui | OK | Composants UI corrects |
| React Context (Auth, Event, Players) | OK | 3 contexts en place |
| React Router v7 + ProtectedRoute | OK | `routes/index.tsx` |
| Supabase JS client depuis hooks | OK | `useAdminPlayers`, `useGroups`, `useClub`, `useMatches`, `useEventCourts`, `useClubConfig` |
| RLS sur toutes les tables | OK | Tables avec RLS activee |
| Organisation par type (components/pages/hooks/lib/types) | OK | Structure respectee |
| Conventions nommage | OK | Globalement respecte |
| `@/` import alias | OK | Utilise partout |
| Vitest + TDD | OK | 47 fichiers test, 658 tests, vitest configure, mocks Supabase |
| Validation Zod | OK | 7 schemas (scoring, promo, court, player, register, clubConfig, event) |
| Error handling standardise | OK | `lib/errors.ts` + `useErrorHandler` + `ErrorBoundary` + `handleHookError.ts` (centralise) |
| Lazy loading routes | OK | React.lazy + Suspense dans `routes/index.tsx` |

### 3.2 Divergences structurelles restantes

| Element Architecture | Attendu | Reel | Impact |
|---|---|---|---|
| `hooks/useMatchNightRealtime.tsx` | Hook temps reel | N'existe pas | Pas de temps reel |
| `types/errors.ts` | Types erreurs separes | N'existe pas (dans `lib/errors.ts`) | Divergence mineure |
| `types/scheduling.ts` | Types scheduling | N'existe pas (dans `matchScheduler.ts`) | Divergence mineure |
| `.github/workflows/ci.yml` | CI/CD | N'existe pas | Pas de CI |
| `vercel.json` | Config deploy | N'existe pas | Deployment pas configure |
| `back/supabase/functions/` | Edge Functions | N'existe pas | Pas d'operations atomiques |
| `back/supabase/migrations/` | Migrations | N'existe pas | Pas de migrations formalisees |
| `back/supabase/seed.sql` | Donnees de test | N'existe pas | |
| `back/supabase/config.toml` | Config Supabase local | N'existe pas | Pas d'env dev local Supabase |
| Sentry | Monitoring erreurs | N'existe pas | Pas de monitoring production |

### 3.3 Decisions architecturales non implementees

| Decision | Priorite Architecture | Statut |
|---|---|---|
| Edge Functions (generate-box, import-players) | Critique | NON FAIT |
| Real-time subscriptions | Important | NON FAIT |
| Sentry monitoring | Important | NON FAIT |

---

## 4. Problemes de qualite de code

### 4.1 Bugs restants

| # | Severite | Fichier | Description |
|---|---|---|---|
| B5 | MAJEUR | `EditPlayers.tsx` | TODO non resolu : le StepperTrigger declenche le submit du formulaire |
| B6 | MINEUR | `EventContext.tsx` | Restauration depuis localStorage utilise `events` potentiellement stale |

### 4.2 TODOs non resolus

| Fichier | Contenu |
|---|---|
| ~~`EventContext.tsx`~~ | ~~`//TODO`~~ -- **RESOLU** : nettoyage eslint-disable |
| ~~`AuthPage.tsx`~~ | ~~`//TODO changer la taille de la div`~~ -- **RESOLU** |
| ~~`DrawTable.tsx`~~ | ~~`//TODO: case de match`~~ -- **RESOLU** : cellules affichent date/heure/score/points |
| ~~`EditPlayers.tsx`~~ | ~~`//TODO bug to fix`~~ -- **RESOLU** : extraction PlayerActions |
| `Match.tsx` | `// TODO: gérer le choix du gagnant pour WO` |

### 4.3 Dette technique

| # | Type | Description |
|---|---|---|
| AP2 | eslint-disable | 5 directives `eslint-disable` (3 contexts + EventContext exhaustive-deps + PlayerTable unused-vars) |
| AP5 | Supabase direct dans composant | `Register.tsx`, `UserSidebar.tsx` appellent Supabase directement |
| ~~AP6~~ | ~~Hardcoded values~~ | **RESOLU** : `DrawTable.tsx` utilise `group.max_players` dynamique |
| AP7 | Typage `any` implicite | `power_ranking` type `string` represente un `number` |
| AP8 | console.log residuels | 3 `console.log` dans `useMatches.tsx` (scheduler debug) |

---

## 5. Actions prioritaires

### Priorite 1 -- Bugs bloquants — **FAIT** ✅

Tous les bugs bloquants P1 (1.1 a 1.4) sont resolus.

### Priorite 2 -- Fondations architecture — **FAIT** ✅

Tous les items P2 (2.1 a 2.8) sont resolus :
- ✅ Vitest setup + 30 tests
- ✅ Error handling (AppError, ValidationError, useErrorHandler)
- ✅ ErrorBoundary + wrapping main.tsx
- ✅ Lazy loading routes
- ✅ SQL deplace vers `back/supabase/sql/`
- ✅ `.env.example`
- ✅ Console.log nettoyes
- ✅ Validation Zod (7 schemas)

### Priorite 3 -- Features MVP (par ordre logique)

| # | Action | FRs couvertes | Statut | Effort restant |
|---|---|---|---|---|
| ~~3.1~~ | ~~Settings : UI scoring rules~~ | ~~FR8~~ | **FAIT** ✅ | — |
| ~~3.2~~ | ~~Settings : UI promo/relegation~~ | ~~FR9~~ | **FAIT** ✅ | — |
| ~~3.3~~ | ~~Settings : UI tailles tableaux~~ | ~~FR10~~ | **FAIT** ✅ | — |
| ~~3.4~~ | ~~Settings : UI courts/creneaux~~ | ~~FR11~~ | **FAIT** ✅ | — |
| ~~3.5~~ | ~~`lib/rankingEngine.ts` avec TDD~~ | ~~FR16-17~~ | **FAIT** ✅ | — |
| ~~3.6~~ | ~~`lib/promotionEngine.ts` avec TDD~~ | ~~FR18~~ | **FAIT** ✅ | — |
| 3.6b | `lib/eloEngine.ts` integration dans workflow | — | PARTIEL (engine fait, integration non) | 1j |
| 3.7 | ~~`lib/schedulingEngine.ts`~~ → `matchScheduler.ts` ameliore | FR24-28 | PARTIEL | 1-2j (conflits, ajustement manuel) |
| ~~3.8~~ | ~~Page Match admin (saisie resultats)~~ | ~~FR23~~ | **FAIT** ✅ | — |
| 3.9 | Workflow one-click box (preview + publish) | FR15, FR19-22 | PARTIEL (wizard + promo engine + prev box mode) | 1-2j (integrer promo dans wizard + preview + publish) |
| 3.10 | Edge Function `generate-box` (atomicite) | FR15, NFR18 | NON FAIT | 2-3j |
| 3.11 | Import Excel + Edge Function `import-players` | FR3 | NON FAIT | 2-3j |
| 3.12 | Pages joueur (dashboard, schedule, rankings) | FR29-33 | NON FAIT | 3-5j |
| 3.13 | Routes joueur dans `routes/index.tsx` | FR29-33 | NON FAIT | 1h |

### Priorite 4 -- Infrastructure (avant mise en production)

| # | Action | Statut | Effort |
|---|---|---|---|
| 4.1 | GitHub Actions CI (`ci.yml` : lint + test) | NON FAIT | 2h |
| 4.2 | Connexion Vercel + `vercel.json` | NON FAIT | 1h |
| 4.3 | Integration Sentry (free tier) | NON FAIT | 2h |
| 4.4 | Setup Supabase CLI local dev | NON FAIT | 2h |

### Priorite 5 -- Dette technique (apres MVP)

| # | Action |
|---|---|
| 5.1 | Uniformiser la langue (tout en francais ou tout en anglais) |
| 5.2 | Corriger les eslint-disable et les stale closures |
| 5.3 | Ajouter le hook `useMatchNightRealtime.tsx` pour le temps reel |
| 5.4 | GDPR : mecanismes d'acces et suppression des donnees personnelles |

---

## 6. Prochaines etapes recommandees

L'ordre logique pour avancer vers le MVP :

1. ~~**rankingEngine.ts (TDD)**~~ — **FAIT** ✅
2. ~~**promotionEngine.ts (TDD)**~~ — **FAIT** ✅
3. ~~**Saisie resultats matchs**~~ — **FAIT** ✅
4. ~~**eloEngine.ts (TDD)**~~ — **FAIT** ✅ (engine). Integration dans le workflow a faire.
5. **Workflow one-click box complet** — Integrer promo + Elo + preview + publish dans le wizard.
6. **Pages joueur** — Dashboard, schedule, classement. Valeur visible pour les joueurs.
7. **Import Excel** — Facilite l'onboarding de nouveaux clubs.
8. **Infrastructure** — CI/CD + Vercel avant le pilote.

---

## Estimation totale pour atteindre le MVP Phase 1

| Categorie | Effort estime | Statut |
|---|---|---|
| Bugs bloquants (P1) | ~~1-2 jours~~ | **FAIT** ✅ |
| Fondations archi (P2) | ~~1-2 jours~~ | **FAIT** ✅ |
| Features MVP restantes (P3) | 8-13 jours | A faire (3.1-3.6, 3.8 termines, reste 3.6b, 3.7, 3.9-3.13) |
| Infrastructure (P4) | 1 jour | A faire |
| **Total restant** | **~9-14 jours de dev** | |
