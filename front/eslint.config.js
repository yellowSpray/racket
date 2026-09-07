import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      /*
       * Le prefixe `_` dit « je recois ce nom et je ne m'en sers pas ». C'est
       * une convention deliberee, employee la ou la signature est imposee de
       * l'exterieur : un composant qui recoit une propriete dont il n'a pas
       * besoin, un faux de test qui doit accepter les memes arguments que la
       * vraie fonction. Sans ces motifs, ESLint signale huit endroits ou le
       * code dit deja ce qu'il fait.
       *
       * `ignoreRestSiblings` couvre l'autre idiome, celui qui retire une cle
       * d'un objet :
       *
       *     const { first_name, ...rest } = joueur
       *
       * `first_name` n'est la que pour etre exclue de `rest`. La signaler comme
       * inutilisee revient a interdire la seule facon lisible d'ecrire ca.
       */
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
    },
  },
  {
    /*
     * `components/ui` contient les composants shadcn, repris tels quels et
     * jamais edites a la main : les remplacer par une version plus recente doit
     * rester une commande, pas une reprise de nos corrections.
     *
     * Trois d'entre eux exportent une variante ou un utilitaire a cote du
     * composant, ce que `react-refresh/only-export-components` interdit. Comme
     * on s'interdit de les corriger, signaler l'erreur n'aide personne : elle
     * reste la, et on apprend a ne plus lire la sortie d'ESLint. On coupe la
     * regle ici, et seulement ici.
     */
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
