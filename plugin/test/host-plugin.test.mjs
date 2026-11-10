import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'

import { apply as bundleApply, name as bundleName } from '../index.js'
import { applyRecordingHost, detectAppleSpeech, pluginVersion } from '../host/plugin.mjs'
import { TOOL_NAME } from '../host/tools.mjs'

let dir

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dsh-recording-plugin-'))
})

after(async () => {
  await rm(dir, { recursive: true, force: true })
})

test('bundle entry exports name and apply', () => {
  assert.equal(bundleName, 'recording-suite')
  assert.equal(typeof bundleApply, 'function')
})

test('pluginVersion reads package.json; Apple Speech probe is honest about the platform', () => {
  assert.equal(pluginVersion(), '0.1.0')
  const probe = detectAppleSpeech()
  assert.equal(typeof probe.available, 'boolean')
  if (process.platform === 'darwin') {
    assert.equal(probe.reason, null)
  } else {
    assert.match(probe.reason, /macOS/)
  }
})

test('applyRecordingHost injects DSH services, registers route/tool/prompt and disposes', async () => {
  const disposers = []
  const registeredRoutes = []
  const registeredTools = []
  const registeredSections = []
  let injectedDeps = null
  let injectedCallback = null
  const logs = []

  const fileReferenceService = {
    async list() {
      return [{ path: '/ws/a.ts', kind: 'file' }]
    },
  }

  const ctx = {
    logger: {
      info: (message) => logs.push(message),
      warn: (message) => logs.push(message),
    },
    fiber: { entry: { id: 'recording-suite' } },
    get: (name) => {
      if (name === 'fileReferences') return fileReferenceService
      if (name === 'configEditor') return undefined
      return undefined
    },
    inject: (deps, callback) => {
      injectedDeps = deps
      injectedCallback = callback
      return { dispose: async () => {} }
    },
  }

  applyRecordingHost(ctx, {
    provider: 'none',
    language: 'zh-CN',
    storageDir: join(dir, 'library'),
    watchImport: { enabled: false, port: 47831 },
  })

  assert.deepEqual(injectedDeps, ['fileReferences', 'workingDirectory', 'webServer', 'tools', 'systemPrompt'])
  assert.equal(typeof injectedCallback, 'function')

  const hostCtx = {
    effect: (callback) => {
      const disposer = callback()
      disposers.push(disposer)
      return () => disposer?.()
    },
    webServer: {
      register: (route) => {
        registeredRoutes.push(route)
        return () => registeredRoutes.splice(registeredRoutes.indexOf(route), 1)
      },
    },
    tools: {
      register: (definition) => {
        registeredTools.push(definition)
        return () => registeredTools.splice(registeredTools.indexOf(definition), 1)
      },
    },
    systemPrompt: {
      section: (section) => {
        registeredSections.push(section)
        return () => registeredSections.splice(registeredSections.indexOf(section), 1)
      },
    },
    get: (name) => (name === 'fileReferences' ? fileReferenceService : undefined),
  }

  injectedCallback(hostCtx)
  assert.equal(registeredRoutes.length, 1)
  assert.equal(registeredRoutes[0].kind, 'prefix')
  assert.equal(registeredRoutes[0].path, '/api/recording')
  assert.equal(typeof registeredRoutes[0].handler, 'function')
  assert.equal(registeredTools.length, 1)
  assert.equal(registeredTools[0].name, TOOL_NAME)
  assert.equal(registeredSections.length, 1)
  assert.ok(logs.some((line) => /@ 注入已启用/.test(line)))

  // The deferred boot creates the data root.
  const started = Date.now()
  while (registeredTools.length > 0 && Date.now() - started < 2000) {
    let ready = false
    try {
      const { stat } = await import('node:fs/promises')
      ready = (await stat(join(dir, 'library', 'index.json'))).isFile()
    } catch {
      ready = false
    }
    if (ready) break
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 10))
  }

  for (const disposer of disposers) await disposer?.()
  assert.equal(registeredRoutes.length, 0)
  assert.equal(registeredTools.length, 0)
  assert.equal(registeredSections.length, 0)
  // The prototype hook installed on the fake service is restored too.
  assert.equal(typeof fileReferenceService.list, 'function')
})
