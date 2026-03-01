import { describe, it, expect, vi } from 'vitest'
import { hashToken, generateToken, randomUUID } from './crypto-util'

describe('hashToken', () => {
  it('returns hex string', async () => {
    const out = await hashToken('hello')
    expect(out).toMatch(/^[0-9a-f]+$/)
    expect(out.length).toBe(64)
  })

  it('same input gives same hash', async () => {
    const a = await hashToken('same')
    const b = await hashToken('same')
    expect(a).toBe(b)
  })

  it('different input gives different hash', async () => {
    const a = await hashToken('a')
    const b = await hashToken('b')
    expect(a).not.toBe(b)
  })
})

describe('generateToken', () => {
  it('returns string of length 20', () => {
    const token = generateToken()
    expect(typeof token).toBe('string')
    expect(token.length).toBe(20)
  })

  it('returns alphanumeric when crypto.randomUUID is available', () => {
    const token = generateToken()
    expect(token).toMatch(/^[a-zA-Z0-9]+$/)
  })
})

describe('randomUUID', () => {
  it('returns non-empty string', () => {
    const id = randomUUID()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })
})
