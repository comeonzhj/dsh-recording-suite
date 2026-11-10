import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'

import { normalizeConfig } from '../host/config.mjs'
import { createStore } from '../host/store.mjs'
import { createWatchService, lanUrls, SERVICE_NAME, SERVICE_VERSION } from '../host/watch.mjs'

let dir
let store
let rawConfig
let watch
let port

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dsh-recording-watch-'))
  store = createStore({ storageDir: join(dir, 'library') })
  await store.init()
  rawConfig = normalizeConfig(
    { storageDir: join(dir, 'library'), watchImport: { enabled: true, port: 47831 } },
    { env: {} },
  )
  watch = createWatchService({
    store,
    getConfig: () => rawConfig,
    hostName: () => 'Test Mac',
    beacon: false,
  })
  await watch.start({ port: 0 })
  port = watch.info().port
  assert.ok(port > 0)
})

after(async () => {
  await watch.stop()
  await rm(dir, { recursive: true, force: true })
})

test('info/lanUrls expose the configured service port', () => {
  const info = watch.info()
  assert.equal(info.enabled, true)
  assert.equal(info.port, port)
  assert.equal(info.beaconPort, 47832)
  assert.equal(info.lastError, null)
  assert.ok(Array.isArray(info.urls))
  assert.deepEqual(lanUrls(port), lanUrls(port))
})

test('health is unauthenticated, everything else needs the Bearer token', async () => {
  const health = await fetch(`http://127.0.0.1:${port}/health`)
  assert.equal(health.status, 200)
  assert.deepEqual(await health.json(), { ok: true, service: SERVICE_NAME, version: SERVICE_VERSION })

  const unauthorized = await fetch(`http://127.0.0.1:${port}/api/watch/ping`)
  assert.equal(unauthorized.status, 401)
  assert.ok((await unauthorized.json()).error)

  const wrongToken = await fetch(`http://127.0.0.1:${port}/api/watch/ping`, {
    headers: { authorization: 'Bearer nope' },
  })
  assert.equal(wrongToken.status, 401)

  const token = await store.watchToken()
  const ping = await fetch(`http://127.0.0.1:${port}/api/watch/ping`, {
    headers: { authorization: `Bearer ${token}` },
  })
  assert.equal(ping.status, 200)
  assert.deepEqual(await ping.json(), { ok: true, name: 'Test Mac', version: SERVICE_VERSION })
})

test('upload stores an apple-watch recording and broadcasts it', async () => {
  const token = await store.watchToken()
  const imported = []
  const watcher = createWatchService({
    store,
    getConfig: () => rawConfig,
    beacon: false,
    onImported: (recording) => imported.push(recording),
  })
  await watcher.start({ port: 0 })
  const watcherPort = watcher.info().port
  try {
    const bytes = Buffer.from('fake-m4a-bytes')
    const url =
      `http://127.0.0.1:${watcherPort}/api/watch/upload` +
      `?name=${encodeURIComponent('手表录音')}&recordedAt=${encodeURIComponent('2026-11-09T10:00:00.000Z')}` +
      '&durationMs=12000&format=m4a'
    const response = await fetch(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'audio/mp4' },
      body: bytes,
    })
    assert.equal(response.status, 200)
    const payload = await response.json()
    assert.equal(payload.recording.source, 'apple-watch')
    assert.equal(payload.recording.title, '手表录音')
    assert.equal(payload.recording.format, 'm4a')
    assert.equal(payload.recording.durationMs, 12000)
    assert.equal(payload.recording.sizeBytes, bytes.length)
    assert.equal(payload.recording.recordedAt, '2026-11-09T10:00:00.000Z')
    assert.equal(imported.length, 1)
    assert.equal(imported[0].id, payload.recording.id)

    const stored = await store.get(payload.recording.id)
    assert.equal(stored.audioPath.endsWith('.m4a'), true)

    const empty = await fetch(`http://127.0.0.1:${watcherPort}/api/watch/upload`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(empty.status, 400)
    assert.equal((await fetch(`http://127.0.0.1:${watcherPort}/api/watch/unknown`, {
      headers: { authorization: `Bearer ${token}` },
    })).status, 404)
  } finally {
    await watcher.stop()
  }
})

test('rotating the token invalidates the old one immediately', async () => {
  const oldToken = await store.watchToken()
  const newToken = await store.rotateWatchToken()
  assert.notEqual(oldToken, newToken)
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/watch/ping`, {
    headers: { authorization: `Bearer ${oldToken}` },
  })).status, 401)
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/watch/ping`, {
    headers: { authorization: `Bearer ${newToken}` },
  })).status, 200)
})

test('disabled watch import does not listen', async () => {
  rawConfig = normalizeConfig(
    { storageDir: join(dir, 'library'), watchImport: { enabled: false, port: 47833 } },
    { env: {} },
  )
  const disabled = createWatchService({ store, getConfig: () => rawConfig, beacon: false })
  await disabled.start({ port: 0 })
  assert.equal(disabled.info().enabled, false)
  assert.deepEqual(disabled.info().urls, [])
  await disabled.stop()
})
