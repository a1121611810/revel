import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useMole } from "@/composables/useMole.js";

describe("useMole composable", () => {
  let mole;

  beforeEach(() => {
    window.electronAPI = {
      moleExec: vi.fn(),
      moleExecSudo: vi.fn(),
      onMoleOutput: vi.fn(),
      removeMoleOutputListener: vi.fn(),
      sendPassword: vi.fn(),
    };
    mole = useMole();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete window.electronAPI;
  });

  // ──────────────────────────
  //  exec 命令执行
  // ──────────────────────────
  describe("exec 函数", () => {
    it("正常执行 mo 命令并返回结果", async () => {
      const mockRes = { stdout: "命令执行成功\n", stderr: "" };
      window.electronAPI.moleExec.mockResolvedValue(mockRes);

      const res = await mole.exec("status");

      expect(window.electronAPI.moleExec).toHaveBeenCalledTimes(1);
      expect(window.electronAPI.moleExec).toHaveBeenCalledWith("mo", ["status"]);
      expect(res).toEqual(mockRes);
      expect(mole.result.value).toEqual(mockRes);
      expect(mole.output.value).toBe("命令执行成功\n");
      expect(mole.loading.value).toBe(false);
      expect(mole.error.value).toBeNull();
    });

    it("支持多个参数传递", async () => {
      const mockRes = { stdout: "ok", stderr: "" };
      window.electronAPI.moleExec.mockResolvedValue(mockRes);

      await mole.exec("clean --dry-run --verbose");

      expect(window.electronAPI.moleExec).toHaveBeenCalledWith("mo", [
        "clean",
        "--dry-run",
        "--verbose",
      ]);
    });

    it("空字符串参数应传递空数组", async () => {
      const mockRes = { stdout: "", stderr: "" };
      window.electronAPI.moleExec.mockResolvedValue(mockRes);

      await mole.exec("");

      expect(window.electronAPI.moleExec).toHaveBeenCalledWith("mo", []);
    });

    it("sudo 模式下调用 moleExecSudo", async () => {
      const mockRes = { stdout: "sudo 执行成功", stderr: "" };
      window.electronAPI.moleExecSudo.mockResolvedValue(mockRes);

      const res = await mole.exec("clean", true);

      expect(window.electronAPI.moleExec).not.toHaveBeenCalled();
      expect(window.electronAPI.moleExecSudo).toHaveBeenCalledTimes(1);
      expect(window.electronAPI.moleExecSudo).toHaveBeenCalledWith("mo", ["clean"]);
      expect(res).toEqual(mockRes);
      expect(mole.output.value).toBe("sudo 执行成功");
    });

    it("执行失败时应设置 error 并抛出异常", async () => {
      const mockError = new Error("命令执行出错");
      window.electronAPI.moleExec.mockRejectedValue(mockError);

      await expect(mole.exec("invalid")).rejects.toThrow("命令执行出错");
      expect(mole.error.value).toBe("命令执行出错");
      expect(mole.loading.value).toBe(false);
      expect(mole.result.value).toBeNull();
    });

    it("执行失败时 error 应使用默认消息（当 err.message 为空）", async () => {
      const mockError = new Error();
      mockError.message = "";
      window.electronAPI.moleExec.mockRejectedValue(mockError);

      await expect(mole.exec("invalid")).rejects.toThrow();
      expect(mole.error.value).toBe("Command failed");
      expect(mole.loading.value).toBe(false);
    });

    it("执行前应将 loading 设为 true，执行完成后设为 false", async () => {
      let resolveFn;
      const pendingPromise = new Promise((resolve) => {
        resolveFn = resolve;
      });
      window.electronAPI.moleExec.mockReturnValue(pendingPromise);

      const execPromise = mole.exec("status");
      expect(mole.loading.value).toBe(true);
      expect(mole.error.value).toBeNull();
      expect(mole.output.value).toBe("");
      expect(mole.result.value).toBeNull();

      resolveFn({ stdout: "done", stderr: "" });
      await execPromise;

      expect(mole.loading.value).toBe(false);
    });

    it("失败后 finally 中应将 loading 设为 false", async () => {
      window.electronAPI.moleExec.mockRejectedValue(new Error("fail"));

      try {
        await mole.exec("bad");
      } catch {
        // 预期抛出异常
      }

      expect(mole.loading.value).toBe(false);
    });

    it("多次连续调用时应重置之前的状态", async () => {
      window.electronAPI.moleExec
        .mockResolvedValueOnce({ stdout: "first", stderr: "" })
        .mockRejectedValueOnce(new Error("second fail"));

      await mole.exec("first");
      expect(mole.output.value).toBe("first");
      expect(mole.error.value).toBeNull();

      try {
        await mole.exec("second");
      } catch {
        // 预期抛出
      }
      expect(mole.output.value).toBe("");
      expect(mole.error.value).toBe("second fail");
      expect(mole.result.value).toBeNull();
    });

    it("execSudo 应调用 moleExecSudo 并返回结果", async () => {
      const mockRes = { stdout: "sudo ok", stderr: "" };
      window.electronAPI.moleExecSudo.mockResolvedValue(mockRes);

      const res = await mole.execSudo("clean --dry-run");

      expect(window.electronAPI.moleExecSudo).toHaveBeenCalledWith("mo", ["clean", "--dry-run"]);
      expect(window.electronAPI.moleExec).not.toHaveBeenCalled();
      expect(res).toEqual(mockRes);
      expect(mole.result.value).toEqual(mockRes);
      expect(mole.output.value).toBe("sudo ok");
      expect(mole.error.value).toBeNull();
      expect(mole.loading.value).toBe(false);
    });

    it("execSudo 失败时应设置 error", async () => {
      window.electronAPI.moleExecSudo.mockRejectedValue(new Error("sudo failed"));

      await expect(mole.execSudo("clean")).rejects.toThrow("sudo failed");
      expect(mole.error.value).toBe("sudo failed");
      expect(mole.result.value).toBeNull();
      expect(mole.loading.value).toBe(false);
    });
  });

  // ──────────────────────────
  //  parseSize 大小解析
  // ──────────────────────────
  describe("parseSize 函数", () => {
    it("应正确解析字节数 B", () => {
      expect(mole.parseSize("512 B")).toBe(512);
      expect(mole.parseSize("0 B")).toBe(0);
      expect(mole.parseSize("1B")).toBe(1);
    });

    it("应正确解析 KB", () => {
      expect(mole.parseSize("1 KB")).toBe(1024);
      expect(mole.parseSize("2.5 KB")).toBe(2.5 * 1024);
      expect(mole.parseSize("0.5KB")).toBe(0.5 * 1024);
    });

    it("应正确解析 MB", () => {
      expect(mole.parseSize("1 MB")).toBe(1024 ** 2);
      expect(mole.parseSize("3.14 MB")).toBeCloseTo(3.14 * 1024 ** 2);
    });

    it("应正确解析 GB", () => {
      expect(mole.parseSize("1 GB")).toBe(1024 ** 3);
      expect(mole.parseSize("10.5 GB")).toBe(10.5 * 1024 ** 3);
    });

    it("应正确解析 TB", () => {
      expect(mole.parseSize("1 TB")).toBe(1024 ** 4);
      expect(mole.parseSize("2 TB")).toBe(2 * 1024 ** 4);
    });

    it("应支持小写单位", () => {
      expect(mole.parseSize("1 mb")).toBe(1024 ** 2);
      expect(mole.parseSize("1 gb")).toBe(1024 ** 3);
      expect(mole.parseSize("1 kb")).toBe(1024);
    });

    it("空字符串应返回 0", () => {
      expect(mole.parseSize("")).toBe(0);
    });

    it("null 或 undefined 应返回 0", () => {
      expect(mole.parseSize(null)).toBe(0);
      expect(mole.parseSize(undefined)).toBe(0);
    });

    it("无效格式应返回 0", () => {
      expect(mole.parseSize("not a size")).toBe(0);
      expect(mole.parseSize("123")).toBe(0);
      expect(mole.parseSize("123 XYZ")).toBe(0);
      expect(mole.parseSize("abc 1 MB")).toBe(0);
    });

    it("纯数字字符串应返回 0（缺少单位）", () => {
      expect(mole.parseSize("1024")).toBe(0);
    });

    it("数字类型输入应正确处理", () => {
      expect(mole.parseSize(1024)).toBe(0);
    });
  });

  // ──────────────────────────
  //  formatSize 大小格式化
  // ──────────────────────────
  describe("formatSize 函数", () => {
    it("0 字节应格式化为 0 B", () => {
      expect(mole.formatSize(0)).toBe("0 B");
    });

    it("null 和 undefined 应格式化为 0 B", () => {
      expect(mole.formatSize(null)).toBe("0 B");
      expect(mole.formatSize(undefined)).toBe("0 B");
    });

    it("字节值应格式化为 B", () => {
      expect(mole.formatSize(512)).toBe("512.00 B");
      expect(mole.formatSize(1)).toBe("1.00 B");
    });

    it("KB 范围的值应格式化为 KB", () => {
      expect(mole.formatSize(1024)).toBe("1.00 KB");
      expect(mole.formatSize(1536)).toBe("1.50 KB");
    });

    it("MB 范围的值应格式化为 MB", () => {
      expect(mole.formatSize(1024 ** 2)).toBe("1.00 MB");
      expect(mole.formatSize(2.5 * 1024 ** 2)).toBe("2.50 MB");
    });

    it("GB 范围的值应格式化为 GB", () => {
      expect(mole.formatSize(1024 ** 3)).toBe("1.00 GB");
      expect(mole.formatSize(100 * 1024 ** 3)).toBe("100.00 GB");
    });

    it("TB 范围的值应格式化为 TB", () => {
      expect(mole.formatSize(1024 ** 4)).toBe("1.00 TB");
      expect(mole.formatSize(5 * 1024 ** 4)).toBe("5.00 TB");
    });

    it("边界值应正确格式化（1023 B = 1023 B, 1024 B = 1 KB）", () => {
      expect(mole.formatSize(1023)).toBe("1023.00 B");
      expect(mole.formatSize(1024)).toBe("1.00 KB");
    });
  });

  // ──────────────────────────
  //  stripAnsi
  // ──────────────────────────
  describe("stripAnsi 函数", () => {
    it("应去除 ANSI 转义码", () => {
      expect(mole.stripAnsi("\x1B[2Khello")).toBe("hello");
      expect(mole.stripAnsi("\x1B[31mred\x1B[0m")).toBe("red");
    });

    it("应去除回车符", () => {
      expect(mole.stripAnsi("hello\rworld")).toBe("helloworld");
    });

    it("无 ANSI 时应原样返回", () => {
      expect(mole.stripAnsi("hello world")).toBe("hello world");
    });
  });

  // ──────────────────────────
  //  parseCleanOutput 清理输出解析
  // ──────────────────────────
  describe("parseCleanOutput 函数", () => {
    it("应正确解析 mo clean --dry-run 标准输出", () => {
      const stdout = `
➤ User essentials
  → User app cache 94 items, 3.80GB dry
  → User app logs 11 items, 243KB dry
  ✓ Trash · already empty

➤ App caches
  → Wallpaper agent cache, 428.7MB dry
  → Media analysis cache 4 items, 456.4MB dry
  ◎ Microsoft Edge running · old versions cleanup skipped

➤ Browsers
  → GoogleUpdater CRX cache, 1KB dry

➤ Cloud & Office
  ✓ Nothing to clean
`;
      const categories = mole.parseCleanOutput(stdout);

      expect(categories.length).toBeGreaterThanOrEqual(3);

      const userCat = categories.find((c) => c.name === "User essentials");
      expect(userCat).toBeDefined();
      expect(userCat.items).toHaveLength(2);
      expect(userCat.items[0].name).toBe("User app cache");
      expect(userCat.items[0].size).toBe("3.80 GB");
      expect(userCat.items[1].name).toBe("User app logs");
      expect(userCat.items[1].size).toBe("243 KB");

      const appCat = categories.find((c) => c.name === "App caches");
      expect(appCat).toBeDefined();
      expect(appCat.items).toHaveLength(2);

      const browserCat = categories.find((c) => c.name === "Browsers");
      expect(browserCat).toBeDefined();
      expect(browserCat.items).toHaveLength(1);
    });

    it("应跳过没有 dry 大小的项目", () => {
      const stdout = `
➤ Test
  → npm cache · would clean
  → npm cache directory 3 items, 193.5MB dry
`;
      const categories = mole.parseCleanOutput(stdout);
      expect(categories).toHaveLength(1);
      expect(categories[0].items).toHaveLength(1);
      expect(categories[0].items[0].name).toBe("npm cache directory");
      expect(categories[0].items[0].size).toBe("193.5 MB");
    });

    it("应正确计算分类总大小", () => {
      const stdout = `
➤ Test
  → Item A, 100MB dry
  → Item B, 200MB dry
`;
      const categories = mole.parseCleanOutput(stdout);
      expect(categories[0].sizeBytes).toBeCloseTo(300 * 1024 ** 2);
      expect(categories[0].size).toBe("300.00 MB");
    });

    it("空字符串应返回空数组", () => {
      expect(mole.parseCleanOutput("")).toEqual([]);
    });

    it("应忽略非 item 行", () => {
      const stdout = `
➤ Test
  ✓ already clean
  ◎ skipped
  • info
  ☞ note
  → Item, 10MB dry
`;
      const categories = mole.parseCleanOutput(stdout);
      expect(categories[0].items).toHaveLength(1);
    });
  });

  // ──────────────────────────
  //  parseStatusOutput 状态输出解析
  // ──────────────────────────
  describe("parseStatusOutput 函数", () => {
    it("应正确解析 JSON 状态输出", () => {
      const stdout = JSON.stringify({
        hardware: { cpu_model: "Apple M4" },
        cpu: { usage: 35.4, core_count: 10, per_core: [1, 2] },
        memory: { used: 17179869184, total: 25769803776, used_percent: 66.7 },
        disks: [{ used: 377487360000, total: 494384795648, used_percent: 76.3 }],
        batteries: [{ percent: 95, status: "discharging", time_left: "12:52" }],
        network: [{ rx_rate_mbs: 1.5, tx_rate_mbs: 0.8 }],
        gpu: [{ name: "Apple M4", usage: 10, memory_used: 2, memory_total: 8 }],
      });
      const data = mole.parseStatusOutput(stdout);

      expect(data.cpuUsage).toBe(35);
      expect(data.cpuCores).toBe(10);
      expect(data.cpuModel).toBe("Apple M4");
      expect(data.memoryUsage).toBe(67);
      expect(data.usedMemory).toBeCloseTo(16.0, 0);
      expect(data.totalMemory).toBeCloseTo(24.0, 0);
      expect(data.diskUsage).toBe(76);
      expect(data.batteryPercent).toBe(95);
      expect(data.batteryStatus).toBe("discharging");
      expect(data.downloadSpeed).toBe("1.5 MB/s");
      expect(data.gpuModel).toBe("Apple M4");
    });

    it("无效 JSON 应返回默认值", () => {
      const data = mole.parseStatusOutput("not json");
      expect(data.cpuUsage).toBe(0);
      expect(data.cpuModel).toBe("");
    });
  });

  // ──────────────────────────
  //  parseAnalyzeOutput 分析输出解析
  // ──────────────────────────
  describe("parseAnalyzeOutput 函数", () => {
    it("应正确解析 JSON 分析输出", () => {
      const stdout = JSON.stringify({
        total_size: 23622320128,
        entries: [
          {
            name: "Applications",
            path: "/Applications",
            size: 10737418240,
            is_dir: true,
            insight: true,
          },
          { name: "User Library", path: "/Users/test/Library", size: 8589934592, is_dir: true },
          { name: "Downloads", path: "/Users/test/Downloads", size: 4294967296, is_dir: true },
        ],
      });
      const result = mole.parseAnalyzeOutput(stdout);

      // diskData should only include non-insight directories
      expect(result.diskData).toHaveLength(2);
      expect(result.diskData[0].name).toBe("User Library");
      expect(result.diskData[1].name).toBe("Downloads");
      // topDirectories should also exclude insight entries
      expect(result.topDirectories).toHaveLength(2);
      expect(result.topDirectories[0].name).toBe("User Library");
      expect(result.totalSize).toBe(23622320128);
    });

    it("无效 JSON 应返回空数组", () => {
      const result = mole.parseAnalyzeOutput("not json");
      expect(result.diskData).toEqual([]);
      expect(result.topDirectories).toEqual([]);
      expect(result.totalSize).toBe(0);
    });
  });

  // ──────────────────────────
  //  parseUninstallOutput 卸载输出解析
  // ──────────────────────────
  describe("parseUninstallOutput 函数", () => {
    it("应正确解析 JSON 应用列表", () => {
      const stdout = JSON.stringify([
        {
          name: "Test App",
          bundle_id: "com.test",
          source: "App",
          path: "/Applications/Test.app",
          size: "100MB",
        },
      ]);
      const apps = mole.parseUninstallOutput(stdout);

      expect(apps).toHaveLength(1);
      expect(apps[0].name).toBe("Test App");
      expect(apps[0].version).toBe("com.test");
      expect(apps[0].path).toBe("/Applications/Test.app");
      expect(apps[0].size).toBe("100MB");
    });

    it("无效 JSON 应返回空数组", () => {
      expect(mole.parseUninstallOutput("not json")).toEqual([]);
    });
  });

  // ──────────────────────────
  //  parsePurgeOutput 项目清理输出解析
  // ──────────────────────────
  describe("parsePurgeOutput 函数", () => {
    it("应正确解析 debug 输出", () => {
      const stdout = `
Scanning for projects...
[DEBUG] [DRY RUN] Would remove:   * /project/node_modules, 1.5GB, 37 days old
[DEBUG] [DRY RUN] Would remove:   * /project/target, 500MB, 12 days old
`;
      const items = mole.parsePurgeOutput(stdout);

      expect(items).toHaveLength(2);
      expect(items[0].name).toBe("node_modules");
      expect(items[0].size).toBe("1.5 GB");
      expect(items[0].type).toBe("node");
      expect(items[1].type).toBe("rust");
    });

    it("空输出应返回空数组", () => {
      expect(mole.parsePurgeOutput("")).toEqual([]);
    });
  });

  // ──────────────────────────
  //  parseInstallerOutput 安装包输出解析
  // ──────────────────────────
  describe("parseInstallerOutput 函数", () => {
    it("应正确解析 debug + TUI 输出", () => {
      const stdout = `
[DEBUG] Found installer:   * /Users/test/Downloads/test.dmg
\x1B[2K➤ ○ test.dmg                    100MB | Downloads
\x1B[2K  ○ other.pkg                    50MB | Downloads
`;
      const pkgs = mole.parseInstallerOutput(stdout);

      expect(pkgs).toHaveLength(2);
      expect(pkgs[0].name).toBe("test.dmg");
      expect(pkgs[0].size).toBe("100 MB");
      expect(pkgs[0].path).toBe("/Users/test/Downloads/test.dmg");
      expect(pkgs[1].name).toBe("other.pkg");
      expect(pkgs[1].ext).toBe("pkg");
    });

    it("应正确解析只有 debug 行（无 TUI 行）的输出", () => {
      const stdout = `
[DEBUG] Found installer:   * /Users/test/Downloads/test.dmg
[DEBUG] Found installer:   * /Users/test/Downloads/other.pkg
`;
      const pkgs = mole.parseInstallerOutput(stdout);

      expect(pkgs).toHaveLength(2);
      expect(pkgs[0].name).toBe("test.dmg");
      expect(pkgs[0].path).toBe("/Users/test/Downloads/test.dmg");
      expect(pkgs[0].size).toBe("");
      expect(pkgs[1].name).toBe("other.pkg");
      expect(pkgs[1].ext).toBe("pkg");
    });

    it("空输出应返回空数组", () => {
      expect(mole.parseInstallerOutput("")).toEqual([]);
    });
  });

  // ──────────────────────────
  //  Command wrappers
  // ──────────────────────────
  describe("scanInstallers 封装函数", () => {
    it("应调用 moleExec 并返回解析后的安装包列表", async () => {
      const stdout = `
[DEBUG] Found installer:   * /Users/test/Downloads/test.dmg
\x1B[2K➤ ○ test.dmg                    100MB | Downloads
`;
      window.electronAPI.moleExec.mockResolvedValue({ stdout, stderr: "", code: 0, success: true });

      const pkgs = await mole.scanInstallers();

      expect(window.electronAPI.moleExec).toHaveBeenCalledWith("mo", ["installer", "--dry-run", "--debug"]);
      expect(pkgs).toHaveLength(1);
      expect(pkgs[0].name).toBe("test.dmg");
    });

    it("success=false 时应抛出异常并设置 error", async () => {
      window.electronAPI.moleExec.mockResolvedValue({ stdout: "", stderr: "command failed", code: 1, success: false });

      await expect(mole.scanInstallers()).rejects.toThrow("command failed");
      expect(mole.error.value).toBe("command failed");
    });
  });

  describe("previewClean 封装函数", () => {
    it("应调用 moleExecSudo 并返回解析后的分类列表", async () => {
      const stdout = `
➤ Test
  → Item A, 100MB dry
  → Item B, 200MB dry
`;
      window.electronAPI.moleExecSudo.mockResolvedValue({ stdout, stderr: "", code: 0, success: true });

      const categories = await mole.previewClean();

      expect(window.electronAPI.moleExecSudo).toHaveBeenCalledWith("mo", ["clean", "--dry-run"]);
      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe("Test");
    });

    it("success=false 时应抛出异常并设置 error", async () => {
      window.electronAPI.moleExecSudo.mockResolvedValue({ stdout: "", stderr: "sudo failed", code: 1, success: false });

      await expect(mole.previewClean()).rejects.toThrow("sudo failed");
      expect(mole.error.value).toBe("sudo failed");
    });
  });

  describe("previewPurge 封装函数", () => {
    it("应调用 moleExecSudo 并返回解析后的项目列表", async () => {
      const stdout = "[DEBUG] [DRY RUN] Would remove:   * /project/node_modules, 1.5GB, 37 days old";
      window.electronAPI.moleExecSudo.mockResolvedValue({ stdout, stderr: "", code: 0, success: true });

      const items = await mole.previewPurge();

      expect(window.electronAPI.moleExecSudo).toHaveBeenCalledWith("mo", ["purge", "--dry-run", "--debug"]);
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe("node_modules");
    });

    it("success=false 时应抛出异常并设置 error", async () => {
      window.electronAPI.moleExecSudo.mockResolvedValue({ stdout: "", stderr: "purge failed", code: 1, success: false });

      await expect(mole.previewPurge()).rejects.toThrow("purge failed");
      expect(mole.error.value).toBe("purge failed");
    });
  });

  describe("listApps 封装函数", () => {
    it("应调用 moleExec 并返回解析后的应用列表", async () => {
      const stdout = JSON.stringify([{ name: "TestApp", bundle_id: "com.test", path: "/Applications/Test.app", size: "100MB" }]);
      window.electronAPI.moleExec.mockResolvedValue({ stdout, stderr: "", code: 0, success: true });

      const apps = await mole.listApps();

      expect(window.electronAPI.moleExec).toHaveBeenCalledWith("mo", ["uninstall", "--list"]);
      expect(apps).toHaveLength(1);
      expect(apps[0].name).toBe("TestApp");
    });

    it("success=false 时应抛出异常并设置 error", async () => {
      window.electronAPI.moleExec.mockResolvedValue({ stdout: "", stderr: "list failed", code: 1, success: false });

      await expect(mole.listApps()).rejects.toThrow("list failed");
      expect(mole.error.value).toBe("list failed");
    });
  });

  describe("scanDisk 封装函数", () => {
    it("应调用 moleExecSudo 并返回解析后的磁盘数据", async () => {
      const stdout = JSON.stringify({ total_size: 1000, entries: [{ name: "System", path: "/System", size: 500, is_dir: true }] });
      window.electronAPI.moleExecSudo.mockResolvedValue({ stdout, stderr: "", code: 0, success: true });

      const data = await mole.scanDisk();

      expect(window.electronAPI.moleExecSudo).toHaveBeenCalledWith("mo", ["analyze", "-json"]);
      expect(data.diskData).toHaveLength(1);
      expect(data.totalSize).toBe(1000);
    });

    it("success=false 时应抛出异常并设置 error", async () => {
      window.electronAPI.moleExecSudo.mockResolvedValue({ stdout: "", stderr: "analyze failed", code: 1, success: false });

      await expect(mole.scanDisk()).rejects.toThrow("analyze failed");
      expect(mole.error.value).toBe("analyze failed");
    });
  });
});
