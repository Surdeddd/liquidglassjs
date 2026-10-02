import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const ROOT = fileURLToPath(new URL('../../', import.meta.url))
export const ARTIFACTS = `${ROOT}artifacts/glass-match`

export function loadScenes() {
  return JSON.parse(readFileSync(new URL('./scenes.json', import.meta.url), 'utf8')).scenes
}

export function parseArgs(argv) {
  const args = {}
  for (const entry of argv) {
    const match = /^--([^=]+)(?:=(.*))?$/.exec(entry)
    if (match) args[match[1]] = match[2] ?? 'true'
  }
  return args
}

export function selectCaptures(scenes, args) {
  const filter = args.scenes ? new RegExp(args.scenes) : null
  const appearances = (args.appearance ?? 'light,dark').split(',')
  const captures = []
  for (const scene of scenes) {
    if (filter && !filter.test(scene.id)) continue
    for (const appearance of appearances) {
      if (scene.appearances && !scene.appearances.includes(appearance)) continue
      captures.push({ scene, appearance, name: `${scene.id}.${appearance}` })
    }
  }
  return captures
}
