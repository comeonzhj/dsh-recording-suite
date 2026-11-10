import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, stat, utimes } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'

import {
  applyConfigToEntry,
  asrStatus,
  defaultStorageDir,
  mergeConfigBody,
  normalizeConfig,
  publicConfig,
} from '../host/config.mjs'
import {
  countsOf,
  createStore,
  decodeBase64Audio,
  guessFormat,
  makeRecordingId,
  parseTranscriptMarkdown,
  serializeTranscriptMarkdown,
  snippetOf,
  updateFrontmatterField,
} from '../host/store.mjs'

let dir

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dsh-recording-store-'))
})

after(async () => {
  await rm(dir, { recursive: true, force: true })
})

const WAV = Buffer.from('RIFF....WAVEfmt ')

test('config: defaults, env key, ports and storage expansion', () => {
  const home = '/Users/example'
  const config = normalizeConfig({}, { env: {}, home })
  assert.equal(config.provider, 'apple')
  assert.equal(config.language, 'zh-CN')
  assert.equal(config.storageDir, defaultStorageDir(home))
  assert.equal(config.watchImport.enabled, true)
  assert.equal(config.watchImport.port, 47831)
  assert.equal(config.beaconPort, 47832)
  assert.equal(config.openai.baseUrl, 'https://api.openai.com/v1')
  assert.equal(config.openai.model, 'whisper-1')
  assert.equal(config.openai.apiKey, '')

  const custom = normalizeConfig(
    {
      provider: 'openai',
      language: 'en-US',
      storageDir: '~/Recordings',
      watchImport: { enabled: false, port: 51234 },
      openai: { baseUrl: 'https://api.siliconflow.cn/v1', model: 'FunAudioLLM/SenseVoiceSmall', apiKey: 'test-key' },
    },
    { env: {}, home },
  )
  assert.equal(custom.provider, 'openai')
  assert.equal(custom.storageDir, join(home, 'Recordings'))
  assert.equal(custom.watchImport.enabled, false)
  assert.equal(custom.watchImport.port, 51234)
  assert.equal(custom.openai.apiKey, 'test-key')

  const fromEnv = normalizeConfig({}, { env: { OPENAI_API_KEY: 'test-env-key' }, home })
  assert.equal(fromEnv.openai.apiKey, 'test-env-key')

  // invalid values fall back instead of leaking into the contract
  const fallback = normalizeConfig({ provider: 'bogus', language: '  ', watchImport: { port: 999999 } }, { env: {}, home })
  assert.equal(fallback.provider, 'apple')
  assert.equal(fallback.language, 'zh-CN')
  assert.equal(fallback.watchImport.port, 47831)
})

test('config: public projection hides the API key and status matches provider', () => {
  const config = normalizeConfig({
    provider: 'openai',
    openai: { apiKey: 'secret', baseUrl: 'https://x/v1', model: 'm' },
  }, { env: {} })
  const pub = publicConfig(config)
  assert.deepEqual(pub, {
    provider: 'openai',
    language: 'zh-CN',
    openai: { baseUrl: 'https://x/v1', model: 'm', hasApiKey: true },
    storageDir: config.storageDir,
    watchImport: { enabled: true, port: 47831 },
  })
  assert.equal('apiKey' in pub.openai, false)
  assert.deepEqual(asrStatus(config, { platform: 'darwin' }), {
    provider: 'openai',
    configured: true,
    model: 'm',
    baseUrl: 'https://x/v1',
    language: 'zh-CN',
  })
  assert.equal(asrStatus(normalizeConfig({ provider: 'none' }, { env: {} })).configured, false)
})

test('config: mergeConfigBody keeps an omitted API key and accepts partial updates', () => {
  const raw = { provider: 'apple', openai: { apiKey: 'keep-me', model: 'whisper-1' }, watchImport: { enabled: true, port: 47831 } }
  const next = mergeConfigBody(raw, {
    provider: 'openai',
    openai: { baseUrl: 'https://api.openai.com/v1' },
    watchImport: { enabled: false },
  })
  assert.equal(next.provider, 'openai')
  assert.equal(next.openai.apiKey, 'keep-me')
  assert.equal(next.openai.baseUrl, 'https://api.openai.com/v1')
  assert.equal(next.watchImport.enabled, false)
  assert.equal(next.watchImport.port, 47831)
  // An explicit empty key clears the stored secret; omitting it keeps the old one.
  assert.equal('apiKey' in mergeConfigBody(raw, { openai: { apiKey: '' } }).openai, false)
  assert.equal('apiKey' in mergeConfigBody(raw, { openai: { apiKey: null } }).openai, false)
  assert.equal(mergeConfigBody(raw, { openai: { apiKey: '  ' } }).openai.apiKey, undefined)
  assert.deepEqual(publicConfig(normalizeConfig(mergeConfigBody(raw, { openai: { apiKey: '' } }), { env: {} })).openai, {
    baseUrl: 'https://api.openai.com/v1',
    model: 'whisper-1',
    hasApiKey: false,
  })

  // The persisted raw config must drop the key instead of keeping the old one.
  const clearedRaw = mergeConfigBody(raw, { openai: { apiKey: '' } })
  const persisted = applyConfigToEntry(raw, clearedRaw)
  assert.equal('apiKey' in persisted.openai, false)
  assert.equal(persisted.openai.model, 'whisper-1')
  // A partial update keeps the previous key.
  const partial = mergeConfigBody(raw, { openai: { model: 'gpt-4o-transcribe' } })
  assert.equal(applyConfigToEntry(raw, partial).openai.apiKey, 'keep-me')
})

test('ids, formats, snippets and base64 validation', () => {
  assert.match(makeRecordingId({ now: () => new Date(2026, 10, 9, 18, 30, 0).getTime(), random: () => '4f2a' }), /^20261109-183000-4f2a$/)
  assert.equal(guessFormat('a.m4a'), 'm4a')
  assert.equal(guessFormat('recording', 'audio/wav'), 'wav')
  assert.equal(guessFormat('x.unknown'), 'bin')
  assert.equal(snippetOf('  hello\n\nworld  '), 'hello world')
  assert.equal(snippetOf('a'.repeat(300)).length, 120)
  assert.deepEqual(decodeBase64Audio(Buffer.from('abc').toString('base64')), Buffer.from('abc'))
  assert.equal(decodeBase64Audio(`data:audio/wav;base64,${Buffer.from('abc').toString('base64')}`).toString(), 'abc')
  assert.throws(() => decodeBase64Audio(''), /dataBase64/)
  assert.throws(() => decodeBase64Audio('!!!'), /base64/)
})

test('transcript markdown: round-trip, title update and body preservation', () => {
  const markdown = serializeTranscriptMarkdown({
    id: '20261109-183000-4f2a',
    title: '周会: "预算"',
    source: 'soundcore',
    recordedAt: '2026-11-09T10:30:00.000Z',
    importedAt: '2026-11-09T10:31:00.000Z',
    durationMs: 93000,
    provider: 'apple',
    language: 'zh-CN',
    audioPath: '/tmp/a b.wav',
    text: '第一段\n\n第二段',
  })
  const parsed = parseTranscriptMarkdown(markdown)
  assert.equal(parsed.hasFrontmatter, true)
  assert.equal(parsed.frontmatter.title, '周会: "预算"')
  assert.equal(parsed.frontmatter.durationMs, 93000)
  assert.equal(parsed.frontmatter.audioPath, '/tmp/a b.wav')
  assert.equal(parsed.body.trim(), '第一段\n\n第二段')

  const renamed = updateFrontmatterField(markdown, 'title', '新标题')
  assert.equal(parseTranscriptMarkdown(renamed).frontmatter.title, '新标题')
  assert.equal(parseTranscriptMarkdown(renamed).body, parsed.body)
  assert.equal(updateFrontmatterField('body only', 'title', 'x'), 'body only')
})

test('store: import, list ordering, transcript save/read, rename and delete', async () => {
  const storageDir = join(dir, 'library')
  const store = createStore({ storageDir, now: () => Date.parse('2026-11-09T12:00:00.000Z') })
  await store.init()

  const first = await store.importRecording({
    source: 'soundcore',
    title: '  ',
    recordedAt: '2026-11-09T10:00:00.000Z',
    durationMs: 93000,
    format: 'wav',
    data: WAV,
    deviceFileId: 123,
  })
  assert.match(first.id, /^\d{8}-\d{6}-[0-9a-f]{4}$/)
  assert.equal(first.title, '录音豆录音 2026-11-09 18:00')
  assert.equal(first.format, 'wav')
  assert.equal(first.sizeBytes, WAV.length)
  assert.equal(first.deviceFileId, 123)
  assert.equal(first.transcriptStatus, 'none')
  assert.equal(first.audioPath.startsWith(join(storageDir, 'audio')), true)

  const second = await store.importRecording({
    source: 'apple-watch',
    title: '手表',
    recordedAt: '2026-11-09T11:00:00.000Z',
    format: 'm4a',
    data: Buffer.from('m4a-bytes'),
  })
  assert.equal(second.title, '手表')
  const listed = await store.list()
  assert.deepEqual(listed.map((r) => r.id), [second.id, first.id])
  assert.deepEqual(countsOf(listed), { recordings: 2, transcribed: 0 })

  const saved = await store.saveTranscript(first.id, { text: '你好 世界\n第二行', provider: 'apple', language: 'zh-CN' })
  assert.equal(saved.transcriptStatus, 'done')
  assert.equal(saved.snippet, '你好 世界 第二行')
  assert.equal(saved.transcriptPath, join(storageDir, 'transcripts', `${first.id}.md`))
  assert.equal((await stat(saved.transcriptPath)).isFile(), true)

  const transcript = await store.readTranscript(first.id)
  assert.equal(transcript.id, first.id)
  assert.equal(transcript.path, saved.transcriptPath)
  assert.equal(transcript.text, '你好 世界\n第二行')
  assert.ok(transcript.updatedAt > 0)
  assert.equal(parseTranscriptMarkdown(transcript.markdown).frontmatter.provider, 'apple')

  const renamed = await store.rename(first.id, '  新标题  ')
  assert.equal(renamed.title, '新标题')
  const renamedTranscript = await store.readTranscript(first.id)
  assert.equal(parseTranscriptMarkdown(renamedTranscript.markdown).frontmatter.title, '新标题')
  assert.equal(renamedTranscript.text, transcript.text)

  assert.equal((await store.rename('missing', 'x')), null)
  assert.equal(await store.remove(first.id), true)
  assert.equal(await store.remove(first.id), false)
  assert.equal(await store.get(first.id), null)
  await assert.rejects(stat(saved.transcriptPath), /ENOENT/)
  assert.equal(await store.readTranscript(first.id), null)

  const index = JSON.parse(await readFile(join(storageDir, 'index.json'), 'utf8'))
  assert.equal(index.version, 1)
  assert.equal(typeof index.watchToken, 'string')
  assert.equal(index.recordings.length, 1)
})

test('store: watch token persists and rotates', async () => {
  const storageDir = join(dir, 'tokens')
  const store = createStore({ storageDir })
  await store.init()
  const token = await store.watchToken()
  assert.match(token, /^[0-9a-f]{32}$/)

  const rotated = await store.rotateWatchToken()
  assert.notEqual(rotated, token)
  const reopened = createStore({ storageDir })
  await reopened.init()
  assert.equal(await reopened.watchToken(), rotated)
})

test('store: reference candidates prefer recent transcripts then title matches', async () => {
  const storageDir = join(dir, 'references')
  const store = createStore({ storageDir, now: () => Date.parse('2026-11-09T12:00:00.000Z') })
  await store.init()
  const older = await store.importRecording({
    source: 'soundcore',
    title: '产品评审',
    recordedAt: '2026-11-09T09:00:00.000Z',
    format: 'wav',
    data: WAV,
  })
  const newer = await store.importRecording({
    source: 'apple-watch',
    title: '周会记录',
    recordedAt: '2026-11-09T10:00:00.000Z',
    format: 'm4a',
    data: Buffer.from('m4a'),
  })
  await store.saveTranscript(older.id, { text: '旧', provider: 'apple', language: 'zh-CN' })
  await store.saveTranscript(newer.id, { text: '新', provider: 'apple', language: 'zh-CN' })

  const olderStat = await stat((await store.get(older.id)).transcriptPath)
  const newerStat = await stat((await store.get(newer.id)).transcriptPath)
  await utimes((await store.get(older.id)).transcriptPath, olderStat.atime, new Date(olderStat.mtimeMs + 60_000))
  await utimes((await store.get(newer.id)).transcriptPath, newerStat.atime, new Date(newerStat.mtimeMs))

  const recent = await store.referenceCandidates('', 8)
  assert.deepEqual(recent.map((c) => c.path), [
    (await store.get(older.id)).transcriptPath,
    (await store.get(newer.id)).transcriptPath,
  ])
  assert.deepEqual(recent[0], { path: (await store.get(older.id)).transcriptPath, kind: 'file' })

  const byTitle = await store.referenceCandidates('周会')
  assert.deepEqual(byTitle.map((c) => c.path), [(await store.get(newer.id)).transcriptPath])
  assert.deepEqual(await store.referenceCandidates('不存在'), [])
  assert.deepEqual(await store.referenceCandidates('', 1).then((list) => list.length), 1)
})

test('store: index corruption is backed up instead of crashing', async () => {
  const storageDir = join(dir, 'corrupt')
  const store = createStore({ storageDir, now: () => 1760000000000 })
  await store.init()
  const { writeFile } = await import('node:fs/promises')
  await writeFile(join(storageDir, 'index.json'), '{ not json', 'utf8')
  const reopened = createStore({ storageDir, now: () => 1760000000000 })
  const listed = await reopened.init()
  assert.deepEqual(listed, [])
  const index = JSON.parse(await readFile(join(storageDir, 'index.json'), 'utf8'))
  assert.equal(index.recordings.length, 0)
})

test('store: empty library exposes the fixed transcript directory and drills into it', async () => {
  const storageDir = join(dir, 'refs-fixed')
  const store = createStore({ storageDir, now: () => 1760000000000 })
  await store.init()

  const empty = await store.referenceCandidates('')
  assert.equal(empty.length, 1)
  assert.equal(empty[0].kind, 'directory')
  assert.equal(empty[0].path, store.dirs.transcripts)

  const imported = await store.importRecording({
    source: 'upload',
    title: '会议纪要',
    format: 'wav',
    data: WAV,
  })
  await store.saveTranscript(imported.id, { text: '会议内容', provider: 'apple', language: 'zh-CN' })

  const drilled = await store.referenceCandidates(`${store.dirs.transcripts}/`)
  assert.equal(drilled.length, 1)
  assert.equal(drilled[0].kind, 'file')
  assert.equal(drilled[0].path, (await store.get(imported.id)).transcriptPath)
})
