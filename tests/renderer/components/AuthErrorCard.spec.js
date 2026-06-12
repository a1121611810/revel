import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import AuthErrorCard from "../../../src/renderer/src/components/AuthErrorCard.vue";

describe("AuthErrorCard", () => {
  it("renders title, description and button", () => {
    const wrapper = mount(AuthErrorCard, {
      global: { mocks: { $t: (key) => key } },
    });
    expect(wrapper.find(".auth-error-title").text()).toBe("auth.errorTitle");
    expect(wrapper.find(".auth-error-desc").text()).toBe("auth.errorDesc");
    expect(wrapper.find("button").text()).toBe("auth.goToSettings");
  });

  it("emits go-to-settings event when button clicked", async () => {
    const wrapper = mount(AuthErrorCard, {
      global: { mocks: { $t: (key) => key } },
    });
    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("go-to-settings")).toHaveLength(1);
  });
});
