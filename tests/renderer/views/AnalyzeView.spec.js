import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { ref } from "vue";
import AnalyzeView from "@/views/AnalyzeView.vue";
import { useMole } from "@/composables/useMole.js";
import LiveOutput from "@/views/../components/LiveOutput.vue";

vi.mock("@/composables/useMole.js", () => ({
  useMole: vi.fn(() => ({
    loading: ref(false),
    error: ref(""),
    scanDisk: vi.fn(() => Promise.resolve({ diskData: [], topDirectories: [], totalSize: 0 })),
    listenOutput: vi.fn(),
    removeOutputListener: vi.fn(),
    formatSize: vi.fn((bytes) => {
      if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
      if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
      return `${bytes} B`;
    }),
  })),
}));

describe("AnalyzeView 组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("初始渲染", () => {
    it('应显示标题"分析"和副标题', () => {
      const wrapper = mount(AnalyzeView);
      expect(wrapper.find("h1.page-title").text()).toBe("分析");
      expect(wrapper.find("p.page-subtitle").text()).toBe("可视化磁盘空间分析和清理建议");
    });

    it('应显示"扫描磁盘"按钮且默认未禁用', () => {
      const wrapper = mount(AnalyzeView);
      const button = wrapper.find("button.btn-primary");
      expect(button.text()).toContain("扫描磁盘");
      expect(button.attributes("disabled")).toBeUndefined();
    });

    it("初始应显示空状态提示", () => {
      const wrapper = mount(AnalyzeView);
      expect(wrapper.find(".empty-card").exists()).toBe(true);
      expect(wrapper.text()).toContain("扫描磁盘");
    });

    it("初始不应渲染图表和目录列表", () => {
      const wrapper = mount(AnalyzeView);
      expect(wrapper.find(".donut-chart").exists()).toBe(false);
      expect(wrapper.find(".dirs-list").exists()).toBe(false);
    });
  });

  describe("按钮交互", () => {
    it('点击"扫描磁盘"按钮不应抛出异常', async () => {
      const wrapper = mount(AnalyzeView);
      const button = wrapper.find("button.btn-primary");
      await expect(button.trigger("click")).resolves.not.toThrow();
    });
  });

  describe("深度交互测试", () => {
    const realisticData = {
      diskData: [
        { name: "Applications", bytes: 50 * 1024 ** 3, color: "#0078d4", size: "50.00 GB" },
        { name: "Documents", bytes: 30 * 1024 ** 3, color: "#107c10", size: "30.00 GB" },
        { name: "Others", bytes: 20 * 1024 ** 3, color: "#ffb900", size: "20.00 GB" },
      ],
      topDirectories: [
        {
          name: "node_modules",
          path: "/Users/x/project/node_modules",
          size: "15.2 GB",
          percentage: 80,
          color: "#d13438",
        },
        {
          name: "Downloads",
          path: "/Users/x/Downloads",
          size: "3.8 GB",
          percentage: 45,
          color: "#0078d4",
        },
      ],
      totalSize: 12345678901,
    };

    it('点击"扫描磁盘"应调用 scanDisk', async () => {
      const mockScanDisk = vi.fn(() => Promise.resolve(realisticData));
      vi.mocked(useMole).mockReturnValue({
        loading: ref(false),
        error: ref(""),
        scanDisk: mockScanDisk,
        listenOutput: vi.fn(),
        removeOutputListener: vi.fn(),
        formatSize: vi.fn((bytes) => `${bytes} B`),
      });

      const wrapper = mount(AnalyzeView);
      await wrapper.find("button.btn-primary").trigger("click");
      await flushPromises();

      expect(mockScanDisk).toHaveBeenCalledTimes(1);
    });

    it("scanDisk 成功后应渲染 donut chart SVG（含 circle 元素）", async () => {
      const mockScanDisk = vi.fn(() => Promise.resolve(realisticData));
      vi.mocked(useMole).mockReturnValue({
        loading: ref(false),
        error: ref(""),
        scanDisk: mockScanDisk,
        listenOutput: vi.fn(),
        removeOutputListener: vi.fn(),
        formatSize: vi.fn((bytes) => {
          if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
          if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
          return `${bytes} B`;
        }),
      });

      const wrapper = mount(AnalyzeView);
      await wrapper.find("button.btn-primary").trigger("click");
      await flushPromises();

      expect(wrapper.find(".donut-chart").exists()).toBe(true);
      const circles = wrapper.findAll(".donut-chart circle");
      expect(circles.length).toBeGreaterThanOrEqual(4); // 1 bg + 3 data slices
    });

    it("pieSlices computed: arc = circumference * (bytes / totalBytes)", async () => {
      const mockScanDisk = vi.fn(() => Promise.resolve(realisticData));
      vi.mocked(useMole).mockReturnValue({
        loading: ref(false),
        error: ref(""),
        scanDisk: mockScanDisk,
        listenOutput: vi.fn(),
        removeOutputListener: vi.fn(),
        formatSize: vi.fn((bytes) => `${bytes} B`),
      });

      const wrapper = mount(AnalyzeView);
      await wrapper.find("button.btn-primary").trigger("click");
      await flushPromises();

      const slices = wrapper.vm.pieSlices;
      const totalBytes = 50 * 1024 ** 3 + 30 * 1024 ** 3 + 20 * 1024 ** 3;
      const circumference = 440;

      expect(slices[0].arc).toBeCloseTo(circumference * ((50 * 1024 ** 3) / totalBytes));
      expect(slices[1].arc).toBeCloseTo(circumference * ((30 * 1024 ** 3) / totalBytes));
      expect(slices[2].arc).toBeCloseTo(circumference * ((20 * 1024 ** 3) / totalBytes));
    });

    it("pieSlices computed: offset 正确累加（第1个0，第2个=-arc1...）", async () => {
      const mockScanDisk = vi.fn(() => Promise.resolve(realisticData));
      vi.mocked(useMole).mockReturnValue({
        loading: ref(false),
        error: ref(""),
        scanDisk: mockScanDisk,
        listenOutput: vi.fn(),
        removeOutputListener: vi.fn(),
        formatSize: vi.fn((bytes) => `${bytes} B`),
      });

      const wrapper = mount(AnalyzeView);
      await wrapper.find("button.btn-primary").trigger("click");
      await flushPromises();

      const slices = wrapper.vm.pieSlices;
      expect(slices[0].offset).toBe(-0);
      expect(slices[1].offset).toBe(-slices[0].arc);
      expect(slices[2].offset).toBe(-(slices[0].arc + slices[1].arc));
    });

    it("pieSlices computed: percentage 为整数", async () => {
      const mockScanDisk = vi.fn(() => Promise.resolve(realisticData));
      vi.mocked(useMole).mockReturnValue({
        loading: ref(false),
        error: ref(""),
        scanDisk: mockScanDisk,
        listenOutput: vi.fn(),
        removeOutputListener: vi.fn(),
        formatSize: vi.fn((bytes) => `${bytes} B`),
      });

      const wrapper = mount(AnalyzeView);
      await wrapper.find("button.btn-primary").trigger("click");
      await flushPromises();

      const slices = wrapper.vm.pieSlices;
      slices.forEach((slice) => {
        expect(Number.isInteger(slice.percentage)).toBe(true);
      });
    });

    it("图例项应渲染名称和大小", async () => {
      const mockScanDisk = vi.fn(() => Promise.resolve(realisticData));
      vi.mocked(useMole).mockReturnValue({
        loading: ref(false),
        error: ref(""),
        scanDisk: mockScanDisk,
        listenOutput: vi.fn(),
        removeOutputListener: vi.fn(),
        formatSize: vi.fn((bytes) => {
          if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
          if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
          return `${bytes} B`;
        }),
      });

      const wrapper = mount(AnalyzeView);
      await wrapper.find("button.btn-primary").trigger("click");
      await flushPromises();

      const legendItems = wrapper.findAll(".legend-item");
      expect(legendItems.length).toBe(3);

      expect(legendItems[0].text()).toContain("Applications");
      expect(legendItems[0].text()).toContain("50.00 GB");

      expect(legendItems[1].text()).toContain("Documents");
      expect(legendItems[1].text()).toContain("30.00 GB");

      expect(legendItems[2].text()).toContain("Others");
      expect(legendItems[2].text()).toContain("20.00 GB");
    });

    it("topDirectories 列表应渲染名称、路径、大小和进度条宽度", async () => {
      const mockScanDisk = vi.fn(() => Promise.resolve(realisticData));
      vi.mocked(useMole).mockReturnValue({
        loading: ref(false),
        error: ref(""),
        scanDisk: mockScanDisk,
        listenOutput: vi.fn(),
        removeOutputListener: vi.fn(),
        formatSize: vi.fn((bytes) => `${bytes} B`),
      });

      const wrapper = mount(AnalyzeView);
      await wrapper.find("button.btn-primary").trigger("click");
      await flushPromises();

      const dirItems = wrapper.findAll(".dir-item");
      expect(dirItems.length).toBe(2);

      expect(dirItems[0].find(".dir-name").text()).toBe("node_modules");
      expect(dirItems[0].find(".dir-path").text()).toBe("/Users/x/project/node_modules");
      expect(dirItems[0].find(".dir-size").text()).toBe("15.2 GB");

      const bar0 = dirItems[0].find(".dir-bar");
      expect(bar0.attributes("style")).toContain("width: 80%");

      expect(dirItems[1].find(".dir-name").text()).toBe("Downloads");
      expect(dirItems[1].find(".dir-path").text()).toBe("/Users/x/Downloads");
      expect(dirItems[1].find(".dir-size").text()).toBe("3.8 GB");

      const bar1 = dirItems[1].find(".dir-bar");
      expect(bar1.attributes("style")).toContain("width: 45%");
    });

    it("usedPercentage computed: totalSize > 0 时应返回 formatSize(totalSize)", async () => {
      const mockScanDisk = vi.fn(() => Promise.resolve(realisticData));
      const mockFormatSize = vi.fn((bytes) => {
        if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
        if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
        return `${bytes} B`;
      });

      vi.mocked(useMole).mockReturnValue({
        loading: ref(false),
        error: ref(""),
        scanDisk: mockScanDisk,
        listenOutput: vi.fn(),
        removeOutputListener: vi.fn(),
        formatSize: mockFormatSize,
      });

      const wrapper = mount(AnalyzeView);
      await wrapper.find("button.btn-primary").trigger("click");
      await flushPromises();

      expect(wrapper.vm.usedPercentage).toBe("11.50 GB");
      expect(mockFormatSize).toHaveBeenCalledWith(12345678901);
    });

    it("scanDisk 出错时应显示错误卡片并清空数据", async () => {
      const mockError = ref("");
      const mockScanDisk = vi.fn(() => {
        mockError.value = "分析失败";
        return Promise.reject(new Error("分析失败"));
      });

      vi.mocked(useMole).mockReturnValue({
        loading: ref(false),
        error: mockError,
        scanDisk: mockScanDisk,
        listenOutput: vi.fn(),
        removeOutputListener: vi.fn(),
        formatSize: vi.fn((bytes) => `${bytes} B`),
      });

      const wrapper = mount(AnalyzeView);
      await wrapper.find("button.btn-primary").trigger("click");
      await flushPromises();

      expect(wrapper.find(".error-card").exists()).toBe(true);
      expect(wrapper.vm.diskData).toEqual([]);
      expect(wrapper.vm.topDirectories).toEqual([]);
      expect(wrapper.find(".donut-chart").exists()).toBe(false);
      expect(wrapper.find(".dirs-list").exists()).toBe(false);
    });

    it("scanDisk 实时输出应通过 liveLines 传递给 LiveOutput", async () => {
      let capturedCallback = null;
      let resolveExec = null;
      const mockListenOutput = vi.fn((cb) => {
        capturedCallback = cb;
      });
      const mockScanDisk = vi.fn(
        () =>
          new Promise((resolve) => {
            resolveExec = resolve;
          }),
      );
      const mockLoading = ref(false);

      vi.mocked(useMole).mockReturnValue({
        loading: mockLoading,
        error: ref(""),
        scanDisk: mockScanDisk,
        listenOutput: mockListenOutput,
        removeOutputListener: vi.fn(),
        formatSize: vi.fn((bytes) => `${bytes} B`),
      });

      const wrapper = mount(AnalyzeView);
      await wrapper.find("button.btn-primary").trigger("click");
      await flushPromises();

      expect(mockListenOutput).toHaveBeenCalled();

      capturedCallback({ data: "Scanning Applications...", type: "stdout" });
      capturedCallback({ data: "Scanning Documents...", type: "stdout" });
      await flushPromises();

      expect(wrapper.vm.liveLines.length).toBe(2);
      expect(wrapper.vm.liveLines[0]).toEqual({ text: "Scanning Applications...", type: "stdout" });
      expect(wrapper.vm.liveLines[1]).toEqual({ text: "Scanning Documents...", type: "stdout" });

      mockLoading.value = true;
      await flushPromises();

      const liveOutput = wrapper.findComponent(LiveOutput);
      expect(liveOutput.exists()).toBe(true);
      expect(liveOutput.props("lines")).toHaveLength(2);

      resolveExec(realisticData);
      await flushPromises();
    });

    it("liveLines 超过 50 行时应截断为最后 50 行", async () => {
      let capturedCallback = null;
      let resolveExec = null;
      const mockListenOutput = vi.fn((cb) => {
        capturedCallback = cb;
      });
      const mockScanDisk = vi.fn(
        () =>
          new Promise((resolve) => {
            resolveExec = resolve;
          }),
      );

      vi.mocked(useMole).mockReturnValue({
        loading: ref(false),
        error: ref(""),
        scanDisk: mockScanDisk,
        listenOutput: mockListenOutput,
        removeOutputListener: vi.fn(),
        formatSize: vi.fn((bytes) => `${bytes} B`),
      });

      const wrapper = mount(AnalyzeView);
      await wrapper.find("button.btn-primary").trigger("click");
      await flushPromises();

      for (let i = 0; i < 55; i++) {
        capturedCallback({ data: `line ${i + 1}`, type: "stdout" });
      }
      await flushPromises();

      expect(wrapper.vm.liveLines.length).toBe(50);
      expect(wrapper.vm.liveLines[0].text).toBe("line 6");
      expect(wrapper.vm.liveLines[49].text).toBe("line 55");

      resolveExec(realisticData);
      await flushPromises();
    });

    it("未扫描时应显示空状态提示文本", () => {
      vi.mocked(useMole).mockReturnValue({
        loading: ref(false),
        error: ref(""),
        scanDisk: vi.fn(() => Promise.resolve({ diskData: [], topDirectories: [], totalSize: 0 })),
        listenOutput: vi.fn(),
        removeOutputListener: vi.fn(),
        formatSize: vi.fn((bytes) => `${bytes} B`),
      });

      const wrapper = mount(AnalyzeView);
      expect(wrapper.find(".empty-card").exists()).toBe(true);
      expect(wrapper.find(".empty-card").text()).toContain("点击「扫描磁盘」分析磁盘空间分布");
    });

    it("scanDisk 最终应移除输出监听器", async () => {
      let capturedCallback = null;
      const mockListenOutput = vi.fn((cb) => {
        capturedCallback = cb;
      });
      const mockRemoveOutputListener = vi.fn();
      const mockScanDisk = vi.fn(() => Promise.resolve(realisticData));

      vi.mocked(useMole).mockReturnValue({
        loading: ref(false),
        error: ref(""),
        scanDisk: mockScanDisk,
        listenOutput: mockListenOutput,
        removeOutputListener: mockRemoveOutputListener,
        formatSize: vi.fn((bytes) => `${bytes} B`),
      });

      const wrapper = mount(AnalyzeView);
      await wrapper.find("button.btn-primary").trigger("click");
      await flushPromises();

      expect(mockListenOutput).toHaveBeenCalledTimes(1);
      expect(mockRemoveOutputListener).toHaveBeenCalledTimes(1);
      expect(mockRemoveOutputListener).toHaveBeenCalledWith(capturedCallback);
    });
  });
});
