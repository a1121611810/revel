// @vitest-environment node

import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { EventEmitter } from "events";
import Module from "module";

// Helper: create mock IPC event with senderFrame
function createMockEvent(senderUrl = "app://index.html") {
  return {
    sender: { send: vi.fn() },
    senderFrame: { url: senderUrl },
  };
}

// 创建模拟的 ChildProcess（EventEmitter 子类）
class MockChildProcess extends EventEmitter {
  constructor() {
    super();
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
    this.stdin = { write: vi.fn(), end: vi.fn(), destroyed: false };
    this.kill = vi.fn(() => this.emit("close", null, "SIGTERM"));
  }
}

// Helper: mock exec success
function mockExecSuccess(stdout = "") {
  mockExec.mockImplementation((_cmd, _opts, cb) => cb(null, stdout, ""));
}

// Helper: mock exec failure
function mockExecFail(stderr = "") {
  mockExec.mockImplementation((_cmd, _opts, cb) => cb(new Error("command failed"), "", stderr));
}

// Helper: mock spawn success
function mockSpawnSuccess(stdoutData = "") {
  const mockChild = new MockChildProcess();
  mockSpawn.mockReturnValue(mockChild);
  setTimeout(() => {
    if (stdoutData) mockChild.stdout.emit("data", Buffer.from(stdoutData));
    mockChild.emit("close", 0);
  }, 10);
  return mockChild;
}

// Helper: mock spawn failure
function mockSpawnFail(stderrData = "", code = 1) {
  const mockChild = new MockChildProcess();
  mockSpawn.mockReturnValue(mockChild);
  setTimeout(() => {
    if (stderrData) mockChild.stderr.emit("data", Buffer.from(stderrData));
    mockChild.emit("close", code);
  }, 10);
  return mockChild;
}

const mockExec = vi.hoisted(() => vi.fn());
const mockSpawn = vi.hoisted(() => vi.fn());

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

const mockApp = vi.hoisted(() => ({
  whenReady: vi.fn(() => new Promise(() => {})),
  on: vi.fn(),
  quit: vi.fn(),
  getVersion: vi.fn(() => "1.0.0"),
  getPath: vi.fn((name) => (name === "userData" ? "/fake/user/data" : "/fake/path")),
  setLoginItemSettings: vi.fn(),
  getLoginItemSettings: vi.fn(() => ({ openAtLogin: false })),
  requestSingleInstanceLock: vi.fn(() => true),
  dock: { setIcon: vi.fn() },
}));

vi.mock("child_process", () => ({
  default: {
    exec: mockExec,
    spawn: mockSpawn,
  },
  exec: mockExec,
  spawn: mockSpawn,
}));

vi.mock("electron", () => ({
  default: {
    app: mockApp,
    safeStorage: mockSafeStorage,
  },
  app: mockApp,
  safeStorage: mockSafeStorage,
}));

vi.mock("fs", () => ({
  default: mockFs,
  ...mockFs,
}));

vi.mock("path", () => ({
  default: mockPath,
  ...mockPath,
}));

describe("ensure-sudo and get-sudo-cache-status IPC handlers", () => {
  let handleEnsureSudo;
  let handleGetSudoCacheStatus;
  let originalLoad;

  beforeAll(async () => {
    vi.resetModules();

    originalLoad = Module._load;
    Module._load = function (request, parent, isMain) {
      if (request === "electron") {
        return {
          app: mockApp,
          safeStorage: mockSafeStorage,
          protocol: { handle: vi.fn(), registerSchemesAsPrivileged: vi.fn() },
          session: {
            defaultSession: {
              setPermissionRequestHandler: vi.fn(),
            },
          },
          BrowserWindow: vi.fn(() => ({
            loadURL: vi.fn(),
            loadFile: vi.fn(),
            webContents: { openDevTools: vi.fn(), send: vi.fn() },
            on: vi.fn(),
            once: vi.fn(),
            hide: vi.fn(),
            show: vi.fn(),
            isVisible: vi.fn(() => true),
            isMinimized: vi.fn(() => false),
            restore: vi.fn(),
          })),
          ipcMain: { handle: vi.fn(), on: vi.fn() },
          dialog: { showMessageBox: vi.fn() },
          shell: { openExternal: vi.fn() },
          nativeImage: {
            createEmpty: vi.fn(() => ({
              isEmpty: vi.fn(() => false),
              getSize: vi.fn(() => ({ width: 64, height: 64 })),
              getScaleFactors: vi.fn(() => [1, 2]),
              addRepresentation: vi.fn(),
            })),
          },
          Menu: { setApplicationMenu: vi.fn() },
        };
      }
      if (request === "child_process") {
        return {
          exec: mockExec,
          spawn: mockSpawn,
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

    let mainModule;
    try {
      mainModule = await import("@main/main.js");
    } finally {
      Module._load = originalLoad;
    }

    handleEnsureSudo = mainModule.handleEnsureSudo;
    handleGetSudoCacheStatus = mainModule.handleGetSudoCacheStatus;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ensure-sudo IPC", () => {
    it("should return success when sudo cache is already valid", async () => {
      expect(handleEnsureSudo).toBeDefined();
      mockExecSuccess();
      const result = await handleEnsureSudo(createMockEvent());
      expect(result).toEqual({ success: true });
    });

    it("should refresh sudo cache with saved password when expired", async () => {
      expect(handleEnsureSudo).toBeDefined();
      // sudo -n true fails (cache expired)
      mockExecFail("sudo: a password is required");
      // saved password exists
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue("encrypted-password");
      mockSafeStorage.decryptString.mockReturnValue("my-password");
      // sudo -v with password succeeds
      mockSpawnSuccess();
      const result = await handleEnsureSudo(createMockEvent());
      expect(result).toEqual({ success: true });
      expect(mockSpawn).toHaveBeenCalledWith(
        "sudo",
        expect.arrayContaining(["-v"]),
        expect.any(Object),
      );
    });

    it("should return error when no saved password exists", async () => {
      expect(handleEnsureSudo).toBeDefined();
      mockExecFail("sudo: a password is required");
      mockFs.existsSync.mockReturnValue(false);
      const result = await handleEnsureSudo(createMockEvent());
      expect(result.success).toBe(false);
      expect(result.errorKey).toBe("auth.noPassword");
    });

    it("should return error when saved password is incorrect", async () => {
      expect(handleEnsureSudo).toBeDefined();
      mockExecFail("sudo: a password is required");
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue("encrypted-password");
      mockSafeStorage.decryptString.mockReturnValue("wrong-password");
      mockSpawnFail("Sorry, try again.");
      const result = await handleEnsureSudo(createMockEvent());
      expect(result.success).toBe(false);
      expect(result.errorKey).toBe("auth.invalidPassword");
    });
  });

  describe("get-sudo-cache-status IPC", () => {
    it("should return { valid: true } when sudo cache is valid", async () => {
      expect(handleGetSudoCacheStatus).toBeDefined();
      mockExecSuccess();
      const result = await handleGetSudoCacheStatus(createMockEvent());
      expect(result).toEqual({ valid: true });
    });

    it("should return { valid: false } when sudo cache is expired", async () => {
      expect(handleGetSudoCacheStatus).toBeDefined();
      mockExecFail("sudo: a password is required");
      const result = await handleGetSudoCacheStatus(createMockEvent());
      expect(result).toEqual({ valid: false });
    });
  });
});
