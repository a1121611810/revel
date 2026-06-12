<template>
  <div class="fade-in">
    <h1 class="page-title">{{ $t("optimize.title") }}</h1>
    <p class="page-subtitle">{{ $t("optimize.subtitle") }}</p>

    <div class="optimize-toolbar">
      <button class="btn btn-primary" :disabled="loading" @click="runAllTasks">
        <svg class="" viewBox="0 0 20 20" fill="currentColor">
          <path
            d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 1a7 7 0 1 1 0 14A7 7 0 0 1 10 3zm-.5 3.5v4.3l3.15 1.8a.5.5 0 0 1-.5.86l-3.33-1.9A.5.5 0 0 1 8.5 11.5v-5a.5.5 0 0 1 1 0z"
          />
        </svg>
        {{ $t("optimize.runAll") }}
      </button>
    </div>

    <div v-if="error" class="card error-card">
      <span class="error-text">{{ error }}</span>
    </div>

    <div v-if="platform && !isDarwin" class="card warn-card">
      <span class="warn-text"> ⚠ {{ $t("optimize.platformNotSupported", { platform }) }} </span>
    </div>

    <div class="optimize-grid">
      <div
        class="card task-card"
        v-for="task in tasks"
        :key="task.id"
        :class="{
          'task-running': task.status === 'running',
          'task-done': task.status === 'done',
          'task-error': task.status === 'error',
        }"
      >
        <div class="task-header">
          <div class="task-icon" :style="{ background: task.iconBg, color: task.iconColor }">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path
                v-if="task.id === 'spotlight'"
                d="M8.5 3a5.5 5.5 0 0 0 0 11 5.5 5.5 0 0 0 0-11zM2 8.5a6.5 6.5 0 1 1 11.44 4.23l3.87 3.86a.5.5 0 0 1-.7.7l-3.87-3.87A6.5 6.5 0 0 1 2 8.5z"
              />
              <path
                v-else-if="task.id === 'dns'"
                d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 1a7 7 0 1 1 0 14A7 7 0 0 1 10 3zm3.35 5.65l-3.5 3.5a.5.5 0 0 1-.7 0l-1.5-1.5a.5.5 0 0 1 .7-.7l1.15 1.14 3.15-3.14a.5.5 0 0 1 .7.7z"
              />
              <path
                v-else-if="task.id === 'memory'"
                d="M4 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4zm1 0v10h10V4H5z"
              />
              <path
                v-else-if="task.id === 'permissions'"
                d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 1a7 7 0 1 1 0 14A7 7 0 0 1 10 3zm-.5 3.5a.5.5 0 0 1 1 0v5a.5.5 0 0 1-1 0v-5zm0 7a.5.5 0 1 1 1 0 .5.5 0 0 1-1 0z"
              />
              <path
                v-else
                d="M8 3a1 1 0 0 0-1 1v4H5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-2V4a1 1 0 0 0-1-1H8zm5 5H7V4h6v4z"
              />
            </svg>
          </div>
          <div class="task-info">
            <span class="task-name">{{ task.name }}</span>
            <span class="task-desc">{{ task.description }}</span>
          </div>
        </div>
        <div class="task-footer">
          <div class="task-status-row">
            <span class="badge" :class="badgeClass(task.status)">{{
              statusText(task.status)
            }}</span>
            <button
              class="btn btn-outline btn-small"
              :disabled="task.status === 'running' || loading || (task.darwinOnly && !isDarwin)"
              @click="runTask(task)"
            >
              <svg
                v-if="task.status !== 'running'"
                class=""
                viewBox="0 0 20 20"
                fill="currentColor"
                style="width: 14px; height: 14px"
              >
                <path
                  d="M6 4.5a.5.5 0 0 1 .77-.42l8.57 5.5a.5.5 0 0 1 0 .84l-8.57 5.5A.5.5 0 0 1 6 15.5v-11z"
                />
              </svg>
              {{ task.status === "running" ? $t("optimize.running") : $t("optimize.startTask") }}
            </button>
          </div>
          <div class="progress task-progress" v-if="task.status === 'running'">
            <div class="progress-bar" :style="{ width: task.progress + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="card terminal-card">
      <div class="terminal-header">
        <h3 class="card-title">{{ $t("optimize.terminalOutput") }}</h3>
        <button class="btn btn-transparent btn-small" @click="clearTerminal">
          {{ $t("optimize.clear") }}
        </button>
      </div>
      <div class="terminal-body" ref="terminalBody">
        <div
          class="terminal-line"
          v-for="(line, i) in terminalLines"
          :key="i"
          :class="`terminal-${line.type}`"
        >
          <span class="terminal-time">{{ line.time }}</span>
          <span class="terminal-text">{{ line.text }}</span>
        </div>
        <div class="terminal-empty" v-if="terminalLines.length === 0">
          <span>{{ $t("optimize.waiting") }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useMole } from "../composables/useMole.js";

const { t } = useI18n();

const { loading, error, execRaw, listenOutput, removeOutputListener } = useMole();

const platform = ref("");
const isDarwin = computed(() => platform.value === "darwin");

onMounted(async () => {
  platform.value = await window.electronAPI.getPlatform();
});

const tasks = ref([
  {
    id: "spotlight",
    name: t("optimize.taskSpotlight"),
    description: t("optimize.taskSpotlightDesc"),
    status: "idle",
    progress: 0,
    iconBg: "#e6f2fb",
    iconColor: "#0f6cbd",
    darwinOnly: true,
    exec: () => execRaw("mdutil", ["-E", "/"], true),
  },
  {
    id: "dns",
    name: t("optimize.taskDNS"),
    description: t("optimize.taskDNSDesc"),
    status: "idle",
    progress: 0,
    iconBg: "#e8f5e9",
    iconColor: "#2e7d32",
    darwinOnly: true,
    exec: () =>
      execRaw("bash", ["-c", "dscacheutil -flushcache && killall -HUP mDNSResponder"], true),
  },
  {
    id: "memory",
    name: t("optimize.taskMemory"),
    description: t("optimize.taskMemoryDesc"),
    status: "idle",
    progress: 0,
    iconBg: "#f0e6f9",
    iconColor: "#703db1",
    darwinOnly: true,
    exec: () => execRaw("purge", [], true),
  },
  {
    id: "permissions",
    name: t("optimize.taskPermissions"),
    description: t("optimize.taskPermissionsDesc"),
    status: "idle",
    progress: 0,
    iconBg: "#fff3e0",
    iconColor: "#e65100",
    darwinOnly: true,
    exec: () => execRaw("diskutil", ["verifyVolume", "/"], true),
  },
  {
    id: "services",
    name: t("optimize.taskLaunchServices"),
    description: t("optimize.taskLaunchServicesDesc"),
    status: "idle",
    progress: 0,
    iconBg: "#fce4ec",
    iconColor: "#c62828",
    darwinOnly: true,
    exec: () =>
      execRaw(
        "bash",
        [
          "-c",
          "launchctl kickstart -k system/com.apple.locate 2>/dev/null || true; echo 'System services refreshed'",
        ],
        true,
      ),
  },
]);

const terminalLines = ref([]);
const terminalBody = ref(null);
const activeTimers = new Map();

let outputCallback = null;

onMounted(() => {
  outputCallback = (data) => {
    addTerminalLine(data.data, data.type === "stderr" ? "error" : "info");
  };
  listenOutput(outputCallback);
});

onUnmounted(() => {
  if (outputCallback) {
    removeOutputListener(outputCallback);
  }
  activeTimers.forEach((timer) => clearInterval(timer));
  activeTimers.clear();
});

function badgeClass(status) {
  return (
    {
      "badge-info": status === "idle",
      "badge-warning": status === "running",
      "badge-success": status === "done",
      "badge-danger": status === "error",
    }[status] || "badge-info"
  );
}

function statusText(status) {
  return (
    {
      idle: t("optimize.statusReady"),
      running: t("optimize.statusRunning"),
      done: t("optimize.statusCompleted"),
      error: t("optimize.statusError"),
    }[status] || status
  );
}

function addTerminalLine(text, type = "info") {
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
  terminalLines.value.push({ time, text: text.trim(), type });
  if (terminalLines.value.length > 200) {
    terminalLines.value = terminalLines.value.slice(-200);
  }
  setTimeout(() => {
    if (terminalBody.value) {
      terminalBody.value.scrollTop = terminalBody.value.scrollHeight;
    }
  }, 10);
}

function startProgress(task) {
  task.progress = 5;
  const timer = setInterval(() => {
    if (task.progress < 85) {
      task.progress += Math.random() * 12 + 3;
      if (task.progress > 85) task.progress = 85;
    }
  }, 300);
  activeTimers.set(task.id, timer);
  return timer;
}

function stopProgress(task) {
  const timer = activeTimers.get(task.id);
  if (timer) {
    clearInterval(timer);
    activeTimers.delete(task.id);
  }
}

async function runTask(task) {
  if (task.status === "running") return;

  if (task.darwinOnly && !isDarwin.value) {
    task.status = "error";
    addTerminalLine(`[${task.name}] ${t("optimize.macOnly")}`, "error");
    return;
  }

  task.status = "running";
  task.progress = 0;
  addTerminalLine(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, "info");
  addTerminalLine(`${t("optimize.startTask")}: ${task.name}`, "info");

  startProgress(task);

  try {
    const res = await task.exec();
    stopProgress(task);

    if (res.success) {
      task.status = "done";
      task.progress = 100;
      if (res.stdout) {
        res.stdout
          .split("\n")
          .filter((line) => line.trim())
          .forEach((line) => addTerminalLine(line, "info"));
      }
      addTerminalLine(`${task.name} ${t("optimize.taskCompleted")}`, "done");
    } else {
      task.status = "error";
      task.progress = 0;
      addTerminalLine(
        `${task.name} ${t("optimize.runAllFailed")} (exit code ${res.code})`,
        "error",
      );
      if (res.stderr) {
        res.stderr
          .split("\n")
          .filter((line) => line.trim())
          .forEach((line) => addTerminalLine(line, "error"));
      }
    }
  } catch (err) {
    stopProgress(task);
    task.status = "error";
    task.progress = 0;
    addTerminalLine(`${task.name} ${t("optimize.runAllFailed")}: ${err.message}`, "error");
  }
}

async function runAllTasks() {
  addTerminalLine(t("optimize.startAll"), "info");
  for (const task of tasks.value) {
    await runTask(task);
  }
  addTerminalLine(t("optimize.allCompleted"), "done");
}

function clearTerminal() {
  terminalLines.value = [];
}
</script>

<style scoped>
.optimize-toolbar {
  margin-bottom: 24px;
}

.optimize-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.task-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition:
    border-color 0.3s ease,
    box-shadow 0.3s ease;
}

.task-running {
  border-color: var(--colorBrandBackgroundTint);
  box-shadow: 0 0 0 1px var(--colorBrandBackgroundTint);
}

.task-done {
  border-color: var(--colorSuccessBackground1);
}

.task-error {
  border-color: var(--colorDangerBackground1);
}

.task-header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.task-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--corner40);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.task-icon svg {
  width: 20px;
  height: 20px;
}

.task-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-name {
  font-size: var(--fontSizeBase400);
  font-weight: 500;
  color: var(--colorNeutralForeground1);
}

.task-desc {
  font-size: 12px;
  color: var(--colorNeutralForeground2);
}

.task-footer {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.task-progress {
  height: 4px;
}

.terminal-card {
  padding: 0;
  overflow: hidden;
}

.terminal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--colorNeutralStroke2);
}

.terminal-body {
  padding: 12px 20px;
  min-height: 200px;
  max-height: 320px;
  overflow-y: auto;
  background: var(--colorNeutralBackground3);
  font-family: "Cascadia Code", "Consolas", monospace;
  font-size: 12px;
  line-height: 1.8;
}

.terminal-line {
  display: flex;
  gap: 12px;
  color: var(--colorNeutralForeground1);
}

.terminal-time {
  color: var(--colorNeutralForeground2);
  flex-shrink: 0;
}

.terminal-done .terminal-text {
  color: var(--colorSuccessBackground1);
}

.terminal-error .terminal-text {
  color: var(--colorDangerBackground1);
}

.terminal-empty {
  color: var(--colorNeutralForeground2);
  padding: 40px 0;
  text-align: center;
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

.warn-card {
  padding: 16px 20px;
  margin-bottom: 16px;
  border: 1px solid var(--colorWarningBackground1, #f9a825);
  background: rgba(249, 168, 37, 0.08);
}

.warn-text {
  color: var(--colorWarningForeground1-fg, #b07800);
  font-size: 14px;
}
</style>
