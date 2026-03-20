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
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode, asChild?: boolean }) => <div data-testid="tooltip-trigger">{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
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
  payments: [],
  power_ranking: 5,
  box: '',
  ...overrides,
})

describe('PlayerColumns', () => {
  const mockUpdatePlayer = vi.fn()
  const mockUpdatePaymentStatus = vi.fn()

  it('returns an array of column definitions', () => {
    const cols = columns(mockUpdatePlayer, mockUpdatePaymentStatus)
    expect(Array.isArray(cols)).toBe(true)
    expect(cols.length).toBeGreaterThan(0)
  })

  it('includes expected column headers', () => {
    const cols = columns(mockUpdatePlayer, mockUpdatePaymentStatus)
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
    expect(headers).toContain('Actions')
  })

  it('has a full_name accessor that concatenates first and last name', () => {
    const cols = columns(mockUpdatePlayer, mockUpdatePaymentStatus)
    const fullNameCol = cols.find(c => c.header === 'Prénom Nom')
    expect(fullNameCol).toBeDefined()
    if (fullNameCol && 'accessorFn' in fullNameCol && fullNameCol.accessorFn) {
      const result = fullNameCol.accessorFn(makePlayer(), 0)
      expect(result).toBe('Alice Martin')
    }
  })

  it('renders unavailable dates as badges in absence column', () => {
    const cols = columns(mockUpdatePlayer, mockUpdatePaymentStatus)
    const absenceCol = cols.find(c => c.header === 'Absence')
    expect(absenceCol).toBeDefined()
    if (absenceCol && 'cell' in absenceCol && absenceCol.cell) {
      const CellComponent = absenceCol.cell as React.FC<{ row: { original: PlayerType; getValue: ReturnType<typeof vi.fn> } }>
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
    const cols = columns(mockUpdatePlayer, mockUpdatePaymentStatus)
    const statusCol = cols.find(c => c.header === 'Status')
    expect(statusCol).toBeDefined()
    if (statusCol && 'cell' in statusCol && statusCol.cell) {
      const CellComponent = statusCol.cell as React.FC<{ row: { original: PlayerType; getValue: ReturnType<typeof vi.fn> } }>
      const mockRow = {
        original: makePlayer({ status: ['active', 'member'] }),
        getValue: vi.fn(),
      }
      render(<CellComponent row={mockRow} />)
      expect(screen.getByText('active')).toBeInTheDocument()
      expect(screen.getByText('member')).toBeInTheDocument()
    }
  })

  it('renders the actions column with edit option', () => {
    const cols = columns(mockUpdatePlayer, mockUpdatePaymentStatus)
    const actionsCol = cols.find(c => c.header === 'Actions')
    expect(actionsCol).toBeDefined()
    if (actionsCol && 'cell' in actionsCol && actionsCol.cell) {
      const CellComponent = actionsCol.cell as React.FC<{ row: { original: PlayerType; getValue: ReturnType<typeof vi.fn> } }>
      const mockRow = {
        original: makePlayer(),
        getValue: vi.fn(),
      }
      render(<CellComponent row={mockRow} />)
      expect(screen.getByText('Modifier')).toBeInTheDocument()
    }
  })

  it('has 10 columns total', () => {
    const cols = columns(mockUpdatePlayer, mockUpdatePaymentStatus)
    expect(cols.length).toBe(10)
  })

  it('renders all payment badges when 2 or fewer', () => {
    const cols = columns(mockUpdatePlayer, mockUpdatePaymentStatus)
    const paymentCol = cols.find(c => c.header === 'Paiement')
    expect(paymentCol).toBeDefined()
    if (paymentCol && 'cell' in paymentCol && paymentCol.cell) {
      const CellComponent = paymentCol.cell as React.FC<{ row: { original: PlayerType; getValue: ReturnType<typeof vi.fn> } }>
      const mockRow = {
        original: makePlayer({
          payments: [
            { event_id: 'e1', event_name: 'Série 41', status: 'paid' },
            { event_id: 'e2', event_name: 'Série 42', status: 'unpaid' },
          ],
        }),
        getValue: vi.fn(),
      }
      render(<CellComponent row={mockRow} />)
      expect(screen.getByText('Série 41')).toBeInTheDocument()
      expect(screen.getByText('Série 42')).toBeInTheDocument()
      expect(screen.queryByText(/\+\d/)).not.toBeInTheDocument()
    }
  })

  it('truncates payment badges and shows +N when more than 2', () => {
    const cols = columns(mockUpdatePlayer, mockUpdatePaymentStatus)
    const paymentCol = cols.find(c => c.header === 'Paiement')
    expect(paymentCol).toBeDefined()
    if (paymentCol && 'cell' in paymentCol && paymentCol.cell) {
      const CellComponent = paymentCol.cell as React.FC<{ row: { original: PlayerType; getValue: ReturnType<typeof vi.fn> } }>
      const mockRow = {
        original: makePlayer({
          payments: [
            { event_id: 'e1', event_name: 'Série 41', status: 'paid' },
            { event_id: 'e2', event_name: 'Série 42', status: 'unpaid' },
            { event_id: 'e3', event_name: 'Série 43', status: 'paid' },
            { event_id: 'e4', event_name: 'Série 44', status: 'unpaid' },
          ],
        }),
        getValue: vi.fn(),
      }
      render(<CellComponent row={mockRow} />)
      // Visible badges (also duplicated in tooltip)
      expect(screen.getAllByText('Série 41').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Série 42').length).toBeGreaterThanOrEqual(1)
      // +N badge
      expect(screen.getByText('+2')).toBeInTheDocument()
      // Tooltip content with all badges
      expect(screen.getByTestId('tooltip-content')).toBeInTheDocument()
      // Hidden badges only appear in tooltip
      expect(screen.getByText('Série 43')).toBeInTheDocument()
      expect(screen.getByText('Série 44')).toBeInTheDocument()
    }
  })
})
