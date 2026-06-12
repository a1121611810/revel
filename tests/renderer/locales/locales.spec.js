import { describe, it, expect, beforeEach } from "vitest";
import { initI18n, setLocale, getLocale, resolveLocale } from "@/locales";

describe("i18n Engine", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("resolveLocale", () => {
    it("maps zh-CN to zh-CN", () => {
      expect(resolveLocale("zh-CN")).toBe("zh-CN");
    });
    it("maps zh-TW to zh-CN", () => {
      expect(resolveLocale("zh-TW")).toBe("zh-CN");
    });
    it("maps zh-HK to zh-CN", () => {
      expect(resolveLocale("zh-HK")).toBe("zh-CN");
    });
    it("maps en-US to en-US", () => {
      expect(resolveLocale("en-US")).toBe("en-US");
    });
    it("maps ja-JP to en-US (fallback)", () => {
      expect(resolveLocale("ja-JP")).toBe("en-US");
    });
    it("maps empty string to en-US", () => {
      expect(resolveLocale("")).toBe("en-US");
    });
  });

  describe("initI18n", () => {
    it("defaults to en-US when no preference saved", () => {
      const i18n = initI18n("en-US");
      expect(getLocale(i18n)).toBe("en-US");
    });
    it("uses zh-CN when saved preference exists", () => {
      localStorage.setItem("revel-language", "zh-CN");
      const i18n = initI18n();
      expect(getLocale(i18n)).toBe("zh-CN");
    });
  });

  describe("setLocale", () => {
    it("persists locale to localStorage", () => {
      const i18n = initI18n("en-US");
      setLocale(i18n, "zh-CN");
      expect(localStorage.getItem("revel-language")).toBe("zh-CN");
    });
    it("updates html lang attribute", () => {
      const i18n = initI18n("en-US");
      setLocale(i18n, "zh-CN");
      expect(document.documentElement.getAttribute("lang")).toBe("zh-CN");
    });
    it("returns false for unsupported locale", () => {
      const i18n = initI18n("en-US");
      expect(setLocale(i18n, "ja-JP")).toBe(false);
    });
    it("returns true for supported locale", () => {
      const i18n = initI18n("en-US");
      expect(setLocale(i18n, "zh-CN")).toBe(true);
    });
  });
});
