import { ref, onUnmounted } from "vue";

export function useMole() {
  const loading = ref(false);
  const error = ref(null);
  const output = ref("");
  const result = ref(null);

  /**
   * Execute a mole command
   * @param {string} args - command arguments (e.g. 'clean', 'status --json')
   * @param {boolean} useSudo - whether to use sudo
   * @returns {Promise<{stdout, stderr, code, success}>}
   */
  async function exec(args = "", useSudo = false) {
    loading.value = true;
    error.value = null;
    output.value = "";
    result.value = null;

    try {
      const argsArray = args.split(" ").filter(Boolean);
      const handler = useSudo ? window.electronAPI.moleExecSudo : window.electronAPI.moleExec;
      const res = await handler("mo", argsArray);
      result.value = res;
      output.value = res.stdout;
      return res;
    } catch (err) {
      error.value = err.message || "Command failed";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Execute a mole command with sudo (osascript)
   * @param {string} args - command arguments
   * @returns {Promise<{stdout, stderr, code, success}>}
   */
  async function execSudo(args = "") {
    loading.value = true;
    error.value = null;
    output.value = "";
    result.value = null;

    try {
      const argsArray = args.split(" ").filter(Boolean);
      console.log("[useMole] execSudo calling moleExecSudo with args:", argsArray);
      const res = await window.electronAPI.moleExecSudo("mo", argsArray);
      console.log("[useMole] execSudo result:", {
        code: res.code,
        success: res.success,
        stdout_len: res.stdout?.length,
        stderr: res.stderr,
      });
      result.value = res;
      output.value = res.stdout;
      return res;
    } catch (err) {
      console.log("[useMole] execSudo error:", err.message);
      error.value = err.message || "提权命令失败";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Execute any system command (not limited to mole)
   * @param {string} command - command name (e.g. 'mdutil', 'bash')
   * @param {string[]} args - command arguments array
   * @param {boolean} useSudo - whether to use sudo
   * @returns {Promise<{stdout, stderr, code, success}>}
   */
  async function execRaw(command, args = [], useSudo = false) {
    loading.value = true;
    error.value = null;
    output.value = "";
    result.value = null;

    try {
      const handler = useSudo ? window.electronAPI.moleExecSudo : window.electronAPI.moleExec;
      const res = await handler(command, Array.isArray(args) ? args : []);
      result.value = res;
      output.value = res.stdout;
      return res;
    } catch (err) {
      error.value = err.message || "Command failed";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Centralized output callback registry
  const outputCallbacks = new Set();
  let passwordResolve = null;

  function handleOutputEvent(data) {
    if (data.type === "password-request") {
      new Promise((resolve) => {
        passwordResolve = resolve;
        window.dispatchEvent(new CustomEvent("mole-password-request"));
      }).then((password) => {
        if (password) window.electronAPI.sendPassword(password);
        passwordResolve = null;
      });
      return;
    }
    outputCallbacks.forEach((cb) => cb(data));
  }

  // Register global listener only once at module level
  window.electronAPI.onMoleOutput(handleOutputEvent);

  /**
   * Submit password from dialog
   */
  function submitPassword(password) {
    if (passwordResolve) {
      passwordResolve(password);
      passwordResolve = null;
    }
  }

  /**
   * Cancel password request
   */
  function cancelPassword() {
    if (passwordResolve) {
      passwordResolve("");
      passwordResolve = null;
    }
  }

  /**
   * Cancel currently running mole command
   */
  function cancelRunning() {
    window.electronAPI.moleCancel();
  }

  /**
   * Listen to mole output stream
   * @param {Function} callback - (data: {type, data}) => void
   */
  function listenOutput(callback) {
    outputCallbacks.add(callback);
  }

  /**
   * Remove mole output listener
   * @param {Function} callback
   */
  function removeOutputListener(callback) {
    outputCallbacks.delete(callback);
  }

  /**
   * Auto-remove listener on component unmount
   * @param {Function} callback
   */
  function onOutput(callback) {
    outputCallbacks.add(callback);
    onUnmounted(() => {
      outputCallbacks.delete(callback);
    });
  }

  /**
   * Parse human-readable size to bytes
   */
  function parseSize(sizeStr) {
    if (!sizeStr) return 0;
    const units = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
    const match = sizeStr.toString().match(/^([\d.]+)\s*(B|KB|MB|GB|TB)$/i);
    if (!match) return 0;
    return parseFloat(match[1]) * (units[match[2].toUpperCase()] || 1);
  }

  /**
   * Format bytes to human-readable
   */
  function formatSize(bytes) {
    if (bytes === 0 || !bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + " " + units[i];
  }

  /**
   * Strip ANSI escape codes and carriage returns
   */
  function stripAnsi(str) {
    const esc = "\u001B";
    return str.replace(new RegExp(esc + "\\[[0-9;]*[A-Za-z]", "g"), "").replace(/\r/g, "");
  }

  /**
   * Parse mo clean --dry-run output (text format)
   */
  function parseCleanOutput(stdout) {
    const lines = stdout.split("\n");
    const categories = [];
    let currentCategory = null;

    for (const rawLine of lines) {
      const line = stripAnsi(rawLine);
      const trimmed = line.trim();

      // Category line: ➤ Category Name
      if (line.startsWith("➤ ")) {
        currentCategory = {
          name: trimmed.slice(2).trim(),
          size: "",
          sizeBytes: 0,
          items: [],
          checked: true,
        };
        categories.push(currentCategory);
        continue;
      }

      // Skip if no current category
      if (!currentCategory) continue;

      // Skip info/status lines
      if (
        trimmed.startsWith("✓") ||
        trimmed.startsWith("◎") ||
        trimmed.startsWith("•") ||
        trimmed.startsWith("↳") ||
        trimmed.startsWith("☞")
      ) {
        continue;
      }

      // Item line: → Description ... Y.ZMB dry
      if (trimmed.startsWith("→ ")) {
        const desc = trimmed.slice(2);
        const sizeMatch = desc.match(/([\d.]+)\s*(B|KB|MB|GB|TB)\s+dry/i);
        if (sizeMatch) {
          const sizeStr = sizeMatch[1] + " " + sizeMatch[2];
          let name = desc
            .replace(/(?:\s+|,\s*)\d+\s*(?:old\s*)?items?\b/gi, "")
            .replace(/,\s*[\d.]+\s*(?:B|KB|MB|GB|TB)\s+dry/gi, "")
            .trim()
            .replace(/,\s*$/, "");
          currentCategory.items.push({
            name,
            size: sizeStr,
            sizeBytes: parseSize(sizeStr),
            checked: true,
          });
        }
        continue;
      }
    }

    // Calculate category total sizes
    categories.forEach((cat) => {
      let total = 0;
      cat.items.forEach((item) => {
        total += item.sizeBytes;
      });
      if (total > 0) {
        cat.sizeBytes = total;
        cat.size = formatSize(total);
      }
    });

    // Remove empty categories
    const result = categories.filter((cat) => cat.items.length > 0);
    return result.length > 0 ? result : categories;
  }

  /**
   * Parse mo status output (JSON format)
   */
  function parseStatusOutput(stdout) {
    try {
      const data = JSON.parse(stdout);
      const hw = data.hardware || {};
      const cpu = data.cpu || {};
      const mem = data.memory || {};
      const disk = (data.disks || [])[0] || {};
      const net = (data.network || [])[0] || {};
      const batt = (data.batteries || [])[0] || {};
      const gpu = (data.gpu || [])[0] || {};

      return {
        cpuUsage: Math.round(cpu.usage || 0),
        cpuCores: cpu.core_count || (cpu.per_core || []).length,
        cpuModel: hw.cpu_model || "",
        memoryUsage: Math.round(mem.used_percent || 0),
        usedMemory: mem.used ? parseFloat((mem.used / 1024 ** 3).toFixed(1)) : 0,
        totalMemory: mem.total ? parseFloat((mem.total / 1024 ** 3).toFixed(1)) : 0,
        diskUsage: Math.round(disk.used_percent || 0),
        usedDisk: disk.used ? parseFloat((disk.used / 1024 ** 3).toFixed(1)) : 0,
        totalDisk: disk.total ? parseFloat((disk.total / 1024 ** 3).toFixed(1)) : 0,
        batteryPercent: batt.percent || 0,
        batteryStatus: batt.status || "",
        batteryTime: batt.time_left || "",
        downloadSpeed: net.rx_rate_mbs ? net.rx_rate_mbs.toFixed(1) + " MB/s" : "",
        uploadSpeed: net.tx_rate_mbs ? net.tx_rate_mbs.toFixed(1) + " MB/s" : "",
        gpuModel: gpu.name || "",
        gpuUsage: gpu.usage >= 0 ? gpu.usage : 0,
        gpuMemoryPercent:
          gpu.memory_total > 0 ? Math.round((gpu.memory_used / gpu.memory_total) * 100) : 0,
        usedGpuMemory: gpu.memory_used || 0,
        totalGpuMemory: gpu.memory_total || 0,
      };
    } catch {
      return {
        cpuUsage: 0,
        cpuCores: 0,
        cpuModel: "",
        memoryUsage: 0,
        usedMemory: 0,
        totalMemory: 0,
        diskUsage: 0,
        usedDisk: 0,
        totalDisk: 0,
        batteryPercent: 0,
        batteryStatus: "",
        batteryTime: "",
        downloadSpeed: "",
        uploadSpeed: "",
        gpuModel: "",
        gpuUsage: 0,
        gpuMemoryPercent: 0,
        usedGpuMemory: 0,
        totalGpuMemory: 0,
      };
    }
  }

  /**
   * Parse mo analyze -json output
   */
  function parseAnalyzeOutput(stdout) {
    try {
      const data = JSON.parse(stdout);
      const entries = data.entries || [];
      const colors = [
        "#0f6cbd",
        "#2889e0",
        "#5c9edc",
        "#83b4eb",
        "#a8cff5",
        "#b8d8f7",
        "#cde4fa",
        "#e1f0ff",
      ];

      // Disk data: top-level directories (exclude insight sub-items to avoid double-counting)
      const diskData = entries
        .filter((e) => e.is_dir && !e.insight)
        .map((e, i) => ({
          name: e.name,
          size: formatSize(e.size),
          bytes: e.size,
          color: colors[i % colors.length],
        }));

      // Top directories: largest non-insight directories
      const topDirectories = entries
        .filter((e) => e.is_dir && !e.insight)
        .sort((a, b) => b.size - a.size)
        .slice(0, 8)
        .map((e, i) => ({
          name: e.name,
          path: e.path,
          size: formatSize(e.size),
          bytes: e.size,
          percentage: 0,
          color: colors[i % colors.length],
        }));

      if (topDirectories.length > 0) {
        const maxBytes = Math.max(...topDirectories.map((d) => d.bytes));
        topDirectories.forEach((d) => {
          d.percentage = maxBytes > 0 ? Math.round((d.bytes / maxBytes) * 100) : 0;
        });
      }

      return { diskData, topDirectories, totalSize: data.total_size || 0 };
    } catch {
      return { diskData: [], topDirectories: [], totalSize: 0 };
    }
  }

  /**
   * Parse mo uninstall --list output (JSON format)
   */
  function parseUninstallOutput(stdout) {
    try {
      const list = JSON.parse(stdout);
      return list.map((app, idx) => ({
        id: idx + 1,
        name: app.name || "",
        version: app.bundle_id || "",
        path: app.path || "",
        size: app.size || "",
      }));
    } catch {
      return [];
    }
  }

  /**
   * Parse mo purge --dry-run --debug output
   */
  function parsePurgeOutput(stdout) {
    const items = [];
    const lines = stdout.split("\n");

    for (const line of lines) {
      const match = line.match(
        /\[DEBUG\]\s+\[DRY RUN\]\s+Would remove:\s+\*\s+(.+?),\s+([\d.]+\s*(?:B|KB|MB|GB|TB))(?:,\s+\d+\s+days\s+old)?/,
      );
      if (match) {
        const path = match[1].trim();
        const name = path.split("/").pop() || path;
        let type = "build";
        if (path.includes("node_modules")) type = "node";
        else if (path.includes("target")) type = "rust";
        else if (path.includes("__pycache__") || path.includes(".egg-info")) type = "python";
        const rawSize = match[2].trim();
        const sizeParts = rawSize.match(/^([\d.]+)\s*([A-Z]+)$/i);
        const size = sizeParts ? sizeParts[1] + " " + sizeParts[2].toUpperCase() : rawSize;
        items.push({
          id: items.length + 1,
          name,
          size,
          type,
          path,
          checked: false,
        });
      }
    }

    return items;
  }

  /**
   * Parse mo installer --dry-run --debug output
   */
  function parseInstallerOutput(stdout) {
    const packages = [];
    const pathMap = {};
    const lines = stdout.split("\n");

    // First pass: extract paths from debug lines
    for (const line of lines) {
      const debugMatch = line.match(/\[DEBUG\]\s+Found installer:\s+\*\s+(.+)$/);
      if (debugMatch) {
        const fullPath = debugMatch[1].trim();
        const name = fullPath.split("/").pop();
        pathMap[name] = fullPath;
      }
    }

    // Second pass: extract info from TUI lines
    for (const line of lines) {
      const clean = stripAnsi(line).trim();
      const match = clean.match(/^(?:➤\s+)?○\s+(.+?)\s+([\d.]+\s*(?:B|KB|MB|GB|TB))\s*\|\s*(.+)$/);
      if (match) {
        const name = match[1].trim();
        const extMatch = name.match(/\.([^.]+)$/);
        const rawSize = match[2].trim();
        const sizeParts = rawSize.match(/^([\d.]+)\s*([A-Z]+)$/i);
        const size = sizeParts ? sizeParts[1] + " " + sizeParts[2].toUpperCase() : rawSize;
        packages.push({
          id: packages.length + 1,
          name,
          ext: extMatch ? extMatch[1] : "",
          path: pathMap[name] || "",
          size,
          date: "",
          checked: false,
        });
      }
    }

    // Fallback: if no TUI lines but debug paths found, generate packages from paths alone
    if (packages.length === 0 && Object.keys(pathMap).length > 0) {
      for (const [name, fullPath] of Object.entries(pathMap)) {
        const extMatch = name.match(/\.([^.]+)$/);
        packages.push({
          id: packages.length + 1,
          name,
          ext: extMatch ? extMatch[1] : "",
          path: fullPath,
          size: "",
          date: "",
          checked: false,
        });
      }
    }

    return packages;
  }

  // ──────────────────────────
  //  Command wrappers: bind command args to parser
  // ──────────────────────────

  /**
   * Helper: combine stdout + stderr for parsing (Mole CLI outputs debug logs to stderr)
   */
  function combineOutput(res) {
    return [res.stdout, res.stderr].filter(Boolean).join("\n");
  }

  /**
   * Helper: extract real error message by filtering out [DEBUG] lines
   */
  function extractError(stderr, fallback) {
    const realError = stderr
      .split("\n")
      .filter((line) => !line.trim().startsWith("[DEBUG]"))
      .join("\n")
      .trim();
    return realError || fallback;
  }

  /**
   * Scan for installer packages (mo installer --dry-run --debug)
   */
  async function scanInstallers() {
    const res = await exec("installer --dry-run --debug");
    const combined = combineOutput(res);
    const parsed = parseInstallerOutput(combined);
    if (!res.success && parsed.length === 0) {
      const msg = extractError(res.stderr, `扫描失败 (exit code ${res.code})`);
      error.value = msg;
      throw new Error(msg);
    }
    return parsed;
  }

  /**
   * Preview clean targets (mo clean --dry-run)
   */
  async function previewClean() {
    const res = await execSudo("clean --dry-run");
    const combined = combineOutput(res);
    const parsed = parseCleanOutput(combined);
    if (!res.success && parsed.length === 0) {
      const msg = extractError(res.stderr, `预览扫描失败 (exit code ${res.code})`);
      error.value = msg;
      throw new Error(msg);
    }
    return parsed;
  }

  /**
   * Preview purge targets (mo purge --dry-run --debug)
   */
  async function previewPurge() {
    const res = await execSudo("purge --dry-run --debug");
    const combined = combineOutput(res);
    const parsed = parsePurgeOutput(combined);
    if (!res.success && parsed.length === 0) {
      const msg = extractError(res.stderr, `预览扫描失败 (exit code ${res.code})`);
      error.value = msg;
      throw new Error(msg);
    }
    return parsed;
  }

  /**
   * List installed apps (mo uninstall --list)
   */
  async function listApps() {
    const res = await exec("uninstall --list");
    const combined = combineOutput(res);
    const parsed = parseUninstallOutput(combined);
    if (!res.success && parsed.length === 0) {
      const msg = extractError(res.stderr, `获取应用列表失败 (exit code ${res.code})`);
      error.value = msg;
      throw new Error(msg);
    }
    return parsed;
  }

  /**
   * Scan disk usage (mo analyze -json)
   */
  async function scanDisk() {
    const res = await execSudo("analyze -json");
    const combined = combineOutput(res);
    const parsed = parseAnalyzeOutput(combined);
    if (!res.success && parsed.diskData.length === 0) {
      const msg = extractError(res.stderr, `磁盘分析失败 (exit code ${res.code})`);
      error.value = msg;
      throw new Error(msg);
    }
    return parsed;
  }

  return {
    loading,
    error,
    output,
    result,
    exec,
    execSudo,
    execRaw,
    listenOutput,
    removeOutputListener,
    onOutput,
    submitPassword,
    cancelPassword,
    cancelRunning,
    parseSize,
    formatSize,
    stripAnsi,
    parseCleanOutput,
    parseStatusOutput,
    parseAnalyzeOutput,
    parseUninstallOutput,
    parsePurgeOutput,
    parseInstallerOutput,
    scanInstallers,
    previewClean,
    previewPurge,
    listApps,
    scanDisk,
  };
}

const ERROR_KEY_MAP = {
  "mole.notInstalled": "error.moleNotInstalled",
  "mole.execFailed": "error.moleExecFailed",
  "mole.sudoFailed": "error.moleSudoFailed",
  "scan.failed": "error.scanFailed",
  "previewScan.failed": "error.previewScanFailed",
  "app.listFailed": "error.appListFailed",
  "disk.analyzeFailed": "error.diskAnalyzeFailed",
};

export function resolveErrorMessage(i18n, result) {
  if (!result || result.success !== false) return null;
  const key = result.errorKey;
  const t = typeof i18n === "function" ? i18n : i18n.global?.t || i18n.t;
  if (key && ERROR_KEY_MAP[key] && t) {
    return t(ERROR_KEY_MAP[key]);
  }
  return result.fallback || "Unknown error";
}
