import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import AcknowledgmentsDialog from "@/components/AcknowledgmentsDialog.vue";

describe("AcknowledgmentsDialog 组件", () => {
  let wrapper;

  beforeEach(() => {
    window.electronAPI = {
      openExternal: vi.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  function mountDialog(props) {
    return mount(AcknowledgmentsDialog, {
      props,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });
  }

  it("modelValue=false 时不渲染对话框", () => {
    wrapper = mountDialog({ modelValue: false });
    expect(wrapper.find(".dialog-overlay").exists()).toBe(false);
  });

  it("modelValue=true 时渲染对话框", () => {
    wrapper = mountDialog({ modelValue: true });
    expect(wrapper.find(".dialog-overlay").exists()).toBe(true);
  });

  it("应渲染两个标签页", () => {
    wrapper = mountDialog({ modelValue: true });
    const tabs = wrapper.findAll(".dialog-tab");
    expect(tabs.length).toBe(2);
    expect(tabs[0].text()).toBe("致谢");
    expect(tabs[1].text()).toBe("第三方许可证");
  });

  it("默认显示致谢标签内容", () => {
    wrapper = mountDialog({ modelValue: true });
    expect(wrapper.find(".ack-item").exists()).toBe(true);
    expect(wrapper.find(".license-table").exists()).toBe(false);
  });

  it("点击第三方许可证标签切换内容", async () => {
    wrapper = mountDialog({ modelValue: true });
    const tabs = wrapper.findAll(".dialog-tab");
    await tabs[1].trigger("click");
    await flushPromises();

    expect(tabs[1].classes()).toContain("active");
    expect(wrapper.find(".license-table").exists() || wrapper.find(".empty-state").exists()).toBe(
      true,
    );
  });

  it("点击关闭按钮应触发 update:modelValue(false)", async () => {
    wrapper = mountDialog({ modelValue: true });
    const closeBtn = wrapper.find(".dialog-footer .btn");
    await closeBtn.trigger("click");

    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")[0]).toEqual([false]);
  });

  it("点击遮罩层应触发 update:modelValue(false)", async () => {
    wrapper = mountDialog({ modelValue: true });
    await wrapper.find(".dialog-overlay").trigger("click");

    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")[0]).toEqual([false]);
  });

  it("点击访问官网应调用 openExternal", async () => {
    wrapper = mountDialog({ modelValue: true });
    const linkBtn = wrapper.find(".ack-actions .btn");
    await linkBtn.trigger("click");

    expect(window.electronAPI.openExternal).toHaveBeenCalled();
  });

  it("应渲染 acknowledgments.js 中的条目", () => {
    wrapper = mountDialog({ modelValue: true });
    const items = wrapper.findAll(".ack-item");
    expect(items.length).toBeGreaterThan(0);
    expect(wrapper.text()).toContain("Mole CLI");
  });
});
