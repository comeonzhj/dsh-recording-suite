/**
 * Host half of the Recording Suite bundle.
 *
 * The module is deliberately thin: `plugin/host/plugin.mjs` owns the durable
 * library, ASR queue, same-origin HTTP API, LAN watch import service, `@`
 * reference injection and the `recording_library` tool. `plugin/client.js` is
 * the browser half served by DSH.
 *
 * Host code may only import `node:` builtins from this package; DSH services
 * are reached through `ctx.get()` / `ctx.inject()`.
 */
import { applyRecordingHost } from './host/plugin.mjs'

export const name = 'recording-suite'

/**
 * Plugin entry point.
 * @param {any} ctx Cordis context.
 * @param {Record<string, unknown>} [config] bundle-patch config.
 */
export function apply(ctx, config = {}) {
  return applyRecordingHost(ctx, config)
}
