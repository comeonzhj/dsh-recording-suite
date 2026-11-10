/**
 * Recording Suite — `@` candidate injection.
 *
 * DSH's own `ctx.fileReferences` service (from `dsh-file-reference-local`) owns
 * workspace discovery. We never replace the service: we wrap the prototype
 * method so transcript Markdown files are offered first and every original
 * candidate keeps its order and count.
 *
 * The service is provided by another plugin's fiber, so this module patches the
 * shared prototype and restores the original descriptor in the effect disposer.
 * `ctx.get('fileReferences')` may return a Cordis traceable Proxy; prototype
 * inspection still reaches the real class prototype.
 */

export const TRANSCRIPT_REFERENCE_LIMIT = 8

const installed = new WeakMap()

/**
 * Merge injected transcript candidates ahead of the base candidates.
 * Injected paths win on duplicates and the base list is never truncated.
 * @param {{ path: string, kind: 'file' | 'directory' }[]} base
 * @param {{ path: string, kind?: 'file' | 'directory' }[]} extra
 */
export function mergeReferenceCandidates(base, extra) {
  const merged = []
  const seen = new Set()
  for (const candidate of [...extra, ...base]) {
    if (!candidate || typeof candidate.path !== 'string' || !candidate.path) continue
    if (seen.has(candidate.path)) continue
    seen.add(candidate.path)
    merged.push({ path: candidate.path, kind: candidate.kind === 'directory' ? 'directory' : 'file' })
  }
  return merged
}

function findListOwner(value) {
  let proto = Object.getPrototypeOf(value)
  while (proto) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'list')
    if (descriptor && typeof descriptor.value === 'function') return { proto, descriptor }
    proto = Object.getPrototypeOf(proto)
  }
  return null
}

/**
 * Install the transcript hook on one `ctx.fileReferences` service instance.
 *
 * @param {object} service the service object (`ctx.get('fileReferences')`).
 * @param {() => Promise<{ path: string, kind?: 'file' | 'directory' }[]>} listExtras
 *   returns injected candidates in display order.
 * @returns {{ dispose: () => void, installed: boolean, reason?: string }}
 */
export function installReferenceHook(service, listExtras) {
  if (!service || typeof service.list !== 'function') {
    return { installed: false, reason: 'fileReferences service has no list()', dispose: () => {} }
  }

  // An own `list` (a plugin-level override) wins over the prototype method.
  const ownDescriptor = Object.getOwnPropertyDescriptor(service, 'list')
  if (ownDescriptor && typeof ownDescriptor.value === 'function') {
    return installOn(service, ownDescriptor, listExtras, 'own')
  }
  const owner = findListOwner(service)
  if (!owner) {
    return { installed: false, reason: 'cannot locate fileReferences.list()', dispose: () => {} }
  }

  const existing = installed.get(owner.proto)
  if (existing) {
    return { installed: false, reason: 'already installed by another recording-suite context', dispose: () => {} }
  }
  return installOn(owner.proto, owner.descriptor, listExtras, 'prototype')
}

function installOn(target, descriptor, listExtras, where) {
  const original = descriptor.value

  async function wrappedFileReferenceList(agent, query, signal) {
    let base = []
    try {
      const result = await original.apply(this, [agent, query, signal])
      if (Array.isArray(result)) base = result
    } catch (error) {
      // Discovery failures must never break the composer; the transcript
      // candidates are still useful on their own.
      base = []
      void error
    }

    let extra = []
    try {
      if (!signal?.aborted) extra = await listExtras(String(query ?? ''))
    } catch {
      extra = []
    }
    return mergeReferenceCandidates(base, Array.isArray(extra) ? extra : [])
  }

  Object.defineProperty(target, 'list', {
    ...descriptor,
    value: wrappedFileReferenceList,
  })
  installed.set(target, { descriptor })

  return {
    installed: true,
    where,
    dispose() {
      const entry = installed.get(target)
      if (!entry) return
      installed.delete(target)
      try {
        Object.defineProperty(target, 'list', entry.descriptor)
      } catch {
        /* prototype may be frozen; nothing else to restore */
      }
    },
  }
}

/**
 * Wire the hook into a Cordis context. Registers automatic restoration through
 * the context effect so unloading the plugin leaves DSH untouched.
 *
 * @param {any} ctx injected context that owns `fileReferences`.
 * @param {{ referenceCandidates: (query: string, limit?: number) => Promise<any[]> }} store
 * @param {{ logger?: any, limit?: number }} [options]
 * @returns {boolean} whether the hook is active.
 */
export function mountReferenceHook(ctx, store, options = {}) {
  const logger = options.logger
  const limit = options.limit ?? TRANSCRIPT_REFERENCE_LIMIT
  const service = typeof ctx.get === 'function' ? ctx.get('fileReferences') : ctx.fileReferences
  if (!service) {
    logger?.warn?.('recording-suite: 未找到 ctx.fileReferences，@ 录音注入不可用')
    return false
  }

  const hook = installReferenceHook(service, (query) => store.referenceCandidates(query, limit))
  if (!hook.installed) {
    logger?.warn?.(`recording-suite: @ 注入安装失败：${hook.reason ?? 'unknown'}`)
    return false
  }

  if (typeof ctx.effect === 'function') {
    ctx.effect(() => () => hook.dispose(), 'recording-suite: file reference hook')
  }
  logger?.info?.(`recording-suite: @ 注入已启用（${hook.where ?? 'prototype'}）`)
  return true
}
