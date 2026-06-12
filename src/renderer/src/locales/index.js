import { createI18n } from "vue-i18n";
import zhCN from "./zh-CN.json";
import enUS from "./en-US.json";

const STORAGE_KEY = "revel-language";

const messages = {
  "zh-CN": zhCN,
  "en-US": enUS,
};

function resolveLocale(systemLocale) {
  const normalized = (systemLocale || "").toLowerCase().replace(/_/g, "-");
  if (normalized.startsWith("zh")) return "zh-CN";
  return "en-US";
}

function getInitialLocale() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && messages[saved]) return saved;
  return resolveLocale(navigator.language);
}

export function initI18n(locale) {
  const initial = locale || getInitialLocale();
  const i18n = createI18n({
    locale: initial,
    fallbackLocale: "en-US",
    messages,
    legacy: false,
    globalInjection: true,
  });
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("lang", initial === "zh-CN" ? "zh-CN" : "en");
  }
  // Sync initial locale to main process for popup i18n
  if (typeof window !== "undefined" && window.electronAPI && window.electronAPI.setAppLocale) {
    window.electronAPI.setAppLocale(initial).catch(function () {});
  }
  return i18n;
}

export function setLocale(i18n, locale) {
  if (!messages[locale]) return false;
  i18n.global.locale.value = locale;
  localStorage.setItem(STORAGE_KEY, locale);
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("lang", locale === "zh-CN" ? "zh-CN" : "en");
  }
  // Sync to main process for popup i18n
  if (window.electronAPI && window.electronAPI.setAppLocale) {
    window.electronAPI.setAppLocale(locale).catch(function () {});
  }
  return true;
}

export function getLocale(i18n) {
  return i18n.global.locale.value;
}

/**
 * 异步检测系统语言并应用（仅在用户未手动设置时）
 * @param {import('vue-i18n').I18n} i18n
 */
export async function detectSystemLocale(i18n) {
  if (localStorage.getItem(STORAGE_KEY)) return;
  if (typeof window === "undefined" || !window.electronAPI || !window.electronAPI.getLocale) {
    return;
  }
  try {
    const systemLocale = await window.electronAPI.getLocale();
    const resolved = resolveLocale(systemLocale);
    if (resolved !== i18n.global.locale.value) {
      setLocale(i18n, resolved);
    }
  } catch {
    // ignore
  }
}

export { messages, resolveLocale };
