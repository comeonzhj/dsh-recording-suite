/**
 * Watch page: LAN import endpoint information for the iPhone companion plus the
 * Apple Watch recordings already imported.
 */
import { createElement as h, useCallback, useEffect, useRef, useState } from 'react'

import { api } from '../api.js'
import { formatDateTime, formatDuration, maskToken } from '../format.js'
import { Alert, Badge, Btn, Empty, Spinner, useCopy, usePanel } from './ui.js'
import { Icon } from './icons.js'

export function WatchPage() {
  const { t, lang, notify } = usePanel()
  const [status, setStatus] = useState(null)
  const [recordings, setRecordings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rotating, setRotating] = useState(false)
  const [confirmRotate, setConfirmRotate] = useState(false)
  const [copiedField, setCopiedField] = useState(null)
  const { copy } = useCopy(t)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statusData, listData] = await Promise.all([api.status(), api.list()])
      if (!alive.current) return
      setStatus(statusData)
      const all = Array.isArray(listData?.recordings) ? listData.recordings : []
      setRecordings(all.filter((item) => item.source === 'apple-watch'))
    } catch (loadError) {
      if (alive.current) setError(loadError.message || String(loadError))
    } finally {
      if (alive.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleCopy = async (field, text, messageKey) => {
    const message = await copy(text, messageKey)
    if (message) {
      setCopiedField(field)
      notify(message)
      setTimeout(() => {
        if (alive.current) setCopiedField(null)
      }, 1800)
    }
  }

  const rotate = async () => {
    setRotating(true)
    setError(null)
    try {
      const data = await api.rotateToken()
      if (!alive.current) return
      setStatus((previous) =>
        previous ? { ...previous, watchImport: { ...(previous.watchImport || {}), token: data?.token || previous.watchImport?.token } } : previous,
      )
      setConfirmRotate(false)
      notify(t('watch.rotated'))
    } catch (rotateError) {
      setError(t('watch.error.rotateFailed', { error: rotateError.message || String(rotateError) }))
    } finally {
      if (alive.current) setRotating(false)
    }
  }

  const watchImport = status?.watchImport || null
  const urls = Array.isArray(watchImport?.urls) ? watchImport.urls : []
  const token = watchImport?.token || ''
  const enabled = Boolean(watchImport?.enabled)

  return h(
    'div',
    { className: 'dsh-rec-stack' },
    h(
      'div',
      { className: 'dsh-rec-row' },
      h(
        'div',
        null,
        h('h2', { className: 'dsh-rec-card-title' }, h(Icon, { name: 'watch', size: 17 }), t('watch.title')),
        h('p', { className: 'dsh-rec-subtle' }, t('watch.hint')),
      ),
      h(
        'div',
        { className: 'dsh-rec-row dsh-rec-row-end' },
        h(Badge, { kind: enabled ? 'done' : 'failed' }, enabled ? t('app.yes') : t('app.no')),
        h(Btn, { size: 'sm', icon: 'refresh', onClick: load, disabled: loading }, t('app.refresh')),
      ),
    ),

    error ? h(Alert, { kind: 'error', title: error }) : null,

    loading && !status
      ? h('div', { className: 'dsh-rec-card' }, h(Empty, { icon: 'wave', title: t('app.loading') }))
      : !enabled
        ? h(Alert, { kind: 'warn', title: t('watch.status.unavailable') })
        : h(
            'div',
            { className: 'dsh-rec-card' },
            h(
              'div',
              { className: 'dsh-rec-card-head' },
              h('span', { className: 'dsh-rec-card-title' }, h(Icon, { name: 'plug', size: 16 }), t('watch.status.title')),
              h(Badge, null, `:${watchImport?.port ?? '—'}`),
              h(Badge, null, `UDP :${watchImport?.beaconPort ?? '—'}`),
            ),
            h(
              'div',
              { className: 'dsh-rec-stack', style: { gap: '12px' } },
              h(
                'div',
                { className: 'dsh-rec-field' },
                h('span', { className: 'dsh-rec-field-label' }, t('watch.urls')),
                urls.length === 0
                  ? h('span', { className: 'dsh-rec-field-hint' }, t('watch.urls.empty'))
                  : urls.map((url) =>
                      h(
                        'div',
                        { className: 'dsh-rec-copy-line', key: url },
                        h('input', { className: 'dsh-rec-input dsh-rec-mono', readOnly: true, value: url, 'aria-label': t('watch.urls') }),
                        h(
                          Btn,
                          { size: 'sm', icon: 'copy', onClick: () => handleCopy(url, url, t('watch.urlCopied')) },
                          copiedField === url ? t('app.copied') : t('app.copy'),
                        ),
                      ),
                    ),
              ),
              h(
                'div',
                { className: 'dsh-rec-field' },
                h('span', { className: 'dsh-rec-field-label' }, t('watch.token')),
                h(
                  'div',
                  { className: 'dsh-rec-copy-line' },
                  h('input', { className: 'dsh-rec-input dsh-rec-mono', readOnly: true, value: maskToken(token), 'aria-label': t('watch.token') }),
                  h(Btn, { size: 'sm', icon: 'copy', disabled: !token, onClick: () => handleCopy('token', token, t('watch.tokenCopied')) }, copiedField === 'token' ? t('app.copied') : t('app.copy')),
                ),
                h('span', { className: 'dsh-rec-field-hint' }, t('watch.tokenHidden')),
              ),
              h(
                'div',
                { className: 'dsh-rec-row' },
                confirmRotate
                  ? [
                      h('span', { key: 'q', className: 'dsh-rec-subtle' }, t('watch.rotateConfirm')),
                      h(Btn, { key: 'cancel', size: 'sm', disabled: rotating, onClick: () => setConfirmRotate(false) }, t('app.cancel')),
                      h(Btn, { key: 'confirm', size: 'sm', variant: 'danger', disabled: rotating, onClick: rotate }, rotating ? [h(Spinner, { key: 's' }), t('app.loading')] : t('app.confirm')),
                    ]
                  : h(Btn, { size: 'sm', icon: 'refresh', variant: 'danger', onClick: () => setConfirmRotate(true) }, t('watch.rotate')),
              ),
            ),
          ),

    h(
      'div',
      { className: 'dsh-rec-card' },
      h('div', { className: 'dsh-rec-card-head' }, h('span', { className: 'dsh-rec-card-title' }, h(Icon, { name: 'info', size: 16 }), t('watch.udp.title'))),
      h('p', { className: 'dsh-rec-subtle' }, t('watch.udp.hint')),
    ),

    h(
      'div',
      { className: 'dsh-rec-card' },
      h(
        'div',
        { className: 'dsh-rec-card-head' },
        h('span', { className: 'dsh-rec-card-title' }, h(Icon, { name: 'watch', size: 16 }), t('watch.list.title')),
        h(Badge, null, t('app.count', { count: recordings.length })),
      ),
      recordings.length === 0
        ? h(Empty, { icon: 'watch', title: t('watch.list.empty') })
        : h(
            'div',
            { className: 'dsh-rec-stack', style: { gap: '6px' } },
            recordings.map((recording) =>
              h(
                'div',
                { key: recording.id, className: 'dsh-rec-row', style: { padding: '7px 9px', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: '9px' } },
                h(Icon, { name: 'watch', size: 15 }),
                h('span', { style: { flex: '1 1 200px', minWidth: 0, overflowWrap: 'anywhere' } }, recording.title || recording.id),
                h(Badge, { kind: recording.transcriptStatus === 'done' ? 'done' : recording.transcriptStatus === 'failed' ? 'failed' : recording.transcriptStatus === 'running' ? 'running' : '' }, t(`status.${recording.transcriptStatus}`)),
                h('span', { className: 'dsh-rec-subtle' }, formatDateTime(recording.recordedAt, lang)),
                h('span', { className: 'dsh-rec-subtle' }, formatDuration(recording.durationMs)),
              ),
            ),
          ),
    ),
  )
}
