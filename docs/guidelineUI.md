# Event Fest — UI Guideline

> Design system et conventions visuelles de l'application Event Fest.

---

## 1. Identite visuelle

### Logo
Logo SVG personnalise representant une forme de badminton/squash stylisee. Utilise `currentColor` pour s'adapter au theme.

### Typographie

| Usage | Police | Poids | Taille |
|-------|--------|-------|--------|
| Titres de page (h2) | Nunito | 700 (bold) | `text-2xl` |
| Sous-titres (h3) | Nunito | 600 (semibold) | `text-lg` |
| Titres de carte | Nunito | 600 (semibold) | par defaut |
| Titres de dialog | Nunito | 600 (semibold) | `text-lg` |
| Labels | Inter | 500 (medium) | `text-sm` |
| Texte courant | Inter | 400 (regular) | `text-sm` |
| Texte secondaire | Inter | 400 | `text-xs` |

- Police titres : **Nunito** (sans-serif, Google Fonts)
- Police texte : **Inter** (sans-serif, Google Fonts)
- Police serif : Montaga (reserve)
- Police mono : monospace systeme

### Palette de couleurs

#### Palette

| Token | Valeur | Usage |
|-------|--------|-------|
| `--primary` | `#66dea6` | Boutons principaux, succes, actif |
| `--primary-hover` | `#52c890` | Hover des boutons principaux |
| `--foreground` | `#171717` | Texte principal |
| `--secondary` / `--muted` | `#9bb0a4` | Texte secondaire, fonds muted, inactif |
| `--background` | `rgb(252, 252, 252)` | Fond de page |
| `--border` | `rgb(212, 212, 212)` | Bordures |

#### Couleurs semantiques (statuts)

| Couleur | Code | Usage |
|---------|------|-------|
| Vert (primary) | `#66dea6` | Actif, paye, disponible |
| Rouge | `#ef4444` | Impaye, erreur, suppression |
| Ambre | `#f59e0b` | Visiteur, groupe plein, avertissement |
| Muted | `#9bb0a4` | Inactif, defaut, desactive |
| Bleu | `#3b82f6` | Selection, survol, focus, liens |

### Rayons de bordure

| Token | Valeur |
|-------|--------|
| `--radius` | `0.5rem` (8px) |
| `--radius-sm` | `0.25rem` (4px) |
| `--radius-lg` | `0.5rem` (8px) |
| `--radius-xl` | `0.75rem` (12px) |

### Ombres

L'application utilise des ombres subtiles :
- `shadow-sm` : composants au repos (cartes)
- `shadow-md` : elevation moyenne
- `shadow-lg` : survol de cartes, dialogs

---

## 2. Layout

### Structure generale

```
+------------------------------------------+
|              Header (h-16)               |
+--------+---------------------------------+
|        |                                 |
| Side-  |         Contenu                 |
| bar    |         (p-4)                   |
| (2col) |         (10col)                 |
|        |                                 |
+--------+---------------------------------+
|              Footer                      |
+------------------------------------------+
```

- **Grille** : 12 colonnes (`grid grid-cols-12`)
- **Sidebar** : 2 colonnes (`col-span-2`)
- **Contenu** : 10 colonnes (`col-span-10`) avec `p-4`
- **Header** : hauteur fixe `h-16`, bordure basse

### Espacement

| Contexte | Valeur |
|----------|--------|
| Padding de page | `p-4` |
| Padding de carte | `p-6` |
| Gap entre elements | `gap-2` (serre), `gap-4` (standard), `gap-6` (large) |
| Marge entre sections | `mb-6` |
| Padding responsive | `p-4 md:p-6` |

### Grilles de contenu

```
Formulaires :     grid grid-cols-2 gap-4
Groupes/cartes :  grid grid-cols-1 lg:grid-cols-2 gap-6
Toggles :         grid grid-cols-3
```

---

## 3. Composants

### Header

- Hauteur : `h-16`
- Bordure : `border-b-1 border-b-border`
- Layout : `flex items-center justify-between px-4 md:px-6`
- Gauche : Logo + nom de l'app (couleur primary)
- Droite : Toggle dark mode (Moon/Sun), Notifications (Bell + pastille rouge), Menu utilisateur

### Sidebar

- Bordure droite : `border-r border-gray-200`
- Padding : `p-6`
- Items de navigation : `flex items-center gap-3 px-3 py-2.5 rounded-lg`
- Etat actif : `bg-primary font-[600]`
- Etat survol : `hover:bg-gray-100`
- Icones : taille `16px` (`h-4 w-4`)
- Separateur avant Settings : `border-t border-gray-300 mt-5`
- Pied : Avatar + nom + role

**Items de navigation :**

| Icone | Label |
|-------|-------|
| `Home` | Accueil |
| `SquarePen` | Tableaux |
| `FileText` | Matchs |
| `Users` | Joueurs |
| `Settings` | Parametres |

### Cartes (Card)

```
+----------------------------------+
|  CardHeader                      |
|    CardTitle (semibold)          |
|    CardDescription (gris)       |
+----------------------------------+
|  CardContent                     |
|    Contenu principal             |
+----------------------------------+
|  CardFooter (optionnel)          |
+----------------------------------+
```

- Bordure : `border` gris clair
- Rayon : `rounded-xl`
- Ombre : `shadow-sm`
- Padding vertical : `py-6`, contenu `px-6`
- Etat survol (si cliquable) : `hover:shadow-lg hover:border-blue-400`
- Etat selectionne : `border-blue-500 border-2`

### Boutons (Button)

| Variante | Style | Usage |
|----------|-------|-------|
| `default` | Fond vert primary (`#66dea6`), hover `#52c890`, texte sombre, transition `ease-out 0.2s` | Action principale |
| `outline` | Bordure, fond blanc | Action secondaire, annuler |
| `ghost` | Transparent, survol gris | Icones, actions discretes |
| `destructive` | Fond rouge, texte blanc | Suppression |
| `link` | Texte primary souligne | Liens textuels |

| Taille | Hauteur | Usage |
|--------|---------|-------|
| `default` | `h-9` | Standard |
| `sm` | `h-8` | Dans les dialogs, tableaux |
| `lg` | `h-10` | Actions principales mises en avant |
| `icon` | `36x36px` | Bouton icone seul |

### Badges

Forme pilule (`rounded-full`), taille `text-xs`, padding `px-2 py-0.5`.

| Variante | Fond | Texte | Usage |
|----------|------|-------|-------|
| `default` | `gray-300` | `gray-700` | Defaut |
| `member` | primary (vert) | primary-foreground | Membre du club |
| `visitor` | `amber-500` | blanc | Visiteur |
| `active` | transparent, bordure verte | `green-500` | Joueur actif |
| `inactive` | transparent, bordure grise | `gray-500` | Joueur inactif |
| `paid` | `green-500` | blanc | Paiement effectue |
| `unpaid` | `red-500` | blanc | Paiement en attente |

### Dialogs / Modals

- Overlay : `bg-black/50`
- Contenu : fond blanc, `rounded-lg`, `border`, `p-6`, `shadow-lg`
- Largeur : `sm:max-w-lg` (standard), jusqu'a `sm:max-w-[900px]` (large)
- Hauteur max : `max-h-[80vh] overflow-y-auto` pour les grands dialogs
- Animation : fade-in + zoom-in a l'ouverture
- Bouton fermer : coin superieur droit, `opacity-70 hover:opacity-100`

**Structure :**
```
DialogHeader
  DialogTitle (text-lg, semibold)
  DialogDescription (text-sm, gris)
Corps (gap-4)
DialogFooter
  [Annuler (outline)] [Confirmer (default)]
```

Sur mobile : boutons empiles verticalement (ordre inverse).

### Tableaux (Table)

- Conteneur : `overflow-hidden rounded-md border`
- En-tetes : fond blanc avec bordures
- Cellules : `text-center` pour les donnees numeriques

**Tableau round-robin (matchs) :**

| Zone | Couleur |
|------|---------|
| En-tete groupe | `bg-blue-200` |
| En-tete joueur | `bg-yellow-100` |
| En-tete vide | `bg-gray-200` |
| Colonne total | `bg-green-200` |
| Cellule diagonale | `bg-gray-400` |
| Cellule match | fond clair, bordure grise |

### Formulaires

- Layout : grille 2 colonnes (`grid grid-cols-2 gap-4`)
- Labels : `text-sm font-medium`
- Inputs : hauteur standard, bordure, coins arrondis
- Description : texte gris sous le label
- Stepper pour les formulaires multi-etapes (3 etapes avec separateurs)
- ToggleGroup pour les choix multiples : grille 3 colonnes

### Alertes

| Variante | Style | Usage |
|----------|-------|-------|
| Default | bordure grise, fond neutre | Information |
| Destructive | bordure rouge, fond rouge leger | Erreur |
| Custom | `bg-blue-50 border-blue-200` | Aide contextuelle |

Structure : icone (gauche) + texte (droite), padding `p-4`, `rounded-lg`.

### Etats vides (Empty State)

```
+- - - - - - - - - - - - - - - -+
|                                |
|       [Icone optionnel]        |
|                                |
|    Titre (text-lg, semibold)   |
|    Description (gray-500)      |
|                                |
|       [Bouton d'action]        |
|                                |
+- - - - - - - - - - - - - - - -+
```

- Bordure : `border-2 border-dashed rounded-lg`
- Padding : `py-12`
- Texte centre

---

## 4. Iconographie

Librairie : **Lucide React**

### Icones de navigation

| Icone | Contexte |
|-------|----------|
| `Home` | Accueil / Dashboard |
| `SquarePen` | Tirages / Tableaux |
| `FileText` | Matchs |
| `Users` | Liste joueurs |
| `Settings` | Parametres |

### Icones d'actions

| Icone | Contexte |
|-------|----------|
| `Plus` | Creer / Ajouter |
| `Ellipsis` | Menu d'actions (3 points) |
| `Sparkles` | Generation automatique |
| `ArrowLeftRight` | Echanger / Swap |
| `UserPlus` | Ajouter un joueur |
| `LogOut` | Deconnexion |
| `Info` | Information |

### Icones de statut

| Icone | Contexte |
|-------|----------|
| `Zap` | Actif |
| `UsersRound` | Membre |
| `Euro` | Paiement |
| `Moon` / `Sun` | Mode sombre / clair |
| `Bell` | Notifications |

### Tailles d'icones

| Contexte | Taille |
|----------|--------|
| Navigation sidebar | `16px` (`h-4 w-4`) |
| Boutons | `14px` (`h-3.5 w-3.5`) |
| Alertes | `12px` (`h-3 w-3`) |
| Badges | `12px` (`h-3 w-3`) |

---

## 5. Interactions

### Survol (Hover)

| Element | Effet |
|---------|-------|
| Boutons | Changement d'opacite fond (`/90`), transition `ease-out` duree `0.2s` |
| Cartes cliquables | `shadow-lg` + `border-blue-400` |
| Items de liste | `bg-blue-50` ou `bg-orange-50` (mode swap) |
| Navigation | `bg-gray-100` |
| Lien | Soulignement |

### Focus

- Ring : couleur primary (`rgb(102, 222, 166)`)
- Epaisseur : `ring-[3px]`
- Toujours visible au clavier

### Etats de selection

| Etat | Style |
|------|-------|
| Selectionne | `border-blue-500 border-2` |
| Source (swap) | `opacity-50` |
| Cible | `border-blue-500 border-2` |
| Desactive | `opacity-50 pointer-events-none` |

### Animations

- **Dialogs** : fade-in/zoom-in a l'ouverture, fade-out/zoom-out a la fermeture
- **Page auth** : slide lateral avec animation spring (`bounce: 0.2`, duree `0.3s`)
- **Transitions** : `transition-colors` sur les elements interactifs

---

## 6. Responsive

### Breakpoints

| Breakpoint | Largeur | Usage |
|------------|---------|-------|
| Mobile | < 640px | Colonnes empilees, padding reduit |
| `sm` | >= 640px | Dialogs centres |
| `md` | >= 768px | Padding elargi (`p-6`) |
| `lg` | >= 1024px | Grilles 2 colonnes |

### Adaptations mobiles

- Grilles : `grid-cols-1` sur mobile, `lg:grid-cols-2` sur desktop
- Sidebar : masquee sur mobile (via Sheet/overlay)
- Dialog footer : boutons empiles verticalement
- Padding : `p-4` mobile, `md:p-6` desktop

---

## 7. Mode sombre

Support via la classe `.dark` sur `<html>`.

- Fond : sombre (variables CSS adaptees)
- Inputs : `dark:bg-input/30`, `dark:border-input`
- Survol : `dark:hover:bg-accent/50`
- Toggle header : icone Moon (clair) / Sun (sombre)

---

## 8. Accessibilite

- Labels de formulaire lies via `htmlFor`
- Attributs `aria-invalid` sur les champs en erreur
- Navigation clavier complete (Tab)
- Focus rings visibles
- HTML semantique : `<button>` pour actions, `<a>` pour navigation
- Composants shadcn/ui accessibles par defaut (Radix UI)
- Contrastes suffisants sur les badges et boutons

---

## 9. Langue

- Interface entierement en **francais**
- Format dates/heures : `fr-FR`
- Labels, placeholders, messages d'erreur en francais

---

*Derniere mise a jour : fevrier 2026*
