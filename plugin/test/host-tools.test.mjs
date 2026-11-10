import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'

import { createStore } from '../host/store.mjs'
import {
  RECORDING_TOOL_PARAMETERS,
  TOOL_NAME,
  createRecordingTool,
  recordingPromptText,
  registerRecordingTools,
  validateRecordingToolArgs,
} from '../host/tools.mjs'

let dir
let store
let queue
let tool

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dsh-recording-tool-'))
  store = createStore({ storageDir: join(dir, 'library') })
  await store.init()
  const record = await store.importRecording({
    source: 'soundcore',
    title: '产品评审',
    recordedAt: '2026-11-09T10:00:00.000Z',
    format: 'wav',
    data: Buffer.from('RIFF....WAVEfmt '),
  })
  await store.saveTranscript(record.id, { text: '我们讨论了发布节奏。', provider: 'apple', language: 'zh-CN' })
  queue = {
    calls: [],
    async enqueue(id, language) {
      this.calls.push({ id, language })
      return { id: 'job-42', status: 'queued' }
    },
  }
  tool = createRecordingTool({ store, queue })
})

after(async () => {
  await rm(dir, { recursive: true, force: true })
})

test('tool definition: plain object with raw JSON Schema and object output', () => {
  assert.equal(tool.name, TOOL_NAME)
  assert.equal(tool.parameters, RECORDING_TOOL_PARAMETERS)
  assert.equal(tool.parameters.type, 'object')
  assert.deepEqual(tool.parameters.required, ['action'])
  assert.equal(tool.parameters.additionalProperties, false)
  assert.equal(tool.output.schema.type, 'object')
  assert.equal(typeof tool.execute, 'function')
  // Only the supported JSON Schema subset is used.
  const allowed = new Set(['type', 'properties', 'required', 'additionalProperties', 'items', 'enum', 'const', 'description', 'title', 'default', 'examples', 'oneOf'])
  const walk = (node) => {
    for (const key of Object.keys(node)) assert.ok(allowed.has(key), `unsupported schema key ${key}`)
    if (node.properties) for (const child of Object.values(node.properties)) walk(child)
    if (node.items) walk(node.items)
  }
  walk(tool.parameters)
})

test('validateRecordingToolArgs rejects malformed model input', () => {
  assert.throws(() => validateRecordingToolArgs(null), /参数必须是对象/)
  assert.throws(() => validateRecordingToolArgs({ action: 'nope' }), /action 必须是/)
  assert.throws(() => validateRecordingToolArgs({ action: 'read' }), /需要 id/)
  assert.throws(() => validateRecordingToolArgs({ action: 'transcribe' }), /需要 id/)
  assert.throws(() => validateRecordingToolArgs({ action: 'list', limit: 0 }), /limit/)
  assert.throws(() => validateRecordingToolArgs({ action: 'list', limit: 51 }), /limit/)
  assert.throws(() => validateRecordingToolArgs({ action: 'list', extra: 1 }), /未知参数/)
  assert.throws(() => validateRecordingToolArgs({ action: 'list', query: 3 }), /query/)
  assert.deepEqual(validateRecordingToolArgs({ action: 'list' }), {
    action: 'list',
    id: '',
    query: '',
    limit: 20,
    language: undefined,
  })
})

test('execute list/read/transcribe returns declared JSON and validates ids', async () => {
  const list = await tool.execute({ action: 'list' })
  assert.equal(list.action, 'list')
  assert.equal(list.total, 1)
  assert.equal(list.recordings[0].title, '产品评审')

  const filtered = await tool.execute({ action: 'list', query: '评审' })
  assert.equal(filtered.recordings.length, 1)
  const none = await tool.execute({ action: 'list', query: '不存在' })
  assert.equal(none.total, 0)
  assert.match(none.hint, /录音库为空或不匹配/)

  const read = await tool.execute({ action: 'read', id: list.recordings[0].id })
  assert.equal(read.text, '我们讨论了发布节奏。')
  assert.ok(read.path.endsWith('.md'))

  await assert.rejects(tool.execute({ action: 'read', id: 'missing' }), /不存在/)
  await assert.rejects(tool.execute({ action: 'transcribe', id: 'missing' }), /不存在/)

  const queued = await tool.execute({ action: 'transcribe', id: list.recordings[0].id, language: 'en-US' })
  assert.equal(queued.jobId, 'job-42')
  assert.equal(queued.status, 'queued')
  assert.deepEqual(queue.calls, [{ id: list.recordings[0].id, language: 'en-US' }])

  const rendered = tool.output.render({ action: 'list' }, { ok: true })
  assert.deepEqual(rendered, [{ type: 'text', text: '{\n  "ok": true\n}' }])
})

test('execute read reports an untranscribed recording with a next step', async () => {
  const record = await store.importRecording({
    source: 'apple-watch',
    title: '未转录',
    format: 'm4a',
    data: Buffer.from('m4a'),
  })
  await assert.rejects(tool.execute({ action: 'read', id: record.id }), /还没有转录文本/)
})

test('registerRecordingTools registers the tool and prompt section, and disposes both', () => {
  const registered = []
  const sections = []
  const ctx = {
    tools: {
      register(definition) {
        registered.push(definition)
        return () => registered.splice(registered.indexOf(definition), 1)
      },
    },
    systemPrompt: {
      section(section) {
        sections.push(section)
        return () => sections.splice(sections.indexOf(section), 1)
      },
    },
  }
  const dispose = registerRecordingTools(ctx, { store, queue, logger: { warn() {} } })
  assert.equal(registered.length, 1)
  assert.equal(registered[0].name, TOOL_NAME)
  assert.equal(sections.length, 1)
  assert.equal(sections[0].name, 'recording-suite:library')
  assert.equal(typeof sections[0].order, 'number')
  assert.equal(sections[0].interpolate, false)
  assert.match(recordingPromptText(), /recording_library/)
  dispose()
  assert.equal(registered.length, 0)
  assert.equal(sections.length, 0)
})
