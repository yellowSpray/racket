import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { columns } from '../PlayerColumns'
import type { PlayerType } from '@/types/player'

// Mock EditPlayers to avoid importing a complex component
vi.mock('@/components/admin/players/EditPlayers', () => ({
  EditPlayers: ({ mode }: { mode: string }) => <button data-testid="edit-btn">{mode}</button>,
}))

const makePlayer = (overrides: Partial<PlayerType> = {}): PlayerType => ({
  id: 'p1',
  first_name: 'Alice',
  last_name: 'Martin',
  email: 'alice@test.com',
  phone: '0612345678',
  arrival: '19:00',
  departure: '22:00',
  unavailable: [],
  status: ['active', 'member'],
  power_ranking: '5',
  ...overrides,
})

describe('PlayerColumns', () => {
  const mockUpdatePlayer = vi.fn()

  it('returns an array of column definitions', () => {
    const cols = columns(mockUpdatePlayer)
    expect(Array.isArray(cols)).toBe(true)
    expect(cols.length).toBeGreaterThan(0)
  })

  it('includes expected column headers', () => {
    const cols = columns(mockUpdatePlayer)
    const headers = cols.map(c => c.header)
    expect(headers).toContain('Boxes')
    expect(headers).toContain('Prénom Nom')
    expect(headers).toContain('Téléphone')
    expect(headers).toContain('Email')
    expect(headers).toContain('Arrivée')
    expect(headers).toContain('Départ')
    expect(headers).toContain('Absence')
    expect(headers).toContain('Status')
    expect(headers).toContain('Force')
    expect(headers).toContain('Modif.')
  })

  it('has a full_name accessor that concatenates first and last name', () => {
    const cols = columns(mockUpdatePlayer)
    const fullNameCol = cols.find(c => c.header === 'Prénom Nom')
    // accessorFn should exist
    expect(fullNameCol).toBeDefined()
    if (fullNameCol && 'accessorFn' in fullNameCol && fullNameCol.accessorFn) {
      const result = fullNameCol.accessorFn(makePlayer(), 0)
      expect(result).toBe('Alice Martin')
    }
  })

  it('renders unavailable dates as badges in absence column', () => {
    const cols = columns(mockUpdatePlayer)
    const absenceCol = cols.find(c => c.header === 'Absence')
    expect(absenceCol).toBeDefined()
    if (absenceCol && 'cell' in absenceCol && absenceCol.cell) {
      const CellComponent = absenceCol.cell as any
      const mockRow = {
        original: makePlayer({ unavailable: ['2026-03-04', '2026-03-05'] }),
        getValue: vi.fn(),
      }
      render(<CellComponent row={mockRow} />)
      expect(screen.getByText('2026-03-04')).toBeInTheDocument()
      expect(screen.getByText('2026-03-05')).toBeInTheDocument()
    }
  })

  it('renders status badges in status column', () => {
    const cols = columns(mockUpdatePlayer)
    const statusCol = cols.find(c => c.header === 'Status')
    expect(statusCol).toBeDefined()
    if (statusCol && 'cell' in statusCol && statusCol.cell) {
      const CellComponent = statusCol.cell as any
      const mockRow = {
        original: makePlayer({ status: ['active', 'member'] }),
        getValue: vi.fn(),
      }
      render(<CellComponent row={mockRow} />)
      expect(screen.getByText('active')).toBeInTheDocument()
      expect(screen.getByText('member')).toBeInTheDocument()
    }
  })

  it('renders the actions column with EditPlayers', () => {
    const cols = columns(mockUpdatePlayer)
    const actionsCol = cols.find(c => c.header === 'Modif.')
    expect(actionsCol).toBeDefined()
    if (actionsCol && 'cell' in actionsCol && actionsCol.cell) {
      const CellComponent = actionsCol.cell as any
      const mockRow = {
        original: makePlayer(),
        getValue: vi.fn(),
      }
      render(<CellComponent row={mockRow} />)
      expect(screen.getByTestId('edit-btn')).toBeInTheDocument()
    }
  })

  it('has 10 columns total', () => {
    const cols = columns(mockUpdatePlayer)
    expect(cols.length).toBe(10)
  })
})
