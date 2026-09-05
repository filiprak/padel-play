import { describe, expect, it } from 'vitest'
import { ServiceError } from './errors'

describe('ServiceError', () => {
  it('carries status, message and details', () => {
    const err = new ServiceError(418, 'teapot', { extra: true })
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('ServiceError')
    expect(err.status).toBe(418)
    expect(err.message).toBe('teapot')
    expect(err.details).toEqual({ extra: true })
  })

  it('exposes badRequest/notFound/conflict factories', () => {
    expect(ServiceError.badRequest('bad').status).toBe(400)
    expect(ServiceError.notFound('missing').status).toBe(404)
    expect(ServiceError.conflict('taken').status).toBe(409)
  })
})
