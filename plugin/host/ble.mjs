/**
 * Recording Suite — native Bluetooth bridge to the soundcore Work (D3200).
 *
 * The DSH desktop window is Electron and has no browser device chooser,
 * so the Host drives CoreBluetooth through a compiled Swift helper instead
 * (`plugin/native/d3200_helper.swift` → `<storage>/bin/d3200_helper`).
 *
 * Responsibilities:
 *   - compile/cache the helper once (same pattern as the Apple Speech helper);
 *   - spawn one helper process per device operation with timeout/cancellation;
 *   - parse the helper's single-line JSON contract and map failure codes into
 *     actionable messages the Client can localize;
 *   - mux the decrypted bare Opus into Ogg/Opus and import it into the store.
 *
 * The module imports only `node:` builtins and sibling Host modules, so it also
 * runs from a profile-linked plugin package where `@deepseek-ai/*` is missing.
 */

import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { chmod, mkdir, readFile, rename, rm, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { durationMsOfRawOpus, muxOggOpus } from './ogg.mjs'

/* ----------------------------------------------------------------- errors */

/** Failure carrying a stable machine code plus a user-facing message. */
export class BleError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {number} [httpStatus]
   */
  constructor(message, code = 'device_failed', httpStatus = 500) {
    super(message)
    this.name = 'BleError'
    this.code = code
    this.httpStatus = httpStatus
  }
}

/** Helper failure codes (stdout JSON `code`) → Host API codes + guidance. */
const HELPER_ERROR_MAP = {
  BLUETOOTH_UNAUTHORIZED: {
    code: 'bluetooth_unauthorized',
    status: 503,
    hint: '请在 系统设置 > 隐私与安全性 > 蓝牙 中允许 DeepSeek Harness（或运行 Host 的终端）使用蓝牙，然后重试。',
  },
  BLUETOOTH_OFF: {
    code: 'bluetooth_off',
    status: 503,
    hint: '请在 系统设置 > 蓝牙 中打开蓝牙后重试。',
  },
  BLUETOOTH_UNSUPPORTED: { code: 'native_unavailable', status: 503, hint: '这台 Mac 不支持蓝牙低功耗。' },
  BLUETOOTH_STATE_UNKNOWN: { code: 'bluetooth_off', status: 503, hint: '蓝牙状态尚未就绪，请稍后重试。' },
  DEVICE_NOT_FOUND: { code: 'device_not_found', status: 404, hint: '请唤醒录音豆，并确认它没有连在手机或飞书 App 上。' },
  BAD_DEVICE_ID: { code: 'bad_request', status: 400, hint: null },
  CONNECT_FAILED: { code: 'connect_failed', status: 502, hint: '请确认录音豆在附近且未被其他 App 占用。' },
  CONNECT_TIMEOUT: { code: 'connect_failed', status: 504, hint: '请唤醒录音豆后重试。' },
  DISCONNECTED: { code: 'connect_failed', status: 502, hint: '连接中途断开，请重试。' },
  SERVICE_NOT_FOUND: { code: 'connect_failed', status: 502, hint: '这台设备没有暴露录音豆的 GATT 服务，可能不是 D3200。' },
  CHARACTERISTIC_NOT_FOUND: { code: 'connect_failed', status: 502, hint: null },
  NOTIFY_FAILED: { code: 'connect_failed', status: 502, hint: null },
  NOT_CONNECTED: { code: 'not_connected', status: 409, hint: null },
  HANDSHAKE_FAILED: { code: 'handshake_failed', status: 502, hint: '录音豆可能被其他 App 占用，请关闭后重试。' },
  HANDSHAKE_TIMEOUT: { code: 'handshake_failed', status: 504, hint: '请唤醒录音豆后重试。' },
  KEY_CHECK_FAILED: { code: 'key_check_failed', status: 502, hint: null },
  DEVICE_REJECTED_EXPORT: { code: 'device_rejected_export', status: 502, hint: null },
  EXPORT_TIMEOUT: { code: 'timeout', status: 504, hint: '导出超时；请让录音豆保持唤醒并靠近电脑。' },
  EXPORT_INCOMPLETE: { code: 'export_incomplete', status: 502, hint: null },
  EMPTY_AUDIO: { code: 'empty_audio', status: 502, hint: null },
  DELETE_REJECTED: { code: 'delete_rejected', status: 502, hint: null },
  DELETE_TIMEOUT: { code: 'timeout', status: 504, hint: null },
  LIST_TIMEOUT: { code: 'timeout', status: 504, hint: '请唤醒录音豆后重试。' },
  INFO_TIMEOUT: { code: 'timeout', status: 504, hint: '设备信息读取超时，但文件列表可能仍然可用。' },
  RECORD_TIMEOUT: { code: 'timeout', status: 504, hint: '录音状态响应超时。' },
  CRYPTO_FAILED: { code: 'export_failed', status: 502, hint: null },
  OUTPUT_ENCODE: { code: 'device_failed', status: 500, hint: null },
  INTERNAL: { code: 'device_failed', status: 500, hint: null },
  BAD_USAGE: { code: 'bad_request', status: 400, hint: null },
}

/**
 * Map a helper JSON failure to a `BleError`.
 * @param {{ code?: string, error?: string } | null | undefined} payload
 * @param {string} [fallback]
 */
export function mapHelperError(payload, fallback = '录音豆操作失败') {
  const rawCode = String(payload?.code ?? '')
  const rawMessage = String(payload?.error ?? fallback).trim() || fallback
  const mapped = HELPER_ERROR_MAP[rawCode]
  if (!mapped) {
    return new BleError(`${rawMessage}${rawCode ? `（${rawCode}）` : ''}`, 'device_failed', 502)
  }
  const message = mapped.hint && !rawMessage.includes(mapped.hint) ? `${rawMessage}（${mapped.hint}）` : rawMessage
  return new BleError(message, mapped.code, mapped.status)
}

/** Failure for a platform/toolchain problem before the helper could run. */
export function nativeUnavailableError(reason) {
  return new BleError(reason || '原生蓝牙桥仅在 macOS 上可用', 'native_unavailable', 503)
}

/* ----------------------------------------------------------------- output */

/**
 * Parse the helper's single-line JSON contract. stderr is progress only and is
 * never parsed, so stray log lines on stdout are tolerated like `asr.mjs`.
 * @param {string} stdout
 * @returns {Record<string, any> | null} parsed payload, or null when malformed.
 */
export function parseHelperOutput(stdout) {
  const trimmed = String(stdout ?? '').trim()
  if (!trimmed) return null
  const lines = trimmed.split('\n')
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index].trim()
    if (!line.startsWith('{')) continue
    try {
      const parsed = JSON.parse(line)
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      /* keep looking */
    }
  }
  return null
}

/**
 * D3200 file ids are Unix seconds; reject implausible values so a bad id never
 * becomes a 1970 recording date.
 * @param {unknown} fileId
 * @param {number} [now]
 * @returns {string | null} ISO 8601 or null.
 */
export function recordedAtFromFileId(fileId, now = Date.now()) {
  const value = Number(fileId)
  if (!Number.isFinite(value) || value <= 0) return null
  const ms = value * 1000
  const earliest = Date.UTC(2000, 0, 1)
  const latest = now + 24 * 60 * 60 * 1000
  if (ms < earliest || ms > latest) return null
  return new Date(ms).toISOString()
}

/** Merge the helper's device-info object, dropping empty strings. */
export function cleanDeviceInfo(value) {
  if (!value || typeof value !== 'object') return {}
  const output = {}
  for (const [key, entry] of Object.entries(value)) {
    if (entry === null || entry === undefined) continue
    if (typeof entry === 'string' && !entry.trim()) continue
    output[key] = entry
  }
  return output
}

/* -------------------------------------------------------------- processes */

/** Run one child process with a hard timeout; resolves (never rejects). */
export function runProcess(command, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 120_000
  return new Promise((resolvePromise) => {
    let stdout = ''
    let stderr = ''
    let settled = false
    let timedOut = false
    let child
    try {
      child = spawn(command, args, { cwd: options.cwd, env: options.env ?? process.env, stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (error) {
      resolvePromise({ stdout: '', stderr: String(error), code: null, signal: null, timedOut: false })
      return
    }

    const finish = (code, signal) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      options.signal?.removeEventListener('abort', onAbort)
      resolvePromise({ stdout, stderr, code, signal, timedOut })
    }
    const kill = () => {
      try {
        child.kill('SIGKILL')
      } catch {
        /* already gone */
      }
    }
    const onAbort = () => {
      kill()
      finish(null, 'SIGKILL')
    }
    const timer = setTimeout(() => {
      timedOut = true
      kill()
    }, timeoutMs)
    timer.unref?.()

    child.stdout?.setEncoding('utf8')
    child.stderr?.setEncoding('utf8')
    child.stdout?.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr?.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', (error) => {
      stderr += `\n${error instanceof Error ? error.message : String(error)}`
      finish(null, null)
    })
    child.on('close', (code, signal) => finish(code, signal))
    if (options.signal) {
      if (options.signal.aborted) onAbort()
      else options.signal.addEventListener('abort', onAbort, { once: true })
    }
  })
}

/* --------------------------------------------------------------- compile */

/** Locate the shipped helper source. */
export function bleHelperSource(pluginRoot) {
  return join(pluginRoot, 'native', 'd3200_helper.swift')
}

/** Locate the embedded Info.plist (Bluetooth usage description). */
export function bleHelperInfoPlist(pluginRoot) {
  return join(pluginRoot, 'native', 'd3200_helper_info.plist')
}

const compileCache = new Map()

/**
 * Compile the CoreBluetooth helper once per binary path, sharing one `swiftc`
 * run between concurrent first requests.
 *
 * @param {{
 *   helperPath: string,
 *   pluginRoot: string,
 *   logger?: any,
 *   run?: typeof runProcess,
 * }} input
 * @returns {Promise<string>} helper binary path
 */
export async function ensureBleHelper({ helperPath, pluginRoot, logger, run = runProcess }) {
  const cached = compileCache.get(helperPath)
  if (cached) return cached

  const task = (async () => {
    const swiftSource = bleHelperSource(pluginRoot)
    const infoPlist = bleHelperInfoPlist(pluginRoot)
    let sourceStat
    try {
      sourceStat = await stat(swiftSource)
    } catch {
      throw new BleError('找不到原生蓝牙助手源码 native/d3200_helper.swift，请重新安装插件。', 'helper_missing', 503)
    }
    try {
      const binaryStat = await stat(helperPath)
      if (binaryStat.mtimeMs >= sourceStat.mtimeMs) return helperPath
    } catch {
      /* not compiled yet */
    }

    await mkdir(dirname(helperPath), { recursive: true })
    const tmp = `${helperPath}.tmp-${randomBytes(4).toString('hex')}`
    logger?.info?.('recording-suite: 正在编译原生蓝牙助手（只需一次）…')
    const args = ['swiftc', '-O', '-parse-as-library', '-o', tmp, swiftSource]
    if (existsSync(infoPlist)) {
      args.push('-Xlinker', '-sectcreate', '-Xlinker', '__TEXT', '-Xlinker', '__info_plist', '-Xlinker', infoPlist)
    }
    const result = await run('/usr/bin/xcrun', args, { timeoutMs: 240_000 })
    if (result.timedOut || result.code !== 0) {
      await rm(tmp, { force: true }).catch(() => {})
      const detail = `${result.stderr || result.stdout || ''}`.trim().slice(0, 2000)
      throw new BleError(
        `原生蓝牙助手编译失败（xcrun swiftc 退出码 ${result.code ?? 'signal'}）。请确认已安装 Xcode Command Line Tools（xcode-select --install）。原始输出：${detail || '无'}`,
        'helper_compile_failed',
        503,
      )
    }
    await chmod(tmp, 0o755)
    try {
      await rename(tmp, helperPath)
    } catch (error) {
      await rm(tmp, { force: true }).catch(() => {})
      throw error
    }
    logger?.info?.(`recording-suite: 原生蓝牙助手已编译到 ${helperPath}`)
    return helperPath
  })()

  compileCache.set(helperPath, task)
  try {
    return await task
  } catch (error) {
    compileCache.delete(helperPath)
    throw error
  }
}

/* ---------------------------------------------------------------- service */

/**
 * Create the D3200 native bridge service wired to one store + queue.
 *
 * @param {{
 *   store: any,
 *   queue?: any,
 *   pluginRoot: string,
 *   logger?: any,
 *   platform?: string,
 *   now?: () => number,
 *   run?: typeof runProcess,
 *   ensureHelper?: typeof ensureBleHelper,
 *   onImported?: (recording: any) => void,
 *   autoTranscribe?: (recordingId: string, language?: string) => Promise<any>,
 * }} options
 */
export function createBleService(options) {
  const { store, pluginRoot } = options
  const logger = options.logger
  const platform = options.platform ?? process.platform
  const now = options.now ?? Date.now
  const run = options.run ?? runProcess
  const ensureHelper = options.ensureHelper ?? ensureBleHelper
  const queue = options.queue
  const onImported = options.onImported ?? (() => {})

  const helperPath = join(store.dirs.bin, 'd3200_helper')
  /** @type {Set<AbortController>} */
  const controllers = new Set()
  let disposed = false

  const isDarwin = platform === 'darwin'
  const swiftSource = bleHelperSource(pluginRoot)

  /** Abortable wrapper so plugin unload kills running helper children. */
  function trackedRun(command, args, runOptions = {}) {
    if (disposed) {
      return Promise.resolve({ stdout: '', stderr: '服务已卸载', code: null, signal: 'SIGKILL', timedOut: false, aborted: true })
    }
    const controller = new AbortController()
    controllers.add(controller)
    const outer = runOptions.signal
    const onOuterAbort = () => controller.abort()
    if (outer) {
      if (outer.aborted) controller.abort()
      else outer.addEventListener('abort', onOuterAbort, { once: true })
    }
    return run(command, args, { ...runOptions, signal: controller.signal }).finally(() => {
      controllers.delete(controller)
      outer?.removeEventListener('abort', onOuterAbort)
    })
  }

  async function helperBinary() {
    if (!isDarwin) throw nativeUnavailableError('原生蓝牙桥仅在 macOS 上可用；当前版本未提供其他平台的原生 BLE 实现。')
    if (!existsSync(swiftSource)) {
      throw nativeUnavailableError('插件缺少 native/d3200_helper.swift，请重新安装录音套件。')
    }
    try {
      return await ensureHelper({ helperPath, pluginRoot, logger, run: trackedRun })
    } catch (error) {
      if (error instanceof BleError) throw error
      throw new BleError(
        `原生蓝牙助手不可用：${error instanceof Error ? error.message : String(error)}`,
        'helper_compile_failed',
        503,
      )
    }
  }

  /**
   * Run one helper subcommand and return its JSON payload.
   * @param {string[]} args
   * @param {{ timeoutMs: number, signal?: AbortSignal }} runOptions
   */
  async function runHelper(args, runOptions) {
    const binary = await helperBinary()
    const result = await trackedRun(binary, args, { timeoutMs: runOptions.timeoutMs, signal: runOptions.signal })
    if (result.aborted) throw new BleError('录音豆操作已取消（插件已卸载）。', 'cancelled', 499)
    const payload = parseHelperOutput(result.stdout)
    if (result.timedOut) {
      throw new BleError(
        `录音豆操作超时（${Math.round(runOptions.timeoutMs / 1000)} 秒）。请让录音豆保持唤醒并靠近电脑后重试。`,
        'timeout',
        504,
      )
    }
    if (!payload) {
      const detail = `${result.stderr || result.stdout || ''}`.trim().slice(-800)
      throw new BleError(
        `原生蓝牙助手没有返回可解析的结果（退出码 ${result.code ?? 'signal'}）。${detail ? `原始输出：${detail}` : ''}`,
        'device_failed',
        502,
      )
    }
    if (payload.ok !== true) throw mapHelperError(payload)
    if (result.code !== 0) {
      throw new BleError(`原生蓝牙助手异常退出（退出码 ${result.code ?? 'signal'}）。`, 'device_failed', 502)
    }
    return payload
  }

  function requirement() {
    if (!isDarwin) {
      return {
        available: false,
        reason: '原生蓝牙桥仅在 macOS 上可用。当前版本未提供其他平台的原生 BLE 实现。',
      }
    }
    if (!existsSync('/usr/bin/xcrun')) {
      return {
        available: false,
        reason: '缺少 xcrun：请安装 Xcode Command Line Tools（xcode-select --install）后重试。',
      }
    }
    if (!existsSync(swiftSource)) {
      return { available: false, reason: '插件缺少 native/d3200_helper.swift，请重新安装录音套件。' }
    }
    return { available: true, reason: null }
  }

  const deviceSnapshot = {
    /** Sync status used by `GET /api/recording/device/status`. */
    status() {
      const base = requirement()
      return {
        ok: true,
        platform,
        available: base.available,
        reason: base.reason,
        helper: {
          path: helperPath,
          compiled: existsSync(helperPath),
          source: swiftSource,
          sourcePresent: existsSync(swiftSource),
        },
      }
    },

    /** Scan for nearby D3200 devices (service-filtered unless mode=all). */
    async scan({ mode = 'precise', timeoutMs = 8, signal } = {}) {
      const seconds = Math.min(20, Math.max(2, Number(timeoutMs) || 8))
      const payload = await runHelper(
        ['scan', '--timeout', String(seconds), '--mode', mode === 'all' ? 'all' : 'precise'],
        { timeoutMs: (seconds + 20) * 1000, signal },
      )
      const devices = Array.isArray(payload.devices)
        ? payload.devices
            .filter(
              (device) => device && typeof device.id === 'string' && /^[0-9a-fA-F-]{8,64}$/.test(device.id),
            )
            .map((device) => ({
              id: device.id,
              name: typeof device.name === 'string' && device.name ? device.name : null,
              rssi: Number.isFinite(device.rssi) ? device.rssi : null,
            }))
        : []
      return { devices, mode: payload.mode || mode }
    },

    /** Device info + offline recording list. */
    async list({ deviceId, signal } = {}) {
      const id = requireDeviceId(deviceId)
      const payload = await runHelper(['list', '--device', id], { timeoutMs: 90_000, signal })
      const files = Array.isArray(payload.files)
        ? payload.files
            .filter((file) => file && Number.isFinite(Number(file.fileId)))
            .map((file) => ({
              fileId: Number(file.fileId),
              endTime: Number(file.endTime) || 0,
              sizeBytes: Number(file.sizeBytes) || 0,
              estimatedDurationMs: Number(file.estimatedDurationMs) || 0,
              exported: false,
            }))
            .sort((left, right) => right.fileId - left.fileId)
        : []
      const device = cleanDeviceInfo(payload.device)
      return {
        deviceId: id,
        name: typeof payload.name === 'string' && payload.name ? payload.name : 'soundcore Work',
        device,
        recordStatus: Number.isFinite(device.recordStatus) ? device.recordStatus : 0,
        files,
      }
    },

    /**
     * Export + decrypt one recording, mux it to Ogg/Opus and import it into the
     * store. Returns the imported recording so the Client must not POST again.
     */
    async exportRecording({
      deviceId,
      fileId,
      title,
      recordedAt,
      autoTranscribe = false,
      language,
      signal,
      onProgress,
    } = {}) {
      const id = requireDeviceId(deviceId)
      const numericFileId = requireFileId(fileId)
      const rawPath = join(store.dirs.bin, `d3200-${numericFileId}-${randomBytes(4).toString('hex')}.opus`)
      onProgress?.(0.05, 'exporting')
      try {
        const payload = await runHelper(
          ['export', '--device', id, '--file', String(numericFileId), '--out', rawPath],
          { timeoutMs: 330_000, signal },
        )
        onProgress?.(0.7, 'muxing')
        let raw
        try {
          raw = await readFile(rawPath)
        } catch {
          throw new BleError('录音豆导出完成，但 Host 读不到解密文件。', 'export_failed', 500)
        }
        if (raw.length === 0) throw new BleError('录音豆导出的音频为空。', 'empty_audio', 502)
        const ogg = muxOggOpus(raw)
        const durationMs = durationMsOfRawOpus(raw.length)

        onProgress?.(0.85, 'importing')
        const recording = await store.importRecording({
          source: 'soundcore',
          title: typeof title === 'string' && title.trim() ? title.trim() : undefined,
          recordedAt: recordedAt || recordedAtFromFileId(numericFileId, now()),
          durationMs,
          format: 'ogg',
          data: ogg,
          deviceFileId: numericFileId,
        })
        onImported(recording)
        if (autoTranscribe && queue) {
          try {
            await queue.enqueue(recording.id, language)
          } catch (error) {
            logger?.warn?.(`recording-suite: 录音豆录音自动转录排队失败：${error instanceof Error ? error.message : String(error)}`)
          }
        }
        onProgress?.(1, 'done')
        return {
          fileId: numericFileId,
          durationMs,
          rawSizeBytes: raw.length,
          sizeBytes: ogg.length,
          expectedSizeBytes: Number.isFinite(payload.expectedSizeBytes) ? Number(payload.expectedSizeBytes) : null,
          recording,
        }
      } finally {
        await rm(rawPath, { force: true }).catch(() => {})
      }
    },

    /** Start or pause recording on the device. */
    async record({ deviceId, action, signal } = {}) {
      const id = requireDeviceId(deviceId)
      if (action !== 'start' && action !== 'pause') {
        throw new BleError('action 只能是 start 或 pause', 'bad_request', 400)
      }
      const payload = await runHelper(['record', '--device', id, '--action', action], { timeoutMs: 60_000, signal })
      return {
        action,
        recordStatus: Number(payload.recordStatus) || (action === 'start' ? 1 : 2),
        acknowledged: payload.acknowledged === true,
      }
    },

    /** Permanently delete one recording from the device. */
    async removeFile({ deviceId, fileId, signal } = {}) {
      const id = requireDeviceId(deviceId)
      const numericFileId = requireFileId(fileId)
      await runHelper(['delete', '--device', id, '--file', String(numericFileId)], { timeoutMs: 60_000, signal })
      return { fileId: numericFileId, deleted: true }
    },

    /** Kill helper children and mark the service unusable (plugin unload). */
    dispose() {
      disposed = true
      for (const controller of controllers) {
        try {
          controller.abort()
        } catch {
          /* ignore */
        }
      }
      controllers.clear()
    },
  }

  return deviceSnapshot
}

function requireDeviceId(value) {
  const id = typeof value === 'string' ? value.trim() : ''
  if (!id) throw new BleError('缺少 deviceId（请先扫描并连接录音豆）', 'bad_request', 400)
  if (id.length > 64 || !/^[0-9a-fA-F-]{8,64}$/.test(id)) {
    throw new BleError('deviceId 不是合法的 CoreBluetooth UUID', 'bad_request', 400)
  }
  return id
}

function requireFileId(value) {
  const numeric = Number(value)
  if (!Number.isInteger(numeric) || numeric <= 0 || numeric > 0xffffffff) {
    throw new BleError('缺少合法的 fileId', 'bad_request', 400)
  }
  return numeric
}
