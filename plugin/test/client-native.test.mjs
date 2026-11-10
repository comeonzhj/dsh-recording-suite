import assert from 'node:assert/strict'
import test from 'node:test'

import { fallbackTranslate } from '../src-client/i18n.js'
import { DISCOVERY_MODE, NativeD3200Client, nativeErrorText, pickPreferredDevice } from '../src-client/nativeD3200Client.js'

const DEVICE_ID = '11111111-2222-3333-4444-555555555555'

function makeFakeApi(overrides = {}) {
  const calls = []
  const deleted = new Set()
  const base = {
    deviceStatus: async () => ({ ok: true, platform: 'darwin', available: true, reason: null }),
    deviceScan: async (payload) => {
      calls.push(['scan', payload])
      return { ok: true, devices: [{ id: DEVICE_ID, name: 'soundcore Work', rssi: -50 }], mode: payload.mode }
    },
    deviceList: async (payload) => {
      calls.push(['list', payload])
      return {
        ok: true,
        deviceId: payload.deviceId,
        name: 'soundcore Work',
        device: { battery: 100, firmwareVersion: '04.92', boxBattery: 100, totalMemoryKb: 7551136, freeMemoryKb: 7532704 },
        recordStatus: 0,
        files: [
          { fileId: 1700000001, endTime: 1700000002, sizeBytes: 1560, estimatedDurationMs: 1000, exported: false },
        ].filter((file) => !deleted.has(file.fileId)),
      }
    },
    deviceExport: async (payload) => {
      calls.push(['export', payload])
      return {
        ok: true,
        fileId: payload.fileId,
        durationMs: 80,
        sizeBytes: 1234,
        recording: { id: '20261110-100000-aaaa', format: 'ogg', source: 'soundcore' },
      }
    },
    deviceRecord: async (payload) => {
      calls.push(['record', payload])
      return { ok: true, action: payload.action, recordStatus: payload.action === 'start' ? 1 : 2, acknowledged: true }
    },
    deviceDelete: async (payload) => {
      calls.push(['delete', payload])
      deleted.add(payload.fileId)
      return { ok: true, fileId: payload.fileId, deleted: true }
    },
  }
  return { api: { ...base, ...overrides }, calls }
}

test('pickPreferredDevice prefers a named soundcore device', () => {
  assert.deepEqual(
    pickPreferredDevice([
      { id: 'A', name: 'AirPods-4' },
      { id: 'B', name: 'soundcore Work' },
    ]),
    { id: 'B', name: 'soundcore Work' },
  )
  assert.deepEqual(pickPreferredDevice([{ id: 'A', name: null }]), { id: 'A', name: null })
  assert.equal(pickPreferredDevice([]), null)
  assert.equal(pickPreferredDevice([{ id: 'A', name: 'midea' }, { id: 'B', name: 'TG' }]), null)
  assert.equal(pickPreferredDevice(undefined), null)
  // Invalid ids from a malformed scan result are ignored.
  assert.deepEqual(pickPreferredDevice([{ id: '' }, { id: 'C', name: 'D3200' }]), { id: 'C', name: 'D3200' })
})

test('native client connect scans, lists and exposes the device snapshot shape', async () => {
  const { api, calls } = makeFakeApi()
  const client = new NativeD3200Client({ api })
  const states = []
  const unsubscribe = client.subscribe((state) => states.push(state))
  assert.equal(client.snapshot().transport, 'native')
  assert.equal(client.snapshot().supported, true)
  assert.equal(client.snapshot().connected, false)

  const snapshot = await client.connect({ discoveryMode: DISCOVERY_MODE.precise })
  assert.equal(snapshot.connected, true)
  assert.equal(snapshot.connecting, false)
  assert.equal(snapshot.deviceName, 'soundcore Work')
  assert.equal(snapshot.device.battery, 100)
  assert.equal(snapshot.files.length, 1)
  assert.equal(snapshot.recordStatus, 0)
  assert.deepEqual(calls[0], ['scan', { mode: 'precise', timeoutSeconds: 8 }])
  assert.deepEqual(calls[1], ['list', { deviceId: DEVICE_ID }])
  assert.ok(states.length >= 3)
  unsubscribe()
  client.dispose()
})

test('native client connect reports a missing device as device_not_found', async () => {
  const { api } = makeFakeApi({
    deviceScan: async () => ({ ok: true, devices: [{ id: 'A', name: 'midea' }, { id: 'B', name: 'TG' }] }),
  })
  const client = new NativeD3200Client({ api })
  await assert.rejects(client.connect(), (error) => {
    assert.equal(error.code, 'device_not_found')
    assert.equal(client.snapshot().connected, false)
    assert.equal(client.snapshot().error, 'device_not_found')
    return true
  })
  client.dispose()
})

test('native client rescans when the CoreBluetooth UUID rotated between scan and list', async () => {
  let listCalls = 0
  const scans = []
  const { api } = makeFakeApi({
    deviceScan: async (payload) => {
      scans.push(payload)
      const id = scans.length === 1 ? 'OLD-UUID-0000-0000-0000-000000000000' : 'NEW-UUID-1111-1111-1111-111111111111'
      return { ok: true, devices: [{ id, name: 'soundcore Work', rssi: -40 }], mode: payload.mode }
    },
    deviceList: async ({ deviceId }) => {
      listCalls += 1
      if (listCalls === 1) {
        const error = new Error('附近没有找到录音豆')
        error.status = 404
        error.body = { error: '附近没有找到录音豆。', code: 'device_not_found' }
        throw error
      }
      return { ok: true, deviceId, name: 'soundcore Work', device: { battery: 90 }, recordStatus: 0, files: [] }
    },
  })
  const client = new NativeD3200Client({ api })
  const snapshot = await client.connect()
  assert.equal(snapshot.connected, true)
  assert.equal(scans.length, 2)
  assert.equal(snapshot.deviceId, undefined)
  assert.equal(client.snapshot().device.battery, 90)
  client.dispose()
})

test('native client maps Host API failures into device errors', async () => {
  const { api } = makeFakeApi({
    deviceList: async () => {
      const error = new Error('蓝牙已关闭')
      error.status = 503
      error.body = { error: '蓝牙已关闭。请打开蓝牙后重试。', code: 'bluetooth_off' }
      throw error
    },
  })
  const client = new NativeD3200Client({ api })
  await assert.rejects(client.connect(), (error) => {
    assert.equal(error.code, 'bluetooth_off')
    assert.match(error.params.detail, /蓝牙已关闭/)
    return true
  })
  client.dispose()
})

test('native client record/delete update the snapshot through the Host', async () => {
  const { api, calls } = makeFakeApi()
  const client = new NativeD3200Client({ api })
  await client.connect()

  const recording = await client.startRecording()
  assert.equal(recording.recordStatus, 1)
  const paused = await client.pauseRecording()
  assert.equal(paused.recordStatus, 2)
  assert.deepEqual(calls[2], ['record', { deviceId: DEVICE_ID, action: 'start' }])
  assert.deepEqual(calls[3], ['record', { deviceId: DEVICE_ID, action: 'pause' }])

  const afterDelete = await client.deleteRecording(1700000001)
  assert.equal(afterDelete.files.length, 0)
  assert.deepEqual(calls[4], ['delete', { deviceId: DEVICE_ID, fileId: 1700000001 }])
  // deleteRecording refreshes the list afterwards.
  assert.equal(calls[5][0], 'list')
  client.dispose()
})

test('native export marks the result as already imported and caches it', async () => {
  const { api, calls } = makeFakeApi()
  const client = new NativeD3200Client({ api })
  await client.connect()

  const result = await client.exportRecording(1700000001, {
    autoTranscribe: true,
    title: '录音豆录音 2026-11-10 09:56',
    recordedAt: '2026-11-10T01:56:01.000Z',
  })
  assert.equal(result.imported, true)
  assert.equal(result.format, 'ogg')
  assert.equal(result.durationMs, 80)
  assert.equal(result.recording.id, '20261110-100000-aaaa')
  const exportCall = calls.find(([name]) => name === 'export')
  assert.equal(exportCall[1].deviceId, DEVICE_ID)
  assert.equal(exportCall[1].fileId, 1700000001)
  assert.equal(exportCall[1].autoTranscribe, true)
  assert.equal(exportCall[1].title, '录音豆录音 2026-11-10 09:56')
  assert.equal(exportCall[1].recordedAt, '2026-11-10T01:56:01.000Z')

  const snapshot = client.snapshot()
  assert.equal(snapshot.export.status, 'complete')
  assert.equal(snapshot.files[0].exported, true)

  // Cached: a second call must not hit the Host again (no duplicate import).
  await client.exportRecording(1700000001)
  assert.equal(calls.filter(([name]) => name === 'export').length, 1)
  client.dispose()
})

test('native export failure clears progress and keeps a stable code', async () => {
  const { api } = makeFakeApi({
    deviceExport: async () => {
      const error = new Error('录音豆没有响应 ECDH 握手。')
      error.status = 502
      error.body = { error: '录音豆没有响应 ECDH 握手。', code: 'handshake_failed' }
      throw error
    },
  })
  const client = new NativeD3200Client({ api })
  await client.connect()
  await assert.rejects(client.exportRecording(1700000001), (error) => {
    assert.equal(error.code, 'handshake_failed')
    return true
  })
  assert.equal(client.snapshot().export, null)
  client.dispose()
})

test('export/record before connect fail with not_connected', async () => {
  const { api } = makeFakeApi()
  const client = new NativeD3200Client({ api })
  await assert.rejects(client.exportRecording(1), (error) => error.code === 'not_connected')
  await assert.rejects(client.startRecording(), (error) => error.code === 'not_connected')
  client.dispose()
})

test('nativeErrorText localizes native codes and falls back to shared codes', () => {
  const t = (key, params) => fallbackTranslate(key, params)
  assert.equal(
    nativeErrorText(t, { code: 'bluetooth_off', message: '蓝牙已关闭' }),
    fallbackTranslate('bean.error.bluetooth_off'),
  )
  const unauthorized = nativeErrorText(t, { code: 'bluetooth_unauthorized', message: 'denied' })
  assert.match(unauthorized, /隐私与安全性/)
  const detail = nativeErrorText(t, { code: 'native_unavailable', message: 'boom', params: { detail: 'Host 没加载' } })
  assert.match(detail, /本机蓝牙桥不可用/)
  assert.match(detail, /Host 没加载/)
  // Codes already known to format.js keep their existing translations.
  const handshake = nativeErrorText(t, { code: 'handshake_failed', message: 'ECDH 校验失败' })
  assert.match(handshake, /ECDH 握手校验失败/)
  // Unknown codes fall back to the raw message.
  assert.equal(nativeErrorText(t, { code: 'weird', message: 'something odd' }), 'something odd')
})
