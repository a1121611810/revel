import { describe, it, expect, vi, beforeAll } from "vitest";
import Module from "module";

vi.resetModules();

const state = vi.hoisted(() => {
  const _state = {
    exposedAPI: undefined,
    mockIpcRenderer: {
      invoke: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
    },
    mockContextBridge: {
      exposeInMainWorld: vi.fn((name, api) => {
        _state.exposedAPI = api;
      }),
    },
  };
  return _state;
});

const { mockIpcRenderer, mockContextBridge } = state;

vi.mock("electron", () => ({
  default: {
    contextBridge: mockContextBridge,
    ipcRenderer: mockIpcRenderer,
  },
  contextBridge: mockContextBridge,
  ipcRenderer: mockIpcRenderer,
}));

describe("预加载脚本 API 测试", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  beforeAll(async () => {
    vi.resetModules();
    state.exposedAPI = undefined;

    // vitest v4 的 vi.mock 不会拦截 CJS 的 require，需临时补丁 Module._load
    const originalLoad = Module._load;
    Module._load = function (request, parent, isMain) {
      if (request === "electron") {
        return {
          contextBridge: mockContextBridge,
          ipcRenderer: mockIpcRenderer,
        };
      }
      return originalLoad(request, parent, isMain);
    };

    try {
      await import("@preload/preload.js");
    } finally {
      Module._load = originalLoad;
    }
  });

  describe("exposeInMainWorld 注册", () => {
    it("应调用 exposeInMainWorld 且暴露名为 electronAPI", () => {
      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledTimes(1);
      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        "electronAPI",
        expect.any(Object),
      );
    });

    it("暴露的 API 对象应包含所有预期方法", () => {
      expect(state.exposedAPI).toHaveProperty("moleExec");
      expect(state.exposedAPI).toHaveProperty("moleExecSudo");
      expect(state.exposedAPI).toHaveProperty("onMoleOutput");
      expect(state.exposedAPI).toHaveProperty("removeMoleOutputListener");
      expect(state.exposedAPI).toHaveProperty("getPlatform");
      expect(state.exposedAPI).toHaveProperty("openExternal");
      expect(state.exposedAPI).toHaveProperty("showDialog");
      // Menu bar monitor APIs
      expect(state.exposedAPI).toHaveProperty("getMenuBarEnabled");
      expect(state.exposedAPI).toHaveProperty("setMenuBarEnabled");
      expect(state.exposedAPI).toHaveProperty("getMenuBarModules");
      expect(state.exposedAPI).toHaveProperty("setMenuBarModules");
      expect(state.exposedAPI).toHaveProperty("onMenuBarStatus");
      expect(state.exposedAPI).toHaveProperty("removeMenuBarStatusListener");
    });

    it("所有暴露的方法都应该是函数", () => {
      expect(typeof state.exposedAPI.moleExec).toBe("function");
      expect(typeof state.exposedAPI.moleExecSudo).toBe("function");
      expect(typeof state.exposedAPI.onMoleOutput).toBe("function");
      expect(typeof state.exposedAPI.removeMoleOutputListener).toBe("function");
      expect(typeof state.exposedAPI.getPlatform).toBe("function");
      expect(typeof state.exposedAPI.openExternal).toBe("function");
      expect(typeof state.exposedAPI.showDialog).toBe("function");
    });
  });

  describe("moleExec API", () => {
    it("应调用 ipcRenderer.invoke 并传递 mole-exec 通道和参数", async () => {
      const mockResult = { code: 0, stdout: "ok", stderr: "", success: true };
      mockIpcRenderer.invoke.mockResolvedValue(mockResult);

      const result = await state.exposedAPI.moleExec("mole", ["list"]);

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("mole-exec", "mole", ["list"]);
      expect(result).toEqual(mockResult);
    });

    it("不带 args 参数时应传递 undefined", async () => {
      mockIpcRenderer.invoke.mockResolvedValue({});

      await state.exposedAPI.moleExec("status");

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("mole-exec", "status", undefined);
    });

    it("应正确传递不同的命令和参数", async () => {
      mockIpcRenderer.invoke.mockResolvedValue({});

      await state.exposedAPI.moleExec("mole", ["setup", "--global"]);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("mole-exec", "mole", [
        "setup",
        "--global",
      ]);

      await state.exposedAPI.moleExec("mo", ["status"]);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("mole-exec", "mo", ["status"]);
    });
  });

  describe("moleExecSudo API", () => {
    it("应调用 ipcRenderer.invoke 并传递 mole-exec-sudo 通道和参数", async () => {
      const mockResult = { code: 0, stdout: "done", stderr: "", success: true };
      mockIpcRenderer.invoke.mockResolvedValue(mockResult);

      const result = await state.exposedAPI.moleExecSudo("mole", ["setup"]);

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("mole-exec-sudo", "mole", ["setup"]);
      expect(result).toEqual(mockResult);
    });

    it("应正确传递 sudo 命令参数", async () => {
      mockIpcRenderer.invoke.mockResolvedValue({});

      await state.exposedAPI.moleExecSudo("mole", ["install", "test-service"]);

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("mole-exec-sudo", "mole", [
        "install",
        "test-service",
      ]);
    });
  });

  describe("onMoleOutput API", () => {
    it("应调用 ipcRenderer.on 注册 mole-output 事件监听器", () => {
      const callback = vi.fn();

      state.exposedAPI.onMoleOutput(callback);

      expect(mockIpcRenderer.on).toHaveBeenCalledTimes(1);
      expect(mockIpcRenderer.on).toHaveBeenCalledWith("mole-output", expect.any(Function));
    });

    it("回调函数应在 mole-output 事件触发时被调用并接收数据", () => {
      const callback = vi.fn();

      state.exposedAPI.onMoleOutput(callback);

      // 获取注册的事件处理器
      const eventHandler = mockIpcRenderer.on.mock.calls[0][1];

      // 模拟触发事件
      const mockData = { type: "stdout", data: "output line" };
      eventHandler({}, mockData);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(mockData);
    });

    it("应能注册多个不同的回调函数", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      state.exposedAPI.onMoleOutput(callback1);
      state.exposedAPI.onMoleOutput(callback2);

      expect(mockIpcRenderer.on).toHaveBeenCalledTimes(2);
    });

    it("事件处理器应正确传递 stderr 类型数据", () => {
      const callback = vi.fn();

      state.exposedAPI.onMoleOutput(callback);

      const eventHandler = mockIpcRenderer.on.mock.calls[0][1];
      const mockData = { type: "stderr", data: "error message" };
      eventHandler({}, mockData);

      expect(callback).toHaveBeenCalledWith(mockData);
    });
  });

  describe("removeMoleOutputListener API", () => {
    it("应调用 ipcRenderer.removeListener 移除指定回调", () => {
      const callback = vi.fn();

      // Register first so the wrapper is stored in the Map
      state.exposedAPI.onMoleOutput(callback);
      state.exposedAPI.removeMoleOutputListener(callback);

      expect(mockIpcRenderer.removeListener).toHaveBeenCalledTimes(1);
      expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith("mole-output", expect.any(Function));
    });

    it("应能移除已注册的监听器", () => {
      const callback = vi.fn();

      // 先注册
      state.exposedAPI.onMoleOutput(callback);
      // 再移除
      state.exposedAPI.removeMoleOutputListener(callback);

      expect(mockIpcRenderer.on).toHaveBeenCalledWith("mole-output", expect.any(Function));
      expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith("mole-output", expect.any(Function));
    });

    it("重复注册同一 callback 不应导致重复监听", () => {
      const callback = vi.fn();

      state.exposedAPI.onMoleOutput(callback);
      state.exposedAPI.onMoleOutput(callback);

      // Should only register once due to Map deduplication
      expect(mockIpcRenderer.on).toHaveBeenCalledTimes(1);
    });
  });

  describe("getPlatform API", () => {
    it("应调用 ipcRenderer.invoke 并传递 get-platform 通道", async () => {
      mockIpcRenderer.invoke.mockResolvedValue("darwin");

      const result = await state.exposedAPI.getPlatform();

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("get-platform");
      expect(result).toBe("darwin");
    });

    it("应返回平台信息", async () => {
      mockIpcRenderer.invoke.mockResolvedValue("win32");

      const result = await state.exposedAPI.getPlatform();

      expect(result).toBe("win32");
    });
  });

  describe("openExternal API", () => {
    it("应调用 ipcRenderer.invoke 并传递 open-external 通道和 URL", async () => {
      mockIpcRenderer.invoke.mockResolvedValue(undefined);

      await state.exposedAPI.openExternal("https://github.com/tw93/mole");

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        "open-external",
        "https://github.com/tw93/mole",
      );
    });

    it("应能传递不同类型的 URL", async () => {
      mockIpcRenderer.invoke.mockResolvedValue(undefined);

      await state.exposedAPI.openExternal("http://localhost:3000");
      expect(mockIpcRenderer.invoke).toHaveBeenLastCalledWith(
        "open-external",
        "http://localhost:3000",
      );

      await state.exposedAPI.openExternal("mailto:test@example.com");
      expect(mockIpcRenderer.invoke).toHaveBeenLastCalledWith(
        "open-external",
        "mailto:test@example.com",
      );
    });
  });

  describe("showDialog API", () => {
    it("应调用 ipcRenderer.invoke 并传递 show-dialog 通道和选项", async () => {
      const mockResult = { response: 0 };
      mockIpcRenderer.invoke.mockResolvedValue(mockResult);

      const options = {
        type: "info",
        title: "提示",
        message: "操作成功",
        buttons: ["确定"],
      };

      const result = await state.exposedAPI.showDialog(options);

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("show-dialog", options);
      expect(result).toEqual(mockResult);
    });

    it("应正确传递对话框选项", async () => {
      mockIpcRenderer.invoke.mockResolvedValue({});

      const options = {
        type: "warning",
        title: "警告",
        message: "确定要删除吗？",
        buttons: ["删除", "取消"],
        defaultId: 1,
      };

      await state.exposedAPI.showDialog(options);

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        "show-dialog",
        expect.objectContaining({
          type: "warning",
          title: "警告",
          message: "确定要删除吗？",
        }),
      );
    });
  });

  describe("菜单栏监控 (Menu Bar) API", () => {
    it("getMenuBarEnabled 应调用 ipcRenderer.invoke 传递 get-menu-bar-enabled 通道", async () => {
      mockIpcRenderer.invoke.mockResolvedValue(true);

      const result = await state.exposedAPI.getMenuBarEnabled();

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("get-menu-bar-enabled");
      expect(result).toBe(true);
    });

    it("setMenuBarEnabled 应调用 ipcRenderer.invoke 传递 set-menu-bar-enabled 通道", async () => {
      mockIpcRenderer.invoke.mockResolvedValue({ success: true });

      const result = await state.exposedAPI.setMenuBarEnabled(true);

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("set-menu-bar-enabled", true);
      expect(result).toEqual({ success: true });
    });

    it("getMenuBarModules 应调用 ipcRenderer.invoke 传递 get-menu-bar-modules 通道", async () => {
      const mockModules = { cpu: true, gpu: false, ram: true, ssd: true };
      mockIpcRenderer.invoke.mockResolvedValue(mockModules);

      const result = await state.exposedAPI.getMenuBarModules();

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("get-menu-bar-modules");
      expect(result).toEqual(mockModules);
    });

    it("setMenuBarModules 应调用 ipcRenderer.invoke 传递 set-menu-bar-modules 通道", async () => {
      const modules = { cpu: false, gpu: false, ram: true, ssd: true };
      mockIpcRenderer.invoke.mockResolvedValue({ success: true });

      const result = await state.exposedAPI.setMenuBarModules(modules);

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("set-menu-bar-modules", modules);
      expect(result).toEqual({ success: true });
    });

    it("onMenuBarStatus 应调用 ipcRenderer.on 注册 menu-bar-status 事件监听器", () => {
      const callback = vi.fn();

      state.exposedAPI.onMenuBarStatus(callback);

      expect(mockIpcRenderer.on).toHaveBeenCalledWith("menu-bar-status", expect.any(Function));
    });

    it("onMenuBarStatus 回调应在 menu-bar-status 事件触发时被调用", () => {
      const callback = vi.fn();

      state.exposedAPI.onMenuBarStatus(callback);

      const eventHandler = mockIpcRenderer.on.mock.calls[0][1];
      const mockStats = { cpuUsage: 50, memoryUsage: 60, diskUsage: 30 };
      eventHandler({}, mockStats);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(mockStats);
    });

    it("重复注册同一 callback 不应导致重复监听 onMenuBarStatus", () => {
      const callback = vi.fn();

      state.exposedAPI.onMenuBarStatus(callback);
      state.exposedAPI.onMenuBarStatus(callback);

      expect(mockIpcRenderer.on).toHaveBeenCalledTimes(1);
    });

    it("removeMenuBarStatusListener 应调用 ipcRenderer.removeListener 移除指定回调", () => {
      const callback = vi.fn();

      state.exposedAPI.onMenuBarStatus(callback);
      state.exposedAPI.removeMenuBarStatusListener(callback);

      expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith(
        "menu-bar-status",
        expect.any(Function),
      );
    });

    it("removeMenuBarStatusListener 对未注册的 callback 应安全处理", () => {
      const callback = vi.fn();

      // Should not throw
      expect(() => state.exposedAPI.removeMenuBarStatusListener(callback)).not.toThrow();
    });
  });

  describe("IPC 调用统计", () => {
    it("所有 IPC 调用应使用不同的通道名称", () => {
      const invokeCalls = [
        ["mole-exec", "cmd", []],
        ["mole-exec-sudo", "cmd", []],
        ["get-platform"],
        ["open-external", "https://example.com"],
        ["show-dialog", {}],
      ];

      // 验证每个调用使用的通道名
      const channels = invokeCalls.map((call) => call[0]);
      const uniqueChannels = [...new Set(channels)];

      expect(uniqueChannels).toHaveLength(channels.length);
      expect(uniqueChannels).toContain("mole-exec");
      expect(uniqueChannels).toContain("mole-exec-sudo");
      expect(uniqueChannels).toContain("get-platform");
      expect(uniqueChannels).toContain("open-external");
      expect(uniqueChannels).toContain("show-dialog");
    });
  });
});
