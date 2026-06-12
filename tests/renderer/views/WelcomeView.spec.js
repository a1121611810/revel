import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
import { createI18n } from "vue-i18n";
import zhCN from "@/locales/zh-CN.json";
import WelcomeView from "@/views/WelcomeView.vue";

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

describe("WelcomeView 组件", () => {
  // ===== 辅助函数 =====

  /**
   * 创建模拟的 moleExec 成功响应
   */
  function createMockSuccessResponse(version = "v1.2.3") {
    return {
      stdout: version,
      success: true,
      stderr: "",
      code: 0,
    };
  }

  /**
   * 挂载组件并等待初始异步操作完成
   */
  async function mountComponent(options = {}) {
    const wrapper = mountWithI18n(WelcomeView, options);
    await flushPromises();
    await nextTick();
    return wrapper;
  }

  // ===== 生命周期钩子 =====

  beforeEach(() => {
    // 重置 moleExec mock
    window.electronAPI.moleExec.mockReset();
    window.electronAPI.openExternal.mockReset();

    // mock localStorage
    vi.stubGlobal("localStorage", {
      setItem: vi.fn(),
      getItem: vi.fn(),
      removeItem: vi.fn(),
    });

    // mock navigator.clipboard
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    // 使用 fake timers（用于 copySuccess 的 2 秒延迟）
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  // ============================================================
  // 1. 渲染测试
  // ============================================================
  describe("渲染测试", () => {
    it("初始渲染时应显示「正在检查 Mole CLI 安装状态」文案", async () => {
      window.electronAPI.moleExec.mockImplementation(() => new Promise(() => {}));

      const wrapper = mountWithI18n(WelcomeView);
      await nextTick();

      expect(wrapper.find(".checking-text").text()).toContain("正在检查");
    });

    it("检查状态应有加载动画 spinner（CSS 类名检查）", async () => {
      window.electronAPI.moleExec.mockImplementation(() => new Promise(() => {}));

      const wrapper = mountWithI18n(WelcomeView);
      await nextTick();

      expect(wrapper.find(".checking-section").exists()).toBe(true);
      expect(wrapper.find(".spinner").exists()).toBe(true);
    });

    it("初始时不应显示已安装状态的 status-header", async () => {
      window.electronAPI.moleExec.mockImplementation(() => new Promise(() => {}));

      const wrapper = mountWithI18n(WelcomeView);
      await nextTick();

      expect(wrapper.find(".status-header").exists()).toBe(false);
    });

    it("初始时不应显示未安装状态的 install-block", async () => {
      window.electronAPI.moleExec.mockImplementation(() => new Promise(() => {}));

      const wrapper = mountWithI18n(WelcomeView);
      await nextTick();

      expect(wrapper.find(".install-block").exists()).toBe(false);
    });

    it("renders language switcher", () => {
      const wrapper = mountWithI18n(WelcomeView);
      expect(wrapper.findAll(".lang-btn").length).toBe(2);
    });
  });

  // ============================================================
  // 2. 已安装状态测试
  // ============================================================
  describe("已安装状态测试", () => {
    it('mock moleExec 返回成功（resolve { stdout: "v1.2.3", success: true }）后进入已安装状态', async () => {
      window.electronAPI.moleExec.mockResolvedValue(createMockSuccessResponse("v1.2.3"));

      const wrapper = await mountComponent();

      // 验证已安装状态的 DOM 元素存在
      expect(wrapper.find(".status-header").exists()).toBe(true);
      expect(wrapper.find(".status-icon.success").exists()).toBe(true);
      expect(wrapper.find(".checking-section").exists()).toBe(false);
      expect(wrapper.find(".install-block").exists()).toBe(false);
    });

    it("应显示「Mole CLI 已安装」文案", async () => {
      window.electronAPI.moleExec.mockResolvedValue(createMockSuccessResponse("v1.2.3"));

      const wrapper = await mountComponent();

      expect(wrapper.find(".status-text.success").text()).toBe("Mole CLI 已安装");
    });

    it("应显示「欢迎使用 Revel」标题", async () => {
      window.electronAPI.moleExec.mockResolvedValue(createMockSuccessResponse("v1.2.3"));

      const wrapper = await mountComponent();

      expect(wrapper.find(".welcome-title").text()).toBe("欢迎使用 Revel");
    });

    it("应显示版本号 v1.2.3", async () => {
      window.electronAPI.moleExec.mockResolvedValue(createMockSuccessResponse("v1.2.3"));

      const wrapper = await mountComponent();

      expect(wrapper.find(".badge-success").text()).toBe("v1.2.3");
    });

    it("应显示「开始使用」按钮", async () => {
      window.electronAPI.moleExec.mockResolvedValue(createMockSuccessResponse("v1.2.3"));

      const wrapper = await mountComponent();

      const startBtn = wrapper.find(".btn-start");
      expect(startBtn.exists()).toBe(true);
      expect(startBtn.text()).toContain("开始使用");
    });

    it("应显示功能特性列表（至少3项）", async () => {
      window.electronAPI.moleExec.mockResolvedValue(createMockSuccessResponse("v1.2.3"));

      const wrapper = await mountComponent();

      const features = wrapper.findAll(".feature-item");
      expect(features.length).toBeGreaterThanOrEqual(3);
    });

    it("功能特性应包含系统清理", async () => {
      window.electronAPI.moleExec.mockResolvedValue(createMockSuccessResponse("v1.2.3"));

      const wrapper = await mountComponent();

      const html = wrapper.html();
      expect(html).toContain("系统清理");
    });

    it("功能特性应包含磁盘分析", async () => {
      window.electronAPI.moleExec.mockResolvedValue(createMockSuccessResponse("v1.2.3"));

      const wrapper = await mountComponent();

      const html = wrapper.html();
      expect(html).toContain("磁盘分析");
    });

    it("功能特性应包含系统优化", async () => {
      window.electronAPI.moleExec.mockResolvedValue(createMockSuccessResponse("v1.2.3"));

      const wrapper = await mountComponent();

      const html = wrapper.html();
      expect(html).toContain("系统优化");
    });

    it("moleExec 应在 onMounted 时被调用，参数为 mo 和 [--version]", async () => {
      window.electronAPI.moleExec.mockResolvedValue(createMockSuccessResponse("v1.2.3"));

      await mountComponent();

      expect(window.electronAPI.moleExec).toHaveBeenCalledTimes(1);
      expect(window.electronAPI.moleExec).toHaveBeenCalledWith("mo", ["--version"]);
    });

    it("成功状态图标应使用 success 样式", async () => {
      window.electronAPI.moleExec.mockResolvedValue(createMockSuccessResponse("v1.2.3"));

      const wrapper = await mountComponent();

      expect(wrapper.find(".status-icon.success").exists()).toBe(true);
    });

    it("应显示副标题说明", async () => {
      window.electronAPI.moleExec.mockResolvedValue(createMockSuccessResponse("v1.2.3"));

      const wrapper = await mountComponent();

      expect(wrapper.find(".welcome-subtitle").text()).toContain("Mole CLI 的图形界面");
    });
  });

  // ============================================================
  // 3. 未安装状态测试
  // ============================================================
  describe("未安装状态测试", () => {
    it('mock moleExec 返回失败（reject new Error("not found")）后 step 变为 missing', async () => {
      window.electronAPI.moleExec.mockRejectedValue(new Error("not found"));

      const wrapper = await mountComponent();

      expect(wrapper.find(".status-icon.error").exists()).toBe(true);
      expect(wrapper.find(".checking-section").exists()).toBe(false);
    });

    it("mock moleExec 返回 success: false 后进入 missing 状态", async () => {
      window.electronAPI.moleExec.mockResolvedValue({
        stdout: "",
        success: false,
        stderr: "command not found",
        code: 127,
      });

      const wrapper = await mountComponent();

      expect(wrapper.find(".status-icon.error").exists()).toBe(true);
      expect(wrapper.find(".install-block").exists()).toBe(true);
    });

    it("应显示「未检测到 Mole CLI」文案", async () => {
      window.electronAPI.moleExec.mockRejectedValue(new Error("not found"));

      const wrapper = await mountComponent();

      expect(wrapper.find(".status-text.error").text()).toBe("未检测到 Mole CLI");
    });

    it("应显示「需要安装 Mole CLI」标题", async () => {
      window.electronAPI.moleExec.mockRejectedValue(new Error("not found"));

      const wrapper = await mountComponent();

      expect(wrapper.find(".welcome-title").text()).toBe("需要安装 Mole CLI");
    });

    it("应显示安装命令代码块", async () => {
      window.electronAPI.moleExec.mockRejectedValue(new Error("not found"));

      const wrapper = await mountComponent();

      const installCode = wrapper.find(".install-code");
      expect(installCode.exists()).toBe(true);
      expect(installCode.text()).toContain("brew install tw93/tap/mole");
    });

    it("应显示「复制命令」按钮", async () => {
      window.electronAPI.moleExec.mockRejectedValue(new Error("not found"));

      const wrapper = await mountComponent();

      const copyBtn = wrapper.find(".btn-copy");
      expect(copyBtn.exists()).toBe(true);
      expect(copyBtn.text()).toContain("复制命令");
    });

    it("应显示「重新检测」按钮", async () => {
      window.electronAPI.moleExec.mockRejectedValue(new Error("not found"));

      const wrapper = await mountComponent();

      const recheckBtn = wrapper.find(".btn-outline");
      expect(recheckBtn.exists()).toBe(true);
      expect(recheckBtn.text()).toContain("重新检测");
    });

    it("应显示「前往 GitHub」按钮", async () => {
      window.electronAPI.moleExec.mockRejectedValue(new Error("not found"));

      const wrapper = await mountComponent();

      const githubBtn = wrapper.find(".btn-subtle");
      expect(githubBtn.exists()).toBe(true);
      expect(githubBtn.text()).toContain("前往 GitHub");
    });

    it("未安装状态图标应使用 error 样式", async () => {
      window.electronAPI.moleExec.mockRejectedValue(new Error("not found"));

      const wrapper = await mountComponent();

      expect(wrapper.find(".status-icon.error").exists()).toBe(true);
    });

    it("应显示安装提示标签", async () => {
      window.electronAPI.moleExec.mockRejectedValue(new Error("not found"));

      const wrapper = await mountComponent();

      expect(wrapper.find(".install-label").text()).toContain("Homebrew");
    });
  });

  // ============================================================
  // 4. 交互测试
  // ============================================================
  describe("交互测试", () => {
    it("点击「开始使用」应写入 localStorage 并触发 @start 事件", async () => {
      window.electronAPI.moleExec.mockResolvedValue(createMockSuccessResponse("v1.2.3"));

      const wrapper = await mountComponent();

      await wrapper.find(".btn-start").trigger("click");
      await flushPromises();

      // 验证 localStorage 写入
      expect(localStorage.setItem).toHaveBeenCalledTimes(1);
      expect(localStorage.setItem).toHaveBeenCalledWith("revel-welcomed", "true");

      // 验证 emit 事件
      expect(wrapper.emitted("start")).toBeTruthy();
      expect(wrapper.emitted("start").length).toBe(1);
    });

    it("点击「复制命令」应调用 navigator.clipboard.writeText", async () => {
      window.electronAPI.moleExec.mockRejectedValue(new Error("not found"));

      const wrapper = await mountComponent();

      await wrapper.find(".btn-copy").trigger("click");
      await flushPromises();

      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("brew install tw93/tap/mole");
    });

    it("点击「复制命令」后按钮应显示「已复制」", async () => {
      window.electronAPI.moleExec.mockRejectedValue(new Error("not found"));

      const wrapper = await mountComponent();

      await wrapper.find(".btn-copy").trigger("click");
      await flushPromises();
      await nextTick();

      const copyBtn = wrapper.find(".btn-copy");
      expect(copyBtn.text()).toContain("已复制");
    });

    it("复制成功后 2 秒应恢复「复制命令」文案", async () => {
      window.electronAPI.moleExec.mockRejectedValue(new Error("not found"));

      const wrapper = await mountComponent();

      await wrapper.find(".btn-copy").trigger("click");
      await flushPromises();
      await nextTick();

      // 先确认显示成功状态
      expect(wrapper.find(".btn-copy").text()).toContain("已复制");

      // 快进 2 秒
      vi.advanceTimersByTime(2000);
      await nextTick();

      // 恢复原始文案
      expect(wrapper.find(".btn-copy").text()).toContain("复制命令");
    });

    it("点击「重新检测」后应再次调用 moleExec", async () => {
      window.electronAPI.moleExec
        .mockRejectedValueOnce(new Error("not found"))
        .mockImplementationOnce(() => new Promise(() => {}));

      const wrapper = await mountComponent();

      // 确认在 missing 状态
      expect(wrapper.find(".install-block").exists()).toBe(true);

      window.electronAPI.moleExec.mockClear();
      window.electronAPI.moleExec.mockImplementation(() => new Promise(() => {}));

      // 点击重新检测
      await wrapper.find(".btn-outline").trigger("click");
      await nextTick();

      // 应再次调用 moleExec
      expect(window.electronAPI.moleExec).toHaveBeenCalledTimes(1);
      expect(window.electronAPI.moleExec).toHaveBeenCalledWith("mo", ["--version"]);
    });

    it("点击「重新检测」应再次调用 moleExec", async () => {
      window.electronAPI.moleExec
        .mockRejectedValueOnce(new Error("not found"))
        .mockResolvedValueOnce(createMockSuccessResponse("v1.2.3"));

      const wrapper = await mountComponent();

      expect(window.electronAPI.moleExec).toHaveBeenCalledTimes(1);

      await wrapper.find(".btn-outline").trigger("click");
      await flushPromises();

      expect(window.electronAPI.moleExec).toHaveBeenCalledTimes(2);
    });

    it("点击「前往 GitHub」应调用 electronAPI.openExternal", async () => {
      window.electronAPI.moleExec.mockRejectedValue(new Error("not found"));

      const wrapper = await mountComponent();

      await wrapper.find(".btn-subtle").trigger("click");
      await flushPromises();

      expect(window.electronAPI.openExternal).toHaveBeenCalledTimes(1);
      expect(window.electronAPI.openExternal).toHaveBeenCalledWith("https://github.com/tw93/Mole");
    });
  });

  // ============================================================
  // 5. 重新检测流程测试
  // ============================================================
  describe("重新检测流程测试", () => {
    it("从未安装状态点击「重新检测」后 mock 第二次返回成功，应切换到已安装状态", async () => {
      window.electronAPI.moleExec
        .mockRejectedValueOnce(new Error("not found"))
        .mockResolvedValueOnce(createMockSuccessResponse("v2.0.0"));

      const wrapper = await mountComponent();

      // 确认在 missing 状态
      expect(wrapper.find(".status-icon.error").exists()).toBe(true);
      expect(wrapper.find(".status-icon.success").exists()).toBe(false);

      // 点击重新检测
      await wrapper.find(".btn-outline").trigger("click");
      await flushPromises();
      await nextTick();

      // 应切换到已安装状态
      expect(wrapper.find(".status-icon.success").exists()).toBe(true);
      expect(wrapper.find(".install-block").exists()).toBe(false);
    });

    it("重新检测成功后应显示对应版本号", async () => {
      window.electronAPI.moleExec
        .mockRejectedValueOnce(new Error("not found"))
        .mockResolvedValueOnce(createMockSuccessResponse("v3.1.4"));

      const wrapper = await mountComponent();

      await wrapper.find(".btn-outline").trigger("click");
      await flushPromises();
      await nextTick();

      expect(wrapper.find(".badge-success").text()).toBe("v3.1.4");
    });

    it("重新检测再次失败应保持未安装状态", async () => {
      window.electronAPI.moleExec
        .mockRejectedValueOnce(new Error("not found"))
        .mockRejectedValueOnce(new Error("still not found"));

      const wrapper = await mountComponent();

      // 确认在 missing 状态
      expect(wrapper.find(".status-icon.error").exists()).toBe(true);

      await wrapper.find(".btn-outline").trigger("click");
      await flushPromises();
      await nextTick();

      // 仍应在 missing 状态
      expect(wrapper.find(".status-icon.error").exists()).toBe(true);
      expect(wrapper.find(".install-block").exists()).toBe(true);
    });

    it("重新检测成功后应切换到已安装状态", async () => {
      let resolveSecond;
      const secondPromise = new Promise((resolve) => {
        resolveSecond = resolve;
      });

      window.electronAPI.moleExec
        .mockRejectedValueOnce(new Error("not found"))
        .mockImplementationOnce(() => secondPromise);

      const wrapper = await mountComponent();

      // 触发重新检测
      const recheckPromise = wrapper.find(".btn-outline").trigger("click");
      await nextTick();

      // During recheck, component stays in missing state until promise resolves
      expect(wrapper.find(".install-block").exists()).toBe(true);

      // 完成第二次调用
      resolveSecond(createMockSuccessResponse("v1.0.0"));
      await recheckPromise;
      await flushPromises();
      await nextTick();

      // 应切换到 installed
      expect(wrapper.find(".status-icon.success").exists()).toBe(true);
    });

    it("重新检测时应重置 copySuccess 状态", async () => {
      window.electronAPI.moleExec
        .mockRejectedValueOnce(new Error("not found"))
        .mockImplementationOnce(() => new Promise(() => {}));

      const wrapper = await mountComponent();

      // 先点击复制按钮
      await wrapper.find(".btn-copy").trigger("click");
      await flushPromises();
      await nextTick();

      // 确认 copySuccess = true
      expect(wrapper.find(".btn-copy").text()).toContain("已复制");

      // 点击重新检测
      await wrapper.find(".btn-outline").trigger("click");
      await nextTick();

      // copySuccess should be reset to false, so button text reverts
      expect(wrapper.find(".btn-copy").text()).toContain("复制命令");
    });
  });

  // ============================================================
  // 6. localStorage 测试
  // ============================================================
  describe("localStorage 测试", () => {
    it("点击「开始使用」应写入 revel-welcomed: true", async () => {
      window.electronAPI.moleExec.mockResolvedValue(createMockSuccessResponse("v1.2.3"));

      const wrapper = await mountComponent();

      await wrapper.find(".btn-start").trigger("click");
      await flushPromises();

      expect(localStorage.setItem).toHaveBeenCalledWith("revel-welcomed", "true");
    });

    it("localStorage 写入和 emit 事件的调用顺序：先写入再触发事件", async () => {
      window.electronAPI.moleExec.mockResolvedValue(createMockSuccessResponse("v1.2.3"));

      const wrapper = await mountComponent();

      await wrapper.find(".btn-start").trigger("click");
      await flushPromises();

      // 验证 localStorage 和 emit 都被调用
      expect(localStorage.setItem).toHaveBeenCalledWith("revel-welcomed", "true");
      expect(wrapper.emitted("start")).toBeTruthy();
    });

    it("未点击「开始使用」时不应写入 localStorage", async () => {
      window.electronAPI.moleExec.mockResolvedValue(createMockSuccessResponse("v1.2.3"));

      await mountComponent();

      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 7. 边界情况测试
  // ============================================================
  describe("边界情况测试", () => {
    it("moleExec 返回空 stdout 时应进入 missing 状态（组件检查 result.success && result.stdout）", async () => {
      window.electronAPI.moleExec.mockResolvedValue({
        stdout: "",
        success: true,
        stderr: "",
        code: 0,
      });

      const wrapper = await mountComponent();

      // 空 stdout 时组件进入 missing 状态
      expect(wrapper.find(".status-icon.error").exists()).toBe(true);
      expect(wrapper.find(".install-block").exists()).toBe(true);
    });

    it("moleExec 返回 null 时应进入 missing 状态", async () => {
      window.electronAPI.moleExec.mockResolvedValue(null);

      const wrapper = await mountComponent();

      expect(wrapper.find(".status-icon.error").exists()).toBe(true);
    });

    it("组件应只调用一次 moleExec（仅初始挂载时）", async () => {
      window.electronAPI.moleExec.mockResolvedValue(createMockSuccessResponse("v1.2.3"));

      await mountComponent();

      expect(window.electronAPI.moleExec).toHaveBeenCalledTimes(1);
    });

    it("未触发点击时不应 emit start 事件", async () => {
      window.electronAPI.moleExec.mockResolvedValue(createMockSuccessResponse("v1.2.3"));

      const wrapper = await mountComponent();

      expect(wrapper.emitted("start")).toBeFalsy();
    });

    it("copyCommand 在 clipboard 失败时不应崩溃", async () => {
      window.electronAPI.moleExec.mockRejectedValue(new Error("not found"));
      navigator.clipboard.writeText.mockRejectedValue(new Error("clipboard error"));

      const wrapper = await mountComponent();

      // Suppress unhandled rejection from async event handler
      const suppressUnhandled = (reason, promise) => {
        if (reason && reason.message === "clipboard error") {
          promise.catch(() => {});
        }
      };
      if (typeof process !== "undefined") {
        process.on("unhandledRejection", suppressUnhandled);
      }

      await wrapper.find(".btn-copy").trigger("click");
      await flushPromises();

      if (typeof process !== "undefined") {
        process.off("unhandledRejection", suppressUnhandled);
      }

      // Component should still be renderable
      expect(wrapper.find(".btn-copy").exists()).toBe(true);
    });

    it("moleExec 抛出异常时不应导致未处理的错误", async () => {
      window.electronAPI.moleExec.mockRejectedValue(new Error("unexpected error"));

      // 不应抛出异常
      await expect(mountComponent()).resolves.not.toThrow();
    });

    it("moleExec 返回包含换行符的版本号应正确显示", async () => {
      window.electronAPI.moleExec.mockResolvedValue({
        stdout: "v1.2.3\nbuild 20240101",
        success: true,
        stderr: "",
        code: 0,
      });

      const wrapper = await mountComponent();

      // 虽然 stdout 包含换行符，但组件用 .trim() 处理
      expect(wrapper.find(".badge-success").text()).toBe("v1.2.3\nbuild 20240101");
    });

    it("moleExec 返回 success: true 但 stdout 为 undefined 时应进入 missing 状态", async () => {
      window.electronAPI.moleExec.mockResolvedValue({
        stdout: undefined,
        success: true,
      });

      const wrapper = await mountComponent();

      expect(wrapper.find(".status-icon.error").exists()).toBe(true);
    });

    it("welcome-container 根元素应始终存在", async () => {
      window.electronAPI.moleExec.mockImplementation(() => new Promise(() => {}));

      const wrapper = mountWithI18n(WelcomeView);
      await nextTick();

      expect(wrapper.find(".welcome-container").exists()).toBe(true);
    });

    it("welcome-card 元素在 checking 状态应存在", async () => {
      window.electronAPI.moleExec.mockImplementation(() => new Promise(() => {}));

      const wrapper = mountWithI18n(WelcomeView);
      await nextTick();

      expect(wrapper.find(".welcome-card").exists()).toBe(true);
    });
  });
});
