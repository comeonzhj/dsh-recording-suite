/**
 * Recording Suite — model-facing `recording_library` tool + prompt section.
 *
 * The tool is registered as a plain object through `ctx.tools.register`; the
 * Host half never imports `@deepseek-ai/dsh-tools`. Parameters are a raw JSON
 * Schema in the supported subset, the output schema is object-rooted, and the
 * `execute` body validates its own arguments.
 */

export const TOOL_NAME = 'recording_library'
export const PROMPT_SECTION_NAME = 'recording-suite:library'
/** After the shipped tool sections (TOOL_REPORT = 2900), before computer use. */
export const PROMPT_SECTION_ORDER = 2950

const ACTIONS = ['list', 'read', 'transcribe']

/** Raw JSON Schema for the model-facing tool parameters. */
export const RECORDING_TOOL_PARAMETERS = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: ACTIONS,
      description: 'list: 列出录音；read: 读取一条录音的转录 Markdown；transcribe: 为一条录音排队转录。',
    },
    id: { type: 'string', description: '录音 id（read / transcribe 必填）。' },
    query: { type: 'string', description: 'list 时按标题或文件名过滤（不区分大小写）。' },
    limit: { type: 'integer', description: 'list 返回条数上限（1-50，默认 20）。' },
    language: { type: 'string', description: 'transcribe 的 BCP-47 语言标识，省略则用插件配置。' },
  },
  required: ['action'],
  additionalProperties: false,
}

const RECORDING_FIELDS = [
  'id',
  'title',
  'source',
  'recordedAt',
  'durationMs',
  'format',
  'sizeBytes',
  'transcriptStatus',
  'transcriptError',
  'transcriptProvider',
  'transcriptPath',
  'audioPath',
  'snippet',
]

/** Thrown for user/model mistakes; the pipeline turns it into a tool error. */
class RecordingToolArgsError extends Error {
  constructor(message) {
    super(message)
    this.name = 'RecordingToolArgsError'
  }
}

/**
 * Validate model arguments against the declared schema (the registry does not
 * validate raw JSON Schema definitions, so the body does it explicitly).
 * @param {unknown} args
 */
export function validateRecordingToolArgs(args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    throw new RecordingToolArgsError('参数必须是对象')
  }
  const input = /** @type {Record<string, unknown>} */ (args)
  for (const key of Object.keys(input)) {
    if (!['action', 'id', 'query', 'limit', 'language'].includes(key)) {
      throw new RecordingToolArgsError(`未知参数：${key}`)
    }
  }
  const action = input.action
  if (typeof action !== 'string' || !ACTIONS.includes(action)) {
    throw new RecordingToolArgsError(`action 必须是 ${ACTIONS.join(' / ')} 之一`)
  }
  const id = typeof input.id === 'string' ? input.id.trim() : ''
  if ((action === 'read' || action === 'transcribe') && !id) {
    throw new RecordingToolArgsError(`${action} 需要 id`)
  }
  if (input.limit !== undefined) {
    if (typeof input.limit !== 'number' || !Number.isInteger(input.limit) || input.limit < 1 || input.limit > 50) {
      throw new RecordingToolArgsError('limit 必须是 1-50 的整数')
    }
  }
  if (input.query !== undefined && typeof input.query !== 'string') {
    throw new RecordingToolArgsError('query 必须是字符串')
  }
  if (input.language !== undefined && typeof input.language !== 'string') {
    throw new RecordingToolArgsError('language 必须是字符串')
  }
  return { action, id, query: input.query ?? '', limit: input.limit ?? 20, language: input.language }
}

function summarize(record) {
  const summary = {}
  for (const key of RECORDING_FIELDS) summary[key] = record[key] ?? null
  return summary
}

/**
 * Build the `recording_library` tool definition.
 * @param {{ store: any, queue: any, logger?: any }} deps
 */
export function createRecordingTool(deps) {
  const { store, queue } = deps

  return {
    name: TOOL_NAME,
    description:
      '查询本机录音库：列出录音、读取某条录音的 Markdown 转录、或为录音排队转录。' +
      '录音由安克录音豆（soundcore Work）或 Apple Watch 导入，转录文本是自包含 Markdown。',
    parameters: RECORDING_TOOL_PARAMETERS,
    output: {
      schema: { type: 'object' },
      render(_args, value) {
        return [{ type: 'text', text: JSON.stringify(value, null, 2) }]
      },
    },
    async execute(args) {
      const { action, id, query, limit, language } = validateRecordingToolArgs(args)

      if (action === 'list') {
        const all = await store.list()
        const needle = query.trim().toLowerCase()
        const matched = needle
          ? all.filter(
              (record) =>
                String(record.title ?? '').toLowerCase().includes(needle) ||
                String(record.id).toLowerCase().includes(needle),
            )
          : all
        return {
          action,
          total: matched.length,
          recordings: matched.slice(0, limit).map(summarize),
          hint:
            matched.length === 0
              ? '录音库为空或不匹配。请用户在录音套件面板导入录音。'
              : 'read 需要 id；transcribe 会排队，可在录音套件面板查看进度。',
        }
      }

      if (action === 'read') {
        const record = await store.get(id)
        if (!record) throw new RecordingToolArgsError(`录音 ${id} 不存在`)
        const transcript = await store.readTranscript(id)
        if (!transcript) {
          throw new RecordingToolArgsError(
            `录音 ${id} 还没有转录文本；可先调用 ${TOOL_NAME}(action: "transcribe", id: "${id}") 排队转录。`,
          )
        }
        return {
          action,
          id,
          title: record.title,
          path: transcript.path,
          updatedAt: transcript.updatedAt,
          text: transcript.text,
        }
      }

      const record = await store.get(id)
      if (!record) throw new RecordingToolArgsError(`录音 ${id} 不存在`)
      const job = await queue.enqueue(id, language)
      return {
        action,
        id,
        jobId: job.id,
        status: job.status,
        hint: '转录串行执行；用录音套件面板或 GET /api/recording/jobs?id=<jobId> 查看进度。',
      }
    },
  }
}

/** The system-prompt section that teaches the model when to use the tool. */
export function recordingPromptText() {
  return [
    '## 录音库',
    '',
    '本机安装了录音套件：`~/Documents/DSH-Recordings` 保存从安克录音豆（soundcore Work）与 Apple Watch 导入的录音，',
    '转录结果是自包含 Markdown（`transcripts/<id>.md`，frontmatter 含标题、时间、来源、音频绝对路径、ASR 提供方与语言）。',
    '',
    `- 需要列出、读取或转写录音时，调用 \`${TOOL_NAME}\` 工具：\`action: "list"\`、\`action: "read"\`（需要 id）、\`action: "transcribe"\`（需要 id）。`,
    '- 用户用 `@` 引用录音时，候选里排在前面的是最近修改的转录文件；选中后是绝对路径，直接用它调用 `read`。',
    '- 转录任务串行执行，排队后不会立即完成；不要轮询，先告诉用户进度可以在录音套件面板查看。',
    '',
    '不要在未调用工具时编造录音标题或转录内容。',
  ].join('\n')
}

/**
 * Register the tool and prompt section through the injected DSH context.
 * @param {any} ctx injected context with `tools` and `systemPrompt`.
 * @param {{ store: any, queue: any, logger?: any }} deps
 */
export function registerRecordingTools(ctx, deps) {
  const logger = deps.logger
  const disposers = []

  if (typeof ctx.tools?.register === 'function') {
    try {
      disposers.push(ctx.tools.register(createRecordingTool(deps)))
    } catch (error) {
      logger?.warn?.(`recording-suite: 注册 ${TOOL_NAME} 失败：${error instanceof Error ? error.message : String(error)}`)
    }
  } else {
    logger?.warn?.(`recording-suite: tools 服务不可用，${TOOL_NAME} 未注册`)
  }

  if (typeof ctx.systemPrompt?.section === 'function') {
    try {
      disposers.push(
        ctx.systemPrompt.section({
          name: PROMPT_SECTION_NAME,
          order: PROMPT_SECTION_ORDER,
          text: recordingPromptText,
          interpolate: false,
        }),
      )
    } catch (error) {
      logger?.warn?.(
        `recording-suite: 注册系统提示段失败：${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  return () => {
    for (const dispose of disposers) {
      try {
        dispose?.()
      } catch {
        /* ignore */
      }
    }
  }
}
