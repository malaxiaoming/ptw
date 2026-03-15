import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Use a fixed test key (32 bytes = 64 hex chars)
const TEST_KEY = 'a'.repeat(64)

describe('crypto', () => {
  beforeEach(() => {
    vi.stubEnv('WORKER_DATA_ENCRYPTION_KEY', TEST_KEY)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('round-trips encrypt and decrypt', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto')
    const plaintext = 'S1234567A'
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(plaintext)
  })

  it('produces different ciphertext for same input (random IV)', async () => {
    const { encrypt } = await import('@/lib/crypto')
    const plaintext = 'S1234567A'
    const a = encrypt(plaintext)
    const b = encrypt(plaintext)
    expect(a).not.toBe(b)
  })

  it('throws on tampered ciphertext', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto')
    const encrypted = encrypt('S1234567A')
    // Tamper with the ciphertext
    const buf = Buffer.from(encrypted, 'base64')
    buf[15] = buf[15] ^ 0xff
    const tampered = buf.toString('base64')
    expect(() => decrypt(tampered)).toThrow()
  })

  it('throws if encryption key is missing', async () => {
    vi.stubEnv('WORKER_DATA_ENCRYPTION_KEY', '')
    const { encrypt } = await import('@/lib/crypto')
    expect(() => encrypt('test')).toThrow('WORKER_DATA_ENCRYPTION_KEY must be a 64-character hex string')
  })

  it('throws if encryption key is wrong length', async () => {
    vi.stubEnv('WORKER_DATA_ENCRYPTION_KEY', 'abcd1234')
    const { encrypt } = await import('@/lib/crypto')
    expect(() => encrypt('test')).toThrow('WORKER_DATA_ENCRYPTION_KEY must be a 64-character hex string')
  })
})
