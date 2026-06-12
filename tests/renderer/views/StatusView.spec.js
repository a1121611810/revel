import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import StatusView from "@/views/StatusView.vue";

// Capture the registered callback so we can simulate push events
let statusCallback = null;

beforeEach(() => {
  statusCallback = null;
  window.electronAPI.onSystemStatus = vi.fn((cb) => {
    statusCallback = cb;
  });
  window.electronAPI.removeSystemStatusListener = vi.fn(() => {
    statusCallback = null;
  });
});

function pushStatusData(data) {
  if (statusCallback) statusCallback(data);
}

const mockStatusData = {
  cpuUsage: 34,
  cpuCores: 10,
  cpuModel: "Apple M4",
  memoryUsage: 68,
  usedMemory: 16.4,
  totalMemory: 24,
  diskUsage: 75,
  usedDisk: 346.6,
  totalDisk: 460.4,
  batteryPercent: 100,
  batteryStatus: "finishing",
  batteryTime: "0:00",
  downloadSpeed: "12.5 MB/s",
  uploadSpeed: "3.2 MB/s",
  gpuModel: "Apple M4",
  gpuUsage: 15,
  gpuMemoryPercent: 20,
  usedGpuMemory: 4,
  totalGpuMemory: 16,
};

function getMiniCard(wrapper, name) {
  return [...wrapper.findAll(".mini-card")].find((c) => c.text().includes(name));
}

describe("StatusView 组件", () => {
  describe("初始渲染", () => {
    it('应渲染标题"系统状态"', () => {
      const wrapper = mount(StatusView);
      expect(wrapper.find("h1.page-title").text()).toBe("系统状态");
    });

    it("应渲染副标题说明文字", () => {
      const wrapper = mount(StatusView);
      expect(wrapper.find("p.page-subtitle").text()).toBe("实时系统信息和资源使用情况");
    });
  });

  describe("概览横幅", () => {
    it("应渲染系统概览横幅", () => {
      const wrapper = mount(StatusView);
      expect(wrapper.find(".overview-banner").exists()).toBe(true);
    });

    it("概览横幅应包含平台、运行时长、系统健康信息", () => {
      const wrapper = mount(StatusView);
      expect(wrapper.text()).toContain("平台");
      expect(wrapper.text()).toContain("运行时长");
      expect(wrapper.text()).toContain("系统健康");
    });
  });

  describe("核心资源卡片", () => {
    it("应渲染 2 个核心大卡片（CPU + 内存）", () => {
      const wrapper = mount(StatusView);
      expect(wrapper.findAll(".metric-card").length).toBe(2);
    });

    it("核心卡片应在 primary-metrics 容器内", () => {
      const wrapper = mount(StatusView);
      expect(wrapper.find(".primary-metrics").exists()).toBe(true);
    });

    it("应显示 CPU 使用率区域", () => {
      const wrapper = mount(StatusView);
      expect(wrapper.text()).toContain("CPU 使用率");
    });

    it("应显示内存占用区域", () => {
      const wrapper = mount(StatusView);
      expect(wrapper.text()).toContain("内存占用");
    });

    it("CPU 卡片应包含环形图和 sparkline", () => {
      const wrapper = mount(StatusView);
      const cpuCard = wrapper.find(".metric-cpu");
      expect(cpuCard.find(".donut-chart").exists()).toBe(true);
      expect(cpuCard.find(".sparkline").exists()).toBe(true);
    });

    it("内存卡片应包含环形图和 sparkline", () => {
      const wrapper = mount(StatusView);
      const memCard = wrapper.find(".metric-mem");
      expect(memCard.find(".donut-chart").exists()).toBe(true);
      expect(memCard.find(".sparkline").exists()).toBe(true);
    });
  });

  describe("辅助资源卡片", () => {
    it("默认可用时渲染 3 个辅助迷你卡片（GPU 隐藏）", () => {
      const wrapper = mount(StatusView);
      expect(wrapper.findAll(".mini-card").length).toBe(3);
    });

    it("GPU 可用时渲染 4 个辅助迷你卡片", async () => {
      const wrapper = mount(StatusView);
      pushStatusData({
        gpuUsage: 15,
        gpuMemoryPercent: 20,
        totalGpuMemory: 16,
        usedGpuMemory: 4,
      });
      await flushPromises();
      expect(wrapper.findAll(".mini-card").length).toBe(4);
    });

    it("辅助卡片应在 secondary-metrics 容器内", () => {
      const wrapper = mount(StatusView);
      expect(wrapper.find(".secondary-metrics").exists()).toBe(true);
    });

    it("应显示磁盘占用区域", () => {
      const wrapper = mount(StatusView);
      expect(wrapper.text()).toContain("磁盘占用");
    });

    it("应显示电池区域", () => {
      const wrapper = mount(StatusView);
      expect(wrapper.text()).toContain("电池");
    });
  });

  describe("网络区域", () => {
    it("应显示网络区域", () => {
      const wrapper = mount(StatusView);
      expect(wrapper.text()).toContain("网络");
    });

    it("应显示下载和上传标签", () => {
      const wrapper = mount(StatusView);
      expect(wrapper.text()).toContain("下载");
      expect(wrapper.text()).toContain("上传");
    });

    it("网络区域应显示下载和上传标签", () => {
      const wrapper = mount(StatusView);
      expect(wrapper.text()).toContain("下载");
      expect(wrapper.text()).toContain("上传");
    });
  });

  describe("GPU 区域", () => {
    it("GPU 可用时显示 GPU 区域", async () => {
      const wrapper = mount(StatusView);
      pushStatusData({
        gpuUsage: 15,
        gpuMemoryPercent: 20,
        totalGpuMemory: 16,
        usedGpuMemory: 4,
      });
      await flushPromises();
      expect(wrapper.text()).toContain("GPU");
    });

    it("GPU 不可用时隐藏卡片", async () => {
      const wrapper = mount(StatusView);
      pushStatusData({ gpuUsage: -1, totalGpuMemory: 0 });
      await flushPromises();
      expect(wrapper.text()).not.toContain("GPU");
    });

    it("GPU 可用时显示使用率和显存", async () => {
      const wrapper = mount(StatusView);
      pushStatusData({
        gpuUsage: 15,
        gpuMemoryPercent: 20,
        totalGpuMemory: 16,
        usedGpuMemory: 4,
      });
      await flushPromises();
      expect(wrapper.text()).toContain("使用率");
      expect(wrapper.text()).toContain("显存");
    });
  });

  describe("DOM 结构", () => {
    it("进度条元素应存在", () => {
      const wrapper = mount(StatusView);
      expect(wrapper.findAll(".mini-progress-track, .gpu-mini-track").length).toBeGreaterThan(0);
    });

    it("应渲染仪表盘容器", () => {
      const wrapper = mount(StatusView);
      expect(wrapper.find(".status-dashboard").exists()).toBe(true);
    });
  });

  describe("推送模式", () => {
    it("挂载时应启动状态监控", () => {
      mount(StatusView);
      expect(window.electronAPI.startStatusMonitor).toHaveBeenCalled();
    });

    it("挂载时应注册 system-status 监听器", () => {
      mount(StatusView);
      expect(window.electronAPI.onSystemStatus).toHaveBeenCalled();
    });

    it("接收到推送数据后应更新 CPU 和内存显示", async () => {
      const wrapper = mount(StatusView);
      pushStatusData(mockStatusData);
      await flushPromises();
      expect(wrapper.text()).toContain("34%");
      expect(wrapper.text()).toContain("68%");
      expect(wrapper.text()).toContain("Apple M4");
    });

    it("接收到推送数据后应更新磁盘和网络显示", async () => {
      const wrapper = mount(StatusView);
      pushStatusData(mockStatusData);
      await flushPromises();
      expect(wrapper.text()).toContain("75%");
      expect(wrapper.text()).toContain("12.5 MB/s");
      expect(wrapper.text()).toContain("3.2 MB/s");
    });

    it("接收到错误推送时应显示错误", async () => {
      const wrapper = mount(StatusView);
      pushStatusData({ error: "采集失败" });
      await flushPromises();
      expect(wrapper.find(".error-card").exists()).toBe(true);
      expect(wrapper.text()).toContain("采集失败");
    });

    it("卸载时应停止状态监控", () => {
      const wrapper = mount(StatusView);
      wrapper.unmount();
      expect(window.electronAPI.stopStatusMonitor).toHaveBeenCalled();
    });

    it("卸载时应移除监听器", () => {
      const wrapper = mount(StatusView);
      wrapper.unmount();
      expect(window.electronAPI.removeSystemStatusListener).toHaveBeenCalled();
    });
  });

  describe("深层交互测试", () => {
    let localStorageMock;

    beforeEach(() => {
      statusCallback = null;
      window.electronAPI.onSystemStatus = vi.fn((cb) => {
        statusCallback = cb;
      });
      window.electronAPI.removeSystemStatusListener = vi.fn(() => {
        statusCallback = null;
      });
      localStorageMock = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      };
      vi.stubGlobal("localStorage", localStorageMock);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    describe("数据源偏好", () => {
      it("loadSourcePrefs() 从 localStorage revel-status-source-modules 读取", () => {
        localStorageMock.getItem.mockReturnValue('{"cpu":"mole"}');
        mount(StatusView);
        expect(localStorageMock.getItem).toHaveBeenCalledWith("revel-status-source-modules");
        expect(localStorageMock.removeItem).toHaveBeenCalledWith("revel-status-source-mode");
      });

      it('旧值 "global" 迁移为 "native"', async () => {
        localStorageMock.getItem.mockReturnValue('{"cpu":"global"}');
        const wrapper = mount(StatusView);
        await flushPromises();
        const cpuNativeBtn = wrapper.findAll(".metric-cpu .segmented-btn")[0];
        expect(cpuNativeBtn.classes()).toContain("active");
      });

      it('旧值 "auto" 迁移为 "native"', async () => {
        localStorageMock.getItem.mockReturnValue('{"memory":"auto"}');
        const wrapper = mount(StatusView);
        await flushPromises();
        const memNativeBtn = wrapper.findAll(".metric-mem .segmented-btn")[0];
        expect(memNativeBtn.classes()).toContain("active");
      });

      it("无 localStorage 数据时默认为全部原生", async () => {
        localStorageMock.getItem.mockReturnValue(null);
        const wrapper = mount(StatusView);
        await flushPromises();
        expect(wrapper.find(".source-status-pill.status-native").exists()).toBe(true);
      });

      it("saveSourcePrefs() 写入 localStorage", async () => {
        localStorageMock.getItem.mockReturnValue(null);
        const wrapper = mount(StatusView);
        await flushPromises();
        const cpuMoleBtn = wrapper.findAll(".metric-cpu .segmented-btn")[1];
        await cpuMoleBtn.trigger("click");
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "revel-status-source-modules",
          expect.stringContaining('"cpu":"mole"'),
        );
      });

      it("setModuleSource('cpu', 'mole') 修改 cpu 并保存", async () => {
        localStorageMock.getItem.mockReturnValue(null);
        const wrapper = mount(StatusView);
        await flushPromises();
        const cpuMoleBtn = wrapper.findAll(".metric-cpu .segmented-btn")[1];
        await cpuMoleBtn.trigger("click");
        expect(cpuMoleBtn.classes()).toContain("active");
        expect(localStorageMock.setItem).toHaveBeenCalled();
      });

      it("setAllModules('native') 设置全部模块为原生并保存", async () => {
        localStorageMock.getItem.mockReturnValue('{"cpu":"mole","memory":"mole"}');
        const wrapper = mount(StatusView);
        await flushPromises();
        const setAllNativeBtn = wrapper.findAll(".source-action-btn")[0];
        await setAllNativeBtn.trigger("click");
        expect(wrapper.find(".source-status-pill.status-native").exists()).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "revel-status-source-modules",
          expect.stringContaining('"cpu":"native"'),
        );
      });

      it("globalSourceMode: 全部原生 → native", async () => {
        localStorageMock.getItem.mockReturnValue(null);
        const wrapper = mount(StatusView);
        await flushPromises();
        expect(wrapper.find(".source-status-pill").classes()).toContain("status-native");
      });

      it("globalSourceMode: 全部 mole → mole", async () => {
        localStorageMock.getItem.mockReturnValue(
          '{"cpu":"mole","memory":"mole","disk":"mole","battery":"mole","network":"mole"}',
        );
        const wrapper = mount(StatusView);
        await flushPromises();
        expect(wrapper.find(".source-status-pill").classes()).toContain("status-mole");
      });

      it("globalSourceMode: 混合 → customized", async () => {
        localStorageMock.getItem.mockReturnValue('{"cpu":"mole","memory":"native"}');
        const wrapper = mount(StatusView);
        await flushPromises();
        expect(wrapper.find(".source-status-pill").classes()).toContain("status-customized");
      });
    });

    describe("applyStatusData", () => {
      it("error 数据设置 error.value", async () => {
        const wrapper = mount(StatusView);
        pushStatusData({ error: "测试错误" });
        await flushPromises();
        expect(wrapper.find(".error-card").exists()).toBe(true);
        expect(wrapper.find(".error-text").text()).toBe("测试错误");
      });

      it("非双源时直接读取所有字段", async () => {
        const wrapper = mount(StatusView);
        pushStatusData({
          cpuUsage: 42,
          memoryUsage: 55,
          diskUsage: 70,
          batteryPercent: 80,
          downloadSpeed: "10 MB/s",
          uploadSpeed: "5 MB/s",
        });
        await flushPromises();
        expect(wrapper.find(".metric-cpu .metric-sub").text()).toBe("42%");
        expect(wrapper.find(".metric-mem .metric-sub").text()).toBe("55%");
        const diskCard = getMiniCard(wrapper, "磁盘占用");
        expect(diskCard.find(".mini-value").text()).toBe("70%");
        const netCard = getMiniCard(wrapper, "网络");
        expect(netCard.text()).toContain("10 MB/s");
        expect(netCard.text()).toContain("5 MB/s");
      });

      it("双源 + cpu=native 时 CPU 取 data.native", async () => {
        const wrapper = mount(StatusView);
        pushStatusData({
          mole: {
            cpuUsage: 10,
            memoryUsage: 20,
            diskUsage: 30,
            batteryPercent: 40,
            downloadSpeed: "",
            uploadSpeed: "",
          },
          native: {
            cpuUsage: 50,
            memoryUsage: 60,
            diskUsage: 70,
            batteryPercent: 80,
            downloadSpeed: "",
            uploadSpeed: "",
          },
        });
        await flushPromises();
        expect(wrapper.find(".metric-cpu .metric-sub").text()).toBe("50%");
      });

      it("双源 + cpu=mole 时 CPU 取 data.mole", async () => {
        const wrapper = mount(StatusView);
        const cpuMoleBtn = wrapper.findAll(".metric-cpu .segmented-btn")[1];
        await cpuMoleBtn.trigger("click");
        pushStatusData({
          mole: {
            cpuUsage: 10,
            memoryUsage: 20,
            diskUsage: 30,
            batteryPercent: 40,
            downloadSpeed: "",
            uploadSpeed: "",
          },
          native: {
            cpuUsage: 50,
            memoryUsage: 60,
            diskUsage: 70,
            batteryPercent: 80,
            downloadSpeed: "",
            uploadSpeed: "",
          },
        });
        await flushPromises();
        expect(wrapper.find(".metric-cpu .metric-sub").text()).toBe("10%");
      });

      it("双源 + memory=native 时 memory 取 data.native", async () => {
        const wrapper = mount(StatusView);
        pushStatusData({
          mole: {
            cpuUsage: 10,
            memoryUsage: 20,
            diskUsage: 30,
            batteryPercent: 40,
            downloadSpeed: "",
            uploadSpeed: "",
          },
          native: {
            cpuUsage: 50,
            memoryUsage: 60,
            diskUsage: 70,
            batteryPercent: 80,
            downloadSpeed: "",
            uploadSpeed: "",
          },
        });
        await flushPromises();
        expect(wrapper.find(".metric-mem .metric-sub").text()).toBe("60%");
      });

      it("双源 + disk=mole 时 disk 取 data.mole", async () => {
        const wrapper = mount(StatusView);
        const diskCard = getMiniCard(wrapper, "磁盘占用");
        const diskMoleBtn = diskCard.findAll(".segmented-btn")[1];
        await diskMoleBtn.trigger("click");
        pushStatusData({
          mole: {
            cpuUsage: 10,
            memoryUsage: 20,
            diskUsage: 30,
            batteryPercent: 40,
            downloadSpeed: "",
            uploadSpeed: "",
          },
          native: {
            cpuUsage: 50,
            memoryUsage: 60,
            diskUsage: 70,
            batteryPercent: 80,
            downloadSpeed: "",
            uploadSpeed: "",
          },
        });
        await flushPromises();
        expect(diskCard.find(".mini-value").text()).toBe("30%");
      });

      it("双源 + battery=native 时 battery 取 data.native", async () => {
        const wrapper = mount(StatusView);
        pushStatusData({
          mole: {
            cpuUsage: 10,
            memoryUsage: 20,
            diskUsage: 30,
            batteryPercent: 40,
            downloadSpeed: "",
            uploadSpeed: "",
          },
          native: {
            cpuUsage: 50,
            memoryUsage: 60,
            diskUsage: 70,
            batteryPercent: 80,
            downloadSpeed: "",
            uploadSpeed: "",
          },
        });
        await flushPromises();
        const batteryCard = getMiniCard(wrapper, "电池");
        expect(batteryCard.find(".mini-value").text()).toBe("80%");
      });

      it("双源 + network=mole 时 network 取 data.mole", async () => {
        const wrapper = mount(StatusView);
        const netCard = getMiniCard(wrapper, "网络");
        const netMoleBtn = netCard.findAll(".segmented-btn")[1];
        await netMoleBtn.trigger("click");
        pushStatusData({
          mole: {
            cpuUsage: 10,
            memoryUsage: 20,
            diskUsage: 30,
            batteryPercent: 40,
            downloadSpeed: "1 MB/s",
            uploadSpeed: "2 MB/s",
          },
          native: {
            cpuUsage: 50,
            memoryUsage: 60,
            diskUsage: 70,
            batteryPercent: 80,
            downloadSpeed: "10 MB/s",
            uploadSpeed: "20 MB/s",
          },
        });
        await flushPromises();
        expect(netCard.text()).toContain("1 MB/s");
        expect(netCard.text()).toContain("2 MB/s");
      });
    });

    describe("GPU 渲染", () => {
      it("gpuUsage >= 0 && totalGpuMemory > 0 时 GPU 卡片渲染", async () => {
        const wrapper = mount(StatusView);
        pushStatusData({ gpuUsage: 15, totalGpuMemory: 16 });
        await flushPromises();
        expect(wrapper.findAll(".mini-card").length).toBe(4);
        expect(wrapper.text()).toContain("GPU");
      });

      it("GPU 不可用时 GPU 卡片不渲染且存在 .gpu-hidden 类", async () => {
        const wrapper = mount(StatusView);
        pushStatusData({ gpuUsage: -1, totalGpuMemory: 0 });
        await flushPromises();
        expect(wrapper.find(".secondary-metrics").classes()).toContain("gpu-hidden");
        expect(wrapper.text()).not.toContain("GPU");
      });
    });

    describe("健康分数", () => {
      it('msg="Good" → 优秀', async () => {
        const wrapper = mount(StatusView);
        pushStatusData({ healthScoreMsg: "Good" });
        await flushPromises();
        expect(wrapper.find(".overview-value.health-good").text()).toBe("优秀");
      });

      it('msg="Warning" → 警告', async () => {
        const wrapper = mount(StatusView);
        pushStatusData({ healthScoreMsg: "Warning" });
        await flushPromises();
        expect(wrapper.find(".overview-value.health-ok").text()).toBe("警告");
      });

      it('msg="Critical" → 严重', async () => {
        const wrapper = mount(StatusView);
        pushStatusData({ healthScoreMsg: "Critical" });
        await flushPromises();
        expect(wrapper.find(".overview-value.health-bad").text()).toBe("严重");
      });

      it("无 msg + score≥80 → 优秀; ≥60 → 良好; ≥40 → 一般; <40 → 拥堵", async () => {
        const wrapper = mount(StatusView);
        pushStatusData({ healthScore: 85, healthScoreMsg: "" });
        await flushPromises();
        expect(wrapper.text()).toContain("优秀");

        pushStatusData({ healthScore: 65, healthScoreMsg: "" });
        await flushPromises();
        expect(wrapper.text()).toContain("良好");

        pushStatusData({ healthScore: 45, healthScoreMsg: "" });
        await flushPromises();
        expect(wrapper.text()).toContain("一般");

        pushStatusData({ healthScore: 30, healthScoreMsg: "" });
        await flushPromises();
        expect(wrapper.text()).toContain("拥堵");
      });

      it("healthClass 与 msg/score 匹配正确的 CSS 类", async () => {
        const wrapper = mount(StatusView);
        pushStatusData({ healthScoreMsg: "Good" });
        await flushPromises();
        expect(wrapper.find(".overview-icon-wrap.health").classes()).toContain("health-good");

        pushStatusData({ healthScoreMsg: "Warning" });
        await flushPromises();
        expect(wrapper.find(".overview-icon-wrap.health").classes()).toContain("health-ok");

        pushStatusData({ healthScoreMsg: "Critical" });
        await flushPromises();
        expect(wrapper.find(".overview-icon-wrap.health").classes()).toContain("health-bad");

        pushStatusData({ healthScoreMsg: "", healthScore: 50 });
        await flushPromises();
        expect(wrapper.find(".overview-icon-wrap.health").classes()).toContain("health-warn");
      });
    });

    describe("电池", () => {
      it("status + time → 放电中 · 2:41 剩余", async () => {
        const wrapper = mount(StatusView);
        pushStatusData({ batteryStatus: "放电中", batteryTime: "2:41 剩余" });
        await flushPromises();
        const batteryCard = getMiniCard(wrapper, "电池");
        expect(batteryCard.text()).toContain("放电中 · 2:41 剩余");
      });

      it("仅有 status 时返回 status", async () => {
        const wrapper = mount(StatusView);
        pushStatusData({ batteryStatus: "充电中", batteryTime: "" });
        await flushPromises();
        const batteryCard = getMiniCard(wrapper, "电池");
        expect(batteryCard.text()).toContain("充电中");
        expect(batteryCard.find(".mini-detail").text()).toBe("充电中");
      });

      it("两者为空时返回 未知", async () => {
        const wrapper = mount(StatusView);
        pushStatusData({ batteryStatus: "", batteryTime: "" });
        await flushPromises();
        const batteryCard = getMiniCard(wrapper, "电池");
        expect(batteryCard.find(".mini-detail").text()).toBe("未知");
      });

      it("percent < 20 时为 danger 样式", async () => {
        const wrapper = mount(StatusView);
        pushStatusData({ batteryPercent: 15 });
        await flushPromises();
        const batteryCard = getMiniCard(wrapper, "电池");
        const iconBox = batteryCard.find(".mini-icon-box");
        const style = iconBox.attributes("style");
        expect(style).toContain("var(--colorDangerBackground1)");
        expect(style).toContain("var(--colorDangerForeground1)");
      });

      it("percent >= 20 时为 warning 样式", async () => {
        const wrapper = mount(StatusView);
        pushStatusData({ batteryPercent: 25 });
        await flushPromises();
        const batteryCard = getMiniCard(wrapper, "电池");
        const iconBox = batteryCard.find(".mini-icon-box");
        const style = iconBox.attributes("style");
        expect(style).toContain("var(--colorWarningBackground1)");
        expect(style).toContain("var(--colorWarningForeground1)");
      });
    });

    describe("环形图 / Sparkline", () => {
      const R = 60;
      const CIRCUMFERENCE = 2 * Math.PI * R;

      it("cpuOffset = CIRCUMFERENCE - (cpuUsage/100)*CIRCUMFERENCE", async () => {
        const wrapper = mount(StatusView);
        pushStatusData({ cpuUsage: 50 });
        await flushPromises();
        const circle = wrapper.find(".metric-cpu .donut-chart circle:nth-of-type(2)");
        const expected = CIRCUMFERENCE - (50 / 100) * CIRCUMFERENCE;
        expect(Number(circle.attributes("stroke-dashoffset"))).toBeCloseTo(expected, 5);
      });

      it("memOffset 公式相同", async () => {
        const wrapper = mount(StatusView);
        pushStatusData({ memoryUsage: 75 });
        await flushPromises();
        const circle = wrapper.find(".metric-mem .donut-chart circle:nth-of-type(2)");
        const expected = CIRCUMFERENCE - (75 / 100) * CIRCUMFERENCE;
        expect(Number(circle.attributes("stroke-dashoffset"))).toBeCloseTo(expected, 5);
      });

      it("buildSparkline 路径包含 M/L 命令且坐标正确", () => {
        const wrapper = mount(StatusView);
        const result = wrapper.vm.buildSparkline([0, 50, 100]);
        expect(result.line).toBe("M0.0,40.0 L140.0,20.0 L280.0,0.0");
      });

      it("面积路径以 Z 闭合", () => {
        const wrapper = mount(StatusView);
        const result = wrapper.vm.buildSparkline([0, 50, 100]);
        expect(result.area).toBe("M0.0,40.0 L140.0,20.0 L280.0,0.0 L280,40 L0,40 Z");
      });

      it("历史记录 push+shift 保持 30 个样本", async () => {
        const wrapper = mount(StatusView);
        for (let i = 1; i <= 31; i++) {
          wrapper.vm.applyStatusData({ cpuUsage: i });
          await flushPromises();
        }
        expect(wrapper.vm.cpuHistory.length).toBe(30);
        expect(wrapper.vm.cpuHistory[0]).toBe(2);
        expect(wrapper.vm.cpuHistory[29]).toBe(31);
      });
    });

    describe("其他计算属性/数据", () => {
      it("platformInfo: platform + osVersion → darwin · 14.0", async () => {
        const wrapper = mount(StatusView);
        pushStatusData({ platform: "darwin", osVersion: "14.0" });
        await flushPromises();
        const overviewValues = wrapper.findAll(".overview-value");
        expect(overviewValues[0].text()).toBe("darwin · 14.0");
      });

      it("无 platform/osVersion 时回退到 cpuModel", async () => {
        const wrapper = mount(StatusView);
        pushStatusData({ platform: "", osVersion: "", cpuModel: "Intel Core i7" });
        await flushPromises();
        const overviewValues = wrapper.findAll(".overview-value");
        expect(overviewValues[0].text()).toBe("Intel Core i7");
      });

      it("uptimeText 使用 data.uptimeText", async () => {
        const wrapper = mount(StatusView);
        pushStatusData({ uptimeText: "3 days, 2 hours" });
        await flushPromises();
        expect(wrapper.text()).toContain("3 days, 2 hours");
      });

      it("lastDualData 在双源时存储完整数据", async () => {
        const wrapper = mount(StatusView);
        const dualData = {
          mole: { cpuUsage: 10 },
          native: { cpuUsage: 20 },
        };
        pushStatusData(dualData);
        await flushPromises();
        expect(wrapper.find(".source-notice-bar").exists()).toBe(true);
      });

      it("onMounted 调用 startStatusMonitor + onSystemStatus", () => {
        mount(StatusView);
        expect(window.electronAPI.startStatusMonitor).toHaveBeenCalled();
        expect(window.electronAPI.onSystemStatus).toHaveBeenCalled();
      });

      it("onUnmounted 调用 stopStatusMonitor + removeSystemStatusListener", () => {
        const wrapper = mount(StatusView);
        wrapper.unmount();
        expect(window.electronAPI.stopStatusMonitor).toHaveBeenCalled();
        expect(window.electronAPI.removeSystemStatusListener).toHaveBeenCalled();
      });

      it("cpuUsage 变化触发 pulseElement", async () => {
        const wrapper = mount(StatusView);
        await flushPromises();
        wrapper.vm.applyStatusData({ cpuUsage: 50 });
        await flushPromises();
        const cpuSub = wrapper.find(".metric-cpu .metric-sub").element;
        expect(cpuSub.style.transform).toBe("scale(1.08)");
      });

      it("memoryUsage 变化触发 pulseElement", async () => {
        const wrapper = mount(StatusView);
        await flushPromises();
        wrapper.vm.applyStatusData({ memoryUsage: 50 });
        await flushPromises();
        const memSub = wrapper.find(".metric-mem .metric-sub").element;
        expect(memSub.style.transform).toBe("scale(1.08)");
      });

      it("gpuUsageText: <0 → '--'; >=0 → 'x%'", async () => {
        const wrapper = mount(StatusView);
        wrapper.vm.applyStatusData({ gpuUsage: -1, totalGpuMemory: 16 });
        expect(wrapper.vm.gpuUsageText).toBe("--");

        wrapper.vm.applyStatusData({ gpuUsage: 45, totalGpuMemory: 16 });
        expect(wrapper.vm.gpuUsageText).toBe("45%");
      });

      it("gpuDetailText: totalGpuMemory>0 → x / y GB 显存", async () => {
        const wrapper = mount(StatusView);
        wrapper.vm.applyStatusData({ usedGpuMemory: 4, totalGpuMemory: 16, gpuUsage: 1 });
        expect(wrapper.vm.gpuDetailText).toBe("4 / 16 GB 显存");
      });

      it("gpuDetailText: totalGpuMemory=0 && gpuModel 存在 → 集成显卡", async () => {
        const wrapper = mount(StatusView);
        wrapper.vm.applyStatusData({ gpuModel: "Apple M4", totalGpuMemory: 0, gpuUsage: 0 });
        expect(wrapper.vm.gpuDetailText).toBe("集成显卡");
      });

      it("gpuDetailText: 两者为空 → '--'", async () => {
        const wrapper = mount(StatusView);
        wrapper.vm.applyStatusData({ gpuModel: "", totalGpuMemory: 0, gpuUsage: 0 });
        expect(wrapper.vm.gpuDetailText).toBe("--");
      });
    });
  });
});
