import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { EventEmitter } from "events";
import Module from "module";

// 模拟 event.sender 对象
function createMockEvent(senderUrl = "app://index.html") {
  return {
    sender: {
      send: vi.fn(),
    },
    senderFrame: {
      url: senderUrl,
    },
  };
}

// 创建模拟的 ChildProcess（EventEmitter 子类）
class MockChildProcess extends EventEmitter {
  constructor() {
    super();
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
    this.kill = vi.fn(() => this.emit("close", null, "SIGTERM"));
  }
}

const handlers = vi.hoisted(() => ({}));

const mockIpcMain = vi.hoisted(() => ({
  handle: vi.fn((channel, handler) => {
    handlers[channel] = handler;
  }),
  on: vi.fn(),
}));

const mockDialog = vi.hoisted(() => ({
  showMessageBox: vi.fn(),
}));

const mockShell = vi.hoisted(() => ({
  openExternal: vi.fn(),
}));

const mockApp = vi.hoisted(() => {
  const whenReadyCallbacks = [];
  return {
    whenReady: vi.fn(() => ({
      then: vi.fn((cb) => {
        whenReadyCallbacks.push(cb);
        return { catch: vi.fn() };
      }),
    })),
    on: vi.fn(),
    quit: vi.fn(),
    getVersion: vi.fn(() => "1.0.0"),
    getPath: vi.fn(() => "/fake/path"),
    setLoginItemSettings: vi.fn(),
    getLoginItemSettings: vi.fn(() => ({ openAtLogin: false })),
    requestSingleInstanceLock: vi.fn(() => true),
    dock: { setIcon: vi.fn() },
    commandLine: { appendSwitch: vi.fn() },
    _whenReadyCallbacks: whenReadyCallbacks,
  };
});

const mockBrowserWindow = vi.hoisted(() => {
  const fn = vi.fn(function () {
    return {
      loadURL: vi.fn(),
      loadFile: vi.fn(),
      webContents: { openDevTools: vi.fn() },
      on: vi.fn(),
      once: vi.fn(),
      hide: vi.fn(),
      show: vi.fn(),
      isVisible: vi.fn(() => true),
      isMinimized: vi.fn(() => false),
      restore: vi.fn(),
    };
  });
  fn.getAllWindows = vi.fn(() => []);
  return fn;
});

const mockSpawn = vi.hoisted(() => vi.fn());

const mockExec = vi.hoisted(() => vi.fn());

const mockNativeImage = vi.hoisted(() => ({
  createEmpty: vi.fn(() => ({
    isEmpty: vi.fn(() => false),
    getSize: vi.fn(() => ({ width: 64, height: 64 })),
    getScaleFactors: vi.fn(() => [1, 2]),
    addRepresentation: vi.fn(),
  })),
}));

vi.mock("electron", () => ({
  default: {
    app: mockApp,
    BrowserWindow: mockBrowserWindow,
    ipcMain: mockIpcMain,
    dialog: mockDialog,
    shell: mockShell,
    nativeImage: mockNativeImage,
  },
  app: mockApp,
  BrowserWindow: mockBrowserWindow,
  ipcMain: mockIpcMain,
  dialog: mockDialog,
  shell: mockShell,
  nativeImage: mockNativeImage,
}));

vi.mock("child_process", () => ({
  default: {
    spawn: mockSpawn,
    exec: mockExec,
  },
  spawn: mockSpawn,
  exec: mockExec,
}));

describe("主进程 IPC 测试", () => {
  let ipcHandleCalls;
  let mainModule;

  beforeAll(async () => {
    vi.resetModules();
    // 重置 handlers
    Object.keys(handlers).forEach((key) => delete handlers[key]);

    // vitest v4 的 vi.mock 不会拦截 CJS 的 require，需临时补丁 Module._load
    const originalLoad = Module._load;
    Module._load = function (request, parent, isMain) {
      if (request === "electron") {
        return {
          app: mockApp,
          BrowserWindow: mockBrowserWindow,
          ipcMain: mockIpcMain,
          dialog: mockDialog,
          shell: mockShell,
          nativeImage: mockNativeImage,
          Menu: { setApplicationMenu: vi.fn() },
          protocol: { handle: vi.fn(), registerSchemesAsPrivileged: vi.fn() },
          session: {
            defaultSession: {
              setPermissionRequestHandler: vi.fn(),
            },
          },
        };
      }
      if (request === "child_process") {
        return {
          spawn: mockSpawn,
          exec: mockExec,
        };
      }
      if (request === "fs") {
        return { readFileSync: vi.fn(() => Buffer.from("mock")) };
      }
      return originalLoad(request, parent, isMain);
    };

    try {
      // 动态导入被测模块（触发 IPC handler 注册）
      mainModule = await import("@main/main.js");
    } finally {
      Module._load = originalLoad;
    }

    // 保存 IPC handle 注册记录，供 registration 测试使用
    ipcHandleCalls = [...mockIpcMain.handle.mock.calls];
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // 清除 mole 路径缓存，避免测试间相互污染
    if (mainModule && mainModule.clearMolePathCache) {
      mainModule.clearMolePathCache();
    }
    // 恢复 IPC handle 注册记录，确保 registration 测试不受 clearAllMocks 影响
    ipcHandleCalls.forEach((call) => mockIpcMain.handle.mock.calls.push(call));
  });

  describe("mole-exec IPC", () => {
    it("应正确注册 mole-exec 处理器", () => {
      expect(mockIpcMain.handle).toHaveBeenCalledWith("mole-exec", expect.any(Function));
      expect(handlers["mole-exec"]).toBeDefined();
    });

    it("mole 未安装时应拒绝并返回错误信息", async () => {
      // 模拟 mole 未安装
      mockExec.mockImplementation((_cmd, _opts, cb) => {
        cb(new Error("command not found"), "", "");
      });

      const event = createMockEvent();

      await expect(handlers["mole-exec"](event, "mole", ["list"])).rejects.toThrow(
        "未检测到 Mole CLI，请先安装：brew install tw93/tap/mole",
      );
    });

    it("应正确执行 mo list 命令并返回结果", async () => {
      // 模拟 mole 已安装
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(null, "/usr/local/bin/mo\n", ""));

      const mockChild = new MockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const event = createMockEvent();

      // 使用 Promise 并在异步中触发事件
      const resultPromise = handlers["mole-exec"](event, "mole", ["list"]);

      // 模拟 stdout 数据流
      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from("service1\n"));
        mockChild.stdout.emit("data", Buffer.from("service2\n"));
        mockChild.emit("close", 0);
      }, 10);

      const result = await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        "/usr/local/bin/mo",
        ["list"],
        expect.objectContaining({
          env: expect.objectContaining({ NO_COLOR: "1" }),
          stdio: ["ignore", "pipe", "pipe"],
        }),
      );
      expect(result).toEqual({
        code: 0,
        stdout: "service1\nservice2",
        stderr: "",
        success: true,
      });
    });

    it("命令执行失败时应返回非零退出码和错误输出", async () => {
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(null, "/usr/local/bin/mo\n", ""));

      const mockChild = new MockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const event = createMockEvent();

      const resultPromise = handlers["mole-exec"](event, "mole", ["invalid-cmd"]);

      setTimeout(() => {
        mockChild.stderr.emit("data", Buffer.from("unknown command"));
        mockChild.emit("close", 1);
      }, 10);

      const result = await resultPromise;

      expect(result).toEqual({
        code: 1,
        stdout: "",
        stderr: "unknown command",
        success: false,
      });
    });

    it("应通过流式发送 stdout 数据到渲染进程", async () => {
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(null, "/usr/local/bin/mo\n", ""));

      const mockChild = new MockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const event = createMockEvent();

      const resultPromise = handlers["mole-exec"](event, "mole", ["status"]);

      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from("running"));
        mockChild.emit("close", 0);
      }, 10);

      await resultPromise;

      expect(event.sender.send).toHaveBeenCalledWith("mole-output", {
        type: "stdout",
        data: "running",
      });
    });

    it("应通过流式发送 stderr 数据到渲染进程", async () => {
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(null, "/usr/local/bin/mo\n", ""));

      const mockChild = new MockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const event = createMockEvent();

      const resultPromise = handlers["mole-exec"](event, "mole", ["status"]);

      setTimeout(() => {
        mockChild.stderr.emit("data", Buffer.from("warning: deprecated"));
        mockChild.emit("close", 0);
      }, 10);

      await resultPromise;

      expect(event.sender.send).toHaveBeenCalledWith("mole-output", {
        type: "stderr",
        data: "warning: deprecated",
      });
    });

    it("子进程发生错误时应拒绝 Promise", async () => {
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(null, "/usr/local/bin/mo\n", ""));

      const mockChild = new MockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const event = createMockEvent();

      const resultPromise = handlers["mole-exec"](event, "mole", ["list"]);

      setTimeout(() => {
        mockChild.emit("error", new Error("spawn ENOENT"));
      }, 10);

      await expect(resultPromise).rejects.toThrow("spawn ENOENT");
    });

    it("非 mole 命令应直接使用传入的命令名", async () => {
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(null, "/usr/local/bin/mo\n", ""));

      const mockChild = new MockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const event = createMockEvent();

      const resultPromise = handlers["mole-exec"](event, "other-cmd", ["--help"]);

      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from("help text"));
        mockChild.emit("close", 0);
      }, 10);

      await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        "other-cmd",
        ["--help"],
        expect.objectContaining({
          env: expect.objectContaining({ NO_COLOR: "1" }),
          stdio: ["ignore", "pipe", "pipe"],
        }),
      );
    });

    it("args 参数不是数组时应按空数组处理", async () => {
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(null, "/usr/local/bin/mo\n", ""));

      const mockChild = new MockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const event = createMockEvent();

      const resultPromise = handlers["mole-exec"](event, "mole");

      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from("ok"));
        mockChild.emit("close", 0);
      }, 10);

      await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        "/usr/local/bin/mo",
        [],
        expect.objectContaining({
          env: expect.objectContaining({ NO_COLOR: "1" }),
          stdio: ["ignore", "pipe", "pipe"],
        }),
      );
    });

    it("应累积多段 stdout 和 stderr 输出", async () => {
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(null, "/usr/local/bin/mo\n", ""));

      const mockChild = new MockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const event = createMockEvent();

      const resultPromise = handlers["mole-exec"](event, "mole", ["list"]);

      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from("line1\n"));
        mockChild.stdout.emit("data", Buffer.from("line2\n"));
        mockChild.stdout.emit("data", Buffer.from("line3"));
        mockChild.stderr.emit("data", Buffer.from("err1"));
        mockChild.stderr.emit("data", Buffer.from("err2"));
        mockChild.emit("close", 0);
      }, 10);

      const result = await resultPromise;

      expect(result.stdout).toBe("line1\nline2\nline3");
      expect(result.stderr).toBe("err1err2");
      expect(result.success).toBe(true);
    });

    it("mole 命令应被映射为 mo", async () => {
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(null, "/usr/local/bin/mo\n", ""));

      const mockChild = new MockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const event = createMockEvent();

      const resultPromise = handlers["mole-exec"](event, "mole", ["status"]);

      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from("ok"));
        mockChild.emit("close", 0);
      }, 10);

      await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        "/usr/local/bin/mo",
        ["status"],
        expect.objectContaining({
          env: expect.objectContaining({ NO_COLOR: "1" }),
          stdio: ["ignore", "pipe", "pipe"],
        }),
      );
    });
  });

  describe("mole-exec-sudo IPC", () => {
    it("应正确注册 mole-exec-sudo 处理器", () => {
      expect(mockIpcMain.handle).toHaveBeenCalledWith("mole-exec-sudo", expect.any(Function));
      expect(handlers["mole-exec-sudo"]).toBeDefined();
    });

    it("mole 未安装时应拒绝并返回错误信息", async () => {
      mockExec.mockImplementation((_cmd, _opts, cb) => {
        cb(new Error("command not found"), "", "");
      });

      const event = createMockEvent();

      await expect(handlers["mole-exec-sudo"](event, "mole", ["setup"])).rejects.toThrow(
        "未检测到 Mole CLI，请先安装：brew install tw93/tap/mole",
      );
    });

    it("应使用 sudo -S 执行命令", async () => {
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(null, "/usr/local/bin/mo\n", ""));

      const mockChild = new MockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const event = createMockEvent();

      const resultPromise = handlers["mole-exec-sudo"](event, "mole", ["setup", "--global"]);

      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from("setup complete"));
        mockChild.emit("close", 0);
      }, 10);

      const result = await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        "sudo",
        ["-E", "-S", "/usr/local/bin/mo", "setup", "--global"],
        expect.objectContaining({
          env: expect.objectContaining({ NO_COLOR: "1" }),
          stdio: ["pipe", "pipe", "pipe"],
        }),
      );
      expect(result.success).toBe(true);
      expect(result.stdout).toBe("setup complete");
    });

    it("sudo 执行失败时应返回错误", async () => {
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(null, "/usr/local/bin/mo\n", ""));

      const mockChild = new MockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const event = createMockEvent();

      const resultPromise = handlers["mole-exec-sudo"](event, "mole", ["setup"]);

      setTimeout(() => {
        mockChild.stderr.emit("data", Buffer.from("Permission denied"));
        mockChild.emit("close", 1);
      }, 10);

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.code).toBe(1);
      expect(result.stderr).toBe("Permission denied");
    });

    it("应流式发送命令输出到渲染进程", async () => {
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(null, "/usr/local/bin/mo\n", ""));

      const mockChild = new MockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const event = createMockEvent();

      const resultPromise = handlers["mole-exec-sudo"](event, "mole", ["install"]);

      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from("Installing...\n"));
        mockChild.stderr.emit("data", Buffer.from("Warning: old files\n"));
        mockChild.emit("close", 0);
      }, 10);

      await resultPromise;

      expect(event.sender.send).toHaveBeenCalledWith("mole-output", {
        type: "stdout",
        data: "Installing...\n",
      });
      expect(event.sender.send).toHaveBeenCalledWith("mole-output", {
        type: "stderr",
        data: "Warning: old files\n",
      });
    });

    it("密码提示时无保存密码应请求 renderer 提供密码", async () => {
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(null, "/usr/local/bin/mo\n", ""));

      const mockChild = new MockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const event = createMockEvent();

      const resultPromise = handlers["mole-exec-sudo"](event, "mole", ["clean"]);

      setTimeout(() => {
        mockChild.stderr.emit("data", Buffer.from("Password:"));
        mockChild.emit("close", 1);
      }, 10);

      const result = await resultPromise;

      // Should send password-request to renderer instead of killing process
      expect(event.sender.send).toHaveBeenCalledWith("mole-output", {
        type: "password-request",
      });
      // Process still resolves when close event fires
      expect(result.success).toBe(false);
    });

    it("stderr 包含 incorrect password 时应返回 auth.invalidPassword", async () => {
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(null, "/usr/local/bin/mo\n", ""));

      const mockChild = new MockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const event = createMockEvent();

      const resultPromise = handlers["mole-exec-sudo"](event, "mole", ["setup"]);

      setTimeout(() => {
        mockChild.stderr.emit("data", Buffer.from("Sorry, try again.\n"));
        mockChild.emit("close", 1);
      }, 10);

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.errorKey).toBe("auth.invalidPassword");
      expect(result.fallback).toBe("密码错误，可能已更改");
    });

    it("非 mole 命令应直接使用传入的命令名", async () => {
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(null, "/usr/local/bin/mo\n", ""));

      const mockChild = new MockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const event = createMockEvent();

      const resultPromise = handlers["mole-exec-sudo"](event, "custom-cmd", ["--flag"]);

      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from("ok"));
        mockChild.emit("close", 0);
      }, 10);

      await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        "sudo",
        ["-E", "-S", "custom-cmd", "--flag"],
        expect.any(Object),
      );
    });

    it("sudo 子进程错误应拒绝 Promise", async () => {
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(null, "/usr/local/bin/mo\n", ""));

      const mockChild = new MockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const event = createMockEvent();

      const resultPromise = handlers["mole-exec-sudo"](event, "mole", ["setup"]);

      setTimeout(() => {
        mockChild.emit("error", new Error("sudo not found"));
      }, 10);

      await expect(resultPromise).rejects.toThrow("sudo not found");
    });
  });

  describe("get-platform IPC", () => {
    it("应正确注册 get-platform 处理器", () => {
      expect(mockIpcMain.handle).toHaveBeenCalledWith("get-platform", expect.any(Function));
      expect(handlers["get-platform"]).toBeDefined();
    });

    it("应返回当前平台标识", () => {
      const originalPlatform = process.platform;
      const event = createMockEvent();

      const result = handlers["get-platform"](event);

      expect(result).toBe(originalPlatform);
    });
  });

  describe("open-external IPC", () => {
    it("应正确注册 open-external 处理器", () => {
      expect(mockIpcMain.handle).toHaveBeenCalledWith("open-external", expect.any(Function));
      expect(handlers["open-external"]).toBeDefined();
    });

    it("应调用 shell.openExternal 打开外部链接", () => {
      const event = createMockEvent();
      const url = "https://github.com/tw93/mole";

      handlers["open-external"](event, url);

      expect(mockShell.openExternal).toHaveBeenCalledWith(url);
      expect(mockShell.openExternal).toHaveBeenCalledTimes(1);
    });

    it("应拒绝非 https 的 URL", () => {
      const urls = ["http://example.com", "mailto:test@example.com", "javascript:alert(1)"];

      urls.forEach((url) => {
        const event = createMockEvent();
        expect(() => handlers["open-external"](event, url)).toThrow("Invalid URL");
      });

      expect(mockShell.openExternal).not.toHaveBeenCalled();
    });
  });

  describe("IPC sender validation", () => {
    it("应拒绝来自非法 senderFrame 的 IPC 调用", async () => {
      const event = createMockEvent("https://evil.com");

      await expect(handlers["mole-exec"](event, "mole", ["list"])).rejects.toThrow("Invalid sender");
    });

    it("应允许来自 app:// 协议的 senderFrame", async () => {
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(new Error("not found"), "", ""));

      const event = createMockEvent("app://index.html");

      await expect(handlers["mole-exec"](event, "mole", ["list"])).rejects.toThrow(
        "未检测到 Mole CLI",
      );
    });

    it("应允许来自 localhost dev server 的 senderFrame", async () => {
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(new Error("not found"), "", ""));

      const event = createMockEvent("http://localhost:5173/index.html");

      await expect(handlers["mole-exec"](event, "mole", ["list"])).rejects.toThrow(
        "未检测到 Mole CLI",
      );
    });
  });

  describe("getMolePath caching", () => {
    it("应缓存 mole 路径避免重复 exec", async () => {
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(null, "/usr/local/bin/mo\n", ""));

      // First call should trigger exec for which mo
      const mockChild1 = new MockChildProcess();
      mockSpawn.mockReturnValue(mockChild1);
      const event1 = createMockEvent();
      const promise1 = handlers["mole-exec"](event1, "mole", ["list"]);
      setTimeout(() => mockChild1.emit("close", 0), 10);
      await promise1;

      // Clear mocks to reset exec call count, but cachedMolePath remains set
      vi.clearAllMocks();
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(null, "/usr/local/bin/mo\n", ""));

      // Second call should use cache (no additional exec for which mo)
      const mockChild2 = new MockChildProcess();
      mockSpawn.mockReturnValue(mockChild2);
      const event2 = createMockEvent();
      const promise2 = handlers["mole-exec"](event2, "mole", ["status"]);
      setTimeout(() => mockChild2.emit("close", 0), 10);
      await promise2;

      const whichMoCalls = mockExec.mock.calls.filter((c) => c[0] === "which mo");
      expect(whichMoCalls).toHaveLength(0);
    });
  });

  describe("show-dialog IPC", () => {
    it("应正确注册 show-dialog 处理器", () => {
      expect(mockIpcMain.handle).toHaveBeenCalledWith("show-dialog", expect.any(Function));
      expect(handlers["show-dialog"]).toBeDefined();
    });

    it("应调用 dialog.showMessageBox 并返回结果", async () => {
      const mockResult = { response: 0, checkboxChecked: false };
      mockDialog.showMessageBox.mockResolvedValue(mockResult);

      const event = createMockEvent();
      const options = {
        type: "info",
        title: "确认",
        message: "确定要执行此操作吗？",
        buttons: ["确定", "取消"],
      };

      const result = await handlers["show-dialog"](event, options);

      expect(mockDialog.showMessageBox).toHaveBeenCalledWith(null, options);
      expect(result).toEqual(mockResult);
    });

    it("应正确传递对话框选项参数", async () => {
      mockDialog.showMessageBox.mockResolvedValue({ response: 1 });

      const event = createMockEvent();
      const options = {
        type: "warning",
        title: "警告",
        message: "此操作不可撤销",
        buttons: ["删除", "保留"],
        defaultId: 1,
        cancelId: 1,
      };

      await handlers["show-dialog"](event, options);

      expect(mockDialog.showMessageBox).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          type: "warning",
          title: "警告",
          message: "此操作不可撤销",
        }),
      );
    });
  });

  describe("Dock 图标配置", () => {
    it("dev 模式下应设置 Dock 图标", async () => {
      process.env.VITE_DEV_SERVER_URL = "http://localhost:5173";
      const whenReadyCb = mockApp._whenReadyCallbacks[0];
      const originalLoad = Module._load;
      Module._load = function (request, parent, isMain) {
        if (request === "fs") {
          return { readFileSync: vi.fn(() => Buffer.from("mock")) };
        }
        return originalLoad(request, parent, isMain);
      };
      try {
        await whenReadyCb();
      } finally {
        Module._load = originalLoad;
      }
      expect(mockApp.dock.setIcon).toHaveBeenCalled();
      delete process.env.VITE_DEV_SERVER_URL;
    });

    it("生产模式下不应设置 Dock 图标", async () => {
      delete process.env.VITE_DEV_SERVER_URL;
      const whenReadyCb = mockApp._whenReadyCallbacks[0];
      await whenReadyCb();
      expect(mockApp.dock.setIcon).not.toHaveBeenCalled();
    });
  });
});
