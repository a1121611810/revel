// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "events";
import Module from "module";

// Pre-made command outputs
const TOP_CPU_OUTPUT = `Processes: 420 total, 2 running, 418 sleeping, 2048 threads
CPU usage: 12.3% user, 4.5% sys, 83.2% idle`;

const IOREG_GPU_OUTPUT = `"PerformanceStatistics" = {"Device Utilization %"=45,"In use system memory"=1073741824,"Alloc system memory"=2147483648}`;

const SYSCTL_MEM_OUTPUT = `hw.memsize: 17179869184`;

const VM_STAT_OUTPUT = `Mach Virtual Memory Statistics: (page size of 16384 bytes)
Pages wired down: 12345
Pages active: 67890
Pages occupied by compressor: 5432
Anonymous pages: 78901`;

const DF_DISK_OUTPUT = `Filesystem  1024-blocks     Used Available Capacity iused ifree %iused  Mounted on
/dev/disk1s1  976562496 345678901 630883595    36%  1234567 9876543   11%   /`;

const PMSET_BATTERY_OUTPUT = `Now drawing from 'Battery Power'
 -InternalBattery-0	63%; discharging; 2:41 remaining present: true`;

const ROUTE_INTERFACE_OUTPUT = `interface: en0`;

const NETSTAT_OUTPUT = `Name  Mtu   Network     Address    Ipkts Ierrs Ibytes   Opkts Oerrs Obytes  Coll
en0   1500  <Link#6>    aa:bb:cc   1000   0    5000000  800    0    3000000  0`;

const MOLE_STATUS_JSON = `{"hardware":{"cpu_model":"Apple M3 Pro","os_version":"14.5"},"cpu":{"usage":15.2,"core_count":12},"memory":{"used_percent":42,"used":17179869184,"total":34359738368},"disks":[{"used_percent":36,"used":345678901000,"total":976562496000}],"network":[{"rx_rate_mbs":1.2,"tx_rate_mbs":0.8}],"batteries":[{"percent":63,"status":"discharging","time_left":"2:41"}],"gpu":[{"name":"Apple M3 Pro GPU","usage":25,"memory_used":1073741824,"memory_total":2147483648}],"uptime_seconds":3600,"uptime":"1:00:00","health_score":85,"health_score_msg":"Good"}`;

// Mock child_process
const mockSpawn = vi.hoisted(() => vi.fn());
const mockExec = vi.hoisted(() => vi.fn());

vi.mock("child_process", () => ({
  default: {
    spawn: mockSpawn,
    exec: mockExec,
  },
  spawn: mockSpawn,
  exec: mockExec,
}));

import fs from "fs";

// MockChildProcess for spawn mock
class MockChildProcess extends EventEmitter {
  constructor() {
    super();
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
  }
}

// Helper: set mockSpawn to return a specific child while validating file parameter
function setMockSpawnChild(mockChild) {
  mockSpawn.mockImplementation((file) => {
    if (typeof file !== "string") {
      throw new TypeError(
        `The "file" argument must be of type string. Received ${typeof file}`
      );
    }
    return mockChild;
  });
}

// Create mock mainWindow
function createMockMainWindow(overrides = {}) {
  return {
    isDestroyed: vi.fn(() => false),
    webContents: {
      send: vi.fn(),
    },
    ...overrides,
  };
}

// Dynamic import helper
async function importStatusMonitor() {
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "child_process") {
      return {
        spawn: mockSpawn,
        exec: mockExec,
      };
    }
    return originalLoad(request, parent, isMain);
  };

  let module;
  try {
    module = await import("@main/status-monitor.js");
  } finally {
    Module._load = originalLoad;
  }
  return module;
}

describe("StatusMonitor", () => {
  let StatusMonitor;
  let mockMainWindow;
  let mockGetMainWindow;
  let mockGetMolePath;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useRealTimers();

    mockMainWindow = createMockMainWindow();
    mockGetMainWindow = vi.fn(() => mockMainWindow);
    mockGetMolePath = vi.fn(async () => "/usr/local/bin/mo");

    // Default mockSpawn with parameter validation (matches real child_process.spawn contract)
    mockSpawn.mockImplementation((file) => {
      if (typeof file !== "string") {
        throw new TypeError(
          `The "file" argument must be of type string. Received ${typeof file}`
        );
      }
      return new MockChildProcess();
    });

    const module = await importStatusMonitor();
    StatusMonitor = module.StatusMonitor;
  });

  describe("Lifecycle (constructor, start, stop)", () => {
    it("start() triggers tick immediately then every 2s", async () => {
      vi.useFakeTimers();
      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const tickSpy = vi.spyOn(monitor, "tick").mockResolvedValue();

      monitor.start();
      expect(tickSpy).toHaveBeenCalledTimes(0);

      await vi.advanceTimersByTimeAsync(0);
      expect(tickSpy).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(2000);
      expect(tickSpy).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(2000);
      expect(tickSpy).toHaveBeenCalledTimes(3);

      monitor.stop();
    });

    it("start() called twice does NOT create multiple timers", () => {
      vi.useFakeTimers();
      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const tickSpy = vi.spyOn(monitor, "tick").mockResolvedValue();

      monitor.start();
      monitor.start();

      expect(tickSpy).toHaveBeenCalledTimes(0);

      monitor.stop();
    });

    it("stop() clears the timer", async () => {
      vi.useFakeTimers();
      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const tickSpy = vi.spyOn(monitor, "tick").mockResolvedValue();

      monitor.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(tickSpy).toHaveBeenCalledTimes(1);

      monitor.stop();
      await vi.advanceTimersByTimeAsync(4000);
      expect(tickSpy).toHaveBeenCalledTimes(1);
    });

    it("stop() resets failCount to 0", () => {
      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      monitor.failCount = 5;
      monitor.stop();
      expect(monitor.failCount).toBe(0);
    });
  });

  describe("tick() flow", () => {
    it("getMainWindow() returns null → does nothing", async () => {
      mockGetMainWindow.mockReturnValue(null);
      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);

      await monitor.tick();

      expect(mockGetMolePath).not.toHaveBeenCalled();
    });

    it("getMainWindow() returns destroyed window → calls stop()", async () => {
      const destroyedWindow = createMockMainWindow({
        isDestroyed: vi.fn(() => true),
      });
      mockGetMainWindow.mockReturnValue(destroyedWindow);
      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const stopSpy = vi.spyOn(monitor, "stop");

      await monitor.tick();

      expect(stopSpy).toHaveBeenCalled();
    });

    it("getMolePath() returns empty string → sends error payload via webContents.send", async () => {
      mockGetMolePath.mockResolvedValue("");
      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);

      await monitor.tick();

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith("system-status", {
        error: "未检测到 Mole CLI，请先安装：brew install tw93/tap/mole",
      });
    });

    it("fetchMole succeeds on first try → failCount stays 0", async () => {
      const mockChild = new MockChildProcess();
      setMockSpawnChild(mockChild);
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (cmd.includes("top")) { callback(null, TOP_CPU_OUTPUT, ""); return; }
        if (cmd.includes("ioreg")) { callback(null, IOREG_GPU_OUTPUT, ""); return; }
        if (cmd.includes("sysctl")) { callback(null, SYSCTL_MEM_OUTPUT, ""); return; }
        if (cmd.includes("vm_stat")) { callback(null, VM_STAT_OUTPUT, ""); return; }
        if (cmd.includes("df")) { callback(null, DF_DISK_OUTPUT, ""); return; }
        if (cmd.includes("pmset")) { callback(null, PMSET_BATTERY_OUTPUT, ""); return; }
        if (cmd.includes("route")) { callback(null, ROUTE_INTERFACE_OUTPUT, ""); return; }
        if (cmd.includes("netstat")) { callback(null, NETSTAT_OUTPUT, ""); return; }
        callback(null, "", ""); return;
      });

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);

      const tickPromise = monitor.tick();
      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from(MOLE_STATUS_JSON));
        mockChild.emit("close", 0);
      }, 10);
      await tickPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        "/usr/local/bin/mo",
        ["status"],
        expect.objectContaining({ env: expect.any(Object) })
      );
      expect(monitor.failCount).toBe(0);
    });

    it("fetchMole fails once → failCount increments to 1, continues", async () => {
      const mockChild = new MockChildProcess();
      setMockSpawnChild(mockChild);
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (cmd.includes("top")) { callback(null, TOP_CPU_OUTPUT, ""); return; }
        if (cmd.includes("ioreg")) { callback(null, IOREG_GPU_OUTPUT, ""); return; }
        if (cmd.includes("sysctl")) { callback(null, SYSCTL_MEM_OUTPUT, ""); return; }
        if (cmd.includes("vm_stat")) { callback(null, VM_STAT_OUTPUT, ""); return; }
        if (cmd.includes("df")) { callback(null, DF_DISK_OUTPUT, ""); return; }
        if (cmd.includes("pmset")) { callback(null, PMSET_BATTERY_OUTPUT, ""); return; }
        if (cmd.includes("route")) { callback(null, ROUTE_INTERFACE_OUTPUT, ""); return; }
        if (cmd.includes("netstat")) { callback(null, NETSTAT_OUTPUT, ""); return; }
        callback(null, "", ""); return;
      });

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);

      const tickPromise = monitor.tick();
      setTimeout(() => {
        mockChild.stderr.emit("data", Buffer.from("error"));
        mockChild.emit("close", 1);
      }, 10);
      await tickPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        "/usr/local/bin/mo",
        ["status"],
        expect.objectContaining({ env: expect.any(Object) })
      );
      expect(monitor.failCount).toBe(1);
      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it("fetchMole fails 3 times consecutively → calls stop() and sends error", async () => {
      const mockChild = new MockChildProcess();
      setMockSpawnChild(mockChild);

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const stopSpy = vi.spyOn(monitor, "stop");

      for (let i = 0; i < 3; i++) {
        const tickPromise = monitor.tick();
        setTimeout(() => {
          mockChild.stderr.emit("data", Buffer.from("mole error"));
          mockChild.emit("close", 1);
        }, 10);
        await tickPromise;
      }

      expect(stopSpy).toHaveBeenCalled();
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith("system-status", {
        error: "连续 3 次采集失败：Error: mole error",
      });
      expect(mockSpawn).toHaveBeenCalledWith(
        "/usr/local/bin/mo",
        ["status"],
        expect.objectContaining({ env: expect.any(Object) })
      );
    });

    it("All native fetchers fail but mole succeeds → payload still contains mole data", async () => {
      const mockChild = new MockChildProcess();
      setMockSpawnChild(mockChild);
      mockExec.mockImplementation((cmd, opts, callback) => {
        callback(new Error("exec error"), "", ""); return;
      });

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);

      const tickPromise = monitor.tick();
      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from(MOLE_STATUS_JSON));
        mockChild.emit("close", 0);
      }, 10);
      await tickPromise;

      const payload = mockMainWindow.webContents.send.mock.calls[0][1];
      expect(payload.cpuUsage).toBe(15);
      expect(payload.mole).toBeDefined();
      expect(payload.native).toBeDefined();
      expect(mockSpawn).toHaveBeenCalledWith(
        "/usr/local/bin/mo",
        ["status"],
        expect.objectContaining({ env: expect.any(Object) })
      );
    });

    it("getMolePath returns Promise → tick() awaits and spawn receives string", async () => {
      const mockChild = new MockChildProcess();
      setMockSpawnChild(mockChild);

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);

      const tickPromise = monitor.tick();
      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from(MOLE_STATUS_JSON));
        mockChild.emit("close", 0);
      }, 10);
      await tickPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        "/usr/local/bin/mo",
        ["status"],
        expect.any(Object)
      );
    });

    it("spawn file argument is a Promise → throws TypeError", async () => {
      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);

      await expect(monitor.fetchMole(Promise.resolve("/usr/local/bin/mo")))
        .rejects.toThrow('The "file" argument must be of type string');
    });
  });

  describe("fetchMole", () => {
    it("Spawn succeeds with code 0 → resolves with parsed data", async () => {
      const mockChild = new MockChildProcess();
      setMockSpawnChild(mockChild);

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const fetchPromise = monitor.fetchMole("/usr/local/bin/mo");

      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from(MOLE_STATUS_JSON));
        mockChild.emit("close", 0);
      }, 10);

      const result = await fetchPromise;
      expect(result.cpuUsage).toBe(15);
      expect(result.cpuModel).toBe("Apple M3 Pro");
      expect(mockSpawn).toHaveBeenCalledWith(
        "/usr/local/bin/mo",
        ["status"],
        expect.any(Object)
      );
    });

    it("Spawn exits with non-zero code → rejects with stderr", async () => {
      const mockChild = new MockChildProcess();
      setMockSpawnChild(mockChild);

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const fetchPromise = monitor.fetchMole("/usr/local/bin/mo");

      setTimeout(() => {
        mockChild.stderr.emit("data", Buffer.from("command failed"));
        mockChild.emit("close", 1);
      }, 10);

      await expect(fetchPromise).rejects.toThrow("command failed");
      expect(mockSpawn).toHaveBeenCalledWith(
        "/usr/local/bin/mo",
        ["status"],
        expect.any(Object)
      );
    });

    it("Spawn error (e.g. ENOENT) → rejects", async () => {
      const mockChild = new MockChildProcess();
      setMockSpawnChild(mockChild);

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const fetchPromise = monitor.fetchMole("/usr/local/bin/mo");

      setTimeout(() => {
        mockChild.emit("error", new Error("spawn ENOENT"));
      }, 10);

      await expect(fetchPromise).rejects.toThrow("spawn ENOENT");
      expect(mockSpawn).toHaveBeenCalledWith(
        "/usr/local/bin/mo",
        ["status"],
        expect.any(Object)
      );
    });
  });

  describe("parseOutput", () => {
    it("returns object with all expected fields", () => {
      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = monitor.parseOutput(MOLE_STATUS_JSON);

      expect(result.cpuUsage).toBe(15);
      expect(result.cpuCores).toBe(12);
      expect(result.cpuModel).toBe("Apple M3 Pro");
      expect(result.memoryUsage).toBe(42);
      expect(result.usedMemory).toBe(16);
      expect(result.totalMemory).toBe(32);
      expect(result.diskUsage).toBe(36);
      expect(result.usedDisk).toBeCloseTo(321.9, 0);
      expect(result.totalDisk).toBeCloseTo(909.5, 0);
      expect(result.batteryPercent).toBe(63);
      expect(result.batteryStatus).toBe("discharging");
      expect(result.batteryTime).toBe("2:41");
      expect(result.downloadSpeed).toBe("1.2 MB/s");
      expect(result.uploadSpeed).toBe("819 KB/s");
      expect(result.gpuModel).toBe("Apple M3 Pro GPU");
      expect(result.gpuUsage).toBe(25);
      expect(result.gpuMemoryPercent).toBe(50);
      expect(result.usedGpuMemory).toBe(1073741824);
      expect(result.totalGpuMemory).toBe(2147483648);
      expect(result.uptimeSeconds).toBe(3600);
      expect(result.uptimeText).toBe("1:00:00");
      expect(result.platform).toBe("");
      expect(result.osVersion).toBe("14.5");
      expect(result.healthScore).toBe(85);
      expect(result.healthScoreMsg).toBe("Good");
    });

    it("with invalid JSON → returns {error: '...'}", () => {
      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = monitor.parseOutput("invalid json");

      expect(result.error).toMatch(/解析状态数据失败/);
    });

    it("with missing fields → defaults are correct", () => {
      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = monitor.parseOutput("{}");

      expect(result.gpuUsage).toBe(-1);
      expect(result.gpuMemoryPercent).toBe(-1);
      expect(result.usedGpuMemory).toBe(0);
      expect(result.totalGpuMemory).toBe(0);
      expect(result.cpuUsage).toBe(0);
      expect(result.cpuCores).toBe(0);
      expect(result.cpuModel).toBe("");
      expect(result.healthScore).toBe(0);
      expect(result.healthScoreMsg).toBe("");
      expect(result.downloadSpeed).toBe("0 KB/s");
      expect(result.uploadSpeed).toBe("0 KB/s");
    });
  });

  describe("fetchTopCpu", () => {
    it('Parses "CPU usage: 12.3% user, 4.5% sys" → {cpuUsage: 16}', async () => {
      mockExec.mockImplementation((cmd, opts, callback) => callback(null, TOP_CPU_OUTPUT, ""));

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchTopCpu();

      expect(result).toEqual({ cpuUsage: 17 });
    });

    it("Output format mismatch → null", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => callback(null, "unexpected output", ""));

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchTopCpu();

      expect(result).toBeNull();
    });

    it("execSync throws → null", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        callback(new Error("exec error"), "", ""); return;
      });

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchTopCpu();

      expect(result).toBeNull();
    });
  });

  describe("fetchIoregGpu", () => {
    it("Parses full PerformanceStatistics → {gpuUsage, gpuMemoryPercent, usedGpuMemory, totalGpuMemory}", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => callback(null, IOREG_GPU_OUTPUT, ""));

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchIoregGpu();

      expect(result).toEqual({
        gpuUsage: 45,
        gpuMemoryPercent: 50,
        usedGpuMemory: 1,
        totalGpuMemory: 2,
      });
    });

    it("No PerformanceStatistics block → null", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => callback(null, '{"foo":"bar"}', ""));

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchIoregGpu();

      expect(result).toBeNull();
    });

    it("Device Utilization % < 0 → null", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => callback(null, `"PerformanceStatistics" = {"Device Utilization %"=-1}`, ""));

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchIoregGpu();

      expect(result).toBeNull();
    });

    it("Missing memory fields → GB values are 0", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => callback(null, `"PerformanceStatistics" = {"Device Utilization %"=50}`, ""));

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchIoregGpu();

      expect(result.gpuUsage).toBe(50);
      expect(result.gpuMemoryPercent).toBe(0);
      expect(result.usedGpuMemory).toBe(0);
      expect(result.totalGpuMemory).toBe(0);
    });

    it("execSync throws → null", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        callback(new Error("exec error"), "", ""); return;
      });

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchIoregGpu();

      expect(result).toBeNull();
    });
  });

  describe("fetchVmStats", () => {
    it("Parses sysctl + vm_stat → {memoryUsage, usedMemory, totalMemory}", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (cmd.includes("sysctl")) { callback(null, SYSCTL_MEM_OUTPUT, ""); return; }
        if (cmd.includes("vm_stat")) { callback(null, VM_STAT_OUTPUT, ""); return; }
        callback(null, "", ""); return;
      });

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchVmStats();

      expect(result.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(result.usedMemory).toBeGreaterThan(0);
      expect(result.totalMemory).toBe(16);
    });

    it("Page size fallback to 16384 when not found", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (cmd.includes("sysctl")) { callback(null, SYSCTL_MEM_OUTPUT, ""); return; }
        if (cmd.includes("vm_stat")) {
          callback(null, `Pages wired down: 1000
Pages active: 2000
Pages occupied by compressor: 500
Anonymous pages: 3000`, ""); return;
        }
        callback(null, "", ""); return;
      });

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchVmStats();

      expect(result.totalMemory).toBe(16);
      expect(result.usedMemory).toBeGreaterThan(0);
    });

    it("Anonymous pages preferred over active", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (cmd.includes("sysctl")) { callback(null, SYSCTL_MEM_OUTPUT, ""); return; }
        if (cmd.includes("vm_stat")) {
          callback(null, `Mach Virtual Memory Statistics: (page size of 16384 bytes)
Pages wired down: 1000
Pages active: 2000
Pages occupied by compressor: 500
Anonymous pages: 3000`, ""); return;
        }
        callback(null, "", ""); return;
      });

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchVmStats();

      const expectedUsed = ((1000 + 3000 + 500) * 16384) / 1024 ** 3;
      expect(result.usedMemory).toBe(parseFloat(expectedUsed.toFixed(1)));
    });

    it("Pages occupied by compressor counted as used", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (cmd.includes("sysctl")) { callback(null, SYSCTL_MEM_OUTPUT, ""); return; }
        if (cmd.includes("vm_stat")) {
          callback(null, `Mach Virtual Memory Statistics: (page size of 16384 bytes)
Pages wired down: 1000
Pages active: 2000
Pages occupied by compressor: 500
Anonymous pages: 3000`, ""); return;
        }
        callback(null, "", ""); return;
      });

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchVmStats();

      const expectedUsed = ((1000 + 3000 + 500) * 16384) / 1024 ** 3;
      expect(result.usedMemory).toBe(parseFloat(expectedUsed.toFixed(1)));
    });

    it("execSync throws → null", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        callback(new Error("exec error"), "", ""); return;
      });

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchVmStats();

      expect(result).toBeNull();
    });
  });

  describe("fetchDiskInfo", () => {
    it("macOS: fs.statfs returns correct disk usage", async () => {
      const statfsSpy = vi.spyOn(fs.promises, "statfs").mockResolvedValue({
        bsize: 4096,
        blocks: 122742608,
        bavail: 20053539,
      });

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchDiskInfo();

      expect(statfsSpy).toHaveBeenCalledWith("/");
      expect(result.diskUsage).toBe(84);
      expect(result.usedDisk).toBeCloseTo(391.7, 0);
      expect(result.totalDisk).toBeCloseTo(468.2, 0);

      statfsSpy.mockRestore();
    });

    it("macOS: totalBytes <= 0 → null", async () => {
      const statfsSpy = vi.spyOn(fs.promises, "statfs").mockResolvedValue({ bsize: 4096, blocks: 0, bavail: 0 });

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchDiskInfo();

      expect(result).toBeNull();
      statfsSpy.mockRestore();
    });

    it("macOS: statfs throws → null", async () => {
      const statfsSpy = vi.spyOn(fs.promises, "statfs").mockRejectedValue(new Error("statfs error"));

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchDiskInfo();

      expect(result).toBeNull();
      statfsSpy.mockRestore();
    });
  });

  describe("fetchPmsetBattery", () => {
    it("Parses discharging → batteryStatus: 放电中", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => callback(null, PMSET_BATTERY_OUTPUT, ""));

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchPmsetBattery();

      expect(result.batteryStatus).toBe("放电中");
    });

    it("Parses charging → batteryStatus: 充电中", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => callback(null, ` -InternalBattery-0	63%; charging; 2:41 remaining present: true`, ""));

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchPmsetBattery();

      expect(result.batteryStatus).toBe("充电中");
    });

    it("Parses AC Power → batteryStatus: 电源供电", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => callback(null, ` -InternalBattery-0	100%; AC Power; 0:00 remaining present: true`, ""));

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchPmsetBattery();

      expect(result.batteryStatus).toBe("电源供电");
    });

    it("Parses charged → batteryStatus: 已充满", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => callback(null, ` -InternalBattery-0	100%; charged; 0:00 remaining present: true`, ""));

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchPmsetBattery();

      expect(result.batteryStatus).toBe("已充满");
    });

    it("Parses finishing charge → batteryStatus: 已充满", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => callback(null, ` -InternalBattery-0	98%; finishing charge; 0:10 remaining present: true`, ""));

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchPmsetBattery();

      expect(result.batteryStatus).toBe("已充满");
    });

    it('Parses "2:41 remaining" → batteryTime: "2:41 剩余"', async () => {
      mockExec.mockImplementation((cmd, opts, callback) => callback(null, PMSET_BATTERY_OUTPUT, ""));

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchPmsetBattery();

      expect(result.batteryTime).toBe("2:41 剩余");
    });

    it("No battery line → null", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => callback(null, "Now drawing from 'AC Power'", ""));

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchPmsetBattery();

      expect(result).toBeNull();
    });

    it("execSync throws → null", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        callback(new Error("exec error"), "", ""); return;
      });

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchPmsetBattery();

      expect(result).toBeNull();
    });
  });

  describe("fetchNetstatNetwork", () => {
    it("First call probes iface via route", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (cmd.includes("route")) { callback(null, ROUTE_INTERFACE_OUTPUT, ""); return; }
        if (cmd.includes("netstat")) { callback(null, NETSTAT_OUTPUT, ""); return; }
        callback(null, "", ""); return;
      });

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchNetstatNetwork();

      expect(monitor.netIface).toBe("en0");
      expect(result.downloadSpeed).toBe("--");
      expect(result.uploadSpeed).toBe("--");
    });

    it("Second call calculates rx/tx rate", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (cmd.includes("route")) { callback(null, ROUTE_INTERFACE_OUTPUT, ""); return; }
        if (cmd.includes("netstat")) { callback(null, NETSTAT_OUTPUT, ""); return; }
        callback(null, "", ""); return;
      });

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      await monitor.fetchNetstatNetwork();

      // Simulate time passing and byte increase
      const futureTime = Date.now() + 1000;
      const futureNetstat = `Name  Mtu   Network     Address    Ipkts Ierrs Ibytes   Opkts Oerrs Obytes  Coll
en0   1500  <Link#6>    aa:bb:cc   1000   0    6050000  800    0    4040000  0`;

      mockExec.mockImplementation((cmd, opts, callback) => {
        if (cmd.includes("netstat")) { callback(null, futureNetstat, ""); return; }
        callback(null, "", ""); return;
      });

      // Mock Date.now for predictable dt
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => futureTime);

      const result = await monitor.fetchNetstatNetwork();

      Date.now = originalDateNow;

      expect(result.downloadSpeed).toBe("1.0 MB/s");
      expect(result.uploadSpeed).toBe("1016 KB/s");
    });

    it("formatSpeed ≥1 MB/s", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (cmd.includes("route")) { callback(null, ROUTE_INTERFACE_OUTPUT, ""); return; }
        if (cmd.includes("netstat")) { callback(null, NETSTAT_OUTPUT, ""); return; }
        callback(null, "", ""); return;
      });

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      await monitor.fetchNetstatNetwork();

      const futureTime = Date.now() + 1000;
      const futureNetstat = `Name  Mtu   Network     Address    Ipkts Ierrs Ibytes   Opkts Oerrs Obytes  Coll
en0   1500  <Link#6>    aa:bb:cc   1000   0    10485760  800    0    4048576  0`;

      mockExec.mockImplementation((cmd, opts, callback) => {
        if (cmd.includes("netstat")) { callback(null, futureNetstat, ""); return; }
        callback(null, "", ""); return;
      });

      const originalDateNow = Date.now;
      Date.now = vi.fn(() => futureTime);

      const result = await monitor.fetchNetstatNetwork();

      Date.now = originalDateNow;

      expect(result.downloadSpeed).toBe("5.2 MB/s");
      expect(result.uploadSpeed).toBe("1.0 MB/s");
    });

    it("formatSpeed <1 MB/s", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (cmd.includes("route")) { callback(null, ROUTE_INTERFACE_OUTPUT, ""); return; }
        if (cmd.includes("netstat")) { callback(null, NETSTAT_OUTPUT, ""); return; }
        callback(null, "", ""); return;
      });

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      await monitor.fetchNetstatNetwork();

      const futureTime = Date.now() + 1000;
      const futureNetstat = `Name  Mtu   Network     Address    Ipkts Ierrs Ibytes   Opkts Oerrs Obytes  Coll
en0   1500  <Link#6>    aa:bb:cc   1000   0    5060000  800    0    3050000  0`;

      mockExec.mockImplementation((cmd, opts, callback) => {
        if (cmd.includes("netstat")) { callback(null, futureNetstat, ""); return; }
        callback(null, "", ""); return;
      });

      const originalDateNow = Date.now;
      Date.now = vi.fn(() => futureTime);

      const result = await monitor.fetchNetstatNetwork();

      Date.now = originalDateNow;

      expect(result.downloadSpeed).toBe("59 KB/s");
      expect(result.uploadSpeed).toBe("49 KB/s");
    });

    it("formatSpeed ≤0", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (cmd.includes("route")) { callback(null, ROUTE_INTERFACE_OUTPUT, ""); return; }
        if (cmd.includes("netstat")) { callback(null, NETSTAT_OUTPUT, ""); return; }
        callback(null, "", ""); return;
      });

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      await monitor.fetchNetstatNetwork();

      const futureTime = Date.now() + 1000;
      const futureNetstat = `Name  Mtu   Network     Address    Ipkts Ierrs Ibytes   Opkts Oerrs Obytes  Coll
en0   1500  <Link#6>    aa:bb:cc   1000   0    5000000  800    0    3000000  0`;

      mockExec.mockImplementation((cmd, opts, callback) => {
        if (cmd.includes("netstat")) { callback(null, futureNetstat, ""); return; }
        callback(null, "", ""); return;
      });

      const originalDateNow = Date.now;
      Date.now = vi.fn(() => futureTime);

      const result = await monitor.fetchNetstatNetwork();

      Date.now = originalDateNow;

      expect(result.downloadSpeed).toBe("0 KB/s");
      expect(result.uploadSpeed).toBe("0 KB/s");
    });

    it("No iface → '--'", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (cmd.includes("route")) { callback(new Error("no route"), "", ""); return; }
        callback(null, "", ""); return;
      });

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchNetstatNetwork();

      expect(result).toEqual({ downloadSpeed: "--", uploadSpeed: "--" });
    });

    it("No <Link# line → '--'", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (cmd.includes("route")) { callback(null, ROUTE_INTERFACE_OUTPUT, ""); return; }
        if (cmd.includes("netstat")) { callback(null, `Name  Mtu   Network     Address`, ""); return; }
        callback(null, "", ""); return;
      });

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      monitor.netIface = "en0";
      const result = await monitor.fetchNetstatNetwork();

      expect(result).toEqual({ downloadSpeed: "--", uploadSpeed: "--" });
    });

    it("parts.length < 10 → '--'", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (cmd.includes("route")) { callback(null, ROUTE_INTERFACE_OUTPUT, ""); return; }
        if (cmd.includes("netstat")) { callback(null, `en0   1500  <Link#6>    aa:bb:cc   1000`, ""); return; }
        callback(null, "", ""); return;
      });

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      monitor.netIface = "en0";
      const result = await monitor.fetchNetstatNetwork();

      expect(result).toEqual({ downloadSpeed: "--", uploadSpeed: "--" });
    });

    it("First call (no history) → '--'", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (cmd.includes("route")) { callback(null, ROUTE_INTERFACE_OUTPUT, ""); return; }
        if (cmd.includes("netstat")) { callback(null, NETSTAT_OUTPUT, ""); return; }
        callback(null, "", ""); return;
      });

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      const result = await monitor.fetchNetstatNetwork();

      expect(result.downloadSpeed).toBe("--");
      expect(result.uploadSpeed).toBe("--");
    });

    it("dt <= 0 → '--'", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (cmd.includes("route")) { callback(null, ROUTE_INTERFACE_OUTPUT, ""); return; }
        if (cmd.includes("netstat")) { callback(null, NETSTAT_OUTPUT, ""); return; }
        callback(null, "", ""); return;
      });

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      await monitor.fetchNetstatNetwork();

      const sameTime = Date.now();
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => sameTime);

      const result = await monitor.fetchNetstatNetwork();

      Date.now = originalDateNow;

      expect(result.downloadSpeed).toBe("--");
      expect(result.uploadSpeed).toBe("--");
    });

    it("Negative diff → handled", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (cmd.includes("route")) { callback(null, ROUTE_INTERFACE_OUTPUT, ""); return; }
        if (cmd.includes("netstat")) { callback(null, NETSTAT_OUTPUT, ""); return; }
        callback(null, "", ""); return;
      });

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);
      await monitor.fetchNetstatNetwork();

      const futureTime = Date.now() + 1000;
      const futureNetstat = `Name  Mtu   Network     Address    Ipkts Ierrs Ibytes   Opkts Oerrs Obytes  Coll
en0   1500  <Link#6>    aa:bb:cc   1000   0    4000000  800    0    2000000  0`;

      mockExec.mockImplementation((cmd, opts, callback) => {
        if (cmd.includes("netstat")) { callback(null, futureNetstat, ""); return; }
        callback(null, "", ""); return;
      });

      const originalDateNow = Date.now;
      Date.now = vi.fn(() => futureTime);

      const result = await monitor.fetchNetstatNetwork();

      Date.now = originalDateNow;

      expect(result.downloadSpeed).toBe("0 KB/s");
      expect(result.uploadSpeed).toBe("0 KB/s");
    });
  });

  describe("Dual-source payload", () => {
    beforeEach(() => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (cmd.includes("top")) { callback(null, TOP_CPU_OUTPUT, ""); return; }
        if (cmd.includes("ioreg")) { callback(null, IOREG_GPU_OUTPUT, ""); return; }
        if (cmd.includes("sysctl")) { callback(null, SYSCTL_MEM_OUTPUT, ""); return; }
        if (cmd.includes("vm_stat")) { callback(null, VM_STAT_OUTPUT, ""); return; }
        if (cmd.includes("df")) { callback(null, DF_DISK_OUTPUT, ""); return; }
        if (cmd.includes("pmset")) { callback(null, PMSET_BATTERY_OUTPUT, ""); return; }
        if (cmd.includes("route")) { callback(null, ROUTE_INTERFACE_OUTPUT, ""); return; }
        if (cmd.includes("netstat")) { callback(null, NETSTAT_OUTPUT, ""); return; }
        callback(null, "", ""); return;
      });
    });

    it("payload has top-level shared fields from moleData", async () => {
      const mockChild = new MockChildProcess();
      setMockSpawnChild(mockChild);

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);

      const tickPromise = monitor.tick();
      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from(MOLE_STATUS_JSON));
        mockChild.emit("close", 0);
      }, 10);
      await tickPromise;

      const payload = mockMainWindow.webContents.send.mock.calls[0][1];
      expect(payload.cpuUsage).toBe(15);
      expect(payload.healthScore).toBe(85);
    });

    it("payload.mole has raw mole data", async () => {
      const mockChild = new MockChildProcess();
      setMockSpawnChild(mockChild);

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);

      const tickPromise = monitor.tick();
      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from(MOLE_STATUS_JSON));
        mockChild.emit("close", 0);
      }, 10);
      await tickPromise;

      const payload = mockMainWindow.webContents.send.mock.calls[0][1];
      expect(payload.mole.cpuUsage).toBe(15);
      expect(payload.mole.healthScore).toBe(85);
    });

    it("nativeCpu overwrites payload.native fields when present", async () => {
      const mockChild = new MockChildProcess();
      setMockSpawnChild(mockChild);

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);

      const tickPromise = monitor.tick();
      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from(MOLE_STATUS_JSON));
        mockChild.emit("close", 0);
      }, 10);
      await tickPromise;

      const payload = mockMainWindow.webContents.send.mock.calls[0][1];
      expect(payload.native.cpuUsage).toBe(17);
      expect(payload.native.cpuCores).toBe(12);
      expect(payload.native.cpuModel).toBe("Apple M3 Pro");
    });

    it("nativeGpu overwrites payload.native fields when present", async () => {
      const mockChild = new MockChildProcess();
      setMockSpawnChild(mockChild);

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);

      const tickPromise = monitor.tick();
      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from(MOLE_STATUS_JSON));
        mockChild.emit("close", 0);
      }, 10);
      await tickPromise;

      const payload = mockMainWindow.webContents.send.mock.calls[0][1];
      expect(payload.native.gpuUsage).toBe(45);
      expect(payload.native.gpuMemoryPercent).toBe(50);
      expect(payload.native.gpuModel).toBe("Apple M3 Pro GPU");
    });

    it("nativeMem overwrites payload.native fields when present", async () => {
      const mockChild = new MockChildProcess();
      setMockSpawnChild(mockChild);

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);

      const tickPromise = monitor.tick();
      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from(MOLE_STATUS_JSON));
        mockChild.emit("close", 0);
      }, 10);
      await tickPromise;

      const payload = mockMainWindow.webContents.send.mock.calls[0][1];
      expect(payload.native.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(payload.native.usedMemory).toBeGreaterThan(0);
      expect(payload.native.totalMemory).toBe(16);
    });

    it("nativeDisk overwrites payload.native fields when present", async () => {
      const mockChild = new MockChildProcess();
      setMockSpawnChild(mockChild);

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);

      const tickPromise = monitor.tick();
      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from(MOLE_STATUS_JSON));
        mockChild.emit("close", 0);
      }, 10);
      await tickPromise;

      const payload = mockMainWindow.webContents.send.mock.calls[0][1];
      expect(typeof payload.native.diskUsage).toBe("number");
      expect(payload.native.usedDisk).toBeGreaterThan(0);
      expect(payload.native.totalDisk).toBeGreaterThan(0);
    });

    it("nativeBatt overwrites payload.native fields when present", async () => {
      const mockChild = new MockChildProcess();
      setMockSpawnChild(mockChild);

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);

      const tickPromise = monitor.tick();
      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from(MOLE_STATUS_JSON));
        mockChild.emit("close", 0);
      }, 10);
      await tickPromise;

      const payload = mockMainWindow.webContents.send.mock.calls[0][1];
      expect(payload.native.batteryPercent).toBe(63);
      expect(payload.native.batteryStatus).toBe("放电中");
      expect(payload.native.batteryTime).toBe("2:41 剩余");
    });

    it("nativeNet overwrites payload.native fields when present", async () => {
      const mockChild = new MockChildProcess();
      setMockSpawnChild(mockChild);

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);

      // Pre-set network history so rates are calculated
      monitor.netIface = "en0";
      monitor.lastNetTime = Date.now() - 1000;
      monitor.lastNetBytes = { rx: 4000000, tx: 2000000 };

      const tickPromise = monitor.tick();
      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from(MOLE_STATUS_JSON));
        mockChild.emit("close", 0);
      }, 10);
      await tickPromise;

      const payload = mockMainWindow.webContents.send.mock.calls[0][1];
      expect(payload.native.downloadSpeed).not.toBe("--");
      expect(payload.native.uploadSpeed).not.toBe("--");
    });

    it('webContents.send("system-status", payload) is called', async () => {
      const mockChild = new MockChildProcess();
      setMockSpawnChild(mockChild);

      const monitor = new StatusMonitor(mockGetMainWindow, mockGetMolePath);

      const tickPromise = monitor.tick();
      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from(MOLE_STATUS_JSON));
        mockChild.emit("close", 0);
      }, 10);
      await tickPromise;

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        "system-status",
        expect.objectContaining({
          cpuUsage: expect.any(Number),
          mole: expect.any(Object),
          native: expect.any(Object),
        }),
      );
    });
  });
});
