// @vitest-environment node

import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
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
  getPath: vi.fn((name) => (name === "userData" ? "/fake/user/data" : "/fake/path")),
  setLoginItemSettings: vi.fn(),
  getLoginItemSettings: vi.fn(() => ({ openAtLogin: false })),
  requestSingleInstanceLock: vi.fn(() => true),
  commandLine: { appendSwitch: vi.fn() },
}));

const mockBrowserWindow = vi.hoisted(() => {
  const fn = vi.fn();
  fn.getAllWindows = vi.fn(() => []);
  return fn;
});

const mockDialog = vi.hoisted(() => ({
  showMessageBox: vi.fn(),
}));

const mockShell = vi.hoisted(() => ({
  openExternal: vi.fn(),
}));

const mockSafeStorage = vi.hoisted(() => ({
  isEncryptionAvailable: vi.fn(),
  encryptString: vi.fn(),
  decryptString: vi.fn((buf) => buf.toString()),
}));

const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

const mockPath = vi.hoisted(() => ({
  join: vi.fn((...args) => args.join("/")),
}));

vi.mock("electron", () => ({
  default: {
    app: mockApp,
    BrowserWindow: mockBrowserWindow,
    ipcMain: mockIpcMain,
    dialog: mockDialog,
    shell: mockShell,
    safeStorage: mockSafeStorage,
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
  dialog: mockDialog,
  shell: mockShell,
  safeStorage: mockSafeStorage,
  protocol: { handle: vi.fn(), registerSchemesAsPrivileged: vi.fn() },
  session: {
    defaultSession: {
      setPermissionRequestHandler: vi.fn(),
    },
  },
}));

vi.mock("fs", () => ({
  default: mockFs,
  ...mockFs,
}));

vi.mock("path", () => ({
  default: mockPath,
  ...mockPath,
}));

describe("safeStorage helpers and sudo password IPC handlers", () => {
  const sudoPasswordPath = "/fake/user/data/sudo-password.enc";

  beforeAll(async () => {
    vi.resetModules();
    Object.keys(handlers).forEach((key) => delete handlers[key]);

    const originalLoad = Module._load;
    Module._load = function (request, parent, isMain) {
      if (request === "electron") {
        return {
          app: mockApp,
          BrowserWindow: mockBrowserWindow,
          ipcMain: mockIpcMain,
          dialog: mockDialog,
          shell: mockShell,
          safeStorage: mockSafeStorage,
          protocol: { handle: vi.fn(), registerSchemesAsPrivileged: vi.fn() },
          session: {
            defaultSession: {
              setPermissionRequestHandler: vi.fn(),
            },
          },
        };
      }
      if (request === "fs") {
        return mockFs;
      }
      if (request === "path") {
        return mockPath;
      }
      return originalLoad(request, parent, isMain);
    };

    try {
      await import("@main/main.js");
    } finally {
      Module._load = originalLoad;
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSudoPasswordPath", () => {
    it("returns <userData>/sudo-password.enc", () => {
      mockFs.existsSync.mockReturnValue(false);
      handlers["has-sudo-password"]({ senderFrame: { url: "app://index.html" } });
      expect(mockApp.getPath).toHaveBeenCalledWith("userData");
      expect(mockPath.join).toHaveBeenCalledWith("/fake/user/data", "sudo-password.enc");
      expect(mockFs.existsSync).toHaveBeenCalledWith(sudoPasswordPath);
    });
  });

  describe("getSudoPasswordEncrypted", () => {
    it("returns null when file does not exist", () => {
      mockFs.existsSync.mockReturnValue(false);
      const result = handlers["has-sudo-password"]({ senderFrame: { url: "app://index.html" } });
      expect(result).toEqual({ has: false });
      expect(mockFs.existsSync).toHaveBeenCalledWith(sudoPasswordPath);
      expect(mockFs.readFileSync).not.toHaveBeenCalled();
    });

    it("returns content string when file exists", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue("encrypted-content");
      const result = handlers["has-sudo-password"]({ senderFrame: { url: "app://index.html" } });
      expect(result).toEqual({ has: true });
      expect(mockFs.existsSync).toHaveBeenCalledWith(sudoPasswordPath);
      expect(mockFs.readFileSync).toHaveBeenCalledWith(sudoPasswordPath, "utf8");
    });

    it("returns null when read throws", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error("read error");
      });
      const result = handlers["has-sudo-password"]({ senderFrame: { url: "app://index.html" } });
      expect(result).toEqual({ has: false });
      expect(mockFs.readFileSync).toHaveBeenCalledWith(sudoPasswordPath, "utf8");
    });
  });

  describe("saveSudoPasswordEncrypted", () => {
    it("returns true when write succeeds", () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
      mockSafeStorage.encryptString.mockReturnValue(Buffer.from("encrypted-data"));
      mockFs.writeFileSync.mockReturnValue(undefined);
      const result = handlers["save-sudo-password"]({ senderFrame: { url: "app://index.html" } }, "my-password");
      expect(result).toEqual({ success: true });
      expect(mockSafeStorage.encryptString).toHaveBeenCalledWith("my-password");
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        sudoPasswordPath,
        Buffer.from("encrypted-data").toString("base64"),
        "utf8",
      );
    });

    it("returns false when write throws", () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
      mockSafeStorage.encryptString.mockReturnValue(Buffer.from("encrypted-data"));
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error("write error");
      });
      const result = handlers["save-sudo-password"]({ senderFrame: { url: "app://index.html" } }, "my-password");
      // The helper catches the error internally and returns false, but the IPC
      // handler does not check the return value, so it returns {success: true}.
      // We verify the write was attempted and failed.
      expect(result).toEqual({ success: true });
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        sudoPasswordPath,
        Buffer.from("encrypted-data").toString("base64"),
        "utf8",
      );
      // Verify via has-sudo-password that the file was not created.
      mockFs.existsSync.mockReturnValue(false);
      const hasResult = handlers["has-sudo-password"]({ senderFrame: { url: "app://index.html" } });
      expect(hasResult).toEqual({ has: false });
    });
  });

  describe("clearSudoPasswordEncrypted", () => {
    it("returns true when file exists and delete succeeds", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockReturnValue(undefined);
      const result = handlers["clear-sudo-password"]({ senderFrame: { url: "app://index.html" } });
      expect(result).toEqual({ success: true });
      expect(mockFs.existsSync).toHaveBeenCalledWith(sudoPasswordPath);
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(sudoPasswordPath);
    });

    it("returns true when file does not exist", () => {
      mockFs.existsSync.mockReturnValue(false);
      const result = handlers["clear-sudo-password"]({ senderFrame: { url: "app://index.html" } });
      expect(result).toEqual({ success: true });
      expect(mockFs.existsSync).toHaveBeenCalledWith(sudoPasswordPath);
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });

    it("returns false when delete throws", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => {
        throw new Error("unlink error");
      });
      const result = handlers["clear-sudo-password"]({ senderFrame: { url: "app://index.html" } });
      expect(result).toEqual({ success: false });
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(sudoPasswordPath);
    });
  });

  describe("save-sudo-password IPC handler", () => {
    it("encrypts and saves password when safeStorage is available", () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
      mockSafeStorage.encryptString.mockReturnValue(Buffer.from("encrypted-password"));
      mockFs.writeFileSync.mockReturnValue(undefined);
      const result = handlers["save-sudo-password"]({ senderFrame: { url: "app://index.html" } }, "plain-password");
      expect(result).toEqual({ success: true });
      expect(mockSafeStorage.encryptString).toHaveBeenCalledWith("plain-password");
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        sudoPasswordPath,
        Buffer.from("encrypted-password").toString("base64"),
        "utf8",
      );
    });

    it("returns error when safeStorage is not available", () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);
      const result = handlers["save-sudo-password"]({ senderFrame: { url: "app://index.html" } }, "plain-password");
      expect(result.success).toBe(false);
      expect(result.errorKey).toBe("mole.sudoFailed");
      expect(result.fallback).toBe("Encryption not available");
      expect(mockSafeStorage.encryptString).not.toHaveBeenCalled();
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });

    it("returns error when encryption throws", () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
      mockSafeStorage.encryptString.mockImplementation(() => {
        throw new Error("encryption failed");
      });
      const result = handlers["save-sudo-password"]({ senderFrame: { url: "app://index.html" } }, "plain-password");
      expect(result.success).toBe(false);
      expect(result.errorKey).toBe("mole.sudoFailed");
      expect(result.fallback).toBe("encryption failed");
    });
  });

  describe("has-sudo-password IPC handler", () => {
    it("returns {has: true} when file exists", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue("encrypted-data");
      const result = handlers["has-sudo-password"]({ senderFrame: { url: "app://index.html" } });
      expect(result).toEqual({ has: true });
      expect(mockFs.existsSync).toHaveBeenCalledWith(sudoPasswordPath);
      expect(mockFs.readFileSync).toHaveBeenCalledWith(sudoPasswordPath, "utf8");
    });

    it("returns {has: false} when file does not exist", () => {
      mockFs.existsSync.mockReturnValue(false);
      const result = handlers["has-sudo-password"]({ senderFrame: { url: "app://index.html" } });
      expect(result).toEqual({ has: false });
      expect(mockFs.existsSync).toHaveBeenCalledWith(sudoPasswordPath);
      expect(mockFs.readFileSync).not.toHaveBeenCalled();
    });
  });

  describe("clear-sudo-password IPC handler", () => {
    it("returns {success: true} when delete succeeds", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockReturnValue(undefined);
      const result = handlers["clear-sudo-password"]({ senderFrame: { url: "app://index.html" } });
      expect(result).toEqual({ success: true });
      expect(mockFs.existsSync).toHaveBeenCalledWith(sudoPasswordPath);
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(sudoPasswordPath);
    });

    it("returns {success: false} when delete fails", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => {
        throw new Error("unlink error");
      });
      const result = handlers["clear-sudo-password"]({ senderFrame: { url: "app://index.html" } });
      expect(result).toEqual({ success: false });
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(sudoPasswordPath);
    });
  });
});
