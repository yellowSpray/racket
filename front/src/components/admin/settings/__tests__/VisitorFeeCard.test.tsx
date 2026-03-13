import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { VisitorFeeCard } from '../VisitorFeeCard'

describe('VisitorFeeCard', () => {
  const defaultProps = {
    visitorFee: 5,
    onSave: vi.fn().mockResolvedValue(true),
  }

  it('renders without crashing', () => {
    render(<VisitorFeeCard {...defaultProps} />)
  })

  it('displays the card title', () => {
    render(<VisitorFeeCard {...defaultProps} />)
    expect(screen.getByText('Tarif visiteur')).toBeInTheDocument()
  })

  it('displays the current fee value', () => {
    render(<VisitorFeeCard {...defaultProps} />)
    expect(screen.getByText('5,00 €')).toBeInTheDocument()
  })

  it('renders the edit button', () => {
    render(<VisitorFeeCard {...defaultProps} />)
    expect(screen.getByLabelText('Modifier')).toBeInTheDocument()
  })

  it('input is disabled by default', () => {
    render(<VisitorFeeCard {...defaultProps} />)
    const input = screen.getByLabelText('Tarif visiteur')
    expect(input).toBeDisabled()
  })

  it('input is enabled after clicking edit', () => {
    render(<VisitorFeeCard {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Modifier'))
    const input = screen.getByLabelText('Tarif visiteur')
    expect(input).not.toBeDisabled()
  })

  it('shows next-event warning when editing', () => {
    render(<VisitorFeeCard {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Modifier'))
    expect(screen.getByText("Les modifications s'appliqueront au prochain événement")).toBeInTheDocument()
  })

  it('calls onSave with visitor_fee on save', async () => {
    const mockSave = vi.fn().mockResolvedValue(true)
    render(<VisitorFeeCard visitorFee={5} onSave={mockSave} />)
    fireEvent.click(screen.getByLabelText('Modifier'))
    fireEvent.click(screen.getByLabelText('Enregistrer'))
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith({ visitor_fee: 5 })
    })
  })

  it('exits edit mode after successful save', async () => {
    const mockSave = vi.fn().mockResolvedValue(true)
    render(<VisitorFeeCard visitorFee={5} onSave={mockSave} />)
    fireEvent.click(screen.getByLabelText('Modifier'))
    fireEvent.click(screen.getByLabelText('Enregistrer'))
    await waitFor(() => {
      const input = screen.getByLabelText('Tarif visiteur')
      expect(input).toBeDisabled()
    })
  })

  it('updates when props change', () => {
    const { rerender } = render(<VisitorFeeCard {...defaultProps} />)
    expect(screen.getByText('5,00 €')).toBeInTheDocument()
    rerender(<VisitorFeeCard visitorFee={10} onSave={vi.fn()} />)
    expect(screen.getByText('10,00 €')).toBeInTheDocument()
  })
})
