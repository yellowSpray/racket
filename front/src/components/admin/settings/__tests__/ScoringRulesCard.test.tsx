import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ScoringRulesCard } from '../ScoringRulesCard'
import type { ScoringRules } from '@/types/settings'

// Mock validation to always succeed by default
vi.mock('@/lib/validation', () => ({
  validateFormData: (_schema: any, data: any) => ({
    success: true,
    data,
    fieldErrors: {},
  }),
}))

vi.mock('@/lib/schemas/scoring.schema', () => ({
  scoringRulesSchema: {},
}))

const defaultScoring = {
  points_win: 3,
  points_loss: 0,
  points_draw: 1,
  points_walkover_win: 3,
  points_walkover_loss: 0,
  points_absence: -1,
}

const makeScoringRules = (overrides: Partial<ScoringRules> = {}): ScoringRules => ({
  id: 'sr1',
  club_id: 'c1',
  points_win: 5,
  points_loss: 1,
  points_draw: 2,
  points_walkover_win: 5,
  points_walkover_loss: 0,
  points_absence: -2,
  ...overrides,
})

describe('ScoringRulesCard', () => {
  it('renders without crashing', () => {
    render(
      <ScoringRulesCard
        scoringRules={null}
        defaultScoring={defaultScoring}
        onSave={vi.fn()}
      />
    )
  })

  it('displays the card title', () => {
    render(
      <ScoringRulesCard
        scoringRules={null}
        defaultScoring={defaultScoring}
        onSave={vi.fn()}
      />
    )
    expect(screen.getByText('Règles de pointage')).toBeInTheDocument()
  })

  it('displays the card description', () => {
    render(
      <ScoringRulesCard
        scoringRules={null}
        defaultScoring={defaultScoring}
        onSave={vi.fn()}
      />
    )
    expect(screen.getByText('Points attribués selon le résultat du match')).toBeInTheDocument()
  })

  it('renders all scoring field labels', () => {
    render(
      <ScoringRulesCard
        scoringRules={null}
        defaultScoring={defaultScoring}
        onSave={vi.fn()}
      />
    )
    expect(screen.getByText('Victoire')).toBeInTheDocument()
    expect(screen.getByText('Défaite')).toBeInTheDocument()
    expect(screen.getByText('Égalité')).toBeInTheDocument()
    expect(screen.getByText('Forfait gagné')).toBeInTheDocument()
    expect(screen.getByText('Forfait perdu')).toBeInTheDocument()
    expect(screen.getByText('Absence')).toBeInTheDocument()
  })

  it('renders the save button', () => {
    render(
      <ScoringRulesCard
        scoringRules={null}
        defaultScoring={defaultScoring}
        onSave={vi.fn()}
      />
    )
    expect(screen.getByText('Enregistrer')).toBeInTheDocument()
  })

  it('uses default values when scoringRules is null', () => {
    render(
      <ScoringRulesCard
        scoringRules={null}
        defaultScoring={defaultScoring}
        onSave={vi.fn()}
      />
    )
    const winInput = screen.getByLabelText('Victoire') as HTMLInputElement
    expect(winInput.value).toBe('3')
  })

  it('uses scoringRules values when provided', () => {
    render(
      <ScoringRulesCard
        scoringRules={makeScoringRules({ points_win: 5 })}
        defaultScoring={defaultScoring}
        onSave={vi.fn()}
      />
    )
    const winInput = screen.getByLabelText('Victoire') as HTMLInputElement
    expect(winInput.value).toBe('5')
  })

  it('calls onSave with form data on submit', async () => {
    const mockSave = vi.fn().mockResolvedValue(true)
    render(
      <ScoringRulesCard
        scoringRules={null}
        defaultScoring={defaultScoring}
        onSave={mockSave}
      />
    )
    fireEvent.submit(screen.getByText('Enregistrer').closest('form')!)
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(defaultScoring)
    })
  })

  it('shows "Enregistré" after successful save', async () => {
    const mockSave = vi.fn().mockResolvedValue(true)
    render(
      <ScoringRulesCard
        scoringRules={null}
        defaultScoring={defaultScoring}
        onSave={mockSave}
      />
    )
    fireEvent.submit(screen.getByText('Enregistrer').closest('form')!)
    await waitFor(() => {
      expect(screen.getByText('Enregistré')).toBeInTheDocument()
    })
  })

  it('updates field value on input change', () => {
    render(
      <ScoringRulesCard
        scoringRules={null}
        defaultScoring={defaultScoring}
        onSave={vi.fn()}
      />
    )
    const winInput = screen.getByLabelText('Victoire') as HTMLInputElement
    fireEvent.change(winInput, { target: { value: '10' } })
    expect(winInput.value).toBe('10')
  })
})
