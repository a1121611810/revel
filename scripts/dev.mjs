#!/usr/bin/env node
/**
 * Revel 开发模式启动脚本
 *
 * 工作流程：
 * 1. 启动 Vite dev server（Renderer 进程）
 * 2. Watch 模式编译 Main 进程
 * 3. Watch 模式编译 Preload 进程
 * 4. 启动 Electron 并注入 dev server URL
 * 5. Main/Preload 重新编译时自动重启 Electron（带防抖）
 * 6. SIGINT 时清理所有进程
 */
import { createServer, build } from 'vite'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

import { copyFileSync, existsSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

// 全局状态
let electronProcess = null
let rendererServer = null
let restartTimer = null
const RESTART_DEBOUNCE_MS = 300  // 防抖间隔，防止同时编译导致多次重启

/**
 * 启动 Vite dev server（Renderer 进程）
 * @returns {{ server: import('vite').ViteDevServer, url: string }}
 */
async function startRendererServer() {
  const server = await createServer({
    configFile: path.resolve(root, 'vite.renderer.config.js'),
    mode: 'development'
  })
  await server.listen()

  const urls = server.resolvedUrls
  const url = urls.local[0] || urls.network[0]
  console.log(`[dev] Renderer dev server 运行在: ${url}`)

  return { server, url }
}

/**
 * Watch 模式构建 Main 进程
 * @returns {Promise<import('vite').RollupWatcher>}
 */
async function watchMainBuild() {
  return build({
    configFile: path.resolve(root, 'vite.main.config.js'),
    mode: 'development',
    build: { watch: {} },
    plugins: [{
      name: 'electron-main-watcher',
      writeBundle() {
        console.log('[dev] Main 进程编译完成')
        // Copy menu bar popup assets to dist/main/
        const outDir = path.resolve(root, 'dist/main')
        const assets = ['menu-bar-popup.html', 'menu-bar-popup-preload.js']
        for (const file of assets) {
          const src = path.resolve(root, 'src/main', file)
          const dest = path.resolve(outDir, file)
          if (existsSync(src)) {
            copyFileSync(src, dest)
          }
        }
        debouncedRestartElectron()
      }
    }]
  })
}

/**
 * Watch 模式构建 Preload 进程
 * @returns {Promise<import('vite').RollupWatcher>}
 */
async function watchPreloadBuild() {
  return build({
    configFile: path.resolve(root, 'vite.preload.config.js'),
    mode: 'development',
    build: { watch: {} },
    plugins: [{
      name: 'electron-preload-watcher',
      writeBundle() {
        console.log('[dev] Preload 进程编译完成')
        debouncedRestartElectron()
      }
    }]
  })
}

/**
 * 启动 Electron 进程
 * @param {string} devServerUrl - Renderer dev server URL
 */
function startElectron(devServerUrl) {
  if (electronProcess) return

  console.log('[dev] 正在启动 Electron...')
  electronProcess = spawn('electron', ['.'], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      VITE_DEV_SERVER_URL: devServerUrl
    },
    stdio: 'inherit'
  })

  electronProcess.on('exit', (code, signal) => {
    electronProcess = null
    if (signal) {
      console.log(`[dev] Electron 被信号终止: ${signal}`)
    } else if (code !== 0) {
      console.log(`[dev] Electron 异常退出，代码: ${code}`)
    }
  })
}

/**
 * 防抖重启 Electron
 * 当 Main 和 Preload 几乎同时编译完成时，只重启一次
 */
function debouncedRestartElectron() {
  if (restartTimer) {
    clearTimeout(restartTimer)
  }
  restartTimer = setTimeout(() => {
    restartTimer = null
    restartElectron()
  }, RESTART_DEBOUNCE_MS)
}

/**
 * 重启 Electron 进程
 */
function restartElectron() {
  if (!electronProcess) {
    // 首次启动
    startElectron(rendererServer?.url)
    return
  }

  console.log('[dev] 正在重启 Electron...')
  electronProcess.removeAllListeners('exit')
  electronProcess.on('exit', () => {
    electronProcess = null
    startElectron(rendererServer?.url)
  })
  electronProcess.kill()
}

/**
 * 清理所有进程并退出
 */
async function cleanup() {
  console.log('\n[dev] 正在清理进程...')

  if (restartTimer) {
    clearTimeout(restartTimer)
    restartTimer = null
  }

  if (electronProcess) {
    electronProcess.kill()
    electronProcess = null
  }

  if (rendererServer) {
    await rendererServer.server.close()
    rendererServer = null
  }

  console.log('[dev] 清理完成，再见！')
  process.exit(0)
}

// 信号处理：Ctrl+C 等
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

// 未捕获的异常处理
process.on('uncaughtException', (err) => {
  console.error('[dev] 未捕获的异常:', err)
  cleanup()
})

/**
 * 主流程
 */
async function main() {
  console.log('[dev] 正在启动 Revel 开发服务...\n')

  // 1. 启动 Renderer dev server
  const { server, url } = await startRendererServer()
  rendererServer = { server, url }

  // 2. Watch 模式构建 Main 和 Preload（并行启动）
  await Promise.all([
    watchMainBuild(),
    watchPreloadBuild()
  ])

  // 3. 首次启动 Electron（等首次编译完成后由 watcher 触发，
  //    但为确保一定启动，如果 1 秒内未启动则手动启动）
  setTimeout(() => {
    if (!electronProcess) {
      startElectron(url)
    }
  }, 1000)

  console.log('[dev] 开发服务已就绪！按 Ctrl+C 停止\n')
}

main().catch((err) => {
  console.error('[dev] 启动失败:', err)
  cleanup()
})
