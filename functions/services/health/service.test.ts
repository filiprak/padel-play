import { describe, expect, it } from 'vitest'
import { getHealthStatus } from './service'

describe('getHealthStatus', () => {
  it('returns an ok status with version and uptime marker', () => {
    const before = Date.now()
    const res = getHealthStatus()
    const after = Date.now()
    expect(res.status).toBe('ok')
    expect(res.version).toBe('1.0.0')
    expect(typeof res.uptime).toBe('number')
    expect(res.uptime).toBeGreaterThanOrEqual(before)
    expect(res.uptime).toBeLessThanOrEqual(after)
  })
})
