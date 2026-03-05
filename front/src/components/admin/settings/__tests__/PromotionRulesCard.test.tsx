import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PromotionRulesCard } from '../PromotionRulesCard'
import type { PromotionRules } from '@/types/settings'

vi.mock('@/lib/validation', () => ({
  validateFormData: (_schema: unknown, data: unknown) => ({
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
    expect(screen.getByText(/Joueurs promus ou relégués par série/)).toBeInTheDocument()
  })

  it('renders promoted and relegated labels', () => {
    render(
      <PromotionRulesCard
        promotionRules={null}
        defaultPromotion={defaultPromotion}
        onSave={vi.fn()}
      />
    )
    expect(screen.getByText('Promus')).toBeInTheDocument()
    expect(screen.getByText('Relégués')).toBeInTheDocument()
  })

  it('renders the edit button', () => {
    render(
      <PromotionRulesCard
        promotionRules={null}
        defaultPromotion={defaultPromotion}
        onSave={vi.fn()}
      />
    )
    expect(screen.getByLabelText('Modifier')).toBeInTheDocument()
  })

  it('inputs are disabled by default', () => {
    render(
      <PromotionRulesCard
        promotionRules={null}
        defaultPromotion={defaultPromotion}
        onSave={vi.fn()}
      />
    )
    const input = screen.getByLabelText('Promus') as HTMLInputElement
    expect(input.disabled).toBe(true)
  })

  it('inputs are enabled after clicking edit button', () => {
    render(
      <PromotionRulesCard
        promotionRules={null}
        defaultPromotion={defaultPromotion}
        onSave={vi.fn()}
      />
    )
    fireEvent.click(screen.getByLabelText('Modifier'))
    const input = screen.getByLabelText('Promus') as HTMLInputElement
    expect(input.disabled).toBe(false)
  })

  it('shows next-event warning when in edit mode', () => {
    render(
      <PromotionRulesCard
        promotionRules={null}
        defaultPromotion={defaultPromotion}
        onSave={vi.fn()}
      />
    )
    fireEvent.click(screen.getByLabelText('Modifier'))
    expect(screen.getByText("Les modifications s'appliqueront au prochain événement")).toBeInTheDocument()
  })

  it('uses default values when promotionRules is null', () => {
    render(
      <PromotionRulesCard
        promotionRules={null}
        defaultPromotion={defaultPromotion}
        onSave={vi.fn()}
      />
    )
    const promotedInput = screen.getByLabelText('Promus') as HTMLInputElement
    expect(promotedInput.value).toBe('1')
    const relegatedInput = screen.getByLabelText('Relégués') as HTMLInputElement
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
    const promotedInput = screen.getByLabelText('Promus') as HTMLInputElement
    expect(promotedInput.value).toBe('3')
    const relegatedInput = screen.getByLabelText('Relégués') as HTMLInputElement
    expect(relegatedInput.value).toBe('2')
  })

  it('calls onSave when clicking save button in edit mode', async () => {
    const mockSave = vi.fn().mockResolvedValue(true)
    render(
      <PromotionRulesCard
        promotionRules={null}
        defaultPromotion={defaultPromotion}
        onSave={mockSave}
      />
    )
    fireEvent.click(screen.getByLabelText('Modifier'))
    fireEvent.click(screen.getByLabelText('Enregistrer'))
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(defaultPromotion)
    })
  })

  it('exits edit mode after successful save', async () => {
    const mockSave = vi.fn().mockResolvedValue(true)
    render(
      <PromotionRulesCard
        promotionRules={null}
        defaultPromotion={defaultPromotion}
        onSave={mockSave}
      />
    )
    fireEvent.click(screen.getByLabelText('Modifier'))
    fireEvent.click(screen.getByLabelText('Enregistrer'))
    await waitFor(() => {
      const input = screen.getByLabelText('Promus') as HTMLInputElement
      expect(input.disabled).toBe(true)
    })
  })

  it('updates promoted count on input change in edit mode', () => {
    render(
      <PromotionRulesCard
        promotionRules={null}
        defaultPromotion={defaultPromotion}
        onSave={vi.fn()}
      />
    )
    fireEvent.click(screen.getByLabelText('Modifier'))
    const input = screen.getByLabelText('Promus') as HTMLInputElement
    fireEvent.change(input, { target: { value: '5' } })
    expect(input.value).toBe('5')
  })

  it('updates relegated count on input change in edit mode', () => {
    render(
      <PromotionRulesCard
        promotionRules={null}
        defaultPromotion={defaultPromotion}
        onSave={vi.fn()}
      />
    )
    fireEvent.click(screen.getByLabelText('Modifier'))
    const input = screen.getByLabelText('Relégués') as HTMLInputElement
    fireEvent.change(input, { target: { value: '3' } })
    expect(input.value).toBe('3')
  })
})
