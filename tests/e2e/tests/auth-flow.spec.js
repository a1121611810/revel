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

test.describe('Auth Flow E2E', () => {
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

  test.beforeEach(async () => {
    const window = await electronApp.firstWindow()
    await window.evaluate(() => {
      localStorage.removeItem('revel-welcomed')
    })
    await window.reload()
    await window.waitForLoadState('networkidle')
    await window.waitForTimeout(1000)
  })

  test('settings view should show permissions section', async () => {
    const window = await electronApp.firstWindow()

    await window.locator('text=开始使用').click()
    await window.waitForTimeout(500)

    await window.locator('text=设置').click()
    await window.waitForTimeout(500)

    // Verify permissions section heading is visible
    await expect(window.getByRole('heading', { name: '权限与授权', exact: true })).toBeVisible()

    // Verify module permission items exist
    const moduleItems = await window.locator('.auth-module-item').all()
    expect(moduleItems.length).toBe(4)
  })

  test('clean view should work without auth dialog in E2E mode', async () => {
    const window = await electronApp.firstWindow()

    await window.locator('text=开始使用').click()
    await window.waitForTimeout(500)

    await window.locator('text=清理').click()
    await window.waitForTimeout(500)

    // In E2E mode, ensureSudo always returns success, so no auth error card should appear
    await window.locator('text=开始扫描').click()
    await window.waitForTimeout(500)

    const authErrorCard = window.locator('.auth-error-card')
    await expect(authErrorCard).toHaveCount(0)
  })
})
