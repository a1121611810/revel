import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import UninstallView from "@/views/UninstallView.vue";

const mockMole = vi.hoisted(() => {
  const { ref } = require("vue");
  return {
    loading: ref(false),
    error: ref(""),
    execSudo: vi.fn(() => Promise.resolve({ stdout: "", stderr: "", code: 0, success: true })),
    listApps: vi.fn(() => Promise.resolve([])),
    listenOutput: vi.fn(),
    removeOutputListener: vi.fn(),
    parseSize: (sizeStr) => {
      if (!sizeStr) return 0;
      const units = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
      const match = sizeStr.toString().match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)$/i);
      if (!match) return 0;
      return parseFloat(match[1]) * (units[match[2].toUpperCase()] || 1);
    },
  };
});

vi.mock("@/composables/useMole.js", () => ({
  useMole: vi.fn(() => mockMole),
}));

describe("UninstallView 组件", () => {
  describe("初始渲染", () => {
    it('应显示标题"卸载"和副标题', () => {
      const wrapper = mount(UninstallView);
      expect(wrapper.find("h1.page-title").text()).toBe("卸载");
      expect(wrapper.find("p.page-subtitle").text()).toBe("卸载应用及其关联文件");
    });

    it('应显示搜索框且 placeholder 为"搜索应用..."', () => {
      const wrapper = mount(UninstallView);
      const searchInput = wrapper.find("input.input-with-icon");
      expect(searchInput.exists()).toBe(true);
      expect(searchInput.attributes("placeholder")).toBe("搜索应用...");
    });

    it('应显示"刷新"按钮', () => {
      const wrapper = mount(UninstallView);
      const button = wrapper.find("button.btn-outline");
      expect(button.text()).toContain("刷新");
    });

    it("初始应显示空状态提示", () => {
      const wrapper = mount(UninstallView);
      expect(wrapper.find(".empty-card").exists()).toBe(true);
      expect(wrapper.text()).toContain("刷新");
    });

    it("初始不应渲染应用列表", () => {
      const wrapper = mount(UninstallView);
      expect(wrapper.findAll(".app-item").length).toBe(0);
    });
  });

  describe("搜索过滤功能", () => {
    it("搜索输入框应能输入内容", async () => {
      const wrapper = mount(UninstallView);
      const searchInput = wrapper.find("input.input-with-icon");
      await searchInput.setValue("test");
      await flushPromises();
      expect(searchInput.element.value).toBe("test");
    });
  });

  describe("按钮交互", () => {
    it('点击"刷新"按钮不应抛出异常', async () => {
      const wrapper = mount(UninstallView);
      const btn = wrapper.find("button.btn-outline");
      await expect(btn.trigger("click")).resolves.not.toThrow();
    });
  });

  describe("深度交互测试", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockMole.loading.value = false;
      mockMole.error.value = "";
      mockMole.listApps.mockResolvedValue([]);
      mockMole.execSudo.mockResolvedValue({ stdout: "", stderr: "", code: 0, success: true });
      vi.stubGlobal(
        "confirm",
        vi.fn(() => true),
      );
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("点击刷新按钮时调用 listApps()", async () => {
      const wrapper = mount(UninstallView);
      await flushPromises();

      mockMole.listApps.mockClear();
      const btn = wrapper.findAll("button").find((b) => b.text().includes("刷新"));
      await btn.trigger("click");
      await flushPromises();

      expect(mockMole.listApps).toHaveBeenCalledTimes(1);
    });

    it("解析输出并渲染应用列表（名称、版本、大小）", async () => {
      const apps = [
        {
          id: 1,
          name: "AppOne",
          version: "com.example.one",
          path: "/Applications/AppOne.app",
          size: "120 MB",
        },
        {
          id: 2,
          name: "AppTwo",
          version: "com.example.two",
          path: "/Applications/AppTwo.app",
          size: "80 MB",
        },
      ];
      mockMole.listApps.mockResolvedValue(apps);

      const wrapper = mount(UninstallView);
      await flushPromises();

      const items = wrapper.findAll(".app-item");
      expect(items.length).toBe(2);
      expect(items[0].text()).toContain("AppOne");
      expect(items[0].text()).toContain("com.example.one");
      expect(items[0].text()).toContain("120 MB");
      expect(items[1].text()).toContain("AppTwo");
      expect(items[1].text()).toContain("com.example.two");
      expect(items[1].text()).toContain("80 MB");
    });

    it("搜索输入框按名称过滤应用列表", async () => {
      const apps = [
        {
          id: 1,
          name: "Chrome",
          version: "com.google.chrome",
          path: "/Applications/Chrome.app",
          size: "120 MB",
        },
        {
          id: 2,
          name: "Firefox",
          version: "org.mozilla.firefox",
          path: "/Applications/Firefox.app",
          size: "80 MB",
        },
      ];
      mockMole.listApps.mockResolvedValue(apps);

      const wrapper = mount(UninstallView);
      await flushPromises();

      const searchInput = wrapper.find("input.input-with-icon");
      await searchInput.setValue("Chrome");
      await flushPromises();

      const items = wrapper.findAll(".app-item");
      expect(items.length).toBe(1);
      expect(items[0].text()).toContain("Chrome");
      expect(items[0].text()).not.toContain("Firefox");
    });

    it("点击排序表头可按大小升序/降序排列应用列表", async () => {
      const apps = [
        { id: 1, name: "SmallApp", version: "v1", path: "/Applications/Small.app", size: "10 MB" },
        { id: 2, name: "LargeApp", version: "v2", path: "/Applications/Large.app", size: "1 GB" },
      ];
      mockMole.listApps.mockResolvedValue(apps);

      const wrapper = mount(UninstallView);
      await flushPromises();

      const sizeHeader = wrapper
        .findAll(".app-col-size.sortable")
        .find((h) => h.text().includes("大小"));

      // Default sort by name ascending
      let items = wrapper.findAll(".app-item");
      expect(items[0].text()).toContain("LargeApp");

      // Click size column to sort by size ascending
      await sizeHeader.trigger("click");
      await flushPromises();

      items = wrapper.findAll(".app-item");
      expect(items[0].text()).toContain("SmallApp");
      expect(items[1].text()).toContain("LargeApp");

      // Click again to sort descending
      await sizeHeader.trigger("click");
      await flushPromises();

      items = wrapper.findAll(".app-item");
      expect(items[0].text()).toContain("LargeApp");
      expect(items[1].text()).toContain("SmallApp");
    });

    it("点击卸载按钮时调用 execSudo 并传入应用名称", async () => {
      const apps = [
        {
          id: 1,
          name: "TestApp",
          version: "com.test",
          path: "/Applications/TestApp.app",
          size: "50 MB",
        },
      ];
      mockMole.listApps.mockResolvedValue(apps);

      const wrapper = mount(UninstallView);
      await flushPromises();

      const uninstallBtn = wrapper.find(".app-item .btn-small");
      await uninstallBtn.trigger("click");
      await flushPromises();

      expect(window.confirm).toHaveBeenCalledWith("确定要卸载 TestApp 吗？");
      expect(mockMole.execSudo).toHaveBeenCalledTimes(1);
      expect(mockMole.execSudo).toHaveBeenCalledWith('uninstall "TestApp"');
    });

    it("卸载成功后从列表中移除该应用", async () => {
      const apps = [
        { id: 1, name: "AppA", version: "v1", path: "/Applications/A.app", size: "50 MB" },
        { id: 2, name: "AppB", version: "v2", path: "/Applications/B.app", size: "60 MB" },
      ];
      mockMole.listApps.mockResolvedValue(apps);

      const wrapper = mount(UninstallView);
      await flushPromises();

      expect(wrapper.findAll(".app-item").length).toBe(2);

      const uninstallBtn = wrapper.findAll(".app-item .btn-small")[0];
      await uninstallBtn.trigger("click");
      await flushPromises();

      const items = wrapper.findAll(".app-item");
      expect(items.length).toBe(1);
      expect(items[0].text()).toContain("AppB");
    });

    it("卸载失败时显示错误信息", async () => {
      const apps = [
        { id: 1, name: "BadApp", version: "v1", path: "/Applications/Bad.app", size: "50 MB" },
      ];
      mockMole.listApps.mockResolvedValue(apps);
      mockMole.execSudo.mockRejectedValue(new Error("uninstall failed"));
      mockMole.error.value = "卸载失败：权限不足";

      const wrapper = mount(UninstallView);
      await flushPromises();

      const uninstallBtn = wrapper.find(".app-item .btn-small");
      await uninstallBtn.trigger("click");
      await flushPromises();

      expect(wrapper.find(".error-card").exists()).toBe(true);
      expect(wrapper.text()).toContain("卸载失败：权限不足");
    });

    it("应用列表为空时显示空状态提示", async () => {
      mockMole.listApps.mockResolvedValue([]);

      const wrapper = mount(UninstallView);
      await flushPromises();

      expect(wrapper.find(".empty-card").exists()).toBe(true);
      expect(wrapper.text()).toContain("点击「刷新」获取已安装应用列表");
    });

    it("搜索无结果时显示未找到匹配的提示", async () => {
      const apps = [
        { id: 1, name: "AppA", version: "v1", path: "/Applications/A.app", size: "50 MB" },
      ];
      mockMole.listApps.mockResolvedValue(apps);

      const wrapper = mount(UninstallView);
      await flushPromises();

      const searchInput = wrapper.find("input.input-with-icon");
      await searchInput.setValue("NonExistent");
      await flushPromises();

      expect(wrapper.find(".app-empty").exists()).toBe(true);
      expect(wrapper.text()).toContain("未找到匹配的应用");
    });
  });
});
