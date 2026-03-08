export function formatFileSize(bytes: number | null | undefined): string | null {
  if (bytes === null || bytes === undefined || bytes === 0) return null
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
