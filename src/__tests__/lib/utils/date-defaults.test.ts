import { describe, it, expect, vi, afterEach } from 'vitest'
import { defaultScheduledStart, defaultScheduledEnd, toDatetimeLocal, datetimeLocalToISO } from '@/lib/utils/date-defaults'

describe('date-defaults', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('defaultScheduledStart', () => {
    it('returns today with minutes and seconds zeroed', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 2, 8, 14, 37, 45)) // 2026-03-08 14:37:45

      expect(defaultScheduledStart()).toBe('2026-03-08T14:00')
    })

    it('returns valid datetime-local format', () => {
      const result = defaultScheduledStart()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    })
  })

  describe('defaultScheduledEnd', () => {
    it('returns today at 23:59', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 2, 8, 14, 37, 45))

      expect(defaultScheduledEnd()).toBe('2026-03-08T23:59')
    })

    it('returns valid datetime-local format', () => {
      const result = defaultScheduledEnd()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    })
  })

  describe('toDatetimeLocal', () => {
    it('formats a Date to datetime-local string using local time', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 2, 8, 14, 30, 0))
      const d = new Date(2026, 2, 8, 14, 30, 0)
      expect(toDatetimeLocal(d)).toBe('2026-03-08T14:30')
    })
  })

  describe('datetimeLocalToISO', () => {
    it('returns a string with timezone offset', () => {
      const result = datetimeLocalToISO('2026-03-08T14:00')
      // Should contain a timezone offset like +08:00 or -05:00
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/)
    })

    it('preserves the local time components', () => {
      const result = datetimeLocalToISO('2026-03-08T14:00')
      expect(result).toMatch(/^2026-03-08T14:00:00/)
    })

    it('round-trips with toDatetimeLocal', () => {
      const input = '2026-03-08T14:00'
      const iso = datetimeLocalToISO(input)
      const roundTripped = toDatetimeLocal(new Date(iso))
      expect(roundTripped).toBe(input)
    })
  })
})
