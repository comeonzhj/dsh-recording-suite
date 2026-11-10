/**
 * Recording Suite — Server-Sent Events fan-out for the same-origin API.
 *
 * One hub owns every `/api/recording/events` response: library changes are
 * pushed as `event: recording`, transcription progress as `event: job`, and a
 * `: ping` comment every 25 seconds keeps proxies from closing idle streams.
 */

export const HEARTBEAT_MS = 25_000

/**
 * @param {{ heartbeatMs?: number, logger?: { warn?: (message: string) => void } }} [options]
 */
export function createEventHub(options = {}) {
  const heartbeatMs = options.heartbeatMs ?? HEARTBEAT_MS
  const logger = options.logger

  /** @type {Set<import('node:http').ServerResponse>} */
  const clients = new Set()
  /** @type {NodeJS.Timeout | null} */
  let heartbeat = null

  function ensureHeartbeat() {
    if (heartbeat) return
    heartbeat = setInterval(() => {
      for (const response of clients) write(response, ': ping\n\n')
    }, heartbeatMs)
    heartbeat.unref?.()
  }

  function stopHeartbeat() {
    if (!heartbeat) return
    clearInterval(heartbeat)
    heartbeat = null
  }

  function write(response, text) {
    try {
      if (response.writableEnded || response.destroyed) {
        clients.delete(response)
        return false
      }
      response.write(text)
      return true
    } catch (error) {
      clients.delete(response)
      logger?.warn?.(`recording-suite: SSE 写入失败：${error instanceof Error ? error.message : String(error)}`)
      return false
    }
  }

  return {
    /**
     * Attach one SSE response. The caller's handler returns immediately; the
     * connection stays open until the browser disconnects.
     */
    subscribe(request, response) {
      response.writeHead(200, {
        'cache-control': 'no-store',
        connection: 'keep-alive',
        'content-type': 'text/event-stream; charset=utf-8',
        'x-accel-buffering': 'no',
      })
      response.write('retry: 3000\n\n')
      clients.add(response)
      ensureHeartbeat()

      const cleanup = () => {
        clients.delete(response)
        if (clients.size === 0) stopHeartbeat()
      }
      request.on('close', cleanup)
      request.on('error', cleanup)
      response.on('close', cleanup)
      response.on('error', cleanup)
    },

    /** Push one named SSE event to every connected client. */
    broadcast(event, data) {
      if (clients.size === 0) return
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
      for (const response of [...clients]) write(response, payload)
    },

    clientCount() {
      return clients.size
    },

    dispose() {
      stopHeartbeat()
      for (const response of clients) {
        try {
          response.end()
        } catch {
          /* already closed */
        }
      }
      clients.clear()
    },
  }
}
