import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'
import fs from 'fs'

function getElectronPath() {
  const electronModulePath = require.resolve('electron')
  const electronDir = path.dirname(electronModulePath)
  const relativePath = fs.readFileSync(path.join(electronDir, 'path.txt'), 'utf8').trim()
  return path.join(electronDir, 'dist', relativePath)
}

const electronPath = getElectronPath()

test.describe('WelcomeView E2E', () => {
  let electronApp

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [path.resolve('.'), '--no-sandbox', '--disable-gpu', '--disable-setuid-sandbox'],
      executablePath: electronPath,
      env: { ...process.env, REVEL_E2E: '1', NODE_ENV: 'test' }
    })
  })

  test.afterAll(async () => {
    if (electronApp) {
      // Force quit Electron app before closing Playwright connection
      try {
        await electronApp.evaluate(async ({ app }) => {
          app.exit(0)
        })
      } catch {}
      // Don't wait for graceful close on macOS
      try {
        electronApp.process().kill('SIGKILL')
      } catch {}
    }
  })

  test('should display welcome screen with mock mole installed', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForLoadState('networkidle')
    await window.waitForTimeout(1000)

    await expect(window.locator('text=欢迎使用 Revel')).toBeVisible()
    await expect(window.locator('text=Mole CLI 已安装')).toBeVisible()
  })
})
