/**
 * Shared React primitives and hooks for every page of the recording panel.
 */
import {
  createContext,
  createElement as h,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import { NS, fallbackTranslate } from '../i18n.js'
import { copyText } from '../api.js'
import { Icon } from './icons.js'

const EMPTY_SNAPSHOT = Object.freeze({ active: 'zh', locales: [], revision: 0 })

/** Panel-wide context: `{ ctx, t, lang }`, recreated on locale change. */
export const PanelContext = createContext(null)

export function usePanel() {
  const value = useContext(PanelContext)
  if (!value) throw new Error('Recording panel context is missing')
  return value
}

/**
 * Subscribe to the locale service so a locale switch re-renders the panel
 * without a page reload. `bind(ns)` keeps a stable identity; each render reads
 * the current dictionary through it.
 */
export function useLocale(ctx) {
  const subscribe = useCallback(
    (onChange) => {
      try {
        const dispose = ctx.locale.subscribe(onChange)
        return typeof dispose === 'function' ? dispose : () => {}
      } catch {
        return () => {}
      }
    },
    [ctx],
  )
  const getSnapshot = useCallback(() => {
    try {
      return ctx.locale.getSnapshot() || EMPTY_SNAPSHOT
    } catch {
      return EMPTY_SNAPSHOT
    }
  }, [ctx])
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot) || EMPTY_SNAPSHOT

  const lang = typeof snapshot.active === 'string' && snapshot.active.startsWith('zh') ? 'zh' : 'en'
  const t = useCallback(
    (key, params) => {
      try {
        const bound = ctx.locale.bind(NS)
        const value = bound(key, params)
        if (typeof value === 'string' && value.length > 0) return value
      } catch {
        /* fall through to the bundled dictionary */
      }
      return fallbackTranslate(key, params)
    },
    [ctx],
  )
  return { t, lang, snapshot }
}

/** Copy-to-clipboard state with an automatic reset. */
export function useCopy(t) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)
  const timer = useRef(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  const copy = useCallback(
    async (text, message) => {
      try {
        await copyText(text)
        setCopied(true)
        setError(null)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setCopied(false), 1600)
        return message || t('app.copied')
      } catch {
        setCopied(false)
        setError(t('app.copyFailed'))
        return null
      }
    },
    [t],
  )
  return { copied, error, copy }
}

/** Floating confirmation line at the bottom of the panel body. */
export function useToast() {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  const notify = useCallback((message) => {
    if (!message) return
    setToast(message)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 2600)
  }, [])
  return { toast, notify }
}

export function Btn(props) {
  const { variant = 'default', size = 'md', icon, children, className = '', type = 'button', ...rest } = props
  const classes = [
    'dsh-rec-btn',
    variant === 'primary' ? 'is-primary' : '',
    variant === 'danger' ? 'is-danger' : '',
    variant === 'ghost' ? 'is-ghost' : '',
    size === 'sm' ? 'is-sm' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return h(
    'button',
    { ...rest, type, className: classes },
    icon ? h(Icon, { name: icon, size: size === 'sm' ? 14 : 16 }) : null,
    children,
  )
}

export function Alert(props) {
  const { kind = 'info', title, children, action } = props
  const classes = ['dsh-rec-alert', kind === 'error' ? 'is-error' : kind === 'warn' ? 'is-warn' : kind === 'success' ? 'is-success' : '']
    .filter(Boolean)
    .join(' ')
  const iconName = kind === 'error' ? 'alert' : kind === 'success' ? 'check' : kind === 'warn' ? 'alert' : 'info'
  return h(
    'div',
    { className: classes, role: kind === 'error' ? 'alert' : undefined },
    h(Icon, { name: iconName, size: 16 }),
    h('div', { className: 'dsh-rec-alert-body' }, title ? h('div', { className: 'dsh-rec-alert-title' }, title) : null, children ? h('div', { className: 'dsh-rec-alert-hint' }, children) : null),
    action || null,
  )
}

export function Empty(props) {
  const { title, hint, icon = 'info', children } = props
  return h(
    'div',
    { className: 'dsh-rec-empty' },
    h(Icon, { name: icon, size: 28 }),
    title ? h('div', { className: 'dsh-rec-empty-title' }, title) : null,
    hint ? h('div', { className: 'dsh-rec-empty-hint' }, hint) : null,
    children || null,
  )
}

export function Field(props) {
  const { label, hint, children, htmlFor } = props
  return h(
    'label',
    { className: 'dsh-rec-field', htmlFor },
    label ? h('span', { className: 'dsh-rec-field-label' }, label) : null,
    children,
    hint ? h('span', { className: 'dsh-rec-field-hint' }, hint) : null,
  )
}

export function Badge(props) {
  const { kind = '', children } = props
  return h('span', { className: `dsh-rec-badge${kind ? ` is-${kind}` : ''}` }, children)
}

export function Spinner() {
  return h('span', { className: 'dsh-rec-spinner', 'aria-hidden': true })
}

export function Progress(props) {
  const value = Math.max(0, Math.min(100, Number(props.value) || 0))
  const label = props.label ? h('span', { className: 'dsh-rec-progress-text' }, props.label) : null
  return h(
    'div',
    { className: 'dsh-rec-progress-row' },
    h('div', { className: 'dsh-rec-progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(value) }, h('i', { style: { width: `${value}%` } })),
    label,
  )
}

export function Input(props) {
  const { className = '', ...rest } = props
  return h('input', { ...rest, className: `dsh-rec-input ${className}`.trim() })
}

export function Select(props) {
  const { className = '', children, ...rest } = props
  return h('select', { ...rest, className: `dsh-rec-select ${className}`.trim() }, children)
}
