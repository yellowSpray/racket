import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PromotionRulesCard } from '../PromotionRulesCard'
import type { PromotionRules } from '@/types/settings'

vi.mock('@/lib/validation', () => ({
  validateFormData: (_schema: any, data: any) => ({
    success: true,
    data,
    fieldErrors: {},
  }),
}))

vi.mock('@/lib/schemas/promotion.schema', () => ({
  promotionRulesSchema: {},
}))

const defaultPromotion = {
  promoted_count: 1,
  relegated_count: 1,
}

const makePromotionRules = (overrides: Partial<PromotionRules> = {}): PromotionRules => ({
  id: 'pr1',
  club_id: 'c1',
  promoted_count: 2,
  relegated_count: 2,
  ...overrides,
})

describe('PromotionRulesCard', () => {
  it('renders without crashing', () => {
    render(
      <PromotionRulesCard
        promotionRules={null}
        defaultPromotion={defaultPromotion}
        onSave={vi.fn()}
      />
    )
  })

  it('displays the card title', () => {
    render(
      <PromotionRulesCard
        promotionRules={null}
        defaultPromotion={defaultPromotion}
        onSave={vi.fn()}
      />
    )
    expect(screen.getByText('Montées / Descentes')).toBeInTheDocument()
  })

  it('displays the card description', () => {
    render(
      <PromotionRulesCard
        promotionRules={null}
        defaultPromotion={defaultPromotion}
        onSave={vi.fn()}
      />
    )
    expect(screen.getByText(/Nombre de joueurs qui changent de groupe/)).toBeInTheDocument()
  })

  it('renders promoted and relegated labels', () => {
    render(
      <PromotionRulesCard
        promotionRules={null}
        defaultPromotion={defaultPromotion}
        onSave={vi.fn()}
      />
    )
    expect(screen.getByText('Joueurs promus')).toBeInTheDocument()
    expect(screen.getByText('Joueurs relégués')).toBeInTheDocument()
  })

  it('renders the save button', () => {
    render(
      <PromotionRulesCard
        promotionRules={null}
        defaultPromotion={defaultPromotion}
        onSave={vi.fn()}
      />
    )
    expect(screen.getByText('Enregistrer')).toBeInTheDocument()
  })

  it('uses default values when promotionRules is null', () => {
    render(
      <PromotionRulesCard
        promotionRules={null}
        defaultPromotion={defaultPromotion}
        onSave={vi.fn()}
      />
    )
    const promotedInput = screen.getByLabelText('Joueurs promus') as HTMLInputElement
    expect(promotedInput.value).toBe('1')
    const relegatedInput = screen.getByLabelText('Joueurs relégués') as HTMLInputElement
    expect(relegatedInput.value).toBe('1')
  })

  it('uses promotionRules values when provided', () => {
    render(
      <PromotionRulesCard
        promotionRules={makePromotionRules({ promoted_count: 3, relegated_count: 2 })}
        defaultPromotion={defaultPromotion}
        onSave={vi.fn()}
      />
    )
    const promotedInput = screen.getByLabelText('Joueurs promus') as HTMLInputElement
    expect(promotedInput.value).toBe('3')
    const relegatedInput = screen.getByLabelText('Joueurs relégués') as HTMLInputElement
    expect(relegatedInput.value).toBe('2')
  })

  it('calls onSave with form data on submit', async () => {
    const mockSave = vi.fn().mockResolvedValue(true)
    render(
      <PromotionRulesCard
        promotionRules={null}
        defaultPromotion={defaultPromotion}
        onSave={mockSave}
      />
    )
    fireEvent.submit(screen.getByText('Enregistrer').closest('form')!)
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(defaultPromotion)
    })
  })

  it('shows "Enregistré" after successful save', async () => {
    const mockSave = vi.fn().mockResolvedValue(true)
    render(
      <PromotionRulesCard
        promotionRules={null}
        defaultPromotion={defaultPromotion}
        onSave={mockSave}
      />
    )
    fireEvent.submit(screen.getByText('Enregistrer').closest('form')!)
    await waitFor(() => {
      expect(screen.getByText('Enregistré')).toBeInTheDocument()
    })
  })

  it('updates promoted count on input change', () => {
    render(
      <PromotionRulesCard
        promotionRules={null}
        defaultPromotion={defaultPromotion}
        onSave={vi.fn()}
      />
    )
    const input = screen.getByLabelText('Joueurs promus') as HTMLInputElement
    fireEvent.change(input, { target: { value: '5' } })
    expect(input.value).toBe('5')
  })

  it('updates relegated count on input change', () => {
    render(
      <PromotionRulesCard
        promotionRules={null}
        defaultPromotion={defaultPromotion}
        onSave={vi.fn()}
      />
    )
    const input = screen.getByLabelText('Joueurs relégués') as HTMLInputElement
    fireEvent.change(input, { target: { value: '3' } })
    expect(input.value).toBe('3')
  })
})
