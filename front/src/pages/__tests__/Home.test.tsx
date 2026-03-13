import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import Home from '../Home'

describe('Home', () => {
    it('renders the landing page placeholder text', () => {
        render(<Home />)
        expect(screen.getByText('Landing Page')).toBeInTheDocument()
    })

    it('renders a container with flex layout', () => {
        const { container } = render(<Home />)
        const div = container.querySelector('div')
        expect(div).toBeInTheDocument()
        expect(div?.className).toContain('flex')
    })

    it('applies muted-foreground style to the text', () => {
        render(<Home />)
        const text = screen.getByText('Landing Page')
        expect(text.className).toContain('text-muted-foreground')
    })

    it('applies amber background', () => {
        const { container } = render(<Home />)
        const div = container.querySelector('div')
        expect(div?.className).toContain('bg-amber-500')
    })

    it('renders as a paragraph element', () => {
        render(<Home />)
        const text = screen.getByText('Landing Page')
        expect(text.tagName).toBe('P')
    })
})
