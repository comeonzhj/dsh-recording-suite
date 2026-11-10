/**
 * Recording Suite — durable recording library.
 *
 * Owns the data root (`~/Documents/DSH-Recordings` by default):
 *
 *   audio/        original audio, `<id>.<format>`
 *   transcripts/  self-contained Markdown, `<id>.md`
 *   index.json    metadata + watch-import token, always written atomically
 *   bin/          compiled Apple Speech helper
 *
 * The module is deliberately free of DSH imports: the Host plugin wires it to
 * services, and the pure helpers below are covered by `plugin/test/host-*.test.mjs`.
 */

import { randomBytes } from 'node:crypto'
import { constants } from 'node:fs'
import { access, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'

import { FORMATS, SOURCES, defaultStorageDir } from './config.mjs'

export const INDEX_VERSION = 1
export const MAX_SNIPPET = 120

const AUDIO_EXTENSIONS = new Set(FORMATS)

/* ------------------------------------------------------------------ helpers */

/** Pad a number to two digits. */
const pad2 = (n) => String(n).padStart(2, '0')

/**
 * Stable recording id: local date/time plus 4 random hex chars.
 * Example: `20261109-183000-4f2a`.
 * @param {{ now?: () => number, random?: () => string }} [options]
 */
export function makeRecordingId(options = {}) {
  const now = options.now ?? Date.now
  const date = new Date(now())
  const stamp =
    `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}-` +
    `${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`
  const suffix = options.random ? options.random() : randomBytes(2).toString('hex')
  return `${stamp}-${suffix.slice(0, 4).padEnd(4, '0')}`
}

/** @param {unknown} source */
export function normalizeSource(source) {
  return SOURCES.includes(source) ? source : 'upload'
}

/** @param {unknown} format */
export function normalizeFormat(format) {
  return FORMATS.includes(format) ? format : 'bin'
}

/**
 * Guess a recording format from a filename or MIME type.
 * @param {string} [name]
 * @param {string} [mediaType]
 */
export function guessFormat(name, mediaType) {
  const ext = extname(String(name ?? '')).slice(1).toLowerCase()
  if (AUDIO_EXTENSIONS.has(ext)) return ext
  const mime = String(mediaType ?? '').toLowerCase()
  if (mime.includes('wav')) return 'wav'
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3'
  if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) return 'm4a'
  if (mime.includes('ogg') || mime.includes('opus')) return 'ogg'
  return 'bin'
}

/** Human readable local timestamp used in default titles. */
function localStamp(ms) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/**
 * Default display title for an imported recording.
 * @param {'soundcore' | 'apple-watch' | 'upload'} source
 * @param {number} recordedAtMs
 */
export function defaultTitle(source, recordedAtMs) {
  if (source === 'soundcore') return `录音豆录音 ${localStamp(recordedAtMs)}`
  if (source === 'apple-watch') return `Apple Watch 录音 ${localStamp(recordedAtMs)}`
  return `录音 ${localStamp(recordedAtMs)}`
}

/**
 * Collapse whitespace and clip a transcript into the list snippet (120 chars).
 * @param {string} text
 * @param {number} [max]
 */
export function snippetOf(text, max = MAX_SNIPPET) {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim()
  return flat.length > max ? flat.slice(0, max) : flat
}

/** ISO string for a validated instant, falling back to `fallbackMs`. */
export function isoOf(value, fallbackMs) {
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString()
  }
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString()
  return new Date(fallbackMs).toISOString()
}

/* --------------------------------------------------------------- markdown */

/** Quote one frontmatter scalar so it round-trips through `parseTranscriptMarkdown`. */
function yamlScalar(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return String(value)
  if (value === null || value === undefined) return 'null'
  return JSON.stringify(String(value))
}

/**
 * Serialize a self-contained transcript Markdown document.
 * The frontmatter is the single source of truth for a transcript file's
 * metadata; `read` tool users see it inline.
 * @param {object} input
 * @param {string} input.id
 * @param {string} input.title
 * @param {string} input.source
 * @param {string} input.recordedAt ISO
 * @param {string} input.importedAt ISO
 * @param {number | null} [input.durationMs]
 * @param {string} input.provider
 * @param {string} input.language
 * @param {string} input.audioPath
 * @param {string} input.text transcript body
 */
export function serializeTranscriptMarkdown(input) {
  const lines = ['---']
  lines.push(`id: ${yamlScalar(input.id)}`)
  lines.push(`title: ${yamlScalar(input.title)}`)
  lines.push(`source: ${yamlScalar(input.source)}`)
  lines.push(`recordedAt: ${yamlScalar(input.recordedAt)}`)
  lines.push(`importedAt: ${yamlScalar(input.importedAt)}`)
  if (typeof input.durationMs === 'number' && Number.isFinite(input.durationMs)) {
    lines.push(`durationMs: ${Math.round(input.durationMs)}`)
  }
  lines.push(`provider: ${yamlScalar(input.provider)}`)
  lines.push(`language: ${yamlScalar(input.language)}`)
  lines.push(`audioPath: ${yamlScalar(input.audioPath)}`)
  lines.push('---', '')
  return `${lines.join('\n')}\n${String(input.text ?? '').replace(/\s+$/, '')}\n`
}

function unquoteScalar(raw) {
  const value = raw.trim()
  if (value === 'null') return null
  if (value.startsWith('"') || value.startsWith('[') || value.startsWith('{')) {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  if (value === 'true' || value === 'false') return value === 'true'
  const n = Number(value)
  return Number.isFinite(n) && value !== '' ? n : value
}

/**
 * Split a transcript Markdown document into frontmatter and body.
 * @param {string} markdown
 * @returns {{ frontmatter: Record<string, unknown>, body: string, hasFrontmatter: boolean }}
 */
export function parseTranscriptMarkdown(markdown) {
  const text = String(markdown ?? '')
  if (!text.startsWith('---')) return { frontmatter: {}, body: text, hasFrontmatter: false }
  const firstLineEnd = text.indexOf('\n')
  if (firstLineEnd < 0) return { frontmatter: {}, body: text, hasFrontmatter: false }
  const close = text.indexOf('\n---', firstLineEnd)
  if (close < 0) return { frontmatter: {}, body: text, hasFrontmatter: false }

  const frontmatter = {}
  for (const line of text.slice(firstLineEnd + 1, close).split('\n')) {
    const colon = line.indexOf(':')
    if (colon <= 0) continue
    const key = line.slice(0, colon).trim()
    if (!key) continue
    frontmatter[key] = unquoteScalar(line.slice(colon + 1))
  }
  const afterDelimiter = close + 4
  const lineEnd = text.indexOf('\n', afterDelimiter)
  const body = lineEnd < 0 ? '' : text.slice(lineEnd + 1).replace(/^\r?\n/, '')
  return { frontmatter, body, hasFrontmatter: true }
}

/**
 * Replace one frontmatter field in an existing Markdown document, preserving
 * the transcript body verbatim. Used when a recording is renamed.
 * @param {string} markdown
 * @param {string} key
 * @param {string} value
 */
export function updateFrontmatterField(markdown, key, value) {
  const text = String(markdown ?? '')
  if (!text.startsWith('---')) return text
  const firstLineEnd = text.indexOf('\n')
  const close = text.indexOf('\n---', firstLineEnd)
  if (firstLineEnd < 0 || close < 0) return text
  const header = text.slice(firstLineEnd + 1, close)
  const replacement = `${key}: ${yamlScalar(value)}`
  const pattern = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:.*$`, 'm')
  const nextHeader = pattern.test(header) ? header.replace(pattern, replacement) : `${header}\n${replacement}`
  return `---${text.slice(firstLineEnd, firstLineEnd + 1)}${nextHeader}${text.slice(close)}`
}

/* ---------------------------------------------------------------- the store */

class Mutex {
  #tail = Promise.resolve()

  /** @template T @param {() => Promise<T>} task @returns {Promise<T>} */
  run(task) {
    const result = this.#tail.then(task, task)
    this.#tail = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }
}

/**
 * Create the durable recording library.
 *
 * @param {{
 *   storageDir?: string,
 *   now?: () => number,
 *   logger?: { warn?: (message: string) => void, info?: (message: string) => void },
 *   idFactory?: () => string,
 * }} [options]
 */
export function createStore(options = {}) {
  const baseDir = options.storageDir ?? defaultStorageDir()
  const now = options.now ?? Date.now
  const logger = options.logger
  const idFactory = options.idFactory ?? (() => makeRecordingId({ now }))
  const mutex = new Mutex()

  const dirs = {
    root: baseDir,
    audio: join(baseDir, 'audio'),
    transcripts: join(baseDir, 'transcripts'),
    bin: join(baseDir, 'bin'),
    indexFile: join(baseDir, 'index.json'),
  }

  /** @type {{ version: number, watchToken: string, recordings: Map<string, any> } | null} */
  let state = null

  const generateToken = () => randomBytes(16).toString('hex')

  async function ensureDirs() {
    await mkdir(dirs.root, { recursive: true })
    await mkdir(dirs.audio, { recursive: true })
    await mkdir(dirs.transcripts, { recursive: true })
    await mkdir(dirs.bin, { recursive: true })
  }

  async function writeIndex(nextState) {
    await ensureDirs()
    const payload = {
      version: INDEX_VERSION,
      watchToken: nextState.watchToken,
      recordings: [...nextState.recordings.values()].map((record) => ({ ...record })),
    }
    const tmp = `${dirs.indexFile}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`
    await writeFile(tmp, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
    await rename(tmp, dirs.indexFile)
  }

  async function loadIndex() {
    await ensureDirs()
    let parsed
    try {
      parsed = JSON.parse(await readFile(dirs.indexFile, 'utf8'))
    } catch (error) {
      if (error && error.code !== 'ENOENT') {
        // Keep the unreadable file for the user instead of silently discarding it.
        const backup = `${dirs.indexFile}.corrupt-${now()}`
        try {
          await rename(dirs.indexFile, backup)
          logger?.warn?.(`recording-suite: index.json 无法解析，已备份到 ${backup}`)
        } catch {
          logger?.warn?.('recording-suite: index.json 无法解析，且备份失败')
        }
      }
      parsed = null
    }
    const recordings = new Map()
    const list = Array.isArray(parsed?.recordings) ? parsed.recordings : []
    for (const record of list) {
      if (!record || typeof record !== 'object') continue
      if (typeof record.id !== 'string' || !record.id) continue
      if (!record.audioPath) continue
      recordings.set(record.id, normalizeStoredRecord(record))
    }
    const watchToken = typeof parsed?.watchToken === 'string' && parsed.watchToken ? parsed.watchToken : generateToken()
    return { version: INDEX_VERSION, watchToken, recordings }
  }

  function normalizeStoredRecord(record) {
    return {
      id: String(record.id),
      title: typeof record.title === 'string' && record.title ? record.title : defaultTitle(normalizeSource(record.source), Number(record.createdAt) || now()),
      source: normalizeSource(record.source),
      recordedAt: isoOf(record.recordedAt, Number(record.createdAt) || now()),
      importedAt: isoOf(record.importedAt, Number(record.createdAt) || now()),
      durationMs: typeof record.durationMs === 'number' && Number.isFinite(record.durationMs) ? record.durationMs : null,
      sizeBytes: Number.isFinite(record.sizeBytes) ? Number(record.sizeBytes) : 0,
      format: normalizeFormat(record.format),
      audioPath: String(record.audioPath),
      transcriptPath: typeof record.transcriptPath === 'string' && record.transcriptPath ? record.transcriptPath : null,
      transcriptStatus: ['none', 'queued', 'running', 'done', 'failed'].includes(record.transcriptStatus)
        ? record.transcriptStatus
        : 'none',
      transcriptError: typeof record.transcriptError === 'string' ? record.transcriptError : null,
      transcriptProvider: typeof record.transcriptProvider === 'string' ? record.transcriptProvider : null,
      deviceFileId: Number.isFinite(record.deviceFileId) ? Number(record.deviceFileId) : null,
      snippet: typeof record.snippet === 'string' ? record.snippet : '',
      createdAt: Number.isFinite(record.createdAt) ? Number(record.createdAt) : Date.parse(record.recordedAt) || now(),
    }
  }

  async function ensureState() {
    if (state) return state
    state = await loadIndex()
    return state
  }

  async function commit(nextState) {
    await writeIndex(nextState)
    state = nextState
  }

  /** Deep-enough copy of the mutable index state for copy-on-write commits. */
  function cloneState(current) {
    return {
      version: current.version,
      watchToken: current.watchToken,
      recordings: new Map(current.recordings),
    }
  }

  async function writeFileAtomic(path, content) {
    await mkdir(dirname(path), { recursive: true })
    const tmp = `${path}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`
    await writeFile(tmp, content, 'utf8')
    await rename(tmp, path)
  }

  async function fileExists(path) {
    try {
      await access(path, constants.F_OK)
      return true
    } catch {
      return false
    }
  }

  /* ------------------------------------------------------------ public API */

  const store = {
    dirs,

    async init() {
      return mutex.run(async () => {
        const current = await ensureState()
        // A fresh index (first run or lost file) still needs its token persisted.
        if (!(await fileExists(dirs.indexFile))) await commit(cloneState(current))
        return listSnapshot()
      })
    },

    async list() {
      return mutex.run(async () => {
        await ensureState()
        return listSnapshot()
      })
    },

    async get(id) {
      return mutex.run(async () => {
        await ensureState()
        const record = state.recordings.get(String(id))
        return record ? { ...record } : null
      })
    },

    async referenceCandidates(query, limit = 8) {
      return mutex.run(async () => {
        await ensureState()
        const all = [...state.recordings.values()].filter((record) => record.transcriptPath)
        const transcriptDir = dirs.transcripts.replaceAll('\\', '/')
        const dirPrefix = transcriptDir.endsWith('/') ? transcriptDir : `${transcriptDir}/`
        const rawQuery = String(query ?? '').trim().replaceAll('\\', '/')
        const needle = rawQuery.toLowerCase()

        // A drilled transcript directory: `@/abs/.../transcripts/` must list
        // this store's Markdown files, even though the backend reference
        // provider only knows the workspace root.
        if (needle === transcriptDir.toLowerCase() || needle.startsWith(dirPrefix.toLowerCase())) {
          const fragment = rawQuery.slice(rawQuery.lastIndexOf('/') + 1).toLowerCase()
          let names = []
          try {
            names = await readdir(dirs.transcripts)
          } catch {
            names = []
          }
          return names
            .filter((name) => name.toLowerCase().endsWith('.md'))
            .sort((left, right) => left.localeCompare(right))
            .filter((name) => !fragment || name.toLowerCase().includes(fragment))
            .slice(0, limit)
            .map((name) => ({ path: `${dirPrefix}${name}`, kind: 'file' }))
        }

        if (all.length === 0) {
          // Fixed entry point so a new user can still see where transcripts go.
          return [{ path: dirs.transcripts, kind: 'directory' }]
        }

        if (!needle) {
          const inspected = await Promise.all(
            all.slice(0, 400).map(async (record) => {
              try {
                const info = await stat(record.transcriptPath)
                return { record, mtime: info.mtimeMs }
              } catch {
                return null
              }
            }),
          )
          return inspected
            .filter(Boolean)
            .sort((a, b) => b.mtime - a.mtime)
            .slice(0, limit)
            .map((entry) => ({ path: entry.record.transcriptPath, kind: 'file' }))
        }

        return all
          .filter((record) => {
            const title = String(record.title ?? '').toLowerCase()
            const name = basename(record.transcriptPath).toLowerCase()
            return title.includes(needle) || name.includes(needle)
          })
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, limit)
          .map((record) => ({ path: record.transcriptPath, kind: 'file' }))
      })
    },

    /**
     * Import one recording from decoded audio bytes.
     * @param {{
     *   source?: string, title?: string, recordedAt?: string, durationMs?: number | null,
     *   format?: string, data: Buffer, deviceFileId?: number | null,
     * }} input
     */
    async importRecording(input) {
      if (!Buffer.isBuffer(input?.data) || input.data.length === 0) {
        throw new Error('音频数据为空')
      }
      return mutex.run(async () => {
        const current = await ensureState()
        const source = normalizeSource(input.source)
        const format = normalizeFormat(input.format)
        const recordedAtMs = Date.parse(input.recordedAt ?? '') || now()
        const importedAt = new Date(now()).toISOString()
        let id = idFactory()
        while (current.recordings.has(id)) id = idFactory()

        const audioPath = join(dirs.audio, `${id}.${format}`)
        await ensureDirs()
        const tmp = `${audioPath}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`
        await writeFile(tmp, input.data)
        await rename(tmp, audioPath)

        const durationMs =
          typeof input.durationMs === 'number' && Number.isFinite(input.durationMs) && input.durationMs >= 0
            ? Math.round(input.durationMs)
            : null
        const title =
          typeof input.title === 'string' && input.title.trim() ? input.title.trim() : defaultTitle(source, recordedAtMs)

        const record = {
          id,
          title,
          source,
          recordedAt: new Date(recordedAtMs).toISOString(),
          importedAt,
          durationMs,
          sizeBytes: input.data.length,
          format,
          audioPath,
          transcriptPath: null,
          transcriptStatus: 'none',
          transcriptError: null,
          transcriptProvider: null,
          deviceFileId: Number.isFinite(input.deviceFileId) ? Number(input.deviceFileId) : null,
          snippet: '',
          createdAt: recordedAtMs,
        }

        const next = cloneState(current)
        next.recordings.set(id, record)
        await commit(next)
        return { ...record }
      })
    },

    /**
     * Update the transcript fields of one record (queue transitions).
     * @param {string} id
     * @param {Partial<Pick<any, 'transcriptStatus' | 'transcriptError' | 'transcriptProvider' | 'transcriptPath' | 'snippet'>>} patch
     * @returns {Promise<any | null>} the updated record, or null when it was deleted meanwhile.
     */
    async setTranscriptState(id, patch) {
      return mutex.run(async () => {
        const current = await ensureState()
        const existing = current.recordings.get(String(id))
        if (!existing) return null
        const record = { ...existing, ...patch }
        const next = cloneState(current)
        next.recordings.set(record.id, record)
        await commit(next)
        return { ...record }
      })
    },

    /**
     * Persist a finished transcript as Markdown and update the index entry.
     * @param {string} id
     * @param {{ text: string, provider: string, language: string }} input
     */
    async saveTranscript(id, input) {
      return mutex.run(async () => {
        const current = await ensureState()
        const existing = current.recordings.get(String(id))
        if (!existing) throw new Error(`录音 ${id} 不存在`)

        const text = String(input.text ?? '')
        const markdown = serializeTranscriptMarkdown({
          id: existing.id,
          title: existing.title,
          source: existing.source,
          recordedAt: existing.recordedAt,
          importedAt: existing.importedAt,
          durationMs: existing.durationMs,
          provider: String(input.provider ?? 'unknown'),
          language: String(input.language ?? ''),
          audioPath: existing.audioPath,
          text,
        })
        const transcriptPath = join(dirs.transcripts, `${existing.id}.md`)
        await writeFileAtomic(transcriptPath, markdown)

        const record = {
          ...existing,
          transcriptPath,
          transcriptStatus: 'done',
          transcriptError: null,
          transcriptProvider: String(input.provider ?? 'unknown'),
          snippet: snippetOf(text),
        }
        const next = cloneState(current)
        next.recordings.set(record.id, record)
        await commit(next)
        return { ...record, markdown }
      })
    },

    /** @param {string} id */
    async readTranscript(id) {
      return mutex.run(async () => {
        const current = await ensureState()
        const record = current.recordings.get(String(id))
        if (!record?.transcriptPath) return null
        let markdown
        try {
          markdown = await readFile(record.transcriptPath, 'utf8')
        } catch {
          return null
        }
        const info = parseTranscriptMarkdown(markdown)
        let updatedAt = now()
        try {
          updatedAt = Math.round((await stat(record.transcriptPath)).mtimeMs)
        } catch {
          /* keep request time */
        }
        return { id: record.id, text: info.body.replace(/\s+$/, ''), markdown, path: record.transcriptPath, updatedAt }
      })
    },

    /**
     * Rename a recording and keep its Markdown frontmatter in sync.
     * @param {string} id
     * @param {string} title
     */
    async rename(id, title) {
      const clean = String(title ?? '').trim()
      if (!clean) throw new Error('标题不能为空')
      if (clean.length > 200) throw new Error('标题过长（最多 200 字）')
      return mutex.run(async () => {
        const current = await ensureState()
        const existing = current.recordings.get(String(id))
        if (!existing) return null
        const record = { ...existing, title: clean }
        const next = cloneState(current)
        next.recordings.set(record.id, record)
        await commit(next)

        if (record.transcriptPath && (await fileExists(record.transcriptPath))) {
          try {
            const markdown = await readFile(record.transcriptPath, 'utf8')
            const updated = updateFrontmatterField(markdown, 'title', clean)
            if (updated !== markdown) await writeFileAtomic(record.transcriptPath, updated)
          } catch (error) {
            logger?.warn?.(`recording-suite: 更新 Markdown 标题失败：${error instanceof Error ? error.message : String(error)}`)
          }
        }
        return { ...record }
      })
    },

    /**
     * Delete a recording's audio, Markdown and index entry.
     * @param {string} id
     * @returns {Promise<boolean>} whether a record existed.
     */
    async remove(id) {
      return mutex.run(async () => {
        const current = await ensureState()
        const record = current.recordings.get(String(id))
        if (!record) return false
        const next = cloneState(current)
        next.recordings.delete(record.id)
        await commit(next)
        for (const path of [record.audioPath, record.transcriptPath]) {
          if (!path) continue
          try {
            await rm(path, { force: true })
          } catch (error) {
            logger?.warn?.(`recording-suite: 删除文件失败 ${path}: ${error instanceof Error ? error.message : String(error)}`)
          }
        }
        return true
      })
    },

    async watchToken() {
      return mutex.run(async () => {
        const current = await ensureState()
        return current.watchToken
      })
    },

    async rotateWatchToken() {
      return mutex.run(async () => {
        const current = await ensureState()
        const next = cloneState(current)
        next.watchToken = generateToken()
        await commit(next)
        return next.watchToken
      })
    },

    /** Absolute paths for ASR scratch files (inside `bin/`). */
    scratchPath(name) {
      return join(dirs.bin, name)
    },
  }

  function listSnapshot() {
    return [...state.recordings.values()]
      .map((record) => ({ ...record }))
      .sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))
  }

  return store
}

/**
 * Validate the base64 payload of `POST /api/recording/import`.
 * @param {unknown} value
 * @returns {Buffer}
 */
export function decodeBase64Audio(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('缺少 dataBase64')
  const cleaned = value.replace(/^data:[^,]*,/, '').replace(/\s+/g, '')
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) throw new Error('dataBase64 不是有效的 base64')
  const buffer = Buffer.from(cleaned, 'base64')
  if (buffer.length === 0) throw new Error('音频数据为空')
  return buffer
}

/** Count recordings and transcribed recordings for the status endpoint. */
export function countsOf(recordings) {
  return {
    recordings: recordings.length,
    transcribed: recordings.filter((record) => record.transcriptStatus === 'done').length,
  }
}

/** Audio content types used by the streaming endpoint. */
export const AUDIO_CONTENT_TYPES = {
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  bin: 'application/octet-stream',
}

/** List transcript filenames (used by diagnostics/tests, not request paths). */
export async function listTranscriptFiles(store) {
  try {
    const entries = await readdir(store.dirs.transcripts)
    return entries.filter((name) => name.endsWith('.md')).sort()
  } catch {
    return []
  }
}
