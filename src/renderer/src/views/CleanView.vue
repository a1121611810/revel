<template>
  <div class="fade-in">
    <h1 class="page-title">{{ $t("clean.title") }}</h1>
    <p class="page-subtitle">{{ $t("clean.subtitle") }}</p>

    <AuthErrorCard v-if="authError" @go-to-settings="navigateToSettings" />

    <div class="clean-toolbar">
      <button class="btn btn-outline" :disabled="loading" @click="previewScan">
        <svg class="" viewBox="0 0 20 20" fill="currentColor">
          <path
            d="M8.5 3a5.5 5.5 0 0 0-4.24 9.02l-.15.18a7 7 0 1 1 11.78 0l-.15-.18A5.5 5.5 0 0 0 8.5 3zm0 2a3.5 3.5 0 0 1 2.8 5.6l-2.8 3.79-2.8-3.8A3.5 3.5 0 0 1 8.5 5zm9.2 9.8a.5.5 0 0 1 .1.7l-3 4a.5.5 0 0 1-.76 0l-3-4a.5.5 0 0 1 .76-.64L14.5 17.8l2.6-3.46a.5.5 0 0 1 .6-.14z"
          />
        </svg>
        {{ $t("clean.previewScan") }}
      </button>
      <button
        class="btn btn-primary"
        :disabled="selectedCount === 0 || loading"
        @click="cleanSelected"
      >
        <svg class="" viewBox="0 0 20 20" fill="currentColor">
          <path
            d="M8.5 2a5.5 5.5 0 0 0-5.35 6.82l-2.1 2.1a.5.5 0 0 0 .35.85H5v1.3a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5V10.5h1.3a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5H6.82l2.1-2.1A5.5 5.5 0 1 0 8.5 2zm0 1a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM17.35 8.1a.5.5 0 0 0-.7 0l-2.5 2.5a.5.5 0 0 0 0 .7l2.5 2.5a.5.5 0 0 0 .7-.7L15.2 11h4.3a.5.5 0 0 0 0-1h-4.3l2.15-2.15a.5.5 0 0 0 0-.7z"
          />
        </svg>
        {{ $t("clean.clearSelected") }}
      </button>
      <button v-if="loading" class="btn btn-danger" @click="stopScan">
        <svg class="" viewBox="0 0 20 20" fill="currentColor">
          <path
            d="M5.25 3A2.25 2.25 0 0 0 3 5.25v9.5A2.25 2.25 0 0 0 5.25 17h9.5A2.25 2.25 0 0 0 17 14.75v-9.5A2.25 2.25 0 0 0 14.75 3h-9.5Z"
          />
        </svg>
        {{ $t("clean.stop") }}
      </button>
    </div>

    <div class="clean-footer" v-if="allCount > 0">
      <div class="clean-stats">
        <span class="text-body">{{ $t("clean.totalAll") }}</span>
        <span class="badge badge-info">{{ $t("common.itemCount", { count: allCount }) }}</span>
        <span class="badge badge-warning" v-if="allTotalSize">{{ allTotalSize }}</span>
      </div>
      <div class="clean-stats" v-if="selectedCount > 0">
        <span class="text-body">{{ $t("clean.totalSelected") }}</span>
        <span class="badge badge-info">{{ $t("common.itemCount", { count: selectedCount }) }}</span>
        <span class="badge badge-warning" v-if="totalSize">{{ totalSize }}</span>
      </div>
    </div>

    <div v-if="error" class="card error-card">
      <span class="error-text">{{ error }}</span>
    </div>

    <LoadingState v-if="loading" :title="loadingTitle" :subtitles="loadingSubtitles" />

    <div v-if="loading && liveLines.length > 0" class="card live-output-card">
      <div class="live-output-header">
        <span class="live-output-title">{{ $t("clean.liveOutput") }}</span>
        <span class="live-output-dot"></span>
      </div>
      <div class="live-output-body" ref="liveOutputBody">
        <div
          v-for="(line, i) in liveLines"
          :key="i"
          class="live-output-line"
          :class="{ 'live-stderr': line.type === 'stderr' }"
        >
          {{ line.text }}
        </div>
      </div>
    </div>

    <div class="clean-categories stagger-in" v-if="categories.length > 0">
      <div class="card clean-category" v-for="category in categories" :key="category.id">
        <div class="category-header">
          <label class="checkbox">
            <input
              v-model="category.checked"
              type="checkbox"
              @change="handleCategoryCheck(category)"
            />
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
            <span class="checkbox-label text-body">{{ category.name }}</span>
          </label>
          <div class="category-meta">
            <span class="badge" :class="`badge-${category.badgeType}`">{{
              $t("common.itemCount", { count: category.items.length })
            }}</span>
            <span class="badge badge-info" v-if="categoryTotalSize(category)">{{
              categoryTotalSize(category)
            }}</span>
          </div>
        </div>
        <div class="category-items">
          <label class="checkbox category-item" v-for="item in category.items" :key="item.id">
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
            <span class="checkbox-label">{{ item.name }}</span>
            <span class="item-size" v-if="item.size">{{ item.size }}</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Clean result card -->
    <div v-if="cleanResult.show" class="card clean-result-card">
      <div class="clean-result-icon">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h2 class="clean-result-title">{{ $t("clean.completed") }}</h2>
      <div class="clean-result-size">{{ cleanResult.releasedSize }}</div>
      <p class="clean-result-desc">
        {{ $t("clean.itemsCleared", { count: cleanResult.itemCount }) }}
      </p>
      <button class="btn btn-primary" @click="dismissCleanResult">{{ $t("clean.done") }}</button>
    </div>

    <div v-else-if="!loading && !error && !scanned" class="card empty-card">
      <span class="text-body">{{ $t("clean.emptyHint") }}</span>
    </div>

    <div
      v-else-if="!loading && !error && scanned && categories.length === 0"
      class="card empty-card"
    >
      <span class="text-body">{{ $t("clean.permissionHint") }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, inject } from "vue";
import { useI18n } from "vue-i18n";
import { useMole } from "../composables/useMole.js";
import { useAuth } from "../composables/useAuth.js";
import AuthErrorCard from "../components/AuthErrorCard.vue";
import LoadingState from "../components/LoadingState.vue";

const { t } = useI18n();
const {
  loading,
  error,
  execSudo,
  previewClean,
  listenOutput,
  removeOutputListener,
  cancelRunning,
} = useMole();
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

const categories = ref([]);
const liveLines = ref([]);
const liveOutputBody = ref(null);
const scanned = ref(false);
const operationType = ref("scan");
const cleanResult = ref({ show: false, releasedSize: "", itemCount: 0 });
let outputCallback = null;

const loadingTitle = computed(() =>
  operationType.value === "clean" ? t("clean.cleaning") + "..." : t("clean.scanning") + "...",
);

const loadingSubtitles = computed(() =>
  operationType.value === "clean"
    ? [t("clean.deleting") + "...", t("clean.freeingSpace") + "...", t("clean.finishing") + "..."]
    : [
        t("clean.readingDirs") + "...",
        t("clean.calculatingSize") + "...",
        t("clean.analyzingItems") + "...",
        t("clean.organizingResults") + "...",
      ],
);

const allCount = computed(() => {
  let count = 0;
  for (const cat of categories.value) {
    count += cat.items.length;
  }
  return count;
});

const allTotalSize = computed(() => {
  let total = 0;
  for (const cat of categories.value) {
    for (const item of cat.items) {
      if (item.sizeBytes) {
        total += item.sizeBytes;
      }
    }
  }
  if (total === 0) return "";
  const gb = total / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = total / 1024 ** 2;
  return `${Math.round(mb)} MB`;
});

function categoryTotalSize(category) {
  let total = 0;
  for (const item of category.items) {
    if (item.sizeBytes) {
      total += item.sizeBytes;
    }
  }
  if (total === 0) return "";
  const gb = total / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = total / 1024 ** 2;
  return `${Math.round(mb)} MB`;
}

const selectedCount = computed(() => {
  let count = 0;
  for (const cat of categories.value) {
    for (const item of cat.items) {
      if (item.checked) count++;
    }
  }
  return count;
});

const totalSize = computed(() => {
  let total = 0;
  for (const cat of categories.value) {
    for (const item of cat.items) {
      if (item.checked && item.sizeBytes) {
        total += item.sizeBytes;
      }
    }
  }
  if (total === 0) return "";
  const gb = total / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = total / 1024 ** 2;
  return `${Math.round(mb)} MB`;
});

function addLiveLine(text, type) {
  const trimmed = text.trim();
  if (!trimmed) return;
  liveLines.value.push({ text: trimmed, type });
  if (liveLines.value.length > 8) {
    liveLines.value = liveLines.value.slice(-8);
  }
  nextTick(() => {
    if (liveOutputBody.value) {
      liveOutputBody.value.scrollTop = liveOutputBody.value.scrollHeight;
    }
  });
}

function stopScan() {
  cancelRunning();
}

async function previewScan() {
  await withAuth(async () => {
    console.log("[CleanView] previewScan started");
    operationType.value = "scan";
    scanned.value = true;
    liveLines.value = [];
    outputCallback = (data) => {
      addLiveLine(data.data, data.type);
    };
    listenOutput(outputCallback);

    try {
      const parsed = await previewClean();
      console.log("[CleanView] previewClean returned", parsed.length, "categories");
      if (parsed.length > 0) {
        categories.value = parsed.map((cat, idx) => ({
          id: `cat-${idx}`,
          name: cat.name,
          checked: cat.checked,
          badgeType: ["success", "info", "warning", "danger"][idx % 4],
          items: cat.items.map((item, iidx) => ({
            id: `item-${idx}-${iidx}`,
            name: item.name,
            checked: item.checked,
            size: item.size,
            sizeBytes: item.sizeBytes,
          })),
        }));
        console.log("[CleanView] categories set:", categories.value.length);
      } else {
        console.log("[CleanView] parsed empty, setting categories to []");
        categories.value = [];
      }
    } catch (err) {
      console.log("[CleanView] previewScan catch error:", err?.message);
      categories.value = [];
    } finally {
      if (outputCallback) {
        removeOutputListener(outputCallback);
        outputCallback = null;
      }
    }
    console.log("[CleanView] previewScan done, categories.length:", categories.value.length);
  });
}

async function cleanSelected() {
  await withAuth(async () => {
    operationType.value = "clean";
    liveLines.value = [];

    // Record selected items before cleaning
    const selectedItems = [];
    let releasedBytes = 0;
    for (const cat of categories.value) {
      for (const item of cat.items) {
        if (item.checked) {
          selectedItems.push(item);
          if (item.sizeBytes) releasedBytes += item.sizeBytes;
        }
      }
    }

    outputCallback = (data) => addLiveLine(data.data, data.type);
    listenOutput(outputCallback);
    try {
      await execSudo("clean");
      cleanResult.value = {
        show: true,
        releasedSize: formatBytes(releasedBytes),
        itemCount: selectedItems.length,
      };
      categories.value = [];
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

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / 1024 ** 2;
  if (mb >= 1) return `${Math.round(mb)} MB`;
  const kb = bytes / 1024;
  if (kb >= 1) return `${Math.round(kb)} KB`;
  return `${bytes} B`;
}

function handleCategoryCheck(category) {
  for (const item of category.items) {
    item.checked = category.checked;
  }
}

function dismissCleanResult() {
  cleanResult.value.show = false;
  scanned.value = false;
  categories.value = [];
}
</script>

<style scoped>
.clean-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.clean-categories {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.clean-category {
  padding: 20px;
}

.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--colorNeutralStroke1);
}

.category-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}

.category-item {
  padding: 8px 12px;
  border-radius: var(--corner40);
  background: var(--colorNeutralBackground2);
  transition: background 0.2s ease;
  align-items: center;
}

.category-item:hover {
  background: var(--colorSubtleBackgroundHover);
}

.item-size {
  margin-left: auto;
  font-size: 12px;
  color: var(--colorNeutralForeground2);
}

.category-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.clean-footer {
  margin-top: 24px;
  margin-bottom: 24px;
  padding: 16px 20px;
  border-radius: var(--corner40);
  background: var(--colorNeutralBackground2);
  border: 1px solid var(--colorNeutralStroke1);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.clean-stats {
  display: flex;
  align-items: center;
  gap: 12px;
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

.live-output-card {
  padding: 0;
  overflow: hidden;
  margin-top: 16px;
  background: var(--colorNeutralBackground3);
  border: 1px solid var(--colorNeutralStroke2);
}

.live-output-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--colorNeutralBackground2);
  border-bottom: 1px solid var(--colorNeutralStroke2);
}

.live-output-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--colorNeutralForeground2);
}

.live-output-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--colorSuccessBackground1);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.live-output-body {
  padding: 10px 16px;
  max-height: 180px;
  overflow-y: auto;
  font-family: "Cascadia Code", "Consolas", "SF Mono", monospace;
  font-size: 12px;
  line-height: 1.7;
}

.live-output-line {
  color: var(--colorNeutralForeground1);
  white-space: pre-wrap;
  word-break: break-all;
}

.live-stderr {
  color: var(--colorDangerBackground1);
}

/* Fluent Design clean result card */
.clean-result-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 32px;
  text-align: center;
  background: linear-gradient(
    180deg,
    rgba(16, 124, 16, 0.06) 0%,
    var(--colorNeutralBackground1) 100%
  );
  border: 1px solid rgba(16, 124, 16, 0.15);
  border-radius: var(--corner80);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.clean-result-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--cornerCircular);
  background: var(--colorSuccessBackground1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.clean-result-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--colorNeutralForeground1);
  margin: 0;
}

.clean-result-size {
  font-size: 36px;
  font-weight: 700;
  color: var(--colorSuccessBackground1);
  line-height: 1.2;
}

.clean-result-desc {
  font-size: 13px;
  color: var(--colorNeutralForeground2);
  margin: 0 0 8px;
}
</style>
