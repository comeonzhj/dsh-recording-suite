/**
 * Recording Suite — LAN import service for the iPhone companion.
 *
 *   TCP 0.0.0.0:<port>   Bearer-token upload service (default port 47831)
 *   UDP 255.255.255.255:47832   discovery beacon every 3 s
 *
 * The service is separate from the DSH same-origin HTTP server because the
 * phone is a different origin and speaks raw `node:http`. All endpoints except
 * `/health` require `Authorization: Bearer <token>`; the token lives in
 * `index.json` and is rotated by `POST /api/recording/watch/rotate-token`.
 */

import { timingSafeEqual } from 'node:crypto'
import { createSocket } from 'node:dgram'
import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'

import { guessFormat } from './store.mjs'

export const SERVICE_NAME = 'dsh-recording'
export const SERVICE_VERSION = 1

const MAX_UPLOAD_BYTES = 512 * 1024 * 1024

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(payload))
}

const messageOf = (error) => (error instanceof Error ? error.message : String(error))

function safeEqual(left, right) {
  const a = Buffer.from(String(left ?? ''), 'utf8')
  const b = Buffer.from(String(right ?? ''), 'utf8')
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/** LAN addresses the phone can reach, with the configured port. */
export function lanUrls(port) {
  const urls = []
  const interfaces = networkInterfaces()
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal && entry.address !== '0.0.0.0') {
        urls.push(`http://${entry.address}:${port}`)
      }
    }
  }
  return [...new Set(urls)]
}

/** Read raw request bytes with a size guard. */
async function readBody(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > MAX_UPLOAD_BYTES) throw new Error('上传音频超过 512 MB 上限')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

/**
 * Create the LAN import service (not started until `start()` is called).
 *
 * @param {{
 *   store: any,
 *   getConfig: () => any,
 *   logger?: { info?: Function, warn?: Function },
 *   hostName?: () => string,
 *   onImported?: (recording: any) => void,
 * }} options
 */
export function createWatchService(options) {
  const { store, getConfig, logger } = options
  const hostName = options.hostName ?? (() => 'DSH Host')
  const onImported = options.onImported ?? (() => {})
  const beaconEnabled = options.beacon !== false

  /** @type {import('node:http').Server | null} */
  let server = null
  /** @type {import('node:dgram').Socket | null} */
  let beacon = null
  /** @type {NodeJS.Timeout | null} */
  let beaconTimer = null
  let actualPort = null
  let lastError = null
  let starting = null

  const handler = async (request, response) => {
    let url
    try {
      url = new URL(request.url ?? '/', 'http://127.0.0.1')
    } catch {
      return sendJson(response, 400, { error: '非法 URL' })
    }
    const pathname = url.pathname.replace(/\/+$/, '') || '/'

    if (pathname === '/health' && (request.method === 'GET' || request.method === 'HEAD')) {
      return sendJson(response, 200, { ok: true, service: SERVICE_NAME, version: SERVICE_VERSION })
    }

    const token = await store.watchToken()
    const header = String(request.headers.authorization ?? '')
    const presented = /^Bearer\s+(.+)$/i.exec(header)?.[1]?.trim() ?? ''
    if (!presented || !safeEqual(presented, token)) {
      return sendJson(response, 401, { error: '无效或缺失的 token' })
    }

    try {
      if (pathname === '/api/watch/ping' && (request.method === 'GET' || request.method === 'HEAD')) {
        return sendJson(response, 200, { ok: true, name: hostName(), version: SERVICE_VERSION })
      }

      if (pathname === '/api/watch/upload') {
        if (request.method !== 'POST') return sendJson(response, 405, { error: 'method not allowed' })
        const data = await readBody(request)
        if (!data.length) return sendJson(response, 400, { error: '上传内容为空' })
        const name = url.searchParams.get('name') ?? ''
        const recordedAt = url.searchParams.get('recordedAt') ?? undefined
        const durationRaw = url.searchParams.get('durationMs')
        const duration = Number(durationRaw)
        const format = url.searchParams.get('format') ?? guessFormat(name, request.headers['content-type'])
        const recording = await store.importRecording({
          source: 'apple-watch',
          title: name || undefined,
          recordedAt,
          durationMs: Number.isFinite(duration) && duration >= 0 ? duration : null,
          format,
          data,
        })
        onImported(recording)
        logger?.info?.(`recording-suite: 已从局域网导入 ${recording.id}（${recording.sizeBytes} 字节）`)
        return sendJson(response, 200, { recording })
      }

      return sendJson(response, 404, { error: '未知接口' })
    } catch (error) {
      logger?.warn?.(`recording-suite: 手表导入请求失败：${messageOf(error)}`)
      return sendJson(response, 500, { error: messageOf(error) })
    }
  }

  function stop() {
    if (beaconTimer) {
      clearInterval(beaconTimer)
      beaconTimer = null
    }
    try {
      beacon?.close()
    } catch {
      /* ignore */
    }
    beacon = null
    const closing = server
    server = null
    actualPort = null
    if (closing) {
      return new Promise((resolvePromise) => {
        try {
          closing.close(() => resolvePromise())
          // Keep-alive connections would otherwise hold the port until they
          // expire; a plugin reload must release it immediately.
          closing.closeIdleConnections?.()
          closing.closeAllConnections?.()
        } catch {
          resolvePromise()
        }
      })
    }
    return Promise.resolve()
  }

  function startBeacon(port) {
    if (!beaconEnabled) return
    const config = getConfig()
    const beaconPort = config.beaconPort
    try {
      beacon = createSocket('udp4')
      beacon.on('error', (error) => {
        logger?.warn?.(`recording-suite: UDP 信标错误：${messageOf(error)}`)
      })
      beacon.bind(() => {
        try {
          beacon?.setBroadcast(true)
        } catch (error) {
          logger?.warn?.(`recording-suite: 无法开启 UDP 广播：${messageOf(error)}`)
        }
      })
      const beat = async () => {
        try {
          const token = await store.watchToken()
          const payload = JSON.stringify({
            service: SERVICE_NAME,
            version: SERVICE_VERSION,
            port,
            token,
            name: hostName(),
          })
          beacon?.send(payload, beaconPort, '255.255.255.255')
        } catch (error) {
          logger?.warn?.(`recording-suite: UDP 信标发送失败：${messageOf(error)}`)
        }
      }
      void beat()
      beaconTimer = setInterval(beat, 3000)
      beaconTimer.unref?.()
    } catch (error) {
      logger?.warn?.(`recording-suite: 无法创建 UDP 信标：${messageOf(error)}`)
    }
  }

  return {
    /**
     * Start (or restart) the service according to `getConfig()`.
     * @param {{ port?: number }} [overrides] test-only explicit listen port.
     * @returns {Promise<void>}
     */
    async start(overrides = {}) {
      if (starting) return starting
      starting = (async () => {
        await stop()
        const config = getConfig()
        lastError = null
        if (!config.watchImport.enabled) return
        const requestedPort = overrides.port ?? config.watchImport.port
        // A plugin generation can be started before the previous generation's
        // effect cleanup releases the port. Retry briefly instead of leaving
        // the LAN import service permanently dead after a reload.
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const started = await new Promise((resolvePromise) => {
            const next = createServer((request, response) => {
              handler(request, response).catch((error) => {
                if (!response.writableEnded) sendJson(response, 500, { error: messageOf(error) })
              })
            })
            next.once('error', (error) => {
              lastError = messageOf(error)
              try {
                next.close()
              } catch {
                /* ignore */
              }
              resolvePromise(false)
            })
            next.listen(requestedPort, '0.0.0.0', () => {
              next.removeAllListeners('error')
              next.on('error', (error) => {
                lastError = messageOf(error)
                logger?.warn?.(`recording-suite: 手表导入服务错误：${lastError}`)
              })
              server = next
              const address = next.address()
              actualPort = typeof address === 'object' && address ? address.port : requestedPort
              lastError = null
              logger?.info?.(`recording-suite: 手表导入服务已监听 0.0.0.0:${actualPort}`)
              startBeacon(actualPort)
              resolvePromise(true)
            })
          })
          if (started) return
          await new Promise((resolvePromise) => setTimeout(resolvePromise, 800))
        }
        logger?.warn?.(`recording-suite: 手表导入服务端口 ${requestedPort} 启动失败：${lastError}`)
      })()
      try {
        await starting
      } finally {
        starting = null
      }
    },

    stop,

    /** Status projection for `GET /api/recording/status`. Token is added there. */
    info() {
      const config = getConfig()
      const port = actualPort ?? config.watchImport.port
      return {
        enabled: config.watchImport.enabled,
        port,
        beaconPort: config.beaconPort,
        urls: config.watchImport.enabled && actualPort ? lanUrls(actualPort) : [],
        lastError,
      }
    },
  }
}
