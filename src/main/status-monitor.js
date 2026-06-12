const { spawn, exec } = require("child_process");
const fs = require("fs");

function execAsync(command, options) {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout, stderr });
    });
  });
}

// ============================================================
// Status Monitor — 后台系统状态采集器
// ============================================================
class StatusMonitor {
  constructor(getMainWindow, getMolePath) {
    this.getMainWindow = getMainWindow;
    this.getMolePath = getMolePath;
    this.timer = null;
    this.failCount = 0;
    // Network rate tracking
    this.lastNetBytes = { rx: 0, tx: 0 };
    this.lastNetTime = 0;
    this.netIface = "";
  }

  start() {
    if (this.timer) return;
    this.failCount = 0;
    this.scheduleTick(true);
  }

  scheduleTick(immediate = false) {
    const delay = immediate ? 0 : 2000;
    this.timer = setTimeout(() => {
      this.tick().finally(() => {
        if (this.timer) this.scheduleTick();
      });
    }, delay);
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.failCount = 0;
  }

  async tick() {
    const mainWindow = this.getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      this.stop();
      return;
    }

    const molePath = await this.getMolePath();
    if (!molePath) {
      mainWindow.webContents.send("system-status", {
        error: "未检测到 Mole CLI，请先安装：brew install tw93/tap/mole",
      });
      return;
    }

    try {
      const [moleResult, topResult, ioregResult, vmResult, diskResult, battResult, netResult] =
        await Promise.allSettled([
          this.fetchMole(molePath),
          this.fetchTopCpu(),
          this.fetchIoregGpu(),
          this.fetchVmStats(),
          this.fetchDiskInfo(),
          this.fetchPmsetBattery(),
          this.fetchNetstatNetwork(),
        ]);

      if (moleResult.status === "rejected") {
        this.failCount++;
        if (this.failCount >= 3) {
          this.stop();
          mainWindow.webContents.send("system-status", {
            error: `连续 3 次采集失败：${moleResult.reason || "未知错误"}`,
          });
        }
        return;
      }

      this.failCount = 0;
      const moleData = moleResult.value;

      // Native CPU from top
      const nativeCpu = topResult.status === "fulfilled" ? topResult.value : null;

      // Native GPU from ioreg
      const nativeGpu = ioregResult.status === "fulfilled" ? ioregResult.value : null;

      // Native memory from vm_stat
      const nativeMem = vmResult.status === "fulfilled" ? vmResult.value : null;

      // Native disk from df
      const nativeDisk = diskResult.status === "fulfilled" ? diskResult.value : null;

      // Native battery from pmset
      const nativeBatt = battResult.status === "fulfilled" ? battResult.value : null;

      // Native network from netstat
      const nativeNet = netResult.status === "fulfilled" ? netResult.value : null;

      // Build dual-source payload: shared fields at top level + mole/native blocks
      const payload = {
        ...moleData,
        platform: process.platform,
        mole: { ...moleData },
        native: {},
      };

      if (nativeCpu && nativeCpu.cpuUsage >= 0) {
        payload.native.cpuUsage = nativeCpu.cpuUsage;
        payload.native.cpuCores = moleData.cpuCores;
        payload.native.cpuModel = moleData.cpuModel;
      }

      if (nativeGpu && nativeGpu.gpuUsage >= 0) {
        payload.native.gpuUsage = nativeGpu.gpuUsage;
        payload.native.gpuMemoryPercent = nativeGpu.gpuMemoryPercent;
        payload.native.usedGpuMemory = nativeGpu.usedGpuMemory;
        payload.native.totalGpuMemory = nativeGpu.totalGpuMemory;
        payload.native.gpuModel = moleData.gpuModel;
      }

      if (nativeMem && nativeMem.memoryUsage >= 0) {
        payload.native.memoryUsage = nativeMem.memoryUsage;
        payload.native.usedMemory = nativeMem.usedMemory;
        payload.native.totalMemory = nativeMem.totalMemory;
      }

      if (nativeDisk && nativeDisk.diskUsage >= 0) {
        payload.native.diskUsage = nativeDisk.diskUsage;
        payload.native.usedDisk = nativeDisk.usedDisk;
        payload.native.totalDisk = nativeDisk.totalDisk;
      }

      if (nativeBatt && nativeBatt.batteryPercent >= 0) {
        payload.native.batteryPercent = nativeBatt.batteryPercent;
        payload.native.batteryStatus = nativeBatt.batteryStatus;
        payload.native.batteryTime = nativeBatt.batteryTime;
      }

      if (nativeNet) {
        payload.native.downloadSpeed = nativeNet.downloadSpeed;
        payload.native.uploadSpeed = nativeNet.uploadSpeed;
      }

      mainWindow.webContents.send("system-status", payload);
    } catch {
      // Silent fail for unexpected errors
    }
  }

  fetchMole(molePath) {
    return new Promise((resolve, reject) => {
      const child = spawn(molePath, ["status"], {
        env: { ...process.env, NO_COLOR: "1" },
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(stderr.trim() || "mole status failed"));
          return;
        }
        resolve(this.parseOutput(stdout.trim()));
      });

      child.on("error", reject);
    });
  }

  async fetchTopCpu() {
    try {
      const { stdout } = await execAsync("top -l 1 -n 0", {
        encoding: "utf8",
        timeout: 3000,
      });

      const match = stdout.match(/CPU usage:\s+([\d.]+)%\s+user,\s+([\d.]+)%\s+sys/);
      if (!match) return null;

      const user = parseFloat(match[1]);
      const sys = parseFloat(match[2]);
      const total = Math.round(user + sys);

      return { cpuUsage: total };
    } catch {
      return null;
    }
  }

  async fetchIoregGpu() {
    try {
      const { stdout } = await execAsync("ioreg -r -c IOAccelerator -d 1", {
        encoding: "utf8",
        timeout: 3000,
      });

      const perfMatch = stdout.match(/"PerformanceStatistics" = \{([^}]+)\}/);
      if (!perfMatch) return null;

      const perfBlock = perfMatch[1];

      const utilMatch = perfBlock.match(/"Device Utilization %"=(\d+)/);
      const deviceUtil = utilMatch ? parseInt(utilMatch[1], 10) : -1;

      if (deviceUtil < 0) return null;

      const inUseMatch = perfBlock.match(/"In use system memory"=(\d+)/);
      const allocMatch = perfBlock.match(/"Alloc system memory"=(\d+)/);

      const inUseBytes = inUseMatch ? parseInt(inUseMatch[1], 10) : 0;
      const allocBytes = allocMatch ? parseInt(allocMatch[1], 10) : 0;

      const usedGb = inUseBytes > 0 ? parseFloat((inUseBytes / 1024 ** 3).toFixed(1)) : 0;
      const totalGb = allocBytes > 0 ? parseFloat((allocBytes / 1024 ** 3).toFixed(1)) : 0;

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
      // Get total physical memory from sysctl (accurate)
      const { stdout: memsizeOutput } = await execAsync("sysctl hw.memsize", {
        encoding: "utf8",
        timeout: 3000,
      });
      const memsizeMatch = memsizeOutput.match(/hw\.memsize:\s+(\d+)/);
      const totalBytes = memsizeMatch ? parseInt(memsizeMatch[1], 10) : 0;

      const { stdout } = await execAsync("vm_stat", {
        encoding: "utf8",
        timeout: 3000,
      });

      // Parse page size
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

      // macOS Activity Monitor formula:
      // Used = Wired + App + Compressed
      // App ≈ Anonymous pages, Compressed = occupied by compressor
      // If Anonymous pages is unavailable (older macOS), fallback to active
      const appPages = anonymous > 0 ? anonymous : active;
      const usedBytes = (wired + appPages + compressed) * pageSize;

      const usedGb = parseFloat((usedBytes / 1024 ** 3).toFixed(1));
      const totalGb = parseFloat((totalBytes / 1024 ** 3).toFixed(1));
      const usagePercent = totalGb > 0 ? Math.round((usedGb / totalGb) * 100) : 0;

      return {
        memoryUsage: usagePercent,
        usedMemory: usedGb,
        totalMemory: totalGb,
      };
    } catch {
      return null;
    }
  }

  async fetchDiskInfo() {
    try {
      // macOS: use fs.statfs for APFS container-level stats
      // df -k / only shows the system snapshot volume (~2%), not actual usage
      if (process.platform === "darwin") {
        const stats = await fs.promises.statfs("/");
        const bsize = stats.bsize || 4096;
        const totalBytes = stats.blocks * bsize;
        const freeBytes = stats.bavail * bsize;
        const usedBytes = totalBytes - freeBytes;

        if (totalBytes <= 0) return null;

        const totalGb = parseFloat((totalBytes / 1024 ** 3).toFixed(1));
        const usedGb = parseFloat((usedBytes / 1024 ** 3).toFixed(1));
        const usagePercent = Math.round((usedBytes / totalBytes) * 100);

        return {
          diskUsage: usagePercent,
          usedDisk: usedGb,
          totalDisk: totalGb,
        };
      }

      // Linux / fallback: use df -k /
      const { stdout } = await execAsync("df -k /", {
        encoding: "utf8",
        timeout: 3000,
      });

      // Skip header line, parse the data line
      const lines = stdout.trim().split("\n");
      if (lines.length < 2) return null;

      const dataLine = lines[1];
      const parts = dataLine.trim().split(/\s+/);
      if (parts.length < 6) return null;

      // df -k output: Filesystem 1K-blocks Used Available Use% Mounted
      const totalKb = parseInt(parts[1], 10);
      const usedKb = parseInt(parts[2], 10);

      if (isNaN(totalKb) || isNaN(usedKb) || totalKb <= 0) return null;

      const totalGb = parseFloat((totalKb / 1024 ** 2).toFixed(1));
      const usedGb = parseFloat((usedKb / 1024 ** 2).toFixed(1));
      const usagePercent = Math.round((usedKb / totalKb) * 100);

      return {
        diskUsage: usagePercent,
        usedDisk: usedGb,
        totalDisk: totalGb,
      };
    } catch {
      return null;
    }
  }

  async fetchPmsetBattery() {
    try {
      const { stdout } = await execAsync("pmset -g batt", {
        encoding: "utf8",
        timeout: 3000,
      });

      // Example: -InternalBattery-0	63%; discharging; 2:41 remaining present: true
      const line = stdout.split("\n").find((l) => l.includes("InternalBattery") || l.includes("%"));
      if (!line) return null;

      const percentMatch = line.match(/(\d+)%/);
      const percent = percentMatch ? parseInt(percentMatch[1], 10) : 0;

      // Status: discharging | charging | AC power
      let status = "";
      if (line.includes("discharging")) status = "放电中";
      else if (line.includes("charging")) status = "充电中";
      else if (line.includes("AC Power") || line.includes("ac power")) status = "电源供电";
      else if (line.includes("charged") || line.includes("finishing charge")) status = "已充满";

      // Time remaining: e.g. "2:41 remaining" or "(no estimate)"
      const timeMatch = line.match(/(\d+:\d+)\s+remaining/);
      const time = timeMatch ? `${timeMatch[1]} 剩余` : "";

      return {
        batteryPercent: percent,
        batteryStatus: status,
        batteryTime: time,
      };
    } catch {
      return null;
    }
  }

  async fetchNetstatNetwork() {
    try {
      // Find default network interface
      let iface = this.netIface;
      if (!iface) {
        try {
          const { stdout: routeOutput } = await execAsync("route -n get default | grep interface", {
            encoding: "utf8",
            timeout: 2000,
          });
          const routeMatch = routeOutput.match(/interface:\s+(\S+)/);
          if (routeMatch) {
            iface = routeMatch[1];
            this.netIface = iface;
          }
        } catch {
          // ignore
        }
      }

      if (!iface) {
        return { downloadSpeed: "--", uploadSpeed: "--" };
      }

      const { stdout } = await execAsync(`netstat -ib -I ${iface}`, {
        encoding: "utf8",
        timeout: 3000,
      });

      // Parse <Link#> line for raw byte counts
      const lines = stdout.trim().split("\n");
      const linkLine = lines.find((l) => l.includes("<Link#"));
      if (!linkLine) {
        return { downloadSpeed: "--", uploadSpeed: "--" };
      }

      const parts = linkLine.trim().split(/\s+/);
      // Format: Name Mtu Network Address Ipkts Ierrs Ibytes Opkts Oerrs Obytes Coll
      if (parts.length < 10) {
        return { downloadSpeed: "--", uploadSpeed: "--" };
      }

      const rxBytes = parseInt(parts[6], 10);
      const txBytes = parseInt(parts[9], 10);
      const now = Date.now();

      let downloadSpeed = "--";
      let uploadSpeed = "--";

      if (this.lastNetTime > 0 && this.lastNetBytes.rx > 0 && this.lastNetBytes.tx > 0) {
        const dt = (now - this.lastNetTime) / 1000; // seconds
        if (dt > 0) {
          const rxDiff = rxBytes - this.lastNetBytes.rx;
          const txDiff = txBytes - this.lastNetBytes.tx;

          function formatSpeed(bytesPerSec) {
            const mbs = bytesPerSec / (1024 * 1024);
            if (mbs >= 1) return `${mbs.toFixed(1)} MB/s`;
            if (bytesPerSec <= 0) return "0 KB/s";
            return `${Math.round(bytesPerSec / 1024)} KB/s`;
          }

          downloadSpeed = formatSpeed(rxDiff / dt);
          uploadSpeed = formatSpeed(txDiff / dt);
        }
      }

      this.lastNetBytes = { rx: rxBytes, tx: txBytes };
      this.lastNetTime = now;

      return { downloadSpeed, uploadSpeed };
    } catch {
      return { downloadSpeed: "--", uploadSpeed: "--" };
    }
  }

  parseOutput(stdout) {
    try {
      const data = JSON.parse(stdout);
      const hw = data.hardware || {};
      const cpu = data.cpu || {};
      const mem = data.memory || {};
      const disk = (data.disks || [])[0] || {};
      const nets = data.network || [];
      const batt = (data.batteries || [])[0] || {};
      const gpu = (data.gpu || [])[0] || {};

      // Sum network traffic across all interfaces
      let totalRx = 0;
      let totalTx = 0;
      for (const n of nets) {
        totalRx += n.rx_rate_mbs || 0;
        totalTx += n.tx_rate_mbs || 0;
      }

      function formatNetSpeed(mbs) {
        if (mbs >= 1) return `${mbs.toFixed(1)} MB/s`;
        if (mbs <= 0) return "0 KB/s";
        return `${Math.round(mbs * 1024)} KB/s`;
      }

      return {
        cpuUsage: Math.round(cpu.usage || 0),
        cpuCores: cpu.core_count || (cpu.per_core || []).length || 0,
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
        downloadSpeed: formatNetSpeed(totalRx),
        uploadSpeed: formatNetSpeed(totalTx),
        gpuModel: gpu.name || "",
        // -1 means unavailable on Apple Silicon macOS
        gpuUsage: gpu.usage >= 0 ? gpu.usage : -1,
        gpuMemoryPercent:
          gpu.memory_total > 0 ? Math.round((gpu.memory_used / gpu.memory_total) * 100) : -1,
        usedGpuMemory: gpu.memory_used || 0,
        totalGpuMemory: gpu.memory_total || 0,
        uptimeSeconds: data.uptime_seconds || 0,
        uptimeText: data.uptime || "",
        platform: data.platform || "",
        osVersion: hw.os_version || "",
        healthScore: data.health_score ?? 0,
        healthScoreMsg: data.health_score_msg || "",
      };
    } catch (err) {
      return { error: `解析状态数据失败：${err.message}` };
    }
  }
}

module.exports = { StatusMonitor };
