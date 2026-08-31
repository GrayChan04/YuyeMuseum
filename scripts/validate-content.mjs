import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(scriptDirectory, '..')
const publicDirectory = path.join(repositoryRoot, 'public')
const dataDirectory = path.join(repositoryRoot, 'src', 'data')

const errors = []
const keywordIds = new Set()
const keywordNames = new Map()
const sourceIds = new Set()
const communityIds = new Set()
const noteIds = new Set()

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.aac', '.ogg', '.wav'])
const ARCHIVE_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, '.pdf'])
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const DATE_PATTERN = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/
const CHINA_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?\+08:00$/

function fail(location, message) {
  errors.push(`${location}: ${message}`)
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function readJson(filename) {
  const absolutePath = path.join(dataDirectory, filename)

  try {
    return JSON.parse(fs.readFileSync(absolutePath, 'utf8'))
  } catch (error) {
    fail(`src/data/${filename}`, `无法读取 JSON：${error.message}`)
    return null
  }
}

function requireRecord(value, location) {
  if (!isRecord(value)) {
    fail(location, '必须是对象')
    return false
  }

  return true
}

function requireArray(value, location) {
  if (!Array.isArray(value)) {
    fail(location, '必须是数组')
    return false
  }

  return true
}

function requireString(value, location, options = {}) {
  const { maxLength, allowEmpty = false } = options

  if (typeof value !== 'string') {
    fail(location, '必须是字符串')
    return false
  }

  if (!allowEmpty && !value.trim()) {
    fail(location, '不能为空')
    return false
  }

  if (maxLength && [...value].length > maxLength) {
    fail(location, `不能超过 ${maxLength} 个字符`)
    return false
  }

  return true
}

function validateId(value, location, registry) {
  if (!requireString(value, location)) return false

  if (!ID_PATTERN.test(value)) {
    fail(location, '只能使用小写英文字母、数字和连字符，且不能以连字符开头或结尾')
  }

  if (registry.has(value)) {
    fail(location, `ID “${value}” 重复`)
  } else {
    registry.add(value)
  }

  return true
}

function validateCalendarParts(yearText, monthText, dayText, location) {
  const year = Number(yearText)
  const month = monthText ? Number(monthText) : null
  const day = dayText ? Number(dayText) : null

  if (year < 1000 || year > 2999) {
    fail(location, '年份必须位于 1000–2999 之间')
    return false
  }

  if (month !== null && (month < 1 || month > 12)) {
    fail(location, '月份必须位于 01–12 之间')
    return false
  }

  if (day !== null) {
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
    if (day < 1 || day > lastDay) {
      fail(location, '日期不是有效的日历日期')
      return false
    }
  }

  return true
}

function validateFlexibleDate(value, location) {
  if (!requireString(value, location)) return false
  const match = value.match(DATE_PATTERN)

  if (!match) {
    fail(location, '必须使用 YYYY、YYYY-MM 或 YYYY-MM-DD')
    return false
  }

  return validateCalendarParts(match[1], match[2], match[3], location)
}

function validateFullDate(value, location) {
  if (!requireString(value, location)) return false
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (!match) {
    fail(location, '必须使用 YYYY-MM-DD')
    return false
  }

  return validateCalendarParts(match[1], match[2], match[3], location)
}

function validateChinaTimestamp(value, location) {
  if (!requireString(value, location)) return false
  const match = value.match(CHINA_TIMESTAMP_PATTERN)

  if (!match) {
    fail(location, '必须使用带 +08:00 时区的 ISO 时间，例如 2026-08-31T14:30:00+08:00')
    return false
  }

  const [, year, month, day, hour, minute, second] = match
  const calendarValid = validateCalendarParts(year, month, day, location)

  if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) {
    fail(location, '时、分或秒超出有效范围')
    return false
  }

  return calendarValid
}

function validateBooleanIfPresent(value, location) {
  if (value !== undefined && typeof value !== 'boolean') {
    fail(location, '存在时必须是布尔值')
  }
}

function validateHttpUrl(value, location, options = {}) {
  const { required = true } = options

  if (!required && (value === undefined || value === '')) return true
  if (!requireString(value, location)) return false

  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) {
      fail(location, '只允许 http 或 https 链接')
      return false
    }
  } catch {
    fail(location, '不是有效链接')
    return false
  }

  return true
}

function validatePublicFile(value, location, allowedExtensions, options = {}) {
  const { maxBytes } = options
  if (!requireString(value, location)) return false

  const relativePath = value.replace(/^\/+/, '')
  const segments = relativePath.split(/[\\/]/)

  if (!relativePath || segments.includes('..') || path.isAbsolute(relativePath)) {
    fail(location, '必须是 public 目录内的安全相对路径')
    return false
  }

  const absolutePath = path.resolve(publicDirectory, relativePath)
  const pathFromPublic = path.relative(publicDirectory, absolutePath)

  if (pathFromPublic.startsWith('..') || path.isAbsolute(pathFromPublic)) {
    fail(location, '路径不能离开 public 目录')
    return false
  }

  const extension = path.extname(absolutePath).toLowerCase()
  if (!allowedExtensions.has(extension)) {
    fail(location, `文件类型不受支持：${extension || '无扩展名'}`)
  }

  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    fail(location, `找不到 public/${relativePath}`)
    return false
  }

  if (maxBytes && fs.statSync(absolutePath).size > maxBytes) {
    fail(location, `文件不能超过 ${Math.round(maxBytes / 1024 / 1024)}MB`)
    return false
  }

  return true
}

function validateStringArray(value, location) {
  if (!requireArray(value, location)) return

  const seen = new Set()
  value.forEach((item, index) => {
    const itemLocation = `${location}[${index}]`
    if (!requireString(item, itemLocation)) return
    const normalized = item.trim().toLocaleLowerCase('zh-CN')
    if (seen.has(normalized)) fail(itemLocation, `数组内存在重复文字“${item}”`)
    seen.add(normalized)
  })
}

function registerKeywordName(value, location) {
  if (!requireString(value, location)) return
  const normalized = value.trim().toLocaleLowerCase('zh-CN')
  const previous = keywordNames.get(normalized)

  if (previous) {
    fail(location, `与 ${previous} 的名称或别名重复`)
  } else {
    keywordNames.set(normalized, location)
  }
}

function validateSource(source, location) {
  if (!requireRecord(source, location)) return

  validateId(source.id, `${location}.id`, sourceIds)
  requireString(source.platform, `${location}.platform`)
  requireString(source.account, `${location}.account`)
  requireString(source.label, `${location}.label`)

  const status = source.status ?? 'active'
  if (!['active', 'unavailable'].includes(status)) {
    fail(`${location}.status`, '只能是 active 或 unavailable')
  }

  if (status === 'active') {
    validateHttpUrl(source.url, `${location}.url`)
  } else {
    validateHttpUrl(source.url, `${location}.url`, { required: false })

    if (!source.archiveUrl && !source.archiveAsset) {
      fail(location, '失效来源必须提供 archiveUrl 或 archiveAsset 作为存档依据')
    }

    if (source.archiveUrl) validateHttpUrl(source.archiveUrl, `${location}.archiveUrl`)
    if (source.archiveAsset) {
      validatePublicFile(source.archiveAsset, `${location}.archiveAsset`, ARCHIVE_EXTENSIONS)
    }
  }
}

function validateOrigin(origin, location) {
  if (!requireRecord(origin, location)) return

  requireString(origin.label, `${location}.label`)
  const status = origin.status ?? 'active'

  if (!['active', 'unavailable'].includes(status)) {
    fail(`${location}.status`, '只能是 active 或 unavailable')
  }

  validateHttpUrl(origin.url, `${location}.url`, { required: false })

  if (status === 'unavailable') {
    if (!origin.archiveUrl && !origin.archiveAsset) {
      fail(location, '失效的经典出处必须提供 archiveUrl 或 archiveAsset 作为存档依据')
    }

    if (origin.archiveUrl) validateHttpUrl(origin.archiveUrl, `${location}.archiveUrl`)
    if (origin.archiveAsset) {
      validatePublicFile(origin.archiveAsset, `${location}.archiveAsset`, ARCHIVE_EXTENSIONS)
    }
  }
}

function validateImage(image, location) {
  if (!requireRecord(image, location)) return
  validatePublicFile(image.src, `${location}.src`, IMAGE_EXTENSIONS)
  requireString(image.alt, `${location}.alt`)
  validateSource(image.source, `${location}.source`)
}

function validateAudio(audio, location) {
  if (!requireRecord(audio, location)) return
  validatePublicFile(audio.src, `${location}.src`, AUDIO_EXTENSIONS)
  requireString(audio.title, `${location}.title`)
  validateSource(audio.source, `${location}.source`)
}

function validateVideo(video, location) {
  if (!requireRecord(video, location)) return
  requireString(video.title, `${location}.title`)
  validateHttpUrl(video.url, `${location}.url`)
  validateSource(video.source, `${location}.source`)
}

function validateNode(node, location, nodeIds) {
  if (!requireRecord(node, location)) return

  validateId(node.id, `${location}.id`, nodeIds)
  validateFlexibleDate(node.time, `${location}.time`)
  validateBooleanIfPresent(node.isApproximate, `${location}.isApproximate`)
  requireString(node.title, `${location}.title`)
  requireString(node.summary, `${location}.summary`)

  if (requireArray(node.body, `${location}.body`)) {
    if (node.body.length === 0) fail(`${location}.body`, '至少需要一段正文')
    node.body.forEach((paragraph, index) => requireString(paragraph, `${location}.body[${index}]`))
  }

  const collectionFields = [
    ['sources', validateSource],
    ['images', validateImage],
    ['audio', validateAudio],
    ['videos', validateVideo],
  ]

  collectionFields.forEach(([field, validator]) => {
    if (!requireArray(node[field], `${location}.${field}`)) return
    node[field].forEach((item, index) => validator(item, `${location}.${field}[${index}]`))
  })
}

function validateKeyword(keyword, location) {
  if (!requireRecord(keyword, location)) return

  validateId(keyword.id, `${location}.id`, keywordIds)
  registerKeywordName(keyword.name, `${location}.name`)
  validateStringArray(keyword.aliases, `${location}.aliases`)
  if (Array.isArray(keyword.aliases)) {
    keyword.aliases.forEach((alias, index) => registerKeywordName(alias, `${location}.aliases[${index}]`))
  }
  requireString(keyword.summary, `${location}.summary`)
  requireString(keyword.intro, `${location}.intro`)
  validateFlexibleDate(keyword.startTime, `${location}.startTime`)
  validateBooleanIfPresent(keyword.isApproximate, `${location}.isApproximate`)

  validateOrigin(keyword.origin, `${location}.origin`)

  if (requireArray(keyword.nodes, `${location}.nodes`)) {
    if (keyword.nodes.length === 0) fail(`${location}.nodes`, '正式馆藏至少需要一个时间节点')
    const nodeIds = new Set()
    keyword.nodes.forEach((node, index) => validateNode(node, `${location}.nodes[${index}]`, nodeIds))
  }
}

function validateKeywords(data) {
  if (!requireRecord(data, 'src/data/keywords.json')) return
  if (!requireArray(data.keywords, 'keywords')) return
  data.keywords.forEach((keyword, index) => validateKeyword(keyword, `keywords[${index}]`))
}

function validatePublishedAttachments(item, location) {
  const fieldNames = ['attachments', 'images'].filter((field) => item[field] !== undefined)

  if (fieldNames.length > 1) {
    fail(location, 'attachments 与旧兼容字段 images 不能同时存在')
  }

  fieldNames.forEach((field) => {
    const attachments = item[field]
    if (!requireArray(attachments, `${location}.${field}`)) return
    if (attachments.length > 3) fail(`${location}.${field}`, '公开内容最多包含 3 张图片')

    attachments.forEach((attachment, index) => {
      const attachmentLocation = `${location}.${field}[${index}]`
      if (!requireRecord(attachment, attachmentLocation)) return
      validatePublicFile(attachment.src, `${attachmentLocation}.src`, IMAGE_EXTENSIONS, {
        maxBytes: 5 * 1024 * 1024,
      })
      if (attachment.alt !== undefined) {
        requireString(attachment.alt, `${attachmentLocation}.alt`, { allowEmpty: true })
      }
    })
  })
}

function validateMessage(message, location) {
  if (!requireRecord(message, location)) return

  validateId(message.id, `${location}.id`, communityIds)
  if (message.parentId !== null && message.parentId !== undefined) {
    requireString(message.parentId, `${location}.parentId`)
  }
  if (message.replyToName !== null && message.replyToName !== undefined) {
    requireString(message.replyToName, `${location}.replyToName`, { maxLength: 20 })
  }

  if (typeof message.isAnonymous !== 'boolean') {
    fail(`${location}.isAnonymous`, '必须是布尔值')
  }

  if (!message.isAnonymous) {
    requireString(message.author, `${location}.author`, { maxLength: 20 })
  } else if (message.author !== undefined) {
    requireString(message.author, `${location}.author`, { maxLength: 20 })
  }

  requireString(message.content, `${location}.content`, { maxLength: 500 })
  validateChinaTimestamp(message.createdAt, `${location}.createdAt`)
  validatePublishedAttachments(message, location)
}

function validateOpinion(opinion, location) {
  if (!requireRecord(opinion, location)) return

  validateId(opinion.id, `${location}.id`, communityIds)
  requireString(opinion.content, `${location}.content`, { maxLength: 500 })
  validateChinaTimestamp(opinion.createdAt, `${location}.createdAt`)
  validatePublishedAttachments(opinion, location)

  if (opinion.curatorReply !== null && opinion.curatorReply !== undefined) {
    const replyLocation = `${location}.curatorReply`
    if (requireRecord(opinion.curatorReply, replyLocation)) {
      requireString(opinion.curatorReply.content, `${replyLocation}.content`, { maxLength: 500 })
      validateChinaTimestamp(opinion.curatorReply.createdAt, `${replyLocation}.createdAt`)

      if (
        typeof opinion.createdAt === 'string' &&
        typeof opinion.curatorReply.createdAt === 'string' &&
        Date.parse(opinion.curatorReply.createdAt) < Date.parse(opinion.createdAt)
      ) {
        fail(`${replyLocation}.createdAt`, '馆主回复时间不能早于意见时间')
      }
    }
  }
}

function validateMessageRelationships(messages) {
  const byId = new Map(messages.filter(isRecord).map((message) => [message.id, message]))

  messages.forEach((message, index) => {
    if (!isRecord(message) || !message.parentId) return
    const location = `messages[${index}]`
    const parent = byId.get(message.parentId)

    if (!parent) {
      fail(`${location}.parentId`, `找不到父回复“${message.parentId}”`)
      return
    }

    if (Date.parse(message.createdAt) < Date.parse(parent.createdAt)) {
      fail(`${location}.createdAt`, '回复时间不能早于父留言或父回复')
    }

    const visited = new Set([message.id])
    let ancestor = parent

    while (ancestor) {
      if (visited.has(ancestor.id)) {
        fail(`${location}.parentId`, '回复关系形成循环')
        break
      }
      visited.add(ancestor.id)
      ancestor = ancestor.parentId ? byId.get(ancestor.parentId) : null
    }
  })
}

function validateCommunity(data) {
  if (!requireRecord(data, 'src/data/community.json')) return
  const messagesValid = requireArray(data.messages, 'messages')
  const opinionsValid = requireArray(data.opinions, 'opinions')

  if (messagesValid) {
    data.messages.forEach((message, index) => validateMessage(message, `messages[${index}]`))
    validateMessageRelationships(data.messages)
  }

  if (opinionsValid) {
    data.opinions.forEach((opinion, index) => validateOpinion(opinion, `opinions[${index}]`))
  }
}

function validateCuratorNotes(data) {
  if (!requireRecord(data, 'src/data/curator-notes.json')) return
  if (!requireArray(data.notes, 'notes')) return

  data.notes.forEach((note, index) => {
    const location = `notes[${index}]`
    if (!requireRecord(note, location)) return
    validateId(note.id, `${location}.id`, noteIds)
    validateFullDate(note.date, `${location}.date`)
    requireString(note.content, `${location}.content`)
  })
}

function rejectDemoMarkers(value, location) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectDemoMarkers(item, `${location}[${index}]`))
    return
  }

  if (!isRecord(value)) return

  Object.entries(value).forEach(([key, child]) => {
    if (key === 'isDemo') fail(`${location}.${key}`, '正式数据中不能保留演示标记')
    rejectDemoMarkers(child, `${location}.${key}`)
  })
}

const keywords = readJson('keywords.json')
const community = readJson('community.json')
const curatorNotes = readJson('curator-notes.json')

if (keywords) {
  validateKeywords(keywords)
  rejectDemoMarkers(keywords, 'keywords')
}
if (community) {
  validateCommunity(community)
  rejectDemoMarkers(community, 'community')
}
if (curatorNotes) {
  validateCuratorNotes(curatorNotes)
  rejectDemoMarkers(curatorNotes, 'curatorNotes')
}

function findDemoAssets(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) return findDemoAssets(absolutePath)
    if (!entry.isFile() || !entry.name.startsWith('demo-')) return []
    return [path.relative(publicDirectory, absolutePath).split(path.sep).join('/')]
  })
}

const leftoverDemoAssets = findDemoAssets(publicDirectory)

if (leftoverDemoAssets.length) {
  fail('public', `仍存在演示素材：${leftoverDemoAssets.join('、')}`)
}

if (errors.length) {
  console.error(`\n内容校验失败（${errors.length} 项）：`)
  errors.forEach((error) => console.error(`- ${error}`))
  process.exitCode = 1
} else {
  console.log(
    `内容校验通过：${keywords.keywords.length} 件馆藏、${community.messages.length} 条留言或回复、` +
      `${community.opinions.length} 条意见、${curatorNotes.notes.length} 则馆主的话。`,
  )
}
