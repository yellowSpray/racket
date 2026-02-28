import { validateFormData } from '@/lib/validation'
import { registerSchema } from '@/lib/schemas/register.schema'
import { eventSchema } from '@/lib/schemas/event.schema'
import { playerSchema } from '@/lib/schemas/player.schema'

describe('validateFormData', () => {
  it('returns success with valid data', () => {
    const result = validateFormData(playerSchema, {
      first_name: 'John',
      last_name: 'Doe',
      phone: '+32456789',
      email: 'john@test.com',
    })
    expect(result.success).toBe(true)
    expect(result.data).not.toBeNull()
    expect(result.fieldErrors).toEqual({})
  })

  it('returns field errors for invalid data', () => {
    const result = validateFormData(playerSchema, {
      first_name: '',
      last_name: '',
      phone: '12',
      email: 'invalid',
    })
    expect(result.success).toBe(false)
    expect(result.data).toBeNull()
    expect(result.fieldErrors.first_name).toBeDefined()
    expect(result.fieldErrors.last_name).toBeDefined()
    expect(result.fieldErrors.phone).toBeDefined()
    expect(result.fieldErrors.email).toBeDefined()
  })
})

describe('registerSchema', () => {
  const validData = {
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '+32456789',
    selectedClub: 'club-123',
    email: 'john@test.com',
    password: 'secret123',
    confirmPassword: 'secret123',
  }

  it('validates correct data', () => {
    const result = validateFormData(registerSchema, validData)
    expect(result.success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    const result = validateFormData(registerSchema, {
      ...validData,
      confirmPassword: 'different',
    })
    expect(result.success).toBe(false)
    expect(result.fieldErrors.confirmPassword).toBeDefined()
  })

  it('rejects short password', () => {
    const result = validateFormData(registerSchema, {
      ...validData,
      password: '123',
      confirmPassword: '123',
    })
    expect(result.success).toBe(false)
    expect(result.fieldErrors.password).toBeDefined()
  })

  it('rejects invalid email', () => {
    const result = validateFormData(registerSchema, {
      ...validData,
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
    expect(result.fieldErrors.email).toBeDefined()
  })

  it('rejects empty required fields', () => {
    const result = validateFormData(registerSchema, {
      ...validData,
      firstName: '',
      selectedClub: '',
    })
    expect(result.success).toBe(false)
    expect(result.fieldErrors.firstName).toBeDefined()
    expect(result.fieldErrors.selectedClub).toBeDefined()
  })
})

describe('eventSchema', () => {
  const validData = {
    event_name: 'Série 36',
    start_date: '2026-03-01',
    end_date: '2026-04-01',
    number_of_courts: 4,
  }

  it('validates correct data', () => {
    const result = validateFormData(eventSchema, validData)
    expect(result.success).toBe(true)
  })

  it('accepts optional fields', () => {
    const result = validateFormData(eventSchema, {
      ...validData,
      description: 'A description',
      start_time: '19:00',
      end_time: '23:00',
    })
    expect(result.success).toBe(true)
  })

  it('rejects end_date before start_date', () => {
    const result = validateFormData(eventSchema, {
      ...validData,
      start_date: '2026-04-01',
      end_date: '2026-03-01',
    })
    expect(result.success).toBe(false)
    expect(result.fieldErrors.end_date).toBeDefined()
  })

  it('rejects zero courts', () => {
    const result = validateFormData(eventSchema, {
      ...validData,
      number_of_courts: 0,
    })
    expect(result.success).toBe(false)
    expect(result.fieldErrors.number_of_courts).toBeDefined()
  })

  it('rejects missing event name', () => {
    const result = validateFormData(eventSchema, {
      ...validData,
      event_name: '',
    })
    expect(result.success).toBe(false)
    expect(result.fieldErrors.event_name).toBeDefined()
  })
})

describe('playerSchema', () => {
  const validData = {
    first_name: 'Sophie',
    last_name: 'Martin',
    phone: '+32498765',
    email: 'sophie@club.be',
  }

  it('validates correct data', () => {
    const result = validateFormData(playerSchema, validData)
    expect(result.success).toBe(true)
  })

  it('accepts optional fields', () => {
    const result = validateFormData(playerSchema, {
      ...validData,
      arrival: '19:00',
      departure: '22:00',
      power_ranking: '25',
      status: ['active', 'member'],
      unavailable: ['2026-03-15'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects short phone number', () => {
    const result = validateFormData(playerSchema, {
      ...validData,
      phone: '123',
    })
    expect(result.success).toBe(false)
    expect(result.fieldErrors.phone).toBeDefined()
  })

  it('rejects invalid email', () => {
    const result = validateFormData(playerSchema, {
      ...validData,
      email: 'bad',
    })
    expect(result.success).toBe(false)
    expect(result.fieldErrors.email).toBeDefined()
  })
})
