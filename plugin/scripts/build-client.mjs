#!/usr/bin/env node
/**
 * Build `plugin/client.js` from `plugin/src-client/**`.
 *
 * Pipeline:
 *   1. bundle the client entry as CommonJS with esbuild (`react` stays external);
 *   2. wrap the bundle in the DSH module-loader envelope;
 *   3. validate the result (no bundled React, no @deepseek-ai imports);
 *   4. `node --check` the generated file so a broken build never lands.
 *
 * The script is repeatable and prints an actionable error when esbuild is
 * missing. It never installs anything.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const pluginDir = path.resolve(scriptDir, '..')
const projectDir = path.resolve(pluginDir, '..')
const entryFile = path.join(pluginDir, 'src-client', 'index.js')
const outFile = path.join(pluginDir, 'client.js')
const MODULE_ID = '@local/dsh-recording-suite'

function isExecutable(file) {
  try {
    fs.accessSync(file, fs.constants.X_OK)
    return fs.statSync(file).isFile()
  } catch {
    return false
  }
}

function findEsbuild() {
  const candidates = []
  if (process.env.ESBUILD_BIN) candidates.push(process.env.ESBUILD_BIN)
  candidates.push(
    path.join(projectDir, 'node_modules', '.bin', 'esbuild'),
    path.join(pluginDir, 'node_modules', '.bin', 'esbuild'),
    '/opt/homebrew/bin/esbuild',
    '/usr/local/bin/esbuild',
  )
  for (const candidate of candidates) {
    if (candidate && isExecutable(candidate)) return candidate
  }
  const which = spawnSync('which', ['esbuild'], { encoding: 'utf8' })
  if (which.status === 0) {
    const resolved = which.stdout.trim().split('\n')[0]
    if (resolved && isExecutable(resolved)) return resolved
  }
  return null
}

function fail(message, detail) {
  console.error(`\n[build-client] ${message}\n`)
  if (detail) console.error(detail)
  process.exit(1)
}

function indent(text, prefix) {
  return text
    .replace(/\s+$/, '')
    .split('\n')
    .map((line) => (line.length > 0 ? prefix + line : line))
    .join('\n')
}

function main() {
  if (!fs.existsSync(entryFile)) fail(`Client entry not found: ${entryFile}`)
  const esbuild = findEsbuild()
  if (!esbuild) {
    fail(
      'esbuild not found; the client bundle was not rebuilt.',
      [
        'Install esbuild (npm/pnpm add -D esbuild) or point ESBUILD_BIN at an existing binary,',
        'then rerun: node plugin/scripts/build-client.mjs',
      ].join('\n'),
    )
  }

  const version = spawnSync(esbuild, ['--version'], { encoding: 'utf8' })
  if (version.status !== 0) fail(`esbuild at ${esbuild} is not runnable`, version.stderr || version.error?.message)

  const result = spawnSync(
    esbuild,
    [
      entryFile,
      '--bundle',
      '--format=cjs',
      '--platform=browser',
      '--target=chrome110,edge110',
      '--external:react',
      '--external:react-dom',
      '--legal-comments=inline',
      '--charset=utf8',
      '--log-level=warning',
    ],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )

  if (result.error) fail(`Failed to start esbuild: ${result.error.message}`)
  if (result.status !== 0) fail('esbuild failed to bundle src-client/', `${result.stderr || ''}${result.stdout || ''}`)

  const bundle = result.stdout
  if (!bundle || bundle.trim().length === 0) fail('esbuild produced an empty bundle')

  if (!/require\(["']react["']\)/.test(bundle)) {
    fail('The bundle does not require("react"); React must stay external and loader-provided.')
  }
  if (/require\(["']@deepseek-ai\//.test(bundle) || /from\s*["']@deepseek-ai\//.test(bundle)) {
    fail('The bundle imports an @deepseek-ai client package; the client half must not depend on one.')
  }

  const banner = `/**
 * DSH Recording Suite — browser (Client) half.
 *
 * GENERATED FILE — do not edit directly.
 * Source: plugin/src-client/**
 * Rebuild: node plugin/scripts/build-client.mjs
 *
 * React is provided by window.__ModuleLoader__ (never bundled here).
 * Device access is delegated to the Host's native CoreBluetooth bridge.
 */
`
  const output = `${banner}window.__ModuleLoader__.load({
  id: '${MODULE_ID}',
  factory(require) {
    const React = require('react')
    void React
    const module = { exports: {} }
    const exports = module.exports
    ;(function (module, exports, require) {
${indent(bundle, '      ')}
    })(module, exports, require)
    return module.exports.default ?? module.exports
  },
})
`

  const tempFile = path.join(pluginDir, `.client-build-${process.pid}.tmp.cjs`)
  try {
    fs.writeFileSync(tempFile, output, 'utf8')
    const check = spawnSync(process.execPath, ['--check', tempFile], { encoding: 'utf8' })
    if (check.status !== 0) fail('Generated client.js has a syntax error', check.stderr || '')
    fs.renameSync(tempFile, outFile)
  } finally {
    try {
      fs.rmSync(tempFile, { force: true })
    } catch {
      /* ignore */
    }
  }

  const size = fs.statSync(outFile).size
  console.log(`[build-client] wrote ${path.relative(projectDir, outFile)} (${size} bytes) from src-client/`)
}

main()
