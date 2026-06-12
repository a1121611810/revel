/**
 * Theme Engine - CSS 变量 + Theme JSON 运行时主题系统
 *
 * 核心能力：
 * 1. loadTheme(themeId) - 加载 Theme JSON → 注入 CSS 变量
 * 2. getCurrentTheme() / setCurrentTheme() - 获取/设置当前主题
 * 3. getThemeList() - 获取所有可用主题
 * 4. autoDetectSystemTheme() - 自动检测系统深浅色
 * 5. 监听 prefers-color-scheme 变化（跟随系统模式）
 */

import lightTheme from "./fluent-light.json";
import darkTheme from "./fluent-dark.json";

// === 主题注册表 ===
const registry = new Map();

/**
 * 注册一个主题
 * @param {Object} themeJSON - 符合 Theme Schema 的 JSON 对象
 */
export function registerTheme(themeJSON) {
  if (!themeJSON.id || !themeJSON.tokens) {
    console.error("[ThemeEngine] 无效的主题 JSON:", themeJSON);
    return false;
  }
  registry.set(themeJSON.id, themeJSON);
  return true;
}

/**
 * 获取所有已注册主题
 * @returns {Array} 主题列表（含 id, name, description, preview, isDark）
 */
export function getThemeList() {
  return Array.from(registry.values()).map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    author: t.author,
    version: t.version,
    isDark: t.isDark,
    preview: t.preview,
  }));
}

/**
 * 获取单个主题完整 JSON
 * @param {string} themeId
 * @returns {Object|null}
 */
export function getTheme(themeId) {
  return registry.get(themeId) || null;
}

// === 颜色工具函数 ===

function hexToRgb(hex) {
  const result6 = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result6) {
    return {
      r: parseInt(result6[1], 16),
      g: parseInt(result6[2], 16),
      b: parseInt(result6[3], 16),
    };
  }
  const result3 = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
  if (result3) {
    return {
      r: parseInt(result3[1] + result3[1], 16),
      g: parseInt(result3[2] + result3[2], 16),
      b: parseInt(result3[3] + result3[3], 16),
    };
  }
  return null;
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h;
  let s;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r;
  let g;
  let b;

  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 从用户选择的强调色生成完整派生色板
 * @param {string} accentHex - 强调色 hex 值
 * @returns {Object|null} 派生色板
 */
export function generateBrandPalette(accentHex) {
  const rgb = hexToRgb(accentHex);
  if (!rgb) return null;

  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const brandBackground1 = accentHex;
  const brandBackgroundHover = hslToHex(h, s, Math.max(0, l - 8));
  const brandBackgroundPressed = hslToHex(h, s, Math.max(0, l - 16));
  const brandForeground1 = l >= 50 ? "#000000" : "#ffffff";
  const brandBackgroundTint = `rgba(${rgb.r},${rgb.g},${rgb.b},0.08)`;

  return {
    brandBackground1,
    brandBackgroundHover,
    brandBackgroundPressed,
    brandForeground1,
    brandBackgroundTint,
  };
}

function getLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [rs, gs, bs] = [rgb.r, rgb.g, rgb.b].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * 计算 WCAG 对比度，如果不满足 4.5:1，自动返回 #ffffff 或 #000000
 * @param {string} foreground - 前景色 hex
 * @param {string} background - 背景色 hex
 * @returns {string} 满足对比度的前景色
 */
export function ensureContrast(foreground, background) {
  const lumFg = getLuminance(foreground);
  const lumBg = getLuminance(background);
  const lighter = Math.max(lumFg, lumBg);
  const darker = Math.min(lumFg, lumBg);
  const contrast = (lighter + 0.05) / (darker + 0.05);

  if (contrast >= 4.5) {
    return foreground;
  }

  const whiteContrast = 1.05 / (lumBg + 0.05);
  const blackContrast = (lumBg + 0.05) / 0.05;

  return whiteContrast >= blackContrast ? "#ffffff" : "#000000";
}

/**
 * 设置自定义强调色，生成并注入派生色板
 * @param {string} hex — 用户选择的强调色，如 "#0078d4"
 * @returns {Promise<boolean>}
 */
export async function setAccentColor(hex) {
  const palette = generateBrandPalette(hex);
  if (!palette) {
    console.error("[ThemeEngine] 无效的强调色:", hex);
    return false;
  }

  // 验证对比度
  palette.brandForeground1 = ensureContrast(palette.brandForeground1, palette.brandBackground1);

  // 注入品牌色 CSS 变量
  const styleId = "theme-engine-brand-vars";
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  const lines = [];
  for (const [key, val] of Object.entries(palette)) {
    const cssVar = "--color" + key.charAt(0).toUpperCase() + key.slice(1);
    lines.push(`  ${cssVar}: ${val};`);
  }

  styleEl.textContent = `:root {\n${lines.join("\n")}\n}`;

  localStorage.setItem("revel-accent-color", hex);
  console.log(`[ThemeEngine] 强调色已更新: ${hex}`);
  return true;
}

// === CSS 变量注入 ===

let currentThemeId = "";
let systemThemeListener = null;

/**
 * 将 Theme JSON 的 tokens 转换为 CSS 变量字符串
 * @param {Object} tokens - theme.tokens
 * @returns {string} CSS 变量声明
 */
function tokensToCSS(tokens) {
  const lines = [];

  // global tokens
  if (tokens.global) {
    for (const category of ["neutral", "brand", "shadow", "corner", "duration", "curve"]) {
      if (tokens.global[category]) {
        for (const [key, value] of Object.entries(tokens.global[category])) {
          lines.push(`  --${key}: ${value};`);
        }
      }
    }
    if (tokens.global.font) {
      if (tokens.global.font.family) lines.push(`  --font: ${tokens.global.font.family};`);
      if (tokens.global.font.mono) lines.push(`  --font-mono: ${tokens.global.font.mono};`);
    }
  }

  // alias tokens
  if (tokens.alias?.color) {
    for (const [key, value] of Object.entries(tokens.alias.color)) {
      const cssVar = `--color${key.charAt(0).toUpperCase() + key.slice(1)}`;
      lines.push(`  ${cssVar}: ${value};`);
    }
  }

  // control tokens - not injected as CSS variables

  return lines.join("\n");
}

/**
 * 注入主题 CSS 到 DOM
 * @param {Object} theme - 主题 JSON
 */
function injectThemeCSS(theme) {
  const styleId = "theme-engine-vars";
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  const cssVars = tokensToCSS(theme.tokens);
  const bodyBg = theme.tokens?.alias?.color?.neutralBackgroundCanvas || "#f3f3f3";

  styleEl.textContent = `
:root {
${cssVars}
}

body {
  background: ${bodyBg};
}
`;
}

// === 主题加载 ===

/**
 * 加载并应用主题
 * @param {string} themeId - 主题 ID
 * @param {Object} options - { save: boolean, transition: boolean }
 * @returns {Promise<boolean>}
 */
export async function loadTheme(themeId, options = {}) {
  const { save = true, transition = true } = options;

  const theme = registry.get(themeId);
  if (!theme) {
    console.error(`[ThemeEngine] 主题未找到: ${themeId}`);
    return false;
  }

  // 过渡动画：给 body 添加 transitioning 类
  if (transition) {
    document.body.classList.add("theme-transitioning");
    setTimeout(() => document.body.classList.remove("theme-transitioning"), 400);
  }

  // 注入 CSS 变量
  injectThemeCSS(theme);

  // 设置 data-theme 属性（供组件判断当前主题）
  document.documentElement.setAttribute("data-theme", themeId);
  document.documentElement.setAttribute("data-theme-dark", String(theme.isDark));

  currentThemeId = themeId;

  // 保存偏好
  if (save) {
    localStorage.setItem("revel-theme", themeId);
  }

  // 通知 Electron 主进程（可选：同步菜单栏/标题栏颜色）
  if (window.electronAPI?.setTheme) {
    try {
      await window.electronAPI.setTheme({ id: themeId, isDark: theme.isDark });
    } catch {
      // 静默失败，不影响主题切换
    }
  }

  console.log(`[ThemeEngine] 主题已加载: ${theme.name} (${themeId})`);
  return true;
}

/**
 * 获取当前主题 ID
 * @returns {string}
 */
export function getCurrentTheme() {
  return currentThemeId;
}

/**
 * 初始化：加载保存的主题或自动检测
 * @param {string} defaultThemeId - 默认主题
 */
export async function initTheme(defaultThemeId = "fluent-light") {
  // 注册内置主题
  registerTheme(lightTheme);
  registerTheme(darkTheme);

  // 读取保存的偏好
  const saved = localStorage.getItem("revel-theme");
  const savedThemeMode = localStorage.getItem("revel-theme-mode") || "manual";

  if (savedThemeMode === "system") {
    // 跟随系统模式：加载对应深浅色的主题
    await loadSystemTheme(defaultThemeId);
    startSystemThemeListener(defaultThemeId);
  } else if (saved && registry.has(saved)) {
    await loadTheme(saved, { save: false });
  } else {
    await loadTheme(defaultThemeId, { save: false });
  }

  // 加载保存的强调色
  const savedAccent = localStorage.getItem("revel-accent-color");
  if (savedAccent) {
    await setAccentColor(savedAccent);
  }
}

/**
 * 自动检测并加载系统主题
 */
export async function loadSystemTheme(_fallbackId = "fluent-light") {
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const themeId = isDark ? "fluent-dark" : "fluent-light";
  await loadTheme(themeId, { save: false });
  return themeId;
}

/**
 * 开始监听系统主题变化
 */
export function startSystemThemeListener(_fallbackId = "fluent-light") {
  if (systemThemeListener) return; // 已监听

  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  systemThemeListener = (e) => {
    const themeId = e.matches ? "fluent-dark" : "fluent-light";
    loadTheme(themeId, { save: false });
  };
  mql.addEventListener("change", systemThemeListener);
}

/**
 * 停止监听系统主题变化
 */
export function stopSystemThemeListener() {
  if (systemThemeListener) {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.removeEventListener("change", systemThemeListener);
    systemThemeListener = null;
  }
}

/**
 * 设置主题模式
 * @param {string} mode - 'manual' | 'system'
 */
export async function setThemeMode(mode, defaultThemeId = "fluent-light") {
  localStorage.setItem("revel-theme-mode", mode);

  if (mode === "system") {
    startSystemThemeListener(defaultThemeId);
    return loadSystemTheme(defaultThemeId);
  } else {
    stopSystemThemeListener();
    return true;
  }
}

/**
 * 获取当前主题模式
 * @returns {string} 'manual' | 'system'
 */
export function getThemeMode() {
  return localStorage.getItem("revel-theme-mode") || "manual";
}

// === 导出便捷函数 ===

/**
 * 切换主题（浅色/深色）
 * @returns {string} 切换后的主题 ID
 */
export async function toggleTheme() {
  const nextId = currentThemeId === "fluent-dark" ? "fluent-light" : "fluent-dark";
  await loadTheme(nextId);
  return nextId;
}

/**
 * 判断当前是否为深色主题
 * @returns {boolean}
 */
export function isDarkTheme() {
  const theme = registry.get(currentThemeId);
  return theme ? theme.isDark : false;
}
