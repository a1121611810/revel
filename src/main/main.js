const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  safeStorage,
  nativeImage,
  Menu,
  protocol,
  session,
} = require("electron");
const { spawn, exec, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

// Fix PATH for GUI-launched apps on macOS
// GUI apps don't inherit shell profile PATH, so Homebrew bins (e.g. /opt/homebrew/bin) are missing
function fixPathForGuiApp() {
  if (process.platform !== "darwin") return;
  try {
    const shellPath = execSync("/bin/bash -lc 'echo $PATH'", { encoding: "utf8" }).trim();
    if (shellPath && shellPath !== process.env.PATH) {
      process.env.PATH = shellPath;
    }
  } catch {
    // Fallback: append common Homebrew paths if shell query fails
    const fallbackPaths = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/local/sbin"];
    const currentPaths = (process.env.PATH || "").split(":").filter(Boolean);
    for (const p of fallbackPaths) {
      if (!currentPaths.includes(p)) {
        currentPaths.push(p);
      }
    }
    process.env.PATH = currentPaths.join(":");
  }
}
fixPathForGuiApp();

// Single instance lock: prevent multiple Revel processes and duplicate Dock icons
(function initSingleInstance() {
  // Skip single instance lock in E2E test mode to allow test instances alongside installed app
  if (process.env.REVEL_E2E === "1") return;

  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
    return;
  }

  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
})();

// Set quitting flag so the close event handler allows actual quit on Dock → Quit
app.on("before-quit", () => {
  app.isQuiting = true;
});

// Global error handlers — prevent unhandled errors from crashing the app
process.on("uncaughtException", (err) => {
  console.error("[Main] Uncaught exception:", err.message, err.stack);
});
process.on("unhandledRejection", (reason) => {
  console.error("[Main] Unhandled rejection:", reason);
});

const { StatusMonitor } = require("./status-monitor");
const { MenuBarMonitor } = require("./menu-bar-monitor");

// Register app:// as a privileged scheme before app ready
// This enables localStorage, sessionStorage, fetch, and other standard web APIs
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      allowServiceWorkers: true,
      supportFetchAPI: true,
    },
  },
]);

// Fix Playwright + Electron 42 compatibility: explicitly register
// the remote debugging port switch so Playwright can connect via DevTools
// protocol. Without this, --remote-debugging-port=0 as a CLI arg is silently
// ignored by Electron 30+, causing "socket hang up" in Playwright tests.
app.commandLine.appendSwitch("remote-debugging-port", "0");

let mainWindow = null;
let statusMonitor = null;
let menuBarMonitor = null;

function getStatusMonitor() {
  if (!statusMonitor) {
    statusMonitor = new StatusMonitor(() => mainWindow, getMolePath);
  }
  return statusMonitor;
}

function getMenuBarMonitor() {
  if (!menuBarMonitor) {
    menuBarMonitor = new MenuBarMonitor(() => mainWindow, getMolePath, getAppLocale);
  }
  return menuBarMonitor;
}

// ──────────────────────────
// Menu bar monitor config persistence
// ──────────────────────────

function getMenuBarConfigPath() {
  const userDataPath = app.getPath("userData");
  if (!userDataPath || typeof userDataPath !== "string") return null;
  return path.join(userDataPath, "menu-bar-config.json");
}

const MENU_BAR_CONFIG_DEFAULTS = {
  enabled: false,
  theme: { id: "fluent-dark", isDark: true },
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
    moduleColors: {
      cpu: "#5ac8fa",
      gpu: "#ff9f0a",
      ram: "#bf5af2",
      ssd: "#30d158",
    },
    rangeColors: {
      low: "#30d158",
      mid: "#ff9f0a",
      high: "#ff453a",
    },
    thresholds: {
      mid: 50,
      high: 80,
    },
  },
};

function loadMenuBarConfig() {
  try {
    const p = getMenuBarConfigPath();
    if (p && fs.existsSync(p)) {
      const disk = JSON.parse(fs.readFileSync(p, "utf8"));
      // Migrate old flat config to new tray/popup structure
      const oldModules = disk.modules || {};
      // Migrate layout from old popup.layout or flat disk.layout to tray.layout
      var migratedTrayLayout =
        (disk.tray && disk.tray.layout) ||
        (disk.popup && disk.popup.layout) ||
        disk.layout ||
        MENU_BAR_CONFIG_DEFAULTS.tray.layout;
      // Normalize old "compact" layout to "horizontal" (compact was removed)
      if (migratedTrayLayout === "compact") migratedTrayLayout = "horizontal";
      return {
        enabled: disk.enabled != null ? disk.enabled : MENU_BAR_CONFIG_DEFAULTS.enabled,
        theme: { ...MENU_BAR_CONFIG_DEFAULTS.theme, ...(disk.theme || {}) },
        tray: {
          ...MENU_BAR_CONFIG_DEFAULTS.tray,
          ...(disk.tray || {}),
          layout: migratedTrayLayout,
          modules: {
            ...MENU_BAR_CONFIG_DEFAULTS.tray.modules,
            ...((disk.tray && disk.tray.modules) || oldModules),
          },
        },
        popup: {
          ...MENU_BAR_CONFIG_DEFAULTS.popup,
          ...(disk.popup || {}),
          modules: {
            ...MENU_BAR_CONFIG_DEFAULTS.popup.modules,
            ...((disk.popup && disk.popup.modules) || oldModules),
          },
          moduleColors: {
            ...MENU_BAR_CONFIG_DEFAULTS.popup.moduleColors,
            ...((disk.popup && disk.popup.moduleColors) || disk.moduleColors || {}),
          },
          rangeColors: {
            ...MENU_BAR_CONFIG_DEFAULTS.popup.rangeColors,
            ...((disk.popup && disk.popup.rangeColors) || disk.rangeColors || {}),
          },
          thresholds: {
            ...MENU_BAR_CONFIG_DEFAULTS.popup.thresholds,
            ...((disk.popup && disk.popup.thresholds) || disk.thresholds || {}),
          },
        },
      };
    }
  } catch {
    // ignore
  }
  const D = MENU_BAR_CONFIG_DEFAULTS;
  return {
    enabled: D.enabled,
    theme: { ...D.theme },
    tray: { ...D.tray, modules: { ...D.tray.modules } },
    popup: {
      ...D.popup,
      modules: { ...D.popup.modules },
      moduleColors: { ...D.popup.moduleColors },
      rangeColors: { ...D.popup.rangeColors },
      thresholds: { ...D.popup.thresholds },
    },
  };
}

function saveMenuBarConfig(config) {
  try {
    const p = getMenuBarConfigPath();
    if (p) fs.writeFileSync(p, JSON.stringify(config), "utf8");
  } catch {
    // ignore
  }
}

// ──────────────────────────────────────────────────────
// Auto-launch config persistence (showWindow preference)
// ──────────────────────────────────────────────────────

function getAutoLaunchConfigPath() {
  const userDataPath = app.getPath("userData");
  if (!userDataPath || typeof userDataPath !== "string") return null;
  return path.join(userDataPath, "auto-launch-config.json");
}

const AUTO_LAUNCH_CONFIG_DEFAULTS = {
  showWindow: false,
};

function loadAutoLaunchConfig() {
  try {
    const p = getAutoLaunchConfigPath();
    if (p && fs.existsSync(p)) {
      const disk = JSON.parse(fs.readFileSync(p, "utf8"));
      return {
        ...AUTO_LAUNCH_CONFIG_DEFAULTS,
        ...disk,
      };
    }
  } catch {
    // ignore
  }
  return { ...AUTO_LAUNCH_CONFIG_DEFAULTS };
}

function saveAutoLaunchConfig(config) {
  try {
    const p = getAutoLaunchConfigPath();
    if (p) fs.writeFileSync(p, JSON.stringify(config), "utf8");
  } catch {
    // ignore
  }
}

// ──────────────────────────
// Security helpers
// ──────────────────────────

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  ".map": "application/json",
};

function getMimeType(ext) {
  return MIME_TYPES[ext] || "application/octet-stream";
}

function validateSender(frame) {
  if (process.env.REVEL_E2E === "1") return true;
  if (!frame || !frame.url) return false;
  try {
    const url = new URL(frame.url);
    if (url.protocol === "app:") return true;
    if (url.protocol === "http:" && url.hostname === "localhost") return true;
    return false;
  } catch {
    return false;
  }
}

function validateExternalUrl(urlString) {
  try {
    const url = new URL(urlString);
    if (url.protocol === "https:") return true;
    return false;
  } catch {
    return false;
  }
}

// ──────────────────────────
// Mole path cache
// ──────────────────────────

let cachedMolePath = null;

function clearMolePathCache() {
  cachedMolePath = null;
}

// ──────────────────────────
// Tray (reserved)
// ──────────────────────────

const TRAY_LABELS = {
  "zh-CN": { show: "显示 Revel", hide: "隐藏 Revel", settings: "设置", quit: "退出" },
  "en-US": { show: "Show Revel", hide: "Hide Revel", settings: "Settings", quit: "Quit" },
};

// eslint-disable-next-line no-unused-vars
function getTrayLabels() {
  const locale = app.getLocale();
  const normalized = (locale || "").toLowerCase().replace(/_/g, "-");
  return normalized.startsWith("zh") ? TRAY_LABELS["zh-CN"] : TRAY_LABELS["en-US"];
}

// let tray = null
// const BLANK_ICON_PNG = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAABxpRE9UAAAAAgAAAAAAAAAIAAAAKAAAAAgAAAAIAAAARj7EUwAAABJJREFUOE9j/P///38GMgALMwMAtT0XwQg+4QsAAAAASUVORK5CYII='
// function buildTrayMenu() {
//   const labels = getTrayLabels();
//   return Menu.buildFromTemplate([
//     { label: labels.show, click: () => { if (mainWindow) { mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show() } } },
//     { label: labels.settings, click: () => { if (mainWindow) { mainWindow.show(); mainWindow.webContents.send('navigate-to', 'settings') } } },
//     { type: 'separator' },
//     { label: labels.quit, click: () => { app.quit() } }
//   ])
// }

function createWindow(hidden = false) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 14, y: 12 },
    vibrancy: "sidebar",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadURL("app://index.html");
  }

  mainWindow.once("ready-to-show", () => {
    if (!hidden) {
      mainWindow.show();
    }
    if (process.env.VITE_DEV_SERVER_URL) {
      mainWindow.webContents.openDevTools();
    }
  });

  // 窗口关闭时隐藏到托盘，而不是退出应用
  mainWindow.on("close", (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  // Register custom protocol for production builds
  protocol.handle("app", (request) => {
    try {
      const urlPath = new URL(request.url).pathname;
      const basePath = path.resolve(__dirname, "../renderer");
      const targetPath = path.join(basePath, urlPath || "index.html");

      // Prevent path traversal attacks
      if (!targetPath.startsWith(basePath)) {
        return new Response("Forbidden", { status: 403 });
      }

      let filePath = targetPath;
      if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
        filePath = path.join(targetPath, "index.html");
      }

      if (!fs.existsSync(filePath)) {
        // SPA fallback: try index.html
        filePath = path.join(basePath, "index.html");
        if (!fs.existsSync(filePath)) {
          return new Response("Not Found", { status: 404 });
        }
      }

      const ext = path.extname(filePath);
      const mimeType = getMimeType(ext);
      const data = fs.readFileSync(filePath);

      return new Response(data, {
        headers: { "content-type": mimeType },
      });
    } catch (err) {
      console.error("[Protocol] Error serving", request.url, err.message);
      return new Response("Internal Server Error", { status: 500 });
    }
  });

  // Deny all permission requests by default
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  // Set custom Dock icon in dev mode (macOS Dock renders dev icons larger
  // than native apps — this is an Electron platform limitation, see
  // electron-builder #7845. Production .app bundles use Info.plist + ICNS.)
  if (process.env.VITE_DEV_SERVER_URL) {
    try {
      const icon = nativeImage.createEmpty();
      icon.addRepresentation({
        scaleFactor: 1,
        width: 64,
        height: 64,
        buffer: fs.readFileSync(path.join(__dirname, "../../build/icon_64.png")),
      });
      icon.addRepresentation({
        scaleFactor: 2,
        width: 128,
        height: 128,
        buffer: fs.readFileSync(path.join(__dirname, "../../build/icon_128.png")),
      });
      app.dock.setIcon(icon);
    } catch {
      // Ignore if icon files not found during dev
    }
  }

  // 判断是否开机自动启动且用户未选择显示主界面
  const loginSettings = app.getLoginItemSettings();
  const autoLaunchConfig = loadAutoLaunchConfig();
  const wasAutoLaunched = loginSettings.wasOpenedAtLogin;
  const shouldHideWindow = wasAutoLaunched && !autoLaunchConfig.showWindow;

  createWindow(shouldHideWindow);

  // Auto-start menu bar monitor if previously enabled (macOS only)
  if (process.platform === "darwin") {
    const menuBarConfig = loadMenuBarConfig();
    console.log("[Main] menu bar config on startup:", JSON.stringify(menuBarConfig));
    // Save migrated config to disk (ensures new tray/popup structure is persisted)
    saveMenuBarConfig(menuBarConfig);
    if (menuBarConfig.enabled) {
      console.log("[Main] Auto-starting menu bar monitor");
      getMenuBarMonitor().start(menuBarConfig);
    }
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      // macOS: 点击 dock 图标重新显示窗口
      if (mainWindow) mainWindow.show();
    }
  });
});

// Block all navigation attempts and new window creation
app.on("web-contents-created", (_event, contents) => {
  contents.on("will-navigate", (event, _navigationUrl) => {
    event.preventDefault();
  });

  contents.setWindowOpenHandler(({ url }) => {
    if (url && validateExternalUrl(url)) {
      setImmediate(() => shell.openExternal(url));
    }
    return { action: "deny" };
  });
});

// 窗口关闭时不退出应用，而是隐藏到托盘（macOS 习惯）
app.on("window-all-closed", (_event) => {
  // macOS 上默认不退出，除非在托盘菜单中选择退出
  if (process.platform === "darwin") {
    // 在 macOS 上阻止默认行为，应用保持运行
    return;
  }
  // Windows/Linux 上也默认隐藏到托盘而非退出
  // 如需直接退出，可取消注释: app.quit()
});

// Async wrapper for exec
function execAsync(command, options) {
  return new Promise((resolve, reject) => {
    exec(command, options || { encoding: "utf8" }, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout: stdout || "", stderr: stderr || "" });
    });
  });
}

// Check if mole is installed and return its path (cached)
async function getMolePath() {
  if (cachedMolePath !== null) return cachedMolePath;
  try {
    const { stdout } = await execAsync("which mo", { encoding: "utf8" });
    cachedMolePath = stdout.trim();
    return cachedMolePath;
  } catch {
    cachedMolePath = "";
    return "";
  }
}

// 当前运行的 mole 进程（用于取消）
let pendingMoleChild = null;

// IPC: Execute mole command (async with streaming output)
ipcMain.handle("mole-exec", async (event, command, args = []) => {
  if (!validateSender(event.senderFrame)) {
    throw new Error("Invalid sender");
  }

  const molePath = await getMolePath();
  if (!molePath) {
    throw new Error("未检测到 Mole CLI，请先安装：brew install tw93/tap/mole");
  }

  const cmd = command === "mole" || command === "mo" ? molePath : command;
  const allArgs = Array.isArray(args) ? args : [];

  console.log(`[MOLE] Executing: ${cmd} ${allArgs.join(" ")}`);

  return new Promise((resolve, reject) => {
    const child = spawn(cmd, allArgs, {
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    pendingMoleChild = child;

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      const chunk = data.toString();
      stdout += chunk;
      event.sender.send("mole-output", { type: "stdout", data: chunk });
    });

    child.stderr.on("data", (data) => {
      const chunk = data.toString();
      stderr += chunk;
      event.sender.send("mole-output", { type: "stderr", data: chunk });
    });

    child.on("close", (code) => {
      pendingMoleChild = null;
      resolve({
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success: code === 0,
      });
    });

    child.on("error", (err) => {
      pendingMoleChild = null;
      reject(err);
    });
  });
});

// 当前等待密码的 sudo 进程
let pendingSudoChild = null;

// IPC: Execute mole command with sudo (using sudo -S for real-time output)
ipcMain.handle("mole-exec-sudo", async (event, command, args = []) => {
  if (!validateSender(event.senderFrame)) {
    throw new Error("Invalid sender");
  }

  const molePath = await getMolePath();
  if (!molePath) {
    throw new Error("未检测到 Mole CLI，请先安装：brew install tw93/tap/mole");
  }

  const cmd = command === "mole" || command === "mo" ? molePath : command;
  const allArgs = Array.isArray(args) ? args : [];

  return new Promise((resolve, reject) => {
    const child = spawn("sudo", ["-E", "-S", cmd, ...allArgs], {
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    pendingSudoChild = child;

    let stdout = "";
    let stderr = "";
    let authAborted = false;

    child.stdout.on("data", (data) => {
      const chunk = data.toString();
      stdout += chunk;
      event.sender.send("mole-output", { type: "stdout", data: chunk });
    });

    child.stderr.on("data", (data) => {
      const chunk = data.toString();
      stderr += chunk;

      // Detect sudo password prompt and request from renderer
      if (chunk.includes("Password:")) {
        // Try auto-fill from safeStorage first
        try {
          const encrypted = getSudoPasswordEncrypted();
          if (encrypted) {
            const password = safeStorage.decryptString(Buffer.from(encrypted, "base64"));
            if (
              password &&
              pendingSudoChild &&
              pendingSudoChild.stdin &&
              !pendingSudoChild.stdin.destroyed
            ) {
              pendingSudoChild.stdin.write(password + "\n");
              console.log("[MOLE-SUDO] Auto-filled password from safeStorage");
              return;
            }
          }
        } catch (err) {
          console.log("[MOLE-SUDO] safeStorage auto-fill failed:", err.message);
        }
        // Auto-fill failed — request password from renderer via password dialog
        console.log("[MOLE-SUDO] Requesting password from renderer");
        event.sender.send("mole-output", { type: "password-request" });
        return;
      }

      event.sender.send("mole-output", { type: "stderr", data: chunk });
    });

    child.on("close", (code) => {
      pendingSudoChild = null;
      const trimmedStdout = stdout.trim();
      console.log(
        `[MOLE-SUDO] code=${code}, stdout_len=${trimmedStdout.length}, stderr="${stderr.trim()}"`,
      );

      if (authAborted) {
        resolve({
          code,
          stdout: trimmedStdout,
          stderr: stderr.trim(),
          success: false,
          errorKey: "auth.required",
          fallback: "需要管理员授权",
        });
        return;
      }

      const trimmedStderr = stderr.trim();
      if (
        trimmedStderr.includes("incorrect password") ||
        trimmedStderr.includes("Sorry, try again")
      ) {
        resolve({
          code,
          stdout: trimmedStdout,
          stderr: trimmedStderr,
          success: false,
          errorKey: "auth.invalidPassword",
          fallback: "密码错误，可能已更改",
        });
        return;
      }

      resolve({
        code,
        stdout: trimmedStdout,
        stderr: trimmedStderr,
        success: code === 0,
      });
    });

    child.on("error", (err) => {
      pendingSudoChild = null;
      console.log(`[MOLE-SUDO] error="${err.message}"`);
      reject(err);
    });
  });
});
// IPC: Cancel running mole command
ipcMain.on("mole-cancel", () => {
  const child = pendingMoleChild || pendingSudoChild;
  if (child && !child.killed) {
    child.kill();
    console.log("[MOLE] Cancelled running process");
  }
  pendingMoleChild = null;
  pendingSudoChild = null;
});

// IPC: Receive password from renderer and feed to sudo stdin
ipcMain.on("mole-send-password", (event, password) => {
  if (!validateSender(event.senderFrame)) {
    console.warn("[MOLE-SUDO] Blocked password from invalid sender");
    return;
  }
  if (pendingSudoChild && pendingSudoChild.stdin && !pendingSudoChild.stdin.destroyed) {
    pendingSudoChild.stdin.write(password + "\n");
  }
});

// SafeStorage helpers for sudo password
function getSudoPasswordPath() {
  const userDataPath = app.getPath("userData");
  if (!userDataPath || typeof userDataPath !== "string") return null;
  return path.join(userDataPath, "sudo-password.enc");
}
function getSudoPasswordEncrypted() {
  try {
    const p = getSudoPasswordPath();
    if (!p || !fs.existsSync(p)) return null;
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}
function saveSudoPasswordEncrypted(base64) {
  try {
    const p = getSudoPasswordPath();
    if (!p) return false;
    fs.writeFileSync(p, base64, "utf8");
    return true;
  } catch {
    return false;
  }
}
function clearSudoPasswordEncrypted() {
  try {
    const p = getSudoPasswordPath();
    if (!p) return false;
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return true;
  } catch {
    return false;
  }
}

// IPC: Ensure sudo cache is valid, refresh with safeStorage password if needed
async function handleEnsureSudo(event) {
  if (!validateSender(event.senderFrame)) {
    throw new Error("Invalid sender");
  }

  // Windows does not use sudo
  if (process.platform === "win32") {
    return { success: true };
  }

  // Step 1: Quick check if sudo cache is still valid
  try {
    await execAsync("sudo -n true", { timeout: 5000 });
    return { success: true };
  } catch {
    // Cache expired or not present, need to refresh
  }

  // Step 2: Try to refresh with safeStorage password
  const encrypted = getSudoPasswordEncrypted();
  if (!encrypted) {
    return { success: false, errorKey: "auth.noPassword", fallback: "未保存密码" };
  }

  try {
    const password = safeStorage.decryptString(Buffer.from(encrypted, "base64"));
    const child = spawn("sudo", ["-S", "-v"], {
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Write password to stdin
    if (child.stdin && !child.stdin.destroyed) {
      child.stdin.write(password + "\n");
    }

    await new Promise((resolve, reject) => {
      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error("Password verification failed"));
        }
      });
      child.on("error", reject);
    });

    return { success: true };
  } catch {
    return { success: false, errorKey: "auth.invalidPassword", fallback: "密码错误，可能已更改" };
  }
}

ipcMain.handle("ensure-sudo", handleEnsureSudo);

// IPC: Check if sudo cache is currently valid (read-only, no refresh)
async function handleGetSudoCacheStatus(event) {
  if (!validateSender(event.senderFrame)) {
    throw new Error("Invalid sender");
  }
  if (process.platform === "win32") {
    return { valid: true };
  }
  try {
    await execAsync("sudo -n true", { timeout: 5000 });
    return { valid: true };
  } catch {
    return { valid: false };
  }
}

ipcMain.handle("get-sudo-cache-status", handleGetSudoCacheStatus);

// IPC: Save sudo password (encrypted with safeStorage)
ipcMain.handle("save-sudo-password", (event, plainPassword) => {
  if (!validateSender(event.senderFrame)) {
    throw new Error("Invalid sender");
  }
  if (!safeStorage.isEncryptionAvailable()) {
    return { success: false, errorKey: "mole.sudoFailed", fallback: "Encryption not available" };
  }
  try {
    const encrypted = safeStorage.encryptString(plainPassword);
    saveSudoPasswordEncrypted(encrypted.toString("base64"));
    return { success: true };
  } catch (err) {
    return { success: false, errorKey: "mole.sudoFailed", fallback: err.message };
  }
});

// IPC: Check if sudo password is saved
ipcMain.handle("has-sudo-password", (event) => {
  if (!validateSender(event.senderFrame)) {
    throw new Error("Invalid sender");
  }
  return { has: !!getSudoPasswordEncrypted() };
});

// IPC: Clear saved sudo password
ipcMain.handle("clear-sudo-password", (event) => {
  if (!validateSender(event.senderFrame)) {
    throw new Error("Invalid sender");
  }
  const ok = clearSudoPasswordEncrypted();
  return { success: ok };
});

// IPC: Get platform
ipcMain.handle("get-platform", (event) => {
  if (!validateSender(event.senderFrame)) {
    throw new Error("Invalid sender");
  }
  return process.platform;
});

// IPC: Get locale
ipcMain.handle("get-locale", (event) => {
  if (!validateSender(event.senderFrame)) {
    throw new Error("Invalid sender");
  }
  return app.getLocale();
});

// IPC: Open external link
ipcMain.handle("open-external", (event, url) => {
  if (!validateSender(event.senderFrame)) {
    throw new Error("Invalid sender");
  }
  if (!validateExternalUrl(url)) {
    throw new Error("Invalid URL: only https:// URLs are allowed");
  }
  shell.openExternal(url);
});

// IPC: Show message dialog
ipcMain.handle("show-dialog", async (event, options) => {
  if (!validateSender(event.senderFrame)) {
    throw new Error("Invalid sender");
  }
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

// IPC: Check for updates
ipcMain.handle("check-for-updates", async (event) => {
  if (!validateSender(event.senderFrame)) {
    throw new Error("Invalid sender");
  }
  // 实际项目中可接入 auto-updater (electron-updater)
  // 这里返回模拟数据作为占位
  return {
    hasUpdate: false,
    latestVersion: app.getVersion(),
    currentVersion: app.getVersion(),
    releaseNotes: "",
    downloadUrl: "",
  };
});

// IPC: Get app version
ipcMain.handle("get-app-version", (event) => {
  if (!validateSender(event.senderFrame)) {
    throw new Error("Invalid sender");
  }
  return app.getVersion();
});

// IPC: Set auto launch (开机启动)
ipcMain.handle("set-auto-launch", async (event, enabled, options) => {
  if (!validateSender(event.senderFrame)) {
    throw new Error("Invalid sender");
  }
  if (process.platform === "darwin" || process.platform === "win32") {
    // 开发模式下禁止设置开机启动（避免注册 node_modules 中的 Electron 二进制文件）
    if (!app.isPackaged) {
      return {
        success: false,
        errorKey: "error.autoLaunchDevMode",
        fallback: "Auto launch is not available in development mode",
      };
    }
    try {
      const showWindow =
        options && options.showWindow != null
          ? options.showWindow
          : loadAutoLaunchConfig().showWindow;
      app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: enabled && !showWindow });
      // 保存 showWindow 偏好
      const config = loadAutoLaunchConfig();
      config.showWindow = showWindow;
      saveAutoLaunchConfig(config);
      // macOS: 清理旧版本遗留的 "Mole" login item
      if (process.platform === "darwin" && enabled) {
        try {
          await execAsync(
            `osascript -e 'tell application "System Events" to delete login item "Mole"'`,
          );
        } catch {
          // 静默忽略 — "Mole" 可能不存在
        }
      }
      return { success: true };
    } catch (err) {
      console.error("[AutoLaunch] Error:", err.message);
      return { success: false, errorKey: "error.autoLaunchFailed", fallback: err.message };
    }
  }
  return {
    success: false,
    errorKey: "error.autoLaunchNotSupported",
    fallback: "当前平台暂不支持开机启动设置",
  };
});

// IPC: Get auto launch status
ipcMain.handle("get-auto-launch", async (event) => {
  if (!validateSender(event.senderFrame)) {
    throw new Error("Invalid sender");
  }
  try {
    if (process.platform === "darwin" || process.platform === "win32") {
      if (!app.isPackaged) {
        return { enabled: false, showWindow: false, devMode: true };
      }
      const settings = app.getLoginItemSettings();
      const config = loadAutoLaunchConfig();
      return { enabled: settings.openAtLogin, showWindow: config.showWindow };
    }
    return { enabled: false, showWindow: false, error: "当前平台暂不支持开机启动查询" };
  } catch (err) {
    console.error("[AutoLaunch] get-auto-launch error:", err.message);
    return { enabled: false, showWindow: false };
  }
});

// IPC: Set auto launch show window preference (开机启动时是否显示主界面)
ipcMain.handle("set-auto-launch-show-window", (event, showWindow) => {
  if (!validateSender(event.senderFrame)) {
    throw new Error("Invalid sender");
  }
  try {
    const config = loadAutoLaunchConfig();
    config.showWindow = !!showWindow;
    saveAutoLaunchConfig(config);
    // 同步更新 login item 的 openAsHidden
    if (process.platform === "darwin" || process.platform === "win32") {
      if (app.isPackaged) {
        const settings = app.getLoginItemSettings();
        if (settings.openAtLogin) {
          app.setLoginItemSettings({ openAtLogin: true, openAsHidden: !config.showWindow });
        }
      }
    }
    return { success: true };
  } catch (err) {
    console.error("[AutoLaunch] set-auto-launch-show-window error:", err.message);
    return { success: false, error: err.message };
  }
});

// IPC: Check if mole is installed (used by welcome screen)
ipcMain.handle("check-mole-installed", async (event) => {
  if (!validateSender(event.senderFrame)) {
    throw new Error("Invalid sender");
  }
  try {
    const { stdout } = await execAsync("mo --version", { encoding: "utf8", timeout: 5000 });
    return { installed: true, version: stdout.trim() };
  } catch {
    return { installed: false, version: "" };
  }
});

// IPC: 处理从托盘菜单发送的导航请求
ipcMain.on("navigate-to", (_event, viewName) => {
  if (mainWindow) {
    mainWindow.webContents.send("navigate-to", viewName);
  }
});

// IPC: 启动/停止系统状态监控
ipcMain.on("start-status-monitor", () => {
  getStatusMonitor().start();
});

ipcMain.on("stop-status-monitor", () => {
  getStatusMonitor().stop();
});

// ──────────────────────────
// Menu bar monitor IPC
// ──────────────────────────

ipcMain.handle("get-menu-bar-enabled", () => {
  try {
    return loadMenuBarConfig().enabled;
  } catch (err) {
    console.error("[MenuBar] get-menu-bar-enabled error:", err.message);
    return false;
  }
});

ipcMain.handle("set-menu-bar-enabled", (_event, enabled) => {
  try {
    console.log("[Main] set-menu-bar-enabled:", enabled);
    const config = loadMenuBarConfig();
    config.enabled = enabled;
    saveMenuBarConfig(config);

    if (process.platform !== "darwin") {
      console.log("[Main] Menu bar only supported on macOS, current:", process.platform);
      return { success: false, error: "菜单栏监控仅支持 macOS" };
    }

    const monitor = getMenuBarMonitor();
    if (enabled) {
      monitor.start(config);
    } else {
      monitor.stop();
    }
    return { success: true };
  } catch (err) {
    console.error("[MenuBar] set-menu-bar-enabled error:", err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("get-menu-bar-modules", () => {
  try {
    return loadMenuBarConfig().modules;
  } catch (err) {
    console.error("[MenuBar] get-menu-bar-modules error:", err.message);
    return {};
  }
});

ipcMain.handle("set-menu-bar-modules", (_event, modules) => {
  try {
    const config = loadMenuBarConfig();
    config.modules = modules;
    saveMenuBarConfig(config);

    if (menuBarMonitor) {
      menuBarMonitor.updateModules(modules);
    }
    return { success: true };
  } catch (err) {
    console.error("[MenuBar] set-menu-bar-modules error:", err.message);
    return { success: false, error: err.message };
  }
});

/** Get the full menu bar config (modules + appearance + theme) */
ipcMain.handle("get-menu-bar-config", () => {
  try {
    return loadMenuBarConfig();
  } catch (err) {
    console.error("[MenuBar] get-menu-bar-config error:", err.message);
    return {};
  }
});

/** Set the full menu bar config and push to running monitor */
ipcMain.handle("set-menu-bar-config", (_event, config) => {
  try {
    console.log("[Main] set-menu-bar-config received, keys:", Object.keys(config || {}));
    const disk = loadMenuBarConfig();
    console.log(
      "[Main] set-menu-bar-config disk config layout:",
      disk && disk.layout,
      "enabled:",
      disk && disk.enabled,
    );
    const merged = { ...disk, ...config };
    console.log(
      "[Main] set-menu-bar-config merged layout:",
      merged.layout,
      "keys:",
      Object.keys(merged),
    );
    saveMenuBarConfig(merged);
    if (menuBarMonitor) {
      console.log("[Main] set-menu-bar-config pushing to monitor");
      menuBarMonitor.updateConfig(merged);
    } else {
      console.log("[Main] set-menu-bar-config WARNING: menuBarMonitor is null, cannot push");
    }
    return { success: true };
  } catch (err) {
    console.error("[MenuBar] set-menu-bar-config error:", err.message);
    return { success: false, error: err.message };
  }
});

/** Receives theme change notifications from the renderer for popup theme sync */
ipcMain.handle("set-theme", (_event, themeData) => {
  try {
    const config = loadMenuBarConfig();
    config.theme = themeData;
    saveMenuBarConfig(config);
    if (menuBarMonitor) {
      menuBarMonitor.updateConfig({ theme: themeData });
    }
    return { success: true };
  } catch (err) {
    console.error("[MenuBar] set-theme error:", err.message);
    return { success: false, error: err.message };
  }
});

// Store user-chosen language for popup i18n
var appLocale = null;
ipcMain.handle("set-app-locale", (_event, locale) => {
  appLocale = locale;
  console.log("[Main] set-app-locale:", locale);
  return { success: true };
});
function getAppLocale() {
  return appLocale || app.getLocale();
}

// E2E test mode: override IPC handlers with mocks
if (process.env.REVEL_E2E === "1") {
  require("./__mocks__/ipc-handlers");
}

// Export for testing
module.exports = {
  clearMolePathCache,
  handleEnsureSudo,
  handleGetSudoCacheStatus,
  getAppLocale,
};
