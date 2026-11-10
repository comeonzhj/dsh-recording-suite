/**
 * Pure formatting helpers for the recording panel. Kept free of DOM and React so
 * `node --test` can cover them directly.
 */

/** @param {number|null|undefined} ms */
export function formatDuration(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return '—'
  const totalSeconds = Math.round(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (value) => String(value).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
}

/** @param {number|null|undefined} bytes */
export function formatBytes(bytes) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${Math.round(bytes)} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2
  return `${value.toFixed(digits)} ${units[unit]}`
}

/** Normalize a BCP 47-ish tag for Intl. */
export function intlLocale(lang) {
  return lang === 'zh' ? 'zh-CN' : 'en-US'
}

/**
 * @param {string|number|null|undefined} value ISO string or epoch ms
 * @param {string} [lang] 'zh' | 'en'
 */
export function formatDateTime(value, lang = 'zh') {
  if (value == null) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  try {
    return new Intl.DateTimeFormat(intlLocale(lang), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
  } catch {
    return date.toISOString().replace('T', ' ').slice(0, 16)
  }
}

export function maskToken(token) {
  if (typeof token !== 'string' || token.length === 0) return ''
  if (token.length <= 10) return '••••••'
  return `${token.slice(0, 4)}…${token.slice(-4)}`
}

export function fileNameFromPath(path) {
  if (typeof path !== 'string' || path.length === 0) return ''
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || path
}

/**
 * D3200 file ids are Unix-second timestamps; reject implausible values so an
 * unrelated id never becomes a 1970 or year-3000 recordedAt.
 *
 * @param {number} fileId
 * @param {number} [now]
 * @returns {string|null} ISO 8601 or null
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

/** Build a stable list key for a D3200 file row. */
export function fileRowKey(fileId) {
  return `file-${Number(fileId)}`
}

/**
 * Translate a structured D3200 client error into a dictionary key and params.
 * Unknown errors fall back to their message.
 *
 * @param {unknown} error
 */
export function describeDeviceError(error) {
  const code = error && typeof error === 'object' ? error.code : null
  const params = (error && typeof error === 'object' && error.params) || {}
  const known = new Set([
    'unsupported',
    'not_secure',
    'cancelled',
    'cancelled_all',
    'security',
    'network',
    'connect_failed',
    'timeout',
    'not_connected',
    'file_missing',
    'device_rejected_export',
    'key_check_failed',
    'session_failed',
    'handshake_failed',
    'export_incomplete',
    'delete_rejected',
    'empty_audio',
  ])
  if (typeof code === 'string' && known.has(code)) {
    const key = `bean.error.${code}`
    if (code === 'connect_failed' || code === 'timeout') {
      const errorMessage = params.error || (error && error.message) || ''
      return { key, params: errorMessage ? { ...params, error: errorMessage } : { ...params } }
    }
    return { key, params }
  }
  const message = error && typeof error === 'object' && error.message ? error.message : String(error)
  return { key: null, message }
}

/**
 * Localize a device error with the panel translate function.
 *
 * @param {(key: string, params?: Record<string, unknown>) => string} t
 * @param {unknown} error
 */
export function deviceErrorText(t, error) {
  const described = describeDeviceError(error)
  if (!described.key) return described.message || t('app.error')
  const params = { ...described.params }
  if (params.labelKey) {
    params.label = t(params.labelKey, params.labelParams || {})
  }
  if (params.errorKey) {
    params.error = t(params.errorKey)
    delete params.errorKey
  }
  if (params.error == null && error && typeof error === 'object' && error.message) {
    params.error = error.message
  }
  return t(described.key, params)
}
