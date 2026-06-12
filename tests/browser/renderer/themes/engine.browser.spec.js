import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  registerTheme,
  getThemeList,
  loadTheme,
  getCurrentTheme,
  toggleTheme,
  isDarkTheme,
  setThemeMode,
  getThemeMode,
} from "@/themes/engine.js";

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

describe("主题引擎 Browser Mode", () => {
  beforeEach(() => {
    registerTheme(mockLightTheme);
    registerTheme(mockDarkTheme);
    localStorage.clear();
    const existing = document.getElementById("theme-engine-vars");
    if (existing) existing.remove();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-dark");
  });

  afterEach(() => {
    const styleEl = document.getElementById("theme-engine-vars");
    if (styleEl) styleEl.remove();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-dark");
  });

  it("应在真实浏览器中注入 CSS 变量", async () => {
    await loadTheme("fluent-light", { save: false, transition: false });

    const styleEl = document.getElementById("theme-engine-vars");
    expect(styleEl).toBeTruthy();

    const computed = getComputedStyle(document.documentElement);
    expect(computed.getPropertyValue("--colorNeutralForeground1").trim()).toBe("#1c1c1c");
    expect(computed.getPropertyValue("--colorBrandForeground1").trim()).toBe("#0078d4");
  });

  it("深色主题应注入正确的 CSS 变量", async () => {
    await loadTheme("fluent-dark", { save: false, transition: false });

    const computed = getComputedStyle(document.documentElement);
    expect(computed.getPropertyValue("--colorNeutralForeground1").trim()).toBe("#ffffff");
    expect(computed.getPropertyValue("--colorBrandForeground1").trim()).toBe("#4da6ff");
  });

  it("切换主题应更新 CSS 变量", async () => {
    await loadTheme("fluent-light", { save: false, transition: false });
    let computed = getComputedStyle(document.documentElement);
    expect(computed.getPropertyValue("--colorNeutralForeground1").trim()).toBe("#1c1c1c");

    await toggleTheme();
    computed = getComputedStyle(document.documentElement);
    expect(computed.getPropertyValue("--colorNeutralForeground1").trim()).toBe("#ffffff");
    expect(getCurrentTheme()).toBe("fluent-dark");
    expect(isDarkTheme()).toBe(true);
  });

  it("应设置 data-theme 属性", async () => {
    await loadTheme("fluent-light", { save: false, transition: false });
    expect(document.documentElement.getAttribute("data-theme")).toBe("fluent-light");
  });
});
