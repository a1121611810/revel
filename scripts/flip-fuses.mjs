#!/usr/bin/env node
/**
 * Flip Electron Fuses for security hardening
 *
 * Run after electron-builder to disable dangerous features:
 * - runAsNode: false
 * - nodeCliInspect: false
 * - enableEmbeddedAsarIntegrityValidation: true
 * - onlyLoadAppFromAsar: true
 */
import { flipFuses, FuseVersion, FuseV1Options } from '@electron/fuses'
import fs from 'fs'
import path from 'path'

const root = process.cwd()

// Possible paths for Electron binaries after electron-builder
const candidatePaths = [
  // macOS
  'dist/mac/Revel.app/Contents/MacOS/Revel',
  'dist/mac-arm64/Revel.app/Contents/MacOS/Revel',
  'dist/mac-x64/Revel.app/Contents/MacOS/Revel',
  // Windows
  'dist/win-unpacked/Revel.exe',
  'dist/win-ia32-unpacked/Revel.exe',
  'dist/win-x64-unpacked/Revel.exe',
  'dist/win-arm64-unpacked/Revel.exe',
  // Linux
  'dist/linux-unpacked/revel',
  'dist/linux-x64-unpacked/revel',
  'dist/linux-arm64-unpacked/revel',
]

function findElectronBinaries() {
  const found = []
  for (const rel of candidatePaths) {
    const full = path.join(root, rel)
    if (fs.existsSync(full)) {
      found.push(full)
    }
  }
  return found
}

async function main() {
  const binaries = findElectronBinaries()

  if (binaries.length === 0) {
    console.warn('[flip-fuses] No Electron binaries found in dist/. Skipping.')
    console.warn('[flip-fuses] Expected paths:', candidatePaths)
    process.exit(0)
  }

  for (const binary of binaries) {
    console.log(`[flip-fuses] Flipping fuses for: ${binary}`)
    try {
      await flipFuses(binary, {
        version: FuseVersion.V1,
        [FuseV1Options.RunAsNode]: false,
        [FuseV1Options.NodeCliInspect]: false,
        [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
        [FuseV1Options.OnlyLoadAppFromAsar]: true,
      })
      console.log(`[flip-fuses] Done: ${path.basename(binary)}`)
    } catch (err) {
      console.error(`[flip-fuses] Failed for ${binary}:`, err.message)
      process.exit(1)
    }
  }
}

main().catch((err) => {
  console.error('[flip-fuses] Unexpected error:', err)
  process.exit(1)
})
