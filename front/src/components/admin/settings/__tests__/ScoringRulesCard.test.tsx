import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ScoringRulesCard } from '../ScoringRulesCard'
import type { ScorePointsEntry } from '@/types/settings'

// Mock validation to always succeed by default
vi.mock('@/lib/validation', () => ({
  validateFormData: (_schema: unknown, data: unknown) => ({
    success: true,
    data,
    fieldErrors: {},
  }),
}))

vi.mock('@/lib/schemas/scoring.schema', () => ({
  scoringRulesSchema: {},
}))

const defaultScorePoints: ScorePointsEntry[] = [
  { score: '3-0', winner_points: 5, loser_points: 0 },
  { score: '3-1', winner_points: 4, loser_points: 1 },
  { score: '3-2', winner_points: 3, loser_points: 2 },

  { score: 'ABS', winner_points: 3, loser_points: -1 },
]

const defaultScoring = { score_points: defaultScorePoints }

const makeScoringRules = (overrides: Partial<{ score_points: ScorePointsEntry[] }> = {}) => ({
  score_points: defaultScorePoints,
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

  it('renders table headers for Score, Gagnant, Perdant', () => {
    render(
      <ScoringRulesCard
        scoringRules={null}
        defaultScoring={defaultScoring}
        onSave={vi.fn()}
      />
    )
    expect(screen.getByText('Score')).toBeInTheDocument()
    expect(screen.getByText('Gagnant')).toBeInTheDocument()
    expect(screen.getByText('Perdant')).toBeInTheDocument()
  })

  it('renders all score labels', () => {
    render(
      <ScoringRulesCard
        scoringRules={null}
        defaultScoring={defaultScoring}
        onSave={vi.fn()}
      />
    )
    expect(screen.getByText('3 - 0')).toBeInTheDocument()
    expect(screen.getByText('3 - 1')).toBeInTheDocument()
    expect(screen.getByText('3 - 2')).toBeInTheDocument()
    expect(screen.getByText('ABS')).toBeInTheDocument()
  })

  it('renders the edit button', () => {
    render(
      <ScoringRulesCard
        scoringRules={null}
        defaultScoring={defaultScoring}
        onSave={vi.fn()}
      />
    )
    expect(screen.getByLabelText('Modifier')).toBeInTheDocument()
  })

  it('inputs are disabled by default', () => {
    render(
      <ScoringRulesCard
        scoringRules={null}
        defaultScoring={defaultScoring}
        onSave={vi.fn()}
      />
    )
    const winInput = screen.getByLabelText('Gagnant 3-0') as HTMLInputElement
    expect(winInput.disabled).toBe(true)
  })

  it('inputs are enabled after clicking edit button', () => {
    render(
      <ScoringRulesCard
        scoringRules={null}
        defaultScoring={defaultScoring}
        onSave={vi.fn()}
      />
    )
    fireEvent.click(screen.getByLabelText('Modifier'))
    const winInput = screen.getByLabelText('Gagnant 3-0') as HTMLInputElement
    expect(winInput.disabled).toBe(false)
  })

  it('shows next-event warning when in edit mode', () => {
    render(
      <ScoringRulesCard
        scoringRules={null}
        defaultScoring={defaultScoring}
        onSave={vi.fn()}
      />
    )
    fireEvent.click(screen.getByLabelText('Modifier'))
    expect(screen.getByText("Les modifications s'appliqueront au prochain événement")).toBeInTheDocument()
  })

  it('uses default values when scoringRules is null', () => {
    render(
      <ScoringRulesCard
        scoringRules={null}
        defaultScoring={defaultScoring}
        onSave={vi.fn()}
      />
    )
    const winInput = screen.getByLabelText('Gagnant 3-0') as HTMLInputElement
    expect(winInput.value).toBe('5')
  })

  it('uses scoringRules values when provided', () => {
    const customPoints: ScorePointsEntry[] = [
      { score: '3-0', winner_points: 10, loser_points: 0 },
      { score: '3-1', winner_points: 8, loser_points: 2 },
      { score: '3-2', winner_points: 6, loser_points: 4 },

      { score: 'ABS', winner_points: 6, loser_points: -2 },
    ]
    render(
      <ScoringRulesCard
        scoringRules={makeScoringRules({ score_points: customPoints })}
        defaultScoring={defaultScoring}
        onSave={vi.fn()}
      />
    )
    const winInput = screen.getByLabelText('Gagnant 3-0') as HTMLInputElement
    expect(winInput.value).toBe('10')
  })

  it('calls onSave when clicking save button in edit mode', async () => {
    const mockSave = vi.fn().mockResolvedValue(true)
    render(
      <ScoringRulesCard
        scoringRules={null}
        defaultScoring={defaultScoring}
        onSave={mockSave}
      />
    )
    // Enter edit mode
    fireEvent.click(screen.getByLabelText('Modifier'))
    // Click save (now the button label is "Enregistrer")
    fireEvent.click(screen.getByLabelText('Enregistrer'))
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith({ score_points: defaultScorePoints })
    })
  })

  it('exits edit mode after successful save', async () => {
    const mockSave = vi.fn().mockResolvedValue(true)
    render(
      <ScoringRulesCard
        scoringRules={null}
        defaultScoring={defaultScoring}
        onSave={mockSave}
      />
    )
    fireEvent.click(screen.getByLabelText('Modifier'))
    fireEvent.click(screen.getByLabelText('Enregistrer'))
    await waitFor(() => {
      const winInput = screen.getByLabelText('Gagnant 3-0') as HTMLInputElement
      expect(winInput.disabled).toBe(true)
    })
  })

  it('updates field value on input change in edit mode', () => {
    render(
      <ScoringRulesCard
        scoringRules={null}
        defaultScoring={defaultScoring}
        onSave={vi.fn()}
      />
    )
    fireEvent.click(screen.getByLabelText('Modifier'))
    const winInput = screen.getByLabelText('Gagnant 3-0') as HTMLInputElement
    fireEvent.change(winInput, { target: { value: '10' } })
    expect(winInput.value).toBe('10')
  })
})
