import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import Icon from "@/components/Icon.vue";

describe("Icon.vue - Browser Mode", () => {
  beforeEach(() => {
    // Clean up any previously injected sprites
    const existing = document.querySelector('div[data-testid="icon-sprite"]');
    if (existing) existing.remove();

    // Inject a minimal sprite for testing
    const spriteDiv = document.createElement("div");
    spriteDiv.setAttribute("data-testid", "icon-sprite");
    spriteDiv.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" style="display:none">
        <symbol id="icon-test" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
        </symbol>
      </svg>
    `;
    spriteDiv.style.display = "none";
    document.body.appendChild(spriteDiv);
  });

  it("renders visible SVG in real browser", () => {
    mount(Icon, {
      props: { name: "test", size: 24 },
      attachTo: document.body,
    });

    const svg = document.querySelector('svg[width="24"]');
    expect(svg).toBeTruthy();

    const use = svg.querySelector("use");
    expect(use).toBeTruthy();
    expect(use.getAttribute("href")).toBe("#icon-test");
  });

  it("inherits currentColor from parent element", () => {
    const container = document.createElement("div");
    container.style.color = "rgb(255, 0, 0)";
    document.body.appendChild(container);

    mount(Icon, {
      props: { name: "test", size: 24 },
      attachTo: container,
    });

    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();

    // In real browser, stroke="currentColor" resolves to computed color
    const strokeAttr = svg.getAttribute("stroke");
    expect(strokeAttr).toBe("currentColor");
  });
});
