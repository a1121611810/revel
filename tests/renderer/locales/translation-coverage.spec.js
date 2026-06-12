import { describe, it, expect } from "vitest";
import zhCN from "@/locales/zh-CN.json";
import enUS from "@/locales/en-US.json";

describe("Translation Coverage", () => {
  it("zh-CN and en-US should have the exact same keys", () => {
    const zhKeys = Object.keys(zhCN).sort();
    const enKeys = Object.keys(enUS).sort();
    expect(zhKeys).toEqual(enKeys);
  });

  it("no translation value should be empty", () => {
    const allValues = [...Object.values(zhCN), ...Object.values(enUS)];
    for (const value of allValues) {
      expect(value).not.toBe("");
      expect(value).not.toBeUndefined();
      expect(typeof value).toBe("string");
    }
  });

  it("no translation value should contain untrimmed whitespace", () => {
    const allValues = [...Object.values(zhCN), ...Object.values(enUS)];
    for (const value of allValues) {
      expect(value).toBe(value.trim());
    }
  });
});
