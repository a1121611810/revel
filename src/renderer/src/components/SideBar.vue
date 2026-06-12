<template>
  <aside class="app-sidebar">
    <div class="sidebar-titlebar" aria-hidden="true"></div>
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
          <circle cx="18" cy="18" r="18" fill="#34495e" />
          <circle
            cx="18"
            cy="18"
            r="9"
            fill="none"
            stroke="#475569"
            stroke-width="1.5"
            stroke-linecap="round"
            opacity="0.9"
          />
          <path
            d="M18 9A9 9 0 0 1 27 18"
            fill="none"
            stroke="#38bdf8"
            stroke-width="2"
            stroke-linecap="round"
          />
          <circle cx="18" cy="18" r="3.4" fill="#38bdf8" />
          <circle cx="18" cy="18" r="1.7" fill="#34495e" />
        </svg>
      </div>
      <h1 class="sidebar-title">Revel</h1>
      <p class="sidebar-subtitle">{{ $t("nav.title") }}</p>
    </div>

    <nav class="nav-list" role="navigation" :aria-label="$t('nav.mainNav')">
      <button
        v-for="item in navItems"
        :key="item.id"
        class="nav-item"
        :class="{ 'nav-item-active': modelValue === item.id }"
        role="tab"
        :aria-selected="modelValue === item.id"
        :aria-label="item.label"
        @click="$emit('update:modelValue', item.id)"
        @mousemove="handleMouseMove"
      >
        <span class="nav-item-icon" aria-hidden="true">
          <Icon :name="item.id" size="20" />
        </span>
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <div class="fui-sidebar-footer">{{ $t("nav.builtWith") }}</div>
  </aside>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Icon from "./Icon.vue";

defineProps({
  modelValue: { type: String, required: true },
});

defineEmits(["update:modelValue"]);

const { t } = useI18n();

function handleMouseMove(event) {
  const target = event.currentTarget;
  const rect = target.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  target.style.setProperty("--mouse-x", `${x}%`);
  target.style.setProperty("--mouse-y", `${y}%`);
}

const navItems = computed(() => [
  { id: "clean", label: t("nav.cleanup") },
  { id: "analyze", label: t("nav.analyze") },
  { id: "status", label: t("nav.status") },
  { id: "uninstall", label: t("nav.uninstall") },
  { id: "optimize", label: t("nav.optimize") },
  { id: "purge", label: t("nav.purge") },
  { id: "installer", label: t("nav.installer") },
  { id: "settings", label: t("nav.settings") },
]);
</script>

<style scoped>
/* ============================================================
   SideBar.vue -- Microsoft Fluent Design System v2 规范实现
   ============================================================ */

/* ---- 侧边栏容器 ---- */
.app-sidebar {
  width: 260px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  background: var(--colorNeutralBackground1, #ffffff);
  border-right: 1px solid var(--colorNeutralStroke1, #e0e0e0);
  box-sizing: border-box;
}

/* ---- 头部区域 ---- */
.sidebar-header {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.sidebar-logo {
  width: 36px;
  height: 36px;
  border-radius: var(--cornerCircular, 50%);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
  overflow: hidden;
}

.sidebar-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--colorNeutralForeground1, #1c1c1c);
  letter-spacing: -0.3px;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-subtitle {
  font-size: 11px;
  color: var(--colorNeutralForeground3, #8a8a8a);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin: 2px 0 0;
}

/* ---- 导航区域 ---- */
.nav-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 8px;
  overflow-y: auto;
}

/* ---- 导航项 ---- */
.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px;
  border: none;
  border-radius: var(--corner40, 4px);
  background: transparent;
  color: var(--colorNeutralForeground2, #616161);
  font-family: inherit;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  cursor: pointer;
  transition:
    background 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  position: relative;
  outline: none;
  -webkit-app-region: no-drag;
  overflow: hidden;
}

/* Reveal Highlight 光晕 */
.nav-item::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
    rgba(255, 255, 255, 0.12) 0%,
    transparent 60%
  );
  opacity: 0;
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.nav-item:hover::after {
  opacity: 1;
}

/* ---- Hover 状态 ---- */
.nav-item:hover {
  background: var(--colorSubtleBackgroundHover, #f5f5f5);
  color: var(--colorBrandForeground1, #0f6cbd);
}

/* ---- Focus 状态 ---- */
.nav-item:focus-visible {
  outline: 2px solid var(--colorBrandForeground1, #0f6cbd);
  outline-offset: -2px;
  border-radius: var(--corner40, 4px);
}

/* Active 指示条（::before 伪元素实现可动画） */
.nav-item::before {
  content: "";
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 0px;
  opacity: 0;
  border-radius: 0 2px 2px 0;
  background: var(--colorBrandForeground1, #0f6cbd);
  transition:
    width 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.2s ease;
}

/* ---- Active 状态 ---- */
.nav-item-active {
  background: linear-gradient(
    90deg,
    var(--colorBrandBackgroundTint, rgba(0, 120, 212, 0.08)),
    transparent
  );
  color: var(--colorBrandForeground1, #0f6cbd);
  font-weight: 600;
}

.nav-item-active::before {
  width: 3px;
  opacity: 1;
}

.nav-item-active:hover {
  background: transparent;
}

/* Active 时图标也跟随品牌色 */
.nav-item-active .nav-item-icon {
  color: var(--colorBrandForeground1, #0f6cbd);
}

/* ---- 图标微交互 ---- */
.nav-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-item:hover .nav-item-icon {
  transform: scale(1.05);
}

/* ---- 底部区域 ---- */
.fui-sidebar-footer {
  padding: 8px 16px;
  border-top: 1px solid var(--colorNeutralStroke1, #e0e0e0);
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
  color: var(--colorNeutralForeground3, #a0a0a0);
  text-align: center;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
}
</style>
