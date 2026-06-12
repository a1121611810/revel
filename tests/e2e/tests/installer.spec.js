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

test.describe('InstallerView E2E', () => {
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

  test('should navigate to installer view', async () => {
    const window = await electronApp.firstWindow()

    await window.locator('text=开始使用').click()
    await window.waitForTimeout(500)

    await window.locator('text=安装包').click()
    await window.waitForTimeout(500)

    await expect(window.getByRole('heading', { name: '安装包' })).toBeVisible()
  })

  test('should scan and display installer packages', async () => {
    const window = await electronApp.firstWindow()

    await window.locator('text=开始使用').click()
    await window.waitForTimeout(500)

    await window.locator('text=安装包').click()
    await window.waitForTimeout(500)

    // Click scan button
    await window.getByRole('button', { name: '扫描' }).click()
    await window.waitForTimeout(2000)

    // Verify installer list appears with mock data
    await expect(window.locator('.installer-item')).toHaveCount(2)
    await expect(window.getByText('test.dmg', { exact: true })).toBeVisible()
    await expect(window.getByText('other.pkg', { exact: true })).toBeVisible()
  })
})
