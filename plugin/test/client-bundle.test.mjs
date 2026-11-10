import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const clientFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'client.js')

function makeReactMock() {
  const createContext = (defaultValue) => {
    const context = { _default: defaultValue, _stack: [] }
    context.Provider = { $$provider: true, context }
    return context
  }
  class Component {
    constructor(props) {
      this.props = props || {}
      this.state = {}
    }

    setState() {}
  }
  const noop = () => {}
  const createElement = (type, props, ...children) => ({
    type,
    props: { ...(props || {}), children: children.length === 1 ? children[0] : children.length > 1 ? children : undefined },
  })
  const hooks = {
    createElement,
    Component,
    createContext,
    useContext: (context) =>
      context && context._stack.length > 0 ? context._stack[context._stack.length - 1] : context?._default,
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    useRef: (initial) => ({ current: initial }),
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, noop],
    useEffect: noop,
    useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
  }
  return hooks
}

function makeRenderer(React) {
  function renderNode(node) {
    if (node == null || typeof node === 'boolean') return null
    if (typeof node === 'string' || typeof node === 'number') return String(node)
    if (Array.isArray(node)) {
      for (const child of node) renderNode(child)
      return null
    }
    const { type, props } = node
    if (type && type.$$provider) {
      const context = type.context
      context._stack.push(props.value)
      try {
        renderNode(props.children)
      } finally {
        context._stack.pop()
      }
      return null
    }
    if (typeof type === 'function') {
      if (type.prototype instanceof React.Component) {
        const instance = new type(props)
        renderNode(instance.render())
        return null
      }
      renderNode(type(props))
      return null
    }
    renderNode(props && props.children)
    return null
  }
  return renderNode
}

let loadCounter = 0

async function loadEntry() {
  loadCounter += 1
  let entry = null
  globalThis.window = {
    __ModuleLoader__: {
      load(value) {
        entry = value
      },
    },
  }
  try {
    await import(`${pathToFileURL(clientFile).href}?load=${loadCounter}`)
  } finally {
    delete globalThis.window
  }
  return entry
}

function makePlugin(entry) {
  const React = makeReactMock()
  const require = (id) => {
    if (id === 'react') return React
    throw new Error(`unexpected require(${id})`)
  }
  return { plugin: entry.factory(require), React }
}

function applyPlugin(plugin, React) {
  const registrations = []
  const ctx = {
    effect: (fn) => fn(),
    locale: {
      register: () => () => {},
      bind: () => (key) => key,
      getSnapshot: () => ({ active: 'zh', locales: ['zh', 'en'], revision: 1 }),
      subscribe: () => () => {},
    },
    slots: {
      inject: (_name, fn) => fn(),
      register: (spec, component) => {
        registrations.push({ spec, component })
        return () => {}
      },
    },
  }
  plugin.apply(ctx)
  return registrations
}

test('generated client.js uses the DSH module-loader envelope and registers both slots', async () => {
  const entry = await loadEntry()
  assert.ok(entry, 'client.js must call window.__ModuleLoader__.load')
  assert.equal(entry.id, '@local/dsh-recording-suite')
  assert.equal(typeof entry.factory, 'function')

  const { plugin, React } = makePlugin(entry)
  assert.deepEqual(plugin.inject, ['slots', 'locale'])
  assert.equal(typeof plugin.apply, 'function')

  const registrations = applyPlugin(plugin, React)
  const main = registrations.find((item) => item.spec.name === 'main')
  const sidebar = registrations.find((item) => item.spec.name === 'sidebar.panellist')
  assert.ok(main, 'main slot must be registered')
  assert.equal(main.spec.key, 'recording-suite')
  assert.equal(main.spec.locale, 'recording-suite')
  assert.ok(sidebar, 'sidebar.panellist slot must be registered')
  assert.equal(sidebar.spec.id, 'recording-suite')
  assert.equal(sidebar.spec.order, 30)

  const panel = main.component({})
  assert.ok(panel, 'main slot component must render an element')
  assert.equal(sidebar.component({ size: 24 }).props.size, 24)
})

test('every panel tab renders without throwing under the bundled React contract', async () => {
  const entry = await loadEntry()
  const { plugin, React } = makePlugin(entry)
  const renderNode = makeRenderer(React)

  for (const tab of ['library', 'bean', 'watch', 'settings']) {
    globalThis.localStorage = {
      getItem: (key) => (key === 'dsh.recording-suite.tab' ? tab : null),
      setItem: () => {},
    }
    try {
      const registrations = applyPlugin(plugin, React)
      const main = registrations.find((item) => item.spec.name === 'main')
      const tree = main.component({})
      assert.doesNotThrow(() => renderNode(tree), `tab "${tab}" must render`)
    } finally {
      delete globalThis.localStorage
    }
  }
})
