<template>
  <div class="card auth-error-card" data-testid="auth-error-card">
    <div class="auth-error-content">
      <div class="auth-error-icon">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
          />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <div class="auth-error-text">
        <h3 class="auth-error-title">{{ $t("auth.errorTitle") }}</h3>
        <p class="auth-error-desc">{{ $t("auth.errorDesc") }}</p>
      </div>
    </div>
    <button
      class="btn btn-primary"
      data-testid="auth-go-to-settings"
      @click="$emit('go-to-settings')"
    >
      {{ $t("auth.goToSettings") }}
    </button>
  </div>
</template>

<script setup>
defineEmits(["go-to-settings"]);
</script>

<style scoped>
.auth-error-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  margin-bottom: 16px;
  border: 1px solid var(--colorStatusWarningStroke1);
  background: var(--colorStatusWarningBackground1);
  gap: 16px;
}

.auth-error-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.auth-error-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--cornerCircular);
  background: var(--colorStatusWarningForeground1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.auth-error-icon svg {
  width: 18px;
  height: 18px;
}

.auth-error-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.auth-error-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--colorNeutralForeground1);
  margin: 0;
}

.auth-error-desc {
  font-size: 13px;
  color: var(--colorNeutralForeground2);
  margin: 0;
}
</style>
