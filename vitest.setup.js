import { config } from '@vue/test-utils'
import { vi } from 'vitest'
import { createI18n } from 'vue-i18n'
import zhCN from './src/renderer/src/locales/zh-CN.json'
import enUS from './src/renderer/src/locales/en-US.json'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  },
  globalInjection: true
})

config.global.plugins = [i18n]

if (typeof window !== 'undefined') {
  // 全局 mock electronAPI
  window.electronAPI = {
    moleExec: vi.fn(() => Promise.resolve({ stdout: "", stderr: "", code: 0, success: true })),
    moleExecSudo: vi.fn(() => Promise.resolve({ stdout: "", stderr: "", code: 0, success: true })),
    onMoleOutput: vi.fn(),
    removeMoleOutputListener: vi.fn(),
    getPlatform: vi.fn(() => Promise.resolve("darwin")),
    openExternal: vi.fn(),
    showDialog: vi.fn(),
    checkForUpdates: vi.fn(() => Promise.resolve({ hasUpdate: false, latestVersion: "1.0.0", currentVersion: "1.0.0" })),
    getAppVersion: vi.fn(() => Promise.resolve("1.0.0")),
    setAutoLaunch: vi.fn(() => Promise.resolve({ success: true })),
    getAutoLaunch: vi.fn(() => Promise.resolve({ enabled: false })),
    checkMoleInstalled: vi.fn(() => Promise.resolve({ installed: true, version: "1.0.0" })),
    startStatusMonitor: vi.fn(),
    stopStatusMonitor: vi.fn(),
    onSystemStatus: vi.fn(),
    removeSystemStatusListener: vi.fn(),
    saveSudoPassword: vi.fn(),
    hasSudoPassword: vi.fn(),
    clearSudoPassword: vi.fn(),
    ensureSudo: vi.fn(() => Promise.resolve({ success: true })),
    getSudoCacheStatus: vi.fn(() => Promise.resolve({ valid: true })),
  }

  // 全局 Vue 配置
  config.global.stubs = {
    // 默认 stub fluent ui web components
    'fluent-button': true,
    'fluent-card': true,
    'fluent-text-field': true,
    'fluent-progress': true,
    'fluent-progress-ring': true,
    'fluent-checkbox': true,
    'fluent-divider': true,
    'fluent-badge': true,
    'fluent-accordion': true,
    'fluent-accordion-item': true,
    'fluent-tab': true,
    'fluent-tabs': true,
    'fluent-tab-panel': true,
    'fluent-tooltip': true,
    'fluent-dialog': true,
    'fluent-tree-view': true,
    'fluent-tree-item': true,
    'fluent-select': true,
    'fluent-option': true,
    'fluent-menu': true,
    'fluent-menu-item': true,
    'fluent-switch': true,
    'fluent-slider': true,
    'fluent-radio-group': true,
    'fluent-radio': true
  }

  window.matchMedia = window.matchMedia || vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}
