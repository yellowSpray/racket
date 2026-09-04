import '@testing-library/jest-dom/vitest'

/*
 * Polyfill de ResizeObserver, absent de jsdom et attendu par les composants
 * Radix (Slider, ScrollArea). `globalThis` plutôt que `global`, qui n'existe
 * que sous Node et n'est pas typé ici.
 */
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver
