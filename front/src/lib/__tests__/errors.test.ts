import {
  AppError,
  ValidationError,
  DatabaseError,
  AuthError,
  toAppError,
} from '@/lib/errors'

describe('AppError', () => {
  it('creates error with defaults', () => {
    const err = new AppError('something failed')
    expect(err.message).toBe('something failed')
    expect(err.code).toBe('APP_ERROR')
    expect(err.statusCode).toBe(500)
    expect(err.name).toBe('AppError')
    expect(err).toBeInstanceOf(Error)
  })

  it('accepts custom code and statusCode', () => {
    const err = new AppError('not found', 'NOT_FOUND', 404)
    expect(err.code).toBe('NOT_FOUND')
    expect(err.statusCode).toBe(404)
  })
})

describe('ValidationError', () => {
  it('creates error with field errors', () => {
    const fieldErrors = { email: ['Invalid email'] }
    const err = new ValidationError('Validation failed', fieldErrors)
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.statusCode).toBe(400)
    expect(err.fieldErrors).toEqual(fieldErrors)
    expect(err).toBeInstanceOf(AppError)
  })

  it('defaults to empty field errors', () => {
    const err = new ValidationError('failed')
    expect(err.fieldErrors).toEqual({})
  })
})

describe('DatabaseError', () => {
  it('creates error with correct code', () => {
    const err = new DatabaseError('connection failed')
    expect(err.code).toBe('DATABASE_ERROR')
    expect(err.statusCode).toBe(500)
    expect(err).toBeInstanceOf(AppError)
  })
})

describe('AuthError', () => {
  it('creates error with correct code', () => {
    const err = new AuthError('unauthorized')
    expect(err.code).toBe('AUTH_ERROR')
    expect(err.statusCode).toBe(401)
    expect(err).toBeInstanceOf(AppError)
  })
})

describe('toAppError', () => {
  it('returns AppError as-is', () => {
    const original = new AppError('test')
    expect(toAppError(original)).toBe(original)
  })

  it('returns ValidationError as-is', () => {
    const original = new ValidationError('test')
    expect(toAppError(original)).toBe(original)
  })

  it('converts standard Error to AppError', () => {
    const result = toAppError(new Error('native error'))
    expect(result).toBeInstanceOf(AppError)
    expect(result.message).toBe('native error')
  })

  it('converts string to AppError', () => {
    const result = toAppError('string error')
    expect(result).toBeInstanceOf(AppError)
    expect(result.message).toBe('string error')
  })

  it('converts null/undefined to AppError', () => {
    expect(toAppError(null).message).toBe('null')
    expect(toAppError(undefined).message).toBe('undefined')
  })
})
