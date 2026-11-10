/**
 * Recording Suite — configuration normalization.
 *
 * The plugin config arrives from the bundle patch layer (or from the config
 * editor after a save). It is a plain object; every consumer in the Host half
 * reads the normalized shape produced here instead of the raw config, so
 * optional/legacy values cannot leak into the API contract.
 *
 * Only `node:` builtins may be imported from Host code (see plugin/host/README.md).
 */

import { homedir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'

export const DEFAULT_WATCH_PORT = 47831
export const DEFAULT_BEACON_PORT = 47832
export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1'
export const DEFAULT_OPENAI_MODEL = 'whisper-1'
export const DEFAULT_LANGUAGE = 'zh-CN'
export const DEFAULT_PROVIDER = 'apple'

export const PROVIDERS = ['apple', 'openai', 'none']
export const SOURCES = ['soundcore', 'apple-watch', 'upload']
export const FORMATS = ['ogg', 'wav', 'm4a', 'mp3', 'bin']

/**
 * Default data root: `~/Documents/DSH-Recordings`.
 * @param {string} [home] user home directory.
 * @returns {string} absolute storage directory.
 */
export function defaultStorageDir(home = homedir()) {
  return join(home, 'Documents', 'DSH-Recordings')
}

function expandHome(value, home) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed === '~') return home
  if (trimmed.startsWith('~/') || trimmed.startsWith('~\\')) return join(home, trimmed.slice(2))
  return trimmed
}

function portOf(value, fallback) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : fallback
}

function stringOf(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

/**
 * Normalize one raw plugin config object.
 * @param {Record<string, unknown>} [raw] raw config from the bundle/patch layer.
 * @param {{ env?: Record<string, string | undefined>, home?: string }} [options]
 * @returns {{
 *   provider: 'apple' | 'openai' | 'none',
 *   language: string,
 *   openai: { baseUrl: string, model: string, apiKey: string },
 *   storageDir: string,
 *   watchImport: { enabled: boolean, port: number },
 *   beaconPort: number,
 * }}
 */
export function normalizeConfig(raw = {}, options = {}) {
  const env = options.env ?? process.env
  const home = options.home ?? homedir()
  const input = raw && typeof raw === 'object' ? raw : {}

  const provider = PROVIDERS.includes(input.provider) ? input.provider : DEFAULT_PROVIDER
  const language = stringOf(input.language, DEFAULT_LANGUAGE)

  const openaiRaw = input.openai && typeof input.openai === 'object' ? input.openai : {}
  const apiKey = stringOf(openaiRaw.apiKey, '') || stringOf(env.OPENAI_API_KEY, '')
  const openai = {
    baseUrl: stringOf(openaiRaw.baseUrl, DEFAULT_OPENAI_BASE_URL),
    model: stringOf(openaiRaw.model, DEFAULT_OPENAI_MODEL),
    apiKey,
  }

  const storageValue = expandHome(input.storageDir, home)
  const storageDir = storageValue
    ? isAbsolute(storageValue)
      ? storageValue
      : resolve(home, storageValue)
    : defaultStorageDir(home)

  const watchRaw = input.watchImport && typeof input.watchImport === 'object' ? input.watchImport : {}

  return {
    provider,
    language,
    openai,
    storageDir,
    watchImport: {
      enabled: watchRaw.enabled !== false,
      port: portOf(watchRaw.port, DEFAULT_WATCH_PORT),
    },
    beaconPort: portOf(input.beaconPort, DEFAULT_BEACON_PORT),
  }
}

/**
 * The subset exposed by `GET /api/recording/config` (and accepted by POST).
 * The API key itself is never returned; only `hasApiKey` is public.
 * @param {ReturnType<typeof normalizeConfig>} config normalized config.
 */
export function publicConfig(config) {
  return {
    provider: config.provider,
    language: config.language,
    openai: {
      baseUrl: config.openai.baseUrl,
      model: config.openai.model,
      hasApiKey: Boolean(config.openai.apiKey),
    },
    storageDir: config.storageDir,
    watchImport: {
      enabled: config.watchImport.enabled,
      port: config.watchImport.port,
    },
  }
}

/**
 * The `asr` section of `GET /api/recording/status`.
 * `configured` means "a transcription can be attempted right now" — for the
 * apple provider that only requires macOS, not the TCC grant (which cannot be
 * probed without a prompt).
 * @param {ReturnType<typeof normalizeConfig>} config normalized config.
 * @param {{ platform?: string }} [env]
 */
export function asrStatus(config, env = {}) {
  const platform = env.platform ?? process.platform
  const configured =
    config.provider === 'apple' ? platform === 'darwin' : config.provider === 'openai' ? Boolean(config.openai.apiKey) : false
  return {
    provider: config.provider,
    configured,
    model: config.provider === 'openai' ? config.openai.model : null,
    baseUrl: config.provider === 'openai' ? config.openai.baseUrl : null,
    language: config.language,
  }
}

/**
 * Merge a raw next config over the config editor's current raw value without
 * resurrecting a cleared `openai.apiKey` (an omitted field in `nextRaw` after
 * `mergeConfigBody` means "the user cleared it").
 * @param {Record<string, unknown>} current raw config currently persisted.
 * @param {Record<string, unknown>} nextRaw config produced by `mergeConfigBody`.
 * @returns {Record<string, unknown>} the raw config to write.
 */
export function applyConfigToEntry(current, nextRaw) {
  const base = current && typeof current === 'object' ? current : {}
  const next = nextRaw && typeof nextRaw === 'object' ? nextRaw : {}
  const result = { ...base, ...next }
  if (next.openai && typeof next.openai === 'object') {
    const currentOpenai = base.openai && typeof base.openai === 'object' ? base.openai : {}
    result.openai = { ...currentOpenai, ...next.openai }
    if (!('apiKey' in next.openai)) delete result.openai.apiKey
  }
  return result
}

/**
 * Merge a `POST /api/recording/config` body into the raw config object that is
 * persisted through the config editor. Unknown fields are ignored, and an
 * omitted/invalid `openai.apiKey` keeps the previous value.
 * @param {Record<string, unknown>} raw current raw plugin config.
 * @param {Record<string, unknown>} body request body.
 * @returns {Record<string, unknown>} next raw config.
 */
export function mergeConfigBody(raw, body) {
  const current = raw && typeof raw === 'object' ? raw : {}
  const input = body && typeof body === 'object' ? body : {}
  const next = { ...current }

  if (PROVIDERS.includes(input.provider)) next.provider = input.provider
  if (typeof input.language === 'string' && input.language.trim()) next.language = input.language.trim()
  if (typeof input.storageDir === 'string') next.storageDir = input.storageDir.trim()

  const openaiRaw = current.openai && typeof current.openai === 'object' ? current.openai : {}
  const openaiInput = input.openai && typeof input.openai === 'object' ? input.openai : {}
  const openai = { ...openaiRaw }
  if (typeof openaiInput.baseUrl === 'string' && openaiInput.baseUrl.trim()) openai.baseUrl = openaiInput.baseUrl.trim()
  if (typeof openaiInput.model === 'string' && openaiInput.model.trim()) openai.model = openaiInput.model.trim()
  if (typeof openaiInput.apiKey === 'string') {
    const key = openaiInput.apiKey.trim()
    // An explicit empty string clears the stored key; omitting the field keeps it.
    if (key) openai.apiKey = key
    else delete openai.apiKey
  } else if (openaiInput.apiKey === null) {
    delete openai.apiKey
  }
  next.openai = openai

  const watchRaw = current.watchImport && typeof current.watchImport === 'object' ? current.watchImport : {}
  const watchInput = input.watchImport && typeof input.watchImport === 'object' ? input.watchImport : {}
  const watchImport = { ...watchRaw }
  if (typeof watchInput.enabled === 'boolean') watchImport.enabled = watchInput.enabled
  if (watchInput.port !== undefined) watchImport.port = portOf(watchInput.port, watchRaw.port ?? DEFAULT_WATCH_PORT)
  next.watchImport = watchImport

  return next
}
