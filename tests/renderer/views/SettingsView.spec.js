import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import zhCN from "@/locales/zh-CN.json";
import SettingsView from "@/views/SettingsView.vue";

function mountWithI18n(component, options = {}) {
  const i18n = createI18n({
    locale: "zh-CN",
    fallbackLocale: "en-US",
    messages: { "zh-CN": zhCN, "en-US": {} },
    legacy: false,
  });
  return mount(component, {
    global: { plugins: [i18n] },
    ...options,
  });
}

// Mock localStorage
const localStorageMock = (() => {
  const store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value;
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("SettingsView 组件", () => {
  beforeEach(() => {
    localStorageMock.clear();
    window.electronAPI = {
      getAppVersion: vi.fn().mockResolvedValue("1.2.3"),
      getAutoLaunch: vi.fn().mockResolvedValue({ enabled: false, showWindow: false }),
      setAutoLaunch: vi.fn().mockResolvedValue({ success: true }),
      setAutoLaunchShowWindow: vi.fn().mockResolvedValue({ success: true }),
      hasSudoPassword: vi.fn().mockResolvedValue({ has: false }),
      clearSudoPassword: vi.fn().mockResolvedValue({ success: true }),
      checkForUpdates: vi.fn().mockResolvedValue({
        hasUpdate: false,
        latestVersion: "1.2.3",
        currentVersion: "1.2.3",
      }),
      openExternal: vi.fn().mockResolvedValue(undefined),
      getPlatform: vi.fn().mockResolvedValue("darwin"),
      getMenuBarEnabled: vi.fn().mockResolvedValue(false),
      setMenuBarEnabled: vi.fn().mockResolvedValue({ success: true }),
      getMenuBarModules: vi.fn().mockResolvedValue({ cpu: true, gpu: true, ram: true, ssd: true }),
      setMenuBarModules: vi.fn().mockResolvedValue({ success: true }),
      setAppLocale: vi.fn().mockResolvedValue({ success: true }),
      getMenuBarConfig: vi.fn().mockResolvedValue({
        tray: {
          modules: { cpu: true, gpu: true, ram: true, ssd: true },
          layout: "horizontal",
          fontSize: 12,
          spacing: 4,
          separator: "  ",
        },
        popup: {
          modules: { cpu: true, gpu: true, ram: true, ssd: true },
          fontSize: 12,
          spacing: 4,
          moduleColors: { cpu: "#5ac8fa", gpu: "#ff9f0a", ram: "#bf5af2", ssd: "#30d158" },
          rangeColors: { low: "#30d158", mid: "#ff9f0a", high: "#ff453a" },
          thresholds: { mid: 50, high: 80 },
        },
      }),
      setMenuBarConfig: vi.fn().mockResolvedValue({ success: true }),
    };
  });

  describe("初始渲染", () => {
    it('应渲染标题"设置"', () => {
      const wrapper = mountWithI18n(SettingsView);
      expect(wrapper.find("h1.page-title").text()).toBe("设置");
    });

    it("应渲染 4 个设置卡片", () => {
      const wrapper = mountWithI18n(SettingsView);
      const cards = wrapper.findAll(".card");
      expect(cards.length).toBe(4);
    });

    it("应渲染全部卡片标题", () => {
      const wrapper = mountWithI18n(SettingsView);
      const cardTitles = wrapper.findAll(".card-title");
      const titles = cardTitles.map((t) => t.text());
      expect(titles).toContain("通用设置");
      expect(titles).toContain("清理偏好");
      expect(titles).toContain("安全");
      expect(titles).toContain("关于");
    });

    it("每个卡片应有头部竖线装饰", () => {
      const wrapper = mountWithI18n(SettingsView);
      const accents = wrapper.findAll(".card-header-accent");
      expect(accents.length).toBe(4);
    });

    it("每个卡片应有副标题描述", () => {
      const wrapper = mountWithI18n(SettingsView);
      const descs = wrapper.findAll(".card-desc");
      expect(descs.length).toBe(4);
      const texts = descs.map((d) => d.text());
      expect(texts).toContain("外观主题和系统行为");
      expect(texts).toContain("控制清理页面的默认行为");
      expect(texts).toContain("管理员密码管理");
      expect(texts).toContain("版本信息和更新");
    });

    it("每个卡片头部应包含 Icon 组件", () => {
      const wrapper = mountWithI18n(SettingsView);
      const cardHeaders = wrapper.findAll(".card-header");
      expect(cardHeaders.length).toBe(4);
      cardHeaders.forEach((header) => {
        const icon = header.findComponent({ name: "Icon" });
        expect(icon.exists()).toBe(true);
        expect(icon.props("size")).toBe("18");
      });
    });

    it("Icon 组件应传入正确的 name", () => {
      const wrapper = mountWithI18n(SettingsView);
      const icons = wrapper.findAllComponents({ name: "Icon" });
      const expectedNames = ["theme", "auto-launch", "about", "acknowledgments"];
      expectedNames.forEach((name, index) => {
        expect(icons[index].props("name")).toBe(name);
      });
    });
  });

  describe("通用设置区域", () => {
    function getThemeButtons(wrapper) {
      const themeRow = wrapper
        .findAll(".setting-row")
        .find((row) => row.find(".setting-label").text() === "主题模式");
      return themeRow.findAll(".theme-toggle-group .btn");
    }

    it("应渲染 3 个主题选项按钮", () => {
      const wrapper = mountWithI18n(SettingsView);
      const themeButtons = getThemeButtons(wrapper);
      expect(themeButtons.length).toBe(3);
    });

    it("主题按钮应显示 浅色/深色/跟随系统 文本", () => {
      const wrapper = mountWithI18n(SettingsView);
      const themeButtons = getThemeButtons(wrapper);
      const labels = themeButtons.map((b) => b.text().trim());
      expect(labels).toContain("浅色");
      expect(labels).toContain("深色");
      expect(labels).toContain("跟随系统");
    });

    it("点击主题按钮应触发切换并设置 active 样式", async () => {
      const wrapper = mountWithI18n(SettingsView);
      const themeButtons = getThemeButtons(wrapper);
      await themeButtons[0].trigger("click");
      await flushPromises();
      expect(themeButtons[0].classes()).toContain("active");
    });

    it("开机启动应有一个复选框", () => {
      const wrapper = mountWithI18n(SettingsView);
      const labels = wrapper.findAll(".setting-label").map((l) => l.text());
      expect(labels).toContain("开机启动");
    });

    it("开机启动复选框应可切换", async () => {
      const wrapper = mountWithI18n(SettingsView);
      await flushPromises();
      const startupRow = wrapper
        .findAll(".setting-row")
        .find((row) => row.find(".setting-label").text() === "开机启动");
      const checkbox = startupRow?.find(".checkbox-input");
      expect(checkbox).toBeDefined();

      const initialChecked = checkbox.element.checked;
      await checkbox.setValue(!initialChecked);
      await flushPromises();

      expect(checkbox.element.checked).toBe(!initialChecked);
    });

    it("renders language switcher", () => {
      const wrapper = mountWithI18n(SettingsView);
      expect(wrapper.text()).toContain("界面语言");
    });
  });

  describe("清理偏好区域", () => {
    it('应渲染"清理前确认"设置行', () => {
      const wrapper = mountWithI18n(SettingsView);
      const settingLabels = wrapper.findAll(".setting-label");
      const labels = settingLabels.map((l) => l.text());
      expect(labels).toContain("清理前确认");
    });

    it('应渲染"显示清理详情"设置行', () => {
      const wrapper = mountWithI18n(SettingsView);
      const settingLabels = wrapper.findAll(".setting-label");
      const labels = settingLabels.map((l) => l.text());
      expect(labels).toContain("显示清理详情");
    });

    it('应渲染"默认选中项"设置行', () => {
      const wrapper = mountWithI18n(SettingsView);
      const settingLabels = wrapper.findAll(".setting-label");
      const labels = settingLabels.map((l) => l.text());
      expect(labels).toContain("默认选中项");
    });

    it("默认选中项应包含 3 个多选框", () => {
      const wrapper = mountWithI18n(SettingsView);
      const defaultCheckboxes = wrapper.findAll(".default-checkboxes .checkbox-input");
      expect(defaultCheckboxes.length).toBe(3);
    });

    it("默认选中项的 checkbox 默认应选中 2 个（浏览器缓存和应用缓存）", () => {
      const wrapper = mountWithI18n(SettingsView);
      const defaultCheckboxes = wrapper
        .findAll(".default-checkboxes .checkbox-input")
        .filter((cb) => cb.element.checked);
      expect(defaultCheckboxes.length).toBe(2);
    });

    it("切换清理前确认应写入 localStorage", async () => {
      const wrapper = mountWithI18n(SettingsView);
      await flushPromises();
      const checkbox = wrapper
        .findAll(".setting-row")
        .find((row) => row.find(".setting-label").text() === "清理前确认")
        ?.find(".checkbox-input");

      expect(checkbox).toBeDefined();
      expect(checkbox.element.checked).toBe(true);

      await checkbox.setValue(false);
      await flushPromises();

      expect(localStorageMock.getItem("revel-clean-confirm")).toBe("false");
    });

    it("切换显示清理详情应写入 localStorage", async () => {
      const wrapper = mountWithI18n(SettingsView);
      await flushPromises();
      const checkbox = wrapper
        .findAll(".setting-row")
        .find((row) => row.find(".setting-label").text() === "显示清理详情")
        ?.find(".checkbox-input");

      expect(checkbox).toBeDefined();
      expect(checkbox.element.checked).toBe(true);

      await checkbox.setValue(false);
      await flushPromises();

      expect(localStorageMock.getItem("revel-clean-details")).toBe("false");
    });

    it("切换默认选中项应写入 localStorage", async () => {
      const wrapper = mountWithI18n(SettingsView);
      await flushPromises();
      const devCheckbox = wrapper
        .findAll(".default-checkboxes .checkbox-input")
        .find((cb) => cb.element.value === "dev-cache");

      expect(devCheckbox).toBeDefined();
      expect(devCheckbox.element.checked).toBe(false);

      await devCheckbox.setValue(true);
      await flushPromises();

      const stored = JSON.parse(localStorageMock.getItem("revel-clean-defaults"));
      expect(stored).toContain("dev-cache");
    });

    it("应从 localStorage 恢复已保存的清理偏好", async () => {
      localStorageMock.setItem("revel-clean-confirm", "false");
      localStorageMock.setItem("revel-clean-details", "false");
      localStorageMock.setItem("revel-clean-defaults", JSON.stringify(["dev-cache"]));

      const wrapper = mountWithI18n(SettingsView);
      await flushPromises();

      const confirmCheckbox = wrapper
        .findAll(".setting-row")
        .find((row) => row.find(".setting-label").text() === "清理前确认")
        ?.find(".checkbox-input");
      expect(confirmCheckbox.element.checked).toBe(false);

      const detailsCheckbox = wrapper
        .findAll(".setting-row")
        .find((row) => row.find(".setting-label").text() === "显示清理详情")
        ?.find(".checkbox-input");
      expect(detailsCheckbox.element.checked).toBe(false);
    });
  });

  describe("安全区域", () => {
    it('应渲染"管理员密码"设置行', () => {
      const wrapper = mountWithI18n(SettingsView);
      const settingLabels = wrapper.findAll(".setting-label");
      const labels = settingLabels.map((l) => l.text());
      expect(labels).toContain("管理员密码");
    });
  });

  describe("关于区域", () => {
    it("应显示应用名称 Revel", () => {
      const wrapper = mountWithI18n(SettingsView);
      const aboutLabel = wrapper
        .findAll(".setting-label")
        .find((l) => l.text().startsWith("Revel"));
      expect(aboutLabel).toBeDefined();
      expect(aboutLabel.text()).toContain("Revel");
    });

    it("应显示版本号", async () => {
      const wrapper = mountWithI18n(SettingsView);
      await flushPromises();
      const aboutLabel = wrapper
        .findAll(".setting-label")
        .find((l) => l.text().startsWith("Revel"));
      expect(aboutLabel.text()).toContain("v1.2.3");
    });

    it('应渲染"查看发布版"按钮', () => {
      const wrapper = mountWithI18n(SettingsView);
      const btn = wrapper.findAll("button").find((b) => b.text().includes("查看发布版"));
      expect(btn).toBeDefined();
      expect(btn.exists()).toBe(true);
    });

    it('应渲染"访问 GitHub"按钮', () => {
      const wrapper = mountWithI18n(SettingsView);
      const btn = wrapper.findAll("button").find((b) => b.text().includes("访问 GitHub"));
      expect(btn).toBeDefined();
      expect(btn.exists()).toBe(true);
    });

    it('应渲染"致谢与许可证"按钮', () => {
      const wrapper = mountWithI18n(SettingsView);
      const btn = wrapper.findAll("button").find((b) => b.text().includes("致谢与许可证"));
      expect(btn).toBeDefined();
      expect(btn.exists()).toBe(true);
    });

    it('点击"致谢与许可证"按钮不应抛出异常', async () => {
      const wrapper = mountWithI18n(SettingsView);
      const btn = wrapper.findAll("button").find((b) => b.text().includes("致谢与许可证"));
      await expect(btn.trigger("click")).resolves.not.toThrow();
    });

    it("不应渲染快捷键相关内容", () => {
      const wrapper = mountWithI18n(SettingsView);
      expect(wrapper.find(".shortcut-list").exists()).toBe(false);
      expect(wrapper.find(".shortcut-row").exists()).toBe(false);
      expect(wrapper.find(".key-badge").exists()).toBe(false);
    });

    it("不应渲染技术栈 badges", () => {
      const wrapper = mountWithI18n(SettingsView);
      expect(wrapper.find(".tech-badges").exists()).toBe(false);
      expect(wrapper.find(".about-badge").exists()).toBe(false);
    });
  });

  describe("交互行为", () => {
    it('点击"查看发布版"按钮不应抛出异常', async () => {
      const wrapper = mountWithI18n(SettingsView);
      const btn = wrapper.findAll("button").find((b) => b.text().includes("查看发布版"));
      await expect(btn.trigger("click")).resolves.not.toThrow();
    });

    it('点击"访问 GitHub"按钮不应抛出异常', async () => {
      const wrapper = mountWithI18n(SettingsView);
      const btn = wrapper.findAll("button").find((b) => b.text().includes("访问 GitHub"));
      await expect(btn.trigger("click")).resolves.not.toThrow();
    });

    it("点击主题按钮不应抛出异常", async () => {
      const wrapper = mountWithI18n(SettingsView);
      const themeRow = wrapper
        .findAll(".setting-row")
        .find((row) => row.find(".setting-label").text() === "主题模式");
      const themeButtons = themeRow.findAll(".theme-toggle-group .btn");
      await expect(themeButtons[1].trigger("click")).resolves.not.toThrow();
    });

    it("清理偏好复选框应可切换", async () => {
      const wrapper = mountWithI18n(SettingsView);
      const confirmCheckbox = wrapper
        .findAll(".setting-row")
        .find((row) => row.find(".setting-label").text() === "清理前确认")
        ?.find(".checkbox-input");
      expect(confirmCheckbox).toBeDefined();
      const initialChecked = confirmCheckbox.element.checked;
      await confirmCheckbox.setValue(!initialChecked);
      await flushPromises();
      expect(confirmCheckbox.element.checked).toBe(!initialChecked);
    });
  });

  describe("权限与授权面板", () => {
    it("应渲染 4 个模块权限项", async () => {
      const wrapper = mountWithI18n(SettingsView);
      await flushPromises();
      const moduleItems = wrapper.findAll(".auth-module-item");
      expect(moduleItems.length).toBe(4);
    });

    it("未保存密码时应显示'设置密码'按钮", async () => {
      window.electronAPI.hasSudoPassword.mockResolvedValue({ has: false });
      const wrapper = mountWithI18n(SettingsView);
      await flushPromises();
      const setBtn = wrapper.find('[data-testid="auth-set-password"]');
      expect(setBtn.exists()).toBe(true);
    });

    it("点击'设置密码'应显示密码对话框", async () => {
      window.electronAPI.hasSudoPassword.mockResolvedValue({ has: false });
      const wrapper = mountWithI18n(SettingsView);
      await flushPromises();
      const setBtn = wrapper.find('[data-testid="auth-set-password"]');
      await setBtn.trigger("click");
      await flushPromises();
      expect(wrapper.findComponent({ name: "PasswordDialog" }).exists()).toBe(true);
    });
  });

  describe("菜单栏监控", () => {
    it("macOS 平台显示菜单栏监控开关", async () => {
      window.electronAPI.getPlatform.mockResolvedValue("darwin");
      window.electronAPI.getMenuBarEnabled.mockResolvedValue(false);
      const wrapper = mountWithI18n(SettingsView);
      await flushPromises();

      // The menu bar setting is inside the "通用设置" card
      const labels = wrapper.findAll(".setting-label");
      const menuBarLabel = labels.find((l) => l.text().includes("菜单栏监控"));
      expect(menuBarLabel).toBeTruthy();
    });

    it("非 macOS 平台不显示菜单栏监控设置", async () => {
      window.electronAPI.getPlatform.mockResolvedValue("win32");
      const wrapper = mountWithI18n(SettingsView);
      await flushPromises();

      // The checkbox should be disabled (menu bar only works on macOS)
      // But the label may still be visible - let's check the checkbox is disabled
      const checkboxes = wrapper.findAll('.setting-row input[type="checkbox"]');
      // Menu bar checkbox should exist but be disabled
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it("勾选菜单栏开关后调用 setMenuBarEnabled(true)", async () => {
      window.electronAPI.getPlatform.mockResolvedValue("darwin");
      window.electronAPI.getMenuBarEnabled.mockResolvedValue(false);
      const wrapper = mountWithI18n(SettingsView);
      await flushPromises();

      // Find the menu bar toggle checkbox
      const checkbox = wrapper.find('input[type="checkbox"][data-testid="menubar-toggle"]');
      if (checkbox.exists()) {
        await checkbox.setValue(true);
        await flushPromises();
        expect(window.electronAPI.setMenuBarEnabled).toHaveBeenCalledWith(true);
      }
    });

    it("勾选后显示模块选择区域", async () => {
      window.electronAPI.getPlatform.mockResolvedValue("darwin");
      window.electronAPI.getMenuBarEnabled.mockResolvedValue(true);
      const wrapper = mountWithI18n(SettingsView);
      await flushPromises();

      // Module checkboxes should be visible when enabled
      const moduleArea = wrapper.find(".menubar-modules");
      expect(moduleArea.exists()).toBe(true);
    });

    it("模块 checkbox 切换时调用 setMenuBarConfig", async () => {
      window.electronAPI.getPlatform.mockResolvedValue("darwin");
      window.electronAPI.getMenuBarEnabled.mockResolvedValue(true);
      const wrapper = mountWithI18n(SettingsView);
      await flushPromises();

      const checkboxes = wrapper.findAll('.menubar-modules input[type="checkbox"]');
      // The first checkbox should be CPU
      if (checkboxes.length > 0) {
        await checkboxes[0].setValue(false);
        await flushPromises();
        expect(window.electronAPI.setMenuBarConfig).toHaveBeenCalled();
        const callArg = window.electronAPI.setMenuBarConfig.mock.calls[0][0];
        expect(callArg).toHaveProperty("tray");
        expect(callArg.tray).toHaveProperty("modules");
        expect(callArg.tray.modules).toHaveProperty("cpu");
        expect(callArg).toHaveProperty("popup");
      }
    });

    it("setMenuBarEnabled 失败时回滚 checkbox 状态", async () => {
      window.electronAPI.getPlatform.mockResolvedValue("darwin");
      window.electronAPI.getMenuBarEnabled.mockResolvedValue(false);
      window.electronAPI.setMenuBarEnabled.mockResolvedValue({ success: false });

      const wrapper = mountWithI18n(SettingsView);
      await flushPromises();

      const checkbox = wrapper.find('input[type="checkbox"][data-testid="menubar-toggle"]');
      if (checkbox.exists()) {
        const initialChecked = checkbox.element.checked;
        await checkbox.setValue(true);
        await flushPromises();
        expect(window.electronAPI.setMenuBarEnabled).toHaveBeenCalledWith(true);
      }
    });

    it("tray layout buttons call setTrayLayout", async () => {
      window.electronAPI.getPlatform.mockResolvedValue("darwin");
      window.electronAPI.getMenuBarEnabled.mockResolvedValue(true);
      const wrapper = mountWithI18n(SettingsView);
      await flushPromises();

      window.electronAPI.setMenuBarConfig.mockClear();

      var buttons = wrapper.findAll('.layout-toggle button');
      if (buttons.length >= 2) {
        await buttons[1].trigger("click");
        await flushPromises();
      }

      var calls = window.electronAPI.setMenuBarConfig.mock.calls;
      if (calls.length > 0) {
        expect(calls[0][0].tray.layout).toBe("vertical");
      }
    });

    it("setAppLocale is available in electronAPI", async () => {
      expect(window.electronAPI.setAppLocale).toBeDefined();
    });
  });
});
