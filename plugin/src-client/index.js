/**
 * Recording Suite — Client (browser) half entry.
 *
 * The bundle is wrapped by `scripts/build-client.mjs` into the DSH module-loader
 * format:
 *
 *   window.__ModuleLoader__.load({
 *     id: '@local/dsh-recording-suite',
 *     factory(require) { const React = require('react'); ... return { inject, apply } },
 *   })
 *
 * React comes from the loader (never bundled); no `@deepseek-ai/*` client
 * package is imported. All persistence goes through `/api/recording/*`.
 */
import { createElement as h } from 'react'

import { DICT, NS, fallbackTranslate } from './i18n.js'
import { PANEL_CSS, PANEL_STYLE_ID } from './styles.js'
import { createPanel } from './components/Panel.js'
import { Icon } from './components/icons.js'

export const inject = ['slots', 'locale']

/** Inject the panel stylesheet once and remove it on plugin unload. */
function installStyles() {
  if (typeof document === 'undefined') return () => {}
  const selector = `style[data-plugin-css="${PANEL_STYLE_ID}"]`
  if (document.querySelector(selector)) return () => {}
  const style = document.createElement('style')
  style.dataset.plugin = 'dsh-recording-suite'
  style.dataset.pluginCss = PANEL_STYLE_ID
  style.textContent = PANEL_CSS
  document.head.appendChild(style)
  return () => {
    try {
      style.remove()
    } catch {
      /* ignore */
    }
  }
}

export function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh: DICT.zh, en: DICT.en }), 'recording-suite: dictionaries')
  ctx.effect(() => installStyles(), 'recording-suite: styles')

  const t = (key, params) => {
    try {
      const bound = ctx.locale.bind(NS)
      const value = bound(key, params)
      if (typeof value === 'string' && value.length > 0) return value
    } catch {
      /* fall through to the bundled dictionary */
    }
    return fallbackTranslate(key, params)
  }

  ctx.slots.inject('main', () =>
    ctx.slots.register(
      { name: 'main', key: 'recording-suite', locale: NS },
      createPanel(ctx),
    ),
  )

  ctx.slots.inject('sidebar.panellist', () =>
    ctx.slots.register(
      { name: 'sidebar.panellist', id: 'recording-suite', order: 30, label: () => t('app.title'), locale: NS },
      (props) => h(Icon, { name: 'bean', size: typeof props?.size === 'number' ? props.size : 20 }),
    ),
  )
}

export default { inject, apply }
