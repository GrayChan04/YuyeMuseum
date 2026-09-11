import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('入馆批准、缺图放行、预览、幂等合并与失败保护', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'yuye-research-test-'))
  const files = []
  const dirs = ['scripts', 'src', 'src/data', 'public']
  const write = (name, data) => {
    if (!files.includes(name)) files.push(name)
    fs.writeFileSync(path.join(temp, name), typeof data === 'string' ? data : JSON.stringify(data))
  }
  try {
    dirs.forEach(dir => fs.mkdirSync(path.join(temp, dir)))
    for (const name of ['research.mjs', 'validate-content.mjs']) write(`scripts/${name}`, fs.readFileSync(path.join(root, 'scripts', name), 'utf8'))
    for (const name of ['community.json', 'curator-notes.json']) write(`src/data/${name}`, fs.readFileSync(path.join(root, 'src/data', name), 'utf8'))
    write('src/data/keywords.json', { keywords: [] })
    const source = { id: 'test-source', platform: '测试', account: '测试账号', label: '测试出处', url: 'https://example.com/source' }
    const node = { id: 'test-node', time: '2026-09-11', title: '仅测试', summary: '仅测试', body: ['仅测试'], sources: [source], images: [], audio: [], videos: [], evidence: { status: 'missing', screenshots: [], missingApproved: true } }
    const decision = (id, target, action) => ({ id, actor: 'curator', date: '2026-09-11', candidateIds: [target], action, reason: '仅测试夹具，不是真实馆主决定' })
    const research = {
      schemaVersion: 1, id: 'test-collection', name: '测试馆藏', aliases: [], searchLog: [], questions: [],
      sources: [{ ...source, access: 'text' }],
      candidates: [{ id: node.id, eventDate: node.time, claims: ['测试'], relations: [], sourceIds: [source.id], review: 'approved', decisionId: 'approve-node', uncertainty: '', displayNode: node }],
      decisions: [decision('approve-node', node.id, 'approve'), decision('allow-missing', node.id, 'allow-missing'), decision('approve-collection', 'test-collection', 'approve')],
      publication: { review: 'approved', decisionId: 'approve-collection', keyword: { id: 'test-collection', name: '测试馆藏', aliases: [], summary: '测试', intro: '测试', startTime: node.time, origin: { label: '测试出处', url: source.url }, nodes: [] } },
    }
    const run = (...args) => spawnSync(process.execPath, [path.join(temp, 'scripts/research.mjs'), ...args, path.join(temp, 'research.json')], { encoding: 'utf8' })
    const exportData = (value, writeFlag = false) => {
      write('research.json', value)
      return spawnSync(process.execPath, [path.join(temp, 'scripts/research.mjs'), 'export', path.join(temp, 'research.json'), ...(writeFlag ? ['--write'] : [])], { encoding: 'utf8' })
    }
    const readData = () => fs.readFileSync(path.join(temp, 'src/data/keywords.json'), 'utf8')
    let result = exportData(research)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(JSON.parse(readData()).keywords.length, 0, '预览不得写入')
    for (const mutate of [
      r => { r.publication.review = 'pending' },
      r => { r.decisions = r.decisions.filter(d => d.id !== 'approve-node') },
      r => { r.decisions[0].actor = 'model' },
      r => { r.decisions = r.decisions.filter(d => d.id !== 'allow-missing') },
      r => { r.candidates[0].displayNode.evidence.missingApproved = false },
      r => { r.candidates[0].displayNode.evidence = { status: 'available', screenshots: [] } },
      r => { r.candidates[0].displayNode.sources[0].url = 'https://example.com/unresearched' },
      r => { r.candidates[0].displayNode.time = '2026-99-99'; r.candidates[0].eventDate = '2026-99-99' },
    ]) {
      const invalid = structuredClone(research)
      mutate(invalid)
      const before = readData()
      result = exportData(invalid, true)
      assert.notEqual(result.status, 0, '无效研究不得写入')
      assert.equal(readData(), before, '失败不得修改正式内容')
    }
    result = exportData(research, true)
    assert.equal(result.status, 0, result.stderr)
    const once = readData()
    result = exportData(research, true)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(readData(), once, '重复导出必须幂等')
    const supplement = structuredClone(research)
    supplement.candidates[0].id = 'test-next'
    supplement.candidates[0].displayNode.id = 'test-next'
    supplement.candidates[0].displayNode.sources[0].id = 'next-source'
    supplement.decisions.slice(0, 2).forEach(d => { d.candidateIds = ['test-next'] })
    result = exportData(supplement, true)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(JSON.parse(readData()).keywords[0].nodes.length, 2, '补充不得删除已发布节点')
    write('research.json', { ...research, candidates: [], decisions: [], publication: { review: 'pending', keyword: null } })
    assert.equal(run('validate').status, 0, '允许不完整但结构正确的待审草稿')
  } finally {
    // Only remove files and empty directories created in this test's unique directory.
    for (const name of files) fs.unlinkSync(path.join(temp, name))
    for (const dir of [...dirs].reverse()) fs.rmdirSync(path.join(temp, dir))
    fs.rmdirSync(temp)
  }
})
