import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UnplacedMatchesPanel } from '../UnplacedMatchesPanel'
import type { SchedulerDiagnostic } from '@/lib/schedulerSuggestions'
import type { UnplacedMatch } from '@/lib/matchScheduler'

function makeDiagnostic(overrides: Partial<SchedulerDiagnostic> = {}): SchedulerDiagnostic {
  return {
    totalCount: 10,
    placedCount: 8,
    unplacedCount: 2,
    unplacedDetails: [
      {
        player1Name: 'Alice Smith',
        player2Name: 'Bob Jones',
        player1Id: 'p1',
        player2Id: 'p2',
        date: '2026-03-01',
        groupName: 'Box 1',
        reason: 'Aucun creneau disponible',
      },
      {
        player1Name: 'Charlie Brown',
        player2Name: 'Diana Prince',
        player1Id: 'p3',
        player2Id: 'p4',
        date: '2026-03-02',
        groupName: 'Box 2',
        reason: 'Aucun creneau disponible',
      },
    ],
    unplacedByDate: new Map(),
    unplacedByGroup: new Map(),
    suggestions: [
      {
        type: 'add_courts',
        message: 'Ajoutez 1 terrain(s)',
        extra: 1,
      },
    ],
    ...overrides,
  }
}

describe('UnplacedMatchesPanel', () => {
  it('renders nothing when no unplaced matches', () => {
    const { container } = render(
      <UnplacedMatchesPanel diagnostic={makeDiagnostic({ unplacedCount: 0, unplacedDetails: [], suggestions: [] })} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows unplaced count summary', () => {
    render(<UnplacedMatchesPanel diagnostic={makeDiagnostic()} />)
    expect(screen.getByText(/2 match\(s\) sans creneau/)).toBeInTheDocument()
    expect(screen.getByText(/8\/10/)).toBeInTheDocument()
  })

  it('shows suggestion messages', () => {
    render(<UnplacedMatchesPanel diagnostic={makeDiagnostic()} />)
    expect(screen.getByText(/Ajoutez 1 terrain/)).toBeInTheDocument()
  })

  it('shows unplaced match details when expanded', () => {
    render(<UnplacedMatchesPanel diagnostic={makeDiagnostic()} />)

    const detailsButton = screen.getByRole('button', { name: /detail/i })
    fireEvent.click(detailsButton)

    expect(screen.getByText(/Alice Smith/)).toBeInTheDocument()
    expect(screen.getByText(/Bob Jones/)).toBeInTheDocument()
    expect(screen.getByText(/Box 1/)).toBeInTheDocument()
  })

  it('shows multiple suggestions', () => {
    const diagnostic = makeDiagnostic({
      suggestions: [
        { type: 'add_courts', message: 'Ajoutez 1 terrain', extra: 1 },
        { type: 'add_dates', message: 'Ajoutez 2 dates', extra: 2 },
        { type: 'check_player', message: 'Verifiez Player p1', extra: 1, playerIds: ['p1'] },
      ],
    })
    render(<UnplacedMatchesPanel diagnostic={diagnostic} />)

    expect(screen.getByText(/Ajoutez 1 terrain/)).toBeInTheDocument()
    expect(screen.getByText(/Ajoutez 2 dates/)).toBeInTheDocument()
    expect(screen.getByText(/Verifiez Player p1/)).toBeInTheDocument()
  })
})
