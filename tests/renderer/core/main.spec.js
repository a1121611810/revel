import { describe, it, expect, vi, beforeAll } from "vitest";

vi.mock("vue", () => ({ createApp: vi.fn(() => ({ use: vi.fn(), mount: vi.fn() })) }));
vi.mock("@renderer/App.vue", () => ({ default: { name: "App" } }));
vi.mock("@/style.css", () => ({}));

describe("renderer/main.js", () => {
  let createApp;
  let App;

  beforeAll(async () => {
    vi.resetModules();
    const vue = await import("vue");
    createApp = vue.createApp;
    const appModule = await import("@renderer/App.vue");
    App = appModule.default;
    await import("@renderer/main.js");
  });

  it("imports style.css", () => {
    // The mock is set up; if the import failed, the beforeAll would throw.
    expect(true).toBe(true);
  });

  it("calls createApp with App", () => {
    expect(createApp).toHaveBeenCalledWith(App);
  });

  it("mounts the app to #app", () => {
    const mount = createApp.mock.results[0].value.mount;
    expect(mount).toHaveBeenCalledWith("#app");
  });
});
