/**
 * Same-origin Host API client for the recording panel.
 *
 * All persistence goes through `/api/recording/*`; the client never touches
 * disk, Bluetooth protocol state, or the plugin config file directly.
 */

export const API_PREFIX = '/api/recording'

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/** @param {string} path @param {RequestInit & { body?: unknown }} [options] */
export async function request(path, options = {}) {
  const { method = 'GET', body, signal, headers, rawBody = false } = options
  const init = { method, signal, headers: { ...(headers || {}) } }
  if (body !== undefined) {
    if (!rawBody) init.headers['Content-Type'] = 'application/json'
    init.body = rawBody ? body : JSON.stringify(body)
  }
  let response
  try {
    response = await fetch(`${API_PREFIX}${path}`, init)
  } catch (error) {
    if (error && error.name === 'AbortError') throw error
    throw new ApiError(error && error.message ? error.message : 'Network request failed', 0, null)
  }
  const contentType = response.headers.get('content-type') || ''
  let payload = null
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
  }
  if (!response.ok) {
    const message =
      (payload && typeof payload.error === 'string' && payload.error) ||
      `HTTP ${response.status} ${response.statusText}`.trim()
    throw new ApiError(message, response.status, payload)
  }
  return payload
}

export const api = {
  status: () => request('/status'),
  list: () => request('/list'),
  transcript: (id) => request(`/transcript?id=${encodeURIComponent(id)}`),
  jobs: (jobId) => request(`/jobs?id=${encodeURIComponent(jobId)}`),
  transcribe: (id, language) => request('/transcribe', { method: 'POST', body: { id, language } }),
  rename: (id, title) => request(`/${encodeURIComponent(id)}`, { method: 'PATCH', body: { title } }),
  remove: (id) => request(`/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  importAudio: (payload) => request('/import', { method: 'POST', body: payload }),
  importFile: (formData) => request('/import-file', { method: 'POST', body: formData, rawBody: true }),
  getConfig: () => request('/config'),
  saveConfig: (config) => request('/config', { method: 'POST', body: config }),
  rotateToken: () => request('/watch/rotate-token', { method: 'POST', body: {} }),
  // Native CoreBluetooth bridge (macOS Host).
  deviceStatus: () => request('/device/status'),
  deviceScan: (payload) => request('/device/scan', { method: 'POST', body: payload }),
  deviceList: (payload) => request('/device/list', { method: 'POST', body: payload }),
  deviceExport: (payload) => request('/device/export', { method: 'POST', body: payload }),
  deviceRecord: (payload) => request('/device/record', { method: 'POST', body: payload }),
  deviceDelete: (payload) => request('/device/delete', { method: 'POST', body: payload }),
}

/** Copy text through the Clipboard API with a hidden-textarea fallback. */
export async function copyText(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text)
    return true
  }
  if (typeof document === 'undefined') throw new Error('Clipboard is unavailable')
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } finally {
    document.body.removeChild(area)
  }
  if (!ok) throw new Error('Clipboard is unavailable')
  return true
}

/**
 * SSE subscriber for `/api/recording/events`, including manual reconnection for
 * a server restart or a closed stream.
 */
export class RecordingEventStream {
  #source = null
  #disposed = false
  #retryTimer = null

  /**
   * @param {{
   *   onEvent: (eventName: string, data: any) => void,
   *   onStatus?: (status: 'open'|'closed'|'error') => void,
   * }} handlers
   */
  constructor({ onEvent, onStatus }) {
    this.onEvent = onEvent
    this.onStatus = onStatus || (() => {})
  }

  connect() {
    if (this.#disposed) return
    if (typeof EventSource === 'undefined') {
      this.onStatus('error')
      return
    }
    this.closeSource()
    let source
    try {
      source = new EventSource(`${API_PREFIX}/events`)
    } catch {
      this.onStatus('error')
      this.scheduleRetry()
      return
    }
    this.#source = source
    source.addEventListener('open', () => {
      if (!this.#disposed) this.onStatus('open')
    })
    const relay = (eventName) => (event) => {
      if (this.#disposed) return
      let data = null
      try {
        data = JSON.parse(event.data)
      } catch {
        data = null
      }
      this.onEvent(eventName, data)
    }
    source.addEventListener('recording', relay('recording'))
    source.addEventListener('job', relay('job'))
    source.onerror = () => {
      if (this.#disposed) return
      this.onStatus('error')
      if (source.readyState === 2) this.scheduleRetry()
    }
  }

  scheduleRetry() {
    if (this.#disposed || this.#retryTimer) return
    this.#retryTimer = setTimeout(() => {
      this.#retryTimer = null
      if (!this.#disposed) {
        this.onStatus('closed')
        this.connect()
      }
    }, 3000)
  }

  closeSource() {
    if (this.#source) {
      try {
        this.#source.close()
      } catch {
        /* ignore */
      }
      this.#source = null
      this.onStatus('closed')
    }
    if (this.#retryTimer) {
      clearTimeout(this.#retryTimer)
      this.#retryTimer = null
    }
  }

  dispose() {
    this.#disposed = true
    this.closeSource()
  }
}
