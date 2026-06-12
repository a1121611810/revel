#!/usr/bin/env node
/**
 * Revel 生产构建脚本
 *
 * 工作流程：
 * 1. 清理 dist/ 输出目录
 * 2. 依次构建 Renderer、Main、Preload 三个进程
 *    （串行构建避免资源冲突）
 * 3. 输出构建结果到 dist/ 目录
 */
import { build } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import { rmSync, existsSync } from 'fs'
import { spawnSync } from 'child_process'

// Generate third-party licenses before building
const { main: generateLicenses } = await import('./generate-licenses.mjs')
await generateLicenses()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const distDir = path.resolve(root, 'dist')

/**
 * 清理 dist 输出目录
 */
function cleanDist() {
  console.log('[build] 正在清理 dist 目录...')
  try {
    if (existsSync(distDir)) {
      rmSync(distDir, { recursive: true, force: true })
    }
  } catch (err) {
    console.warn('[build] 清理 dist 目录时出错:', err.message)
  }
}

/**
 * 构建 Renderer 进程
 * 输出: dist/renderer/ (index.html + 静态资源)
 */
async function buildRenderer() {
  console.log('[build] 正在构建 Renderer 进程...')
  await build({
    configFile: path.resolve(root, 'vite.renderer.config.js'),
    mode: 'production'
  })
  console.log('[build] Renderer 进程构建完成')
}

/**
 * 构建 Main 进程
 * 输出: dist/main/ (main.js CJS)
 */
async function buildMain() {
  console.log('[build] 正在构建 Main 进程...')
  await build({
    configFile: path.resolve(root, 'vite.main.config.js'),
    mode: 'production'
  })
  console.log('[build] Main 进程构建完成')
}

/**
 * 构建 Preload 进程
 * 输出: dist/preload/ (preload.js CJS)
 */
async function buildPreload() {
  console.log('[build] 正在构建 Preload 进程...')
  await build({
    configFile: path.resolve(root, 'vite.preload.config.js'),
    mode: 'production'
  })
  console.log('[build] Preload 进程构建完成')
}

/**
 * 主流程
 */
async function main() {
  const startTime = Date.now()
  console.log('[build] 开始生产构建\n')

  // 1. 清理输出目录
  cleanDist()

  // 2. 串行构建三个进程（避免资源冲突）
  await buildRenderer()
  await buildMain()
  await buildPreload()

  // 4. 导出应用图标
  console.log('[build] 正在导出应用图标...')
  const exportResult = spawnSync('node', ['scripts/export-icons.mjs'], {
    cwd: root,
    stdio: 'inherit',
  })
  if (exportResult.status !== 0) {
    console.warn('[build] 图标导出失败，继续构建...')
  } else {
    console.log('[build] 应用图标导出完成')
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`\n[build] 全部构建完成！耗时 ${duration}s`)
  console.log('[build] 输出目录:')
  console.log(`  ├── dist/      - 应用构建输出`)
  console.log(`  ├── build/     - 应用图标 (icon.icns)`)
  console.log(`  ├── main/      - Main 进程 (main.js)`)
  console.log(`  ├── preload/   - Preload 进程 (preload.js)`)
  console.log(`  └── renderer/  - Renderer 进程 (index.html + assets)`)
}

main().catch((err) => {
  console.error('[build] 构建失败:', err)
  process.exit(1)
})
