import { describe, expect, it, vi } from 'vitest'
import { RestEndpoint, type RestContext } from './rest'
import { ServiceError } from './errors'

function fakeCtx(method = 'GET'): RestContext {
  return {
    request: new Request('http://localhost/api/users', { method }),
    params: {},
    env: {},
  } as unknown as RestContext
}

describe('RestEndpoint.handle', () => {
  it('maps ServiceError to its HTTP status and message', async () => {
    class NotFoundEndpoint extends RestEndpoint {
      async get(): Promise<Response> {
        throw ServiceError.notFound('User not found')
      }
    }
    const res = await new NotFoundEndpoint().handle(fakeCtx('GET'))
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ error: 'User not found' })
  })

  it('maps unexpected errors to 500 without leaking internals by default', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      class BoomEndpoint extends RestEndpoint {
        async get(): Promise<Response> {
          throw new Error('kaboom')
        }
      }
      const res = await new BoomEndpoint().handle(fakeCtx('GET'))
      expect(res.status).toBe(500)
      expect(await res.json()).toMatchObject({ error: 'Internal Server Error' })
    } finally {
      consoleSpy.mockRestore()
    }
  })

  it('returns 405 for unimplemented methods', async () => {
    class GetOnlyEndpoint extends RestEndpoint {
      async get(): Promise<Response> {
        return this.json({ ok: true })
      }
    }
    const res = await new GetOnlyEndpoint().handle(fakeCtx('POST'))
    expect(res.status).toBe(405)
  })
})
