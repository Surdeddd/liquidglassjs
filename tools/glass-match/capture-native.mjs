import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'
import { decodePng } from './png.mjs'
import { ARTIFACTS, ROOT, loadScenes, parseArgs, selectCaptures } from './scenes.mjs'

const DEVICE_NAME = 'LiquidGlass Oracle 26.5'
const DEVICE_TYPE = 'com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro'
const RUNTIME = 'com.apple.CoreSimulator.SimRuntime.iOS-26-5'
const BUNDLE = 'dev.liquidglassjs.apple-oracle'
const XCODE = `${ARTIFACTS}/xcode`
const APP = `${XCODE}/DerivedData/Build/Products/Debug-iphonesimulator/AppleGlassOracle.app`

const args = parseArgs(process.argv.slice(2))
const outDir = `${ARTIFACTS}/native/${args.label ?? 'current'}`
const captures = selectCaptures(loadScenes(), args)
mkdirSync(outDir, { recursive: true })

function run(command, commandArgs, timeout = 120000) {
  return execFileSync(command, commandArgs, { cwd: ROOT, timeout, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function simctl(commandArgs, timeout) {
  return run('xcrun', ['simctl', ...commandArgs], timeout)
}

function resolveDevice() {
  const listing = JSON.parse(simctl(['list', 'devices', '--json'])).devices[RUNTIME] ?? []
  const existing = listing.find(device => device.name === DEVICE_NAME && device.isAvailable)
  if (existing) return existing
  const udid = simctl(['create', DEVICE_NAME, DEVICE_TYPE, RUNTIME]).trim()
  return { udid, state: 'Shutdown' }
}

function build() {
  run('xcodegen', ['generate', '--spec', 'tools/apple-oracle/project.yml'], 120000)
  run('xcodebuild', [
    '-project', 'tools/apple-oracle/AppleGlassOracle.xcodeproj',
    '-scheme', 'AppleGlassOracle',
    '-sdk', 'iphonesimulator',
    '-destination', 'generic/platform=iOS Simulator',
    '-derivedDataPath', `${XCODE}/DerivedData`,
    'build'
  ], 900000)
}

function sameFrame(a, b) {
  if (a.width !== b.width || a.height !== b.height) return false
  return Buffer.from(a.rgba.buffer).equals(Buffer.from(b.rgba.buffer))
}

async function screenshot(udid, path) {
  simctl(['io', udid, 'screenshot', '--type=png', path], 60000)
  return decodePng(readFileSync(path))
}

function readAck(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

async function waitForAck(container, nonce, limit = 150) {
  const path = `${container}/Documents/ready.json`
  for (let attempt = 0; attempt < limit; attempt++) {
    const ack = existsSync(path) ? readAck(path) : null
    if (ack?.nonce === nonce) return ack
    await sleep(100)
  }
  throw new Error(`oracle did not acknowledge ${nonce}`)
}

const device = resolveDevice()
if (args['skip-build'] !== 'true') build()
if (device.state !== 'Booted') {
  simctl(['boot', device.udid], 300000)
  await sleep(30000)
}
if (args['skip-install'] !== 'true') simctl(['install', device.udid, APP], 600000)
simctl(['launch', '--terminate-running-process', device.udid, BUNDLE], 300000)
const container = simctl(['get_app_container', device.udid, BUNDLE, 'data']).trim()
mkdirSync(`${container}/Documents`, { recursive: true })

const manifest = []
const scratch = `${outDir}/.frame.png`
for (const appearance of ['light', 'dark']) {
  const batch = captures.filter(capture => capture.appearance === appearance)
  if (batch.length === 0) continue
  simctl(['ui', device.udid, 'appearance', appearance])
  await sleep(1500)
  for (const capture of batch) {
    const nonce = `${capture.name}-${Date.now()}`
    writeFileSync(`${container}/Documents/request.json`, JSON.stringify({ scene: capture.scene.id, appearance, nonce }))
    const ack = await waitForAck(container, nonce, manifest.length === 0 ? 900 : 150)
    let previous = await screenshot(device.udid, scratch)
    let stable = false
    for (let attempt = 0; attempt < 6 && !stable; attempt++) {
      await sleep(300)
      const next = await screenshot(device.udid, scratch)
      stable = sameFrame(previous, next)
      previous = next
    }
    writeFileSync(`${outDir}/${capture.name}.png`, readFileSync(scratch))
    manifest.push({ name: capture.name, stable, rendered: ack.rendered })
    process.stdout.write(`${capture.name} ${stable ? 'stable' : 'UNSTABLE'}${ack.rendered ? '' : ' NOT-RENDERED'}\n`)
  }
}
if (existsSync(scratch)) unlinkSync(scratch)
writeFileSync(`${outDir}/manifest.json`, `${JSON.stringify({ device: device.udid, runtime: RUNTIME, captures: manifest }, null, 2)}\n`)
