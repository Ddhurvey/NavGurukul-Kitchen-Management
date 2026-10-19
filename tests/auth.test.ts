import { afterEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import { createAuthToken, getJwtSecret } from '../src/lib/auth'

const originalSecret = process.env.JWT_SECRET

afterEach(() => {
  if (originalSecret === undefined) delete process.env.JWT_SECRET
  else process.env.JWT_SECRET = originalSecret
})

describe('authentication token configuration', () => {
  it('fails closed when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET
    assert.throws(() => getJwtSecret(), /JWT_SECRET must be configured/)
  })

  it('rejects short JWT secrets', () => {
    process.env.JWT_SECRET = 'too-short'
    assert.throws(() => getJwtSecret(), /at least 32 characters/)
  })

  it('signs a token with expiry, issuer, audience and token version', () => {
    process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long'
    const token = createAuthToken({
      id: 'user-123',
      email: 'student@example.org',
      role: 'STUDENT',
      tokenVersion: 4
    })
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'navgurukul-kitchen-management',
      audience: 'navgurukul-web'
    }) as jwt.JwtPayload

    assert.equal(decoded.userId, 'user-123')
    assert.equal(decoded.email, 'student@example.org')
    assert.equal(decoded.role, 'STUDENT')
    assert.equal(decoded.tokenVersion, 4)
    assert.ok(typeof decoded.exp === 'number')
  })
})
