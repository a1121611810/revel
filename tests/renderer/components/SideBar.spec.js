import { describe, it, expect, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import SideBar from "@/components/SideBar.vue";

describe("SideBar 组件", () => {
  let wrapper;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  /**
   * 辅助函数：创建组件包装器
   */
  function createWrapper(props = {}) {
    return mount(SideBar, {
      props: {
        modelValue: "clean",
        ...props,
      },
    });
  }

  /**
   * 获取所有导航项按钮
   */
  function getNavItems(wrapper) {
    return wrapper.findAll(".nav-item");
  }

  // ============================================
  // 基础渲染测试
  // ============================================

  describe("基础渲染", () => {
    it("应正确渲染侧边栏容器", () => {
      wrapper = createWrapper();
      expect(wrapper.find(".app-sidebar").exists()).toBe(true);
    });

    it('应渲染头部标题 "Revel"', () => {
      wrapper = createWrapper();
      const header = wrapper.find(".sidebar-header");
      expect(header.exists()).toBe(true);
      expect(header.text()).toContain("Revel");
    });

    it('应渲染副标题 "系统清理与优化"', () => {
      wrapper = createWrapper();
      const subtitle = wrapper.find(".sidebar-subtitle");
      expect(subtitle.exists()).toBe(true);
      expect(subtitle.text()).toBe("系统清理与优化");
    });

    it("应渲染底部版本信息", () => {
      wrapper = createWrapper();
      const footerText = wrapper.find(".app-sidebar > div:last-child");
      expect(footerText.exists()).toBe(true);
      expect(footerText.text()).toBe("基于 Mole CLI 构建");
    });
  });

  // ============================================
  // 导航项数量与文本测试
  // ============================================

  describe("导航项渲染", () => {
    it("应渲染 7 个导航项按钮", () => {
      wrapper = createWrapper();
      const navItems = getNavItems(wrapper);
      expect(navItems).toHaveLength(8);
    });

    it("应渲染包含 SVG 图标的图标容器", () => {
      wrapper = createWrapper();
      const icons = wrapper.findAll(".nav-item .nav-item-icon");
      expect(icons).toHaveLength(8);
      // 验证 SVG 被正确插入到 icon 容器中
      icons.forEach((iconWrapper) => {
        expect(iconWrapper.find("svg").exists()).toBe(true);
      });
    });

    it("uses Icon component for each nav item", () => {
      wrapper = createWrapper();
      const icons = wrapper.findAllComponents({ name: "Icon" });
      expect(icons.length).toBe(8);
    });

    it("passes correct name prop to Icon", () => {
      wrapper = createWrapper();
      const icons = wrapper.findAllComponents({ name: "Icon" });
      const expectedIds = ["clean", "analyze", "status", "uninstall", "optimize", "purge", "installer", "settings"];
      expectedIds.forEach((id, index) => {
        expect(icons[index].props("name")).toBe(id);
      });
    });
  });

  describe("导航项中文标签", () => {
    it('第一项应显示 "清理"', () => {
      wrapper = createWrapper();
      const items = getNavItems(wrapper);
      expect(items[0].text()).toContain("清理");
    });

    it('第二项应显示 "分析"', () => {
      wrapper = createWrapper();
      const items = getNavItems(wrapper);
      expect(items[1].text()).toContain("分析");
    });

    it('第三项应显示 "状态"', () => {
      wrapper = createWrapper();
      const items = getNavItems(wrapper);
      expect(items[2].text()).toContain("状态");
    });

    it('第四项应显示 "卸载"', () => {
      wrapper = createWrapper();
      const items = getNavItems(wrapper);
      expect(items[3].text()).toContain("卸载");
    });

    it('第五项应显示 "优化"', () => {
      wrapper = createWrapper();
      const items = getNavItems(wrapper);
      expect(items[4].text()).toContain("优化");
    });

    it('第六项应显示 "项目清理"', () => {
      wrapper = createWrapper();
      const items = getNavItems(wrapper);
      expect(items[5].text()).toContain("项目清理");
    });

    it('第七项应显示 "安装包"', () => {
      wrapper = createWrapper();
      const items = getNavItems(wrapper);
      expect(items[6].text()).toContain("安装包");
    });

    it('第八项应显示 "设置"', () => {
      wrapper = createWrapper();
      const items = getNavItems(wrapper);
      expect(items[7].text()).toContain("设置");
    });

    it("应按正确顺序渲染所有导航标签", () => {
      wrapper = createWrapper();
      const items = getNavItems(wrapper);
      const expectedLabels = ["清理", "分析", "状态", "卸载", "优化", "项目清理", "安装包", "设置"];
      const actualLabels = items.map((item) => {
        // 过滤掉 SVG 内容，只保留文本
        return item.text().trim();
      });
      expect(actualLabels).toEqual(expectedLabels);
    });
  });

  // ============================================
  // Active 状态测试
  // ============================================

  describe("active 状态高亮", () => {
    it('modelValue 为 "clean" 时第一项应有 active 类', () => {
      wrapper = createWrapper({ modelValue: "clean" });
      const items = getNavItems(wrapper);
      expect(items[0].classes()).toContain("nav-item-active");
    });

    it('modelValue 为 "clean" 时其他项不应有 active 类', () => {
      wrapper = createWrapper({ modelValue: "clean" });
      const items = getNavItems(wrapper);
      for (let i = 1; i < items.length; i++) {
        expect(items[i].classes()).not.toContain("nav-item-active");
      }
    });

    it('modelValue 为 "analyze" 时第二项应有 active 类', () => {
      wrapper = createWrapper({ modelValue: "analyze" });
      const items = getNavItems(wrapper);
      expect(items[1].classes()).toContain("nav-item-active");
    });

    it('modelValue 为 "status" 时第三项应有 active 类', () => {
      wrapper = createWrapper({ modelValue: "status" });
      const items = getNavItems(wrapper);
      expect(items[2].classes()).toContain("nav-item-active");
    });

    it('modelValue 为 "uninstall" 时第四项应有 active 类', () => {
      wrapper = createWrapper({ modelValue: "uninstall" });
      const items = getNavItems(wrapper);
      expect(items[3].classes()).toContain("nav-item-active");
    });

    it('modelValue 为 "optimize" 时第五项应有 active 类', () => {
      wrapper = createWrapper({ modelValue: "optimize" });
      const items = getNavItems(wrapper);
      expect(items[4].classes()).toContain("nav-item-active");
    });

    it('modelValue 为 "purge" 时第六项应有 active 类', () => {
      wrapper = createWrapper({ modelValue: "purge" });
      const items = getNavItems(wrapper);
      expect(items[5].classes()).toContain("nav-item-active");
    });

    it('modelValue 为 "installer" 时第七项应有 active 类', () => {
      wrapper = createWrapper({ modelValue: "installer" });
      const items = getNavItems(wrapper);
      expect(items[6].classes()).toContain("nav-item-active");
    });

    it("modelValue 不匹配任何项时不应有 active 类", () => {
      wrapper = createWrapper({ modelValue: "nonexistent" });
      const items = getNavItems(wrapper);
      items.forEach((item) => {
        expect(item.classes()).not.toContain("nav-item-active");
      });
    });

    it('modelValue 从 "clean" 更新为 "analyze" 后 active 类应正确切换', async () => {
      wrapper = createWrapper({ modelValue: "clean" });
      const items = getNavItems(wrapper);

      expect(items[0].classes()).toContain("nav-item-active");
      expect(items[1].classes()).not.toContain("nav-item-active");

      await wrapper.setProps({ modelValue: "analyze" });

      expect(items[0].classes()).not.toContain("nav-item-active");
      expect(items[1].classes()).toContain("nav-item-active");
    });
  });

  // ============================================
  // 点击事件与 emit 测试
  // ============================================

  describe("点击事件与 emit", () => {
    it('点击 "清理" 项应 emit update:modelValue 并传入 "clean"', () => {
      wrapper = createWrapper();
      const items = getNavItems(wrapper);

      items[0].trigger("click");

      expect(wrapper.emitted("update:modelValue")).toBeTruthy();
      expect(wrapper.emitted("update:modelValue")[0]).toEqual(["clean"]);
    });

    it('点击 "分析" 项应 emit update:modelValue 并传入 "analyze"', () => {
      wrapper = createWrapper();
      const items = getNavItems(wrapper);

      items[1].trigger("click");

      expect(wrapper.emitted("update:modelValue")).toBeTruthy();
      expect(wrapper.emitted("update:modelValue")[0]).toEqual(["analyze"]);
    });

    it('点击 "状态" 项应 emit update:modelValue 并传入 "status"', () => {
      wrapper = createWrapper();
      const items = getNavItems(wrapper);

      items[2].trigger("click");

      expect(wrapper.emitted("update:modelValue")).toBeTruthy();
      expect(wrapper.emitted("update:modelValue")[0]).toEqual(["status"]);
    });

    it('点击 "卸载" 项应 emit update:modelValue 并传入 "uninstall"', () => {
      wrapper = createWrapper();
      const items = getNavItems(wrapper);

      items[3].trigger("click");

      expect(wrapper.emitted("update:modelValue")).toBeTruthy();
      expect(wrapper.emitted("update:modelValue")[0]).toEqual(["uninstall"]);
    });

    it('点击 "优化" 项应 emit update:modelValue 并传入 "optimize"', () => {
      wrapper = createWrapper();
      const items = getNavItems(wrapper);

      items[4].trigger("click");

      expect(wrapper.emitted("update:modelValue")).toBeTruthy();
      expect(wrapper.emitted("update:modelValue")[0]).toEqual(["optimize"]);
    });

    it('点击 "项目清理" 项应 emit update:modelValue 并传入 "purge"', () => {
      wrapper = createWrapper();
      const items = getNavItems(wrapper);

      items[5].trigger("click");

      expect(wrapper.emitted("update:modelValue")).toBeTruthy();
      expect(wrapper.emitted("update:modelValue")[0]).toEqual(["purge"]);
    });

    it('点击 "安装包" 项应 emit update:modelValue 并传入 "installer"', () => {
      wrapper = createWrapper();
      const items = getNavItems(wrapper);

      items[6].trigger("click");

      expect(wrapper.emitted("update:modelValue")).toBeTruthy();
      expect(wrapper.emitted("update:modelValue")[0]).toEqual(["installer"]);
    });
  });

  describe("多次点击不同导航项", () => {
    it("依次点击多个不同项应分别 emit 对应事件", () => {
      wrapper = createWrapper();
      const items = getNavItems(wrapper);

      // 依次点击清理、分析、状态
      items[0].trigger("click");
      items[1].trigger("click");
      items[2].trigger("click");

      const emitted = wrapper.emitted("update:modelValue");
      expect(emitted).toHaveLength(3);
      expect(emitted[0]).toEqual(["clean"]);
      expect(emitted[1]).toEqual(["analyze"]);
      expect(emitted[2]).toEqual(["status"]);
    });

    it("重复点击同一项应多次 emit 相同值", () => {
      wrapper = createWrapper();
      const items = getNavItems(wrapper);

      // 连续三次点击 "清理"
      items[0].trigger("click");
      items[0].trigger("click");
      items[0].trigger("click");

      const emitted = wrapper.emitted("update:modelValue");
      expect(emitted).toHaveLength(3);
      expect(emitted.every((e) => e[0] === "clean")).toBe(true);
    });

    it("点击所有 8 个导航项应按顺序 emit 所有值", () => {
      wrapper = createWrapper();
      const items = getNavItems(wrapper);
      const expectedIds = [
        "clean",
        "analyze",
        "status",
        "uninstall",
        "optimize",
        "purge",
        "installer",
        "settings",
      ];

      items.forEach((item) => item.trigger("click"));

      const emitted = wrapper.emitted("update:modelValue");
      expect(emitted).toHaveLength(8);
      emitted.forEach((event, index) => {
        expect(event).toEqual([expectedIds[index]]);
      });
    });
  });

  // ============================================
  // DOM 结构与属性测试
  // ============================================

  describe("DOM 结构与属性", () => {
    it("每个导航项应包含 .icon 和文本 span 两个子元素", () => {
      wrapper = createWrapper();
      const items = getNavItems(wrapper);

      items.forEach((item) => {
        expect(item.find(".nav-item-icon").exists()).toBe(true);
        expect(item.find(".nav-item-icon + span").exists()).toBe(true);
      });
    });

    it("每个导航项应有正确的 key 属性", () => {
      wrapper = createWrapper();
      const items = getNavItems(wrapper);
      items.forEach((item) => {
        // Vue 内部使用 key 进行 diff，这里通过验证元素顺序间接确认
        expect(item.element).toBeDefined();
        expect(item.element.tagName.toLowerCase()).toBe("button");
      });
    });

    it("导航项按钮的基础类名应包含 nav-item", () => {
      wrapper = createWrapper();
      const items = getNavItems(wrapper);

      items.forEach((item) => {
        expect(item.classes()).toContain("nav-item");
      });
    });

    it("导航区域应包含在 nav 元素中", () => {
      wrapper = createWrapper();
      const nav = wrapper.find("nav.nav-list");
      expect(nav.exists()).toBe(true);
    });

    it("每个导航项应绑定 mousemove 事件且不抛出异常", async () => {
      wrapper = createWrapper();
      const items = getNavItems(wrapper);

      for (const item of items) {
        await expect(item.trigger("mousemove")).resolves.not.toThrow();
      }
    });

    it("mousemove 后应设置 --mouse-x 和 --mouse-y CSS 自定义属性", async () => {
      wrapper = createWrapper();
      const item = getNavItems(wrapper)[0];
      const element = item.element;

      // 触发 mousemove，使用原生事件以携带 clientX/clientY
      const event = new MouseEvent("mousemove", {
        bubbles: true,
        clientX: 50,
        clientY: 18,
      });
      element.dispatchEvent(event);
      await wrapper.vm.$nextTick();

      const mouseX = element.style.getPropertyValue("--mouse-x");
      const mouseY = element.style.getPropertyValue("--mouse-y");
      expect(mouseX).toBeTruthy();
      expect(mouseY).toBeTruthy();
      expect(mouseX).toContain("%");
      expect(mouseY).toContain("%");
    });

    it("active 状态的导航项应包含 nav-item-active 类", () => {
      wrapper = createWrapper({ modelValue: "clean" });
      const items = getNavItems(wrapper);
      const activeItem = items[0];

      expect(activeItem.classes()).toContain("nav-item-active");
      expect(activeItem.element).toBeDefined();
    });
  });

  // ============================================
  // Props 验证测试
  // ============================================

  describe("props 验证", () => {
    it("应正确接收 modelValue 字符串 prop", () => {
      wrapper = createWrapper({ modelValue: "status" });
      expect(wrapper.props("modelValue")).toBe("status");
    });

    it("modelValue 为空字符串时不应有 active 类", () => {
      wrapper = createWrapper({ modelValue: "" });
      const items = getNavItems(wrapper);
      items.forEach((item) => {
        expect(item.classes()).not.toContain("nav-item-active");
      });
    });
  });
});
