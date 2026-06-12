import { describe, it, expect } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import PasswordDialog from "@/components/PasswordDialog.vue";

describe("PasswordDialog", () => {
  it('renders title "需要管理员权限"', () => {
    const wrapper = mount(PasswordDialog);
    expect(wrapper.find(".password-title").text()).toBe("需要管理员权限");
  });

  it('renders password input (type="password")', () => {
    const wrapper = mount(PasswordDialog);
    const input = wrapper.find('input[type="password"]');
    expect(input.exists()).toBe(true);
  });

  it('renders "记住密码" checkbox, default unchecked', () => {
    const wrapper = mount(PasswordDialog);
    const checkbox = wrapper.find('input[type="checkbox"]');
    expect(checkbox.exists()).toBe(true);
    expect(checkbox.element.checked).toBe(false);
    expect(wrapper.text()).toContain("记住密码");
  });

  it("renders cancel and confirm buttons", () => {
    const wrapper = mount(PasswordDialog);
    const buttons = wrapper.findAll("button");
    expect(buttons.length).toBe(2);
    expect(buttons[0].text()).toBe("取消");
    expect(buttons[1].text()).toBe("确认");
  });

  it("focuses password input on mount", () => {
    const wrapper = mount(PasswordDialog, { attachTo: document.body });
    const input = wrapper.find('input[type="password"]').element;
    expect(document.activeElement).toBe(input);
    wrapper.unmount();
  });

  it("emits @submit with {password, remember: false} after typing and confirming", async () => {
    const wrapper = mount(PasswordDialog);
    const input = wrapper.find('input[type="password"]');
    await input.setValue("secret123");
    await wrapper.findAll("button")[1].trigger("click");
    await flushPromises();
    expect(wrapper.emitted("submit")).toHaveLength(1);
    expect(wrapper.emitted("submit")[0]).toEqual([{ password: "secret123", remember: false }]);
  });

  it("emits @submit with {password, remember: true} after checking remember and confirming", async () => {
    const wrapper = mount(PasswordDialog);
    const input = wrapper.find('input[type="password"]');
    const checkbox = wrapper.find('input[type="checkbox"]');
    await input.setValue("secret123");
    await checkbox.setValue(true);
    await wrapper.findAll("button")[1].trigger("click");
    await flushPromises();
    expect(wrapper.emitted("submit")).toHaveLength(1);
    expect(wrapper.emitted("submit")[0]).toEqual([{ password: "secret123", remember: true }]);
  });

  it("emits @cancel when clicking cancel button", async () => {
    const wrapper = mount(PasswordDialog);
    await wrapper.findAll("button")[0].trigger("click");
    await flushPromises();
    expect(wrapper.emitted("cancel")).toHaveLength(1);
  });

  it("emits @submit when pressing Enter in input", async () => {
    const wrapper = mount(PasswordDialog);
    const input = wrapper.find('input[type="password"]');
    await input.setValue("secret123");
    await input.trigger("keydown.enter");
    await flushPromises();
    expect(wrapper.emitted("submit")).toHaveLength(1);
    expect(wrapper.emitted("submit")[0]).toEqual([{ password: "secret123", remember: false }]);
  });

  it("emits @cancel when clicking overlay (click.self)", async () => {
    const wrapper = mount(PasswordDialog, { attachTo: document.body });
    await wrapper.find(".password-overlay").trigger("click");
    await flushPromises();
    expect(wrapper.emitted("cancel")).toHaveLength(1);
    wrapper.unmount();
  });
});
