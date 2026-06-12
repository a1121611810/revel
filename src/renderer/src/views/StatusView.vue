<template>
  <div class="fade-in">
    <h1 class="page-title">{{ $t("status.title") }}</h1>
    <p class="page-subtitle">{{ $t("status.subtitle") }}</p>

    <!-- Data source toggle bar -->
    <div class="source-toggle-bar">
      <span class="source-toggle-label">{{ $t("status.dataSource") }}</span>
      <span class="source-status-pill" :class="'status-' + globalSourceMode">
        {{ SOURCE_LABEL[globalSourceMode] }}
      </span>
      <div class="source-action-group">
        <button
          class="source-action-btn"
          :disabled="globalSourceMode === 'native'"
          @click="setAllModules('native')"
        >
          {{ $t("status.native") }}
        </button>
        <button
          class="source-action-btn"
          :disabled="globalSourceMode === 'mole'"
          @click="setAllModules('mole')"
        >
          {{ $t("status.mole") }}
        </button>
      </div>
    </div>

    <div v-if="error" class="card error-card">
      <span class="error-text">{{ error }}</span>
    </div>

    <div class="status-dashboard stagger-in">
      <!-- System overview banner -->
      <div class="overview-banner">
        <div class="overview-section">
          <div class="overview-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="3" width="20" height="6" rx="1" />
              <rect x="2" y="15" width="20" height="6" rx="1" />
              <path d="M6 6v.01" />
              <path d="M6 18v.01" />
            </svg>
          </div>
          <div class="overview-info">
            <span class="overview-label">{{ $t("status.platform") }}</span>
            <span class="overview-value">{{ platformInfo }}</span>
          </div>
        </div>
        <div class="overview-divider"></div>
        <div class="overview-section">
          <div class="overview-icon-wrap uptime">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div class="overview-info">
            <span class="overview-label">{{ $t("status.uptime") }}</span>
            <span class="overview-value">{{ uptimeText }}</span>
          </div>
        </div>
        <div class="overview-divider"></div>
        <div class="overview-section">
          <div class="overview-icon-wrap health" :class="healthClass">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div class="overview-info">
            <span class="overview-label">{{ $t("status.health") }}</span>
            <span class="overview-value" :class="healthClass">{{ healthScoreDisplay }}</span>
          </div>
        </div>
      </div>

      <!-- Primary resource cards -->
      <div class="primary-metrics">
        <!-- CPU card -->
        <div class="card metric-card metric-cpu">
          <div class="metric-header">
            <div
              class="metric-icon-box"
              style="
                background: var(--colorBrandBackgroundTint);
                color: var(--colorBrandForeground1);
              "
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <rect x="9" y="9" width="6" height="6" rx="1" />
                <path d="M9 1v3" />
                <path d="M15 1v3" />
                <path d="M9 20v3" />
                <path d="M15 20v3" />
                <path d="M20 9h3" />
                <path d="M20 15h3" />
                <path d="M1 9h3" />
                <path d="M1 15h3" />
              </svg>
            </div>
            <div class="metric-title-group">
              <span class="metric-name">CPU {{ $t("status.cpuUsage") }}</span>
              <span class="metric-sub" ref="cpuValueRef">{{ cpuUsage }}%</span>
            </div>
            <div class="segmented-control">
              <button
                class="segmented-btn"
                :class="{ active: moduleDataSource.cpu === 'native' }"
                @click="setModuleSource('cpu', 'native')"
              >
                {{ $t("status.native") }}
              </button>
              <button
                class="segmented-btn"
                :class="{ active: moduleDataSource.cpu === 'mole' }"
                @click="setModuleSource('cpu', 'mole')"
              >
                {{ $t("status.mole") }}
              </button>
            </div>
          </div>
          <div class="metric-body">
            <div class="donut-wrap">
              <svg class="donut-chart" viewBox="0 0 160 160">
                <defs>
                  <linearGradient id="cpuGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="var(--colorBrandForeground1)" />
                    <stop offset="100%" stop-color="var(--colorBrandForeground1)" />
                  </linearGradient>
                </defs>
                <circle
                  cx="80"
                  cy="80"
                  r="60"
                  fill="none"
                  stroke="var(--colorNeutralStroke2)"
                  stroke-width="10"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="60"
                  fill="none"
                  stroke="url(#cpuGrad)"
                  stroke-width="10"
                  stroke-linecap="round"
                  :stroke-dasharray="`${cpuCircumference} ${cpuCircumference}`"
                  :stroke-dashoffset="cpuOffset"
                  transform="rotate(-90 80 80)"
                  style="transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
                />
                <text x="80" y="76" text-anchor="middle" class="donut-center-label">
                  {{ $t("status.memoryUsed") }}
                </text>
                <text x="80" y="96" text-anchor="middle" class="donut-center-value">
                  {{ usedCpuText }}
                </text>
              </svg>
            </div>
            <div class="sparkline-wrap">
              <svg
                class="sparkline"
                :viewBox="`0 0 ${sparkWidth} ${sparkHeight}`"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="cpuSparkFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stop-color="var(--colorBrandForeground1)"
                      stop-opacity="0.2"
                    />
                    <stop
                      offset="100%"
                      stop-color="var(--colorBrandForeground1)"
                      stop-opacity="0"
                    />
                  </linearGradient>
                </defs>
                <path :d="cpuSparklineArea" fill="url(#cpuSparkFill)" />
                <path
                  :d="cpuSparklineLine"
                  fill="none"
                  stroke="var(--colorBrandForeground1)"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
          </div>
          <div class="metric-footer">
            <span
              >{{ cpuCores }} Core{{ cpuCores > 1 ? "s" : "" }} ·
              {{ cpuModel || "Apple Silicon" }}</span
            >
          </div>
        </div>

        <!-- Memory card -->
        <div class="card metric-card metric-mem">
          <div class="metric-header">
            <div
              class="metric-icon-box"
              style="
                background: var(--colorBrandBackgroundTint);
                color: var(--colorBrandForeground1);
              "
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <path d="M6 10h.01" />
                <path d="M6 14h.01" />
                <path d="M10 10h.01" />
                <path d="M10 14h.01" />
                <path d="M14 10h.01" />
                <path d="M14 14h.01" />
                <path d="M18 10h.01" />
                <path d="M18 14h.01" />
              </svg>
            </div>
            <div class="metric-title-group">
              <span class="metric-name">{{ $t("status.memoryUsage") }}</span>
              <span class="metric-sub" ref="memValueRef">{{ memoryUsage }}%</span>
            </div>
            <div class="segmented-control">
              <button
                class="segmented-btn"
                :class="{ active: moduleDataSource.memory === 'native' }"
                @click="setModuleSource('memory', 'native')"
              >
                {{ $t("status.native") }}
              </button>
              <button
                class="segmented-btn"
                :class="{ active: moduleDataSource.memory === 'mole' }"
                @click="setModuleSource('memory', 'mole')"
              >
                {{ $t("status.mole") }}
              </button>
            </div>
          </div>
          <div class="metric-body">
            <div class="donut-wrap">
              <svg class="donut-chart" viewBox="0 0 160 160">
                <defs>
                  <linearGradient id="memGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#703db1" />
                    <stop offset="100%" stop-color="#9b6cd4" />
                  </linearGradient>
                </defs>
                <circle
                  cx="80"
                  cy="80"
                  r="60"
                  fill="none"
                  stroke="var(--colorNeutralStroke2)"
                  stroke-width="10"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="60"
                  fill="none"
                  stroke="url(#memGrad)"
                  stroke-width="10"
                  stroke-linecap="round"
                  :stroke-dasharray="`${memCircumference} ${memCircumference}`"
                  :stroke-dashoffset="memOffset"
                  transform="rotate(-90 80 80)"
                  style="transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
                />
                <text x="80" y="76" text-anchor="middle" class="donut-center-label">
                  {{ $t("status.memoryUsed") }}
                </text>
                <text x="80" y="96" text-anchor="middle" class="donut-center-value">
                  {{ usedMemory }} GB
                </text>
              </svg>
            </div>
            <div class="sparkline-wrap">
              <svg
                class="sparkline"
                :viewBox="`0 0 ${sparkWidth} ${sparkHeight}`"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="memSparkFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#703db1" stop-opacity="0.2" />
                    <stop offset="100%" stop-color="#703db1" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <path :d="memSparklineArea" fill="url(#memSparkFill)" />
                <path
                  :d="memSparklineLine"
                  fill="none"
                  stroke="#703db1"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
          </div>
          <div class="metric-footer">
            <span>{{ usedMemory }} / {{ totalMemory }} GB</span>
          </div>
        </div>
      </div>

      <!-- Secondary resource mini cards -->
      <div class="secondary-metrics" :class="{ 'gpu-hidden': !gpuAvailable }">
        <!-- Disk -->
        <div class="card mini-card">
          <div class="mini-header">
            <div
              class="mini-icon-box"
              style="
                background: var(--colorSuccessBackground1);
                color: var(--colorSuccessForeground1);
              "
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <span class="mini-name">{{ $t("status.diskUsage") }}</span>
            <div class="segmented-control mini">
              <button
                class="segmented-btn mini"
                :class="{ active: moduleDataSource.disk === 'native' }"
                @click="setModuleSource('disk', 'native')"
              >
                {{ $t("status.native") }}
              </button>
              <button
                class="segmented-btn mini"
                :class="{ active: moduleDataSource.disk === 'mole' }"
                @click="setModuleSource('disk', 'mole')"
              >
                {{ $t("status.mole") }}
              </button>
            </div>
          </div>
          <span class="mini-value">{{ diskUsage }}%</span>
          <div class="mini-progress-wrap">
            <div class="mini-progress-track">
              <div class="mini-progress-fill disk" :style="{ width: diskUsage + '%' }"></div>
            </div>
            <span class="mini-detail">{{ usedDisk }} / {{ totalDisk }} GB</span>
          </div>
        </div>

        <!-- Battery -->
        <div class="card mini-card">
          <div class="mini-header">
            <div class="mini-icon-box" :style="batteryIconStyle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="2" y="7" width="16" height="10" rx="2" />
                <path d="M22 11v2" />
                <path d="M6 11h.01" />
              </svg>
            </div>
            <span class="mini-name">{{ $t("status.battery") }}</span>
            <div class="segmented-control mini">
              <button
                class="segmented-btn mini"
                :class="{ active: moduleDataSource.battery === 'native' }"
                @click="setModuleSource('battery', 'native')"
              >
                {{ $t("status.native") }}
              </button>
              <button
                class="segmented-btn mini"
                :class="{ active: moduleDataSource.battery === 'mole' }"
                @click="setModuleSource('battery', 'mole')"
              >
                {{ $t("status.mole") }}
              </button>
            </div>
          </div>
          <span class="mini-value" :class="{ 'battery-low': batteryPercent < 20 }"
            >{{ batteryPercent }}%</span
          >
          <div class="mini-progress-wrap">
            <div class="mini-progress-track">
              <div
                class="mini-progress-fill"
                :class="{ 'battery-low': batteryPercent < 20 }"
                :style="{ width: batteryPercent + '%' }"
              ></div>
            </div>
            <span class="mini-detail">{{ batteryStatusText }}</span>
          </div>
        </div>

        <!-- Network -->
        <div class="card mini-card mini-network">
          <div class="mini-header">
            <div
              class="mini-icon-box"
              style="
                background: var(--colorBrandBackgroundTint);
                color: var(--colorBrandForeground1);
              "
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                <line x1="12" y1="20" x2="12.01" y2="20" />
              </svg>
            </div>
            <span class="mini-name">{{ $t("status.network") }}</span>
            <div class="segmented-control mini">
              <button
                class="segmented-btn mini"
                :class="{ active: moduleDataSource.network === 'native' }"
                @click="setModuleSource('network', 'native')"
              >
                {{ $t("status.native") }}
              </button>
              <button
                class="segmented-btn mini"
                :class="{ active: moduleDataSource.network === 'mole' }"
                @click="setModuleSource('network', 'mole')"
              >
                {{ $t("status.mole") }}
              </button>
            </div>
          </div>
          <div class="net-pair">
            <div class="net-item">
              <div class="net-arrow" style="color: var(--colorSuccessForeground1)">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path
                    d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm3.35 8.65l-4 4a.5.5 0 0 1-.7 0l-2-2a.5.5 0 0 1 .7-.7l1.65 1.64 3.65-3.64a.5.5 0 0 1 .7.7z"
                  />
                </svg>
              </div>
              <div class="net-info">
                <span class="net-label">{{ $t("status.download") }}</span>
                <span class="net-speed">{{ downloadSpeed || "--" }}</span>
              </div>
            </div>
            <div class="net-item">
              <div class="net-arrow" style="color: var(--colorBrandForeground1)">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path
                    d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM6.65 9.35l2-2a.5.5 0 0 1 .7.7L7.71 9H13.5a.5.5 0 0 1 0 1H7.7l1.65 1.65a.5.5 0 0 1-.7.7l-2-2a.5.5 0 0 1 0-.7z"
                  />
                </svg>
              </div>
              <div class="net-info">
                <span class="net-label">{{ $t("status.upload") }}</span>
                <span class="net-speed">{{ uploadSpeed || "--" }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- GPU -->
        <div v-if="gpuAvailable" class="card mini-card">
          <div class="mini-header">
            <div
              class="mini-icon-box"
              style="
                background: var(--colorWarningBackground1);
                color: var(--colorWarningForeground1);
              "
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
                <path d="M6 8h.01" />
                <path d="M6 12h.01" />
              </svg>
            </div>
            <span class="mini-name">GPU</span>
            <span class="badge badge-info gpu-badge">{{ gpuModel || $t("status.gpu") }}</span>
          </div>
          <div class="gpu-minis">
            <div class="gpu-mini-row">
              <span class="gpu-mini-label">{{ $t("status.gpuUsage") }}</span>
              <div class="gpu-mini-track">
                <div class="gpu-mini-fill" :style="{ width: Math.max(0, gpuUsage) + '%' }"></div>
              </div>
              <span class="gpu-mini-pct">{{ gpuUsageText }}</span>
            </div>
            <div class="gpu-mini-row">
              <span class="gpu-mini-label">{{ $t("status.gpuMemory") }}</span>
              <div class="gpu-mini-track">
                <div
                  class="gpu-mini-fill"
                  :style="{
                    width: Math.max(0, gpuMemoryPercent) + '%',
                    background: 'var(--colorWarningForeground1)',
                  }"
                ></div>
              </div>
              <span class="gpu-mini-pct">{{ gpuMemoryPercentText }}</span>
            </div>
          </div>
          <span class="mini-detail gpu-detail">{{ gpuDetailText }}</span>
        </div>
      </div>

      <!-- Data source notice bar -->
      <div v-if="lastDualData" class="source-notice-bar">
        <div class="source-notice-content">
          <span class="source-notice-icon">i</span>
          <span class="source-notice-text">
            {{ $t("status.dataSourceNote") }}: CPU
            {{
              Math.abs(
                (lastDualData.native.cpuUsage || 0) - (lastDualData.mole.cpuUsage || 0),
              ).toFixed(1)
            }}% · {{ $t("status.memoryLabel") }}
            {{
              Math.abs(
                (lastDualData.native.memoryUsage || 0) - (lastDualData.mole.memoryUsage || 0),
              ).toFixed(1)
            }}% · {{ $t("status.diskLabel") }}
            {{
              Math.abs(
                (lastDualData.native.diskUsage || 0) - (lastDualData.mole.diskUsage || 0),
              ).toFixed(1)
            }}% · {{ $t("status.batteryLabel") }}
            {{
              Math.abs(
                (lastDualData.native.batteryPercent || 0) - (lastDualData.mole.batteryPercent || 0),
              ).toFixed(0)
            }}% — {{ $t("status.nativeCloser") }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

// ---- Data source preference ----
const SOURCE_LABEL = {
  native: t("status.native"),
  mole: t("status.mole"),
  customized: t("status.customLabel"),
};

const moduleDataSource = ref({
  cpu: "native",
  memory: "native",
  disk: "native",
  battery: "native",
  network: "native",
}); // per-module override

// Global state is derived from module states
const globalSourceMode = computed(() => {
  const values = Object.values(moduleDataSource.value);
  if (values.every((v) => v === "native")) return "native";
  if (values.every((v) => v === "mole")) return "mole";
  return "customized";
});

function loadSourcePrefs() {
  try {
    const mod = localStorage.getItem("revel-status-source-modules");
    if (mod) {
      const parsed = JSON.parse(mod);
      // Migrate old "global" / "auto" values to "native"
      for (const key of Object.keys(parsed)) {
        if (parsed[key] === "global" || parsed[key] === "auto") parsed[key] = "native";
      }
      moduleDataSource.value = {
        cpu: "native",
        memory: "native",
        disk: "native",
        battery: "native",
        network: "native",
        ...parsed,
      };
    }
    // Remove legacy global mode key
    localStorage.removeItem("revel-status-source-mode");
  } catch {}
}

function saveSourcePrefs() {
  try {
    localStorage.setItem("revel-status-source-modules", JSON.stringify(moduleDataSource.value));
  } catch {}
}

function setModuleSource(key, mode) {
  moduleDataSource.value[key] = mode;
  saveSourcePrefs();
}

function setAllModules(mode) {
  for (const key of Object.keys(moduleDataSource.value)) {
    moduleDataSource.value[key] = mode;
  }
  saveSourcePrefs();
}

function effectiveSource(key) {
  return moduleDataSource.value[key];
}

// ---- Data refs ----
const error = ref("");
const platformRaw = ref("");

const cpuUsage = ref(0);
const cpuCores = ref(0);
const cpuModel = ref("");

const memoryUsage = ref(0);
const usedMemory = ref(0);
const totalMemory = ref(0);

const diskUsage = ref(0);
const usedDisk = ref(0);
const totalDisk = ref(0);

const batteryPercent = ref(0);
const batteryStatus = ref("");
const batteryTime = ref("");

const downloadSpeed = ref("");
const uploadSpeed = ref("");

const gpuModel = ref("");
const gpuUsage = ref(0);
const gpuMemoryPercent = ref(0);
const usedGpuMemory = ref(0);
const totalGpuMemory = ref(0);

const platformInfo = ref("--");
const uptimeText = ref("--");
const lastUpdated = ref("");

// Sparkline history (keep last 30 samples)
const HISTORY_SIZE = 30;
const cpuHistory = ref(Array(HISTORY_SIZE).fill(0));
const memoryHistory = ref(Array(HISTORY_SIZE).fill(0));

const sparkWidth = 280;
const sparkHeight = 40;

// Donut chart math
const R = 60;
const CIRCUMFERENCE = 2 * Math.PI * R;

const cpuCircumference = CIRCUMFERENCE;
const cpuOffset = computed(() => CIRCUMFERENCE - (cpuUsage.value / 100) * CIRCUMFERENCE);

const memCircumference = CIRCUMFERENCE;
const memOffset = computed(() => CIRCUMFERENCE - (memoryUsage.value / 100) * CIRCUMFERENCE);

const usedCpuText = computed(() => `${cpuUsage.value}%`);

// Sparkline path generators
function buildSparkline(data) {
  const max = Math.max(...data, 1);
  const step = sparkWidth / (data.length - 1);
  let lineD = "";
  let areaD = "";
  data.forEach((v, i) => {
    const x = i * step;
    const y = sparkHeight - (v / max) * sparkHeight;
    const cmd = i === 0 ? "M" : "L";
    lineD += `${cmd}${x.toFixed(1)},${y.toFixed(1)} `;
    areaD += `${cmd}${x.toFixed(1)},${y.toFixed(1)} `;
  });
  areaD += `L${sparkWidth},${sparkHeight} L0,${sparkHeight} Z`;
  return { line: lineD.trim(), area: areaD.trim() };
}

const cpuSpark = computed(() => buildSparkline(cpuHistory.value));
const cpuSparklineLine = computed(() => cpuSpark.value.line);
const cpuSparklineArea = computed(() => cpuSpark.value.area);

const memSpark = computed(() => buildSparkline(memoryHistory.value));
const memSparklineLine = computed(() => memSpark.value.line);
const memSparklineArea = computed(() => memSpark.value.area);

// Health score
// Health score from Mole CLI (0-100)
const healthScoreValue = ref(0);
const healthScoreMsg = ref("");

const healthScoreDisplay = computed(() => {
  const msg = healthScoreMsg.value;
  if (msg === "Good") return t("status.healthExcellent");
  if (msg === "Warning") return t("status.healthWarning");
  if (msg === "Critical") return t("status.healthCritical");
  if (msg) return msg;
  // Fallback: score-based
  const score = healthScoreValue.value;
  if (score >= 80) return t("status.healthExcellent");
  if (score >= 60) return t("status.healthGood");
  if (score >= 40) return t("status.healthFair");
  return t("status.healthCongested");
});

const healthClass = computed(() => {
  const msg = healthScoreMsg.value;
  if (msg === "Good") return "health-good";
  if (msg === "Warning") return "health-ok";
  if (msg === "Critical") return "health-bad";
  // Fallback: score-based
  const score = healthScoreValue.value;
  if (score >= 80) return "health-good";
  if (score >= 60) return "health-ok";
  if (score >= 40) return "health-warn";
  return "health-bad";
});

const batteryStatusText = computed(() => {
  const status = batteryStatus.value;
  const time = batteryTime.value;
  if (!status && !time) return t("status.unknown");
  if (time) return `${status} · ${time}`;
  return status;
});

const batteryIconStyle = computed(() => {
  if (batteryPercent.value < 20) {
    return { background: "var(--colorDangerBackground1)", color: "var(--colorDangerForeground1)" };
  }
  return { background: "var(--colorWarningBackground1)", color: "var(--colorWarningForeground1)" };
});

// Number pulse animation refs
const cpuValueRef = ref(null);
const memValueRef = ref(null);

function pulseElement(el) {
  if (!el) return;
  el.style.transition = "transform 0.2s ease";
  el.style.transform = "scale(1.08)";
  setTimeout(() => {
    el.style.transform = "scale(1)";
  }, 200);
}

watch(cpuUsage, (_newVal, oldVal) => {
  if (oldVal !== undefined && _newVal !== oldVal) {
    nextTick(() => pulseElement(cpuValueRef.value));
  }
});

watch(memoryUsage, (_newVal, oldVal) => {
  if (oldVal !== undefined && _newVal !== oldVal) {
    nextTick(() => pulseElement(memValueRef.value));
  }
});

// GPU availability
const gpuAvailable = computed(() => gpuUsage.value >= 0 && totalGpuMemory.value > 0);

// GPU display helpers
const gpuUsageText = computed(() => (gpuUsage.value < 0 ? "--" : `${gpuUsage.value}%`));
const gpuMemoryPercentText = computed(() =>
  gpuMemoryPercent.value < 0 ? "--" : `${gpuMemoryPercent.value}%`,
);
const gpuDetailText = computed(() => {
  if (totalGpuMemory.value > 0)
    return `${usedGpuMemory.value} / ${totalGpuMemory.value} GB ${t("status.gpuMemory")}`;
  if (gpuModel.value) return t("status.gpu");
  return "--";
});

// Track last dual data for tooltip
const lastDualData = ref(null);

// ---- Push-based data update ----
function applyStatusData(data) {
  if (data.error) {
    error.value = data.error;
    return;
  }
  error.value = "";

  // Support dual-source payload: { mole: {...}, native: {...}, platform, ... }
  const isDual = data.mole && data.native;
  const platform = data.platform || "";
  const src = isDual
    ? {
        cpu: effectiveSource("cpu"),
        memory: effectiveSource("memory"),
        disk: effectiveSource("disk"),
        battery: effectiveSource("battery"),
        network: effectiveSource("network"),
      }
    : {};

  const d = isDual ? data[src.cpu] : data;

  cpuUsage.value = d.cpuUsage || 0;
  cpuCores.value = d.cpuCores || 0;
  cpuModel.value = d.cpuModel || "";

  const memSrc = isDual ? data[src.memory] : data;
  memoryUsage.value = memSrc.memoryUsage || 0;
  usedMemory.value = memSrc.usedMemory || 0;
  totalMemory.value = memSrc.totalMemory || 0;

  const diskSrc = isDual ? data[src.disk] : data;
  diskUsage.value = diskSrc.diskUsage || 0;
  usedDisk.value = diskSrc.usedDisk || 0;
  totalDisk.value = diskSrc.totalDisk || 0;

  const battSrc = isDual ? data[src.battery] : data;
  batteryPercent.value = battSrc.batteryPercent || 0;
  batteryStatus.value = battSrc.batteryStatus || "";
  batteryTime.value = battSrc.batteryTime || "";

  const netSrc = isDual ? data[src.network] : data;
  downloadSpeed.value = netSrc.downloadSpeed || "";
  uploadSpeed.value = netSrc.uploadSpeed || "";

  gpuModel.value = data.gpuModel || "";
  gpuUsage.value = data.gpuUsage ?? 0;
  gpuMemoryPercent.value = data.gpuMemoryPercent ?? 0;
  usedGpuMemory.value = data.usedGpuMemory || 0;
  totalGpuMemory.value = data.totalGpuMemory || 0;

  // Update sparkline history
  cpuHistory.value.push(cpuUsage.value);
  cpuHistory.value.shift();
  memoryHistory.value.push(memoryUsage.value);
  memoryHistory.value.shift();

  // Platform info
  platformRaw.value = data.platform || "";
  if (data.platform || data.osVersion) {
    platformInfo.value = [data.platform, data.osVersion].filter(Boolean).join(" · ");
  } else if (d.cpuModel) {
    platformInfo.value = d.cpuModel;
  }

  // Uptime (use Mole's formatted string directly)
  if (data.uptimeText) {
    uptimeText.value = data.uptimeText;
  }

  // Health score from Mole
  healthScoreValue.value = data.healthScore ?? 0;
  healthScoreMsg.value = data.healthScoreMsg ?? "";

  // Store dual data for tooltip
  if (isDual) {
    lastDualData.value = data;
  }

  // Last updated time
  const now = new Date();
  lastUpdated.value = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
}

let statusListener = null;

onMounted(() => {
  loadSourcePrefs();
  statusListener = (data) => {
    applyStatusData(data);
  };
  window.electronAPI.onSystemStatus(statusListener);
  nextTick(() => {
    window.electronAPI.startStatusMonitor();
  });
});

onUnmounted(() => {
  if (statusListener) {
    window.electronAPI.removeSystemStatusListener(statusListener);
    statusListener = null;
  }
  window.electronAPI.stopStatusMonitor();
});

defineExpose({
  loadSourcePrefs,
  saveSourcePrefs,
  setModuleSource,
  setAllModules,
  applyStatusData,
  buildSparkline,
  cpuHistory,
  memoryHistory,
  gpuUsageText,
  gpuDetailText,
});
</script>

<style scoped>
/* ============================================================
   StatusView - Fluent Design Dashboard
   ============================================================ */

/* ---- Dashboard container ---- */
.status-dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ---- Overview Banner ---- */
.overview-banner {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 16px 24px;
  background: var(--colorNeutralBackground1);
  backdrop-filter: blur(40px) saturate(120%);
  -webkit-backdrop-filter: blur(40px) saturate(120%);
  border: 1px solid var(--colorNeutralStroke1);
  border-radius: var(--corner120);
  box-shadow: var(--shadow4);
  position: relative;
  overflow: hidden;
  animation: staggerFadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
}

.overview-banner::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
}

.overview-section {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
}

.overview-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: var(--cornerCircular);
  background: var(--colorBrandBackgroundTint);
  color: var(--colorBrandForeground1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.overview-icon-wrap svg {
  width: 22px;
  height: 22px;
}

.overview-icon-wrap.uptime {
  background: var(--colorSuccessBackground1);
  color: var(--colorSuccessForeground1);
}

.overview-icon-wrap.health {
  background: var(--colorSuccessBackground1);
  color: var(--colorSuccessForeground1);
}

.overview-icon-wrap.health.health-ok {
  background: var(--colorWarningBackground1);
  color: var(--colorWarningForeground1);
}

.overview-icon-wrap.health.health-warn {
  background: rgba(196, 148, 0, 0.15);
  color: #c49400;
}

.overview-icon-wrap.health.health-bad {
  background: var(--colorDangerBackground1);
  color: var(--colorDangerForeground1);
}

.overview-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.overview-label {
  font-size: 12px;
  color: var(--colorNeutralForeground3);
  font-weight: 500;
}

.overview-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--colorNeutralForeground1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.overview-value.health-good {
  color: var(--colorSuccessForeground1);
}

.overview-value.health-ok {
  color: var(--colorWarningForeground1);
}

.overview-value.health-warn {
  color: #c49400;
}

.overview-value.health-bad {
  color: var(--colorDangerForeground1);
}

.overview-divider {
  width: 1px;
  height: 36px;
  background: var(--colorNeutralStroke2);
  margin: 0 16px;
  flex-shrink: 0;
}

/* ---- Primary Metrics (CPU + Memory) ---- */
.primary-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.metric-card {
  padding: 20px 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 0;
  animation: staggerFadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
  animation-delay: 0.08s;
}

.metric-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.metric-icon-box {
  width: 40px;
  height: 40px;
  border-radius: var(--corner40);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.metric-icon-box svg {
  width: 22px;
  height: 22px;
}

.metric-title-group {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
}

.metric-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--colorNeutralForeground2);
}

.metric-sub {
  font-size: 28px;
  font-weight: 700;
  color: var(--colorNeutralForeground1);
  line-height: 1.2;
  transition: transform 0.2s ease;
  display: inline-block;
  transform-origin: left center;
}

.metric-body {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex: 1;
  min-height: 0;
  margin-bottom: 12px;
}

.donut-wrap {
  flex-shrink: 0;
  width: 120px;
  height: 120px;
}

.donut-chart {
  width: 100%;
  height: 100%;
}

.donut-center-label {
  font-size: 11px;
  fill: var(--colorNeutralForeground3);
  font-weight: 500;
}

.donut-center-value {
  font-size: 16px;
  font-weight: 700;
  fill: var(--colorNeutralForeground1);
}

.sparkline-wrap {
  flex: 1;
  height: 50px;
  min-width: 0;
}

.sparkline {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.metric-footer {
  font-size: 12px;
  color: var(--colorNeutralForeground3);
  padding-top: 10px;
  border-top: 1px solid var(--colorNeutralStroke3);
}

/* ---- Secondary Metrics (4 mini cards) ---- */
.secondary-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.mini-card {
  padding: 16px 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 0;
  animation: staggerFadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
  animation-delay: 0.16s;
}

.mini-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.mini-icon-box {
  width: 32px;
  height: 32px;
  border-radius: var(--corner40);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mini-icon-box svg {
  width: 18px;
  height: 18px;
}

.mini-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--colorNeutralForeground1);
}

.mini-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--colorNeutralForeground1);
  line-height: 1.2;
  margin-bottom: 8px;
}

.mini-value.battery-low {
  color: var(--colorDangerForeground1);
}

.mini-progress-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: auto;
}

.mini-progress-track {
  width: 100%;
  height: 6px;
  background: var(--colorNeutralStroke2);
  border-radius: 3px;
  overflow: hidden;
}

.mini-progress-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--colorBrandForeground1);
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.mini-progress-fill.disk {
  background: linear-gradient(90deg, var(--colorSuccessForeground1), #7ecf7e);
}

.mini-progress-fill.battery-low {
  background: linear-gradient(90deg, var(--colorDangerForeground1), #e05252);
}

.mini-detail {
  font-size: 11px;
  color: var(--colorNeutralForeground3);
}

/* ---- Network mini card ---- */
.mini-network .mini-header {
  margin-bottom: 12px;
}

.net-badge {
  margin-left: auto;
  font-size: 10px;
  padding: 2px 8px;
}

.net-pair {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.net-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.net-arrow {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.net-arrow svg {
  width: 18px;
  height: 18px;
}

.net-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.net-label {
  font-size: 12px;
  color: var(--colorNeutralForeground3);
  min-width: 32px;
}

.net-speed {
  font-size: 14px;
  font-weight: 600;
  color: var(--colorNeutralForeground1);
}

/* ---- GPU mini card ---- */
.gpu-badge {
  margin-left: auto;
  font-size: 10px;
  padding: 2px 8px;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gpu-minis {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 6px;
}

.gpu-mini-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.gpu-mini-label {
  font-size: 11px;
  color: var(--colorNeutralForeground3);
  min-width: 36px;
}

.gpu-mini-track {
  flex: 1;
  height: 4px;
  background: var(--colorNeutralStroke2);
  border-radius: 2px;
  overflow: hidden;
}

.gpu-mini-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--colorBrandForeground1);
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.gpu-mini-pct {
  font-size: 11px;
  font-weight: 600;
  color: var(--colorNeutralForeground1);
  min-width: 30px;
  text-align: right;
}

.gpu-detail {
  margin-top: auto;
}

.secondary-metrics.gpu-hidden {
  grid-template-columns: repeat(3, 1fr);
}

/* ---- Error card ---- */
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

/* ---- Stagger animation ---- */
@keyframes staggerFadeIn {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ---- Source toggle bar ---- */
.source-toggle-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 10px 16px;
  background: var(--colorNeutralBackground1);
  border: 1px solid var(--colorNeutralStroke1);
  border-radius: var(--corner80);
}

.source-toggle-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--colorNeutralForeground2);
}

.source-action-group {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.source-action-btn {
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--colorNeutralStroke1);
  border-radius: var(--corner40);
  background: var(--colorNeutralBackground1);
  color: var(--colorNeutralForeground1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.source-action-btn:hover:not(:disabled) {
  background: var(--colorNeutralBackground2);
}

.source-action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.source-status-pill {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: var(--corner40);
}

.status-customized {
  background: var(--colorNeutralForeground3);
  color: var(--colorNeutralBackground1);
}

.status-native {
  background: var(--colorSuccessBackground1);
  color: var(--colorSuccessForeground1);
}

.status-mole {
  background: var(--colorBrandBackgroundTint);
  color: var(--colorBrandForeground1);
}

/* ---- Module SegmentedControl ---- */
.segmented-control {
  display: flex;
  gap: 0;
  background: var(--colorNeutralBackground2);
  border-radius: var(--corner40);
  padding: 2px;
  margin-left: auto;
}

.segmented-btn {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 500;
  border: none;
  border-radius: var(--corner40);
  background: transparent;
  color: var(--colorNeutralForeground2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.segmented-btn:hover:not(.active) {
  color: var(--colorNeutralForeground1);
}

.segmented-btn.active {
  background: var(--colorNeutralBackground1);
  color: var(--colorBrandForeground1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.segmented-control.mini {
  padding: 1px;
}

.segmented-btn.mini {
  padding: 2px 6px;
  font-size: 10px;
}

/* ---- Source notice bar ---- */
.source-notice-bar {
  padding: 10px 16px;
  background: var(--colorNeutralBackground1);
  border: 1px solid var(--colorNeutralStroke1);
  border-radius: var(--corner80);
}

.source-notice-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.source-notice-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--colorBrandBackgroundTint);
  color: var(--colorBrandForeground1);
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

.source-notice-text {
  font-size: 11px;
  color: var(--colorNeutralForeground3);
  line-height: 1.4;
}

/* ---- Responsive ---- */
@media (max-width: 900px) {
  .primary-metrics {
    grid-template-columns: 1fr;
  }
  .secondary-metrics {
    grid-template-columns: repeat(2, 1fr);
  }
  .overview-divider {
    display: none;
  }
  .overview-banner {
    flex-wrap: wrap;
    gap: 12px;
  }
  .overview-section {
    flex: 1 1 45%;
  }
}

@media (max-width: 560px) {
  .secondary-metrics {
    grid-template-columns: 1fr;
  }
  .overview-section {
    flex: 1 1 100%;
  }
}
</style>
