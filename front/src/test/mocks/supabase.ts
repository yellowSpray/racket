import { vi } from 'vitest'

// Chainable query builder mock
export function createSupabaseMock() {
    const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockReturnThis(),
        then: vi.fn(),
        // Default resolved value
        _resolve: (data: any) => {
            // Make the builder thenable with the given data
            const promise = Promise.resolve({ data, error: null })
            queryBuilder.then = promise.then.bind(promise)
            return queryBuilder
        },
        _reject: (error: any) => {
            const promise = Promise.resolve({ data: null, error: { message: error } })
            queryBuilder.then = promise.then.bind(promise)
            return queryBuilder
        },
    }

    return {
        from: vi.fn(() => queryBuilder),
        rpc: vi.fn(),
        _builder: queryBuilder,
    }
}
