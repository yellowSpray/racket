import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    /*
     * `supabaseClient.ts` appelle `createClient` a l'import. Sans ces deux
     * variables il leve « supabaseUrl is required », et tout fichier de test
     * qui atteint ce module, meme indirectement, echoue avant son premier
     * test. Deux fichiers etaient dans ce cas et n'avaient jamais tourne.
     *
     * Ces valeurs ne servent qu'a construire le client. Aucun test ne doit
     * atteindre le reseau : ceux qui interrogent la base remplacent le module
     * par un faux.
     */
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'cle-de-test-sans-valeur',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
