import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const [command, filename, flag] = process.argv.slice(2)
const check = (condition, message) => { if (!condition) throw new Error(message) }
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const nonempty = value => typeof value === 'string' && value.trim().length > 0
const isHttp = value => typeof value === 'string' && /^https?:\/\//i.test(value.trim())

function compactSource(source, format = 'picture', fallbackScreenshot = '') {
  const unavailable = ['unavailable', 'missing'].includes(source?.status) || source?.isexist === false
  const screenshot = source?.archiveAsset || fallbackScreenshot || ''
  return {
    isexist: !unavailable,
    caption: source?.label || source?.caption || '',
    format: format === 'text' ? 'picture' : format,
    url: !unavailable && isHttp(source?.url) ? source.url : '',
    screenshotpath: screenshot,
  }
}

function compactKeyword(research, approved, previousRecord = {}) {
  const publicationKeyword = research.publication.keyword
  const previousNodes = Array.isArray(previousRecord.nodes) ? previousRecord.nodes : []
  const nodeByKey = new Map(previousNodes.map(node => [`${node.date}|${node.title}`, node]))

  for (const candidate of approved) {
    const display = candidate.displayNode
    const screenshots = display.evidence?.screenshots || []
    const sources = []
    const appendSource = (source, format) => {
      if (!source) return
      const screenshot = screenshots.find(item => item.sourceId === source.id)?.src || ''
      sources.push(compactSource(source, format || source.format || 'picture', screenshot))
    }
    ;(display.sources || []).forEach(source => appendSource(source))
    ;(display.images || []).forEach(image => appendSource(image.source, 'picture'))
    ;(display.audio || []).forEach(audio => appendSource(audio.source, 'audio'))
    ;(display.videos || []).forEach(video => appendSource(video.source, 'video'))

    const node = {
      date: display.time,
      title: display.title,
      description: Array.isArray(display.body) && display.body.length
        ? display.body.join('\n')
        : (display.summary || ''),
      sources,
    }
    nodeByKey.set(`${node.date}|${node.title}`, node)
  }

  return {
    aliases: publicationKeyword.aliases || [],
    description: publicationKeyword.description || publicationKeyword.intro || publicationKeyword.summary || '',
    coverimagepath: publicationKeyword.coverimagepath || '',
    tags: publicationKeyword.tags || [],
    startdate: publicationKeyword.startdate || publicationKeyword.startTime || '',
    nodes: [...nodeByKey.values()].sort((a, b) => String(a.date).localeCompare(String(b.date))),
  }
}
try {
  check(['validate', 'export'].includes(command) && filename && (!flag || flag === '--write'), '用法: research.mjs validate|export Research/ID.json [--write]')
  const research = JSON.parse(fs.readFileSync(filename, 'utf8'))
  check(research.schemaVersion === 1 && typeof research.id === 'string' && idPattern.test(research.id) && nonempty(research.name), '研究版本、ID 或名称无效')
  for (const field of ['aliases', 'searchLog', 'sources', 'candidates', 'decisions', 'questions']) check(Array.isArray(research[field]), `${field} 必须是数组`)
  const registries = {}
  for (const field of ['sources', 'candidates', 'decisions']) {
    const ids = research[field].map(item => item.id)
    check(ids.every(id => typeof id === 'string' && idPattern.test(id)) && new Set(ids).size === ids.length, `${field} ID 无效或重复`)
    registries[field] = new Set(ids)
  }
  for (const source of research.sources) {
    check(/^https?:$/.test(new URL(source.url).protocol), `${source.id}: 来源链接无效`)
    check(['snippet', 'text', 'video', 'blocked'].includes(source.access), `${source.id}: 访问状态无效`)
    check(nonempty(source.platform) && nonempty(source.account), `${source.id}: 缺少来源平台或账号（未知须注明）`)
  }
  for (const decision of research.decisions) {
    check(decision.actor === 'curator' && /^\d{4}-\d{2}-\d{2}$/.test(decision.date) && nonempty(decision.reason), `${decision.id}: 馆主记录不完整`)
    check(['approve', 'reject', 'allow-missing'].includes(decision.action) && Array.isArray(decision.candidateIds) && decision.candidateIds.length > 0, `${decision.id}: 决定范围无效`)
    check(decision.candidateIds.every(id => id === research.id || registries.candidates.has(id)), `${decision.id}: 决定引用不存在`)
  }
  const decisionFor = (id, candidateId, action) => research.decisions.some(d => d.id === id && d.actor === 'curator' && d.date && d.reason && d.action === action && d.candidateIds?.includes(candidateId))
  for (const candidate of research.candidates) {
    check(['pending', 'approved', 'rejected'].includes(candidate.review), `${candidate.id}: 审阅状态无效`)
    check(Array.isArray(candidate.claims) && Array.isArray(candidate.relations) && Array.isArray(candidate.sourceIds), `${candidate.id}: 缺少说法、关联或来源数组`)
    check(candidate.sourceIds.every(id => registries.sources.has(id)), `${candidate.id}: 来源引用不存在`)
    check(candidate.claims.every(nonempty) && typeof candidate.uncertainty === 'string', `${candidate.id}: 说法和不确定性说明必须是文字`)
    check(candidate.relations.every(r => registries.candidates.has(r.targetId) && ['explicit', 'inferred'].includes(r.basis)), `${candidate.id}: 关联无效`)
    if (candidate.review === 'approved') {
      check(decisionFor(candidate.decisionId, candidate.id, 'approve'), `${candidate.id}: 缺少馆主批准记录`)
      check(candidate.displayNode?.id === candidate.id && candidate.eventDate === candidate.displayNode.time, `${candidate.id}: 展示节点 ID/时间不匹配`)
      check(candidate.displayNode.evidence, `${candidate.id}: 缺少凭证区域`)
      check(candidate.claims.length > 0 && candidate.sourceIds.length > 0, `${candidate.id}: 获批节点必须保留说法与来源`)
      check(Array.isArray(candidate.displayNode.sources) && candidate.displayNode.sources.length > 0 && candidate.displayNode.sources.every(s => candidate.sourceIds.some(id => research.sources.find(r => r.id === id)?.url === s.url)), `${candidate.id}: 展示来源未在研究来源中记录`)
      check(['available', 'missing'].includes(candidate.displayNode.evidence.status), `${candidate.id}: 凭证状态无效`)
      if (candidate.displayNode.evidence.status === 'available') {
        check(Array.isArray(candidate.displayNode.evidence.screenshots) && candidate.displayNode.evidence.screenshots.length > 0, `${candidate.id}: 获批节点必须提供出处截图`)
      }
      if (candidate.displayNode.evidence.status === 'missing') {
        check(candidate.displayNode.evidence.missingApproved === true, `${candidate.id}: 缺图凭证尚未获得馆主放行`)
        check(research.decisions.some(d => decisionFor(d.id, candidate.id, 'allow-missing')), `${candidate.id}: 缺少馆主缺图放行记录`)
      }
    }
  }
  if (command === 'validate') { console.log(`研究校验通过：${research.name}，${research.candidates.length} 个候选节点。`); process.exit(0) }
  const publication = research.publication
  check(publication?.review === 'approved' && publication.keyword?.id === research.id, '馆藏整体尚未批准或 ID 不匹配')
  check(decisionFor(publication.decisionId, research.id, 'approve'), '缺少馆藏整体批准记录')
  check(Array.isArray(publication.keyword.nodes) && publication.keyword.nodes.length === 0, 'publication.keyword.nodes 必须为空，由候选生成')
  const dataPath = path.join(root, 'src/data/keywords.json')
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
  const keywordList = Array.isArray(data) ? data : data.keywords
  check(Array.isArray(keywordList), '正式馆藏数据必须是数组或包含 keywords 数组的对象')
  const approved = research.candidates.filter(c => c.review === 'approved')
  check(approved.length > 0, '没有获批节点')
  const compactStorage = Array.isArray(data)
  const compactEntryIndex = compactStorage
    ? keywordList.findIndex(entry => Object.prototype.hasOwnProperty.call(entry || {}, research.name))
    : -1
  const previousCompact = compactEntryIndex >= 0 ? keywordList[compactEntryIndex][research.name] : {}
  const keyword = compactStorage
    ? { [research.name]: compactKeyword(research, approved, previousCompact) }
    : { ...publication.keyword, nodes: approved.map(candidate => ({ ...candidate.displayNode, uncertainty: candidate.uncertainty || '' })) }
  const index = compactStorage
    ? compactEntryIndex
    : keywordList.findIndex(k => k.id === research.id)
  if (index < 0) keywordList.push(keyword)
  else keywordList[index] = keyword
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'yuye-validation-'))
  try {
    fs.writeFileSync(path.join(temp, 'keywords.json'), JSON.stringify(data, null, 2) + '\n')
    for (const name of ['community.json', 'curator-notes.json']) fs.copyFileSync(path.join(root, 'src/data', name), path.join(temp, name))
    const result = spawnSync(process.execPath, [path.join(root, 'scripts/validate-content.mjs')], { env: { ...process.env, YUYE_VALIDATE_DATA_DIR: temp }, encoding: 'utf8' })
    check(result.status === 0, result.stderr || result.error?.message || '展示校验失败')
    console.log(JSON.stringify(keyword, null, 2))
    if (flag === '--write') fs.copyFileSync(path.join(temp, 'keywords.json'), dataPath)
    console.log(flag === '--write' ? '已写入正式馆藏。' : '预览通过，未写入；批准范围核对后使用 --write。')
  } finally {
    for (const name of ['keywords.json', 'community.json', 'curator-notes.json']) { const file = path.join(temp, name); if (fs.existsSync(file)) fs.unlinkSync(file) }
    fs.rmdirSync(temp)
  }
} catch (error) { console.error(error.message); process.exitCode = 1 }
