import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import LoadingState from "@/components/LoadingState.vue";

describe("LoadingState 组件", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("应渲染主标题", () => {
    const wrapper = mount(LoadingState, {
      props: { title: "正在扫描...", subtitles: [] },
    });
    expect(wrapper.text()).toContain("正在扫描...");
  });

  it("应渲染副文案并循环切换", async () => {
    const wrapper = mount(LoadingState, {
      props: {
        title: "扫描中...",
        subtitles: ["步骤一...", "步骤二...", "步骤三..."],
      },
    });

    await nextTick();
    expect(wrapper.text()).toContain("步骤一...");

    vi.advanceTimersByTime(2000);
    await nextTick();
    expect(wrapper.text()).toContain("步骤二...");

    vi.advanceTimersByTime(2000);
    await nextTick();
    expect(wrapper.text()).toContain("步骤三...");

    vi.advanceTimersByTime(2000);
    await nextTick();
    expect(wrapper.text()).toContain("步骤一...");
  });

  it("无副文案时不应报错", () => {
    const wrapper = mount(LoadingState, {
      props: { title: "加载中..." },
    });
    expect(wrapper.text()).toContain("加载中...");
  });

  it("应包含旋转图标", () => {
    const wrapper = mount(LoadingState, {
      props: { title: "加载中..." },
    });
    expect(wrapper.find(".loading-icon").exists()).toBe(true);
  });

  it("应包含跳动圆点", () => {
    const wrapper = mount(LoadingState, {
      props: { title: "加载中..." },
    });
    const dots = wrapper.findAll(".loading-dot");
    expect(dots.length).toBe(3);
  });

  it("卸载时应清理定时器", () => {
    const wrapper = mount(LoadingState, {
      props: {
        title: "加载中...",
        subtitles: ["步骤一..."],
      },
    });
    wrapper.unmount();
    // 如果定时器未清理，vi.useRealTimers() 在 afterEach 中会报错
    expect(() => vi.advanceTimersByTime(10000)).not.toThrow();
  });
});
