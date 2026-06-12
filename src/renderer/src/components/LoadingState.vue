<template>
  <div class="loading-state-rich">
    <div class="loading-icon-wrap">
      <svg
        class="loading-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="12" cy="12" r="10" stroke-opacity="0.2" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round" />
      </svg>
    </div>

    <div class="loading-dots">
      <span class="loading-dot" />
      <span class="loading-dot" />
      <span class="loading-dot" />
    </div>

    <div class="loading-text">
      <p class="loading-title">{{ title }}</p>
      <p class="loading-subtitle">{{ currentSubtitle }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const props = defineProps({
  title: { type: String, required: true },
  subtitles: { type: Array, default: () => [] },
});

const currentSubtitle = ref("");
let subtitleIndex = 0;
let intervalId = null;

function startSubtitleCycle() {
  if (!props.subtitles.length) return;
  currentSubtitle.value = props.subtitles[0];
  intervalId = setInterval(() => {
    subtitleIndex = (subtitleIndex + 1) % props.subtitles.length;
    currentSubtitle.value = props.subtitles[subtitleIndex];
  }, 2000);
}

onMounted(() => {
  startSubtitleCycle();
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>

<style scoped>
.loading-state-rich {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px 20px;
  animation: fadeInUp 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.loading-icon-wrap {
  width: 44px;
  height: 44px;
  color: var(--colorBrandBackgroundTint);
}

.loading-icon {
  width: 100%;
  height: 100%;
  animation: spin 1.8s linear infinite;
}

.loading-dots {
  display: flex;
  gap: 6px;
  align-items: center;
  height: 16px;
}

.loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--colorBrandBackgroundTint);
  animation: bounce 0.6s ease-in-out infinite alternate;
}

.loading-dot:nth-child(2) {
  animation-delay: 0.15s;
}

.loading-dot:nth-child(3) {
  animation-delay: 0.3s;
}

.loading-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.loading-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--colorNeutralForeground1);
}

.loading-subtitle {
  font-size: 13px;
  color: var(--colorNeutralForeground2);
  min-height: 20px;
  animation: subtitleFade 0.4s ease-in-out;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes bounce {
  from {
    transform: translateY(0);
    opacity: 0.4;
  }
  to {
    transform: translateY(-10px);
    opacity: 1;
  }
}

@keyframes subtitleFade {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
