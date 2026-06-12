import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  registerTheme,
  getThemeList,
  getTheme,
  loadTheme,
  getCurrentTheme,
  toggleTheme,
  isDarkTheme,
  setThemeMode,
  getThemeMode,
  generateBrandPalette,
  ensureContrast,
} from "@/themes/engine.js";

// Mock fluent themes
const mockLightTheme = {
  id: "fluent-light",
  name: "Fluent Light",
  description: "Test light",
  isDark: false,
  preview: { primary: "#0078d4", background: "#f3f3f3" },
  tokens: {
    global: {
      neutral: { grey100: "#ffffff" },
      brand: { brand80: "#0078d4" },
      shadow: { shadow4: "0 1px 2px rgba(0,0,0,0.1)" },
      corner: { corner40: "4px" },
      font: { family: "sans-serif" },
      duration: { duration100: "0.15s" },
      curve: {},
    },
    alias: {
      color: {
        neutralForeground1: "#1c1c1c",
        neutralBackground1: "rgba(255,255,255,0.85)",
        brandForeground1: "#0078d4",
      },
    },
    control: {},
  },
};

const mockDarkTheme = {
  id: "fluent-dark",
  name: "Fluent Dark",
  description: "Test dark",
  isDark: true,
  preview: { primary: "#4da6ff", background: "#2d2d2d" },
  tokens: {
    global: {
      neutral: { grey100: "#ffffff" },
      brand: { brand80: "#0078d4" },
      shadow: { shadow4: "0 1px 2px rgba(0,0,0,0.3)" },
      corner: { corner40: "4px" },
      font: { family: "sans-serif" },
      duration: { duration100: "0.15s" },
      curve: {},
    },
    alias: {
      color: {
        neutralForeground1: "#ffffff",
        neutralBackground1: "rgba(50,50,50,0.85)",
        brandForeground1: "#4da6ff",
      },
    },
    control: {},
  },
};

describe("主题引擎", () => {
  beforeEach(() => {
    // Reset registry by re-registering
    registerTheme(mockLightTheme);
    registerTheme(mockDarkTheme);
    // Clear localStorage
    localStorage.clear();
    // Remove injected style tag if exists
    const existing = document.getElementById("theme-engine-vars");
    if (existing) existing.remove();
    // Reset document attributes
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-dark");
    // Mock matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("主题注册", () => {
    it("应注册主题到注册表", () => {
      const list = getThemeList();
      expect(list.length).toBeGreaterThanOrEqual(2);
      expect(list.find((t) => t.id === "fluent-light")).toBeDefined();
      expect(list.find((t) => t.id === "fluent-dark")).toBeDefined();
    });

    it("应返回主题的元信息（不含完整tokens）", () => {
      const list = getThemeList();
      const light = list.find((t) => t.id === "fluent-light");
      expect(light.name).toBe("Fluent Light");
      expect(light.isDark).toBe(false);
      expect(light.tokens).toBeUndefined(); // 不应暴露完整 tokens
    });

    it("应通过ID获取完整主题JSON", () => {
      const theme = getTheme("fluent-light");
      expect(theme).toBeDefined();
      expect(theme.tokens.alias.color.neutralForeground1).toBe("#1c1c1c");
    });

    it("无效主题应返回null", () => {
      expect(getTheme("nonexistent")).toBeNull();
    });

    it("应拒绝无效的主题JSON", () => {
      const result = registerTheme({ id: "bad" });
      expect(result).toBe(false);
    });
  });

  describe("主题加载", () => {
    it("应注入CSS变量到DOM", async () => {
      await loadTheme("fluent-light", { save: false, transition: false });
      const styleEl = document.getElementById("theme-engine-vars");
      expect(styleEl).toBeDefined();
      expect(styleEl.textContent).toContain("--colorNeutralForeground1: #1c1c1c");
      expect(styleEl.textContent).toContain("--colorBrandForeground1: #0078d4");
    });

    it("应设置data-theme属性", async () => {
      await loadTheme("fluent-dark", { save: false, transition: false });
      expect(document.documentElement.getAttribute("data-theme")).toBe("fluent-dark");
      expect(document.documentElement.getAttribute("data-theme-dark")).toBe("true");
    });

    it("应返回当前主题ID", async () => {
      await loadTheme("fluent-light", { save: false, transition: false });
      expect(getCurrentTheme()).toBe("fluent-light");
    });

    it("不存在的主题应返回false", async () => {
      const result = await loadTheme("nonexistent", { save: false });
      expect(result).toBe(false);
    });

    it("应保存主题偏好到localStorage", async () => {
      await loadTheme("fluent-dark", { save: true, transition: false });
      expect(localStorage.getItem("revel-theme")).toBe("fluent-dark");
    });
  });

  describe("主题切换", () => {
    it("toggleTheme应在浅色和深色间切换", async () => {
      await loadTheme("fluent-light", { save: false, transition: false });
      const result = await toggleTheme();
      expect(result).toBe("fluent-dark");
      expect(getCurrentTheme()).toBe("fluent-dark");
    });

    it("isDarkTheme应返回正确的布尔值", async () => {
      await loadTheme("fluent-dark", { save: false, transition: false });
      expect(isDarkTheme()).toBe(true);

      await loadTheme("fluent-light", { save: false, transition: false });
      expect(isDarkTheme()).toBe(false);
    });
  });

  describe("主题模式", () => {
    it("应设置并获取手动模式", async () => {
      await setThemeMode("manual");
      expect(getThemeMode()).toBe("manual");
    });

    it("应设置并获取跟随系统模式", async () => {
      await setThemeMode("system");
      expect(getThemeMode()).toBe("system");
    });

    it("默认模式应为manual", () => {
      expect(getThemeMode()).toBe("manual");
    });
  });

  describe("深色主题注入", () => {
    it("深色主题应注入正确的CSS变量", async () => {
      await loadTheme("fluent-dark", { save: false, transition: false });
      const styleEl = document.getElementById("theme-engine-vars");
      expect(styleEl.textContent).toContain("--colorNeutralForeground1: #ffffff");
      expect(styleEl.textContent).toContain("--colorBrandForeground1: #4da6ff");
      expect(styleEl.textContent).toContain("--colorNeutralBackground1: rgba(50,50,50,0.85)");
    });
  });
});

describe("Theme engine edge cases", () => {
  const mockLightTheme = {
    id: "fluent-light",
    name: "Fluent Light",
    description: "Test light",
    isDark: false,
    preview: { primary: "#0078d4", background: "#f3f3f3" },
    tokens: {
      global: {
        neutral: { grey100: "#ffffff" },
        brand: { brand80: "#0078d4" },
        shadow: { shadow4: "0 1px 2px rgba(0,0,0,0.1)" },
        corner: { corner40: "4px" },
        font: { family: "sans-serif" },
        duration: { duration100: "0.15s" },
        curve: {},
      },
      alias: {
        color: {
          neutralForeground1: "#1c1c1c",
          neutralBackground1: "rgba(255,255,255,0.85)",
          brandForeground1: "#0078d4",
        },
      },
      control: {},
    },
  };

  const mockDarkTheme = {
    id: "fluent-dark",
    name: "Fluent Dark",
    description: "Test dark",
    isDark: true,
    preview: { primary: "#4da6ff", background: "#2d2d2d" },
    tokens: {
      global: {
        neutral: { grey100: "#ffffff" },
        brand: { brand80: "#0078d4" },
        shadow: { shadow4: "0 1px 2px rgba(0,0,0,0.3)" },
        corner: { corner40: "4px" },
        font: { family: "sans-serif" },
        duration: { duration100: "0.15s" },
        curve: {},
      },
      alias: {
        color: {
          neutralForeground1: "#ffffff",
          neutralBackground1: "rgba(50,50,50,0.85)",
          brandForeground1: "#4da6ff",
        },
      },
      control: {},
    },
  };

  beforeEach(async () => {
    delete window.electronAPI.setTheme;
    registerTheme(mockLightTheme);
    registerTheme(mockDarkTheme);
    localStorage.clear();
    const existing = document.getElementById("theme-engine-vars");
    if (existing) existing.remove();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-dark");
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    await loadTheme("fluent-light", { save: false, transition: false });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    delete window.electronAPI.setTheme;
    await setThemeMode("manual");
  });

  it("toggleTheme calls window.electronAPI.setTheme when available", async () => {
    window.electronAPI.setTheme = vi.fn(() => Promise.resolve());
    await toggleTheme();
    expect(window.electronAPI.setTheme).toHaveBeenCalledTimes(1);
    expect(window.electronAPI.setTheme).toHaveBeenCalledWith({
      id: "fluent-dark",
      isDark: true,
    });
  });

  it("registerTheme returns false and logs error for missing id", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = registerTheme({ tokens: { color: { fg1: "#000" } } });
    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("registerTheme returns false and logs error for missing tokens", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = registerTheme({ id: "no-tokens" });
    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("loadTheme with unregistered id returns false and preserves current theme", async () => {
    const result = await loadTheme("nonexistent", { save: false });
    expect(result).toBe(false);
    expect(getCurrentTheme()).toBe("fluent-light");
  });

  it("injected CSS variables include all token types", async () => {
    const fullTheme = {
      id: "full-theme",
      name: "Full",
      description: "All tokens",
      isDark: false,
      preview: { primary: "#000", background: "#fff" },
      tokens: {
        global: {
          neutral: {
            grey100: "#fff",
            grey98: "#fafafa",
          },
          brand: {
            brand80: "#0078d4",
          },
          shadow: {
            shadow4: "0 1px 2px",
            shadow8: "0 4px 8px",
            shadow16: "0 8px 16px",
            shadow28: "0 2px 4px",
            shadow64: "inset 0 2px 4px",
          },
          corner: {
            corner20: "4px",
            corner40: "8px",
            corner80: "16px",
            cornerFull: "999px",
            cornerCirc: "50%",
          },
          font: { family: "Arial", mono: "Courier" },
          duration: { duration100: "0.1s", duration200: "0.2s", duration400: "0.3s" },
          curve: { curveEasyEase: "cubic-bezier(0.33, 0, 0.67, 1)" },
        },
        alias: {
          color: {
            neutralForeground1: "#111",
            neutralForeground2: "#222",
            neutralForeground3: "#333",
            neutralBackground1: "#444",
            neutralBackground2: "#555",
            neutralBackground3: "#666",
            subtleBackgroundHover: "#777",
            subtleBackgroundPressed: "#888",
            neutralStroke1: "#999",
            neutralStroke2: "#aaa",
            neutralStroke3: "#bbb",
            brandForeground1: "#ccc",
            brandBackgroundTint: "#ddd",
            brandBackgroundHover: "#eee",
            brandBackground1: "#f0f",
            brandBackgroundPressed: "#f1f",
            successForeground1: "#0f0",
            successBackground1: "#0f1",
            warningForeground1: "#ff0",
            warningBackground1: "#ff1",
            dangerForeground1: "#f00",
            dangerBackground1: "#f01",
            infoForeground1: "#00f",
            infoBackground1: "#01f",
          },
        },
        control: {
          button: {
            backgroundRest: "neutralBackground1",
          },
        },
      },
    };
    registerTheme(fullTheme);
    await loadTheme("full-theme", { save: false, transition: false });
    const styleEl = document.getElementById("theme-engine-vars");
    const css = styleEl.textContent;

    // alias color
    expect(css).toContain("--colorNeutralForeground1: #111");
    expect(css).toContain("--colorNeutralForeground2: #222");
    expect(css).toContain("--colorNeutralForeground3: #333");
    expect(css).toContain("--colorNeutralBackground1: #444");
    expect(css).toContain("--colorNeutralBackground2: #555");
    expect(css).toContain("--colorNeutralBackground3: #666");
    expect(css).toContain("--colorSubtleBackgroundHover: #777");
    expect(css).toContain("--colorSubtleBackgroundPressed: #888");
    expect(css).toContain("--colorNeutralStroke1: #999");
    expect(css).toContain("--colorNeutralStroke2: #aaa");
    expect(css).toContain("--colorNeutralStroke3: #bbb");
    expect(css).toContain("--colorBrandForeground1: #ccc");
    expect(css).toContain("--colorBrandBackgroundTint: #ddd");
    expect(css).toContain("--colorBrandBackgroundHover: #eee");
    expect(css).toContain("--colorBrandBackground1: #f0f");
    expect(css).toContain("--colorBrandBackgroundPressed: #f1f");
    expect(css).toContain("--colorSuccessForeground1: #0f0");
    expect(css).toContain("--colorSuccessBackground1: #0f1");
    expect(css).toContain("--colorWarningForeground1: #ff0");
    expect(css).toContain("--colorWarningBackground1: #ff1");
    expect(css).toContain("--colorDangerForeground1: #f00");
    expect(css).toContain("--colorDangerBackground1: #f01");
    expect(css).toContain("--colorInfoForeground1: #00f");
    expect(css).toContain("--colorInfoBackground1: #01f");

    // global corner
    expect(css).toContain("--corner20: 4px");
    expect(css).toContain("--corner40: 8px");
    expect(css).toContain("--corner80: 16px");
    expect(css).toContain("--cornerFull: 999px");
    expect(css).toContain("--cornerCirc: 50%");

    // global shadow
    expect(css).toContain("--shadow4: 0 1px 2px");
    expect(css).toContain("--shadow8: 0 4px 8px");
    expect(css).toContain("--shadow16: 0 8px 16px");
    expect(css).toContain("--shadow28: 0 2px 4px");
    expect(css).toContain("--shadow64: inset 0 2px 4px");

    // global font
    expect(css).toContain("--font: Arial");
    expect(css).toContain("--font-mono: Courier");

    // global duration
    expect(css).toContain("--duration100: 0.1s");
    expect(css).toContain("--duration200: 0.2s");
    expect(css).toContain("--duration400: 0.3s");

    // global curve
    expect(css).toContain("--curveEasyEase: cubic-bezier(0.33, 0, 0.67, 1)");

    // global neutral
    expect(css).toContain("--grey100: #fff");
    expect(css).toContain("--grey98: #fafafa");

    // global brand
    expect(css).toContain("--brand80: #0078d4");

    // control tokens should NOT be injected
    expect(css).not.toContain("button");
    expect(css).not.toContain("backgroundRest");
  });

  it("setThemeMode system with dark preference loads dark theme", async () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn((query) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    const themeId = await setThemeMode("system");
    expect(themeId).toBe("fluent-dark");
    expect(getCurrentTheme()).toBe("fluent-dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("fluent-dark");
    expect(document.documentElement.getAttribute("data-theme-dark")).toBe("true");
  });
});

describe("generateBrandPalette", () => {
  it("应从 #0078d4 生成正确的派生色板", () => {
    const palette = generateBrandPalette("#0078d4");
    expect(palette.brandBackground1).toBe("#0078d4");
    expect(palette.brandForeground1).toBe("#ffffff");
    expect(palette.brandBackgroundTint).toBe("rgba(0,120,212,0.08)");
    expect(palette.brandBackgroundHover).toMatch(/^#/);
    expect(palette.brandBackgroundPressed).toMatch(/^#/);
  });

  it("亮强调色应生成深色前景", () => {
    const palette = generateBrandPalette("#ffff00");
    expect(palette.brandForeground1).toBe("#000000");
  });

  it("无效 hex 应返回 null", () => {
    expect(generateBrandPalette("invalid")).toBeNull();
  });
});

describe("ensureContrast", () => {
  it("#ffffff 在 #0078d4 上应满足对比度", () => {
    expect(ensureContrast("#ffffff", "#0078d4")).toBe("#ffffff");
  });

  it("#ffffff 在 #ffff00 上应自动返回 #000000", () => {
    expect(ensureContrast("#ffffff", "#ffff00")).toBe("#000000");
  });

  it("#000000 在 #ffffff 上应满足对比度", () => {
    expect(ensureContrast("#000000", "#ffffff")).toBe("#000000");
  });
});
