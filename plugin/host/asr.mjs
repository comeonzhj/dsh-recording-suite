/**
 * Recording Suite — ASR providers and the serial transcription queue.
 *
 * One job runs at a time (the contract forbids parallel local Speech or
 * network calls). Providers are selected from the plugin config at job start:
 *
 *   apple   macOS Speech framework via the compiled native helper
 *           (`plugin/native/apple_transcribe.swift` → `<storage>/bin/`)
 *   openai  any OpenAI-compatible `POST /audio/transcriptions`
 *   none    save audio only; a queued job fails with a readable explanation
 */

import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { chmod, mkdir, readFile, rename, rm, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/* --------------------------------------------------------------- processes */

/**
 * Run one child process, collecting stdout/stderr with timeout + cancellation.
 * @param {string} command
 * @param {string[]} args
 * @param {{ signal?: AbortSignal, timeoutMs?: number, cwd?: string, env?: NodeJS.ProcessEnv }} [options]
 * @returns {Promise<{ stdout: string, stderr: string, code: number | null, signal: NodeJS.Signals | null }>}
 */
export function runProcess(command, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 120_000
  return new Promise((resolvePromise) => {
    let stdout = ''
    let stderr = ''
    let settled = false
    let timedOut = false

    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const finish = (code, signal) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      options.signal?.removeEventListener('abort', onAbort)
      resolvePromise({ stdout, stderr, code, signal })
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
    child.on('close', (code, signal) => {
      if (timedOut) stderr += `\n[timeout after ${timeoutMs}ms]`
      finish(code, signal)
    })

    if (options.signal) {
      if (options.signal.aborted) onAbort()
      else options.signal.addEventListener('abort', onAbort, { once: true })
    }
  })
}

/* ----------------------------------------------------------------- helpers */

/** Locate the Apple Speech helper source that ships inside the plugin bundle. */
export function appleHelperSource(pluginRoot) {
  return join(pluginRoot, 'native', 'apple_transcribe.swift')
}

/**
 * Compile the Swift speech helper once per binary directory.
 * The promise cache makes concurrent first jobs share one `swiftc` run.
 * @param {{ helperPath: string, swiftSource: string, logger?: any }} input
 */
const compileCache = new Map()

export async function ensureAppleHelper({ helperPath, swiftSource, logger }) {
  const cached = compileCache.get(helperPath)
  if (cached) return cached

  const task = (async () => {
    let sourceStat
    try {
      sourceStat = await stat(swiftSource)
    } catch {
      throw new AsrError('找不到 Apple Speech 助手源码 native/apple_transcribe.swift，请重新安装插件', 'APPLE_HELPER_SOURCE_MISSING')
    }
    try {
      const binaryStat = await stat(helperPath)
      if (binaryStat.mtimeMs >= sourceStat.mtimeMs) return helperPath
    } catch {
      /* not compiled yet */
    }

    await mkdir(dirname(helperPath), { recursive: true })
    const tmp = `${helperPath}.tmp-${randomBytes(4).toString('hex')}`
    logger?.info?.('recording-suite: 正在编译 Apple Speech 助手（只需一次）…')

    // The embedded Info.plist carries NSSpeechRecognitionUsageDescription for the
    // legacy SFSpeechRecognizer path (macOS < 26); the modern SpeechAnalyzer path
    // does not need it. Include it when the bundle ships it.
    const infoPlist = join(dirname(swiftSource), 'apple_transcribe_info.plist')
    const args = ['swiftc', '-O', '-parse-as-library', '-o', tmp, swiftSource]
    try {
      await stat(infoPlist)
      args.push('-Xlinker', '-sectcreate', '-Xlinker', '__TEXT', '-Xlinker', '__info_plist', '-Xlinker', infoPlist)
    } catch {
      logger?.warn?.('recording-suite: 缺少 apple_transcribe_info.plist，旧版 macOS 的语音识别权限提示可能不完整')
    }
    const result = await runProcess('/usr/bin/xcrun', args, { timeoutMs: 240_000 })
    if (result.code !== 0) {
      await rm(tmp, { force: true }).catch(() => {})
      const detail = `${result.stderr || result.stdout}`.trim().slice(0, 2000)
      throw new AsrError(
        `Apple Speech 助手编译失败（xcrun swiftc 退出码 ${result.code ?? 'signal'}）。请确认已安装 Xcode Command Line Tools（xcode-select --install）。原始输出：${detail || '无'}`,
        'APPLE_HELPER_COMPILE_FAILED',
      )
    }
    await chmod(tmp, 0o755)
    try {
      await rename(tmp, helperPath)
    } catch (error) {
      await rm(tmp, { force: true }).catch(() => {})
      throw error
    }
    logger?.info?.(`recording-suite: Apple Speech 助手已编译到 ${helperPath}`)
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

/** Error carrying a machine-routable code and a user-facing message. */
export class AsrError extends Error {
  constructor(message, code = 'ASR_FAILED') {
    super(message)
    this.name = 'AsrError'
    this.code = code
  }
}

/**
 * Parse the JSON contract emitted by `native/apple_transcribe.swift`.
 * @param {string} stdout
 * @returns {{ ok: boolean, text?: string, error?: string, code?: string }}
 */
export function parseAppleHelperOutput(stdout) {
  const trimmed = String(stdout ?? '').trim()
  if (!trimmed) return { ok: false, error: 'Apple Speech 助手没有输出' }
  const lines = trimmed.split('\n').filter(Boolean)
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index].trim()
    if (!line.startsWith('{')) continue
    try {
      const parsed = JSON.parse(line)
      if (typeof parsed === 'object' && parsed !== null) return parsed
    } catch {
      /* keep looking */
    }
  }
  // A helper that printed plain text still produced a usable transcript.
  return { ok: true, text: trimmed }
}

/** Host-side wall clock budget for one Apple Speech helper run (helper self-timeout is 300 s). */
export const APPLE_SPEECH_TIMEOUT_MS = 330_000

/**
 * Actionable message for a helper run that exceeded its budget.
 * @param {number} seconds
 */
export function appleTimeoutMessage(seconds) {
  return (
    `Apple Speech 在 ${Math.round(seconds)} 秒内没有返回。常见原因：该语言的端侧语音模型未安装或正在下载、` +
    '系统语音服务无响应。请到 系统设置 > 通用 > 键盘 > 听写 安装/检查该语言模型，或改用 OpenAI 兼容 ASR 后重试。'
  )
}

/** Turn a Speech framework failure into an actionable Chinese message. */
export function friendlyAppleError(raw) {
  const text = String(raw ?? '')
  const lower = text.toLowerCase()
  if (
    lower.includes('not authorized') ||
    lower.includes('not determined') ||
    lower.includes('denied') ||
    lower.includes('tcc') ||
    lower.includes('speech recognition permission')
  ) {
    return (
      'Apple Speech 权限被拒绝。请打开 系统设置 > 隐私与安全性 > 语音识别，允许 DeepSeek Harness（或运行 Host 的终端）访问后重试。' +
      `原始错误：${text.slice(0, 500)}`
    )
  }
  if (lower.includes('timed out') || lower.includes('timeout') || text.includes('超时')) {
    return appleTimeoutMessage(APPLE_SPEECH_TIMEOUT_MS / 1000)
  }
  if (lower.includes('no speech') || lower.includes('no recognition')) {
    return `Apple Speech 没有识别到语音（可能是静音或采样格式不受支持）。原始错误：${text.slice(0, 500)}`
  }
  if (lower.includes('locale') || lower.includes('unsupported')) {
    return `Apple Speech 不支持该语言标识。请在设置里换一个语言（例如 zh-CN / en-US）。原始错误：${text.slice(0, 500)}`
  }
  return `Apple Speech 转写失败：${text.slice(0, 800)}`
}

/** The OpenAI-compatible transcriptions endpoint derived from a base URL. */
export function openAiEndpoint(baseUrl) {
  const base = String(baseUrl ?? '').trim().replace(/\/+$/, '')
  if (!base) throw new AsrError('OpenAI 兼容 ASR 未配置 baseUrl', 'OPENAI_BASE_URL_MISSING')
  return `${base}/audio/transcriptions`
}

/**
 * Convert an arbitrary audio file to 16 kHz mono WAV for Apple Speech.
 * @param {{ record: any, scratchDir: string, signal?: AbortSignal, logger?: any }} input
 * @returns {Promise<string>} absolute WAV path.
 */
export async function prepareWav({ record, scratchDir, signal, logger }) {
  const source = record.audioPath
  const wavPath = join(scratchDir, `${record.id}.16k.wav`)
  const afconvert = '/usr/bin/afconvert'
  let hasAfconvert = true
  try {
    await stat(afconvert)
  } catch {
    hasAfconvert = false
  }
  if (!hasAfconvert) {
    if (record.format === 'wav') return source
    throw new AsrError('缺少 macOS 自带的 afconvert，无法把音频转换为 16k mono WAV', 'AFCONVERT_MISSING')
  }
  await mkdir(scratchDir, { recursive: true })
  await rm(wavPath, { force: true }).catch(() => {})
  const result = await runProcess(
    afconvert,
    ['-f', 'WAVE', '-d', 'LEI16@16000', '-c', '1', source, wavPath],
    { signal, timeoutMs: 120_000 },
  )
  if (result.code !== 0) {
    logger?.warn?.(`recording-suite: afconvert 失败：${result.stderr.slice(0, 500)}`)
    // A WAV source is still readable by Speech even if conversion was refused.
    if (record.format === 'wav') return source
    throw new AsrError(
      `音频转换为 16k WAV 失败（afconvert 退出码 ${result.code}）：${(result.stderr || '').trim().slice(0, 800)}`,
      'AF_CONVERT_FAILED',
    )
  }
  return wavPath
}

/**
 * Transcribe with the macOS Speech framework helper.
 * @param {{ record: any, config: any, store: any, signal?: AbortSignal, onProgress?: (value: number, phase: string) => void, logger?: any, pluginRoot: string }} input
 */
export async function transcribeApple({ record, config, store, signal, onProgress, logger, pluginRoot }) {
  onProgress?.(0.1, 'converting')
  const wavPath = await prepareWav({ record, scratchDir: store.dirs.bin, signal, logger })

  onProgress?.(0.35, 'preparing')
  const helperPath = join(store.dirs.bin, 'apple_transcribe')
  await ensureAppleHelper({
    helperPath,
    swiftSource: appleHelperSource(pluginRoot),
    logger,
  })
  if (signal?.aborted) throw new AsrError('转录已取消', 'CANCELLED')

  onProgress?.(0.5, 'transcribing')
  const language = String(config.language || 'zh-CN')
  try {
    const result = await runProcess(helperPath, [wavPath, language], {
      signal,
      timeoutMs: APPLE_SPEECH_TIMEOUT_MS,
    })
    if (signal?.aborted) throw new AsrError('转录已取消', 'CANCELLED')

    const payload = parseAppleHelperOutput(result.stdout)
    const hostTimedOut =
      /\[timeout after \d+ms\]/.test(result.stderr ?? '') ||
      (result.code === null && result.signal === 'SIGKILL' && !signal?.aborted)
    if (payload.code === 'TIMEOUT' || hostTimedOut) {
      throw new AsrError(appleTimeoutMessage(APPLE_SPEECH_TIMEOUT_MS / 1000), 'APPLE_SPEECH_TIMEOUT')
    }
    if (result.code !== 0 || payload.ok === false) {
      const detail = payload.error || result.stderr || result.stdout || `退出码 ${result.code ?? 'signal'}`
      throw new AsrError(friendlyAppleError(detail), payload.code || 'APPLE_SPEECH_FAILED')
    }
    const text = String(payload.text ?? '').trim()
    if (!text) throw new AsrError('Apple Speech 返回了空文本', 'APPLE_SPEECH_EMPTY')
    onProgress?.(0.95, 'saving')
    return { text, provider: 'apple', language }
  } finally {
    if (wavPath !== record.audioPath) await rm(wavPath, { force: true }).catch(() => {})
  }
}

/**
 * Transcribe through any OpenAI-compatible `/audio/transcriptions` endpoint.
 * @param {{ record: any, config: any, signal?: AbortSignal, onProgress?: (value: number, phase: string) => void, fetchImpl?: typeof fetch, readFileImpl?: typeof readFile }} input
 */
export async function transcribeOpenAI({ record, config, signal, onProgress, fetchImpl, readFileImpl }) {
  const openai = config.openai ?? {}
  const apiKey = openai.apiKey || process.env.OPENAI_API_KEY || ''
  if (!apiKey) {
    throw new AsrError(
      'OpenAI 兼容 ASR 缺少 API Key。请在录音套件设置里填写，或设置环境变量 OPENAI_API_KEY 后重启。',
      'OPENAI_API_KEY_MISSING',
    )
  }
  const endpoint = openAiEndpoint(openai.baseUrl)
  const reader = readFileImpl ?? readFile
  const bytes = await reader(record.audioPath)
  onProgress?.(0.3, 'uploading')

  const file = new Blob([bytes], { type: contentTypeOf(record.format) })
  const form = new FormData()
  form.append('file', file, `${record.id}.${record.format}`)
  form.append('model', String(openai.model || 'whisper-1'))
  if (config.language) form.append('language', String(config.language))
  form.append('response_format', 'json')

  const fetchFn = fetchImpl ?? globalThis.fetch
  if (typeof fetchFn !== 'function') throw new AsrError('当前 Node 运行时没有 fetch，无法调用 OpenAI 兼容 ASR', 'FETCH_UNAVAILABLE')

  let response
  try {
    response = await fetchFn(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}` },
      body: form,
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw new AsrError('转录已取消', 'CANCELLED')
    throw new AsrError(`请求 OpenAI 兼容 ASR 失败：${error instanceof Error ? error.message : String(error)}`, 'OPENAI_REQUEST_FAILED')
  }

  onProgress?.(0.7, 'waiting')
  const raw = await response.text()
  if (!response.ok) {
    throw new AsrError(
      `OpenAI 兼容 ASR 返回 HTTP ${response.status}：${raw.slice(0, 800) || response.statusText}`,
      'OPENAI_HTTP_ERROR',
    )
  }
  let text = ''
  try {
    const parsed = JSON.parse(raw)
    text = typeof parsed.text === 'string' ? parsed.text : ''
  } catch {
    text = raw
  }
  if (!text.trim()) throw new AsrError('OpenAI 兼容 ASR 返回了空文本', 'OPENAI_EMPTY')
  onProgress?.(0.95, 'saving')
  return { text: text.trim(), provider: 'openai', language: String(config.language || '') }
}

function contentTypeOf(format) {
  switch (format) {
    case 'wav':
      return 'audio/wav'
    case 'm4a':
      return 'audio/mp4'
    case 'mp3':
      return 'audio/mpeg'
    case 'ogg':
      return 'audio/ogg'
    default:
      return 'application/octet-stream'
  }
}

/* ------------------------------------------------------------------- queue */

const TERMINAL = new Set(['done', 'failed', 'cancelled'])

/**
 * Serial transcription queue.
 *
 * @param {{
 *   store: any,
 *   getConfig: () => any,
 *   pluginRoot: string,
 *   logger?: any,
 *   emitJob?: (event: { type: string, job: any }) => void,
 *   emitRecording?: (event: { type: string, id: string, recording?: any }) => void,
 *   providers?: { apple?: Function, openai?: Function },
 * }} options
 */
export function createTranscriptionQueue(options) {
  const { store, getConfig, pluginRoot, logger } = options
  const emitJob = options.emitJob ?? (() => {})
  const emitRecording = options.emitRecording ?? (() => {})
  const providers = {
    apple: options.providers?.apple ?? transcribeApple,
    openai: options.providers?.openai ?? transcribeOpenAI,
  }

  /** @type {Map<string, any>} */
  const jobs = new Map()
  /** @type {any[]} */
  const pending = []
  /** @type {any | null} */
  let active = null
  let pumping = false
  let disposed = false

  const jobView = (job) => ({
    id: job.id,
    recordingId: job.recordingId,
    status: job.status,
    progress: job.progress,
    error: job.error,
    provider: job.provider,
    language: job.language,
    createdAt: job.createdAt,
    startedAt: job.startedAt ?? null,
    finishedAt: job.finishedAt ?? null,
  })

  const emit = (job) => {
    try {
      emitJob({ type: 'progress', job: jobView(job) })
    } catch (error) {
      logger?.warn?.(`recording-suite: 广播任务进度失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async function broadcastRecording(id, type) {
    try {
      const recording = await store.get(id)
      if (recording) emitRecording({ type, id, recording })
    } catch {
      /* listeners are best-effort */
    }
  }

  const updateJob = (job, patch) => {
    Object.assign(job, patch)
    emit(job)
  }

  async function runJob(job) {
    job.status = 'running'
    job.startedAt = Date.now()
    job.progress = 0.02
    emit(job)
    const record = await store.get(job.recordingId)
    if (!record) {
      job.status = 'cancelled'
      job.finishedAt = Date.now()
      emit(job)
      return
    }
    await store.setTranscriptState(record.id, { transcriptStatus: 'running', transcriptError: null })
    await broadcastRecording(record.id, 'updated')

    const config = getConfig()
    job.provider = config.provider
    job.language = job.language || config.language
    const controller = new AbortController()
    job.controller = controller
    const onProgress = (value, phase) => {
      if (job.status !== 'running') return
      job.progress = Math.max(0, Math.min(0.99, value))
      job.phase = phase
      emit(job)
    }

    try {
      let result
      if (config.provider === 'none') {
        throw new AsrError(
          'ASR 提供方为 none：录音只会保存。请在录音套件设置中选择 Apple Speech 或 OpenAI 兼容服务后再转录。',
          'ASR_DISABLED',
        )
      }
      const provider = providers[config.provider]
      if (!provider) throw new AsrError(`未知的 ASR 提供方：${config.provider}`, 'ASR_PROVIDER_UNKNOWN')
      result = await provider({
        record,
        config,
        store,
        pluginRoot,
        signal: controller.signal,
        onProgress,
        logger,
      })

      if (job.status === 'cancelled') return
      const saved = await store.saveTranscript(record.id, {
        text: result.text,
        provider: result.provider,
        language: result.language,
      })
      job.status = 'done'
      job.progress = 1
      job.error = null
      job.finishedAt = Date.now()
      emit(job)
      emitRecording({ type: 'updated', id: saved.id, recording: publicRecord(saved) })
    } catch (error) {
      if (job.status === 'cancelled') return
      const message =
        error instanceof AsrError
          ? error.message
          : `转录失败：${error instanceof Error ? error.message : String(error)}`
      job.status = 'failed'
      job.error = message
      job.finishedAt = Date.now()
      emit(job)
      try {
        const updated = await store.setTranscriptState(job.recordingId, {
          transcriptStatus: 'failed',
          transcriptError: message,
          transcriptProvider: config.provider,
        })
        if (updated) emitRecording({ type: 'updated', id: updated.id, recording: publicRecord(updated) })
      } catch (persistError) {
        logger?.warn?.(`recording-suite: 记录转录失败状态时出错：${persistError instanceof Error ? persistError.message : String(persistError)}`)
      }
      logger?.warn?.(`recording-suite: 转录 ${job.recordingId} 失败：${message}`)
    } finally {
      job.controller = undefined
    }
  }

  async function pump() {
    if (pumping || disposed) return
    pumping = true
    try {
      while (!disposed && pending.length > 0) {
        const job = pending.shift()
        if (!job || job.status !== 'queued') continue
        active = job
        await runJob(job)
        active = null
      }
    } finally {
      pumping = false
    }
  }

  return {
    /** Enqueue one recording; resolves with the job immediately (request is not blocked on ASR). */
    async enqueue(recordingId, language) {
      const record = await store.get(recordingId)
      if (!record) throw new Error(`录音 ${recordingId} 不存在`)
      const existing = [...jobs.values()].find(
        (job) => job.recordingId === recordingId && (job.status === 'queued' || job.status === 'running'),
      )
      if (existing) return jobView(existing)

      const job = {
        id: `job-${Date.now()}-${randomBytes(3).toString('hex')}`,
        recordingId,
        status: 'queued',
        progress: 0,
        error: null,
        provider: null,
        language: typeof language === 'string' && language.trim() ? language.trim() : null,
        createdAt: Date.now(),
      }
      jobs.set(job.id, job)
      pending.push(job)
      emit(job)
      const updated = await store.setTranscriptState(recordingId, {
        transcriptStatus: 'queued',
        transcriptError: null,
      })
      if (updated) emitRecording({ type: 'updated', id: updated.id, recording: publicRecord(updated) })
      queueMicrotask(() => {
        pump().catch((error) => {
          logger?.warn?.(`recording-suite: 转录队列异常：${error instanceof Error ? error.message : String(error)}`)
        })
      })
      return jobView(job)
    },

    getJob(id) {
      const job = jobs.get(String(id))
      return job ? jobView(job) : null
    },

    /** Cancel queued/running jobs for one recording (used before deletion). */
    cancelForRecording(recordingId) {
      let cancelled = 0
      for (const job of jobs.values()) {
        if (job.recordingId !== recordingId) continue
        if (job.status === 'queued') {
          job.status = 'cancelled'
          job.finishedAt = Date.now()
          cancelled += 1
          emit(job)
        } else if (job.status === 'running') {
          job.status = 'cancelled'
          job.finishedAt = Date.now()
          cancelled += 1
          try {
            job.controller?.abort()
          } catch {
            /* already aborted */
          }
          emit(job)
        }
      }
      const remaining = pending.filter((job) => job.status === 'queued')
      pending.length = 0
      pending.push(...remaining)
      return cancelled
    },

    cancel(jobId) {
      const job = jobs.get(String(jobId))
      if (!job || TERMINAL.has(job.status)) return false
      job.status = 'cancelled'
      job.finishedAt = Date.now()
      try {
        job.controller?.abort()
      } catch {
        /* ignore */
      }
      emit(job)
      return true
    },

    isBusy() {
      return pumping || Boolean(active)
    },

    async dispose() {
      disposed = true
      for (const job of pending) {
        if (job.status === 'queued') {
          job.status = 'cancelled'
          emit(job)
        }
      }
      pending.length = 0
      try {
        active?.controller?.abort()
      } catch {
        /* ignore */
      }
    },
  }
}

/** Public recording projection used in SSE payloads (same shape as list). */
export function publicRecord(record) {
  if (!record) return null
  const { markdown, ...rest } = record
  return { ...rest }
}

/**
 * Reset transcript states left behind by a previous Host process.
 * @param {any} store
 * @param {string} message
 */
export async function reconcileInterruptedJobs(store, message) {
  const recordings = await store.list()
  for (const record of recordings) {
    if (record.transcriptStatus === 'queued' || record.transcriptStatus === 'running') {
      await store.setTranscriptState(record.id, {
        transcriptStatus: 'failed',
        transcriptError: message,
      })
    }
  }
}
