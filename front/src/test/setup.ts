import '@testing-library/jest-dom/vitest'

// Polyfill ResizeObserver for Radix UI components (Slider, etc.)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
