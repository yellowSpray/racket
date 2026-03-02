import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ErrorBoundary } from '../ErrorBoundary'

// Component that throws on demand
function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>Child rendered</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error for expected errors in tests
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Hello World</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('renders default error UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument()
    expect(screen.getByText(/Veuillez réessayer/)).toBeInTheDocument()
  })

  it('renders the retry button in the default error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Custom fallback')).toBeInTheDocument()
    expect(screen.queryByText('Une erreur est survenue')).not.toBeInTheDocument()
  })

  it('resets error state when retry button is clicked', () => {
    let shouldThrow = true
    function ConditionalThrow() {
      if (shouldThrow) throw new Error('Test error')
      return <div>Recovered</div>
    }

    render(
      <ErrorBoundary>
        <ConditionalThrow />
      </ErrorBoundary>
    )
    expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument()

    // Stop throwing before retry
    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))

    expect(screen.getByText('Recovered')).toBeInTheDocument()
  })

  it('shows error message in DEV mode', () => {
    // import.meta.env.DEV is true in vitest by default
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('calls console.error via componentDidCatch', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(console.error).toHaveBeenCalled()
  })
})
