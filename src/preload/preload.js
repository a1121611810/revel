const { contextBridge, ipcRenderer } = require("electron");

// Internal Maps to correctly map renderer callbacks to wrapper functions
// This ensures removeListener actually removes the correct listener.
const moleOutputListeners = new Map();
const updateAvailableListeners = new Map();
const systemStatusListeners = new Map();
const menuBarStatusListeners = new Map();

contextBridge.exposeInMainWorld("electronAPI", {
  // Execute mole command
  moleExec: (command, args) => ipcRenderer.invoke("mole-exec", command, args),

  // Execute mole command with sudo
  moleExecSudo: (command, args) => ipcRenderer.invoke("mole-exec-sudo", command, args),

  // Cancel running mole command
  moleCancel: () => ipcRenderer.send("mole-cancel"),

  // Listen for mole output stream
  onMoleOutput: (callback) => {
    if (moleOutputListeners.has(callback)) return;
    const wrapper = (_event, data) => callback(data);
    moleOutputListeners.set(callback, wrapper);
    ipcRenderer.on("mole-output", wrapper);
  },

  // Remove mole output listener
  removeMoleOutputListener: (callback) => {
    const wrapper = moleOutputListeners.get(callback);
    if (wrapper) {
      ipcRenderer.removeListener("mole-output", wrapper);
      moleOutputListeners.delete(callback);
    }
  },

  // Send password to main process for sudo
  sendPassword: (password) => ipcRenderer.send("mole-send-password", password),

  // Save sudo password to safeStorage
  saveSudoPassword: (password) => ipcRenderer.invoke("save-sudo-password", password),

  // Check if sudo password is saved
  hasSudoPassword: () => ipcRenderer.invoke("has-sudo-password"),

  // Clear saved sudo password
  clearSudoPassword: () => ipcRenderer.invoke("clear-sudo-password"),

  // Ensure sudo cache is valid (refresh if needed)
  ensureSudo: () => ipcRenderer.invoke("ensure-sudo"),

  // Check if sudo cache is currently valid (read-only)
  getSudoCacheStatus: () => ipcRenderer.invoke("get-sudo-cache-status"),

  // Get platform
  getPlatform: () => ipcRenderer.invoke("get-platform"),

  // Get locale
  getLocale: () => ipcRenderer.invoke("get-locale"),
  // Set app-level locale (syncs to main process for popup i18n)
  setAppLocale: (locale) => ipcRenderer.invoke("set-app-locale", locale),

  // Open external link
  openExternal: (url) => ipcRenderer.invoke("open-external", url),

  // Show dialog
  showDialog: (options) => ipcRenderer.invoke("show-dialog", options),

  // Check for updates
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),

  // Listen for update available event
  onUpdateAvailable: (callback) => {
    if (updateAvailableListeners.has(callback)) return;
    const wrapper = (_event, data) => callback(data);
    updateAvailableListeners.set(callback, wrapper);
    ipcRenderer.on("update-available", wrapper);
  },

  // Remove update available listener
  removeUpdateAvailableListener: (callback) => {
    const wrapper = updateAvailableListeners.get(callback);
    if (wrapper) {
      ipcRenderer.removeListener("update-available", wrapper);
      updateAvailableListeners.delete(callback);
    }
  },

  // Get app version
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),

  // Set auto launch (开机启动)
  setAutoLaunch: (enabled) => ipcRenderer.invoke("set-auto-launch", enabled),

  // Get auto launch status
  getAutoLaunch: () => ipcRenderer.invoke("get-auto-launch"),

  // Check if mole CLI is installed (used by welcome screen)
  checkMoleInstalled: () => ipcRenderer.invoke("check-mole-installed"),

  // System status monitor (push mode, like WebSocket)
  startStatusMonitor: () => ipcRenderer.send("start-status-monitor"),
  stopStatusMonitor: () => ipcRenderer.send("stop-status-monitor"),
  onSystemStatus: (callback) => {
    if (systemStatusListeners.has(callback)) return;
    const wrapper = (_event, data) => callback(data);
    systemStatusListeners.set(callback, wrapper);
    ipcRenderer.on("system-status", wrapper);
  },
  removeSystemStatusListener: (callback) => {
    const wrapper = systemStatusListeners.get(callback);
    if (wrapper) {
      ipcRenderer.removeListener("system-status", wrapper);
      systemStatusListeners.delete(callback);
    }
  },

  // Menu bar monitor (macOS status bar)
  getMenuBarEnabled: () => ipcRenderer.invoke("get-menu-bar-enabled"),
  setMenuBarEnabled: (enabled) => ipcRenderer.invoke("set-menu-bar-enabled", enabled),
  getMenuBarModules: () => ipcRenderer.invoke("get-menu-bar-modules"),
  setMenuBarModules: (modules) => ipcRenderer.invoke("set-menu-bar-modules", modules),
  /** Get full menu bar config (modules + appearance + theme) */
  getMenuBarConfig: () => ipcRenderer.invoke("get-menu-bar-config"),
  /** Set full menu bar config */
  setMenuBarConfig: (config) => ipcRenderer.invoke("set-menu-bar-config", config),
  /** Notify main process of theme change (for popup sync) */
  setTheme: (themeData) => ipcRenderer.invoke("set-theme", themeData),
  onMenuBarStatus: (callback) => {
    if (menuBarStatusListeners.has(callback)) return;
    const wrapper = (_event, data) => callback(data);
    menuBarStatusListeners.set(callback, wrapper);
    ipcRenderer.on("menu-bar-status", wrapper);
  },
  removeMenuBarStatusListener: (callback) => {
    const wrapper = menuBarStatusListeners.get(callback);
    if (wrapper) {
      ipcRenderer.removeListener("menu-bar-status", wrapper);
      menuBarStatusListeners.delete(callback);
    }
  },
});
