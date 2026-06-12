import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Icon from "@/components/Icon.vue";

describe("Icon.vue", () => {
  it("renders svg with correct size", () => {
    const wrapper = mount(Icon, {
      props: { name: "clean", size: 24 },
    });
    const svg = wrapper.find("svg");
    expect(svg.exists()).toBe(true);
    expect(svg.attributes("width")).toBe("24");
    expect(svg.attributes("height")).toBe("24");
  });

  it("uses default size 20 when size is not provided", () => {
    const wrapper = mount(Icon, {
      props: { name: "settings" },
    });
    const svg = wrapper.find("svg");
    expect(svg.attributes("width")).toBe("20");
    expect(svg.attributes("height")).toBe("20");
  });

  it("renders use element with correct href", () => {
    const wrapper = mount(Icon, {
      props: { name: "analyze" },
    });
    const use = wrapper.find("use");
    expect(use.exists()).toBe(true);
    expect(use.attributes("href")).toBe("#icon-analyze");
  });

  it("inherits currentColor for stroke", () => {
    const wrapper = mount(Icon, {
      props: { name: "status" },
    });
    const svg = wrapper.find("svg");
    expect(svg.attributes("stroke")).toBe("currentColor");
  });

  it("renders empty use when name is unknown", () => {
    const wrapper = mount(Icon, {
      props: { name: "nonexistent" },
    });
    const use = wrapper.find("use");
    expect(use.exists()).toBe(true);
    expect(use.attributes("href")).toBe("#icon-nonexistent");
  });
});
