import { useState, useCallback } from 'react'
import { type AppError, toAppError, ValidationError } from '@/lib/errors'

interface ErrorState {
  error: AppError | null
  fieldErrors: Record<string, string[]>
}

export function useErrorHandler() {
  const [state, setState] = useState<ErrorState>({
    error: null,
    fieldErrors: {},
  })

  const handleError = useCallback((error: unknown) => {
    const appError = toAppError(error)
    setState({
      error: appError,
      fieldErrors:
        appError instanceof ValidationError ? appError.fieldErrors : {},
    })
  }, [])

  const clearError = useCallback(() => {
    setState({ error: null, fieldErrors: {} })
  }, [])

  const getFieldError = useCallback(
    (field: string): string | undefined => {
      return state.fieldErrors[field]?.[0]
    },
    [state.fieldErrors],
  )

  return {
    error: state.error,
    errorMessage: state.error?.message ?? null,
    fieldErrors: state.fieldErrors,
    handleError,
    clearError,
    getFieldError,
  }
}
