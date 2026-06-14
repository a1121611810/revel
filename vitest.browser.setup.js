import { vi } from 'vitest'

if (typeof window !== 'undefined') {
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
    getAutoLaunch: vi.fn(() => Promise.resolve({ enabled: false, showWindow: false })),
    setAutoLaunchShowWindow: vi.fn(() => Promise.resolve({ success: true })),
    checkMoleInstalled: vi.fn(() => Promise.resolve({ installed: true, version: "1.0.0" })),
    startStatusMonitor: vi.fn(),
    stopStatusMonitor: vi.fn(),
    onSystemStatus: vi.fn(),
    removeSystemStatusListener: vi.fn(),
    saveSudoPassword: vi.fn(),
    hasSudoPassword: vi.fn(),
    clearSudoPassword: vi.fn(),
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
