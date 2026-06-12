/**
 * Theme System - 主题系统入口
 *
 * 使用方式：
 *   import { loadTheme, getThemeList, initTheme, toggleTheme } from '@/themes'
 *
 * Theme JSON 格式见 fluent-light.json（Schema 参考）
 */

export {
  // 核心引擎
  initTheme,
  loadTheme,
  getCurrentTheme,
  getThemeList,
  getTheme,
  registerTheme,
  toggleTheme,
  isDarkTheme,
  setAccentColor,

  // 系统主题跟随
  loadSystemTheme,
  setThemeMode,
  getThemeMode,
  startSystemThemeListener,
  stopSystemThemeListener,
} from "./engine.js";
