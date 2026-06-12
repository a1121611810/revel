import { ref, computed } from "vue";

const SUDO_TTL_MS = 5 * 60 * 1000;
const SAFETY_BUFFER_MS = 2 * 60 * 1000;

const MODULES = [
  { id: "analyze", nameKey: "auth.moduleAnalyze", command: "analyze -json" },
  { id: "clean", nameKey: "auth.moduleClean", command: "clean --dry-run" },
  { id: "purge", nameKey: "auth.modulePurge", command: "purge --dry-run --debug" },
  { id: "uninstall", nameKey: "auth.moduleUninstall", command: "uninstall --list" },
];

export function useAuth() {
  const sudoValidUntil = ref(0);
  const passwordSaved = ref(false);
  const modules = ref(MODULES.map((m) => ({ ...m, authorized: false, lastVerified: 0 })));

  const isSudoActive = computed(() => {
    return Date.now() < sudoValidUntil.value - SAFETY_BUFFER_MS;
  });

  async function refreshPasswordStatus() {
    try {
      const res = await window.electronAPI.hasSudoPassword();
      passwordSaved.value = res?.has || false;
    } catch {
      passwordSaved.value = false;
    }
  }

  async function ensureSudo() {
    const now = Date.now();
    if (now < sudoValidUntil.value - SAFETY_BUFFER_MS) {
      return { success: true };
    }
    try {
      const res = await window.electronAPI.ensureSudo();
      if (res.success) {
        sudoValidUntil.value = now + SUDO_TTL_MS;
        modules.value.forEach((m) => {
          m.authorized = true;
          m.lastVerified = now;
        });
      } else {
        sudoValidUntil.value = 0;
        modules.value.forEach((m) => {
          m.authorized = false;
        });
      }
      return res;
    } catch (err) {
      sudoValidUntil.value = 0;
      modules.value.forEach((m) => {
        m.authorized = false;
      });
      return { success: false, errorKey: "auth.failed", fallback: err.message };
    }
  }

  async function verifyModule(moduleId) {
    const global = await ensureSudo();
    if (!global.success) return global;
    const mod = modules.value.find((m) => m.id === moduleId);
    if (mod) {
      mod.authorized = true;
      mod.lastVerified = Date.now();
    }
    return { success: true };
  }

  async function loadStatus() {
    await refreshPasswordStatus();
    try {
      const cache = await window.electronAPI.getSudoCacheStatus();
      if (cache.valid) {
        sudoValidUntil.value = Date.now() + SUDO_TTL_MS;
        modules.value.forEach((m) => {
          m.authorized = true;
        });
      }
    } catch {
      // Ignore cache status errors
    }
  }

  function clearLocalState() {
    sudoValidUntil.value = 0;
    modules.value.forEach((m) => {
      m.authorized = false;
    });
  }

  return {
    passwordSaved,
    modules,
    isSudoActive,
    ensureSudo,
    verifyModule,
    loadStatus,
    clearLocalState,
    refreshPasswordStatus,
  };
}
