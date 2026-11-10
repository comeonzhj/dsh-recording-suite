/**
 * Recorder page: the soundcore Work / D3200.
 *
 * Every device operation goes through the Host's native CoreBluetooth bridge;
 * there is no browser Web Bluetooth path (the DSH desktop window cannot show a
 * device chooser, and the bridge is what makes the feature All-in-One).
 */
import { createElement as h, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'

import { api } from '../api.js'
import { NativeD3200Client, DISCOVERY_MODE, nativeErrorText } from '../nativeD3200Client.js'
import { formatBytes, formatDateTime, formatDuration, recordedAtFromFileId } from '../format.js'
import { Alert, Badge, Btn, Empty, Progress, Spinner, usePanel } from './ui.js'
import { Icon } from './icons.js'

export function BeanPage() {
  const { t, lang, notify } = usePanel()
  const [autoTranscribe, setAutoTranscribe] = useState(true)
  const [selected, setSelected] = useState(() => new Set())
  const [actionError, setActionError] = useState(null)
  const [batch, setBatch] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [connectingMode, setConnectingMode] = useState(null)
  const [ownBusy, setOwnBusy] = useState(null)
  const [nativeInfo, setNativeInfo] = useState(null)
  const batchRef = useRef(null)

  const nativeRef = useRef(null)
  const client = useMemo(() => {
    if (!nativeRef.current) nativeRef.current = new NativeD3200Client()
    return nativeRef.current
  }, [])

  // The Host is the authority on native availability (macOS + Swift toolchain).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let status = null
      try {
        status = await api.deviceStatus()
      } catch {
        status = null
      }
      if (cancelled || !status || typeof status.available !== 'boolean') return
      setNativeInfo({
        available: status.available,
        reason: typeof status.reason === 'string' ? status.reason : null,
        platform: typeof status.platform === 'string' ? status.platform : null,
      })
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const subscribe = useCallback((onChange) => client.subscribe(onChange), [client])
  const getSnapshot = useCallback(() => client.snapshot(), [client])
  const device = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  useEffect(() => () => nativeRef.current?.dispose(), [])

  const localizeError = useCallback((error) => nativeErrorText(t, error), [t])

  const connected = Boolean(device.connected)
  const supported = Boolean(device.supported)
  const nativeBlocked = nativeInfo != null && nativeInfo.available === false
  const canConnect = supported && !nativeBlocked
  const files = device.files || []

  const fileList = useMemo(() => files.slice().sort((a, b) => b.fileId - a.fileId), [files])
  const selectedIds = useMemo(() => fileList.filter((file) => selected.has(file.fileId)).map((file) => file.fileId), [fileList, selected])

  const removeSelection = useCallback((fileId) => {
    setSelected((previous) => {
      if (!previous.has(fileId)) return previous
      const next = new Set(previous)
      next.delete(fileId)
      return next
    })
  }, [])

  const toggleSelect = (fileId) => {
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(fileId)) next.delete(fileId)
      else next.add(fileId)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelected((previous) => {
      if (fileList.length > 0 && fileList.every((file) => previous.has(file.fileId))) return new Set()
      return new Set(fileList.map((file) => file.fileId))
    })
  }

  const connect = async (mode) => {
    setConnectingMode(mode)
    setActionError(null)
    try {
      await client.connect({ discoveryMode: mode })
    } catch (error) {
      setActionError(localizeError(error))
    } finally {
      setConnectingMode(null)
    }
  }

  const disconnect = () => {
    client.disconnect()
    setActionError(null)
  }

  const refresh = async () => {
    setOwnBusy('refresh')
    setActionError(null)
    try {
      await client.refresh()
    } catch (error) {
      setActionError(t('bean.error.refresh_failed', { error: localizeError(error) }))
    } finally {
      setOwnBusy(null)
    }
  }

  const recordAction = async (kind) => {
    setOwnBusy(kind)
    setActionError(null)
    try {
      if (kind === 'start') await client.startRecording()
      else await client.pauseRecording()
    } catch (error) {
      setActionError(t('bean.error.device_action_failed', { error: localizeError(error) }))
    } finally {
      setOwnBusy(null)
    }
  }

  // The Host decrypts, muxes and imports the recording, so nothing else to do.
  const importOne = async (file) => {
    const recordedAt = recordedAtFromFileId(file.fileId)
    const title = t('bean.importTitle', { time: formatDateTime(recordedAt || Date.now(), lang) })
    return client.exportRecording(file.fileId, { autoTranscribe, title, recordedAt })
  }

  const runBatch = async (ids) => {
    if (batchRef.current || ids.length === 0) return
    const job = { active: true, total: ids.length, current: 0, phase: 'exporting', done: 0, failed: 0, errors: [] }
    batchRef.current = job
    setBatch({ ...job })
    setActionError(null)
    for (let index = 0; index < ids.length; index += 1) {
      const fileId = ids[index]
      job.current = index + 1
      job.phase = 'exporting'
      setBatch({ ...job })
      try {
        await importOne(fileList.find((entry) => entry.fileId === fileId) || { fileId })
        job.done += 1
        removeSelection(fileId)
      } catch (error) {
        job.failed += 1
        job.errors.push(
          t('bean.error.import_failed', {
            id: fileId,
            error: error && error.code ? localizeError(error) : error.message || String(error),
          }),
        )
      }
      setBatch({ ...job })
    }
    job.active = false
    batchRef.current = null
    setBatch({ ...job })
    notify(t('bean.export.done', { done: job.done, failed: job.failed }))
  }

  const importSingle = async (file) => {
    if (batchRef.current) return
    setOwnBusy(`import-${file.fileId}`)
    setActionError(null)
    try {
      batchRef.current = { active: true }
      await importOne(file)
      notify(t('bean.imported'))
      removeSelection(file.fileId)
    } catch (error) {
      setActionError(
        t('bean.error.import_failed', {
          id: file.fileId,
          error: error && error.code ? nativeErrorText(t, error) : error.message || String(error),
        }),
      )
    } finally {
      batchRef.current = null
      setOwnBusy(null)
    }
  }

  const deleteFile = async (fileId) => {
    setDeleting(fileId)
    setActionError(null)
    try {
      await client.deleteRecording(fileId)
      removeSelection(fileId)
      setDeleteTarget(null)
      notify(t('bean.toast.deleted', { fileId }))
    } catch (error) {
      setActionError(localizeError(error))
    } finally {
      setDeleting(null)
    }
  }

  const recordStatusKey = device.recordStatus === 1 ? 'bean.record.recording' : device.recordStatus === 2 ? 'bean.record.paused' : 'bean.record.stopped'
  const recording = device.recordStatus === 1
  const exportProgress = device.export && device.export.status === 'downloading' ? device.export.progress : null

  return h(
    'div',
    { className: 'dsh-rec-stack' },
    h(
      'div',
      { className: 'dsh-rec-row' },
      h(
        'div',
        null,
        h('h2', { className: 'dsh-rec-card-title' }, h(Icon, { name: 'bean', size: 17 }), t('bean.title')),
        h('p', { className: 'dsh-rec-subtle' }, t('bean.native.hint')),
      ),
      h(
        'div',
        { className: 'dsh-rec-row dsh-rec-row-end' },
        h(Badge, { kind: canConnect ? 'done' : 'failed' }, t('bean.transport.native')),
        h(Badge, { kind: connected ? 'done' : '' }, connected ? t('bean.connected') : t('bean.disconnected')),
      ),
    ),

    nativeBlocked
      ? h(
          Alert,
          { kind: 'warn', title: t('bean.native.unavailable.title') },
          h(
            'div',
            { className: 'dsh-rec-stack', style: { gap: '8px' } },
            t('bean.native.unavailable.hint'),
            nativeInfo.reason ? h('span', { className: 'dsh-rec-subtle' }, t('bean.native.reason', { reason: nativeInfo.reason })) : null,
          ),
        )
      : null,
    actionError
      ? h(Alert, { kind: 'error', title: actionError, action: h(Btn, { size: 'sm', variant: 'ghost', icon: 'x', onClick: () => setActionError(null) }, t('app.close')) })
      : null,

    h(
      'div',
      { className: 'dsh-rec-card' },
      h(
        'div',
        { className: 'dsh-rec-card-head' },
        h('span', { className: 'dsh-rec-card-title' }, h(Icon, { name: 'plug', size: 16 }), connected ? device.deviceName || t('bean.device') : t('bean.connect')),
        connected
          ? h('div', { className: 'dsh-rec-row dsh-rec-row-end' },
              h(Btn, { size: 'sm', icon: 'refresh', onClick: refresh, disabled: ownBusy === 'refresh' }, t('bean.refresh')),
              h(Btn, { size: 'sm', variant: 'danger', icon: 'x', onClick: disconnect }, t('bean.disconnect')),
            )
          : h('div', { className: 'dsh-rec-row dsh-rec-row-end' },
              h(Btn, { size: 'sm', variant: 'primary', icon: 'bluetooth', disabled: !canConnect || Boolean(connectingMode), onClick: () => connect(DISCOVERY_MODE.precise) },
                connectingMode === DISCOVERY_MODE.precise ? [h(Spinner, { key: 's' }), t('bean.connecting')] : t('bean.connectPrecise')),
              h(Btn, { size: 'sm', disabled: !canConnect || Boolean(connectingMode), onClick: () => connect(DISCOVERY_MODE.all) }, t('bean.connectAll')),
            ),
      ),
      h(
        'div',
        { className: 'dsh-rec-meta-grid' },
        meta(
          t('bean.native.ready'),
          h(Badge, { kind: 'done' }, t('bean.native.managedByHost')),
        ),
        meta(t('bean.battery'), device.device?.battery != null ? `${device.device.battery}%` : '—'),
        meta(t('bean.boxBattery'), device.device?.boxBattery != null ? `${device.device.boxBattery}%` : '—'),
        meta(t('bean.charging'), device.device?.charging ? t('app.yes') : device.device?.charging === false ? t('app.no') : '—'),
        meta(t('bean.firmware'), device.device?.firmwareVersion || '—'),
        meta(t('bean.serial'), device.device?.serialNumber || '—'),
        meta(
          t('bean.storage'),
          device.device?.totalMemoryKb
            ? t('bean.storageValue', {
                free: formatBytes(Number(device.device.freeMemoryKb || 0) * 1024),
                total: formatBytes(Number(device.device.totalMemoryKb) * 1024),
              })
            : '—',
        ),
        meta(t('bean.recordStatus'), h(Badge, { kind: recording ? 'done' : device.recordStatus === 2 ? 'queued' : '' }, t(recordStatusKey))),
      ),
      connected
        ? h(
            'div',
            { className: 'dsh-rec-row', style: { marginTop: '12px' } },
            h(Btn, { size: 'sm', variant: 'primary', icon: 'mic', disabled: Boolean(ownBusy) || recording, onClick: () => recordAction('start') }, device.recordStatus === 2 ? t('bean.resumeRecording') : t('bean.startRecording')),
            h(Btn, { size: 'sm', icon: 'pause', disabled: Boolean(ownBusy) || !recording, onClick: () => recordAction('pause') }, t('bean.pauseRecording')),
            h('span', { className: 'dsh-rec-subtle' }, t('bean.native.permissionHint')),
          )
        : null,
    ),

    connected
      ? h(
          'div',
          { className: 'dsh-rec-card' },
          h(
            'div',
            { className: 'dsh-rec-card-head' },
            h('span', { className: 'dsh-rec-card-title' }, h(Icon, { name: 'library', size: 16 }), t('bean.files.title')),
            h(Badge, null, t('bean.files.count', { count: fileList.length })),
            h(Badge, null, t('bean.files.viaNative')),
            h(
              'div',
              { className: 'dsh-rec-row dsh-rec-row-end' },
              h('label', { className: 'dsh-rec-check' }, h('input', { type: 'checkbox', checked: autoTranscribe, onChange: (event) => setAutoTranscribe(event.target.checked) }), t('bean.autoTranscribe')),
              h(Btn, { size: 'sm', onClick: toggleSelectAll, disabled: fileList.length === 0 }, selectedIds.length > 0 ? t('bean.files.clearSelection') : t('bean.files.selectAll')),
              h(Btn, { size: 'sm', variant: 'primary', icon: 'download', disabled: fileList.length === 0 || selectedIds.length === 0 || Boolean(batch && batch.active), onClick: () => runBatch(selectedIds) }, t('bean.export.start', { count: selectedIds.length })),
            ),
          ),
          fileList.length === 0
            ? h(Empty, { icon: 'mic', title: t('bean.files.empty') })
            : h(
                'div',
                { style: { overflowX: 'auto' } },
                h(
                  'table',
                  { className: 'dsh-rec-table' },
                  h(
                    'thead',
                    null,
                    h(
                      'tr',
                      null,
                      h('th', { style: { width: '28px' } }),
                      h('th', null, t('library.recordedAt')),
                      h('th', null, t('library.duration')),
                      h('th', null, t('library.size')),
                      h('th', null, t('bean.selectedFile')),
                      h('th', { className: 'is-actions' }, ''),
                    ),
                  ),
                  h(
                    'tbody',
                    null,
                    fileList.map((file) => {
                      const recordedAt = recordedAtFromFileId(file.fileId)
                      const busyRow = ownBusy === `import-${file.fileId}` || deleting === file.fileId
                      return h(
                        'tr',
                        { key: file.fileId, className: busyRow ? 'dsh-rec-file-row is-busy' : 'dsh-rec-file-row' },
                        h('td', null, h('input', { type: 'checkbox', checked: selected.has(file.fileId), onChange: () => toggleSelect(file.fileId), 'aria-label': String(file.fileId) })),
                        h('td', null, recordedAt ? formatDateTime(recordedAt, lang) : String(file.fileId)),
                        h('td', { className: 'is-num' }, formatDuration(file.estimatedDurationMs)),
                        h('td', { className: 'is-num' }, formatBytes(file.sizeBytes)),
                        h('td', { className: 'dsh-rec-mono' }, String(file.fileId)),
                        h(
                          'td',
                          { className: 'is-actions' },
                          h(
                            'div',
                            { className: 'dsh-rec-row', style: { justifyContent: 'flex-end', gap: '5px' } },
                            h(Btn, { size: 'sm', icon: 'download', disabled: Boolean(batch && batch.active) || busyRow, onClick: () => importSingle(file) }, t('bean.export.single')),
                            deleteTarget === file.fileId
                              ? [
                                  h(Btn, { key: 'cancel', size: 'sm', disabled: deleting === file.fileId, onClick: () => setDeleteTarget(null) }, t('app.cancel')),
                                  h(Btn, { key: 'confirm', size: 'sm', variant: 'danger', disabled: deleting === file.fileId, onClick: () => deleteFile(file.fileId) }, deleting === file.fileId ? t('bean.deleteBusy') : t('app.confirm')),
                                ]
                              : h(Btn, { size: 'sm', variant: 'danger', icon: 'trash', disabled: busyRow, onClick: () => setDeleteTarget(file.fileId) }, ''),
                          ),
                        ),
                      )
                    }),
                  ),
                ),
              ),
          batch
            ? h(
                'div',
                { className: 'dsh-rec-stack', style: { marginTop: '12px', gap: '8px' } },
                h(
                  'div',
                  { className: 'dsh-rec-row' },
                  batch.active ? h(Spinner) : null,
                  h(
                    'span',
                    { className: 'dsh-rec-subtle' },
                    batch.active
                      ? batch.phase === 'importing'
                        ? t('bean.export.importing', { current: batch.current, total: batch.total })
                        : t('bean.export.exporting', { current: batch.current, total: batch.total })
                      : t('bean.export.done', { done: batch.done, failed: batch.failed }),
                  ),
                ),
                h(Progress, {
                  value: exportProgress != null ? exportProgress : batch.active ? Math.round(((batch.current - 1) / Math.max(batch.total, 1)) * 100) : 100,
                  label: exportProgress != null ? `${exportProgress}%` : null,
                }),
                batch.errors && batch.errors.length
                  ? h(Alert, { kind: 'warn', title: batch.errors[0] }, batch.errors.length > 1 ? `${batch.errors.length} errors` : null)
                  : null,
              )
            : null,
        )
      : supported
        ? h(
            'div',
            { className: 'dsh-rec-card' },
            h(Empty, {
              icon: 'bluetooth',
              title: t('bean.disconnected'),
              hint: t('bean.permission.hint'),
            }),
          )
        : null,

    h(
      'div',
      { className: 'dsh-rec-card' },
      h('div', { className: 'dsh-rec-card-head' }, h('span', { className: 'dsh-rec-card-title' }, h(Icon, { name: 'info', size: 16 }), t('bean.log.title'))),
      device.logs.length === 0
        ? h('span', { className: 'dsh-rec-subtle' }, t('bean.log.empty'))
        : h(
            'div',
            { className: 'dsh-rec-log' },
            device.logs
              .slice()
              .reverse()
              .slice(0, 24)
              .map((log, index) =>
                h(
                  'div',
                  { key: `${log.time}-${index}`, className: `dsh-rec-log-line${log.level === 'error' ? ' is-error' : ''}` },
                  h('span', { className: 'dsh-rec-log-time' }, String(log.time || '').slice(11, 19)),
                  h('span', null, renderLog(t, log)),
                ),
              ),
          ),
    ),
  )
}

function renderLog(t, log) {
  const params = { ...(log.params || {}) }
  if (params.errorKey) params.error = t(`bean.error.${params.errorKey}`)
  if (params.labelKey) params.label = t(params.labelKey, params.labelParams || {})
  try {
    return t(log.key, params)
  } catch {
    return log.key
  }
}

function meta(label, value) {
  return h(
    'div',
    { className: 'dsh-rec-meta-item', key: label },
    h('div', { className: 'dsh-rec-meta-label' }, label),
    h('div', { className: 'dsh-rec-meta-value' }, value),
  )
}
