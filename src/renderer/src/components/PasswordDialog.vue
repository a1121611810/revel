<template>
  <div class="password-overlay" @click.self="cancel">
    <div class="password-dialog card">
      <div class="password-header">
        <div class="password-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h3 class="password-title">{{ $t("dialog.passwordRequired") }}</h3>
        <p class="password-desc">{{ $t("dialog.passwordDesc") }}</p>
      </div>
      <div class="password-body">
        <input
          ref="inputRef"
          v-model="password"
          type="password"
          class="text-field"
          :placeholder="$t('dialog.password')"
          @keydown.enter="submit"
        />
        <label class="password-remember">
          <input v-model="remember" type="checkbox" />
          <span>{{ $t("dialog.rememberPassword") }}</span>
        </label>
      </div>
      <div class="password-footer">
        <button class="btn btn-outline" @click="cancel">{{ $t("dialog.cancel") }}</button>
        <button class="btn btn-primary" @click="submit">{{ $t("dialog.confirm") }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const password = ref("");
const remember = ref(false);
const inputRef = ref(null);

const emit = defineEmits(["submit", "cancel"]);

onMounted(() => {
  inputRef.value?.focus();
});

function submit() {
  emit("submit", { password: password.value, remember: remember.value });
}

function cancel() {
  emit("cancel");
}
</script>

<style scoped>
.password-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
}

.password-dialog {
  width: 360px;
  padding: 24px;
  animation: dialogIn 0.2s ease-out;
}

@keyframes dialogIn {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.password-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.password-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--cornerCircular);
  background: var(--colorBrandBackgroundTint);
  color: var(--colorBrandForeground1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.password-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--colorNeutralForeground1);
  margin: 0;
}

.password-desc {
  font-size: 13px;
  color: var(--colorNeutralForeground2);
  text-align: center;
  margin: 0;
}

.password-body {
  margin-bottom: 20px;
}

.password-body input[type="password"] {
  width: 100%;
  box-sizing: border-box;
}

.password-remember {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 12px;
  color: var(--colorNeutralForeground2);
  cursor: pointer;
}

.password-remember input {
  width: 14px;
  height: 14px;
  accent-color: var(--colorBrandForeground1);
}

.password-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
