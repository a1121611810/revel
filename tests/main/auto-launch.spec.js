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
  getLoginItemSettings: vi.fn(() => ({ openAtLogin: false })),
  requestSingleInstanceLock: vi.fn(() => true),
}));

const mockBrowserWindow = vi.hoisted(() => {
  const fn = vi.fn();
  fn.getAllWindows = vi.fn(() => []);
  return fn;
});

const mockExec = vi.hoisted(() => vi.fn());

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
      return originalLoad(request, parent, isMain);
    };

    await import("@main/main.js");
  });

  afterAll(() => {
    Module._load = originalLoad;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("set-auto-launch", () => {
    it("macOS + enabled=true: osascript contains make login item and app path", async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(null, "", ""));

      const result = await handlers["set-auto-launch"]({ senderFrame: { url: "app://index.html" } }, true);

      expect(mockExec).toHaveBeenCalledWith(
        `osascript -e 'tell application "System Events" to make login item at end with properties {name:"Mole", path:"/fake/app/path", hidden:false}'`,
        expect.any(Object),
        expect.any(Function),
      );
      expect(result).toEqual({ success: true });
    });

    it('macOS + enabled=false: osascript contains delete login item "Mole"', async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(null, "", ""));

      const result = await handlers["set-auto-launch"]({ senderFrame: { url: "app://index.html" } }, false);

      expect(mockExec).toHaveBeenCalledWith(
        `osascript -e 'tell application "System Events" to delete login item "Mole"'`,
        expect.any(Object),
        expect.any(Function),
      );
      expect(result).toEqual({ success: true });
    });

    it("macOS osascript throws: returns {success: false, error: err.message}", async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      const error = new Error("osascript failed");
      mockExec.mockImplementation((_cmd, _opts, cb) => {
        cb(error, "", "");
      });

      const result = await handlers["set-auto-launch"]({ senderFrame: { url: "app://index.html" } }, true);

      expect(result.success).toBe(false);
      expect(result.errorKey).toBe("mole.execFailed");
      expect(result.fallback).toBe("osascript failed");
    });

    it("win32 + enabled=true: calls app.setLoginItemSettings({openAtLogin: true})", async () => {
      Object.defineProperty(process, "platform", { value: "win32" });

      const result = await handlers["set-auto-launch"]({ senderFrame: { url: "app://index.html" } }, true);

      expect(mockApp.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: true });
      expect(result).toEqual({ success: true });
    });

    it("win32 + enabled=false: calls app.setLoginItemSettings({openAtLogin: false})", async () => {
      Object.defineProperty(process, "platform", { value: "win32" });

      const result = await handlers["set-auto-launch"]({ senderFrame: { url: "app://index.html" } }, false);

      expect(mockApp.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: false });
      expect(result).toEqual({ success: true });
    });

    it("linux: returns unsupported platform error", async () => {
      Object.defineProperty(process, "platform", { value: "linux" });

      const result = await handlers["set-auto-launch"]({ senderFrame: { url: "app://index.html" } }, true);

      expect(result.success).toBe(false);
      expect(result.errorKey).toBe("mole.execFailed");
      expect(result.fallback).toBe("当前平台暂不支持开机启动设置");
    });
  });

  describe("get-auto-launch", () => {
    it("macOS: osascript query login items contains Mole → {enabled: true}", async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      mockExec.mockImplementation((_cmd, _opts, cb) => cb(null, "SomeApp, Mole, OtherApp", ""));

      const result = await handlers["get-auto-launch"]({ senderFrame: { url: "app://index.html" } });

      expect(mockExec).toHaveBeenCalledWith(
        `osascript -e 'tell application "System Events" to get the name of every login item'`,
        { encoding: "utf8" },
        expect.any(Function),
      );
      expect(result).toEqual({ enabled: true });
    });

    it("macOS: osascript throws → {enabled: false, error: err.message}", async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      const error = new Error("osascript failed");
      mockExec.mockImplementation((_cmd, _opts, cb) => {
        cb(error, "", "");
      });

      const result = await handlers["get-auto-launch"]({ senderFrame: { url: "app://index.html" } });

      expect(result).toEqual({ enabled: false, error: "osascript failed" });
    });

    it("win32: reads app.getLoginItemSettings().openAtLogin", async () => {
      Object.defineProperty(process, "platform", { value: "win32" });
      mockApp.getLoginItemSettings.mockReturnValue({ openAtLogin: true });

      const result = await handlers["get-auto-launch"]({ senderFrame: { url: "app://index.html" } });

      expect(mockApp.getLoginItemSettings).toHaveBeenCalled();
      expect(result).toEqual({ enabled: true });
    });

    it("linux: returns unsupported platform error", async () => {
      Object.defineProperty(process, "platform", { value: "linux" });

      const result = await handlers["get-auto-launch"]({ senderFrame: { url: "app://index.html" } });

      expect(result).toEqual({
        enabled: false,
        error: "当前平台暂不支持开机启动查询",
      });
    });
  });
});
