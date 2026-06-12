import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi } from "vitest";
import InstallerView from "@/views/InstallerView.vue";

const mockMole = vi.hoisted(() => {
  const { ref } = require("vue");
  return {
    loading: ref(false),
    error: ref(""),
    execRaw: vi.fn(() => Promise.resolve({ stdout: "", stderr: "", code: 0, success: true })),
    scanInstallers: vi.fn(() => Promise.resolve([])),
    parseSize: vi.fn((sizeStr) => {
      if (!sizeStr) return 0;
      const match = sizeStr.match(/^(\d[\d.]*)\s*(B|KB|MB|GB|TB)$/i);
      if (!match) return 0;
      const units = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
      return parseFloat(match[1]) * (units[match[2].toUpperCase()] || 1);
    }),
    listenOutput: vi.fn(),
    removeOutputListener: vi.fn(),
  };
});

vi.mock("@/composables/useMole.js", () => ({
  useMole: vi.fn(() => mockMole),
}));

async function mountComponent() {
  const wrapper = mount(InstallerView);
  await flushPromises();
  return wrapper;
}

async function populatePackages(wrapper, items) {
  mockMole.scanInstallers.mockResolvedValueOnce(items);
  await wrapper.find(".btn-outline").trigger("click");
  await flushPromises();
}

describe("InstallerView 初始渲染", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应渲染页面标题"安装包"', async () => {
    const wrapper = await mountComponent();
    expect(wrapper.find(".page-title").text()).toBe("安装包");
  });

  it("应渲染页面副标题", async () => {
    const wrapper = await mountComponent();
    expect(wrapper.find(".page-subtitle").text()).toBe("查找并删除下载的安装包");
  });

  it('应渲染"扫描"按钮', async () => {
    const wrapper = await mountComponent();
    const scanBtn = wrapper.find(".btn-outline");
    expect(scanBtn.exists()).toBe(true);
    expect(scanBtn.text()).toContain("扫描");
  });

  it('应渲染"删除选中项"按钮且初始为禁用状态', async () => {
    const wrapper = await mountComponent();
    const deleteBtn = wrapper.find(".btn-danger-outline");
    expect(deleteBtn.exists()).toBe(true);
    expect(deleteBtn.text()).toContain("删除选中项");
    expect(deleteBtn.attributes("disabled")).toBeDefined();
  });

  it("应渲染搜索框", async () => {
    const wrapper = await mountComponent();
    const searchBox = wrapper.find(".input-with-icon");
    expect(searchBox.exists()).toBe(true);
    expect(searchBox.attributes("placeholder")).toBe("搜索安装包...");
  });

  it("初始状态应显示空状态提示", async () => {
    const wrapper = await mountComponent();
    expect(wrapper.find(".empty-card").exists()).toBe(true);
    expect(wrapper.text()).toContain("扫描");
  });

  it("初始状态不应渲染安装包列表", async () => {
    const wrapper = await mountComponent();
    expect(wrapper.findAll(".installer-item").length).toBe(0);
  });
});

describe("InstallerView 搜索过滤功能", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("搜索输入框应能输入内容", async () => {
    const wrapper = await mountComponent();
    const searchBox = wrapper.find(".input-with-icon");
    await searchBox.setValue("test");
    await flushPromises();
    expect(searchBox.element.value).toBe("test");
  });
});

describe("InstallerView 按钮交互", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('点击"扫描"按钮不应抛出异常', async () => {
    const wrapper = await mountComponent();
    const scanBtn = wrapper.find(".btn-outline");
    await expect(scanBtn.trigger("click")).resolves.not.toThrow();
  });
});

describe("InstallerView 深度交互测试", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMole.loading.value = false;
    mockMole.error.value = "";
    mockMole.scanInstallers.mockResolvedValue([]);
  });

  it('点击"扫描"应调用 scanInstallers()', async () => {
    const wrapper = await mountComponent();
    await wrapper.find(".btn-outline").trigger("click");
    await flushPromises();
    expect(mockMole.scanInstallers).toHaveBeenCalledTimes(1);
  });

  it("扫描成功后应解析并渲染安装包列表", async () => {
    const wrapper = await mountComponent();
    const items = [
      {
        id: 1,
        name: "Chrome",
        ext: "dmg",
        path: "/Users/test/Downloads/Chrome.dmg",
        size: "100 MB",
        date: "2024-01-01",
        checked: false,
      },
      {
        id: 2,
        name: "Firefox",
        ext: "pkg",
        path: "/Users/test/Downloads/Firefox.pkg",
        size: "50 MB",
        date: "2024-01-02",
        checked: false,
      },
    ];
    await populatePackages(wrapper, items);
    expect(wrapper.findAll(".installer-item").length).toBe(2);
    expect(wrapper.text()).toContain("Chrome");
    expect(wrapper.text()).toContain("Firefox");
  });

  it("点击安装包复选框应选中/取消选中", async () => {
    const wrapper = await mountComponent();
    const items = [
      {
        id: 1,
        name: "Chrome",
        ext: "dmg",
        path: "/Users/test/Downloads/Chrome.dmg",
        size: "100 MB",
        date: "2024-01-01",
        checked: false,
      },
    ];
    await populatePackages(wrapper, items);
    const checkbox = wrapper.find(".checkbox-native");
    expect(checkbox.element.checked).toBe(false);
    await checkbox.setValue(true);
    await flushPromises();
    expect(checkbox.element.checked).toBe(true);
    await checkbox.setValue(false);
    await flushPromises();
    expect(checkbox.element.checked).toBe(false);
  });

  it('点击"删除选中"应调用 execRaw("rm", paths) 并移除选中的安装包', async () => {
    const wrapper = await mountComponent();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const items = [
      {
        id: 1,
        name: "Chrome.dmg",
        ext: "dmg",
        path: "/Users/test/Downloads/Chrome.dmg",
        size: "100 MB",
        date: "2024-01-01",
        checked: false,
      },
      {
        id: 2,
        name: "Firefox.pkg",
        ext: "pkg",
        path: "/Users/test/Downloads/Firefox.pkg",
        size: "50 MB",
        date: "2024-01-02",
        checked: false,
      },
    ];
    await populatePackages(wrapper, items);
    const checkboxes = wrapper.findAll(".checkbox-native");
    await checkboxes[0].setValue(true);
    await flushPromises();
    mockMole.execRaw.mockResolvedValueOnce({ stdout: "", stderr: "", code: 0, success: true });
    await wrapper.find(".btn-danger-outline").trigger("click");
    await flushPromises();
    expect(mockMole.execRaw).toHaveBeenCalledTimes(1);
    expect(mockMole.execRaw).toHaveBeenCalledWith("rm", ["/Users/test/Downloads/Chrome.dmg"]);
    expect(wrapper.findAll(".installer-item").length).toBe(1);
    expect(wrapper.text()).not.toContain("Chrome.dmg");
    expect(wrapper.text()).toContain("Firefox.pkg");
  });

  it("搜索输入框应能过滤安装包列表", async () => {
    const wrapper = await mountComponent();
    const items = [
      {
        id: 1,
        name: "Chrome",
        ext: "dmg",
        path: "/Users/test/Downloads/Chrome.dmg",
        size: "100 MB",
        date: "2024-01-01",
        checked: false,
      },
      {
        id: 2,
        name: "Firefox",
        ext: "pkg",
        path: "/Users/test/Downloads/Firefox.pkg",
        size: "50 MB",
        date: "2024-01-02",
        checked: false,
      },
    ];
    await populatePackages(wrapper, items);
    expect(wrapper.findAll(".installer-item").length).toBe(2);
    const searchBox = wrapper.find(".input-with-icon");
    await searchBox.setValue("Chrome");
    await flushPromises();
    expect(wrapper.findAll(".installer-item").length).toBe(1);
    expect(wrapper.text()).toContain("Chrome");
    expect(wrapper.text()).not.toContain("Firefox");
  });

  it("过滤后列表为空时应显示空状态", async () => {
    const wrapper = await mountComponent();
    const items = [
      {
        id: 1,
        name: "Chrome",
        ext: "dmg",
        path: "/Users/test/Downloads/Chrome.dmg",
        size: "100 MB",
        date: "2024-01-01",
        checked: false,
      },
    ];
    await populatePackages(wrapper, items);
    const searchBox = wrapper.find(".input-with-icon");
    await searchBox.setValue("nonexistent");
    await flushPromises();
    expect(wrapper.find(".installer-empty").exists()).toBe(true);
    expect(wrapper.text()).toContain("未找到安装包");
  });
});
