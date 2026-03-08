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
function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
