import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAuth } from "../../../src/renderer/src/composables/useAuth.js";

describe("useAuth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.electronAPI = {
      ensureSudo: vi.fn(),
      getSudoCacheStatus: vi.fn(),
      hasSudoPassword: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("initializes with inactive sudo state", () => {
    const auth = useAuth();
    expect(auth.isSudoActive.value).toBe(false);
    expect(auth.passwordSaved.value).toBe(false);
    expect(auth.modules.value).toHaveLength(4);
    expect(auth.modules.value.every((m) => !m.authorized)).toBe(true);
  });

  it("ensureSudo returns immediately when cache is still valid", async () => {
    const auth = useAuth();
    window.electronAPI.ensureSudo.mockResolvedValue({ success: true });

    // First call sets cache
    await auth.ensureSudo();
    expect(window.electronAPI.ensureSudo).toHaveBeenCalledTimes(1);

    // Second call within buffer should not trigger IPC
    const result = await auth.ensureSudo();
    expect(window.electronAPI.ensureSudo).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });

  it("ensureSudo calls IPC when cache is expired", async () => {
    const auth = useAuth();
    window.electronAPI.ensureSudo.mockResolvedValue({ success: true });

    const result = await auth.ensureSudo();
    expect(window.electronAPI.ensureSudo).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(auth.isSudoActive.value).toBe(true);
    expect(auth.modules.value.every((m) => m.authorized)).toBe(true);
  });

  it("ensureSudo clears state on failure", async () => {
    const auth = useAuth();
    window.electronAPI.ensureSudo.mockResolvedValue({ success: true });
    await auth.ensureSudo();

    // Expire cache beyond safety buffer
    vi.advanceTimersByTime(4 * 60 * 1000);

    window.electronAPI.ensureSudo.mockResolvedValue({
      success: false,
      errorKey: "auth.invalidPassword",
    });

    const result = await auth.ensureSudo();
    expect(result.success).toBe(false);
    expect(auth.isSudoActive.value).toBe(false);
    expect(auth.modules.value.every((m) => !m.authorized)).toBe(true);
  });

  it("loadStatus fetches password and cache status", async () => {
    const auth = useAuth();
    window.electronAPI.hasSudoPassword.mockResolvedValue({ has: true });
    window.electronAPI.getSudoCacheStatus.mockResolvedValue({ valid: true });

    await auth.loadStatus();
    expect(auth.passwordSaved.value).toBe(true);
    expect(auth.isSudoActive.value).toBe(true);
    expect(auth.modules.value.every((m) => m.authorized)).toBe(true);
  });

  it("clearLocalState resets everything", async () => {
    const auth = useAuth();
    window.electronAPI.hasSudoPassword.mockResolvedValue({ has: true });
    window.electronAPI.getSudoCacheStatus.mockResolvedValue({ valid: true });
    await auth.loadStatus();

    expect(auth.isSudoActive.value).toBe(true);
    expect(auth.modules.value.every((m) => m.authorized)).toBe(true);

    auth.clearLocalState();
    expect(auth.isSudoActive.value).toBe(false);
    expect(auth.modules.value.every((m) => !m.authorized)).toBe(true);
  });
});
