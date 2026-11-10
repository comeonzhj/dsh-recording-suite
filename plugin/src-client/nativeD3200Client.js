/*!
 * soundcore Work / D3200 native Bluetooth client.
 *
 * Every device operation goes through the Host's `/api/recording/device/*`
 * endpoints, where a compiled Swift CoreBluetooth helper talks to the recorder.
 *
 * - the Host reconnects for every command, so `connect()` really means
 *   "scan + read the device once"; `connected` is reset on errors;
 * - `exportRecording` makes the Host decrypt, mux and import the recording, so
 *   callers must not POST `/import` again (check `result.imported`);
 * - errors keep a stable `code` plus the Host's readable detail in `params.detail`.
 */
import { deviceErrorText } from './format.js'
import { api } from './api.js'

/** Discovery modes exposed by the Host scan endpoint. */
export const DISCOVERY_MODE = Object.freeze({ precise: 'precise', all: 'all' })

/** Create a structured, localizable device error (same shape as d3200Client). */
export function deviceError(code, params = {}, cause) {
  const error = new Error(code)
  error.code = code
  error.params = params
  if (cause) error.cause = cause
  return error
}

function cloneSnapshot(state) {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(state)
    } catch {
      /* fall through */
    }
  }
  return {
    ...state,
    files: state.files.map((file) => ({ ...file })),
    logs: state.logs.map((log) => ({ ...log, params: log.params ? { ...log.params } : undefined })),
    device: state.device ? { ...state.device } : null,
    export: state.export ? { ...state.export } : null,
  }
}

function initialState() {
  return {
    transport: 'native',
    supported: true,
    connected: false,
    connecting: false,
    deviceName: null,
    device: null,
    files: [],
    logs: [],
    error: null,
    export: null,
    recordStatus: 0,
  }
}

const DEVICE_NAME_PATTERN = /soundcore|d3200|work/i

/**
 * Choose the device to connect to from a scan result.
 * A named soundcore device always wins; otherwise a single scan hit is trusted
 * (the precise scan is already filtered by the D3200 service UUID).
 * @param {Array<{ id: string, name?: string | null, rssi?: number | null }>} devices
 */
export function pickPreferredDevice(devices) {
  const list = Array.isArray(devices) ? devices.filter((entry) => entry && typeof entry.id === 'string' && entry.id) : []
  const named = list.find((entry) => typeof entry.name === 'string' && DEVICE_NAME_PATTERN.test(entry.name))
  if (named) return named
  if (list.length === 1) return list[0]
  return null
}

/** Map a Host API failure into the shared device error shape. */
function normalizeApiError(error) {
  if (error && typeof error === 'object' && typeof error.code === 'string') return error
  const body = error && typeof error === 'object' ? error.body : null
  const code = body && typeof body.code === 'string' ? body.code : null
  const message =
    (body && typeof body.error === 'string' && body.error) ||
    (error && typeof error.message === 'string' && error.message) ||
    String(error)
  if (code) return deviceError(code, { detail: message }, error)
  if (error && error.status === 0) {
    return deviceError('native_unavailable', { detail: '无法连接 Host API，请确认插件正在运行。' }, error)
  }
  return deviceError('device_failed', { detail: message }, error)
}

/** Translation keys for Host-side native bridge codes not covered by format.js. */
const NATIVE_ERROR_KEYS = {
  native_unavailable: 'bean.error.native_unavailable',
  helper_compile_failed: 'bean.error.helper_compile_failed',
  helper_missing: 'bean.error.native_unavailable',
  bluetooth_unauthorized: 'bean.error.bluetooth_unauthorized',
  bluetooth_off: 'bean.error.bluetooth_off',
  device_not_found: 'bean.error.device_not_found',
  bad_request: 'bean.error.bad_request',
  device_failed: 'bean.error.native_failed',
  export_failed: 'bean.error.native_failed',
  cancelled: 'bean.error.cancelled',
}

/**
 * Localize a native client error. Native-only codes get their own dictionary
 * keys; the shared formatter handles the rest.
 *
 * @param {(key: string, params?: Record<string, unknown>) => string} t
 * @param {unknown} error
 */
export function nativeErrorText(t, error) {
  const code = error && typeof error === 'object' ? error.code : null
  const key = typeof code === 'string' ? NATIVE_ERROR_KEYS[code] : null
  if (!key) return deviceErrorText(t, error)
  const params = { ...((error && error.params) || {}) }
  const detail = params.detail || params.error || (error && error.message) || ''
  delete params.detail
  if (detail) params.error = detail
  if (code === 'bluetooth_unauthorized' || code === 'bluetooth_off') return t(key)
  return t(key, params)
}

/**
 * Native transport client. One instance per panel mount; `dispose()` on unmount.
 */
export class NativeD3200Client {
  #state = initialState()
  #listeners = new Set()
  #api
  #deviceId = null
  #cache = new Map()
  #view = null
  #disposed = false
  #busy = false

  /** @param {{ api?: typeof api }} [options] */
  constructor(options = {}) {
    this.#api = options.api ?? api
    this.#view = cloneSnapshot(this.#state)
  }

  snapshot() {
    return this.#view
  }

  subscribe(listener) {
    this.#listeners.add(listener)
    listener(this.snapshot())
    return () => this.#listeners.delete(listener)
  }

  get transport() {
    return 'native'
  }

  #update(changes) {
    Object.assign(this.#state, changes)
    this.#view = cloneSnapshot(this.#state)
    for (const listener of this.#listeners) {
      try {
        listener(this.snapshot())
      } catch (error) {
        console.error('recording-suite: native device listener crashed', error)
      }
    }
  }

  /** @param {string} key dictionary key @param {Record<string, unknown>} [params] */
  #log(key, params, level = 'info') {
    this.#state.logs = [
      ...this.#state.logs,
      { time: new Date().toISOString(), key, params: params || null, level },
    ].slice(-100)
    this.#update({ logs: this.#state.logs })
  }

  async #scanAndPick(discoveryMode) {
    const mode = discoveryMode === DISCOVERY_MODE.all ? 'all' : 'precise'
    const result = await this.#api.deviceScan({ mode, timeoutSeconds: 8 })
    const devices = Array.isArray(result?.devices) ? result.devices : []
    const candidate = pickPreferredDevice(devices)
    if (!candidate) {
      const named = devices
        .map((entry) => entry.name)
        .filter(Boolean)
        .slice(0, 5)
      throw deviceError('device_not_found', { count: devices.length, candidates: named })
    }
    return candidate
  }

  async connect({ discoveryMode = DISCOVERY_MODE.precise, deviceId = null } = {}) {
    if (this.#disposed) throw deviceError('not_connected')
    if (this.#busy) return this.snapshot()
    this.#busy = true
    this.#update({ connecting: true, error: null })
    try {
      let resolvedId = deviceId
      let name = null
      if (!resolvedId) {
        const candidate = await this.#scanAndPick(discoveryMode)
        resolvedId = candidate.id
        name = candidate.name || null
      }
      const info = await this.#listWithRetry(resolvedId, Boolean(deviceId), discoveryMode)
      this.#deviceId = info?.deviceId || resolvedId
      const deviceName = info?.name || name || 'soundcore Work'
      this.#update({
        connected: true,
        connecting: false,
        deviceName,
        device: info?.device || null,
        files: Array.isArray(info?.files) ? info.files : [],
        recordStatus: Number.isFinite(info?.recordStatus) ? info.recordStatus : 0,
        error: null,
      })
      this.#log('bean.log.connected', { name: deviceName, transport: 'native' })
      this.#log('bean.log.filesRead', { count: this.#state.files.length })
      return this.snapshot()
    } catch (error) {
      const mapped = normalizeApiError(error)
      this.#deviceId = null
      this.#update({ connected: false, connecting: false, error: mapped.code })
      this.#log('bean.log.connectionFailed', { errorKey: mapped.code }, 'error')
      throw mapped
    } finally {
      this.#busy = false
    }
  }

  disconnect() {
    if (this.#disposed) return
    this.#deviceId = null
    this.#update({ connected: false, connecting: false, recordStatus: 0, export: null })
    this.#log('bean.log.disconnected')
  }

  /**
   * `list` for a device id. macOS can expose the recorder under a new
   * CoreBluetooth UUID after it rotates its BLE address, so when the id came
   * from our own scan a single rescan + retry keeps the connection honest.
   *
   * @param {string} deviceId
   * @param {boolean} pinned true when the caller passed an explicit deviceId
   * @param {number|string} [discoveryMode]
   */
  async #listWithRetry(deviceId, pinned, discoveryMode) {
    try {
      return await this.#api.deviceList({ deviceId })
    } catch (error) {
      const mapped = normalizeApiError(error)
      if (pinned || mapped.code !== 'device_not_found') throw mapped
      const candidate = await this.#scanAndPick(discoveryMode)
      deviceId = candidate.id
      return await this.#api.deviceList({ deviceId })
    }
  }

  async refresh({ silent = false } = {}) {
    if (!this.#deviceId) throw deviceError('not_connected')
    let info
    try {
      info = await this.#listWithRetry(this.#deviceId, false, DISCOVERY_MODE.precise)
    } catch (error) {
      throw normalizeApiError(error)
    }
    if (info?.deviceId && info.deviceId !== this.#deviceId) this.#deviceId = info.deviceId
    this.#update({
      connected: true,
      deviceName: info?.name || this.#state.deviceName,
      device: info?.device || this.#state.device,
      files: Array.isArray(info?.files) ? info.files : [],
      recordStatus: Number.isFinite(info?.recordStatus) ? info.recordStatus : this.#state.recordStatus,
      error: null,
    })
    if (!silent) this.#log('bean.log.filesRead', { count: this.#state.files.length })
    return this.#state.files
  }

  async listFiles(options = {}) {
    return this.refresh(options)
  }

  async #recordAction(action) {
    if (!this.#deviceId) throw deviceError('not_connected')
    try {
      const result = await this.#api.deviceRecord({ deviceId: this.#deviceId, action })
      const status = Number.isFinite(result?.recordStatus) ? result.recordStatus : action === 'start' ? 1 : 2
      this.#update({ recordStatus: status, error: null })
      const wasPaused = status === 1 && action === 'start'
      this.#log(
        action === 'start'
          ? wasPaused
            ? 'bean.log.resumeSent'
            : 'bean.log.startSent'
          : 'bean.log.pauseSent',
      )
      return this.snapshot()
    } catch (error) {
      throw normalizeApiError(error)
    }
  }

  async startRecording() {
    return this.#recordAction('start')
  }

  async pauseRecording() {
    return this.#recordAction('pause')
  }

  /**
   * Ask the Host to export + decrypt the recording and import it into the
   * library. The resumed value is compatible with the device snapshot shape
   * export result, plus `imported: true`.
   *
   * @param {number} fileId
   * @param {{ autoTranscribe?: boolean, title?: string | null, recordedAt?: string | null }} [options]
   */
  async exportRecording(fileId, options = {}) {
    if (this.#cache.has(fileId)) return this.#cache.get(fileId)
    if (!this.#deviceId) throw deviceError('not_connected')
    const file = this.#state.files.find((item) => item.fileId === fileId)
    if (!file) throw deviceError('file_missing')

    this.#update({
      export: { fileId, status: 'downloading', progress: null, receivedBytes: 0, expectedBytes: file.sizeBytes || 0 },
    })
    this.#log('bean.log.exportStart', { fileId })
    try {
      const payload = await this.#api.deviceExport({
        deviceId: this.#deviceId,
        fileId,
        title: options.title || null,
        recordedAt: options.recordedAt || null,
        autoTranscribe: options.autoTranscribe !== false,
      })
      const durationMs = Number.isFinite(payload?.durationMs) ? payload.durationMs : file.estimatedDurationMs || null
      const result = {
        fileId,
        durationMs,
        format: 'ogg',
        imported: true,
        recording: payload?.recording ?? null,
        sizeBytes: payload?.sizeBytes ?? null,
      }
      this.#cache.set(fileId, result)
      this.#update({
        export: {
          fileId,
          status: 'complete',
          progress: 100,
          receivedBytes: payload?.sizeBytes ?? 0,
          expectedBytes: file.sizeBytes || 0,
        },
        files: this.#state.files.map((item) =>
          item.fileId === fileId ? { ...item, exported: true, estimatedDurationMs: durationMs ?? item.estimatedDurationMs } : item,
        ),
      })
      this.#log('bean.log.exported', { fileId })
      return result
    } catch (error) {
      const mapped = normalizeApiError(error)
      this.#update({ export: null, error: mapped.code })
      this.#log('bean.log.exportFailed', { fileId, message: mapped.message }, 'error')
      throw mapped
    }
  }

  async deleteRecording(fileId) {
    if (!this.#deviceId) throw deviceError('not_connected')
    try {
      await this.#api.deviceDelete({ deviceId: this.#deviceId, fileId })
    } catch (error) {
      throw normalizeApiError(error)
    }
    this.#cache.delete(fileId)
    this.#update({
      files: this.#state.files.filter((item) => item.fileId !== fileId),
      export: this.#state.export && this.#state.export.fileId === fileId ? null : this.#state.export,
    })
    this.#log('bean.log.deleted', { fileId })
    await this.listFiles({ silent: true }).catch(() => {})
    return this.snapshot()
  }

  dispose() {
    this.#disposed = true
    this.#listeners.clear()
    this.#cache.clear()
  }
}
