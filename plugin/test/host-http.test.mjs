import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'

import { normalizeConfig } from '../host/config.mjs'
import { createEventHub } from '../host/events.mjs'
import { createApiHandler } from '../host/http.mjs'
import { createStore } from '../host/store.mjs'
import { createTranscriptionQueue } from '../host/asr.mjs'

let dir
let server
let origin
let store
let events
let queue
let rawConfig
let appliedConfig

const WAV = Buffer.from('RIFF-this-is-a-test-wav-payload')

async function waitFor(predicate, timeoutMs = 5000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const value = await predicate()
    if (value) return value
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 10))
  }
  throw new Error('timed out waiting for condition')
}

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dsh-recording-http-'))
  store = createStore({ storageDir: join(dir, 'library') })
  await store.init()
  events = createEventHub({ heartbeatMs: 1000 })
  rawConfig = { provider: 'apple', language: 'zh-CN', storageDir: join(dir, 'library') }
  queue = createTranscriptionQueue({
    store,
    pluginRoot: '/tmp/plugin',
    getConfig: () => rawConfig,
    emitJob: (event) => events.broadcast('job', event),
    emitRecording: (event) => events.broadcast('recording', event),
    providers: {
      apple: async ({ record }) => ({ text: `转写：${record.title}`, provider: 'apple', language: 'zh-CN' }),
    },
  })
  const handler = createApiHandler({
    store,
    queue,
    events,
    getRawConfig: () => rawConfig,
    applyConfig: async (next) => {
      appliedConfig = next
      rawConfig = normalizeConfig(next, { env: {} })
      return { persisted: true }
    },
    watchInfo: () => ({ enabled: true, port: 47831, beaconPort: 47832, urls: ['http://192.0.2.20:47831'], lastError: null }),
    appleSpeech: () => ({ available: true, reason: null }),
    version: '0.1.0',
    logger: { warn() {}, info() {} },
  })
  server = createServer((request, response) => {
    handler(request, response).catch((error) => {
      if (!response.writableEnded) {
        response.writeHead(500, { 'content-type': 'application/json' })
        response.end(JSON.stringify({ error: String(error) }))
      }
    })
  })
  await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise))
  const address = server.address()
  origin = `http://127.0.0.1:${address.port}`
  // handlers above use origin only after listen; request helpers below read it.
})

after(async () => {
  events.dispose()
  await queue.dispose()
  await new Promise((resolvePromise) => server.close(resolvePromise))
  await rm(dir, { recursive: true, force: true })
})

const json = async (path, options = {}) => {
  const response = await fetch(`${origin}${path}`, options)
  const body = await response.json().catch(() => null)
  return { response, body }
}

test('GET /status matches the API contract', async () => {
  const { response, body } = await json('/api/recording/status')
  assert.equal(response.status, 200)
  assert.deepEqual(body.counts, { recordings: 0, transcribed: 0 })
  assert.equal(body.ok, true)
  assert.equal(body.version, '0.1.0')
  assert.equal(body.storageDir, join(dir, 'library'))
  assert.equal(body.transcriptsDir, join(dir, 'library', 'transcripts'))
  assert.equal(body.asr.provider, 'apple')
  assert.equal(body.asr.language, 'zh-CN')
  assert.equal(body.watchImport.port, 47831)
  assert.equal(body.watchImport.beaconPort, 47832)
  assert.deepEqual(body.watchImport.urls, ['http://192.0.2.20:47831'])
  assert.match(body.watchImport.token, /^[0-9a-f]{32}$/)
  assert.deepEqual(body.appleSpeech, { available: true, reason: null })
})

test('import -> list -> jobs -> transcript -> rename -> audio range -> delete', async () => {
  const imported = await json('/api/recording/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      source: 'soundcore',
      title: 'HTTP 测试',
      recordedAt: '2026-11-09T10:30:00.000Z',
      durationMs: 93000,
      format: 'wav',
      dataBase64: WAV.toString('base64'),
      deviceFileId: 42,
      autoTranscribe: true,
    }),
  })
  assert.equal(imported.response.status, 200)
  const record = imported.body.recording
  assert.equal(record.title, 'HTTP 测试')
  assert.equal(record.source, 'soundcore')
  assert.equal(record.format, 'wav')
  assert.equal(record.deviceFileId, 42)
  assert.equal(record.sizeBytes, WAV.length)

  const list = await json('/api/recording/list')
  assert.equal(list.body.recordings.length, 1)
  assert.equal(list.body.recordings[0].id, record.id)

  // autoTranscribe must have queued a job; wait for the fake provider.
  await waitFor(async () => (await store.get(record.id)).transcriptStatus === 'done')

  const transcript = await json(`/api/recording/transcript?id=${record.id}`)
  assert.equal(transcript.response.status, 200)
  assert.equal(transcript.body.id, record.id)
  assert.equal(transcript.body.text, '转写：HTTP 测试')
  assert.ok(transcript.body.path.endsWith(`${record.id}.md`))
  assert.match(transcript.body.markdown, /title: "HTTP 测试"/)
  assert.ok(transcript.body.updatedAt > 0)

  const missing = await json('/api/recording/transcript?id=missing')
  assert.equal(missing.response.status, 404)
  assert.ok(missing.body.error)

  const renamed = await json(`/api/recording/${record.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: '改名后的录音' }),
  })
  assert.equal(renamed.response.status, 200)
  assert.equal(renamed.body.recording.title, '改名后的录音')
  const renamedTranscript = await json(`/api/recording/transcript?id=${record.id}`)
  assert.match(renamedTranscript.body.markdown, /title: "改名后的录音"/)
  assert.equal(renamedTranscript.body.text, '转写：HTTP 测试')

  // audio: full body, range and HEAD
  let audio = await fetch(`${origin}/api/recording/audio?id=${record.id}`)
  assert.equal(audio.status, 200)
  assert.equal(audio.headers.get('content-type'), 'audio/wav')
  assert.equal(audio.headers.get('accept-ranges'), 'bytes')
  assert.equal((await audio.arrayBuffer()).byteLength, WAV.length)

  const ranged = await fetch(`${origin}/api/recording/audio?id=${record.id}`, { headers: { range: 'bytes=0-3' } })
  assert.equal(ranged.status, 206)
  assert.equal(ranged.headers.get('content-range'), `bytes 0-3/${WAV.length}`)
  assert.equal(Buffer.from(await ranged.arrayBuffer()).toString(), WAV.subarray(0, 4).toString())

  const invalidRange = await fetch(`${origin}/api/recording/audio?id=${record.id}`, { headers: { range: 'bytes=999-' } })
  assert.equal(invalidRange.status, 416)

  const head = await fetch(`${origin}/api/recording/audio?id=${record.id}`, { method: 'HEAD' })
  assert.equal(head.status, 200)
  assert.equal(head.headers.get('content-length'), String(WAV.length))

  const removed = await json(`/api/recording/${record.id}`, { method: 'DELETE' })
  assert.equal(removed.response.status, 200)
  assert.deepEqual(removed.body, { ok: true })
  assert.equal((await json('/api/recording/list')).body.recordings.length, 0)
  assert.equal((await json(`/api/recording/audio?id=${record.id}`)).response.status, 404)
  assert.equal((await json(`/api/recording/${record.id}`, { method: 'DELETE' })).response.status, 404)
})

test('import-file accepts multipart/form-data', async () => {
  const boundary = '----dsh-test-boundary'
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\n上传文件\r\n`, 'utf8'),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="source"\r\n\r\nupload\r\n`, 'utf8'),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="clip.wav"\r\nContent-Type: audio/wav\r\n\r\n`, 'utf8'),
    WAV,
    Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'),
  ])
  const response = await fetch(`${origin}/api/recording/import-file`, {
    method: 'POST',
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    body,
  })
  const payload = await response.json()
  assert.equal(response.status, 200)
  assert.equal(payload.recording.title, '上传文件')
  assert.equal(payload.recording.format, 'wav')
  assert.equal(payload.recording.sizeBytes, WAV.length)

  const bad = await fetch(`${origin}/api/recording/import-file`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  })
  assert.equal(bad.status, 500)
})

test('transcribe endpoint returns a jobId and jobs endpoint reports progress', async () => {
  const list = await json('/api/recording/list')
  const record = list.body.recordings[0]
  const transcribe = await json('/api/recording/transcribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: record.id, language: 'zh-CN' }),
  })
  assert.equal(transcribe.response.status, 200)
  assert.match(transcribe.body.jobId, /^job-/)

  const job = await json(`/api/recording/jobs?id=${transcribe.body.jobId}`)
  assert.equal(job.response.status, 200)
  assert.equal(job.body.job.recordingId, record.id)
  assert.ok(['queued', 'running', 'done'].includes(job.body.job.status))
  assert.equal(typeof job.body.job.progress, 'number')

  await waitFor(async () => queue.getJob(transcribe.body.jobId).status === 'done')
  const done = await json(`/api/recording/jobs?id=${transcribe.body.jobId}`)
  assert.equal(done.body.job.status, 'done')
  assert.equal(done.body.job.progress, 1)

  assert.equal((await json('/api/recording/jobs')).response.status, 400)
  assert.equal((await json('/api/recording/jobs?id=nope')).response.status, 404)
  assert.equal((await json('/api/recording/transcribe', { method: 'POST', body: '{}' })).response.status, 400)
})

test('config GET/POST round-trips and never echoes the API key', async () => {
  const initial = await json('/api/recording/config')
  assert.equal(initial.response.status, 200)
  assert.deepEqual(initial.body, {
    provider: 'apple',
    language: 'zh-CN',
    openai: { baseUrl: 'https://api.openai.com/v1', model: 'whisper-1', hasApiKey: false },
    storageDir: join(dir, 'library'),
    watchImport: { enabled: true, port: 47831 },
  })

  const saved = await json('/api/recording/config', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      provider: 'openai',
      language: 'en-US',
      openai: { baseUrl: 'https://api.siliconflow.cn/v1', model: 'whisper-1', apiKey: 'test-key' },
      watchImport: { enabled: false, port: 50001 },
    }),
  })
  assert.equal(saved.response.status, 200)
  assert.deepEqual(saved.body, { ok: true, restart: true, persisted: true })
  assert.equal(appliedConfig.provider, 'openai')
  assert.equal(appliedConfig.watchImport.port, 50001)

  const afterSave = await json('/api/recording/config')
  assert.equal(afterSave.body.provider, 'openai')
  assert.equal(afterSave.body.openai.hasApiKey, true)
  assert.equal('apiKey' in afterSave.body.openai, false)
  assert.equal((await json('/api/recording/status')).body.asr.model, 'whisper-1')

  // An explicit empty key must clear the stored secret (POST omitting it keeps it).
  const cleared = await json('/api/recording/config', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ openai: { apiKey: '' } }),
  })
  assert.equal(cleared.response.status, 200)
  assert.equal(cleared.body.ok, true)
  const afterClear = await json('/api/recording/config')
  assert.equal(afterClear.body.openai.hasApiKey, false)
  assert.equal((await json('/api/recording/status')).body.asr.configured, false)
})

test('watch token rotation invalidates the old token', async () => {
  const before = (await json('/api/recording/status')).body.watchImport.token
  const rotated = await json('/api/recording/watch/rotate-token', { method: 'POST' })
  assert.equal(rotated.response.status, 200)
  assert.notEqual(rotated.body.token, before)
  assert.equal((await json('/api/recording/status')).body.watchImport.token, rotated.body.token)
  assert.equal(await store.watchToken(), rotated.body.token)
})

test('SSE events endpoint streams job/recording frames', async () => {
  const controller = new AbortController()
  const response = await fetch(`${origin}/api/recording/events`, { signal: controller.signal })
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type'), /text\/event-stream/)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const readUntil = async (needle) => {
    const deadline = Date.now() + 3000
    while (Date.now() < deadline) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      if (buffer.includes(needle)) return true
    }
    return false
  }
  assert.equal(await readUntil('retry: 3000'), true)
  events.broadcast('recording', { type: 'updated', id: 'x', recording: { id: 'x' } })
  assert.equal(await readUntil('event: recording'), true)
  assert.match(buffer, /"type":"updated"/)
  controller.abort()
  reader.cancel().catch(() => {})
  events.dispose()
})

test('unknown paths and methods return JSON errors', async () => {
  assert.equal((await json('/api/recording/nope/nope')).response.status, 404)
  assert.equal((await json('/api/recording/import')).response.status, 405)
  assert.equal((await json('/api/recording/import', { method: 'POST', body: 'not json', headers: { 'content-type': 'application/json' } })).response.status, 500)
})
