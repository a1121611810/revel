<template>
  <div v-if="lines.length > 0" class="card live-output-card">
    <div class="live-output-header">
      <span class="live-output-title">{{ $t("clean.liveOutput") }}</span>
      <span class="live-output-dot"></span>
    </div>
    <div class="live-output-body" ref="bodyRef">
      <div
        v-for="(line, i) in visibleLines"
        :key="i"
        class="live-output-line"
        :class="{ 'live-stderr': line.type === 'stderr' }"
      >
        {{ line.text }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = defineProps({
  lines: { type: Array, default: () => [] },
});

const bodyRef = ref(null);

const visibleLines = computed(() => props.lines.slice(-8));

watch(
  () => props.lines.length,
  () => {
    nextTick(() => {
      if (bodyRef.value) {
        bodyRef.value.scrollTop = bodyRef.value.scrollHeight;
      }
    });
  },
);
</script>

<style scoped>
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
</style>
