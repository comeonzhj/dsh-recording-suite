import assert from 'node:assert/strict'
import test from 'node:test'

import {
  describeDeviceError,
  deviceErrorText,
  fileRowKey,
  fileNameFromPath,
  formatBytes,
  formatDateTime,
  formatDuration,
  intlLocale,
  maskToken,
  recordedAtFromFileId,
} from '../src-client/format.js'

test('formatDuration renders m:ss and h:mm:ss with dashes for unknown values', () => {
  assert.equal(formatDuration(null), '—')
  assert.equal(formatDuration(undefined), '—')
  assert.equal(formatDuration(Number.NaN), '—')
  assert.equal(formatDuration(-5), '—')
  assert.equal(formatDuration(0), '0:00')
  assert.equal(formatDuration(93000), '1:33')
  assert.equal(formatDuration(3723000), '1:02:03')
})

test('formatBytes scales units deterministically', () => {
  assert.equal(formatBytes(null), '—')
  assert.equal(formatBytes(-1), '—')
  assert.equal(formatBytes(0), '0 B')
  assert.equal(formatBytes(512), '512 B')
  assert.equal(formatBytes(1536), '1.50 KB')
  assert.equal(formatBytes(10 * 1024 * 1024), '10.0 MB')
  assert.equal(formatBytes(123 * 1024 * 1024), '123 MB')
})

test('intlLocale maps panel languages', () => {
  assert.equal(intlLocale('zh'), 'zh-CN')
  assert.equal(intlLocale('en'), 'en-US')
  assert.equal(intlLocale('ja'), 'en-US')
})

test('formatDateTime handles ISO strings, epochs, and invalid values', () => {
  assert.equal(formatDateTime(null), '—')
  assert.equal(formatDateTime('not-a-date'), '—')
  const iso = formatDateTime('2026-11-09T10:30:00.000Z', 'zh')
  assert.match(iso, /2026/)
  const epoch = formatDateTime(new Date('2026-11-09T10:30:00.000Z').getTime(), 'en')
  assert.match(epoch, /2026/)
})

test('maskToken keeps only the edges visible', () => {
  assert.equal(maskToken(''), '')
  assert.equal(maskToken(null), '')
  assert.equal(maskToken('short'), '••••••')
  assert.equal(maskToken('abcdefghijklmnop'), 'abcd…mnop')
})

test('fileNameFromPath handles posix and windows separators', () => {
  assert.equal(fileNameFromPath('/Users/x/Documents/DSH-Recordings/transcripts/a.md'), 'a.md')
  assert.equal(fileNameFromPath('C:\\Users\\x\\a.md'), 'a.md')
  assert.equal(fileNameFromPath(''), '')
})

test('recordedAtFromFileId only accepts plausible Unix-second ids', () => {
  const now = Date.UTC(2026, 10, 9)
  assert.equal(recordedAtFromFileId(0, now), null)
  assert.equal(recordedAtFromFileId(Number.NaN, now), null)
  assert.equal(recordedAtFromFileId(1, now), null)
  assert.equal(recordedAtFromFileId(Math.floor(now / 1000) + 999999999, now), null)
  const iso = recordedAtFromFileId(Math.floor(now / 1000), now)
  assert.equal(iso, new Date(Math.floor(now / 1000) * 1000).toISOString())
})

test('fileRowKey is stable per device file id', () => {
  assert.equal(fileRowKey(123), 'file-123')
  assert.equal(fileRowKey('42'), 'file-42')
})

test('describeDeviceError maps coded errors and falls back to messages', () => {
  assert.deepEqual(describeDeviceError({ code: 'unsupported' }), { key: 'bean.error.unsupported', params: {} })
  assert.deepEqual(describeDeviceError({ code: 'timeout', params: { labelKey: 'bean.timeout.export' } }), {
    key: 'bean.error.timeout',
    params: { labelKey: 'bean.timeout.export' },
  })
  const unknown = describeDeviceError(new Error('boom'))
  assert.equal(unknown.key, null)
  assert.equal(unknown.message, 'boom')
})

test('deviceErrorText localizes codes, nested labels, and error codes in logs', () => {
  const dictionary = {
    'bean.error.timeout': 'Timed out while {label}.',
    'bean.timeout.export': 'exporting',
    'bean.error.cancelled': 'cancelled',
    fallback: 'fallback',
  }
  const t = (key, params) => {
    const template = dictionary[key] ?? 'fallback'
    if (!params) return template
    return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match))
  }
  assert.equal(deviceErrorText(t, { code: 'timeout', params: { labelKey: 'bean.timeout.export' } }), 'Timed out while exporting.')
  assert.equal(deviceErrorText(t, { code: 'cancelled' }), 'cancelled')
  assert.equal(deviceErrorText(t, new Error('raw')), 'raw')
})
