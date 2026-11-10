import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { DICT, NS, fallbackTranslate } from '../src-client/i18n.js'

const srcClientDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src-client')
const NAMESPACE_PREFIXES = new Set(['app', 'source', 'status', 'library', 'bean', 'watch', 'settings'])

function walkFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'vendor') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkFiles(full, out)
    else if (/\.(js|mjs)$/.test(entry.name) && entry.name !== 'i18n.js') out.push(full)
  }
  return out
}

function placeholders(template) {
  return [...String(template).matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()
}

test('locale namespace is registered under the expected id', () => {
  assert.equal(NS, 'recording-suite')
})

test('zh and en dictionaries expose exactly the same keys', () => {
  const zhKeys = Object.keys(DICT.zh).sort()
  const enKeys = Object.keys(DICT.en).sort()
  assert.deepEqual(enKeys, zhKeys)
  assert.ok(zhKeys.length > 100, `expected a substantial dictionary, got ${zhKeys.length} keys`)
})

test('every dictionary value is a non-empty string', () => {
  for (const lang of ['zh', 'en']) {
    for (const [key, value] of Object.entries(DICT[lang])) {
      assert.equal(typeof value, 'string', `${lang}.${key} must be a string`)
      assert.ok(value.trim().length > 0, `${lang}.${key} must not be empty`)
    }
  }
})

test('placeholder names match across zh and en', () => {
  for (const key of Object.keys(DICT.zh)) {
    assert.deepEqual(placeholders(DICT.en[key]), placeholders(DICT.zh[key]), `placeholder mismatch for ${key}`)
  }
})

test('every static dictionary key referenced by src-client exists', () => {
  const referenced = new Set()
  for (const file of walkFiles(srcClientDir)) {
    const source = fs.readFileSync(file, 'utf8')
    for (const match of source.matchAll(/['"]((?:app|source|status|library|bean|watch|settings)\.[\w.-]+)['"]/g)) {
      const key = match[1]
      if (!NAMESPACE_PREFIXES.has(key.split('.')[0])) continue
      referenced.add(key)
    }
  }
  assert.ok(referenced.size > 80, `expected many referenced keys, got ${referenced.size}`)
  const missing = [...referenced].filter((key) => !(key in DICT.zh))
  assert.deepEqual(missing, [], `missing zh keys: ${missing.join(', ')}`)
})

test('fallbackTranslate substitutes parameters and survives unknown keys', () => {
  assert.equal(fallbackTranslate('app.count', { count: 3 }), '共 3 条')
  assert.equal(fallbackTranslate('does.not.exist'), 'does.not.exist')
  assert.equal(fallbackTranslate('app.count', { other: 1 }), '共 {count} 条')
})
