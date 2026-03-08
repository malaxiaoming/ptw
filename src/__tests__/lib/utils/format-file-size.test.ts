import { describe, it, expect } from 'vitest'
import { formatFileSize } from '@/lib/utils/format-file-size'

describe('formatFileSize', () => {
  it('returns null for null', () => {
    expect(formatFileSize(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(formatFileSize(undefined)).toBeNull()
  })

  it('returns null for 0', () => {
    expect(formatFileSize(0)).toBeNull()
  })

  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 bytes')
  })

  it('formats KB', () => {
    expect(formatFileSize(1024)).toBe('1 KB')
  })

  it('formats KB for larger values', () => {
    expect(formatFileSize(512000)).toBe('500 KB')
  })

  it('formats MB with one decimal', () => {
    expect(formatFileSize(1048576)).toBe('1.0 MB')
  })

  it('formats MB with fractional value', () => {
    expect(formatFileSize(1572864)).toBe('1.5 MB')
  })
})
