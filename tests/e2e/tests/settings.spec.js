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

test.describe('SettingsView E2E', () => {
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

  test('should navigate to settings view', async () => {
    const window = await electronApp.firstWindow()

    await window.locator('text=开始使用').click()
    await window.waitForTimeout(500)

    await window.locator('text=设置').click()
    await window.waitForTimeout(500)

    await expect(window.getByRole('heading', { name: '设置', exact: true })).toBeVisible()
  })

  test('settings section icons should be visible', async () => {
    const window = await electronApp.firstWindow()

    await window.locator('text=开始使用').click()
    await window.waitForTimeout(500)

    await window.locator('text=设置').click()
    await window.waitForTimeout(500)

    // Verify each settings card has a visible icon
    const cardHeaders = await window.locator('.card-header').all()
    expect(cardHeaders.length).toBeGreaterThanOrEqual(1)

    for (const header of cardHeaders) {
      const icon = header.locator('.card-header-icon svg')
      await expect(icon).toBeVisible()
    }
  })
})
