import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import NotFoundPage from './NotFound'

describe('NotFoundPage', () => {
    it('renders without crashing', () => {
        render(<NotFoundPage />)
    })

    it('displays "404 Page Not Found" text', () => {
        render(<NotFoundPage />)
        expect(screen.getByText('404 Page Not Found')).toBeInTheDocument()
    })
})
