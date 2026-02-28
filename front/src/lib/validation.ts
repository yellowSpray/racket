import type { z } from 'zod'

type ValidationResult<T> =
  | { success: true; data: T; fieldErrors: Record<string, string[]> }
  | { success: false; data: null; fieldErrors: Record<string, string[]> }

export function validateFormData<T>(
  schema: z.ZodType<T>,
  data: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data, fieldErrors: {} }
  }

  const fieldErrors: Record<string, string[]> = {}
  for (const issue of result.error.issues) {
    const path = issue.path.join('.')
    if (!fieldErrors[path]) fieldErrors[path] = []
    fieldErrors[path].push(issue.message)
  }

  return { success: false, data: null, fieldErrors }
}
