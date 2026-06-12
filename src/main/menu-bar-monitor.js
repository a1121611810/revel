const { Tray, BrowserWindow, screen, nativeImage, Menu } = require("electron");
const path = require("path");
const { exec } = require("child_process");

function execAsync(command, options) {
  return new Promise((resolve, reject) => {
    exec(command, options || { encoding: "utf8" }, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout: stdout || "", stderr: stderr || "" });
    });
  });
}

class MenuBarMonitor {
  constructor(getMainWindow, getMolePath, getAppLocale) {
    this.getMainWindow = getMainWindow;
    this.getMolePath = getMolePath;
    this.getAppLocale =
      getAppLocale ||
      function () {
        return require("electron").app.getLocale();
      };
    this.tray = null;
    this.popupWindow = null;
    this.renderWindow = null;
    this.timer = null;
    this.enabled = false;
    this.currentStats = {};
    this.config = null;
    this.failCount = 0;
    this.lastNetBytes = { rx: 0, tx: 0 };
    this.lastNetTime = 0;
    this.netIface = "";
  }

  start(fullConfig) {
    if (this.enabled) return;
    this.enabled = true;
    this.config = fullConfig || null;
    console.log("[MenuBarMonitor] start() called, config:", fullConfig);
    this.createTray();
    this.scheduleTick(true);
  }

  stop() {
    console.log("[MenuBarMonitor] stop() called");
    this.enabled = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
    this.destroyPopup();
    this.destroyRenderWindow();
  }

  destroyRenderWindow() {
    if (this.renderWindow && !this.renderWindow.isDestroyed()) {
      this.renderWindow.destroy();
    }
    this.renderWindow = null;
  }

  updateModules(modules) {
    if (!this.config) this.config = {};
    if (!this.config.tray) this.config.tray = {};
    this.config.tray.modules = { ...modules };
    if (this.enabled && this.tray) {
      this.updateTrayIcon(this.currentStats);
    }
    this.pushConfigToPopup();
  }

  /** Apply a full or partial config update */
  updateConfig(config) {
    if (!config) {
      console.log("[MenuBarMonitor] updateConfig: null config, ignoring");
      return;
    }
    console.log("[MenuBarMonitor] updateConfig keys:", Object.keys(config));
    // Deep merge tray and popup sub-objects
    this.config = this.config || {};
    if (config.tray) {
      this.config.tray = { ...(this.config.tray || {}), ...config.tray };
    }
    if (config.popup) {
      this.config.popup = { ...(this.config.popup || {}), ...config.popup };
    }
    // Also copy top-level fields (enabled, theme)
    Object.keys(config).forEach(function (k) {
      if (k !== "tray" && k !== "popup") {
        this.config[k] = config[k];
      }
    }, this);
    console.log(
      "[MenuBarMonitor] updateConfig done, this.config.tray.layout:",
      this.config?.tray?.layout,
    );
    if (this.enabled && this.tray) {
      this.updateTrayIcon(this.currentStats);
    }
    this.pushConfigToPopup();
  }

  /** Send current config to the popup window */
  pushConfigToPopup() {
    if (this.popupWindow && !this.popupWindow.isDestroyed() && this.config && this.config.popup) {
      console.log("[MenuBarMonitor] pushConfigToPopup: sending popup config");
      this.popupWindow.webContents.send(
        "menu-bar-config",
        Object.assign({ _locale: this.getAppLocale() }, this.config.popup),
      );
      console.log(
        "[MenuBarMonitor] pushConfigToPopup: NOT sending (popupWindow:",
        !!this.popupWindow,
        "config:",
        !!this.config,
        ")",
      );
    }
  }

  createTray() {
    if (this.tray) return;

    // 创建 tray 图标 — 优先用应用图标，失败则用内嵌 data URL
    let icon;
    try {
      icon = nativeImage.createFromPath(path.join(__dirname, "../../build/icon.png"));
      if (!icon.isEmpty()) {
        icon = icon.resize({ width: 18, height: 18 });
      }
    } catch {
      // ignore
    }

    if (!icon || icon.isEmpty()) {
      // 后备: 16x16 蓝色圆点图标 (base64 PNG)
      icon = nativeImage.createFromDataURL(
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAWElEQVQ4T2NkYPj/n4EBBJgYuA5fZqAEMI4aMGoA3Q1gPHblPwMDA8N/BgaG/wwMDAxTBu4yMFAAGI8/JJ7bcfr/fwYGBgYGBgYGBgnX/yNjwKgBxHgUALNGEzGZK5inAAAAAElFTkSuQmCC",
      );
      if (!icon.isEmpty()) {
        icon = icon.resize({ width: 18, height: 18 });
      }
    }

    this.tray = new Tray(icon);
    this.tray.setToolTip("Revel — 系统监控");
    // Initially set a placeholder image (will be updated by first tick)
    var placeholder = nativeImage.createEmpty();
    placeholder = placeholder.resize({ width: 1, height: 22 });
    this.tray.setImage(placeholder);

    this.tray.on("click", (_event, bounds) => {
      if (this.popupWindow && !this.popupWindow.isDestroyed()) {
        this.destroyPopup();
      } else {
        this.showPopup(bounds);
      }
    });

    this.tray.on("right-click", () => {
      const labels = this.getTrayLabels();
      const contextMenu = Menu.buildFromTemplate([
        {
          label: labels.show,
          click: () => {
            const win = this.getMainWindow();
            if (win) {
              win.isVisible() ? win.focus() : win.show();
            }
          },
        },
        {
          label: labels.settings,
          click: () => {
            const win = this.getMainWindow();
            if (win) {
              win.show();
              win.webContents.send("navigate-to", "settings");
            }
          },
        },
        { type: "separator" },
        { label: labels.quit, click: () => require("electron").app.quit() },
      ]);
      this.tray.popUpContextMenu(contextMenu);
    });
  }

  getTrayLabels() {
    var locale = this.getAppLocale();
    const normalized = (locale || "").toLowerCase().replace(/_/g, "-");
    if (normalized.startsWith("zh")) {
      return { show: "显示 Revel", settings: "设置", quit: "退出" };
    }
    return { show: "Show Revel", settings: "Settings", quit: "Quit" };
  }

  showPopup(bounds) {
    if (this.popupWindow && !this.popupWindow.isDestroyed()) {
      this.popupWindow.focus();
      return;
    }

    // Determine the display containing the tray icon (multi-monitor aware)
    const trayDisplay = bounds
      ? screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y })
      : screen.getPrimaryDisplay();
    const { x: displayX, y: displayY, width: screenW, height: screenH } = trayDisplay.workArea;

    const popupWidth = 340;
    const popupHeight = 520;

    // Position near the tray icon: right edge of popup aligned with right edge of tray icon
    let x = bounds
      ? Math.round(bounds.x + bounds.width - popupWidth)
      : displayX + screenW - popupWidth - 16;
    let y = bounds ? Math.round(bounds.y + bounds.height + 4) : displayY + 28;

    // Keep within the tray's display bounds (not primary display)
    const minX = displayX;
    const maxX = displayX + screenW - popupWidth;
    if (x < minX) x = minX;
    if (x > maxX) x = maxX;
    const minY = displayY;
    const maxY = displayY + screenH - popupHeight;
    if (y < minY) y = minY;
    if (y > maxY) y = maxY;

    this.popupWindow = new BrowserWindow({
      width: popupWidth,
      height: popupHeight,
      x: Math.round(x),
      y: Math.round(y),
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      hasShadow: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        preload: path.join(__dirname, "menu-bar-popup-preload.js"),
      },
    });

    // Load the popup HTML
    const popupHtml = path.join(__dirname, "menu-bar-popup.html");
    this.popupWindow.loadFile(popupHtml);

    // Send current stats once loaded
    this.popupWindow.webContents.on("did-finish-load", () => {
      if (this.popupWindow && !this.popupWindow.isDestroyed()) {
        console.log(
          "[MenuBarMonitor] popup did-finish-load, sending stats + config at",
          Date.now(),
        );
        this.popupWindow.webContents.send("menu-bar-status", this.currentStats);
        if (this.config && this.config.popup) {
          console.log("[MenuBarMonitor] popup config keys:", Object.keys(this.config.popup));
          this.popupWindow.webContents.send(
            "menu-bar-config",
            Object.assign({ _locale: this.getAppLocale() }, this.config.popup),
          );
        } else {
          console.log("[MenuBarMonitor] WARNING: no popup config to send");
        }
      }
    });

    // Close popup when clicking outside
    this.popupWindow.on("blur", () => {
      this.destroyPopup();
    });

    // Prevent navigation
    this.popupWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  }

  destroyPopup() {
    if (this.popupWindow && !this.popupWindow.isDestroyed()) {
      this.popupWindow.destroy();
    }
    this.popupWindow = null;
  }

  updateTrayIcon(stats) {
    if (!this.tray || this.tray.isDestroyed()) return;
    var trayCfg = (this.config && this.config.tray) || {};
    this.renderTrayImage(stats, trayCfg);
  }

  /** Render tray image using offscreen BrowserWindow, for all layout modes */
  renderTrayImage(stats, trayCfg) {
    if (!this.tray || this.tray.isDestroyed()) return;

    var modules = trayCfg.modules || { cpu: true, gpu: true, ram: true, ssd: true };
    var layout = trayCfg.layout || "horizontal";
    var sep = trayCfg.separator || "  ";
    var fontSize = trayCfg.fontSize || 12;
    var traySpacing = trayCfg.spacing != null ? trayCfg.spacing : 4;
    var popupCfg = (this.config && this.config.popup) || {};
    var colors = popupCfg.moduleColors || {
      cpu: "#5ac8fa",
      gpu: "#ff9f0a",
      ram: "#bf5af2",
      ssd: "#30d158",
    };
    var rangeColors = popupCfg.rangeColors || { low: "#30d158", mid: "#ff9f0a", high: "#ff453a" };
    var thresholds = popupCfg.thresholds || { mid: 50, high: 80 };
    var isDark = this.config && this.config.theme && this.config.theme.isDark ? true : false;
    var textColor = isDark ? "#ffffff" : "#1f1f1f";
    var labelOpacity = isDark ? "0.5" : "0.6";
    var sepOpacity = isDark ? "0.4" : "0.25";

    function getRangeColor(value) {
      if (value >= thresholds.high) return rangeColors.high;
      if (value >= thresholds.mid) return rangeColors.mid;
      return rangeColors.low;
    }

    var entries = [
      {
        key: "cpu",
        label: "CPU",
        value: stats.cpuUsage || 0,
        labelColor: colors.cpu,
        valueColor: getRangeColor(stats.cpuUsage || 0),
      },
      {
        key: "gpu",
        label: "GPU",
        value: stats.gpuUsage >= 0 ? stats.gpuUsage : null,
        labelColor: colors.gpu,
        valueColor: getRangeColor(stats.gpuUsage || 0),
      },
      {
        key: "ram",
        label: "RAM",
        value: stats.memoryUsage || 0,
        labelColor: colors.ram,
        valueColor: getRangeColor(stats.memoryUsage || 0),
      },
      {
        key: "ssd",
        label: "SSD",
        value: stats.diskUsage || 0,
        labelColor: colors.ssd,
        valueColor: getRangeColor(stats.diskUsage || 0),
      },
    ];

    var active = entries.filter(function (e) {
      return modules[e.key] && e.value !== null;
    });

    if (active.length === 0) {
      this.tray.setImage(nativeImage.createEmpty());
      return;
    }

    // Build HTML blocks
    var blocks = active
      .map(function (e) {
        if (layout === "vertical") {
          return (
            '<span class="block"><span class="val" style="color:' +
            e.valueColor +
            '">' +
            e.value +
            '%</span><span class="lbl" style="color:' +
            e.labelColor +
            '">' +
            e.label +
            "</span></span>"
          );
        }
        return (
          '<span class="h-block"><span class="h-label">' +
          e.label +
          '</span> <span class="h-value" style="color:' +
          e.valueColor +
          '">' +
          e.value +
          "%</span></span>"
        );
      })
      .join('<span class="sep">' + sep + "</span>");

    // 2x retina rendering
    var renderH = 48;
    var f2 = fontSize * 2;

    // Pre-calculate window width: module blocks + separators + small padding
    var activeCount = active.length;
    var blockW = layout === "vertical" ? Math.ceil(f2 * 2.5) : Math.ceil(f2 * 5);
    var sepW = traySpacing * 4; // padding left+right of each separator, ×2 retina
    var renderW = activeCount * blockW + (activeCount - 1) * sepW + 8;

    var css =
      "*{margin:0;padding:0;box-sizing:border-box}" +
      "body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;" +
      "height:" +
      renderH +
      "px;white-space:nowrap;-webkit-font-smoothing:antialiased;background:transparent;color:" +
      textColor +
      ";padding:0 2px}" +
      ".block{display:inline-flex;flex-direction:column;align-items:center;gap:2px;min-width:" +
      f2 * 2.2 +
      "px}" +
      ".val{font-size:" +
      f2 +
      "px;font-weight:700;line-height:1.1}" +
      ".lbl{font-size:" +
      Math.max(10, f2 - 4) +
      "px;font-weight:600;text-transform:uppercase}" +
      ".sep{font-size:" +
      f2 +
      "px;padding:0 " +
      traySpacing * 2 +
      "px;opacity:" +
      sepOpacity +
      "}" +
      ".h-block{font-size:" +
      f2 +
      "px;font-weight:600}" +
      ".h-block .h-label{opacity:" +
      labelOpacity +
      "}" +
      ".h-value{font-weight:700}";

    var html =
      '<html><head><meta charset="utf-8"><style>' +
      css +
      "</style></head><body>" +
      blocks +
      "</body></html>";

    if (!this.renderWindow || this.renderWindow.isDestroyed()) {
      this.renderWindow = new BrowserWindow({
        width: renderW,
        height: renderH,
        show: false,
        frame: false,
        transparent: true,
        skipTaskbar: true,
        webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
      });
    } else {
      // Resize existing window if content dimensions changed
      this.renderWindow.setSize(renderW, renderH);
    }

    var self = this;
    this.renderWindow.loadURL(
      "data:text/html;charset=utf-8;base64," + Buffer.from(html, "utf8").toString("base64"),
    );

    setTimeout(function () {
      if (!self.renderWindow || self.renderWindow.isDestroyed()) return;
      if (!self.tray || self.tray.isDestroyed()) return;
      self.renderWindow.webContents
        .capturePage()
        .then(function (image) {
          if (!self.tray || self.tray.isDestroyed()) return;
          var scaled = image.resize({ height: 22 });
          var trimmed = self.trimTransparentEdges(scaled, 2);
          self.tray.setImage(trimmed);
        })
        .catch(function () {
          if (!self.tray || self.tray.isDestroyed()) return;
          self.tray.setImage(nativeImage.createEmpty());
        });
    }, 160);
  }

  /** Remove transparent padding from all four edges, keeping `keepPadding` px */
  trimTransparentEdges(image, keepPadding) {
    keepPadding = keepPadding || 0;
    var bitmap = image.toBitmap();
    var size = image.getSize();
    var width = size.width;
    var height = size.height;

    // Scan top edge
    var minY = 0;
    top: for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        if (bitmap[(y * width + x) * 4 + 3] > 0) {
          minY = y;
          break top;
        }
      }
    }

    // Scan bottom edge
    var maxY = height - 1;
    bottom: for (var y = height - 1; y >= 0; y--) {
      for (var x = 0; x < width; x++) {
        if (bitmap[(y * width + x) * 4 + 3] > 0) {
          maxY = y;
          break bottom;
        }
      }
    }

    // Scan left edge
    var minX = 0;
    left: for (var x = 0; x < width; x++) {
      for (var y = minY; y <= maxY; y++) {
        if (bitmap[(y * width + x) * 4 + 3] > 0) {
          minX = x;
          break left;
        }
      }
    }

    // Scan right edge
    var maxX = width - 1;
    right: for (var x = width - 1; x >= 0; x--) {
      for (var y = minY; y <= maxY; y++) {
        if (bitmap[(y * width + x) * 4 + 3] > 0) {
          maxX = x;
          break right;
        }
      }
    }

    // Apply padding
    var cropX = Math.max(0, minX - keepPadding);
    var cropY = Math.max(0, minY - keepPadding);
    var cropW = Math.min(width - cropX, maxX - minX + 1 + keepPadding * 2);
    var cropH = Math.min(height - cropY, maxY - minY + 1 + keepPadding * 2);

    if (cropW <= 0 || cropH <= 0) return image;
    return image.crop({ x: cropX, y: cropY, width: cropW, height: cropH });
  }

  scheduleTick(immediate = false) {
    if (!this.enabled) return;
    const delay = immediate ? 0 : 3000;
    this.timer = setTimeout(() => {
      this.tick().finally(() => {
        if (this.enabled) this.scheduleTick();
      });
    }, delay);
  }

  buildStats(
    moleData,
    nativeCpu,
    nativeGpu,
    nativeMem,
    nativeDisk,
    nativeBatt,
    nativeNet,
    loadAvg,
    topProcs,
    cpuTemp,
  ) {
    return {
      cpuUsage: nativeCpu?.cpuUsage ?? moleData?.cpuUsage ?? 0,
      cpuCores: moleData?.cpuCores ?? 0,
      cpuModel: moleData?.cpuModel ?? "",
      cpuTemp: cpuTemp,
      loadAvg1: loadAvg?.[0] ?? 0,
      loadAvg5: loadAvg?.[1] ?? 0,
      loadAvg15: loadAvg?.[2] ?? 0,
      cpuFrequency: moleData?.cpuFrequency ?? 0,

      gpuUsage: nativeGpu?.gpuUsage ?? moleData?.gpuUsage ?? -1,
      gpuMemoryPercent: nativeGpu?.gpuMemoryPercent ?? moleData?.gpuMemoryPercent ?? -1,
      usedGpuMemory: nativeGpu?.usedGpuMemory ?? moleData?.usedGpuMemory ?? 0,
      totalGpuMemory: nativeGpu?.totalGpuMemory ?? moleData?.totalGpuMemory ?? 0,
      gpuModel: moleData?.gpuModel ?? "",

      memoryUsage: nativeMem?.memoryUsage ?? moleData?.memoryUsage ?? 0,
      usedMemory: nativeMem?.usedMemory ?? moleData?.usedMemory ?? 0,
      totalMemory: nativeMem?.totalMemory ?? moleData?.totalMemory ?? 0,

      diskUsage: nativeDisk?.diskUsage ?? moleData?.diskUsage ?? 0,
      usedDisk: nativeDisk?.usedDisk ?? moleData?.usedDisk ?? 0,
      totalDisk: nativeDisk?.totalDisk ?? moleData?.totalDisk ?? 0,

      batteryPercent: nativeBatt?.batteryPercent ?? moleData?.batteryPercent ?? 0,
      batteryStatus: nativeBatt?.batteryStatus ?? moleData?.batteryStatus ?? "",
      batteryTime: nativeBatt?.batteryTime ?? moleData?.batteryTime ?? "",

      downloadSpeed: nativeNet?.downloadSpeed ?? moleData?.downloadSpeed ?? "--",
      uploadSpeed: nativeNet?.uploadSpeed ?? moleData?.uploadSpeed ?? "--",

      topProcesses: topProcs,
      uptimeText: moleData?.uptimeText ?? "",
      platform: process.platform,
    };
  }

  async tick() {
    if (!this.enabled) return;

    try {
      const molePath = await this.getMolePath();

      // Fetch mole data separately (optional — may fail without mole CLI)
      let moleData = null;
      if (molePath) {
        try {
          moleData = await this.fetchMole(molePath);
        } catch {
          // mole fetch failed, continue with native data
        }
      }

      // Always collect native macOS data regardless of mole availability
      const [
        topResult,
        ioregResult,
        vmResult,
        diskResult,
        battResult,
        netResult,
        loadResult,
        topProcsResult,
        tempResult,
      ] = await Promise.allSettled([
        this.fetchTopCpu(),
        this.fetchIoregGpu(),
        this.fetchVmStats(),
        this.fetchDiskInfo(),
        this.fetchPmsetBattery(),
        this.fetchNetstatNetwork(),
        this.fetchLoadAverage(),
        this.fetchTopProcesses(),
        this.fetchCpuTemperature(),
      ]);

      const nativeCpu = topResult.status === "fulfilled" ? topResult.value : null;
      const nativeGpu = ioregResult.status === "fulfilled" ? ioregResult.value : null;
      const nativeMem = vmResult.status === "fulfilled" ? vmResult.value : null;
      const nativeDisk = diskResult.status === "fulfilled" ? diskResult.value : null;
      const nativeBatt = battResult.status === "fulfilled" ? battResult.value : null;
      const nativeNet = netResult.status === "fulfilled" ? netResult.value : null;
      const loadAvg = loadResult.status === "fulfilled" ? loadResult.value : null;
      const topProcs = topProcsResult.status === "fulfilled" ? topProcsResult.value : [];
      const cpuTemp = tempResult.status === "fulfilled" ? tempResult.value : null;

      // Build stats from all available sources
      const stats = this.buildStats(
        moleData,
        nativeCpu,
        nativeGpu,
        nativeMem,
        nativeDisk,
        nativeBatt,
        nativeNet,
        loadAvg,
        topProcs,
        cpuTemp,
      );

      // Only consider it a failure if ALL data sources returned nothing
      const allFailed =
        moleData === null &&
        nativeCpu === null &&
        nativeGpu === null &&
        nativeMem === null &&
        nativeDisk === null &&
        nativeBatt === null &&
        nativeNet === null &&
        loadAvg === null &&
        topProcs.length === 0 &&
        cpuTemp === null;

      if (allFailed) {
        this.failCount++;
        console.log(`[MenuBarMonitor] tick: all sources failed, failCount=${this.failCount}`);
        if (this.failCount >= 3) {
          console.log("[MenuBarMonitor] tick: failCount >= 3, stopping");
          this.stop();
        }
        return;
      }

      this.failCount = 0;
      this.currentStats = stats;
      console.log(
        `[MenuBarMonitor] tick: success, cpu=${stats.cpuUsage}%, mem=${stats.memoryUsage}%, disk=${stats.diskUsage}%`,
      );

      // Update tray icon
      this.updateTrayIcon(stats);

      // Push to popup window
      if (this.popupWindow && !this.popupWindow.isDestroyed()) {
        this.popupWindow.webContents.send("menu-bar-status", stats);
        if (this.config && this.config.popup) {
          this.popupWindow.webContents.send(
            "menu-bar-config",
            Object.assign({ _locale: this.getAppLocale() }, this.config.popup),
          );
        }
      }

      // Push to main window
      const mainWindow = this.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("menu-bar-status", stats);
      }
    } catch {
      // Silent fail
    }
  }

  // ─── Data collection methods (same as StatusMonitor) ────────────────

  async fetchMole(molePath) {
    const { spawn } = require("child_process");
    return new Promise((resolve, reject) => {
      const child = spawn(molePath, ["status"], {
        env: { ...process.env, NO_COLOR: "1" },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d) => (stdout += d.toString()));
      child.stderr.on("data", (d) => (stderr += d.toString()));
      child.on("close", (code) => {
        if (code !== 0) return reject(new Error(stderr.trim() || "mole status failed"));
        resolve(this.parseMoleOutput(stdout.trim()));
      });
      child.on("error", reject);
    });
  }

  parseMoleOutput(stdout) {
    try {
      const data = JSON.parse(stdout);
      const hw = data.hardware || {};
      const cpu = data.cpu || {};
      const mem = data.memory || {};
      const disk = (data.disks || [])[0] || {};
      const nets = data.network || [];
      const batt = (data.batteries || [])[0] || {};
      const gpu = (data.gpu || [])[0] || {};

      let totalRx = 0;
      let totalTx = 0;
      for (const n of nets) {
        totalRx += n.rx_rate_mbs || 0;
        totalTx += n.tx_rate_mbs || 0;
      }

      function fmtNet(mbs) {
        if (mbs >= 1) return `${mbs.toFixed(1)} MB/s`;
        if (mbs <= 0) return "0 KB/s";
        return `${Math.round(mbs * 1024)} KB/s`;
      }

      return {
        cpuUsage: Math.round(cpu.usage || 0),
        cpuCores: cpu.core_count || 0,
        cpuModel: hw.cpu_model || "",
        cpuFrequency: cpu.frequency_mhz || 0,
        memoryUsage: Math.round(mem.used_percent || 0),
        usedMemory: mem.used ? parseFloat((mem.used / 1024 ** 3).toFixed(1)) : 0,
        totalMemory: mem.total ? parseFloat((mem.total / 1024 ** 3).toFixed(1)) : 0,
        diskUsage: Math.round(disk.used_percent || 0),
        usedDisk: disk.used ? parseFloat((disk.used / 1024 ** 3).toFixed(1)) : 0,
        totalDisk: disk.total ? parseFloat((disk.total / 1024 ** 3).toFixed(1)) : 0,
        batteryPercent: batt.percent || 0,
        batteryStatus: batt.status || "",
        batteryTime: batt.time_left || "",
        downloadSpeed: fmtNet(totalRx),
        uploadSpeed: fmtNet(totalTx),
        gpuModel: gpu.name || "",
        gpuUsage: gpu.usage >= 0 ? gpu.usage : -1,
        gpuMemoryPercent:
          gpu.memory_total > 0 ? Math.round((gpu.memory_used / gpu.memory_total) * 100) : -1,
        usedGpuMemory: gpu.memory_used || 0,
        totalGpuMemory: gpu.memory_total || 0,
        uptimeText: data.uptime || "",
      };
    } catch {
      return null;
    }
  }

  async fetchTopCpu() {
    try {
      const { stdout } = await execAsync("top -l 1 -n 0");
      const match = stdout.match(/CPU usage:\s+([\d.]+)%\s+user,\s+([\d.]+)%\s+sys/);
      if (!match) return null;
      return { cpuUsage: Math.round(parseFloat(match[1]) + parseFloat(match[2])) };
    } catch {
      return null;
    }
  }

  async fetchIoregGpu() {
    try {
      const { stdout } = await execAsync("ioreg -r -c IOAccelerator -d 1");
      const perfMatch = stdout.match(/"PerformanceStatistics" = \{([^}]+)\}/);
      if (!perfMatch) return null;
      const block = perfMatch[1];
      const utilMatch = block.match(/"Device Utilization %"=(\d+)/);
      const deviceUtil = utilMatch ? parseInt(utilMatch[1], 10) : -1;
      if (deviceUtil < 0) return null;
      const inUseMatch = block.match(/"In use system memory"=(\d+)/);
      const allocMatch = block.match(/"Alloc system memory"=(\d+)/);
      const inUse = inUseMatch ? parseInt(inUseMatch[1], 10) : 0;
      const alloc = allocMatch ? parseInt(allocMatch[1], 10) : 0;
      const usedGb = inUse > 0 ? parseFloat((inUse / 1024 ** 3).toFixed(1)) : 0;
      const totalGb = alloc > 0 ? parseFloat((alloc / 1024 ** 3).toFixed(1)) : 0;
      return {
        gpuUsage: deviceUtil,
        gpuMemoryPercent: totalGb > 0 ? Math.round((usedGb / totalGb) * 100) : 0,
        usedGpuMemory: usedGb,
        totalGpuMemory: totalGb,
      };
    } catch {
      return null;
    }
  }

  async fetchVmStats() {
    try {
      const { stdout: memsizeOutput } = await execAsync("sysctl hw.memsize");
      const memsizeMatch = memsizeOutput.match(/hw\.memsize:\s+(\d+)/);
      const totalBytes = memsizeMatch ? parseInt(memsizeMatch[1], 10) : 0;
      const { stdout } = await execAsync("vm_stat");
      const pageSizeMatch = stdout.match(/page size of (\d+) bytes/);
      const pageSize = pageSizeMatch ? parseInt(pageSizeMatch[1], 10) : 16384;
      const wiredMatch = stdout.match(/Pages wired down:\s+(\d+)/);
      const activeMatch = stdout.match(/Pages active:\s+(\d+)/);
      const compressedMatch = stdout.match(/Pages occupied by compressor:\s+(\d+)/);
      const anonymousMatch = stdout.match(/Anonymous pages:\s+(\d+)/);
      const wired = wiredMatch ? parseInt(wiredMatch[1], 10) : 0;
      const active = activeMatch ? parseInt(activeMatch[1], 10) : 0;
      const compressed = compressedMatch ? parseInt(compressedMatch[1], 10) : 0;
      const anonymous = anonymousMatch ? parseInt(anonymousMatch[1], 10) : 0;
      const appPages = anonymous > 0 ? anonymous : active;
      const usedBytes = (wired + appPages + compressed) * pageSize;
      const usedGb = parseFloat((usedBytes / 1024 ** 3).toFixed(1));
      const totalGb = parseFloat((totalBytes / 1024 ** 3).toFixed(1));
      return {
        memoryUsage: totalGb > 0 ? Math.round((usedGb / totalGb) * 100) : 0,
        usedMemory: usedGb,
        totalMemory: totalGb,
      };
    } catch {
      return null;
    }
  }

  async fetchDiskInfo() {
    try {
      const fs = require("fs");
      if (process.platform === "darwin") {
        const stats = await fs.promises.statfs("/");
        const bsize = stats.bsize || 4096;
        const totalBytes = stats.blocks * bsize;
        const freeBytes = stats.bavail * bsize;
        const usedBytes = totalBytes - freeBytes;
        if (totalBytes <= 0) return null;
        const totalGb = parseFloat((totalBytes / 1024 ** 3).toFixed(1));
        const usedGb = parseFloat((usedBytes / 1024 ** 3).toFixed(1));
        return {
          diskUsage: Math.round((usedBytes / totalBytes) * 100),
          usedDisk: usedGb,
          totalDisk: totalGb,
        };
      }
      const { stdout } = await execAsync("df -k /");
      const lines = stdout.trim().split("\n");
      if (lines.length < 2) return null;
      const parts = lines[1].trim().split(/\s+/);
      if (parts.length < 6) return null;
      const totalKb = parseInt(parts[1], 10);
      const usedKb = parseInt(parts[2], 10);
      if (isNaN(totalKb) || isNaN(usedKb) || totalKb <= 0) return null;
      return {
        diskUsage: Math.round((usedKb / totalKb) * 100),
        usedDisk: parseFloat((usedKb / 1024 ** 2).toFixed(1)),
        totalDisk: parseFloat((totalKb / 1024 ** 2).toFixed(1)),
      };
    } catch {
      return null;
    }
  }

  async fetchPmsetBattery() {
    try {
      const { stdout } = await execAsync("pmset -g batt");
      const line = stdout.split("\n").find((l) => l.includes("InternalBattery") || l.includes("%"));
      if (!line) return null;
      const percentMatch = line.match(/(\d+)%/);
      const percent = percentMatch ? parseInt(percentMatch[1], 10) : 0;
      let status = "";
      if (line.includes("discharging")) status = "放电中";
      else if (line.includes("charging")) status = "充电中";
      else if (line.includes("AC Power") || line.includes("ac power")) status = "电源供电";
      else if (line.includes("charged") || line.includes("finishing charge")) status = "已充满";
      const timeMatch = line.match(/(\d+:\d+)\s+remaining/);
      const time = timeMatch ? `${timeMatch[1]} 剩余` : "";
      return { batteryPercent: percent, batteryStatus: status, batteryTime: time };
    } catch {
      return null;
    }
  }

  async fetchNetstatNetwork() {
    try {
      let iface = this.netIface;
      if (!iface) {
        try {
          const { stdout } = await execAsync("route -n get default | grep interface");
          const routeMatch = stdout.match(/interface:\s+(\S+)/);
          if (routeMatch) {
            iface = routeMatch[1];
            this.netIface = iface;
          }
        } catch {
          /* ignore */
        }
      }
      if (!iface) return { downloadSpeed: "--", uploadSpeed: "--" };
      const { stdout } = await execAsync(`netstat -ib -I ${iface}`);
      const lines = stdout.trim().split("\n");
      const linkLine = lines.find((l) => l.includes("<Link#"));
      if (!linkLine) return { downloadSpeed: "--", uploadSpeed: "--" };
      const parts = linkLine.trim().split(/\s+/);
      if (parts.length < 10) return { downloadSpeed: "--", uploadSpeed: "--" };
      const rxBytes = parseInt(parts[6], 10);
      const txBytes = parseInt(parts[9], 10);
      const now = Date.now();
      let downloadSpeed = "--";
      let uploadSpeed = "--";
      if (this.lastNetTime > 0 && this.lastNetBytes.rx > 0 && this.lastNetBytes.tx > 0) {
        const dt = (now - this.lastNetTime) / 1000;
        if (dt > 0) {
          const rxDiff = rxBytes - this.lastNetBytes.rx;
          const txDiff = txBytes - this.lastNetBytes.tx;
          const fmt = (bps) => {
            const mbs = bps / (1024 * 1024);
            if (mbs >= 1) return `${mbs.toFixed(1)} MB/s`;
            if (bps <= 0) return "0 KB/s";
            return `${Math.round(bps / 1024)} KB/s`;
          };
          downloadSpeed = fmt(rxDiff / dt);
          uploadSpeed = fmt(txDiff / dt);
        }
      }
      this.lastNetBytes = { rx: rxBytes, tx: txBytes };
      this.lastNetTime = now;
      return { downloadSpeed, uploadSpeed };
    } catch {
      return { downloadSpeed: "--", uploadSpeed: "--" };
    }
  }

  async fetchLoadAverage() {
    try {
      const { stdout } = await execAsync("sysctl -n vm.loadavg");
      const parts = stdout.trim().split(/\s+/).map(Number);
      return parts.length >= 3 ? parts : null;
    } catch {
      return null;
    }
  }

  async fetchTopProcesses() {
    try {
      const { stdout } = await execAsync("ps -arcwwwxo pid,pcpu,pmem,comm | head -11");
      const lines = stdout.trim().split("\n").slice(1); // skip header
      return lines
        .map((line) => {
          const parts = line.trim().split(/\s+/);
          if (parts.length < 4) return null;
          return {
            pid: parseInt(parts[0], 10),
            cpu: parseFloat(parts[1]),
            mem: parseFloat(parts[2]),
            name: parts.slice(3).join(" "),
          };
        })
        .filter(Boolean)
        .slice(0, 8);
    } catch {
      return [];
    }
  }

  async fetchCpuTemperature() {
    try {
      const { stdout } = await execAsync(
        "ioreg -r -c AppleSMC -d 0 2>/dev/null | grep -i 'temperature' | head -1",
        { timeout: 2000 },
      );
      const match = stdout.match(/"Temperature"\s*=\s*(\d+)/);
      if (match) {
        const raw = parseInt(match[1], 10);
        if (raw > 1000) return Math.round(raw / 65536 - 273.15);
        return raw;
      }
      return null;
    } catch {
      return null;
    }
  }
}

module.exports = { MenuBarMonitor };
