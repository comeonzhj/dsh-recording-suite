import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'

import {
  APPLE_SPEECH_TIMEOUT_MS,
  appleTimeoutMessage,
  friendlyAppleError,
  openAiEndpoint,
  parseAppleHelperOutput,
  createTranscriptionQueue,
  transcribeOpenAI,
} from '../host/asr.mjs'
import { normalizeConfig } from '../host/config.mjs'
import { createStore } from '../host/store.mjs'

let dir
let store

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dsh-recording-queue-'))
  store = createStore({ storageDir: join(dir, 'library') })
  await store.init()
})

after(async () => {
  await rm(dir, { recursive: true, force: true })
})

const WAV = Buffer.from('RIFF....WAVEfmt ')

async function importOne(title) {
  return store.importRecording({
    source: 'soundcore',
    title,
    recordedAt: '2026-11-09T10:00:00.000Z',
    format: 'wav',
    data: WAV,
  })
}

async function waitFor(predicate, timeoutMs = 5000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const value = await predicate()
    if (value) return value
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 10))
  }
  throw new Error('timed out waiting for condition')
}

test('helpers: parse helper output, friendly errors, endpoint derivation', () => {
  assert.deepEqual(parseAppleHelperOutput('noise\n{"ok":true,"text":"你好"}\n'), { ok: true, text: '你好' })
  assert.deepEqual(parseAppleHelperOutput('plain transcript'), { ok: true, text: 'plain transcript' })
  assert.equal(parseAppleHelperOutput('').ok, false)

  const tcc = friendlyAppleError('Speech recognition permission was denied (status=denied)')
  assert.match(tcc, /系统设置 > 隐私与安全性 > 语音识别/)
  assert.match(tcc, /原始错误/)
  assert.match(friendlyAppleError('no speech detected'), /没有识别到语音/)
  assert.match(friendlyAppleError('unsupported locale'), /不支持该语言/)
  assert.match(friendlyAppleError('boom'), /转写失败：boom/)
  const timeout = friendlyAppleError('[timeout after 330000ms]')
  assert.match(timeout, /Apple Speech 在 330 秒内没有返回/)
  assert.match(timeout, /系统设置 > 通用 > 键盘 > 听写/)
  assert.match(appleTimeoutMessage(APPLE_SPEECH_TIMEOUT_MS / 1000), /OpenAI 兼容 ASR/)

  assert.equal(openAiEndpoint('https://api.openai.com/v1/'), 'https://api.openai.com/v1/audio/transcriptions')
  assert.throws(() => openAiEndpoint(''), /baseUrl/)
})

test('queue: runs jobs serially, writes Markdown and broadcasts progress', async () => {
  const events = []
  const recordings = []
  const order = []
  const queue = createTranscriptionQueue({
    store,
    pluginRoot: '/tmp/plugin',
    logger: { warn: () => {}, info: () => {} },
    getConfig: () => normalizeConfig({ provider: 'apple', language: 'zh-CN' }, { env: {} }),
    emitJob: (event) => events.push(event),
    emitRecording: (event) => recordings.push(event),
    providers: {
      apple: async ({ record, onProgress, signal }) => {
        order.push(record.id)
        onProgress(0.5, 'transcribing')
        assert.equal(signal.aborted, false)
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 15))
        return { text: `你好 ${record.title}`, provider: 'apple', language: 'zh-CN' }
      },
    },
  })

  const first = await importOne('第一条')
  const second = await importOne('第二条')
  const jobA = await queue.enqueue(first.id)
  const jobB = await queue.enqueue(second.id)
  assert.equal(jobA.status, 'queued')
  assert.notEqual(jobA.id, jobB.id)

  await waitFor(async () => (await store.get(second.id)).transcriptStatus === 'done')
  assert.deepEqual(order, [first.id, second.id])

  const firstDone = await store.get(first.id)
  assert.equal(firstDone.transcriptStatus, 'done')
  assert.equal(firstDone.transcriptProvider, 'apple')
  const transcript = await store.readTranscript(first.id)
  assert.equal(transcript.text, '你好 第一条')
  assert.match(await readFile(transcript.path, 'utf8'), /provider: "apple"/)

  const jobEvents = events.filter((event) => event.job.recordingId === first.id)
  assert.ok(jobEvents.some((event) => event.job.status === 'running'))
  assert.ok(jobEvents.some((event) => event.job.status === 'done' && event.job.progress === 1))
  assert.ok(recordings.some((event) => event.type === 'updated' && event.id === first.id))
  assert.equal(queue.getJob(jobA.id).status, 'done')
  assert.equal(queue.getJob('missing'), null)
  await queue.dispose()
})

test('queue: provider failure marks the recording failed with the message', async () => {
  const queue = createTranscriptionQueue({
    store,
    pluginRoot: '/tmp/plugin',
    getConfig: () => normalizeConfig({ provider: 'apple' }, { env: {} }),
    providers: {
      apple: async () => {
        throw new Error('mock speech exploded')
      },
    },
  })
  const record = await importOne('失败录音')
  const job = await queue.enqueue(record.id)
  await waitFor(async () => (await store.get(record.id)).transcriptStatus === 'failed')
  const failed = await store.get(record.id)
  assert.match(failed.transcriptError, /mock speech exploded/)
  assert.equal(failed.transcriptProvider, 'apple')
  assert.equal(queue.getJob(job.id).status, 'failed')
  assert.match(queue.getJob(job.id).error, /mock speech exploded/)
  await queue.dispose()
})

test('queue: provider=none fails with an actionable message', async () => {
  const queue = createTranscriptionQueue({
    store,
    pluginRoot: '/tmp/plugin',
    getConfig: () => normalizeConfig({ provider: 'none' }, { env: {} }),
  })
  const record = await importOne('未配置')
  const job = await queue.enqueue(record.id)
  await waitFor(async () => queue.getJob(job.id).status === 'failed')
  assert.match(queue.getJob(job.id).error, /ASR 提供方为 none/)
  assert.match((await store.get(record.id)).transcriptError, /ASR 提供方为 none/)
  await queue.dispose()
})

test('queue: cancelForRecording stops a running provider and keeps the record deletable', async () => {
  let started
  const startedPromise = new Promise((resolvePromise) => {
    started = resolvePromise
  })
  const queue = createTranscriptionQueue({
    store,
    pluginRoot: '/tmp/plugin',
    getConfig: () => normalizeConfig({ provider: 'apple' }, { env: {} }),
    providers: {
      apple: ({ signal }) =>
        new Promise((resolvePromise, reject) => {
          started()
          const timer = setTimeout(() => resolvePromise({ text: 'late', provider: 'apple', language: 'zh-CN' }), 5000)
          signal.addEventListener('abort', () => {
            clearTimeout(timer)
            reject(new Error('aborted'))
          })
        }),
    },
  })
  const record = await importOne('取消')
  const job = await queue.enqueue(record.id)
  await startedPromise
  assert.equal(queue.isBusy(), true)
  assert.equal(queue.cancelForRecording(record.id), 1)
  assert.equal(queue.getJob(job.id).status, 'cancelled')
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 30))
  assert.equal(await store.remove(record.id), true)
  await queue.dispose()
})

test('openai provider: builds a multipart request with the configured key', async () => {
  const record = await importOne('OpenAI')
  const calls = []
  const result = await transcribeOpenAI({
    record,
    config: normalizeConfig({ provider: 'openai', language: 'zh-CN', openai: { apiKey: 'test-key', model: 'whisper-1' } }, { env: {} }),
    readFileImpl: async () => Buffer.from('audio-bytes'),
    fetchImpl: async (url, init) => {
      calls.push({ url, init })
      return { ok: true, status: 200, text: async () => JSON.stringify({ text: '  openai 文本  ' }) }
    },
    onProgress: () => {},
  })
  assert.equal(result.text, 'openai 文本')
  assert.equal(result.provider, 'openai')
  assert.equal(calls[0].url, 'https://api.openai.com/v1/audio/transcriptions')
  assert.equal(calls[0].init.headers.authorization, 'Bearer test-key')
  assert.ok(calls[0].init.body instanceof FormData)

  await assert.rejects(
    transcribeOpenAI({
      record,
      config: normalizeConfig({ provider: 'openai' }, { env: {} }),
      readFileImpl: async () => Buffer.from('x'),
    }),
    /API Key/,
  )

  await assert.rejects(
    transcribeOpenAI({
      record,
      config: normalizeConfig({ provider: 'openai', openai: { apiKey: 'k' } }, { env: {} }),
      readFileImpl: async () => Buffer.from('x'),
      fetchImpl: async () => ({ ok: false, status: 401, statusText: 'Unauthorized', text: async () => '{"error":"bad key"}' }),
    }),
    /HTTP 401/,
  )
})
