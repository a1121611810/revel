/**
 * Playwright script to capture screenshots of the Revel renderer
 * running in the Vite dev server with injected Electron API mock.
 *
 * Usage: node scripts/screenshots.mjs
 * Requires: Vite + Playwright deps (they're in devDependencies)
 *
 * The script starts a Vite dev server, injects a complete
 * window.electronAPI mock via addInitScript (avoiding JSON.stringify
 * which strips functions), loads the app in headless Chromium,
 * and takes screenshots of each view in both English and Chinese.
 */

import { chromium } from 'playwright'
import { createServer } from 'vite'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const SCREENSHOTS_DIR = path.resolve(root, 'docs', 'screenshots')

const MOCK_CLEAN = `➤ User essentials
  → User app cache 94 items, 3.80GB dry
  → User app logs 11 items, 243KB dry
  ✓ Trash \u00b7 already empty
\u279e App caches
  \u2192 Wallpaper agent cache, 428.7MB dry
  \u2192 Media analysis cache 4 items, 456.4MB dry
\u279e Browsers
  \u2192 GoogleUpdater CRX cache, 1KB dry`

const MOCK_ANALYZE = JSON.stringify({
  total_size: 23622320128,
  entries: [
    { name: 'Applications', path: '/Applications', size: 10737418240, is_dir: true, insight: true },
    { name: 'User Library', path: '/Users/test/Library', size: 8589934592, is_dir: true },
    { name: 'Downloads', path: '/Users/test/Downloads', size: 4294967296, is_dir: true },
  ],
})

const MOCK_STATUS = JSON.stringify({
  hardware: { cpu_model: 'Apple M4', os_version: '15.1' },
  cpu: { usage: 15.2, core_count: 10, per_core: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  memory: { used: 17179869184, total: 34359738368, used_percent: 50 },
  disks: [{ used: 377487360000, total: 494384795648, used_percent: 76 }],
  batteries: [{ percent: 85, status: 'discharging', time_left: '8:30' }],
  network: [{ rx_rate_mbs: 2.5, tx_rate_mbs: 0.8 }],
  gpu: [{ name: 'Apple M4', usage: 10, memory_used: 2147483648, memory_total: 8589934592 }],
  uptime_seconds: 7200, uptime: '2:00:00', health_score: 90, health_score_msg: 'Excellent',
})

const MOCK_UNINSTALL = JSON.stringify([
  { name: 'Test App', bundle_id: 'com.test', source: 'App', path: '/Applications/Test.app', size: '100MB' },
  { name: 'Another App', bundle_id: 'com.another', source: 'Homebrew', path: '/opt/homebrew/Another.app', size: '250MB' },
])

const MOCK_PURGE = `Scanning for projects...
[DEBUG] [DRY RUN] Would remove:   * /project/node_modules, 1.5GB, 37 days old
[DEBUG] [DRY RUN] Would remove:   * /project/target, 500MB, 12 days old`

const MOCK_INSTALLER = `[DEBUG] Found installer:   * /Users/test/Downloads/test.dmg
[DEBUG] Found installer:   * /Users/test/Downloads/other.pkg`

/**
 * Generate a complete init script as a JS string.
 * We build it as raw JS source so that functions survive
 * (unlike JSON.stringify which strips them).
 */
function buildInitScript(locale) {
  const mockClean = JSON.stringify(MOCK_CLEAN)
  const mockAnalyze = JSON.stringify(MOCK_ANALYZE)
  const mockStatus = JSON.stringify(MOCK_STATUS)
  const mockUninstall = JSON.stringify(MOCK_UNINSTALL)
  const mockPurge = JSON.stringify(MOCK_PURGE)
  const mockInstaller = JSON.stringify(MOCK_INSTALLER)
  const lang = locale === 'zh-CN' ? 'zh-CN' : 'en-US'

  return `
// ── Revel screenshot: electronAPI mock (${lang}) ──
localStorage.setItem('revel-language','${lang}');
localStorage.setItem('revel-welcomed','1');

window.electronAPI = {
  moleExec: async function(c,a){
    var s=(a||[]).join(' ');
    if(s.includes('status')) return {stdout:${mockStatus},stderr:'',code:0,success:true};
    if(s.includes('clean')) return {stdout:${mockClean},stderr:'',code:0,success:true};
    if(s.includes('analyze')) return {stdout:${mockAnalyze},stderr:'',code:0,success:true};
    if(s.includes('uninstall')) return {stdout:${mockUninstall},stderr:'',code:0,success:true};
    if(s.includes('--version')) return {stdout:'1.0.0',stderr:'',code:0,success:true};
    return {stdout:'',stderr:'',code:0,success:true};
  },
  moleExecSudo: async function(c,a){
    var s=(a||[]).join(' ');
    if(s.includes('status')) return {stdout:${mockStatus},stderr:'',code:0,success:true};
    if(s.includes('clean')) return {stdout:${mockClean},stderr:'',code:0,success:true};
    if(s.includes('analyze')) return {stdout:${mockAnalyze},stderr:'',code:0,success:true};
    if(s.includes('purge')) return {stdout:${mockPurge},stderr:'',code:0,success:true};
    if(s.includes('installer')) return {stdout:${mockInstaller},stderr:'',code:0,success:true};
    return {stdout:'',stderr:'',code:0,success:true};
  },
  moleCancel:function(){},
  sendPassword:function(){},
  onMoleOutput:function(){},
  getPlatform:async function(){return'darwin';},
  getLocale:async function(){return'${lang}';},
  checkMoleInstalled:async function(){return{installed:true,version:'1.0.0'};},
  getAppVersion:async function(){return'1.0.0';},
  showDialog:async function(){return{response:0};},
  openExternal:function(){},
  checkForUpdates:async function(){return{hasUpdate:false,latestVersion:'1.0.0',currentVersion:'1.0.0'};},
  setAutoLaunch:async function(){return{success:true};},
  getAutoLaunch:async function(){return{enabled:false};},
  setAppLocale:async function(){return{success:true};},
  getMenuBarEnabled:async function(){return false;},
  setMenuBarEnabled:async function(){return{success:true};},
  getMenuBarConfig:async function(){return{enabled:false,tray:{},popup:{}};},
  setMenuBarConfig:async function(){return{success:true};},
  setTheme:async function(){return{success:true};},
  ensureSudo:async function(){return{success:true};},
  getSudoCacheStatus:async function(){return{valid:true};},
  saveSudoPassword:async function(){return{success:true};},
  hasSudoPassword:async function(){return{has:false};},
  clearSudoPassword:async function(){return{success:true};},
  onSystemStatus:function(){},
  startStatusMonitor:function(){},
  stopStatusMonitor:function(){},
  removeSystemStatusListener:function(){},
};
console.log('[Mock] electronAPI for ${lang}');
`.trim()
}

async function capture(page, name) {
  const fp = path.join(SCREENSHOTS_DIR, `${name}.png`)
  await page.screenshot({ path: fp, type: 'png' })
  console.log('  \u2713 ' + name + '.png')
}

async function navigate(page, locale) {
  const startBtn = page.locator('text=' + (locale === 'zh-CN' ? '\u5f00\u59cb\u4f7f\u7528' : 'Get Started'))
  if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await startBtn.click()
    await page.waitForTimeout(1500)
  }
}

const VIEWS_EN = [
  ['Cleanup', 'en-clean'], ['Analyze', 'en-analyze'], ['Status', 'en-status'],
  ['Uninstall', 'en-uninstall'], ['Optimize', 'en-optimize'],
  ['Project Cleanup', 'en-purge'], ['Installers', 'en-installer'], ['Settings', 'en-settings'],
]

const VIEWS_ZH = [
  ['\u6e05\u7406', 'zh-clean'], ['\u5206\u6790', 'zh-analyze'], ['\u72b6\u6001', 'zh-status'],
  ['\u5378\u8f7d', 'zh-uninstall'], ['\u4f18\u5316', 'zh-optimize'],
  ['\u9879\u76ee\u6e05\u7406', 'zh-purge'], ['\u5b89\u88c5\u5305', 'zh-installer'], ['\u8bbe\u7f6e', 'zh-settings'],
]

async function captureViews(page, views, locale) {
  await navigate(page, locale)
  for (const [tab, file] of views) {
    const btn = page.getByRole('tab', { name: tab, exact: true })
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click()
      await page.waitForTimeout(1000)
    }
    await capture(page, file)
  }
}

async function main() {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  console.log('=== Revel Screenshots ===\n')

  console.log('Starting Vite...')
  const server = await createServer({
    configFile: path.resolve(root, 'vite.renderer.config.js'),
    mode: 'development',
    server: { port: 5173, strictPort: false },
  })
  await server.listen()
  const url = server.resolvedUrls.local[0]
  console.log('Dev server: ' + url + '\n')

  const browser = await chromium.launch({ headless: true })

  try {
    // EN
    console.log('[1/2] English...')
    const ctx1 = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })
    const p1 = await ctx1.newPage()
    await p1.addInitScript({ content: buildInitScript('en-US') })
    await p1.goto(url, { waitUntil: 'networkidle' })
    await p1.waitForTimeout(2500)
    await captureViews(p1, VIEWS_EN, 'en-US')
    await ctx1.close()

    // ZH
    console.log('\n[2/2] Chinese...')
    const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })
    const p2 = await ctx2.newPage()
    await p2.addInitScript({ content: buildInitScript('zh-CN') })
    await p2.goto(url, { waitUntil: 'networkidle' })
    await p2.waitForTimeout(2500)
    await captureViews(p2, VIEWS_ZH, 'zh-CN')
    await ctx2.close()
  } finally {
    await browser.close()
    await server.close()
  }

  const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'))
  console.log('\nDone — ' + files.length + ' screenshots in ' + SCREENSHOTS_DIR)
  files.forEach(f => console.log('  ' + f))
}

main().catch(err => { console.error('FAILED:', err); process.exit(1) })
