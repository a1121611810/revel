<template>
  <div class="fade-in">
    <AuthErrorCard v-if="authError" @go-to-settings="navigateToSettings" />

    <h1 class="page-title">{{ $t("uninstall.title") }}</h1>
    <p class="page-subtitle">{{ $t("uninstall.subtitle") }}</p>

    <div class="uninstall-toolbar">
      <div class="input-wrapper" style="flex: 1; max-width: 400px">
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
          :placeholder="$t('uninstall.searchPlaceholder')"
          type="text"
        />
      </div>
      <button class="btn btn-outline" :disabled="loading" @click="refreshApps">
        <svg class="" viewBox="0 0 20 20" fill="currentColor">
          <path
            d="M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm0 1a6 6 0 1 1 0 12A6 6 0 0 1 10 4zm0 2a.5.5 0 0 0-.5.5v3.8l-2.15 1.43a.5.5 0 0 0 .55.84l2.3-1.53a.5.5 0 0 0 .3-.46V6.5A.5.5 0 0 0 10 6z"
          />
        </svg>
        {{ $t("uninstall.refresh") }}
      </button>
    </div>

    <div v-if="error" class="card error-card">
      <span class="error-text">{{ error }}</span>
    </div>

    <LoadingState
      v-if="loading"
      :title="$t('uninstall.loading')"
      :subtitles="[
        $t('uninstall.scanningApps'),
        $t('uninstall.readingMetadata'),
        $t('uninstall.calculatingSize'),
      ]"
    />

    <LiveOutput v-if="loading" :lines="liveLines" />

    <div class="card app-list-card stagger-in" v-if="apps.length > 0">
      <div class="app-list-header">
        <span class="app-col-icon"></span>
        <span
          class="app-col-name sortable"
          :class="{ active: sortKey === 'name' }"
          @click="toggleSort('name')"
        >
          {{ $t("uninstall.appName") }} <span class="sort-indicator">{{ sortIcon("name") }}</span>
        </span>
        <span
          class="app-col-path sortable"
          :class="{ active: sortKey === 'path' }"
          @click="toggleSort('path')"
        >
          {{ $t("uninstall.installPath") }}
          <span class="sort-indicator">{{ sortIcon("path") }}</span>
        </span>
        <span
          class="app-col-size sortable"
          :class="{ active: sortKey === 'size' }"
          @click="toggleSort('size')"
        >
          {{ $t("uninstall.size") }} <span class="sort-indicator">{{ sortIcon("size") }}</span>
        </span>
        <span class="app-col-action">{{ $t("uninstall.action") }}</span>
      </div>
      <div class="app-list-body">
        <div class="app-item" v-for="app in sortedApps" :key="app.id">
          <span class="app-col-icon">
            <div class="app-icon">{{ app.name.charAt(0) }}</div>
          </span>
          <span class="app-col-name">
            <span class="app-name">{{ app.name }}</span>
            <span class="app-version">v{{ app.version }}</span>
          </span>
          <span class="app-col-path" :title="app.path">{{ app.path }}</span>
          <span class="app-col-size">{{ app.size }}</span>
          <span class="app-col-action">
            <button class="btn btn-outline btn-small" @click="uninstallApp(app)">
              {{ $t("uninstall.uninstallBtn") }}
            </button>
          </span>
        </div>
        <div class="app-empty" v-if="sortedApps.length === 0">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path
              d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 1a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM7 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm3 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm3 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"
            />
          </svg>
          <span>{{ $t("uninstall.noMatch") }}</span>
        </div>
      </div>
    </div>

    <div v-else-if="!loading && !error" class="card empty-card">
      <span class="text-body">{{ $t("uninstall.emptyHint") }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, inject } from "vue";
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

const { loading, error, execSudo, listApps, listenOutput, removeOutputListener, parseSize } =
  useMole();

const searchQuery = ref("");
const apps = ref([]);
const liveLines = ref([]);
const sortKey = ref("name");
const sortOrder = ref("asc");
let outputCallback = null;

function toggleSort(key) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortOrder.value = "asc";
  }
}

function sortIcon(key) {
  if (sortKey.value !== key) return "";
  return sortOrder.value === "asc" ? "↑" : "↓";
}

function addLiveLine(text, type) {
  const trimmed = text.trim();
  if (!trimmed) return;
  liveLines.value.push({ text: trimmed, type });
  if (liveLines.value.length > 50) {
    liveLines.value = liveLines.value.slice(-50);
  }
}

const sortedApps = computed(() => {
  let list = apps.value;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter((a) => a.name.toLowerCase().includes(q) || a.path.toLowerCase().includes(q));
  }
  const key = sortKey.value;
  const order = sortOrder.value;
  list = list.slice().sort((a, b) => {
    let cmp = 0;
    if (key === "size") {
      cmp = parseSize(a.size) - parseSize(b.size);
    } else {
      cmp = (a[key] || "").localeCompare(b[key] || "");
    }
    return order === "asc" ? cmp : -cmp;
  });
  return list;
});

async function refreshApps() {
  liveLines.value = [];
  outputCallback = (data) => addLiveLine(data.data, data.type);
  listenOutput(outputCallback);
  try {
    const parsed = await listApps();
    apps.value = parsed.length > 0 ? parsed : [];
  } catch (err) {
    console.log("[UninstallView] refreshApps failed:", err?.message);
    apps.value = [];
  } finally {
    if (outputCallback) {
      removeOutputListener(outputCallback);
      outputCallback = null;
    }
  }
}

onMounted(() => {
  nextTick(() => refreshApps());
});

async function uninstallApp(app) {
  if (!window.confirm(t("uninstall.confirm", { name: app.name }))) return;
  await withAuth(async () => {
    liveLines.value = [];
    outputCallback = (data) => addLiveLine(data.data, data.type);
    listenOutput(outputCallback);
    try {
      await execSudo(`uninstall "${app.name}"`);
      apps.value = apps.value.filter((a) => a.id !== app.id);
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
.uninstall-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.app-list-card {
  padding: 0;
  overflow: hidden;
}

.app-list-header {
  display: grid;
  grid-template-columns: 44px 1fr 2fr 100px 100px;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: var(--colorNeutralBackground3);
  font-size: 12px;
  font-weight: 500;
  color: var(--colorNeutralForeground2);
  border-bottom: 1px solid var(--colorNeutralStroke1);
}

.app-list-body {
  max-height: 520px;
  overflow-y: auto;
}

.app-item {
  display: grid;
  grid-template-columns: 44px 1fr 2fr 100px 100px;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--colorNeutralStroke1);
  transition: background 0.15s ease;
}

.app-item:last-child {
  border-bottom: none;
}

.app-item:hover {
  background: var(--colorSubtleBackgroundHover);
}

.app-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--corner40);
  background: var(--colorBrandBackgroundTint);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
}

.app-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--colorNeutralForeground1);
}

.app-version {
  display: block;
  font-size: 12px;
  color: var(--colorNeutralForeground2);
}

.app-col-path {
  font-size: 12px;
  color: var(--colorNeutralForeground2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-col-size {
  font-size: 14px;
  font-weight: 500;
  color: var(--colorNeutralForeground1);
}

.app-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 20px;
  color: var(--colorNeutralForeground2);
}

.app-empty svg {
  width: 48px;
  height: 48px;
  opacity: 0.4;
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

.sortable {
  cursor: pointer;
  user-select: none;
  transition: color 0.15s ease;
}

.sortable:hover {
  color: var(--colorNeutralForeground1);
}

.sortable.active {
  color: var(--colorBrandForeground1);
}

.sort-indicator {
  display: inline-block;
  width: 14px;
  text-align: center;
  font-size: 11px;
}
</style>
