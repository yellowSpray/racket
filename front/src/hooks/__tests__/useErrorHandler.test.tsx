import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useErrorHandler } from '../useErrorHandler'
import { AppError, ValidationError } from '@/lib/errors'

describe('useErrorHandler', () => {
    it('should initialize with no error', () => {
        const { result } = renderHook(() => useErrorHandler())

        expect(result.current.error).toBeNull()
        expect(result.current.errorMessage).toBeNull()
        expect(result.current.fieldErrors).toEqual({})
    })

    it('should handle a plain Error', () => {
        const { result } = renderHook(() => useErrorHandler())

        act(() => {
            result.current.handleError(new Error('Something went wrong'))
        })

        expect(result.current.error).toBeInstanceOf(AppError)
        expect(result.current.errorMessage).toBe('Something went wrong')
        expect(result.current.fieldErrors).toEqual({})
    })

    it('should handle an AppError', () => {
        const { result } = renderHook(() => useErrorHandler())

        act(() => {
            result.current.handleError(new AppError('App failure', 'APP_ERROR', 500))
        })

        expect(result.current.error).toBeInstanceOf(AppError)
        expect(result.current.errorMessage).toBe('App failure')
    })

    it('should handle a ValidationError with field errors', () => {
        const { result } = renderHook(() => useErrorHandler())
        const fieldErrors = {
            email: ['Email is required', 'Email is invalid'],
            name: ['Name is required'],
        }

        act(() => {
            result.current.handleError(new ValidationError('Validation failed', fieldErrors))
        })

        expect(result.current.error).toBeInstanceOf(ValidationError)
        expect(result.current.errorMessage).toBe('Validation failed')
        expect(result.current.fieldErrors).toEqual(fieldErrors)
    })

    it('should handle a string error', () => {
        const { result } = renderHook(() => useErrorHandler())

        act(() => {
            result.current.handleError('string error')
        })

        expect(result.current.error).toBeInstanceOf(AppError)
        expect(result.current.errorMessage).toBe('string error')
    })

    it('should clear errors', () => {
        const { result } = renderHook(() => useErrorHandler())

        act(() => {
            result.current.handleError(new Error('failure'))
        })
        expect(result.current.error).not.toBeNull()

        act(() => {
            result.current.clearError()
        })
        expect(result.current.error).toBeNull()
        expect(result.current.errorMessage).toBeNull()
        expect(result.current.fieldErrors).toEqual({})
    })

    it('should return the first field error via getFieldError', () => {
        const { result } = renderHook(() => useErrorHandler())
        const fieldErrors = {
            email: ['Email is required', 'Email is invalid'],
        }

        act(() => {
            result.current.handleError(new ValidationError('Validation failed', fieldErrors))
        })

        expect(result.current.getFieldError('email')).toBe('Email is required')
        expect(result.current.getFieldError('name')).toBeUndefined()
    })
})
