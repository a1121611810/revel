import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import OptimizeView from "@/views/OptimizeView.vue";

async function waitForUpdate() {
  await flushPromises();
  await new Promise((r) => setTimeout(r, 10));
}

describe("OptimizeView 初始渲染", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应渲染页面标题"优化"', async () => {
    const wrapper = mount(OptimizeView);
    await flushPromises();
    expect(wrapper.find(".page-title").text()).toBe("优化");
  });

  it("应渲染页面副标题", async () => {
    const wrapper = mount(OptimizeView);
    await flushPromises();
    expect(wrapper.find(".page-subtitle").text()).toBe("运行系统优化任务以提升性能");
  });

  it('应渲染"全部运行"按钮', async () => {
    const wrapper = mount(OptimizeView);
    await flushPromises();
    const btn = wrapper.find(".btn-primary");
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toContain("全部运行");
  });

  it("应渲染 5 个优化任务卡片", async () => {
    const wrapper = mount(OptimizeView);
    await flushPromises();
    const cards = wrapper.findAll(".task-card");
    expect(cards.length).toBe(5);
  });

  it("任务卡片应显示正确的中文名称和描述", async () => {
    const wrapper = mount(OptimizeView);
    await flushPromises();
    const html = wrapper.html();

    const expectedTasks = [
      { name: "重建 Spotlight 索引", desc: "重新建立 macOS Spotlight 搜索索引" },
      { name: "刷新 DNS 缓存", desc: "清除系统 DNS 缓存以解决网络问题" },
      { name: "释放内存", desc: "清理不活跃的内存并压缩内存使用" },
      { name: "修复权限", desc: "验证磁盘权限并尝试修复" },
      { name: "更新启动服务", desc: "刷新系统启动守护进程配置" },
    ];

    for (const task of expectedTasks) {
      expect(html).toContain(task.name);
      expect(html).toContain(task.desc);
    }
  });

  it("所有任务初始状态应为就绪", async () => {
    const wrapper = mount(OptimizeView);
    await flushPromises();
    const badges = wrapper.findAll(".badge-info");
    expect(badges.length).toBe(5);
    for (const badge of badges) {
      expect(badge.text()).toBe("就绪");
    }
  });

  it("应渲染终端输出卡片", async () => {
    const wrapper = mount(OptimizeView);
    await flushPromises();
    expect(wrapper.find(".terminal-card").exists()).toBe(true);
    expect(wrapper.find(".terminal-body").exists()).toBe(true);
  });
});

describe("OptimizeView 平台检查", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("macOS 平台不应显示警告卡片", async () => {
    window.electronAPI.getPlatform.mockResolvedValue("darwin");
    const wrapper = mount(OptimizeView);
    await flushPromises();
    expect(wrapper.find(".warn-card").exists()).toBe(false);
  });

  it("非 macOS 平台应显示警告卡片", async () => {
    window.electronAPI.getPlatform.mockResolvedValue("win32");
    const wrapper = mount(OptimizeView);
    await flushPromises();
    expect(wrapper.find(".warn-card").exists()).toBe(true);
    expect(wrapper.find(".warn-text").text()).toContain("win32");
  });

  it("非 macOS 平台应禁用任务运行按钮", async () => {
    window.electronAPI.getPlatform.mockResolvedValue("linux");
    const wrapper = mount(OptimizeView);
    await flushPromises();
    const runButtons = wrapper.findAll(".task-card .btn-small");
    expect(runButtons.length).toBe(5);
    for (const btn of runButtons) {
      expect(btn.attributes("disabled")).toBeDefined();
    }
  });

  it("macOS 平台任务运行按钮默认不禁用", async () => {
    window.electronAPI.getPlatform.mockResolvedValue("darwin");
    const wrapper = mount(OptimizeView);
    await flushPromises();
    const runButtons = wrapper.findAll(".task-card .btn-small");
    expect(runButtons.length).toBe(5);
    for (const btn of runButtons) {
      expect(btn.attributes("disabled")).toBeUndefined();
    }
  });
});

describe("OptimizeView 单个任务执行", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI.getPlatform.mockResolvedValue("darwin");
    window.electronAPI.moleExecSudo.mockResolvedValue({
      stdout: "ok",
      stderr: "",
      code: 0,
      success: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("点击运行按钮后任务内部状态变为已完成", async () => {
    const wrapper = mount(OptimizeView);
    await flushPromises();

    const firstRunBtn = wrapper.findAll(".task-card .btn-small").at(0);
    await firstRunBtn.trigger("click");
    await waitForUpdate();

    expect(wrapper.vm.tasks[0].status).toBe("done");
  });

  it("Spotlight 任务应调用 mdutil -E /", async () => {
    const wrapper = mount(OptimizeView);
    await flushPromises();

    const runButtons = wrapper.findAll(".task-card .btn-small");
    await runButtons.at(0).trigger("click");
    await waitForUpdate();

    expect(window.electronAPI.moleExecSudo).toHaveBeenCalledWith("mdutil", ["-E", "/"]);
  });

  it("DNS 任务应调用 bash 刷新 DNS", async () => {
    const wrapper = mount(OptimizeView);
    await flushPromises();

    const runButtons = wrapper.findAll(".task-card .btn-small");
    await runButtons.at(1).trigger("click");
    await waitForUpdate();

    expect(window.electronAPI.moleExecSudo).toHaveBeenCalledWith("bash", [
      "-c",
      "dscacheutil -flushcache && killall -HUP mDNSResponder",
    ]);
  });

  it("内存任务应调用 purge", async () => {
    const wrapper = mount(OptimizeView);
    await flushPromises();

    const runButtons = wrapper.findAll(".task-card .btn-small");
    await runButtons.at(2).trigger("click");
    await waitForUpdate();

    expect(window.electronAPI.moleExecSudo).toHaveBeenCalledWith("purge", []);
  });

  it("权限任务应调用 diskutil verifyVolume /", async () => {
    const wrapper = mount(OptimizeView);
    await flushPromises();

    const runButtons = wrapper.findAll(".task-card .btn-small");
    await runButtons.at(3).trigger("click");
    await waitForUpdate();

    expect(window.electronAPI.moleExecSudo).toHaveBeenCalledWith("diskutil", ["verifyVolume", "/"]);
  });

  it("启动服务任务应调用 bash 刷新服务", async () => {
    const wrapper = mount(OptimizeView);
    await flushPromises();

    const runButtons = wrapper.findAll(".task-card .btn-small");
    await runButtons.at(4).trigger("click");
    await waitForUpdate();

    expect(window.electronAPI.moleExecSudo).toHaveBeenCalledWith("bash", [
      "-c",
      "launchctl kickstart -k system/com.apple.locate 2>/dev/null || true; echo 'System services refreshed'",
    ]);
  });

  it("命令失败时任务内部状态应变为出错", async () => {
    window.electronAPI.moleExecSudo.mockResolvedValue({
      stdout: "",
      stderr: "permission denied",
      code: 1,
      success: false,
    });

    const wrapper = mount(OptimizeView);
    await flushPromises();

    const firstRunBtn = wrapper.findAll(".task-card .btn-small").at(0);
    await firstRunBtn.trigger("click");
    await waitForUpdate();

    expect(wrapper.vm.tasks[0].status).toBe("error");
  });

  it("非 macOS 平台直接调用 runTask 应标记为错误", async () => {
    window.electronAPI.getPlatform.mockResolvedValue("win32");
    const wrapper = mount(OptimizeView);
    await flushPromises();

    // Button is disabled on non-darwin, call runTask directly
    await wrapper.vm.runTask(wrapper.vm.tasks[0]);
    await waitForUpdate();

    expect(wrapper.vm.tasks[0].status).toBe("error");
  });
});

describe('OptimizeView "全部运行"按钮交互', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI.getPlatform.mockResolvedValue("darwin");
    window.electronAPI.moleExecSudo.mockResolvedValue({
      stdout: "",
      stderr: "",
      code: 0,
      success: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('点击"全部运行"按钮不应抛出异常', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const wrapper = mount(OptimizeView);
    await flushPromises();
    await wrapper.find(".btn-primary").trigger("click");
    await flushPromises();
    vi.advanceTimersByTime(3000);
    await flushPromises();
    vi.useRealTimers();
  });

  it('"全部运行"应依次调用 5 个不同命令', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const wrapper = mount(OptimizeView);
    await flushPromises();

    await wrapper.find(".btn-primary").trigger("click");
    await flushPromises();

    vi.advanceTimersByTime(3000);
    await flushPromises();

    expect(window.electronAPI.moleExecSudo).toHaveBeenCalledTimes(5);

    const calls = window.electronAPI.moleExecSudo.mock.calls;
    const commands = calls.map((call) => call[0]);

    expect(commands).toContain("mdutil");
    expect(commands).toContain("bash");
    expect(commands).toContain("purge");
    expect(commands).toContain("diskutil");

    vi.useRealTimers();
  });
});

describe("OptimizeView 终端输出", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI.getPlatform.mockResolvedValue("darwin");
    window.electronAPI.moleExecSudo.mockResolvedValue({
      stdout: "command output",
      stderr: "",
      code: 0,
      success: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初始应显示空状态提示", async () => {
    const wrapper = mount(OptimizeView);
    await flushPromises();
    expect(wrapper.find(".terminal-empty").exists()).toBe(true);
    expect(wrapper.find(".terminal-empty").text()).toContain("等待任务运行");
  });

  it("终端标题应正确渲染", async () => {
    const wrapper = mount(OptimizeView);
    await flushPromises();
    expect(wrapper.find(".terminal-header .card-title").text()).toBe("终端输出");
  });

  it("运行任务后终端应显示输出内容", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const wrapper = mount(OptimizeView);
    await flushPromises();

    await wrapper.findAll(".task-card .btn-small").at(0).trigger("click");
    await flushPromises();

    vi.advanceTimersByTime(500);
    await flushPromises();

    expect(wrapper.find(".terminal-empty").exists()).toBe(false);
    const lines = wrapper.findAll(".terminal-line");
    expect(lines.length).toBeGreaterThan(0);

    vi.useRealTimers();
  });

  it("点击清空按钮应清空终端", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const wrapper = mount(OptimizeView);
    await flushPromises();

    await wrapper.findAll(".task-card .btn-small").at(0).trigger("click");
    await flushPromises();
    vi.advanceTimersByTime(500);
    await flushPromises();

    expect(wrapper.findAll(".terminal-line").length).toBeGreaterThan(0);

    await wrapper.find(".terminal-header .btn-small").trigger("click");
    await flushPromises();

    expect(wrapper.findAll(".terminal-line").length).toBe(0);
    expect(wrapper.find(".terminal-empty").exists()).toBe(true);

    vi.useRealTimers();
  });
});
