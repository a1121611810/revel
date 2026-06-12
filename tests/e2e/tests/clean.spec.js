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

test.describe('CleanView E2E', () => {
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
      try { await electronApp.evaluate(async ({ app }) => { app.exit(0) }) } catch {}
      try { electronApp.process().kill('SIGKILL') } catch {}
    }
  })

  test('should navigate to clean view', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForLoadState('networkidle')
    await window.waitForTimeout(1000)

    // Click start button on welcome screen
    await window.locator('text=开始使用').click()
    await window.waitForTimeout(500)

    // Navigate to clean view via sidebar
    await window.getByRole('tab', { name: '清理', exact: true }).click()
    await window.waitForTimeout(500)

    await expect(window.getByRole('heading', { name: '清理', exact: true })).toBeVisible()
  })
})
