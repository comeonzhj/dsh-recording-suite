/**
 * Library page: list + detail of processed recordings.
 *
 * Reads `/api/recording/list`, refreshes from `/api/recording/events` (SSE),
 * plays `/api/recording/audio`, shows Markdown transcripts, and exposes rename,
 * delete, transcribe/retry, and copy-@-path actions.
 */
import { createElement as h, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { api, RecordingEventStream } from '../api.js'
import { formatBytes, formatDateTime, formatDuration, fileNameFromPath } from '../format.js'
import { Alert, Badge, Btn, Empty, Input, Progress, Spinner, useCopy, usePanel } from './ui.js'
import { Icon } from './icons.js'

const AUDIO_URL = (id) => `/api/recording/audio?id=${encodeURIComponent(id)}`

function statusKind(status) {
  if (status === 'done') return 'done'
  if (status === 'running') return 'running'
  if (status === 'queued') return 'queued'
  if (status === 'failed') return 'failed'
  return ''
}

export function LibraryPage() {
  const { t, lang, notify } = usePanel()
  const [recordings, setRecordings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [streamStatus, setStreamStatus] = useState('closed')
  const [jobs, setJobs] = useState({})
  const [asrLanguage, setAsrLanguage] = useState(null)
  const [busy, setBusy] = useState({})
  const [transcript, setTranscript] = useState({ loading: false, data: null, error: null, showRaw: false })
  const [rename, setRename] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { copy, copied } = useCopy(t)

  const alive = useRef(true)
  const refreshTimer = useRef(null)
  const selectedRef = useRef(null)
  selectedRef.current = selectedId
  const transcriptRef = useRef(transcript)
  transcriptRef.current = transcript

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
    }
  }, [])

  const loadList = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true)
      try {
        const data = await api.list()
        if (!alive.current) return
        setRecordings(Array.isArray(data?.recordings) ? data.recordings : [])
        setError(null)
      } catch (loadError) {
        if (!alive.current) return
        setError(loadError.message || String(loadError))
      } finally {
        if (alive.current && !silent) setLoading(false)
      }
    },
    [],
  )

  const loadTranscript = useCallback(async (id) => {
    if (!id) return
    setTranscript((previous) => ({ ...previous, loading: true, error: null }))
    try {
      const data = await api.transcript(id)
      if (!alive.current) return
      setTranscript((previous) => ({ ...previous, loading: false, data, error: null }))
    } catch (transcriptError) {
      if (!alive.current) return
      setTranscript((previous) => ({
        ...previous,
        loading: false,
        data: null,
        error: transcriptError.message || String(transcriptError),
      }))
    }
  }, [])

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null
      loadList({ silent: true })
    }, 260)
  }, [loadList])

  useEffect(() => {
    loadList()
    api
      .status()
      .then((status) => {
        if (alive.current) setAsrLanguage(status?.asr?.language || null)
      })
      .catch(() => {})
  }, [loadList])

  useEffect(() => {
    const stream = new RecordingEventStream({
      onEvent: (eventName, data) => {
        if (!alive.current) return
        if (eventName === 'recording') {
          if (data?.type === 'updated' && data.recording && data.recording.id === selectedRef.current) {
            setRecordings((previous) => previous.map((item) => (item.id === data.recording.id ? data.recording : item)))
          }
          scheduleRefresh()
        } else if (eventName === 'job' && data?.job) {
          const job = data.job
          setJobs((previous) => ({ ...previous, [job.recordingId]: job }))
          if (job.status === 'done' || job.status === 'failed') {
            scheduleRefresh()
            if (job.recordingId === selectedRef.current) {
              if (job.status === 'done') loadTranscript(job.recordingId)
              else setTranscript((previous) => ({ ...previous, loading: false, data: null, error: job.error || null }))
            }
          }
        }
      },
      onStatus: (status) => {
        if (alive.current) setStreamStatus(status)
      },
    })
    stream.connect()
    return () => stream.dispose()
  }, [scheduleRefresh, loadTranscript])

  const selected = useMemo(
    () => recordings.find((item) => item.id === selectedId) || null,
    [recordings, selectedId],
  )

  useEffect(() => {
    if (!selected) {
      setTranscript({ loading: false, data: null, error: null, showRaw: false })
      return
    }
    if (selected.transcriptStatus === 'done') {
      loadTranscript(selected.id)
    } else {
      setTranscript({ loading: false, data: null, error: null, showRaw: false })
    }
  }, [selected?.id, selected?.transcriptStatus, loadTranscript])

  useEffect(() => {
    if (selectedId && !recordings.some((item) => item.id === selectedId)) setSelectedId(null)
  }, [recordings, selectedId])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return recordings
    return recordings.filter((item) => {
      const haystack = [item.title, item.snippet, item.source, item.transcriptPath || ''].join(' ').toLowerCase()
      return haystack.includes(needle)
    })
  }, [recordings, query])

  const markBusy = (id, value) => setBusy((previous) => ({ ...previous, [id]: value }))

  const handleTranscribe = async (recording) => {
    markBusy(recording.id, true)
    try {
      await api.transcribe(recording.id, asrLanguage || undefined)
      notify(t('library.toast.transcribeQueued'))
      setRecordings((previous) =>
        previous.map((item) => (item.id === recording.id ? { ...item, transcriptStatus: 'queued', transcriptError: null } : item)),
      )
    } catch (transcribeError) {
      notify(t('library.error.transcribeFailed', { error: transcribeError.message }))
    } finally {
      markBusy(recording.id, false)
    }
  }

  const handleRename = async () => {
    if (!rename) return
    const title = rename.value.trim()
    if (!title) return
    markBusy(rename.id, true)
    try {
      const data = await api.rename(rename.id, title)
      if (data?.recording) {
        setRecordings((previous) => previous.map((item) => (item.id === data.recording.id ? data.recording : item)))
      } else {
        scheduleRefresh()
      }
      setRename(null)
      notify(t('library.toast.renamed'))
    } catch (renameError) {
      notify(t('library.error.renameFailed', { error: renameError.message }))
    } finally {
      markBusy(rename.id, false)
    }
  }

  const handleDelete = async (recording) => {
    markBusy(recording.id, true)
    try {
      await api.remove(recording.id)
      setRecordings((previous) => previous.filter((item) => item.id !== recording.id))
      if (selectedId === recording.id) setSelectedId(null)
      setDeleteTarget(null)
      notify(t('library.toast.deleted'))
    } catch (deleteError) {
      notify(t('library.error.deleteFailed', { error: deleteError.message }))
    } finally {
      markBusy(recording.id, false)
    }
  }

  const handleCopyPath = async (recording, audio = false) => {
    const useAudio = audio || !recording.transcriptPath
    const path = useAudio ? recording.audioPath : recording.transcriptPath
    if (!path) return
    const message = await copy(path, t(useAudio ? 'library.toast.copiedAudio' : 'library.toast.copiedPath'))
    if (message) notify(message)
  }

  const formatAudio = (recording) => (recording.format || '').toUpperCase()

  return h(
    'div',
    { className: 'dsh-rec-stack' },
    h(
      'div',
      { className: 'dsh-rec-row' },
      h('div', null, h('h2', { className: 'dsh-rec-card-title' }, h(Icon, { name: 'library', size: 17 }), t('library.title')), h('p', { className: 'dsh-rec-subtle' }, t('library.hint'))),
      h(
        'div',
        { className: 'dsh-rec-row dsh-rec-row-end' },
        h(Badge, { kind: streamStatus === 'open' ? 'done' : 'failed' }, streamStatus === 'open' ? 'SSE' : 'SSE…'),
        h(Btn, { icon: 'refresh', onClick: () => loadList(), disabled: loading, size: 'sm' }, t('app.refresh')),
      ),
    ),
    error
      ? h(
          Alert,
          { kind: 'error', title: t('library.error.loadFailed', { error }), action: h(Btn, { size: 'sm', onClick: () => loadList() }, t('app.retry')) },
          null,
        )
      : null,
    h(
      'div',
      { className: 'dsh-rec-lib' },
      h(
        'div',
        { className: 'dsh-rec-lib-list' },
        h(
          'div',
          { className: 'dsh-rec-lib-toolbar' },
          h(Icon, { name: 'search', size: 15 }),
          h(Input, {
            value: query,
            placeholder: t('library.search'),
            'aria-label': t('library.search'),
            onChange: (event) => setQuery(event.target.value),
          }),
          h('span', { className: 'dsh-rec-subtle' }, t('app.count', { count: filtered.length })),
        ),
        h(
          'div',
          { className: 'dsh-rec-lib-scroll' },
          loading
            ? h(Empty, { icon: 'wave', title: t('app.loading') })
            : filtered.length === 0
              ? h(Empty, {
                  icon: 'library',
                  title: recordings.length === 0 ? t('library.empty.title') : t('library.list.empty'),
                  hint: recordings.length === 0 ? t('library.empty.hint') : null,
                })
              : filtered.map((recording) =>
                  h(
                    'button',
                    {
                      key: recording.id,
                      type: 'button',
                      className: 'dsh-rec-item',
                      'aria-current': selectedId === recording.id ? 'true' : 'false',
                      onClick: () => setSelectedId(recording.id),
                    },
                    h(
                      'div',
                      { className: 'dsh-rec-item-top' },
                      h('span', { className: 'dsh-rec-item-title' }, recording.title || recording.id),
                      h(Badge, { kind: statusKind(recording.transcriptStatus) }, t(`status.${recording.transcriptStatus}`)),
                    ),
                    h(
                      'div',
                      { className: 'dsh-rec-item-meta' },
                      h('span', null, formatDateTime(recording.recordedAt, lang)),
                      h('span', null, formatDuration(recording.durationMs)),
                      h('span', null, t(`source.${recording.source}`)),
                    ),
                    h('div', { className: 'dsh-rec-item-snippet' }, recording.snippet || t('library.snippetEmpty')),
                  ),
                ),
        ),
      ),
      h(DetailPane, {
        t,
        lang,
        recording: selected,
        transcript,
        jobs,
        busy,
        copied,
        formatAudio,
        onTranscribe: handleTranscribe,
        onRename: (recording) => setRename({ id: recording.id, value: recording.title || '' }),
        onDelete: (recording) => setDeleteTarget(recording),
        onCopyPath: handleCopyPath,
        onToggleRaw: () => setTranscript((previous) => ({ ...previous, showRaw: !previous.showRaw })),
        onReloadTranscript: () => selected && loadTranscript(selected.id),
        onSelect: setSelectedId,
        rename,
        setRename,
        deleteTarget,
        onConfirmRename: handleRename,
        onCancelRename: () => setRename(null),
        onConfirmDelete: handleDelete,
        onCancelDelete: () => setDeleteTarget(null),
      }),
    ),
  )
}

function DetailPane(props) {
  const {
    t,
    lang,
    recording,
    transcript,
    jobs,
    busy,
    copied,
    formatAudio,
    onTranscribe,
    onRename,
    onDelete,
    onCopyPath,
    onToggleRaw,
    onReloadTranscript,
    rename,
    setRename,
    deleteTarget,
    onConfirmRename,
    onCancelRename,
    onConfirmDelete,
    onCancelDelete,
  } = props

  if (!recording) {
    return h(
      'div',
      { className: 'dsh-rec-detail' },
      h(Empty, { icon: 'file', title: t('library.detail.emptyTitle'), hint: t('library.detail.emptyHint') }),
    )
  }

  const job = jobs[recording.id]
  const isBusy = Boolean(busy[recording.id])
  const running = recording.transcriptStatus === 'running' || recording.transcriptStatus === 'queued'
  const progress = job && typeof job.progress === 'number' ? Math.round(job.progress * 100) : null
  const transcriptText = transcript.data?.text || ''
  const transcriptMarkdown = transcript.data?.markdown || ''
  const atPath = recording.transcriptPath || recording.audioPath

  return h(
    'div',
    { className: 'dsh-rec-detail' },
    h(
      'div',
      { className: 'dsh-rec-detail-head' },
      h(
        'div',
        { className: 'dsh-rec-detail-title-row' },
        h('div', { className: 'dsh-rec-detail-title' }, recording.title || recording.id),
        h(Badge, { kind: statusKind(recording.transcriptStatus) }, t(`status.${recording.transcriptStatus}`)),
      ),
      h(
        'div',
        { className: 'dsh-rec-row' },
        h(Btn, { size: 'sm', icon: 'copy', onClick: () => onCopyPath(recording, false), disabled: !atPath }, copied ? t('app.copied') : t('library.copyAtPath')),
        h(Btn, { size: 'sm', icon: 'edit', onClick: () => onRename(recording) }, t('app.rename')),
        h(Btn, { size: 'sm', icon: 'refresh', variant: 'primary', disabled: isBusy || running, onClick: () => onTranscribe(recording) }, recording.transcriptStatus === 'done' ? t('library.retranscribe') : t('library.transcribe')),
        h(
          'div',
          { className: 'dsh-rec-row-end' },
          deleteTarget && deleteTarget.id === recording.id
            ? [h(Btn, { key: 'no', size: 'sm', onClick: onCancelDelete }, t('app.cancel')), h(Btn, { key: 'yes', size: 'sm', variant: 'danger', disabled: isBusy, onClick: () => onConfirmDelete(recording) }, t('app.confirm'))]
            : h(Btn, { size: 'sm', variant: 'danger', icon: 'trash', onClick: () => onDelete(recording) }, t('app.delete')),
        ),
      ),
      deleteTarget && deleteTarget.id === recording.id
        ? h(Alert, { kind: 'warn', title: t('library.deleteConfirm', { title: recording.title || recording.id }) })
        : null,
      rename && rename.id === recording.id
        ? h(
            'div',
            { className: 'dsh-rec-row' },
            h(Input, {
              value: rename.value,
              autoFocus: true,
              placeholder: t('library.renamePlaceholder'),
              onChange: (event) => setRename({ ...rename, value: event.target.value }),
              onKeyDown: (event) => {
                if (event.key === 'Enter') onConfirmRename()
                if (event.key === 'Escape') onCancelRename()
              },
            }),
            h(Btn, { size: 'sm', variant: 'primary', disabled: isBusy || !rename.value.trim(), onClick: onConfirmRename }, t('app.save')),
            h(Btn, { size: 'sm', onClick: onCancelRename }, t('app.cancel')),
          )
        : null,
    ),
    h(
      'div',
      { className: 'dsh-rec-detail-scroll' },
      h(
        'div',
        { className: 'dsh-rec-field' },
        h('span', { className: 'dsh-rec-field-label' }, `${t('library.audio')} · ${formatAudio(recording)}`),
        h('audio', { className: 'dsh-rec-audio', controls: true, preload: 'metadata', src: AUDIO_URL(recording.id) }),
        h('span', { className: 'dsh-rec-field-hint' }, t('library.audioUnsupported')),
      ),
      h(
        'div',
        { className: 'dsh-rec-meta-grid' },
        metaItem(t('library.recordedAt'), formatDateTime(recording.recordedAt, lang)),
        metaItem(t('library.importedAt'), formatDateTime(recording.importedAt, lang)),
        metaItem(t('library.duration'), formatDuration(recording.durationMs)),
        metaItem(t('library.size'), formatBytes(recording.sizeBytes)),
        metaItem(t('library.format'), formatAudio(recording)),
        metaItem(t('library.source'), t(`source.${recording.source}`)),
        metaItem(t('library.provider'), recording.transcriptProvider || t('app.none')),
        metaItem('ID', recording.id),
        recording.deviceFileId != null ? metaItem('deviceFileId', String(recording.deviceFileId)) : null,
      ),
      h(
        'div',
        { className: 'dsh-rec-hintbox' },
        h(Icon, { name: 'info', size: 15 }),
        h(
          'div',
          null,
          h('div', null, t('library.copyAtHint')),
          atPath ? h('div', { className: 'dsh-rec-mono' }, atPath) : null,
          recording.transcriptPath
            ? h('div', null, h(Btn, { size: 'sm', variant: 'ghost', icon: 'copy', onClick: () => onCopyPath(recording, true) }, t('library.copyAudioPath')))
            : null,
        ),
      ),
      h(
        'div',
        { className: 'dsh-rec-transcript' },
        h(
          'div',
          { className: 'dsh-rec-transcript-head' },
          h(Icon, { name: 'file', size: 15 }),
          h('span', { className: 'dsh-rec-transcript-title' }, transcript.data?.path ? fileNameFromPath(transcript.data.path) : t('library.transcriptTitle')),
          transcript.data
            ? h(Btn, { size: 'sm', variant: 'ghost', onClick: onToggleRaw }, transcript.showRaw ? t('library.transcriptShowText') : t('library.transcriptShowRaw'))
            : null,
          transcript.data?.path
            ? h(Btn, { size: 'sm', variant: 'ghost', icon: 'copy', onClick: () => onCopyPath(recording, false) }, t('app.copy'))
            : null,
        ),
        h(
          'div',
          { style: { padding: '10px 12px' } },
          running
            ? h(
                'div',
                { className: 'dsh-rec-stack', style: { gap: '8px' } },
                h(
                  'div',
                  { className: 'dsh-rec-row' },
                  h(Spinner),
                  h('span', { className: 'dsh-rec-subtle' }, job && progress != null ? t('library.transcriptRunning', { progress }) : t('app.loading')),
                ),
                h(Progress, { value: progress == null ? 8 : progress }),
              )
            : recording.transcriptStatus === 'failed'
              ? h(Alert, { kind: 'error', title: recording.transcriptError || t('status.failed') })
              : transcript.loading
                ? h(Empty, { icon: 'file', title: t('library.transcriptLoading') })
                : transcript.error
                  ? h(Alert, {
                      kind: 'error',
                      title: t('library.transcriptError', { error: transcript.error }),
                      action: h(Btn, { size: 'sm', onClick: onReloadTranscript }, t('app.retry')),
                    })
                  : transcript.data && (transcriptText || transcriptMarkdown)
                    ? h('pre', { className: 'dsh-rec-transcript-body', style: { border: 'none', padding: 0, background: 'transparent' } }, transcript.showRaw ? transcriptMarkdown : transcriptText)
                    : h('span', { className: 'dsh-rec-subtle' }, t('library.transcriptEmpty')),
        ),
      ),
    ),
  )
}

function metaItem(label, value) {
  return h(
    'div',
    { className: 'dsh-rec-meta-item', key: label },
    h('div', { className: 'dsh-rec-meta-label' }, label),
    h('div', { className: 'dsh-rec-meta-value' }, value),
  )
}
