const { ipcMain } = require("electron");
const fixtures = require("./fixtures");

// Remove existing handlers before registering mocks
const handleNames = [
  "mole-exec",
  "mole-exec-sudo",
  "get-platform",
  "check-mole-installed",
  "get-app-version",
  "show-dialog",
  "save-sudo-password",
  "has-sudo-password",
  "clear-sudo-password",
  "set-auto-launch",
  "get-auto-launch",
  "open-external",
  "check-for-updates",
  "ensure-sudo",
  "get-sudo-cache-status",
  "get-menu-bar-config",
  "set-menu-bar-config",
  "set-theme",
  "set-app-locale",
  "get-dock-config",
  "set-dock-strategy",
  "set-dock-hide-on-auto-launch",
];
handleNames.forEach((h) => {
  try {
    ipcMain.removeHandler(h);
  } catch {
    /* ignore */
  }
});

// Remove existing listeners for event-based channels
const eventNames = ["start-status-monitor", "stop-status-monitor", "navigate-to"];
eventNames.forEach((e) => {
  try {
    ipcMain.removeAllListeners(e);
  } catch {
    /* ignore */
  }
});

// Mock mole-cancel (no-op for E2E tests)
ipcMain.on("mole-cancel", () => {});

// Register mock handlers
ipcMain.handle("mole-exec", async (_e, cmd, args) => fixtures.moleExec(cmd, args));
ipcMain.handle("mole-exec-sudo", async (_e, cmd, args) => fixtures.moleExec(cmd, args));
ipcMain.handle("get-platform", () => "darwin");
ipcMain.handle("check-mole-installed", () => ({ installed: true, version: "1.0.0" }));
ipcMain.handle("get-app-version", () => "1.0.0");
ipcMain.handle("show-dialog", async () => ({ response: 0 }));
ipcMain.handle("save-sudo-password", () => ({ success: true }));
ipcMain.handle("has-sudo-password", () => ({ has: false }));
ipcMain.handle("clear-sudo-password", () => ({ success: true }));
ipcMain.handle("set-auto-launch", () => ({ success: true }));
ipcMain.handle("get-auto-launch", () => ({ enabled: false }));
ipcMain.handle("open-external", () => {});
ipcMain.handle("check-for-updates", () => ({
  hasUpdate: false,
  currentVersion: "1.0.0",
  latestVersion: "1.0.0",
  releaseNotes: "",
  downloadUrl: "",
}));
ipcMain.handle("ensure-sudo", () => ({ success: true }));
ipcMain.handle("get-sudo-cache-status", () => ({ valid: true }));

// Menu bar config mocks
ipcMain.handle("get-menu-bar-config", () => ({
  enabled: false,
  tray: {
    modules: { cpu: true, gpu: true, ram: true, ssd: true },
    layout: "horizontal",
    fontSize: 12,
    spacing: 4,
    separator: "  ",
  },
  popup: {
    modules: { cpu: true, gpu: true, ram: true, ssd: true },
    fontSize: 12,
    spacing: 4,
    moduleColors: { cpu: "#5ac8fa", gpu: "#ff9f0a", ram: "#bf5af2", ssd: "#30d158" },
    rangeColors: { low: "#30d158", mid: "#ff9f0a", high: "#ff453a" },
    thresholds: { mid: 50, high: 80 },
  },
}));
ipcMain.handle("set-menu-bar-config", () => ({ success: true }));
ipcMain.handle("set-theme", () => ({ success: true }));
ipcMain.handle("set-app-locale", () => ({ success: true }));

// Dock icon visibility mocks (macOS only)
ipcMain.handle("get-dock-config", () => ({ hideStrategy: "never", hideOnAutoLaunch: false }));
ipcMain.handle("set-dock-strategy", () => ({ success: true }));
ipcMain.handle("set-dock-hide-on-auto-launch", () => ({ success: true }));

// Simulate system-status push
let statusTimer = null;
ipcMain.on("start-status-monitor", (event) => {
  const send = () => {
    event.sender.send("system-status", {
      ...fixtures.status,
      platform: "darwin",
      osVersion: "15.1",
      mole: { ...fixtures.status },
      native: {},
    });
  };
  send();
  statusTimer = setInterval(send, 1000);
});
ipcMain.on("stop-status-monitor", () => {
  if (statusTimer) {
    clearInterval(statusTimer);
    statusTimer = null;
  }
});

console.log("[E2E] Mock IPC handlers loaded");
