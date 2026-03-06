import { vi } from 'vitest'

type MockFn = ReturnType<typeof vi.fn>

export interface MockQueryBuilder {
    select: MockFn; insert: MockFn; update: MockFn; delete: MockFn; upsert: MockFn
    eq: MockFn; in: MockFn; order: MockFn; single: MockFn; maybeSingle: MockFn
    limit: MockFn; lt: MockFn; neq: MockFn; not: MockFn; is: MockFn
    then: MockFn
    _resolve: (data: unknown) => MockQueryBuilder
    _reject: (error: string) => MockQueryBuilder
}

export interface MockSupabase {
    from: MockFn
    rpc: MockFn
    _builder: MockQueryBuilder
}

/**
 * Creates a typed Supabase mock builder for use inside vi.hoisted().
 * Types are defined as interfaces above so they can be imported via `import type`
 * (which is erased at compile time and works with vi.hoisted).
 */
export function createMockQueryBuilder(): MockQueryBuilder {
    const qb = {} as MockQueryBuilder
    qb.select = vi.fn(() => qb)
    qb.insert = vi.fn(() => qb)
    qb.update = vi.fn(() => qb)
    qb.delete = vi.fn(() => qb)
    qb.upsert = vi.fn(() => qb)
    qb.eq = vi.fn(() => qb)
    qb.in = vi.fn(() => qb)
    qb.order = vi.fn(() => qb)
    qb.single = vi.fn(() => qb)
    qb.maybeSingle = vi.fn(() => qb)
    qb.limit = vi.fn(() => qb)
    qb.lt = vi.fn(() => qb)
    qb.neq = vi.fn(() => qb)
    qb.not = vi.fn(() => qb)
    qb.is = vi.fn(() => qb)
    qb.then = vi.fn()
    qb._resolve = (data: unknown) => {
        const p = Promise.resolve({ data, error: null })
        qb.then = p.then.bind(p) as unknown as MockFn
        return qb
    }
    qb._reject = (error: string) => {
        const p = Promise.resolve({ data: null, error: { message: error } })
        qb.then = p.then.bind(p) as unknown as MockFn
        return qb
    }
    return qb
}

export function createSupabaseMock(): MockSupabase {
    const qb = createMockQueryBuilder()
    return {
        from: vi.fn(() => qb),
        rpc: vi.fn(),
        _builder: qb,
    }
}
