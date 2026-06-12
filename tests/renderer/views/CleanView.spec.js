import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import CleanView from "@/views/CleanView.vue";

const mockMole = vi.hoisted(() => {
  const { ref } = require("vue");
  return {
    loading: ref(false),
    error: ref(""),
    execSudo: vi.fn(() => Promise.resolve({ stdout: "", stderr: "", code: 0, success: true })),
    previewClean: vi.fn(() => Promise.resolve([])),
    listenOutput: vi.fn(),
    removeOutputListener: vi.fn(),
  };
});

vi.mock("@/composables/useMole.js", () => ({
  useMole: vi.fn(() => mockMole),
}));

describe("CleanView 组件", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("初始渲染", () => {
    it('应渲染标题"清理"', () => {
      const wrapper = mount(CleanView);
      expect(wrapper.find("h1.page-title").text()).toBe("清理");
    });

    it("应渲染副标题说明文字", () => {
      const wrapper = mount(CleanView);
      expect(wrapper.find("p.page-subtitle").text()).toBe("扫描并清理系统缓存、开发产物和临时文件");
    });

    it('应渲染"预览扫描"按钮', () => {
      const wrapper = mount(CleanView);
      const btn = wrapper.findAll("button").find((b) => b.text().includes("预览扫描"));
      expect(btn).toBeDefined();
      expect(btn.exists()).toBe(true);
    });

    it('应渲染"清理选中项"按钮', () => {
      const wrapper = mount(CleanView);
      const btn = wrapper.findAll("button").find((b) => b.text().includes("清理选中项"));
      expect(btn).toBeDefined();
      expect(btn.exists()).toBe(true);
    });

    it('"清理选中项"按钮默认应处于禁用状态（无选中项）', () => {
      const wrapper = mount(CleanView);
      const cleanBtn = wrapper.findAll("button").find((b) => b.text().includes("清理选中项"));
      expect(cleanBtn.attributes("disabled")).toBeDefined();
    });

    it("初始应显示空状态提示", () => {
      const wrapper = mount(CleanView);
      expect(wrapper.find(".empty-card").exists()).toBe(true);
      expect(wrapper.text()).toContain("预览扫描");
    });

    it("初始不应渲染分类卡片", () => {
      const wrapper = mount(CleanView);
      expect(wrapper.findAll(".clean-category").length).toBe(0);
    });
  });

  describe("按钮交互", () => {
    it('点击"预览扫描"按钮不应抛出异常', async () => {
      const wrapper = mount(CleanView);
      const dryRunBtn = wrapper.findAll("button").find((b) => b.text().includes("预览扫描"));
      await expect(dryRunBtn.trigger("click")).resolves.not.toThrow();
    });

    it('点击"清理选中项"按钮不应抛出异常', async () => {
      const wrapper = mount(CleanView);
      const cleanBtn = wrapper.findAll("button").find((b) => b.text().includes("清理选中项"));
      await expect(cleanBtn.trigger("click")).resolves.not.toThrow();
    });
  });

  describe("空状态", () => {
    it("未选中任何项时不应显示底部统计栏", () => {
      const wrapper = mount(CleanView);
      expect(wrapper.find(".clean-footer").exists()).toBe(false);
      expect(wrapper.text()).not.toContain("已选中总计");
    });
  });

  describe("深度交互测试", () => {
    beforeEach(() => {
      mockMole.loading.value = false;
      mockMole.error.value = "";
      mockMole.execSudo
        .mockReset()
        .mockResolvedValue({ stdout: "", stderr: "", code: 0, success: true });
      mockMole.previewClean.mockReset().mockResolvedValue([]);
      mockMole.listenOutput.mockReset();
      mockMole.removeOutputListener.mockReset();
    });

    it("点击预览扫描时调用 previewClean 并进入 loading 状态", async () => {
      const wrapper = mount(CleanView);
      mockMole.previewClean.mockImplementation(() => {
        mockMole.loading.value = true;
        return Promise.resolve([]);
      });

      const btn = wrapper.findAll("button").find((b) => b.text().includes("预览扫描"));
      await btn.trigger("click");
      await flushPromises();

      expect(mockMole.previewClean).toHaveBeenCalledTimes(1);
      expect(mockMole.loading.value).toBe(true);
      expect(wrapper.find(".loading-state-rich").exists()).toBe(true);
    });

    it("预览扫描成功返回 2 个分类时渲染 2 个分类卡片", async () => {
      const wrapper = mount(CleanView);
      const parsed = [
        {
          name: "Caches",
          checked: true,
          items: [
            { name: "npm cache", checked: true, size: "120 MB", sizeBytes: 120 * 1024 * 1024 },
            { name: "yarn cache", checked: true, size: "80 MB", sizeBytes: 80 * 1024 * 1024 },
          ],
        },
        {
          name: "Logs",
          checked: false,
          items: [
            { name: "system.log", checked: false, size: "45 MB", sizeBytes: 45 * 1024 * 1024 },
          ],
        },
      ];
      mockMole.previewClean.mockResolvedValue(parsed);

      const btn = wrapper.findAll("button").find((b) => b.text().includes("预览扫描"));
      await btn.trigger("click");
      await flushPromises();

      expect(wrapper.findAll(".clean-category").length).toBe(2);
    });

    it("分类名称和项目数徽章显示正确", async () => {
      const wrapper = mount(CleanView);
      const parsed = [
        {
          name: "Caches",
          checked: true,
          items: [
            { name: "npm cache", checked: true, size: "120 MB", sizeBytes: 120 * 1024 * 1024 },
            { name: "yarn cache", checked: true, size: "80 MB", sizeBytes: 80 * 1024 * 1024 },
          ],
        },
      ];
      mockMole.previewClean.mockResolvedValue(parsed);

      const btn = wrapper.findAll("button").find((b) => b.text().includes("预览扫描"));
      await btn.trigger("click");
      await flushPromises();

      const category = wrapper.find(".clean-category");
      expect(category.text()).toContain("Caches");
      expect(category.text()).toContain("2 项");
    });

    it("项目名和大小显示正确", async () => {
      const wrapper = mount(CleanView);
      const parsed = [
        {
          name: "Caches",
          checked: true,
          items: [
            { name: "npm cache", checked: true, size: "120 MB", sizeBytes: 120 * 1024 * 1024 },
          ],
        },
      ];
      mockMole.previewClean.mockResolvedValue(parsed);

      const btn = wrapper.findAll("button").find((b) => b.text().includes("预览扫描"));
      await btn.trigger("click");
      await flushPromises();

      const item = wrapper.find(".category-item");
      expect(item.text()).toContain("npm cache");
      expect(item.text()).toContain("120 MB");
    });

    it("点击分类复选框可全选/取消全选该分类下的所有项目", async () => {
      const wrapper = mount(CleanView);
      const parsed = [
        {
          name: "Caches",
          checked: true,
          items: [
            { name: "npm cache", checked: true, size: "120 MB", sizeBytes: 120 * 1024 * 1024 },
            { name: "yarn cache", checked: true, size: "80 MB", sizeBytes: 80 * 1024 * 1024 },
          ],
        },
      ];
      mockMole.previewClean.mockResolvedValue(parsed);

      const btn = wrapper.findAll("button").find((b) => b.text().includes("预览扫描"));
      await btn.trigger("click");
      await flushPromises();

      const categoryCheckbox = wrapper.find(".category-header input[type='checkbox']");
      expect(categoryCheckbox.exists()).toBe(true);

      let items = wrapper.findAll(".category-item input[type='checkbox']");
      expect(items.every((i) => i.element.checked)).toBe(true);

      await categoryCheckbox.setValue(false);
      await flushPromises();

      items = wrapper.findAll(".category-item input[type='checkbox']");
      expect(items.every((i) => i.element.checked)).toBe(false);

      await categoryCheckbox.setValue(true);
      await flushPromises();

      items = wrapper.findAll(".category-item input[type='checkbox']");
      expect(items.every((i) => i.element.checked)).toBe(true);
    });

    it("点击单个项目复选框切换其选中状态", async () => {
      const wrapper = mount(CleanView);
      const parsed = [
        {
          name: "Caches",
          checked: true,
          items: [
            { name: "npm cache", checked: true, size: "120 MB", sizeBytes: 120 * 1024 * 1024 },
            { name: "yarn cache", checked: true, size: "80 MB", sizeBytes: 80 * 1024 * 1024 },
          ],
        },
      ];
      mockMole.previewClean.mockResolvedValue(parsed);

      const btn = wrapper.findAll("button").find((b) => b.text().includes("预览扫描"));
      await btn.trigger("click");
      await flushPromises();

      const itemCheckbox = wrapper.findAll(".category-item input[type='checkbox']")[0];
      expect(itemCheckbox.element.checked).toBe(true);

      await itemCheckbox.setValue(false);
      await flushPromises();

      expect(itemCheckbox.element.checked).toBe(false);
    });

    it("selectedCount 计算选中项目总数", async () => {
      const wrapper = mount(CleanView);
      const parsed = [
        {
          name: "Caches",
          checked: true,
          items: [
            { name: "npm cache", checked: true, size: "120 MB", sizeBytes: 120 * 1024 * 1024 },
            { name: "yarn cache", checked: false, size: "80 MB", sizeBytes: 80 * 1024 * 1024 },
          ],
        },
        {
          name: "Logs",
          checked: false,
          items: [
            { name: "system.log", checked: true, size: "45 MB", sizeBytes: 45 * 1024 * 1024 },
          ],
        },
      ];
      mockMole.previewClean.mockResolvedValue(parsed);

      const btn = wrapper.findAll("button").find((b) => b.text().includes("预览扫描"));
      await btn.trigger("click");
      await flushPromises();

      expect(wrapper.vm.selectedCount).toBe(2);
    });

    it("totalSize 格式化显示：≥1GB 显示 GB，<1GB 显示 MB，未选中返回空字符串", async () => {
      // 未选中时返回空字符串
      const wrapper0 = mount(CleanView);
      expect(wrapper0.vm.totalSize).toBe("");

      // MB 场景
      const wrapperMB = mount(CleanView);
      const parsedMB = [
        {
          name: "Caches",
          checked: true,
          items: [
            { name: "npm cache", checked: true, size: "120 MB", sizeBytes: 120 * 1024 * 1024 },
            { name: "yarn cache", checked: true, size: "80 MB", sizeBytes: 80 * 1024 * 1024 },
          ],
        },
      ];
      mockMole.previewClean.mockResolvedValue(parsedMB);

      const btnMB = wrapperMB.findAll("button").find((b) => b.text().includes("预览扫描"));
      await btnMB.trigger("click");
      await flushPromises();

      expect(wrapperMB.vm.totalSize).toBe("200 MB");

      // GB 场景
      const wrapperGB = mount(CleanView);
      const parsedGB = [
        {
          name: "Caches",
          checked: true,
          items: [
            { name: "large cache", checked: true, size: "1.5 GB", sizeBytes: 1.5 * 1024 ** 3 },
          ],
        },
      ];
      mockMole.previewClean.mockResolvedValue(parsedGB);

      const btnGB = wrapperGB.findAll("button").find((b) => b.text().includes("预览扫描"));
      await btnGB.trigger("click");
      await flushPromises();

      expect(wrapperGB.vm.totalSize).toBe("1.50 GB");
    });

    it("预览扫描结果为空时显示空状态提示", async () => {
      const wrapper = mount(CleanView);
      mockMole.previewClean.mockResolvedValue([]);

      const btn = wrapper.findAll("button").find((b) => b.text().includes("预览扫描"));
      await btn.trigger("click");
      await flushPromises();

      expect(wrapper.find(".empty-card").exists()).toBe(true);
      expect(wrapper.text()).toContain("未检测到可清理项目");
    });

    it("预览扫描出错时显示错误卡片并清空分类", async () => {
      const wrapper = mount(CleanView);
      mockMole.error.value = "扫描失败：权限不足";
      mockMole.previewClean.mockRejectedValue(new Error("permission denied"));

      const btn = wrapper.findAll("button").find((b) => b.text().includes("预览扫描"));
      await btn.trigger("click");
      await flushPromises();

      expect(wrapper.find(".error-card").exists()).toBe(true);
      expect(wrapper.text()).toContain("扫描失败：权限不足");
      expect(wrapper.vm.categories).toEqual([]);
    });

    it("预览扫描时注册实时输出回调并正确添加输出行", async () => {
      const wrapper = mount(CleanView);
      let capturedCallback = null;
      mockMole.listenOutput.mockImplementation((cb) => {
        capturedCallback = cb;
      });
      mockMole.previewClean.mockImplementation(() => {
        mockMole.loading.value = true;
        return Promise.resolve([]);
      });

      const btn = wrapper.findAll("button").find((b) => b.text().includes("预览扫描"));
      await btn.trigger("click");

      expect(mockMole.listenOutput).toHaveBeenCalled();
      expect(capturedCallback).toBeInstanceOf(Function);

      capturedCallback({ data: "Scanning cache...", type: "stdout" });
      await flushPromises();

      expect(wrapper.findAll(".live-output-line").length).toBe(1);
      expect(wrapper.text()).toContain("Scanning cache...");
    });

    it("实时输出行数超过 8 行时只保留最后 8 行", async () => {
      const wrapper = mount(CleanView);
      let capturedCallback = null;
      mockMole.listenOutput.mockImplementation((cb) => {
        capturedCallback = cb;
      });
      mockMole.previewClean.mockImplementation(() => {
        mockMole.loading.value = true;
        return Promise.resolve([]);
      });

      const btn = wrapper.findAll("button").find((b) => b.text().includes("预览扫描"));
      await btn.trigger("click");

      for (let i = 1; i <= 10; i++) {
        capturedCallback({ data: `output-${i}`, type: "stdout" });
      }
      await flushPromises();

      const lines = wrapper.findAll(".live-output-line");
      expect(lines.length).toBe(8);
      expect(lines[0].text()).toBe("output-3");
      expect(lines[7].text()).toBe("output-10");
    });

    it("清理选中项时调用 execSudo('clean')", async () => {
      const wrapper = mount(CleanView);
      const parsed = [
        {
          name: "Caches",
          checked: true,
          items: [
            { name: "npm cache", checked: true, size: "120 MB", sizeBytes: 120 * 1024 * 1024 },
          ],
        },
      ];
      mockMole.previewClean.mockResolvedValue(parsed);

      const previewBtn = wrapper.findAll("button").find((b) => b.text().includes("预览扫描"));
      await previewBtn.trigger("click");
      await flushPromises();

      const cleanBtn = wrapper.findAll("button").find((b) => b.text().includes("清理选中项"));
      await cleanBtn.trigger("click");
      await flushPromises();

      expect(mockMole.execSudo).toHaveBeenLastCalledWith("clean");
    });

    it("清理成功后显示结果卡片，包含释放大小和项目数", async () => {
      const wrapper = mount(CleanView);
      const parsed = [
        {
          name: "Caches",
          checked: true,
          items: [
            { name: "npm cache", checked: true, size: "120 MB", sizeBytes: 120 * 1024 * 1024 },
            { name: "yarn cache", checked: true, size: "80 MB", sizeBytes: 80 * 1024 * 1024 },
          ],
        },
      ];
      mockMole.previewClean.mockResolvedValue(parsed);

      const previewBtn = wrapper.findAll("button").find((b) => b.text().includes("预览扫描"));
      await previewBtn.trigger("click");
      await flushPromises();

      const cleanBtn = wrapper.findAll("button").find((b) => b.text().includes("清理选中项"));
      await cleanBtn.trigger("click");
      await flushPromises();

      expect(wrapper.find(".clean-result-card").exists()).toBe(true);
      expect(wrapper.text()).toContain("200 MB");
      expect(wrapper.text()).toContain("已清理 2 个项目");
    });

    it("清理成功后清空分类列表", async () => {
      const wrapper = mount(CleanView);
      const parsed = [
        {
          name: "Caches",
          checked: true,
          items: [
            { name: "npm cache", checked: true, size: "120 MB", sizeBytes: 120 * 1024 * 1024 },
          ],
        },
      ];
      mockMole.previewClean.mockResolvedValue(parsed);

      const previewBtn = wrapper.findAll("button").find((b) => b.text().includes("预览扫描"));
      await previewBtn.trigger("click");
      await flushPromises();

      expect(wrapper.findAll(".clean-category").length).toBe(1);

      const cleanBtn = wrapper.findAll("button").find((b) => b.text().includes("清理选中项"));
      await cleanBtn.trigger("click");
      await flushPromises();

      expect(wrapper.vm.categories).toEqual([]);
      expect(wrapper.findAll(".clean-category").length).toBe(0);
    });

    it("点击完成按钮关闭结果卡片并重置 scanned", async () => {
      const wrapper = mount(CleanView);
      const parsed = [
        {
          name: "Caches",
          checked: true,
          items: [
            { name: "npm cache", checked: true, size: "120 MB", sizeBytes: 120 * 1024 * 1024 },
          ],
        },
      ];
      mockMole.previewClean.mockResolvedValue(parsed);

      const previewBtn = wrapper.findAll("button").find((b) => b.text().includes("预览扫描"));
      await previewBtn.trigger("click");
      await flushPromises();

      const cleanBtn = wrapper.findAll("button").find((b) => b.text().includes("清理选中项"));
      await cleanBtn.trigger("click");
      await flushPromises();

      expect(wrapper.find(".clean-result-card").exists()).toBe(true);

      const dismissBtn = wrapper.find(".clean-result-card button");
      await dismissBtn.trigger("click");
      await flushPromises();

      expect(wrapper.find(".clean-result-card").exists()).toBe(false);
      expect(wrapper.vm.scanned).toBe(false);
    });

    it("扫描模式 loadingTitle 为'正在扫描系统文件...'", () => {
      const wrapper = mount(CleanView);
      wrapper.vm.operationType = "scan";
      expect(wrapper.vm.loadingTitle).toBe("正在扫描系统文件...");
    });

    it("清理模式 loadingTitle 为'正在执行清理...'", () => {
      const wrapper = mount(CleanView);
      wrapper.vm.operationType = "clean";
      expect(wrapper.vm.loadingTitle).toBe("正在执行清理...");
    });

    it("扫描模式 loadingSubtitles 包含 4 条字幕", () => {
      const wrapper = mount(CleanView);
      wrapper.vm.operationType = "scan";
      expect(wrapper.vm.loadingSubtitles).toHaveLength(4);
      expect(wrapper.vm.loadingSubtitles).toContain("正在读取目录结构...");
      expect(wrapper.vm.loadingSubtitles).toContain("正在统计文件大小...");
      expect(wrapper.vm.loadingSubtitles).toContain("正在分析可清理项...");
      expect(wrapper.vm.loadingSubtitles).toContain("正在整理扫描结果...");
    });

    it("清理模式 loadingSubtitles 包含 3 条字幕", () => {
      const wrapper = mount(CleanView);
      wrapper.vm.operationType = "clean";
      expect(wrapper.vm.loadingSubtitles).toHaveLength(3);
      expect(wrapper.vm.loadingSubtitles).toContain("正在删除选中文件...");
      expect(wrapper.vm.loadingSubtitles).toContain("正在释放磁盘空间...");
      expect(wrapper.vm.loadingSubtitles).toContain("正在完成清理操作...");
    });

    it("loading 为 true 时预览扫描和清理按钮均被禁用", () => {
      mockMole.loading.value = true;
      const wrapper = mount(CleanView);

      const previewBtn = wrapper.findAll("button").find((b) => b.text().includes("预览扫描"));
      const cleanBtn = wrapper.findAll("button").find((b) => b.text().includes("清理选中项"));

      expect(previewBtn.attributes("disabled")).toBeDefined();
      expect(cleanBtn.attributes("disabled")).toBeDefined();
    });

    it("未选中任何项目时清理按钮被禁用", () => {
      const wrapper = mount(CleanView);
      const cleanBtn = wrapper.findAll("button").find((b) => b.text().includes("清理选中项"));
      expect(cleanBtn.attributes("disabled")).toBeDefined();
    });

    it("预览扫描完成后在 finally 中移除输出监听器", async () => {
      const wrapper = mount(CleanView);
      mockMole.previewClean.mockResolvedValue([]);

      const btn = wrapper.findAll("button").find((b) => b.text().includes("预览扫描"));
      await btn.trigger("click");
      await flushPromises();

      expect(mockMole.removeOutputListener).toHaveBeenCalled();
    });
  });
});
