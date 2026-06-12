<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="modelValue" class="dialog-overlay" @click.self="close">
        <div class="dialog-card">
          <div class="dialog-header">
            <h2 class="dialog-title">{{ $t("dialog.acknowledgments") }}</h2>
            <button class="dialog-close" @click="close" :aria-label="$t('dialog.close')">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="dialog-tabs">
            <button
              class="dialog-tab"
              :class="{ active: activeTab === 'ack' }"
              @click="activeTab = 'ack'"
            >
              {{ $t("dialog.thanks") }}
            </button>
            <button
              class="dialog-tab"
              :class="{ active: activeTab === 'licenses' }"
              @click="activeTab = 'licenses'"
            >
              {{ $t("dialog.thirdPartyLicenses") }}
            </button>
          </div>

          <div class="dialog-body">
            <!-- Acknowledgments tab -->
            <div v-if="activeTab === 'ack'" class="tab-panel">
              <div v-for="item in acknowledgments" :key="item.name" class="ack-item">
                <div class="ack-header">
                  <span class="ack-name">{{ item.name }}</span>
                  <span class="badge badge-info">{{ item.license }}</span>
                </div>
                <div class="ack-author">{{ item.author }}</div>
                <div class="ack-desc">{{ $t(item.descriptionKey) }}</div>
                <div class="ack-actions">
                  <button class="btn btn-text btn-small" @click="openUrl(item.url)">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"
                      />
                    </svg>
                    {{ $t("dialog.visitWebsite") }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Third-party licenses tab -->
            <div v-else class="tab-panel">
              <div v-if="licenses.length === 0" class="empty-state">
                <span class="empty-text">{{ $t("dialog.noData") }}</span>
              </div>
              <table v-else class="license-table">
                <thead>
                  <tr>
                    <th>{{ $t("dialog.name") }}</th>
                    <th>{{ $t("dialog.version") }}</th>
                    <th>{{ $t("dialog.author") }}</th>
                    <th>{{ $t("dialog.license") }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in licenses" :key="item.name">
                    <td>{{ item.name }}</td>
                    <td>{{ item.version }}</td>
                    <td>{{ item.author || "—" }}</td>
                    <td>
                      <span class="badge badge-info">{{ item.license }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="dialog-footer">
            <button class="btn btn-primary" @click="close">{{ $t("dialog.close") }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { getAcknowledgments } from "../data/acknowledgments.js";
import licenses from "../data/licenses.json";

const { t } = useI18n();

const acknowledgments = computed(() => getAcknowledgments());

defineProps({
  modelValue: { type: Boolean, required: true },
});

const emit = defineEmits(["update:modelValue"]);

const activeTab = ref("ack");

function close() {
  emit("update:modelValue", false);
  activeTab.value = "ack";
}

function openUrl(url) {
  if (window.electronAPI?.openExternal) {
    window.electronAPI.openExternal(url);
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.dialog-card {
  width: 640px;
  max-width: 100%;
  max-height: 80vh;
  background: var(--colorNeutralBackground1);
  border-radius: var(--corner80);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--colorNeutralForeground1);
  margin: 0;
}

.dialog-close {
  width: 32px;
  height: 32px;
  border-radius: var(--cornerCircular);
  border: none;
  background: transparent;
  color: var(--colorNeutralForeground2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--duration100);
}

.dialog-close:hover {
  background: var(--colorSubtleBackgroundHover);
}

.dialog-tabs {
  display: flex;
  gap: 4px;
  padding: 16px 24px 0;
  border-bottom: 1px solid var(--colorNeutralStroke2);
}

.dialog-tab {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: var(--colorNeutralForeground2);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  transition: color var(--duration100);
}

.dialog-tab:hover {
  color: var(--colorNeutralForeground1);
}

.dialog-tab.active {
  color: var(--colorBrandForeground1);
  font-weight: 600;
}

.dialog-tab.active::after {
  content: "";
  position: absolute;
  bottom: -1px;
  left: 8px;
  right: 8px;
  height: 2px;
  background: var(--colorBrandForeground1);
  border-radius: 1px;
}

.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
}

.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Acknowledgments */
.ack-item {
  padding: 16px;
  border-radius: var(--corner40);
  background: var(--colorNeutralBackground2);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ack-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ack-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--colorNeutralForeground1);
}

.ack-author {
  font-size: 13px;
  color: var(--colorNeutralForeground2);
}

.ack-desc {
  font-size: 13px;
  color: var(--colorNeutralForeground3);
}

.ack-actions {
  margin-top: 4px;
}

.ack-actions .btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* License Table */
.license-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.license-table th,
.license-table td {
  padding: 10px 12px;
  text-align: left;
}

.license-table th {
  font-weight: 600;
  color: var(--colorNeutralForeground1);
  border-bottom: 2px solid var(--colorNeutralStroke2);
}

.license-table td {
  color: var(--colorNeutralForeground2);
  border-bottom: 1px solid var(--colorNeutralStroke3);
}

.license-table tbody tr:nth-child(even) {
  background: var(--colorNeutralBackground2);
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--colorNeutralForeground3);
  font-size: 14px;
}

/* Dialog Footer */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding: 16px 24px 20px;
  border-top: 1px solid var(--colorNeutralStroke2);
}

/* Transition */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
</style>
