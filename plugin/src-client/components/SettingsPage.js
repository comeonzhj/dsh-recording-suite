/**
 * Settings page: transcription provider, language, OpenAI-compatible options,
 * storage location, and watch import receiver. Saving goes through
 * `POST /api/recording/config`; the Host restarts the plugin, so the page polls
 * `/status` until it recovers.
 */
import { createElement as h, useCallback, useEffect, useRef, useState } from 'react'

import { api } from '../api.js'
import { Alert, Badge, Btn, Input, Select, Spinner, usePanel } from './ui.js'
import { Icon } from './icons.js'

const PROVIDERS = [
  { value: 'apple', labelKey: 'settings.provider.apple', descKey: 'settings.provider.appleDesc' },
  { value: 'openai', labelKey: 'settings.provider.openai', descKey: 'settings.provider.openaiDesc' },
  { value: 'none', labelKey: 'settings.provider.none', descKey: 'settings.provider.noneDesc' },
]

function emptyForm() {
  return {
    provider: 'apple',
    language: '',
    baseUrl: '',
    model: '',
    apiKey: '',
    hasApiKey: false,
    storageDir: '',
    watchEnabled: true,
    watchPort: 47831,
  }
}

function formFromConfig(config, status) {
  return {
    provider: config?.provider || 'apple',
    language: config?.language || '',
    baseUrl: config?.openai?.baseUrl || '',
    model: config?.openai?.model || '',
    apiKey: '',
    hasApiKey: Boolean(config?.openai?.hasApiKey),
    storageDir: config?.storageDir || status?.storageDir || '',
    watchEnabled: config?.watchImport?.enabled !== false,
    watchPort: Number(config?.watchImport?.port || 47831),
  }
}

export function SettingsPage() {
  const { t, notify } = usePanel()
  const [form, setForm] = useState(emptyForm)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [restartPhase, setRestartPhase] = useState(null)
  const alive = useRef(true)
  const pollTimer = useRef(null)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (pollTimer.current) clearTimeout(pollTimer.current)
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [config, statusData] = await Promise.all([api.getConfig(), api.status()])
      if (!alive.current) return
      setForm(formFromConfig(config, statusData))
      setStatus(statusData)
    } catch (loadError) {
      if (alive.current) setError(t('settings.error.load', { error: loadError.message || String(loadError) }))
    } finally {
      if (alive.current) setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const update = (patch) => setForm((previous) => ({ ...previous, ...patch }))

  const waitForRestart = useCallback(() => {
    setRestartPhase('restarting')
    const deadline = Date.now() + 30000
    const poll = async () => {
      if (!alive.current) return
      try {
        const statusData = await api.status()
        if (!alive.current) return
        setStatus(statusData)
        setRestartPhase('done')
        notify(t('settings.restartDone'))
      } catch {
        if (!alive.current) return
        if (Date.now() > deadline) {
          setRestartPhase(null)
          setError(t('settings.error.load', { error: 'timeout' }))
          return
        }
        pollTimer.current = setTimeout(poll, 900)
      }
    }
    pollTimer.current = setTimeout(poll, 900)
  }, [notify, t])

  const save = async () => {
    const port = Number(form.watchPort)
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      setError(t('settings.error.port'))
      return
    }
    setSaving(true)
    setError(null)
    setRestartPhase(null)
    try {
      const payload = {
        provider: form.provider,
        language: form.language.trim(),
        openai: {
          baseUrl: form.baseUrl.trim(),
          model: form.model.trim(),
          ...(form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {}),
        },
        storageDir: form.storageDir,
        watchImport: { enabled: Boolean(form.watchEnabled), port },
      }
      await api.saveConfig(payload)
      if (!alive.current) return
      setSaving(false)
      setForm((previous) => ({ ...previous, apiKey: '', hasApiKey: previous.hasApiKey || Boolean(payload.openai.apiKey) }))
      waitForRestart()
    } catch (saveError) {
      if (!alive.current) return
      setError(t('settings.error.save', { error: saveError.message || String(saveError) }))
      setSaving(false)
    }
  }

  const appleSpeech = status?.appleSpeech || null
  const provider = PROVIDERS.find((item) => item.value === form.provider) || PROVIDERS[0]

  return h(
    'div',
    { className: 'dsh-rec-stack' },
    h(
      'div',
      { className: 'dsh-rec-row' },
      h(
        'div',
        null,
        h('h2', { className: 'dsh-rec-card-title' }, h(Icon, { name: 'settings', size: 17 }), t('settings.title')),
        h('p', { className: 'dsh-rec-subtle' }, t('settings.hint')),
      ),
      h(
        'div',
        { className: 'dsh-rec-row dsh-rec-row-end' },
        status?.counts
          ? h(Badge, null, t('settings.counts', { recordings: status.counts.recordings ?? 0, transcribed: status.counts.transcribed ?? 0 }))
          : null,
        h(Btn, { size: 'sm', icon: 'refresh', onClick: load, disabled: loading }, t('app.refresh')),
      ),
    ),

    error ? h(Alert, { kind: 'error', title: error }) : null,
    restartPhase === 'restarting' ? h(Alert, { kind: 'info', title: t('settings.savedRestarting'), action: h(Spinner) }) : null,
    restartPhase === 'done' ? h(Alert, { kind: 'success', title: t('settings.restartDone') }) : null,

    loading && !status
      ? h('div', { className: 'dsh-rec-card' }, h('div', { className: 'dsh-rec-row' }, h(Spinner), t('app.loading')))
      : h(
          'div',
          { className: 'dsh-rec-settings' },
          h(
            'div',
            { className: 'dsh-rec-card' },
            h('div', { className: 'dsh-rec-card-head' }, h('span', { className: 'dsh-rec-card-title' }, h(Icon, { name: 'wave', size: 16 }), t('settings.provider'))),
            h(
              'div',
              { className: 'dsh-rec-stack', style: { gap: '12px' } },
              h(
                'div',
                { className: 'dsh-rec-field' },
                h(
                  Select,
                  { value: form.provider, onChange: (event) => update({ provider: event.target.value }), 'aria-label': t('settings.provider') },
                  PROVIDERS.map((item) => h('option', { key: item.value, value: item.value }, t(item.labelKey))),
                ),
                h('span', { className: 'dsh-rec-field-hint' }, t(provider.descKey)),
              ),
              h(
                'div',
                { className: 'dsh-rec-form-row' },
                h(
                  'label',
                  { className: 'dsh-rec-field' },
                  h('span', { className: 'dsh-rec-field-label' }, t('settings.language')),
                  h(Input, { value: form.language, placeholder: 'zh-CN', onChange: (event) => update({ language: event.target.value }) }),
                  h('span', { className: 'dsh-rec-field-hint' }, t('settings.languageHint')),
                ),
                h(
                  'div',
                  { className: 'dsh-rec-field' },
                  h('span', { className: 'dsh-rec-field-label' }, t('settings.appleSpeech')),
                  h(
                    'div',
                    { className: 'dsh-rec-row' },
                    h(Badge, { kind: appleSpeech?.available ? 'done' : appleSpeech ? 'failed' : '' }, appleSpeech ? (appleSpeech.available ? t('settings.appleSpeechAvailable') : t('settings.appleSpeechUnavailable')) : '—'),
                    appleSpeech?.reason ? h('span', { className: 'dsh-rec-subtle', style: { overflowWrap: 'anywhere' } }, `${t('settings.appleSpeechReason')}: ${appleSpeech.reason}`) : null,
                  ),
                ),
              ),
            ),
          ),

          form.provider === 'openai'
            ? h(
                'div',
                { className: 'dsh-rec-card' },
                h('div', { className: 'dsh-rec-card-head' }, h('span', { className: 'dsh-rec-card-title' }, h(Icon, { name: 'plug', size: 16 }), t('settings.provider.openai'))),
                h(
                  'div',
                  { className: 'dsh-rec-stack', style: { gap: '12px' } },
                  h(
                    'div',
                    { className: 'dsh-rec-form-row' },
                    h(
                      'label',
                      { className: 'dsh-rec-field' },
                      h('span', { className: 'dsh-rec-field-label' }, t('settings.openai.baseUrl')),
                      h(Input, { value: form.baseUrl, placeholder: 'https://api.openai.com/v1', onChange: (event) => update({ baseUrl: event.target.value }) }),
                    ),
                    h(
                      'label',
                      { className: 'dsh-rec-field' },
                      h('span', { className: 'dsh-rec-field-label' }, t('settings.openai.model')),
                      h(Input, { value: form.model, placeholder: 'whisper-1', onChange: (event) => update({ model: event.target.value }) }),
                    ),
                  ),
                  h(
                    'label',
                    { className: 'dsh-rec-field' },
                    h(
                      'span',
                      { className: 'dsh-rec-field-label' },
                      t('settings.openai.apiKey'),
                      form.hasApiKey ? h(Badge, { kind: 'done' }, t('settings.openai.apiKeySaved')) : null,
                    ),
                    h(Input, {
                      type: 'password',
                      autoComplete: 'off',
                      value: form.apiKey,
                      placeholder: t('settings.openai.apiKeyPlaceholder'),
                      onChange: (event) => update({ apiKey: event.target.value }),
                    }),
                  ),
                ),
              )
            : null,

          h(
            'div',
            { className: 'dsh-rec-card' },
            h('div', { className: 'dsh-rec-card-head' }, h('span', { className: 'dsh-rec-card-title' }, h(Icon, { name: 'file', size: 16 }), t('settings.storageDir'))),
            h(
              'div',
              { className: 'dsh-rec-stack', style: { gap: '8px' } },
              h('input', { className: 'dsh-rec-input dsh-rec-mono', readOnly: true, value: form.storageDir || '—' }),
              h('span', { className: 'dsh-rec-field-hint' }, t('settings.storageDirHint')),
            ),
          ),

          h(
            'div',
            { className: 'dsh-rec-card' },
            h('div', { className: 'dsh-rec-card-head' }, h('span', { className: 'dsh-rec-card-title' }, h(Icon, { name: 'watch', size: 16 }), t('watch.status.title'))),
            h(
              'div',
              { className: 'dsh-rec-form-row' },
              h(
                'label',
                { className: 'dsh-rec-check', style: { alignSelf: 'center' } },
                h('input', { type: 'checkbox', checked: form.watchEnabled, onChange: (event) => update({ watchEnabled: event.target.checked }) }),
                t('settings.watch.enabled'),
              ),
              h(
                'label',
                { className: 'dsh-rec-field' },
                h('span', { className: 'dsh-rec-field-label' }, t('settings.watch.port')),
                h(Input, {
                  type: 'number',
                  min: 1,
                  max: 65535,
                  value: form.watchPort,
                  onChange: (event) => update({ watchPort: event.target.value }),
                }),
                h('span', { className: 'dsh-rec-field-hint' }, t('settings.watch.portHint')),
              ),
            ),
          ),

          h(
            'div',
            { className: 'dsh-rec-row' },
            h(Btn, { variant: 'primary', icon: 'check', onClick: save, disabled: saving || Boolean(restartPhase) }, saving ? [h(Spinner, { key: 's' }), t('app.saving')] : t('settings.save')),
            h('span', { className: 'dsh-rec-subtle' }, t('settings.hint')),
          ),
        ),
  )
}
