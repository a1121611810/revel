import { describe, it, expect } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import LiveOutput from "@/components/LiveOutput.vue";

describe("LiveOutput", () => {
  it("does not render the card when lines is empty", () => {
    const wrapper = mount(LiveOutput, { props: { lines: [] } });
    expect(wrapper.find(".live-output-card").exists()).toBe(false);
  });

  it("renders title and pulsing dot when lines has data", () => {
    const wrapper = mount(LiveOutput, {
      props: { lines: [{ text: "hello", type: "stdout" }] },
    });
    expect(wrapper.find(".live-output-card").exists()).toBe(true);
    expect(wrapper.find(".live-output-title").text()).toBe("实时输出");
    expect(wrapper.find(".live-output-dot").exists()).toBe(true);
  });

  it("only shows the last 8 lines when there are more than 8", () => {
    const lines = Array.from({ length: 12 }, (_, i) => ({
      text: `line ${i + 1}`,
      type: "stdout",
    }));
    const wrapper = mount(LiveOutput, { props: { lines } });
    const renderedLines = wrapper.findAll(".live-output-line");
    expect(renderedLines.length).toBe(8);
    expect(renderedLines[0].text()).toBe("line 5");
    expect(renderedLines[7].text()).toBe("line 12");
  });

  it("applies live-stderr class to stderr lines", () => {
    const wrapper = mount(LiveOutput, {
      props: {
        lines: [
          { text: "normal", type: "stdout" },
          { text: "error", type: "stderr" },
        ],
      },
    });
    const renderedLines = wrapper.findAll(".live-output-line");
    expect(renderedLines[0].classes()).not.toContain("live-stderr");
    expect(renderedLines[1].classes()).toContain("live-stderr");
  });

  it("auto-scrolls to bottom after adding lines", async () => {
    const wrapper = mount(LiveOutput, {
      props: { lines: [{ text: "line 1", type: "stdout" }] },
      attachTo: document.body,
    });

    const bodyEl = wrapper.find({ ref: "bodyRef" }).element;
    // Force scrollHeight > clientHeight so scrollTop can change meaningfully
    Object.defineProperty(bodyEl, "scrollHeight", {
      configurable: true,
      value: 500,
    });
    Object.defineProperty(bodyEl, "clientHeight", {
      configurable: true,
      value: 100,
    });
    bodyEl.scrollTop = 0;

    await wrapper.setProps({
      lines: [
        { text: "line 1", type: "stdout" },
        { text: "line 2", type: "stdout" },
      ],
    });

    await flushPromises();
    expect(bodyEl.scrollTop).toBe(bodyEl.scrollHeight);

    wrapper.unmount();
  });
});
