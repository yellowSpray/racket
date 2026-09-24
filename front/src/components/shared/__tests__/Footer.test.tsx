import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Footer from '../Footer'

describe('Footer', () => {
  it('renders without crashing', () => {
    render(<Footer />)
  })

  // Le produit s'appelle Racket Fest, en deux mots, depuis septembre.
  it('displays the brand name', () => {
    render(<Footer />)
    expect(screen.getByText('Racket Fest')).toBeInTheDocument()
  })

  it('displays the current year with copyright symbol', () => {
    render(<Footer />)
    const currentYear = new Date().getFullYear().toString()
    expect(screen.getByText(new RegExp(`© ${currentYear}`))).toBeInTheDocument()
  })

  it('renders a footer element', () => {
    const { container } = render(<Footer />)
    const footer = container.querySelector('footer')
    expect(footer).toBeInTheDocument()
  })
})
