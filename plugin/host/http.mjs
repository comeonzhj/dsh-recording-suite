/**
 * Recording Suite — same-origin HTTP API (`/api/recording/*`).
 *
 * Registered through `ctx.webServer.register({ kind: 'prefix', ... })`, so the
 * handler owns plain Node `(IncomingMessage, ServerResponse)` semantics —
 * JSON bodies, SSE, and Range audio are written here directly.
 */

import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'

import { AUDIO_CONTENT_TYPES, countsOf, decodeBase64Audio, guessFormat } from './store.mjs'
import { asrStatus, mergeConfigBody, normalizeConfig, publicConfig } from './config.mjs'

const JSON_LIMIT = 2 * 1024 * 1024
const IMPORT_LIMIT = 300 * 1024 * 1024
const UPLOAD_LIMIT = 512 * 1024 * 1024

/** JSON response helper. */
export function sendJson(response, status, payload) {
  if (response.writableEnded) return
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(payload))
}

const messageOf = (error) => (error instanceof Error ? error.message : String(error))

/** Read a JSON request body with a hard size limit. */
export async function readJsonBody(request, limit = JSON_LIMIT) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > limit) throw new Error(`请求体过大（超过 ${Math.round(limit / 1024 / 1024)} MB）`)
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  const text = Buffer.concat(chunks).toString('utf8')
  if (!text.trim()) return {}
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('请求体不是合法 JSON')
  }
}

/** Read raw request bytes (watch upload). */
export async function readRawBody(request, limit = UPLOAD_LIMIT) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > limit) throw new Error(`请求体过大（超过 ${Math.round(limit / 1024 / 1024)} MB）`)
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

/**
 * Minimal `multipart/form-data` parser (no dependencies).
 * Returns text fields and the first file part. Good enough for
 * `POST /api/recording/import-file`; not a general-purpose parser.
 * @param {import('node:http').IncomingMessage} request
 * @param {number} [limit]
 */
export async function readMultipart(request, limit = IMPORT_LIMIT) {
  const contentType = String(request.headers['content-type'] ?? '')
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType)
  if (!/^multipart\/form-data/i.test(contentType) || !boundaryMatch) {
    throw new Error('需要 multipart/form-data 请求')
  }
  const boundary = `--${(boundaryMatch[1] ?? boundaryMatch[2] ?? '').trim()}`
  const body = await readRawBody(request, limit)

  const fields = {}
  let file = null
  let index = 0
  while (index < body.length) {
    const next = body.indexOf(boundary, index)
    if (next < 0) break
    let partStart = next + boundary.length
    if (body.slice(partStart, partStart + 2).toString() === '--') break
    if (body.slice(partStart, partStart + 2).toString() === '\r\n') partStart += 2
    index = partStart
    const headerEnd = body.indexOf('\r\n\r\n', partStart)
    if (headerEnd < 0) break
    const headers = body.slice(partStart, headerEnd).toString('utf8')
    const dataStart = headerEnd + 4
    const nextBoundary = body.indexOf(boundary, dataStart)
    if (nextBoundary < 0) break
    let dataEnd = nextBoundary
    if (body.slice(dataEnd - 2, dataEnd).toString() === '\r\n') dataEnd -= 2
    const data = body.slice(dataStart, dataEnd)
    index = nextBoundary

    const nameMatch = /name="([^"]*)"/i.exec(headers)
    const filenameMatch = /filename="([^"]*)"/i.exec(headers)
    const typeMatch = /content-type:\s*([^\r\n]+)/i.exec(headers)
    if (!nameMatch) continue
    const name = nameMatch[1]
    if (filenameMatch) {
      if (!file) {
        file = {
          field: name,
          filename: filenameMatch[1],
          contentType: typeMatch ? typeMatch[1].trim() : 'application/octet-stream',
          data,
        }
      }
    } else {
      fields[name] = data.toString('utf8')
    }
  }
  return { fields, file }
}

function parseDuration(value) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null
}

/**
 * Audio range response for the `<audio>` element.
 * Supports `Range: bytes=start-end` and HEAD.
 */
async function serveAudio(request, response, record) {
  let info
  try {
    info = await stat(record.audioPath)
  } catch {
    return sendJson(response, 404, { error: '音频文件不存在' })
  }
  const size = info.size
  const type = AUDIO_CONTENT_TYPES[record.format] ?? 'application/octet-stream'
  const baseHeaders = {
    'accept-ranges': 'bytes',
    'cache-control': 'no-store',
    'content-type': type,
  }

  const rangeHeader = String(request.headers.range ?? '')
  const range = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim())
  if (range) {
    const start = range[1] === '' ? 0 : Number(range[1])
    const end = range[2] === '' ? size - 1 : Math.min(Number(range[2]), size - 1)
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
      response.writeHead(416, { ...baseHeaders, 'content-range': `bytes */${size}` })
      response.end()
      return
    }
    response.writeHead(206, {
      ...baseHeaders,
      'content-length': end - start + 1,
      'content-range': `bytes ${start}-${end}/${size}`,
    })
    if (request.method === 'HEAD') {
      response.end()
      return
    }
    streamFile(response, record.audioPath, { start, end })
    return
  }

  response.writeHead(200, { ...baseHeaders, 'content-length': size })
  if (request.method === 'HEAD') {
    response.end()
    return
  }
  streamFile(response, record.audioPath)
}

function streamFile(response, path, range) {
  const stream = createReadStream(path, range)
  stream.on('error', () => {
    if (!response.writableEnded) response.destroy()
  })
  stream.pipe(response)
}

/**
 * Build the same-origin API handler.
 *
 * @param {{
 *   store: any,
 *   queue: any,
 *   events: { subscribe: (request: any, response: any) => void },
 *   getRawConfig: () => Record<string, unknown>,
 *   applyConfig: (nextRaw: Record<string, unknown>) => Promise<{ persisted: boolean, warning?: string }>,
 *   watchInfo: () => { enabled: boolean, port: number, beaconPort: number, urls: string[], token: string, lastError?: string | null },
 *   appleSpeech: () => { available: boolean, reason: string | null },
 *   version: string,
 * }} deps
 * @returns {(request: import('node:http').IncomingMessage, response: import('node:http').ServerResponse) => Promise<void>}
 */
export function createApiHandler(deps) {
  const { store, queue, events } = deps
  const device = deps.device ?? null

  const routeKey = (pathname) => {
    if (pathname === '/api/recording/status') return 'status'
    if (pathname === '/api/recording/list') return 'list'
    if (pathname === '/api/recording/import') return 'import'
    if (pathname === '/api/recording/import-file') return 'import-file'
    if (pathname === '/api/recording/transcribe') return 'transcribe'
    if (pathname === '/api/recording/jobs') return 'jobs'
    if (pathname === '/api/recording/transcript') return 'transcript'
    if (pathname === '/api/recording/audio') return 'audio'
    if (pathname === '/api/recording/events') return 'events'
    if (pathname === '/api/recording/watch/rotate-token') return 'rotate-token'
    if (pathname === '/api/recording/config') return 'config'
    if (pathname === '/api/recording/device/status') return 'device-status'
    if (pathname === '/api/recording/device/scan') return 'device-scan'
    if (pathname === '/api/recording/device/list') return 'device-list'
    if (pathname === '/api/recording/device/export') return 'device-export'
    if (pathname === '/api/recording/device/record') return 'device-record'
    if (pathname === '/api/recording/device/delete') return 'device-delete'
    const match = /^\/api\/recording\/([^/]+)$/.exec(pathname)
    if (match) return { id: decodeURIComponent(match[1]) }
    return null
  }

  return async function handler(request, response) {
    let url
    try {
      url = new URL(request.url ?? '/', 'http://127.0.0.1')
    } catch {
      return sendJson(response, 400, { error: '非法 URL' })
    }
    const pathname = url.pathname.replace(/\/+$/, '') || '/'
    const key = routeKey(pathname)
    if (!key) return sendJson(response, 404, { error: '未知接口' })
    const method = String(request.method ?? 'GET').toUpperCase()

    try {
      /* ------------------------------------------------------------- status */
      if (key === 'status') {
        if (method !== 'GET' && method !== 'HEAD') return sendJson(response, 405, { error: 'method not allowed' })
        const config = normalizeConfig(deps.getRawConfig())
        const recordings = await store.list()
        const token = await store.watchToken()
        const watch = deps.watchInfo()
        const payload = {
          ok: true,
          version: deps.version,
          storageDir: config.storageDir,
          transcriptsDir: store.dirs.transcripts,
          counts: countsOf(recordings),
          asr: asrStatus(config),
          watchImport: {
            enabled: watch.enabled,
            port: watch.port,
            beaconPort: watch.beaconPort,
            urls: watch.urls,
            token,
          },
          appleSpeech: deps.appleSpeech(),
        }
        if (watch.lastError) payload.watchImport.error = watch.lastError
        return sendJson(response, 200, payload)
      }

      /* --------------------------------------------------------------- list */
      if (key === 'list') {
        if (method !== 'GET' && method !== 'HEAD') return sendJson(response, 405, { error: 'method not allowed' })
        return sendJson(response, 200, { recordings: await store.list() })
      }

      /* ------------------------------------------------------------- import */
      if (key === 'import') {
        if (method !== 'POST') return sendJson(response, 405, { error: 'method not allowed' })
        const body = await readJsonBody(request, IMPORT_LIMIT)
        let data
        try {
          data = decodeBase64Audio(body.dataBase64 ?? body.data)
        } catch (error) {
          return sendJson(response, 400, { error: messageOf(error) })
        }
        const recording = await store.importRecording({
          source: body.source,
          title: body.title,
          recordedAt: body.recordedAt,
          durationMs: parseDuration(body.durationMs),
          format: body.format,
          data,
          deviceFileId: body.deviceFileId,
        })
        events.broadcast('recording', { type: 'imported', recording })
        if (body.autoTranscribe === true) {
          try {
            await queue.enqueue(recording.id, body.language)
          } catch (error) {
            deps.logger?.warn?.(`recording-suite: 自动转录排队失败：${messageOf(error)}`)
          }
        }
        return sendJson(response, 200, { recording })
      }

      /* -------------------------------------------------------- import-file */
      if (key === 'import-file') {
        if (method !== 'POST') return sendJson(response, 405, { error: 'method not allowed' })
        const { fields, file } = await readMultipart(request)
        if (!file || !file.data.length) return sendJson(response, 400, { error: '缺少 file 字段' })
        const recording = await store.importRecording({
          source: fields.source,
          title: fields.title,
          recordedAt: fields.recordedAt,
          durationMs: parseDuration(fields.durationMs),
          format: fields.format || guessFormat(file.filename, file.contentType),
          data: file.data,
        })
        events.broadcast('recording', { type: 'imported', recording })
        return sendJson(response, 200, { recording })
      }

      /* ---------------------------------------------------------- transcribe */
      if (key === 'transcribe') {
        if (method !== 'POST') return sendJson(response, 405, { error: 'method not allowed' })
        const body = await readJsonBody(request)
        const id = typeof body.id === 'string' ? body.id : ''
        if (!id) return sendJson(response, 400, { error: '缺少 id' })
        const job = await queue.enqueue(id, body.language)
        return sendJson(response, 200, { jobId: job.id })
      }

      /* ---------------------------------------------------------------- jobs */
      if (key === 'jobs') {
        if (method !== 'GET') return sendJson(response, 405, { error: 'method not allowed' })
        const id = url.searchParams.get('id')
        if (!id) return sendJson(response, 400, { error: '缺少 id' })
        const job = queue.getJob(id)
        if (!job) return sendJson(response, 404, { error: '任务不存在' })
        return sendJson(response, 200, { job })
      }

      /* ---------------------------------------------------------- transcript */
      if (key === 'transcript') {
        if (method !== 'GET') return sendJson(response, 405, { error: 'method not allowed' })
        const id = url.searchParams.get('id')
        if (!id) return sendJson(response, 400, { error: '缺少 id' })
        const transcript = await store.readTranscript(id)
        if (!transcript) return sendJson(response, 404, { error: '该录音还没有转录文本' })
        return sendJson(response, 200, transcript)
      }

      /* --------------------------------------------------------------- audio */
      if (key === 'audio') {
        if (method !== 'GET' && method !== 'HEAD') return sendJson(response, 405, { error: 'method not allowed' })
        const id = url.searchParams.get('id')
        if (!id) return sendJson(response, 400, { error: '缺少 id' })
        const record = await store.get(id)
        if (!record) return sendJson(response, 404, { error: '录音不存在' })
        return serveAudio(request, response, record)
      }

      /* -------------------------------------------------------------- events */
      if (key === 'events') {
        if (method !== 'GET') return sendJson(response, 405, { error: 'method not allowed' })
        return events.subscribe(request, response)
      }

      /* ------------------------------------------------------- rotate-token */
      if (key === 'rotate-token') {
        if (method !== 'POST') return sendJson(response, 405, { error: 'method not allowed' })
        const token = await store.rotateWatchToken()
        return sendJson(response, 200, { token })
      }

      /* -------------------------------------------------------------- config */
      if (key === 'config') {
        if (method === 'GET') {
          const config = normalizeConfig(deps.getRawConfig())
          return sendJson(response, 200, publicConfig(config))
        }
        if (method !== 'POST') return sendJson(response, 405, { error: 'method not allowed' })
        const body = await readJsonBody(request)
        const nextRaw = mergeConfigBody(deps.getRawConfig(), body)
        const normalized = normalizeConfig(nextRaw)
        const result = await deps.applyConfig(nextRaw, normalized)
        return sendJson(response, 200, {
          ok: true,
          restart: result.persisted,
          persisted: result.persisted,
          ...(result.warning ? { warning: result.warning } : {}),
        })
      }

      /* -------------------------------------------------- native device bridge */
      if (typeof key === 'string' && key.startsWith('device-')) {
        if (!device) {
          return sendJson(response, 503, {
            error: '原生蓝牙桥不可用：当前 Host 没有加载 device 服务。',
            code: 'native_unavailable',
          })
        }
        if (key === 'device-status') {
          if (method !== 'GET' && method !== 'HEAD') return sendJson(response, 405, { error: 'method not allowed' })
          return sendJson(response, 200, device.status())
        }
        if (method !== 'POST') return sendJson(response, 405, { error: 'method not allowed' })
        const body = await readJsonBody(request)

        if (key === 'device-scan') {
          const timeoutSeconds = Number(body.timeoutSeconds)
          const result = await device.scan({
            mode: body.mode === 'all' ? 'all' : 'precise',
            timeoutMs: Number.isFinite(timeoutSeconds) && timeoutSeconds > 0 ? timeoutSeconds * 1000 : 8000,
          })
          return sendJson(response, 200, { ok: true, ...result })
        }
        if (key === 'device-list') {
          const result = await device.list({ deviceId: body.deviceId })
          return sendJson(response, 200, { ok: true, ...result })
        }
        if (key === 'device-export') {
          const result = await device.exportRecording({
            deviceId: body.deviceId,
            fileId: body.fileId,
            title: body.title,
            recordedAt: typeof body.recordedAt === 'string' ? body.recordedAt : null,
            autoTranscribe: body.autoTranscribe === true,
            language: typeof body.language === 'string' ? body.language : undefined,
          })
          return sendJson(response, 200, { ok: true, ...result })
        }
        if (key === 'device-record') {
          const result = await device.record({ deviceId: body.deviceId, action: body.action })
          return sendJson(response, 200, { ok: true, ...result })
        }
        if (key === 'device-delete') {
          const result = await device.removeFile({ deviceId: body.deviceId, fileId: body.fileId })
          return sendJson(response, 200, { ok: true, ...result })
        }
        return sendJson(response, 404, { error: '未知接口' })
      }

      /* ----------------------------------------------------- PATCH/DELETE id */
      if (typeof key === 'object' && key.id) {
        const id = key.id
        if (method === 'PATCH') {
          const body = await readJsonBody(request)
          const title = typeof body.title === 'string' ? body.title : ''
          if (!title.trim()) return sendJson(response, 400, { error: '缺少 title' })
          const recording = await store.rename(id, title)
          if (!recording) return sendJson(response, 404, { error: '录音不存在' })
          events.broadcast('recording', { type: 'updated', id: recording.id, recording })
          return sendJson(response, 200, { recording })
        }
        if (method === 'DELETE') {
          queue.cancelForRecording(id)
          const removed = await store.remove(id)
          if (!removed) return sendJson(response, 404, { error: '录音不存在' })
          events.broadcast('recording', { type: 'removed', id })
          return sendJson(response, 200, { ok: true })
        }
        return sendJson(response, 405, { error: 'method not allowed' })
      }

      return sendJson(response, 404, { error: '未知接口' })
    } catch (error) {
      if (response.writableEnded) return
      const status = Number.isInteger(error?.httpStatus) ? error.httpStatus : 500
      const payload = { error: messageOf(error) }
      if (typeof error?.code === 'string' && error.code) payload.code = error.code
      return sendJson(response, status, payload)
    }
  }
}
