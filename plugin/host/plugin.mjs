/**
 * Recording Suite — Host plugin wiring.
 *
 * `apply(ctx, config)` is the entry point used by `plugin/index.js`. The Host
 * half only imports `node:` builtins: the bundle is linked into a DSH profile
 * where `@deepseek-ai/*` is not resolvable from this package, so every DSH
 * capability is reached through injected services (`ctx.get`, `ctx.inject`).
 */

import { existsSync, readFileSync } from 'node:fs'
import { hostname } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { applyConfigToEntry, normalizeConfig } from './config.mjs'
import { reconcileInterruptedJobs, createTranscriptionQueue } from './asr.mjs'
import { createBleService } from './ble.mjs'
import { createEventHub } from './events.mjs'
import { createApiHandler } from './http.mjs'
import { createWatchService } from './watch.mjs'
import { mountReferenceHook } from './references.mjs'
import { registerRecordingTools } from './tools.mjs'
import { createStore } from './store.mjs'

/** `plugin/` — the installed package root (native helpers live under it). */
export const PLUGIN_ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

/** API surface version reported by `/status`. */
export function pluginVersion() {
  try {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
    return typeof pkg.version === 'string' && pkg.version ? pkg.version : '0.1.0'
  } catch {
    return '0.1.0'
  }
}

let appleSpeechProbe = null

/**
 * Cheap Apple Speech availability probe for `/status`.
 * This never triggers the TCC prompt: it only checks the platform, the Swift
 * toolchain and the shipped helper source.
 * @returns {{ available: boolean, reason: string | null }}
 */
export function detectAppleSpeech() {
  if (appleSpeechProbe) return appleSpeechProbe
  if (process.platform !== 'darwin') {
    appleSpeechProbe = { available: false, reason: 'Apple Speech 仅在 macOS 上可用' }
    return appleSpeechProbe
  }
  if (!existsSync('/usr/bin/xcrun')) {
    appleSpeechProbe = { available: false, reason: '缺少 xcrun：请安装 Xcode Command Line Tools（xcode-select --install）' }
    return appleSpeechProbe
  }
  if (!existsSync(join(PLUGIN_ROOT, 'native', 'apple_transcribe.swift'))) {
    appleSpeechProbe = { available: false, reason: '插件缺少 native/apple_transcribe.swift' }
    return appleSpeechProbe
  }
  appleSpeechProbe = { available: true, reason: null }
  return appleSpeechProbe
}

const messageOf = (error) => (error instanceof Error ? error.message : String(error))

/**
 * Wire the Recording Suite into one Cordis context.
 * @param {any} ctx Cordis context provided to the plugin.
 * @param {Record<string, unknown>} [config] raw plugin config from the patch layer.
 */
export function applyRecordingHost(ctx, config = {}) {
  const logger = ctx.logger ?? console
  let rawConfig = config && typeof config === 'object' ? { ...config } : {}
  let resolved = normalizeConfig(rawConfig)

  const store = createStore({ storageDir: resolved.storageDir, logger })
  const events = createEventHub({ logger })
  const watch = createWatchService({
    store,
    getConfig: () => resolved,
    logger,
    hostName: () => hostname(),
    onImported: (recording) => events.broadcast('recording', { type: 'imported', recording }),
  })

  const queue = createTranscriptionQueue({
    store,
    getConfig: () => resolved,
    pluginRoot: PLUGIN_ROOT,
    logger,
    emitJob: (event) => events.broadcast('job', event),
    emitRecording: (event) => events.broadcast('recording', event),
  })

  // Native CoreBluetooth bridge for the D3200 (macOS only; Electron cannot
  // drive BLE without a browser chooser); browser BLE is not used.
  // Client-side fallback on other platforms/browsers.
  const ble = createBleService({
    store,
    queue,
    pluginRoot: PLUGIN_ROOT,
    logger,
    onImported: (recording) => events.broadcast('recording', { type: 'imported', recording }),
  })

  /** Persist through the config editor when this entry owns profile config. */
  async function persistConfig(nextRaw) {
    const entry = ctx.fiber?.entry
    const editor = typeof ctx.get === 'function' ? ctx.get('configEditor') : undefined
    if (!editor || !entry) {
      return {
        persisted: false,
        warning: '配置编辑器不可用（插件未从 profile patch 加载），本次设置仅在当前进程内生效，重启后会丢失。',
      }
    }
    try {
      await editor.edit(entry, (current) => applyConfigToEntry(current, nextRaw))
      return { persisted: true }
    } catch (error) {
      return {
        persisted: false,
        warning: `配置持久化失败：${messageOf(error)}。本次设置仅在当前进程内生效。`,
      }
    }
  }

  /**
   * Apply a `POST /api/recording/config` body: persist, then update the live
   * config (and restart the LAN service) without waiting for the reload.
   */
  async function applyConfig(nextRaw) {
    const previousStorageDir = resolved.storageDir
    const result = await persistConfig(nextRaw)
    const normalized = normalizeConfig(nextRaw)
    if (!result.persisted && normalized.storageDir !== previousStorageDir) {
      normalized.storageDir = previousStorageDir
      result.warning = `${result.warning ?? ''} 存储目录需要重启后才能切换。`.trim()
    }
    rawConfig = { ...nextRaw }
    resolved = normalized
    await watch.start()
    return result
  }

  const handler = createApiHandler({
    store,
    queue,
    events,
    getRawConfig: () => rawConfig,
    applyConfig,
    watchInfo: () => watch.info(),
    appleSpeech: detectAppleSpeech,
    device: ble,
    version: pluginVersion(),
    logger,
  })

  const injected = ctx.inject(
    ['fileReferences', 'workingDirectory', 'webServer', 'tools', 'systemPrompt'],
    (hostCtx) => {
      let routeDispose = null
      let toolsDispose = null

      hostCtx.effect(() => {
        return () => {
          try {
            routeDispose?.()
          } catch {
            /* ignore */
          }
          try {
            toolsDispose?.()
          } catch {
            /* ignore */
          }
          events.dispose()
          try {
            ble.dispose()
          } catch {
            /* ignore */
          }
          queue.dispose().catch(() => {})
          watch.stop().catch(() => {})
        }
      })

      // Routes and tools are registered synchronously so the first request and
      // the next model step see them; disk work happens inside handlers.
      try {
        routeDispose = hostCtx.webServer.register({
          kind: 'prefix',
          path: '/api/recording',
          handler,
        })
      } catch (error) {
        logger.warn?.(`recording-suite: 注册 /api/recording 路由失败：${messageOf(error)}`)
      }

      toolsDispose = registerRecordingTools(hostCtx, { store, queue, logger })
      mountReferenceHook(hostCtx, store, { logger })

      ;(async () => {
        try {
          await store.init()
          await reconcileInterruptedJobs(store, 'Host 重启，转录任务已中断，请重新发起转录。')
        } catch (error) {
          logger.warn?.(`recording-suite: 初始化录音库失败：${messageOf(error)}`)
        }
        try {
          await watch.start()
        } catch (error) {
          logger.warn?.(`recording-suite: 启动手表导入服务失败：${messageOf(error)}`)
        }
      })()
    },
  )

  return { store, queue, events, watch, ble, injected }
}
