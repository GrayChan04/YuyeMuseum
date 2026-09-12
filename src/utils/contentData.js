import { isSafeHttpUrl, publicAsset } from './format'

const dataAssets = import.meta.glob('../data/**/*.{jpg,jpeg,png,webp,mp3,m4a,aac,ogg,wav}', {
  eager: true,
  import: 'default',
  query: '?url',
})

function hash(value) {
  let result = 2166136261
  for (const character of String(value)) {
    result ^= character.codePointAt(0)
    result = Math.imul(result, 16777619)
  }
  return (result >>> 0).toString(36)
}

function stableId(...parts) {
  return `item-${hash(parts.join('|'))}`
}

function asBoolean(value, fallback = true) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true
    if (value.toLowerCase() === 'false') return false
  }
  return fallback
}

function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function dataAsset(value) {
  const raw = text(value)
  if (!raw) return ''
  if (/^(?:data:|blob:|https?:)/i.test(raw)) return raw

  const relative = raw
    .replace(/^\/?YuyeMuseum[\\/]src[\\/]data[\\/]/i, '')
    .replace(/^\/?src[\\/]data[\\/]/i, '')
    .replace(/^\/+/, '')
    .replaceAll('\\', '/')
  const key = Object.keys(dataAssets).find((candidate) => (
    candidate === `../data/${relative}` || candidate.endsWith(`/data/${relative}`)
  ))
  return key ? dataAssets[key] : publicAsset(raw)
}

function sourceFormat(value) {
  const format = text(value).toLowerCase()
  return ['picture', 'video', 'audio'].includes(format) ? format : 'picture'
}

function sourceDescription(source, format) {
  return text(source.caption) || ({ picture: '图片出处', video: '视频出处', audio: '音频出处' }[format] || '出处')
}

function normalizeSource(source, keywordName, nodeKey, sourceIndex) {
  const raw = source && typeof source === 'object' ? source : {}
  const format = sourceFormat(raw.format)
  const exists = asBoolean(raw.isexist, raw.status !== 'unavailable')
  const url = text(raw.url)
  const screenshotpath = text(raw.screenshotpath)
  const originalUrl = exists && isSafeHttpUrl(url) ? url : ''
  const archiveAsset = !exists && screenshotpath ? screenshotpath : ''
  const missing = !screenshotpath
  const pending = exists && !originalUrl && !url && Boolean(screenshotpath)

  return {
    id: text(raw.id) || stableId(keywordName, nodeKey, sourceIndex),
    platform: text(raw.platform) || '',
    account: text(raw.account) || '',
    label: sourceDescription(raw, format),
    caption: text(raw.caption),
    format,
    url: originalUrl,
    screenshotpath,
    screenshotSrc: screenshotpath ? dataAsset(screenshotpath) : '',
    mediaSrc: format === 'audio' && url && !isSafeHttpUrl(url) ? dataAsset(url) : '',
    archiveAsset,
    archiveUrl: '',
    status: missing ? 'missing' : (exists ? 'active' : 'unavailable'),
    isexist: exists,
    pending,
    missing,
  }
}

function normalizeTemplateNode(node, keywordName, index) {
  const raw = node && typeof node === 'object' ? node : {}
  const date = text(raw.date)
  const title = text(raw.title) || `节点 ${index + 1}`
  const key = `${date}|${title}|${index}`
  const sources = Array.isArray(raw.sources)
    ? raw.sources.map((source, sourceIndex) => normalizeSource(source, keywordName, key, sourceIndex))
    : []
  return {
    id: stableId(keywordName, key),
    time: date,
    isApproximate: false,
    title,
    summary: text(raw.description),
    body: text(raw.description) ? [text(raw.description)] : [],
    sources,
    images: [],
    audio: [],
    videos: [],
    templateSources: true,
  }
}

function normalizeLegacyNode(node) {
  const raw = node && typeof node === 'object' ? node : {}
  return {
    ...raw,
    id: raw.id || stableId(raw.time || raw.date || '', raw.title || ''),
    time: raw.time || raw.date || '',
    title: raw.title || '未命名节点',
    summary: raw.summary || raw.description || '',
    body: Array.isArray(raw.body) ? raw.body : (text(raw.description) ? [text(raw.description)] : []),
    sources: Array.isArray(raw.sources) ? raw.sources : [],
    images: Array.isArray(raw.images) ? raw.images : [],
    audio: Array.isArray(raw.audio) ? raw.audio : [],
    videos: Array.isArray(raw.videos) ? raw.videos : [],
    templateSources: false,
  }
}

function unwrapKeyword(entry, index) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return { name: `未命名馆藏 ${index + 1}`, raw: {} }
  }

  if (entry.id || entry.name || entry.startTime || entry.nodes?.[0]?.time) {
    return { name: text(entry.name) || `未命名馆藏 ${index + 1}`, raw: entry }
  }

  const named = Object.entries(entry).find(([, value]) => value && typeof value === 'object' && !Array.isArray(value))
  if (named) return { name: named[0], raw: named[1] }
  if (entry.keyword && typeof entry.keyword === 'object') {
    return { name: text(entry.name) || '未命名馆藏', raw: entry.keyword }
  }
  return { name: `未命名馆藏 ${index + 1}`, raw: entry }
}

function normalizeKeyword(entry, index) {
  const { name, raw } = unwrapKeyword(entry, index)
  const isTemplate = !raw.id && !raw.name && Array.isArray(raw.nodes) && raw.startdate !== undefined
  const aliases = Array.isArray(raw.aliases) ? raw.aliases.filter(Boolean) : []
  const tags = Array.isArray(raw.tags) ? raw.tags.filter(Boolean) : []
  const nodes = Array.isArray(raw.nodes)
    ? raw.nodes.map((node, nodeIndex) => isTemplate
      ? normalizeTemplateNode(node, name, nodeIndex)
      : normalizeLegacyNode(node))
    : []

  return {
    ...raw,
    id: text(raw.id) || stableId(name),
    name,
    aliases,
    summary: text(raw.summary) || text(raw.description),
    intro: text(raw.intro) || text(raw.description),
    startTime: text(raw.startTime) || text(raw.startdate),
    isApproximate: Boolean(raw.isApproximate),
    tags,
    coverImage: dataAsset(raw.coverImage || raw.coverimagepath),
    nodes,
    templateKeyword: isTemplate,
  }
}

export function keywordList(data) {
  const entries = Array.isArray(data) ? data : (Array.isArray(data?.keywords) ? data.keywords : [])
  return entries.map(normalizeKeyword)
}

export function curatorNoteList(data) {
  if (Array.isArray(data)) return data
  return Array.isArray(data?.notes) ? data.notes : []
}

export function resolveContentAsset(value) {
  return dataAsset(value)
}
