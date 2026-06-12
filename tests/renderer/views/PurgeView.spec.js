import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PurgeView from "@/views/PurgeView.vue";

const mockMole = vi.hoisted(() => {
  const { ref } = require("vue");
  return {
    loading: ref(false),
    error: ref(""),
    execSudo: vi.fn(() => Promise.resolve({ stdout: "", stderr: "", code: 0, success: true })),
    previewPurge: vi.fn(() => Promise.resolve([])),
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
  const wrapper = mount(PurgeView);
  await flushPromises();
  return wrapper;
}

async function populateItems(wrapper, items) {
  mockMole.previewPurge.mockResolvedValueOnce(items);
  await wrapper.find(".btn-outline").trigger("click");
  await flushPromises();
}

describe("PurgeView 初始渲染", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应渲染页面标题"项目清理"', async () => {
    const wrapper = await mountComponent();
    expect(wrapper.find(".page-title").text()).toBe("项目清理");
  });

  it("应渲染页面副标题", async () => {
    const wrapper = await mountComponent();
    expect(wrapper.find(".page-subtitle").text()).toBe("清理开发项目的构建产物和依赖");
  });

  it('应渲染"预览扫描"按钮', async () => {
    const wrapper = await mountComponent();
    const scanBtn = wrapper.find(".btn-outline");
    expect(scanBtn.exists()).toBe(true);
    expect(scanBtn.text()).toContain("预览扫描");
  });

  it('应渲染"清理选中项"按钮且初始为禁用状态', async () => {
    const wrapper = await mountComponent();
    const purgeBtn = wrapper.find(".btn-primary");
    expect(purgeBtn.exists()).toBe(true);
    expect(purgeBtn.text()).toContain("清理选中项");
    expect(purgeBtn.attributes("disabled")).toBeDefined();
  });

  it("应渲染搜索框", async () => {
    const wrapper = await mountComponent();
    const searchBox = wrapper.find(".input-with-icon");
    expect(searchBox.exists()).toBe(true);
    expect(searchBox.attributes("placeholder")).toBe("搜索项目...");
  });

  it("初始状态应显示空状态提示", async () => {
    const wrapper = await mountComponent();
    expect(wrapper.find(".empty-card").exists()).toBe(true);
    expect(wrapper.text()).toContain("预览扫描");
  });

  it("初始状态不应渲染项目列表", async () => {
    const wrapper = await mountComponent();
    expect(wrapper.findAll(".purge-item").length).toBe(0);
  });
});

describe("PurgeView 搜索过滤功能", () => {
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

describe("PurgeView 按钮交互", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('点击"预览扫描"按钮不应抛出异常', async () => {
    const wrapper = await mountComponent();
    const scanBtn = wrapper.find(".btn-outline");
    await expect(scanBtn.trigger("click")).resolves.not.toThrow();
  });
});

describe("PurgeView 深度交互", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMole.previewPurge.mockResolvedValue([]);
  });

  it('点击"预览扫描"应调用 previewPurge()', async () => {
    const wrapper = await mountComponent();
    await wrapper.find(".btn-outline").trigger("click");
    await flushPromises();
    expect(mockMole.previewPurge).toHaveBeenCalledTimes(1);
  });

  it("解析结果并渲染项目列表", async () => {
    const items = [
      {
        id: 1,
        name: "node_modules",
        size: "100 MB",
        type: "node",
        path: "/proj/node_modules",
        checked: false,
      },
      { id: 2, name: "target", size: "50 MB", type: "rust", path: "/proj/target", checked: false },
    ];
    const wrapper = await mountComponent();
    await populateItems(wrapper, items);

    const rows = wrapper.findAll(".purge-item");
    expect(rows.length).toBe(2);
    expect(rows[0].text()).toContain("node_modules");
    expect(rows[0].text()).toContain("Node");
    expect(rows[1].text()).toContain("target");
    expect(rows[1].text()).toContain("Rust");
  });

  it("点击项目行可切换选中状态", async () => {
    const items = [
      {
        id: 1,
        name: "node_modules",
        size: "100 MB",
        type: "node",
        path: "/proj/node_modules",
        checked: false,
      },
    ];
    const wrapper = await mountComponent();
    await populateItems(wrapper, items);

    const row = wrapper.findAll(".purge-item")[0];
    const checkbox = row.find('input[type="checkbox"]');
    expect(checkbox.element.checked).toBe(false);

    await row.trigger("click");
    await flushPromises();
    expect(checkbox.element.checked).toBe(true);

    await row.trigger("click");
    await flushPromises();
    expect(checkbox.element.checked).toBe(false);
  });

  it('点击"清理选中项"应调用 execSudo("purge")', async () => {
    const items = [
      {
        id: 1,
        name: "node_modules",
        size: "100 MB",
        type: "node",
        path: "/proj/node_modules",
        checked: true,
      },
    ];
    const wrapper = await mountComponent();
    await populateItems(wrapper, items);

    await wrapper.find(".btn-primary").trigger("click");
    await flushPromises();

    expect(mockMole.execSudo).toHaveBeenLastCalledWith("purge");
  });

  it("清理成功后清空列表并显示空状态", async () => {
    const items = [
      {
        id: 1,
        name: "node_modules",
        size: "100 MB",
        type: "node",
        path: "/proj/node_modules",
        checked: true,
      },
    ];
    const wrapper = await mountComponent();
    await populateItems(wrapper, items);

    await wrapper.find(".btn-primary").trigger("click");
    await flushPromises();

    expect(wrapper.findAll(".purge-item").length).toBe(0);
    expect(wrapper.find(".empty-card").exists()).toBe(true);
  });

  it("搜索输入可过滤列表", async () => {
    const items = [
      {
        id: 1,
        name: "node_modules",
        size: "100 MB",
        type: "node",
        path: "/proj/node_modules",
        checked: false,
      },
      { id: 2, name: "target", size: "50 MB", type: "rust", path: "/proj/target", checked: false },
    ];
    const wrapper = await mountComponent();
    await populateItems(wrapper, items);

    const searchBox = wrapper.find(".input-with-icon");
    await searchBox.setValue("node");
    await flushPromises();

    const rows = wrapper.findAll(".purge-item");
    expect(rows.length).toBe(1);
    expect(rows[0].text()).toContain("node_modules");
  });

  it("过滤无结果时显示列表内空状态", async () => {
    const items = [
      {
        id: 1,
        name: "node_modules",
        size: "100 MB",
        type: "node",
        path: "/proj/node_modules",
        checked: false,
      },
    ];
    const wrapper = await mountComponent();
    await populateItems(wrapper, items);

    const searchBox = wrapper.find(".input-with-icon");
    await searchBox.setValue("nonexistent");
    await flushPromises();

    expect(wrapper.find(".purge-empty").exists()).toBe(true);
    expect(wrapper.text()).toContain("未找到匹配的项目");
  });
});
