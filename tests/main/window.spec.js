// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import Module from "module";

const appHandlers = vi.hoisted(() => ({}));
const browserWindowInstances = vi.hoisted(() => []);

const mockApp = vi.hoisted(() => ({
  whenReady: vi.fn(() => Promise.resolve()),
  on: vi.fn((event, handler) => {
    appHandlers[event] = handler;
  }),
  quit: vi.fn(),
  isQuiting: false,
  requestSingleInstanceLock: vi.fn(() => true),
  getVersion: vi.fn(() => "1.0.0"),
  getPath: vi.fn(() => "/fake/path"),
}));

const mockBrowserWindow = vi.hoisted(() => {
  const fn = vi.fn(function (options) {
    const instance = {
      options,
      handlers: {},
      on: vi.fn((event, handler) => {
        instance.handlers[event] = handler;
      }),
      once: vi.fn((event, handler) => {
        instance.handlers[event] = handler;
      }),
      loadURL: vi.fn(),
      loadFile: vi.fn(),
      webContents: { openDevTools: vi.fn() },
      show: vi.fn(),
      hide: vi.fn(),
      isDestroyed: vi.fn(() => false),
      isVisible: vi.fn(() => true),
      isMinimized: vi.fn(() => false),
    };
    browserWindowInstances.push(instance);
    return instance;
  });
  fn.getAllWindows = vi.fn(() => [...browserWindowInstances]);
  return fn;
});

const mockJoin = vi.hoisted(() => vi.fn((...args) => args.join("/")));

vi.mock("electron", () => ({
  default: {
    app: mockApp,
    BrowserWindow: mockBrowserWindow,
    ipcMain: { handle: vi.fn(), on: vi.fn() },
    dialog: { showMessageBox: vi.fn() },
    shell: { openExternal: vi.fn() },
    safeStorage: {
      isEncryptionAvailable: vi.fn(() => true),
      encryptString: vi.fn(),
      decryptString: vi.fn(),
    },
    Menu: { setApplicationMenu: vi.fn() },
    protocol: { handle: vi.fn(), registerSchemesAsPrivileged: vi.fn() },
    session: {
      defaultSession: {
        setPermissionRequestHandler: vi.fn(),
      },
    },
  },
  app: mockApp,
  BrowserWindow: mockBrowserWindow,
  ipcMain: { handle: vi.fn(), on: vi.fn() },
  dialog: { showMessageBox: vi.fn() },
  shell: { openExternal: vi.fn() },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn(),
    decryptString: vi.fn(),
  },
  Menu: { setApplicationMenu: vi.fn() },
  protocol: { handle: vi.fn(), registerSchemesAsPrivileged: vi.fn() },
  session: {
    defaultSession: {
      setPermissionRequestHandler: vi.fn(),
    },
  },
}));

vi.mock("path", () => ({
  default: { join: mockJoin },
  join: mockJoin,
}));

function patchModuleLoad() {
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "electron") {
      return {
        app: mockApp,
        BrowserWindow: mockBrowserWindow,
        ipcMain: { handle: vi.fn(), on: vi.fn() },
        dialog: { showMessageBox: vi.fn() },
        shell: { openExternal: vi.fn() },
        safeStorage: {
          isEncryptionAvailable: vi.fn(() => true),
          encryptString: vi.fn(),
          decryptString: vi.fn(),
        },
        Menu: { setApplicationMenu: vi.fn() },
        protocol: { handle: vi.fn(), registerSchemesAsPrivileged: vi.fn() },
        session: {
          defaultSession: {
            setPermissionRequestHandler: vi.fn(),
          },
        },
      };
    }
    if (request === "path") {
      return { join: mockJoin };
    }
    if (request === "child_process") {
      return { spawn: vi.fn(), execSync: vi.fn() };
    }
    if (request === "./status-monitor" || request.endsWith("/status-monitor")) {
      return {
        StatusMonitor: vi.fn(function () {
          return { start: vi.fn(), stop: vi.fn() };
        }),
      };
    }
    if (request === "fs") {
      return {
        existsSync: vi.fn(() => false),
        readFileSync: vi.fn(),
        writeFileSync: vi.fn(),
        unlinkSync: vi.fn(),
      };
    }
    return originalLoad(request, parent, isMain);
  };
  return originalLoad;
}

describe("window management and app lifecycle", () => {
  beforeEach(() => {
    mockApp.isQuiting = false;
  });

  describe("production mode", () => {
    beforeAll(async () => {
      vi.resetModules();
      vi.clearAllMocks();
      browserWindowInstances.length = 0;
      Object.keys(appHandlers).forEach((key) => delete appHandlers[key]);
      delete process.env.VITE_DEV_SERVER_URL;

      const originalLoad = patchModuleLoad();
      try {
        await import("@main/main.js");
      } finally {
        Module._load = originalLoad;
      }
    });

    it("creates BrowserWindow with correct params", () => {
      expect(mockBrowserWindow).toHaveBeenCalledTimes(1);
      const options = browserWindowInstances[0].options;
      expect(options.width).toBe(1280);
      expect(options.height).toBe(800);
      expect(options.minWidth).toBe(960);
      expect(options.minHeight).toBe(640);
      expect(options.titleBarStyle).toBe("hiddenInset");
      expect(options.vibrancy).toBe("sidebar");
      expect(options.show).toBe(false);
    });

    it("has correct webPreferences", () => {
      const options = browserWindowInstances[0].options;
      expect(options.webPreferences.sandbox).toBe(true);
      expect(options.webPreferences.contextIsolation).toBe(true);
      expect(options.webPreferences.nodeIntegration).toBe(false);
      expect(options.webPreferences.preload).toContain("/../preload/preload.js");
    });

    it("loads app://index.html in production", () => {
      expect(browserWindowInstances[0].loadURL).toHaveBeenCalledTimes(1);
      expect(browserWindowInstances[0].loadURL).toHaveBeenCalledWith("app://index.html");
    });

    it("intercepts close event and hides window when not quiting", () => {
      const mockEvent = { preventDefault: vi.fn() };
      mockApp.isQuiting = false;
      browserWindowInstances[0].handlers["close"](mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(browserWindowInstances[0].hide).toHaveBeenCalledTimes(1);
    });

    it("creates window on app ready", () => {
      expect(browserWindowInstances.length).toBe(1);
    });

    it("shows window on ready-to-show", () => {
      browserWindowInstances[0].handlers["ready-to-show"]();
      expect(browserWindowInstances[0].show).toHaveBeenCalledTimes(1);
    });

    it("creates new window on activate when no windows exist", () => {
      const beforeCount = browserWindowInstances.length;
      mockBrowserWindow.getAllWindows.mockReturnValue([]);
      appHandlers["activate"]();
      expect(browserWindowInstances.length).toBe(beforeCount + 1);
    });

    it("shows existing window on activate when windows exist", () => {
      mockBrowserWindow.getAllWindows.mockReturnValue([browserWindowInstances[0]]);
      appHandlers["activate"]();
      const currentMainWindow = browserWindowInstances[browserWindowInstances.length - 1];
      expect(currentMainWindow.show).toHaveBeenCalledTimes(1);
    });

    it("does not quit on window-all-closed on macOS", () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
      appHandlers["window-all-closed"]();
      expect(mockApp.quit).not.toHaveBeenCalled();
      Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
    });

    it("does not quit on window-all-closed on non-macOS", () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "win32", configurable: true });
      appHandlers["window-all-closed"]();
      expect(mockApp.quit).not.toHaveBeenCalled();
      Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
    });

    it("registers will-navigate handler to block navigation", () => {
      const mockContents = {
        on: vi.fn(),
        setWindowOpenHandler: vi.fn(),
      };
      appHandlers["web-contents-created"](null, mockContents);

      expect(mockContents.on).toHaveBeenCalledWith("will-navigate", expect.any(Function));

      const willNavigateHandler = mockContents.on.mock.calls.find(
        (call) => call[0] === "will-navigate",
      )[1];
      const mockEvent = { preventDefault: vi.fn() };
      willNavigateHandler(mockEvent, "https://evil.com");
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it("registers setWindowOpenHandler to deny new windows", () => {
      const mockContents = {
        on: vi.fn(),
        setWindowOpenHandler: vi.fn(),
      };
      appHandlers["web-contents-created"](null, mockContents);

      expect(mockContents.setWindowOpenHandler).toHaveBeenCalledWith(expect.any(Function));

      const handler = mockContents.setWindowOpenHandler.mock.calls[0][0];
      const result = handler({ url: "https://example.com" });
      expect(result).toEqual({ action: "deny" });
    });
  });

  describe("dev mode", () => {
    beforeAll(async () => {
      vi.resetModules();
      vi.clearAllMocks();
      browserWindowInstances.length = 0;
      Object.keys(appHandlers).forEach((key) => delete appHandlers[key]);
      process.env.VITE_DEV_SERVER_URL = "http://localhost:5173";

      const originalLoad = patchModuleLoad();
      try {
        await import("@main/main.js");
      } finally {
        Module._load = originalLoad;
      }
    });

    afterAll(() => {
      delete process.env.VITE_DEV_SERVER_URL;
    });

    it("loads URL and opens dev tools in dev mode", () => {
      expect(browserWindowInstances[0].loadURL).toHaveBeenCalledTimes(1);
      expect(browserWindowInstances[0].loadURL).toHaveBeenCalledWith("http://localhost:5173");
      browserWindowInstances[0].handlers["ready-to-show"]();
      expect(browserWindowInstances[0].webContents.openDevTools).toHaveBeenCalledTimes(1);
    });
  });
});
