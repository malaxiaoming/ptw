/** Returns datetime-local string for now, rounded down to current hour */
export function defaultScheduledStart(): string {
  const now = new Date()
  now.setMinutes(0, 0, 0)
  return toDatetimeLocal(now)
}

/** Returns datetime-local string for end of today (23:59) */
export function defaultScheduledEnd(): string {
  const now = new Date()
  now.setHours(23, 59, 0, 0)
  return toDatetimeLocal(now)
}

/** Formats a Date to `YYYY-MM-DDTHH:mm` for <input type="datetime-local"> */
export function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Converts a datetime-local string (no TZ) to ISO 8601 with local timezone offset */
export function datetimeLocalToISO(value: string): string {
  const d = new Date(value)
  const offset = -d.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const absOffset = Math.abs(offset)
  const hours = String(Math.floor(absOffset / 60)).padStart(2, '0')
  const minutes = String(absOffset % 60).padStart(2, '0')
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${hours}:${minutes}`
}
