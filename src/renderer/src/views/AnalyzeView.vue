<template>
  <div class="fade-in">
    <AuthErrorCard v-if="authError" @go-to-settings="navigateToSettings" />

    <h1 class="page-title">{{ $t("analyze.title") }}</h1>
    <p class="page-subtitle">{{ $t("analyze.subtitle") }}</p>

    <div class="analyze-toolbar">
      <button class="btn btn-primary" :disabled="loading" @click="scanDisk">
        <svg class="" viewBox="0 0 20 20" fill="currentColor">
          <path
            d="M8.5 3a5.5 5.5 0 0 0-4.24 9.02l-.15.18a7 7 0 1 1 11.78 0l-.15-.18A5.5 5.5 0 0 0 8.5 3zm0 2a3.5 3.5 0 0 1 2.8 5.6l-2.8 3.79-2.8-3.8A3.5 3.5 0 0 1 8.5 5z"
          />
        </svg>
        {{ $t("analyze.scanDisk") }}
      </button>
    </div>

    <div v-if="error" class="card error-card">
      <span class="error-text">{{ error }}</span>
    </div>

    <LoadingState
      v-if="loading"
      :title="$t('analyze.analyzing')"
      :subtitles="[
        $t('analyze.scanning1'),
        $t('analyze.scanning2'),
        $t('analyze.scanning3'),
        $t('analyze.generatingChart'),
      ]"
    />

    <LiveOutput v-if="loading" :lines="liveLines" />

    <div class="analyze-content stagger-in" v-if="diskData.length > 0">
      <div class="card chart-card">
        <h3 class="card-title">{{ $t("analyze.diskDistribution") }}</h3>
        <div class="chart-container">
          <svg class="donut-chart" viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r="70"
              fill="none"
              stroke="var(--colorNeutralBackground3)"
              stroke-width="24"
            />
            <circle
              v-for="(slice, i) in pieSlices"
              :key="i"
              cx="100"
              cy="100"
              r="70"
              fill="none"
              :stroke="slice.color"
              stroke-width="24"
              :stroke-dasharray="`${slice.arc} ${440 - slice.arc}`"
              :stroke-dashoffset="slice.offset"
              stroke-linecap="butt"
            />
            <text x="100" y="94" text-anchor="middle" class="chart-center-label">
              {{ $t("analyze.total") }}
            </text>
            <text x="100" y="116" text-anchor="middle" class="chart-center-value">
              {{ usedPercentage }}
            </text>
          </svg>
        </div>
        <div class="chart-legend">
          <div class="legend-item" v-for="(slice, i) in pieSlices" :key="i">
            <span class="legend-dot" :style="{ background: slice.color }"></span>
            <span class="legend-label">{{ slice.name }}</span>
            <span class="legend-value">{{ slice.size }}</span>
          </div>
        </div>
      </div>

      <div class="card dirs-card">
        <h3 class="card-title">{{ $t("analyze.topDirs") }}</h3>
        <div class="dirs-list">
          <div class="dir-item" v-for="dir in topDirectories" :key="dir.path">
            <div class="dir-info">
              <span class="dir-name">{{ dir.name }}</span>
              <span class="dir-path">{{ dir.path }}</span>
            </div>
            <div class="dir-bar-container">
              <div
                class="dir-bar"
                :style="{ width: dir.percentage + '%', background: dir.color }"
              ></div>
            </div>
            <span class="dir-size">{{ dir.size }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="!loading && !error" class="card empty-card">
      <span class="text-body">{{ $t("analyze.emptyHint") }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from "vue";
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

const {
  loading,
  error,
  scanDisk: fetchDiskAnalysis,
  listenOutput,
  removeOutputListener,
  formatSize,
} = useMole();

const diskData = ref([]);
const topDirectories = ref([]);
const totalSize = ref(0);
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

const totalBytes = computed(() => diskData.value.reduce((sum, d) => sum + d.bytes, 0));

const usedPercentage = computed(() => {
  return totalSize.value > 0 ? formatSize(totalSize.value) : "0 B";
});

const pieSlices = computed(() => {
  const circumference = 440;
  let offset = 0;
  return diskData.value.map((d) => {
    const percentage = totalBytes.value > 0 ? d.bytes / totalBytes.value : 0;
    const arc = circumference * percentage;
    const slice = {
      ...d,
      arc,
      offset: -offset,
      percentage: Math.round(percentage * 100),
    };
    offset += arc;
    return slice;
  });
});

async function scanDisk() {
  await withAuth(async () => {
    liveLines.value = [];
    outputCallback = (data) => addLiveLine(data.data, data.type);
    listenOutput(outputCallback);
    try {
      const parsed = await fetchDiskAnalysis();
      diskData.value = parsed.diskData;
      topDirectories.value = parsed.topDirectories;
      totalSize.value = parsed.totalSize;
    } catch {
      diskData.value = [];
      topDirectories.value = [];
      totalSize.value = 0;
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
.analyze-toolbar {
  margin-bottom: 24px;
}

.analyze-content {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
}

.chart-card {
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.chart-container {
  margin: 24px 0;
}

.donut-chart {
  width: 240px;
  height: 240px;
  transform: rotate(-90deg);
}

.donut-chart text {
  transform: rotate(90deg);
  transform-origin: center;
}

.chart-center-label {
  font-size: 14px;
  fill: var(--colorNeutralForeground2);
}

.chart-center-value {
  font-size: 28px;
  font-weight: 600;
  fill: var(--colorNeutralForeground1);
}

.chart-legend {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}

.legend-label {
  color: var(--colorNeutralForeground1);
  flex: 1;
}

.legend-value {
  color: var(--colorNeutralForeground2);
  font-size: 12px;
}

.dirs-card {
  padding: 24px;
}

.dirs-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 16px;
}

.dir-item {
  display: grid;
  grid-template-columns: 1fr 200px 80px;
  align-items: center;
  gap: 16px;
  padding: 10px 12px;
  border-radius: var(--corner40);
  transition: background 0.2s ease;
}

.dir-item:hover {
  background: var(--colorSubtleBackgroundHover);
}

.dir-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--colorNeutralForeground1);
  display: block;
}

.dir-path {
  font-size: 12px;
  color: var(--colorNeutralForeground2);
  display: block;
}

.dir-bar-container {
  height: 6px;
  background: var(--colorNeutralBackground3);
  border-radius: 3px;
  overflow: hidden;
}

.dir-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s ease;
}

.dir-size {
  font-size: 14px;
  font-weight: 500;
  color: var(--colorNeutralForeground1);
  text-align: right;
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
