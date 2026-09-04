import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { columns } from '../PlayerColumns'
import type { PlayerType } from '@/types/player'

// Mock EditPlayers to avoid importing a complex component
vi.mock('@/components/admin/players/EditPlayers', () => ({
  EditPlayers: ({ mode }: { mode: string }) => <button data-testid="edit-btn">{mode}</button>,
}))

// Mock dropdown-menu
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onSelect }: { children: React.ReactNode, onSelect?: () => void }) => <button onClick={onSelect}>{children}</button>,
}))

// Mock tooltip
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-trigger">{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
}))

const makePlayer = (overrides: Partial<PlayerType> = {}): PlayerType => ({
  id: 'p1',
  first_name: 'Alice',
  last_name: 'Martin',
  full_name: 'Alice Martin',
  email: 'alice@test.com',
  phone: '0612345678',
  arrival: '19:00',
  departure: '22:00',
  unavailable: [],
  status: ['active', 'member'],
  payments: [],
  power_ranking: 5,
  box: '',
  ...overrides,
})

describe('PlayerColumns', () => {
  it('returns an array of column definitions', () => {
    const cols = columns()
    expect(Array.isArray(cols)).toBe(true)
    expect(cols.length).toBeGreaterThan(0)
  })

  it('includes expected column headers', () => {
    const cols = columns()
    const headers = cols.map(c => c.header)
    expect(headers).toContain('Prénom Nom')
    expect(headers).toContain('Téléphone')
    expect(headers).toContain('Email')
    expect(headers).toContain('Arrivée')
    expect(headers).toContain('Départ')
    expect(headers).toContain('Absence')
    expect(headers).toContain('Status')
    expect(headers).toContain('Paiement')
    expect(headers).toContain('Force')
  })

  it('has a full_name accessor that concatenates first and last name', () => {
    const cols = columns()
    const fullNameCol = cols.find(c => c.header === 'Prénom Nom')
    expect(fullNameCol).toBeDefined()
    if (fullNameCol && 'accessorFn' in fullNameCol && fullNameCol.accessorFn) {
      const result = fullNameCol.accessorFn(makePlayer(), 0)
      expect(result).toBe('Alice Martin')
    }
  })

  it('renders unavailable dates as badges in absence column', () => {
    const cols = columns()
    const absenceCol = cols.find(c => c.header === 'Absence')
    expect(absenceCol).toBeDefined()
    if (absenceCol && 'cell' in absenceCol && absenceCol.cell) {
      const CellComponent = absenceCol.cell as unknown as unknown as React.FC<{ row: { original: PlayerType; getValue: ReturnType<typeof vi.fn> } }>
      const mockRow = {
        original: makePlayer({ unavailable: ['2026-03-04', '2026-03-05'] }),
        getValue: vi.fn(),
      }
      render(<CellComponent row={mockRow} />)
      expect(screen.getByText('4 mars')).toBeInTheDocument()
      expect(screen.getByText('5 mars')).toBeInTheDocument()
    }
  })

  it('renders status badges in status column', () => {
    const cols = columns()
    const statusCol = cols.find(c => c.header === 'Status')
    expect(statusCol).toBeDefined()
    if (statusCol && 'cell' in statusCol && statusCol.cell) {
      const CellComponent = statusCol.cell as unknown as React.FC<{ row: { original: PlayerType; getValue: ReturnType<typeof vi.fn> } }>
      const mockRow = {
        original: makePlayer({ status: ['active', 'member'] }),
        getValue: vi.fn(),
      }
      render(<CellComponent row={mockRow} />)
      expect(screen.getByText('active')).toBeInTheDocument()
      expect(screen.getByText('member')).toBeInTheDocument()
    }
  })

  it('has 10 columns total (including select checkbox, excluding actions)', () => {
    const cols = columns()
    expect(cols.length).toBe(10)
  })

  it('renders all payment badges when 2 or fewer', () => {
    const cols = columns()
    const paymentCol = cols.find(c => c.header === 'Paiement')
    expect(paymentCol).toBeDefined()
    if (paymentCol && 'cell' in paymentCol && paymentCol.cell) {
      const CellComponent = paymentCol.cell as unknown as React.FC<{ row: { original: PlayerType; getValue: ReturnType<typeof vi.fn> } }>
      const mockRow = {
        original: makePlayer({
          payments: [
            { round_id: 'r1', round_number: 1, event_name: 'Mixed', status: 'paid' },
            { round_id: 'r2', round_number: 2, event_name: 'Mixed', status: 'unpaid' },
          ],
        }),
        getValue: vi.fn(),
      }
      render(<CellComponent row={mockRow} />)
      // Le badge nomme la serie, pas l'evenement
      expect(screen.getByText('Série 1')).toBeInTheDocument()
      expect(screen.getByText('Série 2')).toBeInTheDocument()
      expect(screen.queryByText('Mixed')).not.toBeInTheDocument()
      expect(screen.queryByText(/\+\d/)).not.toBeInTheDocument()
    }
  })

  it('truncates payment badges and shows +N when more than 2', () => {
    const cols = columns()
    const paymentCol = cols.find(c => c.header === 'Paiement')
    expect(paymentCol).toBeDefined()
    if (paymentCol && 'cell' in paymentCol && paymentCol.cell) {
      const CellComponent = paymentCol.cell as unknown as React.FC<{ row: { original: PlayerType; getValue: ReturnType<typeof vi.fn> } }>
      const mockRow = {
        original: makePlayer({
          payments: [
            { round_id: 'r1', round_number: 1, event_name: 'Mixed', status: 'paid' },
            { round_id: 'r2', round_number: 2, event_name: 'Mixed', status: 'unpaid' },
            { round_id: 'r3', round_number: 3, event_name: 'Mixed', status: 'paid' },
            { round_id: 'r4', round_number: 4, event_name: 'Mixed', status: 'unpaid' },
          ],
        }),
        getValue: vi.fn(),
      }
      render(<CellComponent row={mockRow} />)
      // Les deux dernieres series restent visibles
      expect(screen.getAllByText('Série 3').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Série 4').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('+2')).toBeInTheDocument()
      expect(screen.getByTestId('tooltip-content')).toBeInTheDocument()
      // Les plus anciennes ne sont que dans l'infobulle
      expect(screen.getByText('Série 1')).toBeInTheDocument()
      expect(screen.getByText('Série 2')).toBeInTheDocument()
    }
  })

  it('porte l\'evenement et l\'etat dans l\'infobulle du badge', () => {
    // Deux evenements peuvent avoir une serie 4 : le badge reste court,
    // le survol leve l'ambiguite.
    const cols = columns()
    const paymentCol = cols.find(c => c.header === 'Paiement')
    if (paymentCol && 'cell' in paymentCol && paymentCol.cell) {
      const CellComponent = paymentCol.cell as unknown as React.FC<{ row: { original: PlayerType; getValue: ReturnType<typeof vi.fn> } }>
      const mockRow = {
        original: makePlayer({
          payments: [{ round_id: 'r4', round_number: 4, event_name: 'Mixed', status: 'unpaid' }],
        }),
        getValue: vi.fn(),
      }
      render(<CellComponent row={mockRow} />)
      expect(screen.getByTitle('Mixed, série 4 : non payé')).toBeInTheDocument()
    }
  })
})
