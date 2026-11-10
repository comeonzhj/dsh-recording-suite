import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'

import {
  BleError,
  cleanDeviceInfo,
  createBleService,
  ensureBleHelper,
  mapHelperError,
  parseHelperOutput,
  recordedAtFromFileId,
} from '../host/ble.mjs'
import { crc32Ogg, durationMsOfRawOpus, muxOggOpus } from '../host/ogg.mjs'
import { createStore } from '../host/store.mjs'

let dir

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dsh-recording-ble-'))
})

after(async () => {
  await rm(dir, { recursive: true, force: true })
})

function helperJson(payload) {
  return {
    stdout: JSON.stringify(payload),
    stderr: 'd3200-helper: progress only',
    code: payload.ok === false ? 1 : 0,
    signal: null,
    timedOut: false,
  }
}

async function makePluginRoot(name) {
  const root = join(dir, name)
  await mkdir(join(root, 'native'), { recursive: true })
  await writeFile(join(root, 'native', 'd3200_helper.swift'), '// fake helper source\n', 'utf8')
  await writeFile(
    join(root, 'native', 'd3200_helper_info.plist'),
    '<plist><dict><key>NSBluetoothAlwaysUsageDescription</key><string>test</string></dict></plist>',
    'utf8',
  )
  return root
}

/* ---------------------------------------------------------------- parsing */

test('parseHelperOutput reads the last JSON line and tolerates noise', () => {
  assert.deepEqual(parseHelperOutput('{"ok":true,"devices":[]}\n'), { ok: true, devices: [] })
  assert.deepEqual(parseHelperOutput('progress\n{"ok":true,"n":1}\n{"ok":false,"code":"X"}\n'), {
    ok: false,
    code: 'X',
  })
  assert.equal(parseHelperOutput(''), null)
  assert.equal(parseHelperOutput('no json here'), null)
  assert.equal(parseHelperOutput('{"broken":'), null)
})

test('recordedAtFromFileId rejects implausible ids and accepts Unix seconds', () => {
  const now = Date.UTC(2026, 10, 10)
  assert.equal(recordedAtFromFileId(1700000001, now), new Date(1700000001 * 1000).toISOString())
  assert.equal(recordedAtFromFileId(0, now), null)
  assert.equal(recordedAtFromFileId(-1, now), null)
  assert.equal(recordedAtFromFileId('nope', now), null)
  assert.equal(recordedAtFromFileId(1, now), null)
})

test('cleanDeviceInfo drops empty strings and nulls', () => {
  assert.deepEqual(cleanDeviceInfo({ battery: 100, firmwareVersion: '', boxMac: null, charging: false }), {
    battery: 100,
    charging: false,
  })
  assert.deepEqual(cleanDeviceInfo(null), {})
})

test('mapHelperError maps helper codes to stable API codes and guidance', () => {
  const unauthorized = mapHelperError({
    ok: false,
    code: 'BLUETOOTH_UNAUTHORIZED',
    error: '系统拒绝了蓝牙访问。',
  })
  assert.ok(unauthorized instanceof BleError)
  assert.equal(unauthorized.code, 'bluetooth_unauthorized')
  assert.equal(unauthorized.httpStatus, 503)
  assert.match(unauthorized.message, /系统设置/)

  const denied = mapHelperError({ ok: false, code: 'DEVICE_REJECTED_EXPORT', error: '设备拒绝导出（错误码 3）。' })
  assert.equal(denied.code, 'device_rejected_export')

  const unknown = mapHelperError({ ok: false, code: 'WAT', error: '奇怪错误' })
  assert.equal(unknown.code, 'device_failed')
  assert.match(unknown.message, /WAT/)
})

/* -------------------------------------------------------------------- ogg */

test('muxOggOpus wraps bare D3200 frames into a valid-looking Ogg/Opus stream', () => {
  const raw = Buffer.alloc(160 * 3, 0x11)
  const ogg = muxOggOpus(raw)
  assert.equal(ogg.subarray(0, 4).toString('latin1'), 'OggS')
  assert.ok(ogg.includes(Buffer.from('OpusHead', 'latin1')))
  assert.ok(ogg.includes(Buffer.from('OpusTags', 'latin1')))
  // Last page must carry the EOS flag (0x04) in the header.
  const last = ogg.lastIndexOf(Buffer.from('OggS', 'latin1'))
  assert.equal(ogg[last + 5] & 0x04, 0x04)
  assert.equal(durationMsOfRawOpus(raw.length), 60)
  assert.equal(durationMsOfRawOpus(0), 0)
  assert.throws(() => muxOggOpus(Buffer.alloc(0)), /录音数据为空/)
})

test('crc32Ogg is stable', () => {
  assert.equal(crc32Ogg(Buffer.from('OggS')), 1605413199)
  assert.equal(crc32Ogg(Buffer.alloc(0)), 0)
})

/* ---------------------------------------------------------------- compile */

test('ensureBleHelper compiles once, embeds the Info.plist and caches', async () => {
  const pluginRoot = await makePluginRoot('compile-root')
  const helperPath = join(dir, 'bin', 'd3200_helper')
  let calls = 0
  let seenArgs = null
  const run = async (_command, args) => {
    calls += 1
    seenArgs = args
    const outIndex = args.indexOf('-o')
    if (outIndex >= 0) await mkdir(join(dir, 'bin'), { recursive: true })
    await writeFile(args[outIndex + 1], '#!/bin/sh\nexit 0\n', 'utf8')
    return { stdout: '', stderr: '', code: 0, signal: null, timedOut: false }
  }

  const binary = await ensureBleHelper({ helperPath, pluginRoot, run })
  assert.equal(binary, helperPath)
  assert.equal(calls, 1)
  assert.ok(seenArgs.includes('-parse-as-library'))
  assert.ok(seenArgs.includes('-sectcreate'))
  assert.ok(seenArgs.includes('__info_plist'))
  assert.ok(seenArgs.includes(join(pluginRoot, 'native', 'd3200_helper_info.plist')))

  // A second call sees a fresh binary and skips swiftc.
  await ensureBleHelper({ helperPath, pluginRoot, run })
  assert.equal(calls, 1)
})

test('ensureBleHelper reports compile failures with actionable text', async () => {
  const pluginRoot = await makePluginRoot('compile-fail-root')
  const helperPath = join(dir, 'bin-fail', 'd3200_helper')
  const run = async () => ({ stdout: '', stderr: 'error: cannot find type', code: 1, signal: null, timedOut: false })
  await assert.rejects(ensureBleHelper({ helperPath, pluginRoot, run }), (error) => {
    assert.equal(error.code, 'helper_compile_failed')
    assert.match(error.message, /xcrun swiftc/)
    assert.match(error.message, /cannot find type/)
    return true
  })
})

/* ---------------------------------------------------------------- service */

test('status is available on macOS even before first compile', async () => {
  const pluginRoot = await makePluginRoot('status-root')
  const store = createStore({ storageDir: join(dir, 'status-library') })
  await store.init()
  const ble = createBleService({ store, pluginRoot, platform: 'darwin' })
  const status = ble.status()
  assert.equal(status.ok, true)
  assert.equal(status.platform, 'darwin')
  assert.equal(status.available, true)
  assert.equal(status.helper.compiled, false)
  assert.equal(status.helper.sourcePresent, true)

  const linux = createBleService({ store, pluginRoot, platform: 'linux' })
  assert.equal(linux.status().available, false)
  assert.match(linux.status().reason, /仅在 macOS/)
  await assert.rejects(linux.scan(), (error) => {
    assert.equal(error.code, 'native_unavailable')
    return true
  })
  ble.dispose()
  linux.dispose()
})

test('scan/list/record/delete call the helper and normalize its JSON', async () => {
  const pluginRoot = await makePluginRoot('ops-root')
  const store = createStore({ storageDir: join(dir, 'ops-library') })
  await store.init()
  const calls = []
  const run = async (command, args) => {
    calls.push([command, ...args])
    if (args[0] === 'scan') {
      return helperJson({
        ok: true,
        mode: 'precise',
        devices: [
          { id: 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE', name: 'soundcore Work', rssi: -50 },
          { id: 'not-a-uuid', rssi: -70 },
          { id: 'ABCDEF01-0000-0000-0000-000000000000', rssi: 'bad' },
        ],
      })
    }
    if (args[0] === 'list') {
      return helperJson({
        ok: true,
        name: 'soundcore Work',
        device: { battery: 100, firmwareVersion: '04.92', recordStatus: 0, boxMac: '' },
        files: [
          { fileId: 1700000001, endTime: 1700000002, sizeBytes: 1560, estimatedDurationMs: 1000 },
          { fileId: 1786365000, endTime: 0, sizeBytes: 320, estimatedDurationMs: 200 },
        ],
      })
    }
    if (args[0] === 'record') return helperJson({ ok: true, recordStatus: 2, acknowledged: true })
    if (args[0] === 'delete') return helperJson({ ok: true, deleted: true, fileId: 1700000001 })
    return helperJson({ ok: false, error: 'unexpected', code: 'BAD_USAGE' })
  }
  const ensureHelper = async () => join(dir, 'fake-helper')
  const queue = { enqueue: async () => ({ id: 'job' }) }
  const imported = []
  const ble = createBleService({
    store,
    queue,
    pluginRoot,
    platform: 'darwin',
    run,
    ensureHelper,
    onImported: (recording) => imported.push(recording),
  })

  const scan = await ble.scan({ mode: 'precise', timeoutMs: 5000 })
  assert.equal(scan.devices.length, 2)
  assert.equal(scan.devices[0].name, 'soundcore Work')
  assert.equal(scan.devices[1].rssi, null)
  assert.ok(calls[0].includes('--timeout'))

  const list = await ble.list({ deviceId: 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE' })
  assert.equal(list.name, 'soundcore Work')
  assert.equal(list.recordStatus, 0)
  assert.equal(list.device.boxMac, undefined)
  assert.equal(list.files.length, 2)
  assert.equal(list.files[0].fileId, 1786365000)
  assert.equal(list.files[1].fileId, 1700000001)

  const record = await ble.record({ deviceId: 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE', action: 'pause' })
  assert.equal(record.recordStatus, 2)
  assert.equal(record.acknowledged, true)

  const removed = await ble.removeFile({ deviceId: 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE', fileId: 1700000001 })
  assert.equal(removed.deleted, true)

  await assert.rejects(ble.removeFile({ deviceId: '', fileId: 1 }), (error) => {
    assert.equal(error.code, 'bad_request')
    return true
  })
  assert.equal(imported.length, 0)
  ble.dispose()
})

test('export muxes the decrypted Opus, imports it, and removes the temp file', async () => {
  const pluginRoot = await makePluginRoot('export-root')
  const store = createStore({ storageDir: join(dir, 'export-library') })
  await store.init()
  const recordingId = '20261110-100000-aaaa'
  const storeWithId = Object.create(store)
  // Deterministic id so the test can assert the index entry.
  storeWithId.importRecording = async (input) =>
    store.importRecording({ ...input, title: input.title || '录音豆录音' })

  const raw = Buffer.alloc(160 * 4, 0x22)
  let exportArgs = null
  const run = async (_command, args) => {
    if (args[0] === 'export') {
      exportArgs = args
      const outIndex = args.indexOf('--out')
      await writeFile(args[outIndex + 1], raw)
      return helperJson({ ok: true, fileId: 1700000001, sizeBytes: raw.length, durationMs: 80, expectedSizeBytes: 160 * 6 })
    }
    return helperJson({ ok: false, error: 'unexpected', code: 'BAD_USAGE' })
  }
  const queued = []
  const queue = { enqueue: async (id, language) => queued.push({ id, language }) }
  const imported = []
  const progress = []
  const ble = createBleService({
    store: storeWithId,
    queue,
    pluginRoot,
    platform: 'darwin',
    run,
    ensureHelper: async () => join(dir, 'fake-helper'),
    onImported: (recording) => imported.push(recording),
    now: () => Date.UTC(2026, 10, 10),
  })

  const result = await ble.exportRecording({
    deviceId: 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE',
    fileId: 1700000001,
    title: '录音豆录音 2026-11-10 09:56',
    autoTranscribe: true,
    language: 'zh-CN',
    onProgress: (value) => progress.push(value),
  })

  assert.ok(exportArgs.includes('export'))
  assert.equal(exportArgs[exportArgs.indexOf('--file') + 1], '1700000001')
  const outArg = exportArgs[exportArgs.indexOf('--out') + 1]
  await assert.rejects(readFile(outArg), /ENOENT/)

  assert.equal(result.fileId, 1700000001)
  assert.equal(result.durationMs, 80)
  assert.equal(result.recording.format, 'ogg')
  assert.equal(result.recording.source, 'soundcore')
  assert.equal(result.recording.deviceFileId, 1700000001)
  assert.equal(result.recording.durationMs, 80)
  assert.equal(result.recording.recordedAt, new Date(1700000001 * 1000).toISOString())
  assert.ok(result.sizeBytes > raw.length)
  assert.equal(imported.length, 1)
  assert.deepEqual(queued, [{ id: result.recording.id, language: 'zh-CN' }])
  assert.equal(progress.at(-1), 1)

  const stored = await store.list()
  assert.equal(stored.length, 1)
  assert.equal(stored[0].format, 'ogg')
  const audio = await readFile(stored[0].audioPath)
  assert.equal(audio.subarray(0, 4).toString('latin1'), 'OggS')
  assert.ok(audio.length > 0)
  ble.dispose()
})

test('helper failure inside export surfaces a mapped BleError and no import', async () => {
  const pluginRoot = await makePluginRoot('export-fail-root')
  const store = createStore({ storageDir: join(dir, 'export-fail-library') })
  await store.init()
  const run = async (_command, args) => {
    if (args[0] === 'export') {
      return helperJson({ ok: false, code: 'HANDSHAKE_FAILED', error: '录音豆没有响应 ECDH 握手。' })
    }
    return helperJson({ ok: false, error: 'unexpected', code: 'BAD_USAGE' })
  }
  const ble = createBleService({
    store,
    pluginRoot,
    platform: 'darwin',
    run,
    ensureHelper: async () => join(dir, 'fake-helper'),
  })
  await assert.rejects(
    ble.exportRecording({ deviceId: 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE', fileId: 1 }),
    (error) => {
      assert.equal(error.code, 'handshake_failed')
      assert.match(error.message, /ECDH/)
      return true
    },
  )
  assert.equal((await store.list()).length, 0)
  ble.dispose()
})

test('dispose aborts a running helper and export reports cancellation', async () => {
  const pluginRoot = await makePluginRoot('dispose-root')
  const store = createStore({ storageDir: join(dir, 'dispose-library') })
  await store.init()
  const run = (_command, _args, options = {}) =>
    new Promise((resolvePromise) => {
      const finish = () =>
        resolvePromise({ stdout: '', stderr: 'aborted', code: null, signal: 'SIGKILL', timedOut: false, aborted: true })
      if (options.signal?.aborted) return finish()
      options.signal?.addEventListener('abort', finish, { once: true })
    })
  const ble = createBleService({
    store,
    pluginRoot,
    platform: 'darwin',
    run,
    ensureHelper: async () => join(dir, 'fake-helper'),
  })
  const pending = ble.exportRecording({ deviceId: 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE', fileId: 7 })
  ble.dispose()
  await assert.rejects(pending, (error) => {
    assert.equal(error.code, 'cancelled')
    return true
  })
})

/* ------------------------------------------------------------ HTTP wiring */

test('device endpoints are wired through the same-origin API handler', async () => {
  const { createServer } = await import('node:http')
  const { createApiHandler } = await import('../host/http.mjs')
  const { createEventHub } = await import('../host/events.mjs')

  const pluginRoot = await makePluginRoot('http-root')
  const store = createStore({ storageDir: join(dir, 'http-library') })
  await store.init()
  const events = createEventHub({ heartbeatMs: 0 })
  const device = {
    status: () => ({
      ok: true,
      platform: 'darwin',
      available: true,
      reason: null,
      helper: { path: '/tmp/helper', compiled: false, source: 'x', sourcePresent: true },
    }),
    scan: async ({ timeoutMs }) => ({ devices: [{ id: '11111111-2222-3333-4444-555555555555', name: 'soundcore Work', rssi: -50 }], mode: 'precise', timeoutMs }),
    list: async ({ deviceId }) => ({
      deviceId,
      name: 'soundcore Work',
      device: { battery: 88, firmwareVersion: '04.92' },
      recordStatus: 0,
      files: [{ fileId: 42, endTime: 0, sizeBytes: 160, estimatedDurationMs: 20, exported: false }],
    }),
    exportRecording: async ({ fileId, autoTranscribe }) => {
      if (fileId === 13) throw new BleError('蓝牙已关闭。', 'bluetooth_off', 503)
      const recording = await store.importRecording({
        source: 'soundcore',
        format: 'ogg',
        durationMs: 20,
        data: Buffer.from('OggS-test'),
        deviceFileId: fileId,
      })
      return { fileId, durationMs: 20, sizeBytes: 9, recording, autoTranscribe }
    },
    record: async ({ action }) => ({ action, recordStatus: action === 'start' ? 1 : 2, acknowledged: true }),
    removeFile: async ({ fileId }) => ({ fileId, deleted: true }),
    dispose: () => {},
  }
  const handler = createApiHandler({
    store,
    queue: { enqueue: async () => ({ id: 'job' }), getJob: () => null, cancelForRecording: () => 0 },
    events,
    getRawConfig: () => ({}),
    applyConfig: async () => ({ persisted: true }),
    watchInfo: () => ({ enabled: false, port: 0, beaconPort: 0, urls: [], token: 't' }),
    appleSpeech: () => ({ available: true, reason: null }),
    device,
    version: '0.1.0',
  })
  const server = createServer((request, response) => handler(request, response))
  await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise))
  const origin = `http://127.0.0.1:${server.address().port}`
  const call = async (path, options = {}) => {
    const response = await fetch(`${origin}${path}`, {
      ...options,
      headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    })
    return { status: response.status, body: await response.json() }
  }

  try {
    const status = await call('/api/recording/device/status')
    assert.equal(status.status, 200)
    assert.equal(status.body.available, true)
    assert.equal(status.body.platform, 'darwin')

    const scan = await call('/api/recording/device/scan', { method: 'POST', body: JSON.stringify({ mode: 'precise', timeoutSeconds: 5 }) })
    assert.equal(scan.status, 200)
    assert.equal(scan.body.devices[0].name, 'soundcore Work')
    assert.equal(scan.body.devices[0].id, '11111111-2222-3333-4444-555555555555')

    const list = await call('/api/recording/device/list', { method: 'POST', body: JSON.stringify({ deviceId: '11111111-2222-3333-4444-555555555555' }) })
    assert.equal(list.status, 200)
    assert.equal(list.body.files[0].fileId, 42)
    assert.equal(list.body.device.battery, 88)

    const record = await call('/api/recording/device/record', { method: 'POST', body: JSON.stringify({ deviceId: '11111111-2222-3333-4444-555555555555', action: 'pause' }) })
    assert.equal(record.status, 200)
    assert.equal(record.body.recordStatus, 2)

    const exported = await call('/api/recording/device/export', { method: 'POST', body: JSON.stringify({ deviceId: '11111111-2222-3333-4444-555555555555', fileId: 42, autoTranscribe: true }) })
    assert.equal(exported.status, 200)
    assert.equal(exported.body.ok, true)
    assert.equal(exported.body.recording.deviceFileId, 42)
    assert.equal((await store.list()).length, 1)

    const failed = await call('/api/recording/device/export', { method: 'POST', body: JSON.stringify({ deviceId: '11111111-2222-3333-4444-555555555555', fileId: 13 }) })
    assert.equal(failed.status, 503)
    assert.equal(failed.body.code, 'bluetooth_off')

    const removed = await call('/api/recording/device/delete', { method: 'POST', body: JSON.stringify({ deviceId: '11111111-2222-3333-4444-555555555555', fileId: 42 }) })
    assert.equal(removed.status, 200)
    assert.equal(removed.body.deleted, true)

    assert.equal((await call('/api/recording/device/status', { method: 'POST' })).status, 405)
    assert.equal((await call('/api/recording/device/scan', { method: 'GET' })).status, 405)
    assert.equal((await call('/api/recording/device/nope', { method: 'POST' })).status, 404)
  } finally {
    events.dispose()
    await new Promise((resolvePromise) => server.close(resolvePromise))
  }
})

test('device endpoints report 503 when the Host has no native bridge', async () => {
  const { createServer } = await import('node:http')
  const { createApiHandler } = await import('../host/http.mjs')
  const { createEventHub } = await import('../host/events.mjs')

  const store = createStore({ storageDir: join(dir, 'http-no-ble') })
  await store.init()
  const events = createEventHub({ heartbeatMs: 0 })
  const handler = createApiHandler({
    store,
    queue: { enqueue: async () => ({ id: 'job' }), getJob: () => null, cancelForRecording: () => 0 },
    events,
    getRawConfig: () => ({}),
    applyConfig: async () => ({ persisted: true }),
    watchInfo: () => ({ enabled: false, port: 0, beaconPort: 0, urls: [], token: 't' }),
    appleSpeech: () => ({ available: false, reason: null }),
    version: '0.1.0',
  })
  const server = createServer((request, response) => handler(request, response))
  await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise))
  const origin = `http://127.0.0.1:${server.address().port}`
  try {
    const response = await fetch(`${origin}/api/recording/device/status`)
    const body = await response.json()
    assert.equal(response.status, 503)
    assert.equal(body.code, 'native_unavailable')
  } finally {
    events.dispose()
    await new Promise((resolvePromise) => server.close(resolvePromise))
  }
})
