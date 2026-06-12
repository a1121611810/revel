<template>
  <div class="fade-in">
    <h1 class="page-title">{{ $t("installer.title") }}</h1>
    <p class="page-subtitle">{{ $t("installer.subtitle") }}</p>

    <div class="installer-toolbar">
      <div class="installer-toolbar-left">
        <button class="btn btn-outline" :disabled="loading" @click="scanInstallers">
          <svg class="" viewBox="0 0 20 20" fill="currentColor">
            <path
              d="M8.5 3a5.5 5.5 0 0 0-4.24 9.02l-.15.18a7 7 0 1 1 11.78 0l-.15-.18A5.5 5.5 0 0 0 8.5 3zm0 2a3.5 3.5 0 0 1 2.8 5.6l-2.8 3.79-2.8-3.8A3.5 3.5 0 0 1 8.5 5z"
            />
          </svg>
          {{ $t("installer.scan") }}
        </button>
        <button
          class="btn btn-danger-outline"
          :disabled="selectedCount === 0 || loading"
          @click="deleteSelected"
        >
          <svg class="" viewBox="0 0 20 20" fill="currentColor">
            <path
              d="M8.5 2a5.5 5.5 0 0 0-5.35 6.82l-2.1 2.1a.5.5 0 0 0 .35.85H5v1.3a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5V10.5h1.3a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5H6.82l2.1-2.1A5.5 5.5 0 1 0 8.5 2zm0 1a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z"
            />
          </svg>
          {{ $t("installer.deleteSelected") }}
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
          :placeholder="$t('installer.searchPlaceholder')"
          type="text"
        />
      </div>
    </div>

    <div v-if="error" class="card error-card">
      <span class="error-text">{{ error }}</span>
    </div>

    <LoadingState
      v-if="loading"
      :title="$t('installer.scanning')"
      :subtitles="[
        $t('installer.findingDMG'),
        $t('installer.findingPKG'),
        $t('installer.calculatingSize'),
      ]"
    />

    <LiveOutput v-if="loading" :lines="liveLines" />

    <div class="card installer-list-card stagger-in" v-if="packages.length > 0">
      <div class="installer-list-header">
        <span class="inst-col-icon"></span>
        <span class="inst-col-name">{{ $t("installer.name") }}</span>
        <span class="inst-col-path">{{ $t("installer.path") }}</span>
        <span class="inst-col-size">{{ $t("installer.size") }}</span>
        <span class="inst-col-date">{{ $t("installer.modifiedDate") }}</span>
        <span class="inst-col-action">{{ $t("installer.action") }}</span>
      </div>
      <div class="installer-list-body">
        <div class="installer-item" v-for="pkg in filteredPackages" :key="pkg.id">
          <span class="inst-col-icon">
            <input type="checkbox" class="checkbox-native" v-model="pkg.checked" />
          </span>
          <span class="inst-col-name">
            <span class="pkg-name">{{ pkg.name }}</span>
            <span class="pkg-ext">{{ pkg.ext }}</span>
          </span>
          <span class="inst-col-path" :title="pkg.path">{{ pkg.path }}</span>
          <span class="inst-col-size">{{ pkg.size }}</span>
          <span class="inst-col-date">{{ pkg.date }}</span>
          <span class="inst-col-action">
            <button class="btn btn-danger-outline btn-small" @click="deletePackage(pkg)">
              {{ $t("installer.delete") }}
            </button>
          </span>
        </div>
        <div class="installer-empty" v-if="filteredPackages.length === 0">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 1a7 7 0 1 1 0 14A7 7 0 0 1 10 3z" />
          </svg>
          <span>{{ $t("installer.noMatch") }}</span>
        </div>
      </div>
    </div>

    <div v-else-if="!loading && !error" class="card empty-card">
      <span class="text-body">{{ $t("installer.emptyHint") }}</span>
    </div>

    <div class="installer-footer" v-if="selectedCount > 0">
      <div class="installer-stats">
        <span class="text-body">{{ $t("installer.selectedCount", { count: selectedCount }) }}</span>
        <span class="badge badge-danger" v-if="totalSize"
          >{{ $t("installer.releasable") }} {{ totalSize }}</span
        >
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useMole } from "../composables/useMole.js";
import LoadingState from "../components/LoadingState.vue";
import LiveOutput from "../components/LiveOutput.vue";

const { t } = useI18n();

const {
  loading,
  error,
  execRaw,
  scanInstallers: fetchInstallerPackages,
  parseSize,
  listenOutput,
  removeOutputListener,
} = useMole();

const searchQuery = ref("");
const packages = ref([]);
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

const filteredPackages = computed(() => {
  if (!searchQuery.value) return packages.value;
  const q = searchQuery.value.toLowerCase();
  return packages.value.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.path.toLowerCase().includes(q) ||
      p.ext.toLowerCase().includes(q),
  );
});

const selectedCount = computed(() => packages.value.filter((p) => p.checked).length);

const totalSize = computed(() => {
  let total = 0;
  for (const pkg of packages.value) {
    if (pkg.checked && pkg.sizeBytes) {
      total += pkg.sizeBytes;
    }
  }
  if (total === 0) return "";
  const gb = total / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = total / 1024 ** 2;
  return `${Math.round(mb)} MB`;
});

async function scanInstallers() {
  liveLines.value = [];
  outputCallback = (data) => addLiveLine(data.data, data.type);
  listenOutput(outputCallback);
  try {
    const parsed = await fetchInstallerPackages();
    packages.value = parsed.map((p) => ({ ...p, sizeBytes: parseSize(p.size) }));
  } catch {
    packages.value = [];
  } finally {
    if (outputCallback) {
      removeOutputListener(outputCallback);
      outputCallback = null;
    }
  }
}

async function deleteSelected() {
  if (!window.confirm(t("installer.confirmMultiple", { count: selectedCount.value }))) return;
  const selected = packages.value.filter((p) => p.checked);
  if (selected.length === 0) return;
  const paths = selected.map((p) => p.path);
  try {
    await execRaw("rm", paths);
    packages.value = packages.value.filter((p) => !p.checked);
  } catch {
    // error already set by useMole
  }
}

async function deletePackage(pkg) {
  if (!window.confirm(`${t("installer.confirmSingle")} ${pkg.name}?`)) return;
  try {
    await execRaw("rm", [pkg.path]);
    packages.value = packages.value.filter((p) => p.id !== pkg.id);
  } catch {
    // error already set by useMole
  }
}
</script>

<style scoped>
.installer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;
}

.installer-toolbar-left {
  display: flex;
  gap: 12px;
}

.installer-list-card {
  padding: 0;
  overflow: hidden;
}

.installer-list-header {
  display: grid;
  grid-template-columns: 36px 1fr 2fr 90px 110px 90px;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: var(--colorNeutralBackground3);
  font-size: 12px;
  font-weight: 500;
  color: var(--colorNeutralForeground2);
  border-bottom: 1px solid var(--colorNeutralStroke2);
}

.installer-list-body {
  max-height: 500px;
  overflow-y: auto;
}

.installer-item {
  display: grid;
  grid-template-columns: 36px 1fr 2fr 90px 110px 90px;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--colorNeutralStroke2);
  transition: background 0.15s ease;
}

.installer-item:last-child {
  border-bottom: none;
}

.installer-item:hover {
  background: var(--colorNeutralBackgroundHover);
}

.pkg-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--colorNeutralForeground1);
}

.pkg-ext {
  display: block;
  font-size: 12px;
  color: var(--colorNeutralForeground2);
}

.inst-col-path {
  font-size: 12px;
  color: var(--colorNeutralForeground2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inst-col-size {
  font-size: 14px;
  font-weight: 500;
  color: var(--colorNeutralForeground1);
}

.inst-col-date {
  font-size: 12px;
  color: var(--colorNeutralForeground2);
}

.checkbox-native {
  width: 16px;
  height: 16px;
  accent-color: var(--colorBrandBackgroundTint);
  cursor: pointer;
}

.installer-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 20px;
  color: var(--colorNeutralForeground2);
}

.installer-empty svg {
  width: 48px;
  height: 48px;
  opacity: 0.4;
}

.installer-footer {
  margin-top: 20px;
  padding: 14px 20px;
  border-radius: var(--corner40);
  background: var(--colorNeutralBackground3);
  border: 1px solid var(--colorNeutralStroke2);
}

.installer-stats {
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
</style>
