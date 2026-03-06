import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Loading from '../Loading'

describe('Loading', () => {
  it('renders without crashing', () => {
    render(<Loading />)
  })

  it('renders with status role', () => {
    render(<Loading />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has accessible loading label', () => {
    render(<Loading />)
    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
  })

  it('renders inside a full-height section', () => {
    const { container } = render(<Loading />)
    const section = container.querySelector('section')
    expect(section).toBeInTheDocument()
    expect(section).toHaveClass('h-lvh')
  })

  it('renders skeleton blocks', () => {
    const { container } = render(<Loading />)
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })
})
