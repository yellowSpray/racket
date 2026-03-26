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

  /**
   * Convertit une erreur quelconque en AppError et extrait les
   * erreurs par champ si c'est une ValidationError.
   */
  const handleError = useCallback((error: unknown) => {
    const appError = toAppError(error)
    setState({
      error: appError,
      fieldErrors:
        appError instanceof ValidationError ? appError.fieldErrors : {},
    })
  }, [])

  /** Réinitialise l'état d'erreur (erreur globale + erreurs par champ). */
  const clearError = useCallback(() => {
    setState({ error: null, fieldErrors: {} })
  }, [])

  /** Retourne le premier message d'erreur pour un champ donné, ou undefined. */
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
