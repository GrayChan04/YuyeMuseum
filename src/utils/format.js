export function formatMonth(value) {
  if (!value) return '时间待考'
  const [year, month] = value.split('-')
  return `${year}.${month}`
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
  if (/^(?:data:|blob:|https?:)/.test(path)) return path
  return `${import.meta.env.BASE_URL}${path}`
}
