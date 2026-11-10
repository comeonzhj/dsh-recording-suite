/**
 * Panel shell: header, tab navigation, locale subscription, toast, and an error
 * boundary so one page crash cannot blank the whole DSH main view.
 */
import { Component, createElement as h, useCallback, useEffect, useRef, useState } from 'react'

import { api } from '../api.js'
import { PanelContext, useLocale, useToast } from './ui.js'
import { Icon } from './icons.js'
import { LibraryPage } from './LibraryPage.js'
import { BeanPage } from './BeanPage.js'
import { WatchPage } from './WatchPage.js'
import { SettingsPage } from './SettingsPage.js'

const TAB_KEY = 'dsh.recording-suite.tab'
const TABS = [
  { id: 'library', labelKey: 'app.tabs.library', icon: 'library', component: LibraryPage },
  { id: 'bean', labelKey: 'app.tabs.bean', icon: 'bean', component: BeanPage },
  { id: 'watch', labelKey: 'app.tabs.watch', icon: 'watch', component: WatchPage },
  { id: 'settings', labelKey: 'app.tabs.settings', icon: 'settings', component: SettingsPage },
]

function initialTab() {
  try {
    const saved = localStorage.getItem(TAB_KEY)
    if (TABS.some((tab) => tab.id === saved)) return saved
  } catch {
    /* localStorage unavailable */
  }
  return 'library'
}

/** Build the slot component for the current plugin context. */
export function createPanel(ctx) {
  function RecordingPanelSlot() {
    return h(Panel, { ctx })
  }
  return RecordingPanelSlot
}

export function Panel({ ctx }) {
  const { t, lang } = useLocale(ctx)
  const { toast, notify } = useToast()
  const [tab, setTab] = useState(initialTab)
  const [status, setStatus] = useState(null)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    api
      .status()
      .then((data) => {
        if (alive.current) setStatus(data)
      })
      .catch(() => {})
    return () => {
      alive.current = false
    }
  }, [tab])

  const selectTab = useCallback((nextTab) => {
    setTab(nextTab)
    try {
      localStorage.setItem(TAB_KEY, nextTab)
    } catch {
      /* ignore */
    }
  }, [])

  const active = TABS.find((item) => item.id === tab) || TABS[0]
  const Page = active.component
  const counts = status?.counts || null

  return h(
    PanelContext.Provider,
    { value: { ctx, t, lang, notify, status } },
    h(
      'div',
      { className: 'dsh-rec', 'data-plugin': 'dsh-recording-suite' },
      h(
        'header',
        { className: 'dsh-rec-head' },
        h('div', { className: 'dsh-rec-mark' }, h(Icon, { name: 'bean', size: 22 })),
        h(
          'div',
          { className: 'dsh-rec-head-copy' },
          h('h1', { className: 'dsh-rec-title' }, t('app.title')),
          h('p', { className: 'dsh-rec-sub' }, t('app.subtitle')),
        ),
        h(
          'div',
          { className: 'dsh-rec-head-meta' },
          counts ? h('span', { className: 'dsh-rec-chip' }, t('settings.counts', { recordings: counts.recordings ?? 0, transcribed: counts.transcribed ?? 0 })) : null,
          status?.storageDir ? h('span', { className: 'dsh-rec-chip', title: status.storageDir }, `${status.storageDir}`) : null,
          status?.appleSpeech
            ? h(
                'span',
                { className: `dsh-rec-chip ${status.appleSpeech.available ? 'is-ok' : 'is-warn'}` },
                `${t('settings.appleSpeech')}: ${status.appleSpeech.available ? t('settings.appleSpeechAvailable') : t('settings.appleSpeechUnavailable')}`,
              )
            : null,
        ),
      ),
      h(
        'nav',
        { className: 'dsh-rec-tabs', role: 'tablist', 'aria-label': t('app.title') },
        TABS.map((item) =>
          h(
            'button',
            {
              key: item.id,
              type: 'button',
              role: 'tab',
              className: 'dsh-rec-tab',
              'aria-selected': item.id === tab ? 'true' : 'false',
              onClick: () => selectTab(item.id),
            },
            h(Icon, { name: item.icon, size: 16 }),
            t(item.labelKey),
          ),
        ),
      ),
      h(
        'div',
        { className: 'dsh-rec-body' },
        h(ErrorBoundary, { key: tab, t }, h(Page, { key: tab })),
        toast ? h('div', { className: 'dsh-rec-toast', role: 'status' }, toast) : null,
      ),
    ),
  )
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('recording-suite: page crashed', error, info)
  }

  render() {
    const t = this.props.t
    if (this.state.error) {
      return h(
        'div',
        { className: 'dsh-rec-card' },
        h(
          'div',
          { className: 'dsh-rec-alert is-error' },
          h(Icon, { name: 'alert', size: 16 }),
          h(
            'div',
            null,
            h('div', { className: 'dsh-rec-alert-title' }, t('app.error')),
            h('div', { className: 'dsh-rec-alert-hint' }, String(this.state.error && this.state.error.message ? this.state.error.message : this.state.error)),
          ),
        ),
      )
    }
    return this.props.children
  }
}
