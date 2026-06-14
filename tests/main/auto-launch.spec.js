// @vitest-environment node

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import Module from "module";

const handlers = vi.hoisted(() => ({}));

const mockIpcMain = vi.hoisted(() => ({
  handle: vi.fn((channel, handler) => {
    handlers[channel] = handler;
  }),
  on: vi.fn(),
}));

const mockApp = vi.hoisted(() => ({
  whenReady: vi.fn(() => new Promise(() => {})),
  on: vi.fn(),
  quit: vi.fn(),
  getVersion: vi.fn(() => "1.0.0"),
  getPath: vi.fn(() => "/fake/app/path/Contents/MacOS/Revel"),
  setLoginItemSettings: vi.fn(),
  getLoginItemSettings: vi.fn(() => ({ openAtLogin: false, wasOpenedAtLogin: false })),
  requestSingleInstanceLock: vi.fn(() => true),
  commandLine: { appendSwitch: vi.fn() },
  isPackaged: true,
}));

const mockBrowserWindow = vi.hoisted(() => {
  const fn = vi.fn();
  fn.getAllWindows = vi.fn(() => []);
  return fn;
});

const mockExec = vi.hoisted(() => vi.fn());

// Mock fs so loadAutoLaunchConfig/saveAutoLaunchConfig don't touch real disk
const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock("electron", () => ({
  default: {
    app: mockApp,
    BrowserWindow: mockBrowserWindow,
    ipcMain: mockIpcMain,
    protocol: { handle: vi.fn(), registerSchemesAsPrivileged: vi.fn() },
    session: {
      defaultSession: {
        setPermissionRequestHandler: vi.fn(),
      },
    },
  },
  app: mockApp,
  BrowserWindow: mockBrowserWindow,
  ipcMain: mockIpcMain,
  protocol: { handle: vi.fn(), registerSchemesAsPrivileged: vi.fn() },
  session: {
    defaultSession: {
      setPermissionRequestHandler: vi.fn(),
    },
  },
}));

vi.mock("child_process", () => ({
  default: {
    exec: mockExec,
  },
  exec: mockExec,
}));

vi.mock("fs", () => ({
  default: mockFs,
  ...mockFs,
}));

describe("auto-launch IPC", () => {
  let originalLoad;

  beforeAll(async () => {
    vi.resetModules();
    Object.keys(handlers).forEach((key) => delete handlers[key]);

    originalLoad = Module._load;
    Module._load = function (request, parent, isMain) {
      if (request === "electron") {
        return {
          app: mockApp,
          BrowserWindow: mockBrowserWindow,
          ipcMain: mockIpcMain,
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
          exec: mockExec,
        };
      }
      if (request === "fs") {
        return mockFs;
      }
      return originalLoad(request, parent, isMain);
    };

    await import("@main/main.js");
  });

  afterAll(() => {
    Module._load = originalLoad;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // 默认 packaged 模式
    Object.defineProperty(mockApp, "isPackaged", { value: true, writable: true, configurable: true });
    // 默认 fs: 配置文件不存在 → loadAutoLaunchConfig 返回默认值 { showWindow: false }
    mockFs.existsSync.mockReturnValue(false);
  });

  describe("set-auto-launch", () => {
    it("macOS packaged + enabled=true (default showWindow=false): openAsHidden=true and cleans up Mole", async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(null, "", ""));

      const result = await handlers["set-auto-launch"]({ senderFrame: { url: "app://index.html" } }, true);

      expect(mockApp.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: true, openAsHidden: true });
      expect(mockExec).toHaveBeenCalledWith(
        `osascript -e 'tell application "System Events" to delete login item "Mole"'`,
        expect.any(Object),
        expect.any(Function),
      );
      expect(result).toEqual({ success: true });
    });

    it("macOS packaged + enabled=true + options.showWindow=true: openAsHidden=false", async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(null, "", ""));

      const result = await handlers["set-auto-launch"](
        { senderFrame: { url: "app://index.html" } },
        true,
        { showWindow: true },
      );

      expect(mockApp.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: true, openAsHidden: false });
      expect(result).toEqual({ success: true });
    });

    it("macOS packaged + enabled=false: openAtLogin=false, openAsHidden=false", async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });

      const result = await handlers["set-auto-launch"]({ senderFrame: { url: "app://index.html" } }, false);

      expect(mockApp.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: false, openAsHidden: false });
      expect(mockExec).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it("macOS packaged: cleanup Mole failure does not block success", async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(new Error("not found"), "", ""));

      const result = await handlers["set-auto-launch"]({ senderFrame: { url: "app://index.html" } }, true);

      expect(result).toEqual({ success: true });
    });

    it("macOS dev mode: returns error and does NOT call setLoginItemSettings", async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      Object.defineProperty(mockApp, "isPackaged", { value: false });

      const result = await handlers["set-auto-launch"]({ senderFrame: { url: "app://index.html" } }, true);

      expect(mockApp.setLoginItemSettings).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        errorKey: "error.autoLaunchDevMode",
        fallback: "Auto launch is not available in development mode",
      });
    });

    it("win32 packaged + enabled=true: calls setLoginItemSettings with openAsHidden", async () => {
      Object.defineProperty(process, "platform", { value: "win32" });

      const result = await handlers["set-auto-launch"]({ senderFrame: { url: "app://index.html" } }, true);

      expect(mockApp.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: true, openAsHidden: true });
      expect(mockExec).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it("win32 packaged + enabled=false: calls setLoginItemSettings({ openAtLogin: false, openAsHidden: false })", async () => {
      Object.defineProperty(process, "platform", { value: "win32" });

      const result = await handlers["set-auto-launch"]({ senderFrame: { url: "app://index.html" } }, false);

      expect(mockApp.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: false, openAsHidden: false });
      expect(result).toEqual({ success: true });
    });

    it("win32 dev mode: returns error and does NOT call setLoginItemSettings", async () => {
      Object.defineProperty(process, "platform", { value: "win32" });
      Object.defineProperty(mockApp, "isPackaged", { value: false });

      const result = await handlers["set-auto-launch"]({ senderFrame: { url: "app://index.html" } }, true);

      expect(mockApp.setLoginItemSettings).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        errorKey: "error.autoLaunchDevMode",
        fallback: "Auto launch is not available in development mode",
      });
    });

    it("linux: returns unsupported platform error", async () => {
      Object.defineProperty(process, "platform", { value: "linux" });

      const result = await handlers["set-auto-launch"]({ senderFrame: { url: "app://index.html" } }, true);

      expect(result).toEqual({
        success: false,
        errorKey: "error.autoLaunchNotSupported",
        fallback: "当前平台暂不支持开机启动设置",
      });
    });

    it("macOS packaged + setLoginItemSettings throws: returns error", async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      mockApp.setLoginItemSettings.mockImplementationOnce(() => {
        throw new Error("SMAppService error");
      });

      const result = await handlers["set-auto-launch"]({ senderFrame: { url: "app://index.html" } }, true);

      expect(result).toEqual({
        success: false,
        errorKey: "error.autoLaunchFailed",
        fallback: "SMAppService error",
      });
    });
  });

  describe("get-auto-launch", () => {
    it("macOS packaged: returns enabled + showWindow", async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      mockApp.getLoginItemSettings.mockReturnValue({ openAtLogin: true });

      const result = await handlers["get-auto-launch"]({ senderFrame: { url: "app://index.html" } });

      expect(mockApp.getLoginItemSettings).toHaveBeenCalled();
      expect(result).toEqual({ enabled: true, showWindow: false });
    });

    it("macOS packaged + showWindow saved in config: returns showWindow=true", async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      mockApp.getLoginItemSettings.mockReturnValue({ openAtLogin: true });
      // 模拟配置文件存在且 showWindow=true
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ showWindow: true }));

      const result = await handlers["get-auto-launch"]({ senderFrame: { url: "app://index.html" } });

      expect(result).toEqual({ enabled: true, showWindow: true });
    });

    it("macOS packaged + not enabled: returns { enabled: false, showWindow: false }", async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      mockApp.getLoginItemSettings.mockReturnValue({ openAtLogin: false });

      const result = await handlers["get-auto-launch"]({ senderFrame: { url: "app://index.html" } });

      expect(result).toEqual({ enabled: false, showWindow: false });
    });

    it("macOS dev mode: returns { enabled: false, showWindow: false, devMode: true }", async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      Object.defineProperty(mockApp, "isPackaged", { value: false });

      const result = await handlers["get-auto-launch"]({ senderFrame: { url: "app://index.html" } });

      expect(mockApp.getLoginItemSettings).not.toHaveBeenCalled();
      expect(result).toEqual({ enabled: false, showWindow: false, devMode: true });
    });

    it("win32 packaged: returns enabled + showWindow", async () => {
      Object.defineProperty(process, "platform", { value: "win32" });
      mockApp.getLoginItemSettings.mockReturnValue({ openAtLogin: true });

      const result = await handlers["get-auto-launch"]({ senderFrame: { url: "app://index.html" } });

      expect(result).toEqual({ enabled: true, showWindow: false });
    });

    it("win32 dev mode: returns { enabled: false, showWindow: false, devMode: true }", async () => {
      Object.defineProperty(process, "platform", { value: "win32" });
      Object.defineProperty(mockApp, "isPackaged", { value: false });

      const result = await handlers["get-auto-launch"]({ senderFrame: { url: "app://index.html" } });

      expect(result).toEqual({ enabled: false, showWindow: false, devMode: true });
    });

    it("linux: returns unsupported platform error", async () => {
      Object.defineProperty(process, "platform", { value: "linux" });

      const result = await handlers["get-auto-launch"]({ senderFrame: { url: "app://index.html" } });

      expect(result).toEqual({
        enabled: false,
        showWindow: false,
        error: "当前平台暂不支持开机启动查询",
      });
    });
  });

  describe("set-auto-launch-show-window", () => {
    it("saves showWindow=true to config and updates login item openAsHidden=false", async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      mockApp.getLoginItemSettings.mockReturnValue({ openAtLogin: true });

      const result = await handlers["set-auto-launch-show-window"](
        { senderFrame: { url: "app://index.html" } },
        true,
      );

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const savedConfig = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
      expect(savedConfig.showWindow).toBe(true);
      expect(mockApp.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: true, openAsHidden: false });
      expect(result).toEqual({ success: true });
    });

    it("saves showWindow=false to config and updates login item openAsHidden=true", async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      mockApp.getLoginItemSettings.mockReturnValue({ openAtLogin: true });

      const result = await handlers["set-auto-launch-show-window"](
        { senderFrame: { url: "app://index.html" } },
        false,
      );

      const savedConfig = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
      expect(savedConfig.showWindow).toBe(false);
      expect(mockApp.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: true, openAsHidden: true });
      expect(result).toEqual({ success: true });
    });

    it("does not update login item when auto-launch is disabled", async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      mockApp.getLoginItemSettings.mockReturnValue({ openAtLogin: false });

      const result = await handlers["set-auto-launch-show-window"](
        { senderFrame: { url: "app://index.html" } },
        true,
      );

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      expect(mockApp.setLoginItemSettings).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it("dev mode: saves config but does not update login item", async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      Object.defineProperty(mockApp, "isPackaged", { value: false });

      const result = await handlers["set-auto-launch-show-window"](
        { senderFrame: { url: "app://index.html" } },
        true,
      );

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      expect(mockApp.setLoginItemSettings).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });
});
