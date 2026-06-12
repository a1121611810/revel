<template>
  <div class="fade-in">
    <AuthErrorCard v-if="authError" @go-to-settings="navigateToSettings" />

    <h1 class="page-title">{{ $t("purge.title") }}</h1>
    <p class="page-subtitle">{{ $t("purge.subtitle") }}</p>

    <div class="purge-toolbar">
      <div class="purge-toolbar-left">
        <button class="btn btn-outline" :disabled="loading" @click="previewScan">
          <svg class="" viewBox="0 0 20 20" fill="currentColor">
            <path
              d="M8.5 3a5.5 5.5 0 0 0-4.24 9.02l-.15.18a7 7 0 1 1 11.78 0l-.15-.18A5.5 5.5 0 0 0 8.5 3zm0 2a3.5 3.5 0 0 1 2.8 5.6l-2.8 3.79-2.8-3.8A3.5 3.5 0 0 1 8.5 5z"
            />
          </svg>
          {{ $t("purge.previewScan") }}
        </button>
        <button
          class="btn btn-primary"
          :disabled="selectedCount === 0 || loading"
          @click="cleanSelected"
        >
          <svg class="" viewBox="0 0 20 20" fill="currentColor">
            <path
              d="M8.5 2a5.5 5.5 0 0 0-5.35 6.82l-2.1 2.1a.5.5 0 0 0 .35.85H5v1.3a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5V10.5h1.3a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5H6.82l2.1-2.1A5.5 5.5 0 1 0 8.5 2zm0 1a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z"
            />
          </svg>
          {{ $t("purge.clearSelected") }}
        </button>
      </div>
      <div class="input-wrapper" style="width: 280px">
        <span class="input-icon">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path
              d="M8.5 3a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM2 8.5a6.5 6.5 0 1 1 11.44 4.23l3.87 3.86a.5.5 0 0 1-.7.7l-3.87-3.87A6.5 6.5 0 0 1 2 8.5z"
            />
          </svg>
        </span>
        <input
          v-model="searchQuery"
          class="input input-with-icon"
          :placeholder="$t('purge.searchPlaceholder')"
          type="text"
        />
      </div>
    </div>

    <div v-if="error" class="card error-card">
      <span class="error-text">{{ error }}</span>
    </div>

    <LoadingState
      v-if="loading"
      :title="$t('purge.scanning')"
      :subtitles="[
        $t('purge.findingProjects'),
        $t('purge.findingBuildArtifacts'),
        $t('purge.calculatingSize'),
        $t('purge.organizingList'),
      ]"
    />

    <LiveOutput v-if="loading" :lines="liveLines" />

    <div class="card purge-list-card stagger-in" v-if="items.length > 0">
      <div class="purge-list-header">
        <label class="checkbox purge-check-all">
          <input v-model="allChecked" type="checkbox" @change="toggleAll" />
          <span class="">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path
                d="M4 10.6l3.2 3.2 8.8-8.8"
                stroke="currentColor"
                stroke-width="2"
                fill="none"
              />
            </svg>
          </span>
          <span class="checkbox-label">{{ $t("purge.name") }}</span>
        </label>
        <span class="purge-col-type">{{ $t("purge.type") }}</span>
        <span class="purge-col-path">{{ $t("purge.path") }}</span>
        <span class="purge-col-size">{{ $t("purge.size") }}</span>
      </div>
      <div class="purge-list-body">
        <label class="purge-item" v-for="item in filteredItems" :key="item.id">
          <span class="purge-col-check">
            <span class="checkbox">
              <input v-model="item.checked" type="checkbox" />
              <span class="">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path
                    d="M4 10.6l3.2 3.2 8.8-8.8"
                    stroke="currentColor"
                    stroke-width="2"
                    fill="none"
                  />
                </svg>
              </span>
            </span>
          </span>
          <span class="purge-col-name">{{ item.name }}</span>
          <span class="purge-col-type">
            <span class="badge" :class="typeBadgeClass(item.type)">{{ typeLabel(item.type) }}</span>
          </span>
          <span class="purge-col-path" :title="item.path">{{ item.path }}</span>
          <span class="purge-col-size">{{ item.size }}</span>
        </label>
        <div class="purge-empty" v-if="filteredItems.length === 0">
          <span>{{ $t("purge.noMatch") }}</span>
        </div>
      </div>
    </div>

    <div v-else-if="!loading && !error" class="card empty-card">
      <span class="text-body">{{ $t("purge.emptyHint") }}</span>
    </div>

    <div class="purge-footer" v-if="selectedCount > 0">
      <div class="purge-stats">
        <span class="text-body">{{ $t("purge.selectedCount", { count: selectedCount }) }}</span>
        <span class="badge badge-warning" v-if="totalSize">{{ totalSize }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, inject } from "vue";
import { useI18n } from "vue-i18n";
import { useMole } from "../composables/useMole.js";
import { useAuth } from "../composables/useAuth.js";
import AuthErrorCard from "../components/AuthErrorCard.vue";
import LoadingState from "../components/LoadingState.vue";
import LiveOutput from "../components/LiveOutput.vue";

const { t } = useI18n();
const auth = useAuth();
const currentView = inject("currentView");
const authError = ref("");

async function withAuth(fn) {
  authError.value = "";
  const res = await auth.ensureSudo();
  if (!res.success) {
    authError.value = res.errorKey || "auth.failed";
    return;
  }
  await fn();
}

function navigateToSettings() {
  if (currentView) currentView.value = "settings";
}

const { loading, error, execSudo, previewPurge, parseSize, listenOutput, removeOutputListener } =
  useMole();

const searchQuery = ref("");
const allChecked = ref(false);
const items = ref([]);
const liveLines = ref([]);
let outputCallback = null;

function addLiveLine(text, type) {
  const trimmed = text.trim();
  if (!trimmed) return;
  liveLines.value.push({ text: trimmed, type });
  if (liveLines.value.length > 50) {
    liveLines.value = liveLines.value.slice(-50);
  }
}

const filteredItems = computed(() => {
  if (!searchQuery.value) return items.value;
  const q = searchQuery.value.toLowerCase();
  return items.value.filter(
    (i) =>
      i.name.toLowerCase().includes(q) ||
      i.path.toLowerCase().includes(q) ||
      i.type.toLowerCase().includes(q),
  );
});

const selectedCount = computed(() => items.value.filter((i) => i.checked).length);

const totalSize = computed(() => {
  let total = 0;
  for (const item of items.value) {
    if (item.checked && item.sizeBytes) {
      total += item.sizeBytes;
    }
  }
  if (total === 0) return "";
  const gb = total / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = total / 1024 ** 2;
  return `${Math.round(mb)} MB`;
});

function typeBadgeClass(type) {
  const map = {
    node: "badge-info",
    rust: "badge-warning",
    python: "badge-success",
    build: "badge-danger",
  };
  return map[type] || "badge-info";
}

function typeLabel(type) {
  const map = {
    node: "Node",
    rust: "Rust",
    python: "Python",
    build: "Build",
  };
  return map[type] || type;
}

function toggleAll() {
  const val = allChecked.value;
  for (const item of items.value) {
    item.checked = val;
  }
}

async function previewScan() {
  await withAuth(async () => {
    liveLines.value = [];
    outputCallback = (data) => addLiveLine(data.data, data.type);
    listenOutput(outputCallback);
    try {
      const parsed = await previewPurge();
      items.value = parsed.map((p) => reactive({ ...p, sizeBytes: parseSize(p.size) }));
      allChecked.value = false;
    } catch {
      items.value = [];
    } finally {
      if (outputCallback) {
        removeOutputListener(outputCallback);
        outputCallback = null;
      }
    }
  });
}

async function cleanSelected() {
  await withAuth(async () => {
    liveLines.value = [];
    outputCallback = (data) => addLiveLine(data.data, data.type);
    listenOutput(outputCallback);
    try {
      await execSudo("purge");
      items.value = [];
      allChecked.value = false;
    } catch {
      // error already set by useMole
    } finally {
      if (outputCallback) {
        removeOutputListener(outputCallback);
        outputCallback = null;
      }
    }
  });
}
</script>

<style scoped>
.purge-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;
}

.purge-toolbar-left {
  display: flex;
  gap: 12px;
}

.purge-list-card {
  padding: 0;
  overflow: hidden;
}

.purge-list-header {
  display: grid;
  grid-template-columns: 40px 1fr 80px 2fr 90px;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: var(--colorNeutralBackground3);
  font-size: 12px;
  font-weight: 500;
  color: var(--colorNeutralForeground2);
  border-bottom: 1px solid var(--colorNeutralStroke2);
}

.purge-list-body {
  max-height: 480px;
  overflow-y: auto;
}

.purge-item {
  display: grid;
  grid-template-columns: 40px 1fr 80px 2fr 90px;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--colorNeutralStroke2);
  transition: background 0.15s ease;
  cursor: pointer;
}

.purge-item:last-child {
  border-bottom: none;
}

.purge-item:hover {
  background: var(--colorNeutralBackgroundHover);
}

.purge-col-check {
  display: flex;
  align-items: center;
}

.purge-col-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--colorNeutralForeground1);
}

.purge-col-path {
  font-size: 12px;
  color: var(--colorNeutralForeground2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.purge-col-size {
  font-size: 14px;
  font-weight: 500;
  color: var(--colorNeutralForeground1);
  text-align: right;
}

.purge-empty {
  padding: 60px 20px;
  text-align: center;
  color: var(--colorNeutralForeground2);
  font-size: 14px;
}

.purge-footer {
  margin-top: 20px;
  padding: 14px 20px;
  border-radius: var(--corner40);
  background: var(--colorNeutralBackground3);
  border: 1px solid var(--colorNeutralStroke2);
}

.purge-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.purge-check-all {
  display: flex;
  align-items: center;
}

.purge-check-all .checkbox-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--colorNeutralForeground2);
}

.error-card {
  padding: 16px 20px;
  margin-bottom: 16px;
  border: 1px solid var(--colorDangerBackground1);
  background: rgba(209, 52, 56, 0.06);
}

.error-text {
  color: var(--colorDangerBackground1);
  font-size: 14px;
}

.empty-card {
  padding: 60px 20px;
  text-align: center;
}
</style>
