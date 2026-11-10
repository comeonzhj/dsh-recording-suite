import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  installReferenceHook,
  mergeReferenceCandidates,
  mountReferenceHook,
} from '../host/references.mjs'

class FakeFileReferenceService {
  constructor(base) {
    this.base = base
    this.calls = []
  }

  async list(agent, query, signal) {
    this.calls.push({ agent, query, signal })
    return this.base
  }
}

test('mergeReferenceCandidates: injected first, deduped, base preserved', () => {
  const merged = mergeReferenceCandidates(
    [
      { path: '/ws/src/a.ts', kind: 'file' },
      { path: '/ws/README.md', kind: 'file' },
      { path: '/ws/src', kind: 'directory' },
    ],
    [
      { path: '/transcripts/newest.md' },
      { path: '/ws/README.md' },
      { path: '/transcripts/second.md' },
    ],
  )
  assert.deepEqual(merged, [
    { path: '/transcripts/newest.md', kind: 'file' },
    { path: '/ws/README.md', kind: 'file' },
    { path: '/transcripts/second.md', kind: 'file' },
    { path: '/ws/src/a.ts', kind: 'file' },
    { path: '/ws/src', kind: 'directory' },
  ])
  assert.deepEqual(mergeReferenceCandidates([], []), [])
})

test('installReferenceHook: wraps the prototype, injects and restores on dispose', async () => {
  const service = new FakeFileReferenceService([{ path: '/ws/a.ts', kind: 'file' }])
  const proto = Object.getPrototypeOf(service)
  const original = proto.list

  const hook = installReferenceHook(service, async (query) => {
    assert.equal(typeof query, 'string')
    return [{ path: `/transcripts/${query || 'recent'}.md` }]
  })
  assert.equal(hook.installed, true)
  assert.equal(hook.where, 'prototype')
  assert.notEqual(proto.list, original)

  const signal = new AbortController().signal
  const listed = await service.list({ id: 'agent-1' }, '', signal)
  assert.deepEqual(listed, [
    { path: '/transcripts/recent.md', kind: 'file' },
    { path: '/ws/a.ts', kind: 'file' },
  ])
  assert.equal(service.calls.length, 1)
  assert.equal(service.calls[0].query, '')

  // A second installation in the same process is refused rather than stacking wrappers.
  const second = installReferenceHook(service, async () => [])
  assert.equal(second.installed, false)
  assert.match(second.reason, /already installed/)

  hook.dispose()
  assert.equal(proto.list, original)
  const after = await service.list({ id: 'agent-1' }, 'x', signal)
  assert.deepEqual(after, [{ path: '/ws/a.ts', kind: 'file' }])
})

test('installReferenceHook: base discovery failure never breaks the candidate list', async () => {
  const service = new FakeFileReferenceService([])
  service.list = async () => {
    throw new Error('workspace unavailable')
  }
  // Own method: patched in place and restored.
  const hook = installReferenceHook(service, async () => [{ path: '/transcripts/a.md' }])
  assert.equal(hook.installed, true)
  const listed = await service.list({}, '', new AbortController().signal)
  assert.deepEqual(listed, [{ path: '/transcripts/a.md', kind: 'file' }])
  hook.dispose()
  await assert.rejects(service.list({}, '', new AbortController().signal), /workspace unavailable/)
})

test('mountReferenceHook: wires to ctx.get and restores through the effect', async () => {
  const service = new FakeFileReferenceService([{ path: '/ws/b.ts', kind: 'file' }])
  const proto = Object.getPrototypeOf(service)
  const original = proto.list
  let effectDisposer
  const logs = []
  const ctx = {
    get: (name) => (name === 'fileReferences' ? service : undefined),
    effect: (callback) => {
      effectDisposer = callback()
      return () => effectDisposer?.()
    },
    logger: { info: (message) => logs.push(message), warn: (message) => logs.push(message) },
  }
  const store = {
    referenceCandidates: async (query, limit) => {
      assert.equal(limit, 8)
      return [{ path: `/transcripts/${query || 'latest'}.md` }]
    },
  }
  assert.equal(mountReferenceHook(ctx, store, { logger: ctx.logger }), true)
  assert.notEqual(proto.list, original)
  assert.ok(logs.some((line) => /@ 注入已启用/.test(line)))
  effectDisposer()
  assert.equal(proto.list, original)

  // Missing service is reported, not thrown.
  assert.equal(mountReferenceHook({ get: () => undefined, effect() {}, logger: { warn() {} } }, store), false)
})
