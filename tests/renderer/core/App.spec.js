import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import App from "@renderer/App.vue";

// Mock modules — paths are relative to the test file, matching App.vue's imports
vi.mock("@/themes", () => ({
  initTheme: vi.fn(),
}));

vi.mock("@/composables/useMole.js", () => ({
  useMole: vi.fn(() => ({
    submitPassword: vi.fn(),
    cancelPassword: vi.fn(),
  })),
}));

import { initTheme } from "@/themes";
import { useMole } from "@/composables/useMole.js";

vi.mock("@/views/WelcomeView.vue", () => ({
  default: {
    name: "WelcomeView",
    template: `<div data-testid="welcome-view"><button @click="$emit('start')">Start</button></div>`,
  },
}));

vi.mock("@/components/SideBar.vue", () => ({
  default: {
    name: "SideBar",
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: `<div data-testid="sidebar"><span class="model-value">{{ modelValue }}</span></div>`,
  },
}));

vi.mock("@/components/PasswordDialog.vue", () => ({
  default: {
    name: "PasswordDialog",
    template: `<div data-testid="password-dialog"></div>`,
  },
}));

vi.mock("@/views/CleanView.vue", () => ({
  default: { name: "CleanView", template: `<div data-testid="clean-view"></div>` },
}));
vi.mock("@/views/AnalyzeView.vue", () => ({
  default: { name: "AnalyzeView", template: `<div data-testid="analyze-view"></div>` },
}));
vi.mock("@/views/StatusView.vue", () => ({
  default: { name: "StatusView", template: `<div data-testid="status-view"></div>` },
}));
vi.mock("@/views/UninstallView.vue", () => ({
  default: { name: "UninstallView", template: `<div data-testid="uninstall-view"></div>` },
}));
vi.mock("@/views/OptimizeView.vue", () => ({
  default: { name: "OptimizeView", template: `<div data-testid="optimize-view"></div>` },
}));
vi.mock("@/views/PurgeView.vue", () => ({
  default: { name: "PurgeView", template: `<div data-testid="purge-view"></div>` },
}));
vi.mock("@/views/InstallerView.vue", () => ({
  default: { name: "InstallerView", template: `<div data-testid="installer-view"></div>` },
}));
vi.mock("@/views/SettingsView.vue", () => ({
  default: { name: "SettingsView", template: `<div data-testid="settings-view"></div>` },
}));

describe("App.vue", () => {
  let submitPasswordMock;
  let cancelPasswordMock;

  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });

    submitPasswordMock = vi.fn();
    cancelPasswordMock = vi.fn();
    useMole.mockReturnValue({
      submitPassword: submitPasswordMock,
      cancelPassword: cancelPasswordMock,
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("welcome flow", () => {
    it("renders WelcomeView when localStorage has NO revel-welcomed", () => {
      localStorage.getItem.mockReturnValue(null);
      const wrapper = mount(App);
      expect(wrapper.find('[data-testid="welcome-view"]').exists()).toBe(true);
      expect(wrapper.find(".app-layout").exists()).toBe(false);
    });

    it("hides WelcomeView and shows app-layout when WelcomeView emits @start", async () => {
      localStorage.getItem.mockReturnValue(null);
      const wrapper = mount(App);
      expect(wrapper.find('[data-testid="welcome-view"]').exists()).toBe(true);

      const welcomeView = wrapper.findComponent({ name: "WelcomeView" });
      await welcomeView.vm.$emit("start");
      await flushPromises();

      expect(wrapper.find('[data-testid="welcome-view"]').exists()).toBe(false);
      expect(wrapper.find(".app-layout").exists()).toBe(true);
    });

    it("shows app-layout directly when localStorage HAS revel-welcomed", () => {
      localStorage.getItem.mockReturnValue("true");
      const wrapper = mount(App);
      expect(wrapper.find('[data-testid="welcome-view"]').exists()).toBe(false);
      expect(wrapper.find(".app-layout").exists()).toBe(true);
    });
  });

  describe("navigation", () => {
    it("initial currentView is clean and SideBar v-model binding works", async () => {
      localStorage.getItem.mockReturnValue("true");
      const wrapper = mount(App);
      const sidebar = wrapper.findComponent({ name: "SideBar" });

      expect(sidebar.props("modelValue")).toBe("clean");

      await sidebar.vm.$emit("update:modelValue", "analyze");
      await flushPromises();

      expect(sidebar.props("modelValue")).toBe("analyze");
      expect(wrapper.find('[data-testid="analyze-view"]').exists()).toBe(true);
    });

    it("navigates to analyze view", async () => {
      localStorage.getItem.mockReturnValue("true");
      const wrapper = mount(App);
      const sidebar = wrapper.findComponent({ name: "SideBar" });

      await sidebar.vm.$emit("update:modelValue", "analyze");
      await flushPromises();

      expect(wrapper.find('[data-testid="analyze-view"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="clean-view"]').exists()).toBe(false);
    });

    it("navigates to status view", async () => {
      localStorage.getItem.mockReturnValue("true");
      const wrapper = mount(App);
      const sidebar = wrapper.findComponent({ name: "SideBar" });

      await sidebar.vm.$emit("update:modelValue", "status");
      await flushPromises();

      expect(wrapper.find('[data-testid="status-view"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="clean-view"]').exists()).toBe(false);
    });

    it("navigates to settings view", async () => {
      localStorage.getItem.mockReturnValue("true");
      const wrapper = mount(App);
      const sidebar = wrapper.findComponent({ name: "SideBar" });

      await sidebar.vm.$emit("update:modelValue", "settings");
      await flushPromises();

      expect(wrapper.find('[data-testid="settings-view"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="clean-view"]').exists()).toBe(false);
    });
  });

  describe("lifecycle", () => {
    it("calls initTheme with fluent-light on mount", () => {
      localStorage.getItem.mockReturnValue("true");
      mount(App);
      expect(initTheme).toHaveBeenCalledWith("fluent-light");
    });
  });
});
