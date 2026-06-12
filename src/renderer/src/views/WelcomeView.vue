<template>
  <div class="welcome-container">
    <div class="welcome-lang-switcher">
      <button
        class="lang-btn"
        :class="{ active: locale === 'zh-CN' }"
        @click="setAppLocale('zh-CN')"
      >
        中文
      </button>
      <span class="lang-divider">|</span>
      <button
        class="lang-btn"
        :class="{ active: locale === 'en-US' }"
        @click="setAppLocale('en-US')"
      >
        English
      </button>
    </div>

    <!-- Step 1: checking -->
    <div v-if="step === 'checking'" class="welcome-card card fade-in">
      <div class="checking-section">
        <div class="spinner"></div>
        <p class="checking-text">{{ $t("welcome.checking") }}</p>
      </div>
    </div>

    <!-- Step 2A: installed -->
    <div v-else-if="step === 'installed'" class="welcome-card card fade-in">
      <div class="status-header">
        <div class="status-icon success">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <p class="status-text success">{{ $t("welcome.installed") }}</p>
      </div>

      <div class="welcome-body">
        <h1 class="welcome-title">{{ $t("welcome.title") }}</h1>
        <p class="welcome-subtitle">{{ $t("welcome.subtitle") }}</p>
        <p class="version-info">
          <span class="badge badge-success">{{ moleVersion }}</span>
        </p>

        <div class="features-grid">
          <div class="feature-item">
            <div class="feature-icon">🧹</div>
            <div class="feature-name">{{ $t("feature.systemCleanup") }}</div>
            <div class="feature-desc">{{ $t("feature.systemCleanupDesc") }}</div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">📊</div>
            <div class="feature-name">{{ $t("feature.diskAnalysis") }}</div>
            <div class="feature-desc">{{ $t("feature.diskAnalysisDesc") }}</div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">⚡</div>
            <div class="feature-name">{{ $t("feature.systemOptimize") }}</div>
            <div class="feature-desc">{{ $t("feature.systemOptimizeDesc") }}</div>
          </div>
        </div>
      </div>

      <div class="welcome-footer">
        <button class="btn btn-start" @click="handleStart">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
          {{ $t("welcome.start") }}
        </button>
      </div>
    </div>

    <!-- Step 2B: missing -->
    <div v-else-if="step === 'missing'" class="welcome-card card fade-in">
      <div class="status-header">
        <div class="status-icon error">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </div>
        <p class="status-text error">{{ $t("welcome.missing") }}</p>
      </div>

      <div class="welcome-body">
        <h1 class="welcome-title">{{ $t("welcome.needInstall") }}</h1>
        <p class="welcome-subtitle">
          {{ $t("welcome.needInstallDesc") }}
        </p>

        <div class="install-block">
          <div class="install-label">{{ $t("welcome.installLabel") }}</div>
          <div class="install-code">
            <code>brew install tw93/tap/mole</code>
            <button
              class="btn btn-small btn-copy"
              :class="{ copied: copySuccess }"
              @click="copyCommand"
            >
              <svg
                v-if="!copySuccess"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <svg
                v-else
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              {{ copySuccess ? $t("welcome.copied") : $t("welcome.copyCommand") }}
            </button>
          </div>
        </div>
      </div>

      <div class="welcome-footer">
        <button class="btn btn-outline" @click="recheck">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          {{ $t("welcome.recheck") }}
        </button>
        <button class="btn btn-subtle" @click="openGitHub">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"
            ></path>
          </svg>
          {{ $t("welcome.goGitHub") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";

const { locale } = useI18n();

const emit = defineEmits(["start"]);

const step = ref("checking"); // 'checking' | 'installed' | 'missing'
const moleVersion = ref("");
const copySuccess = ref(false);

function setAppLocale(lang) {
  locale.value = lang;
  localStorage.setItem("revel-language", lang);
  document.documentElement.setAttribute("lang", lang === "zh-CN" ? "zh-CN" : "en");
}

async function checkMoleInstalled() {
  try {
    const result = await window.electronAPI.moleExec("mo", ["--version"]);
    if (result.success && result.stdout) {
      step.value = "installed";
      moleVersion.value = result.stdout.trim();
    } else {
      step.value = "missing";
    }
  } catch {
    // If moleExec itself errors (e.g. checkMole returns false), treat as not installed
    step.value = "missing";
  }
}

onMounted(() => {
  checkMoleInstalled();
});

function handleStart() {
  localStorage.setItem("revel-welcomed", "true");
  emit("start");
}

async function recheck() {
  copySuccess.value = false;
  await checkMoleInstalled();
}

async function copyCommand() {
  await navigator.clipboard.writeText("brew install tw93/tap/mole");
  copySuccess.value = true;
  setTimeout(() => {
    copySuccess.value = false;
  }, 2000);
}

function openGitHub() {
  window.electronAPI.openExternal("https://github.com/tw93/Mole");
}
</script>

<style scoped>
.welcome-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 40px 20px;
  box-sizing: border-box;
  position: relative;
}

.welcome-card {
  width: 100%;
  max-width: 640px;
  padding: 48px 56px;
  text-align: center;
  animation: fadeInUp 0.5s ease-out;
}

/* Step 1: Checking */
.checking-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 40px 0;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 3px solid #e1e1e1;
  border-top-color: #0f6cbd;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.checking-text {
  font-size: 15px;
  color: #616161;
  margin: 0;
}

/* Status Header */
.status-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
}

.status-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-icon.success {
  background: #f1f8f4;
  color: #107c41;
}

.status-icon.error {
  background: #fdf3f4;
  color: #c50f1f;
}

.status-text {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.status-text.success {
  color: #107c41;
}

.status-text.error {
  color: #c50f1f;
}

/* Welcome Body */
.welcome-body {
  margin-bottom: 36px;
}

.welcome-title {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 12px 0;
  letter-spacing: -0.02em;
}

.welcome-subtitle {
  font-size: 15px;
  color: #616161;
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.version-info {
  margin: 0 0 32px 0;
}

/* Features Grid */
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 28px;
}

.feature-item {
  padding: 20px 12px;
  border-radius: 8px;
  background: #f8f9fa;
  transition: all 0.2s ease;
}

.feature-item:hover {
  background: #f0f2f5;
  transform: translateY(-2px);
}

.feature-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.feature-name {
  font-size: 14px;
  font-weight: 600;
  color: #242424;
  margin-bottom: 4px;
}

.feature-desc {
  font-size: 12px;
  color: #616161;
  line-height: 1.4;
}

/* Install Block */
.install-block {
  margin-top: 24px;
  text-align: left;
}

.install-label {
  font-size: 13px;
  color: #616161;
  margin-bottom: 8px;
  padding-left: 4px;
}

.install-code {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #1e1e1e;
  border-radius: 8px;
  padding: 16px 20px;
  font-family: "SF Mono", "Cascadia Code", "Fira Code", Consolas, "Courier New", monospace;
}

.install-code code {
  color: #4ec9b0;
  font-size: 14px;
  font-family: inherit;
  word-break: break-all;
}

.btn-copy {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #2d2d2d;
  color: #cccccc;
  border: 1px solid #3d3d3d;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-copy:hover {
  background: #3d3d3d;
  color: #ffffff;
}

.btn-copy.copied {
  background: #1b4d2e;
  color: #4ec9b0;
  border-color: #107c41;
}

/* Welcome Footer */
.welcome-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.btn-start {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 48px;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #0f6cbd 0%, #005a9e 100%);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(15, 108, 189, 0.3);
}

.btn-start:hover {
  background: linear-gradient(135deg, #115ea3 0%, #0f6cbd 100%);
  box-shadow: 0 4px 16px rgba(15, 108, 189, 0.4);
  transform: translateY(-1px);
}

.btn-start:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(15, 108, 189, 0.3);
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeInUp 0.5s ease-out;
}

/* Responsive */
@media (max-width: 600px) {
  .welcome-card {
    padding: 32px 24px;
  }

  .welcome-title {
    font-size: 24px;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 16px;
    text-align: left;
    padding: 16px;
  }

  .feature-icon {
    font-size: 24px;
    margin-bottom: 0;
  }

  .install-code {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .btn-copy {
    justify-content: center;
  }
}

/* macOS: extra top padding to avoid traffic light button overlap */
.platform-darwin .welcome-container {
  padding-top: 52px;
}

.welcome-lang-switcher {
  position: absolute;
  top: 20px;
  right: 24px;
  display: flex;
  align-items: center;
  font-size: 13px;
  z-index: 10;
}
.lang-btn {
  background: transparent;
  border: none;
  color: #9e9e9e;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 13px;
  transition: color 0.2s ease;
}
.lang-btn:hover {
  color: #616161;
}
.lang-btn.active {
  color: #242424;
  font-weight: 600;
}
.lang-divider {
  color: #d1d1d1;
  margin: 0 2px;
}
</style>
