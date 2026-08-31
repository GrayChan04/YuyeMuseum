const ARCHIVE_DATE_PATTERN = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/
const SAFE_HTTP_PATTERN = /^https?:\/\//i

/**
 * Format the deliberately imprecise dates used by the archive without
 * inventing a missing month or day.
 */
export function formatArchiveDate(value, isApproximate = false) {
  const match = typeof value === 'string' ? value.match(ARCHIVE_DATE_PATTERN) : null
  if (!match) return '时间待考'

  const formatted = [match[1], match[2], match[3]].filter(Boolean).join('.')
  return isApproximate ? `约 ${formatted}` : formatted
}

// Kept for existing collection cards while callers migrate to the clearer name.
export function formatMonth(value, isApproximate = false) {
  return formatArchiveDate(value, isApproximate)
}

export function formatChinaTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间待考'

  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}.${get('month')}.${get('day')} ${get('hour')}:${get('minute')}`
}

export function publicAsset(path) {
  if (typeof path !== 'string' || !path.trim()) return ''

  const normalizedPath = path.trim()
  if (/^(?:data:|blob:|https?:)/i.test(normalizedPath)) return normalizedPath
  return `${import.meta.env.BASE_URL}${normalizedPath.replace(/^\/+/, '')}`
}

export function isSafeHttpUrl(value) {
  if (typeof value !== 'string' || !SAFE_HTTP_PATTERN.test(value.trim())) return false

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function isLocalPublicAsset(value) {
  if (typeof value !== 'string') return false

  const normalizedPath = value.trim()
  return Boolean(normalizedPath) && !/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(normalizedPath)
}
