<template>
  <WelcomeView v-if="showWelcome" @start="showWelcome = false" />
  <div class="app-layout" v-else>
    <SideBar v-model="currentView" />
    <div class="main-content-wrapper">
      <div class="main-content-titlebar" aria-hidden="true"></div>
      <main class="main-content">
        <KeepAlive max="8">
          <CleanView v-if="currentView === 'clean'" />
          <AnalyzeView v-else-if="currentView === 'analyze'" />
          <StatusView v-else-if="currentView === 'status'" />
          <UninstallView v-else-if="currentView === 'uninstall'" />
          <OptimizeView v-else-if="currentView === 'optimize'" />
          <PurgeView v-else-if="currentView === 'purge'" />
          <InstallerView v-else-if="currentView === 'installer'" />
          <SettingsView v-else-if="currentView === 'settings'" />
        </KeepAlive>
      </main>
    </div>
  </div>
  <PasswordDialog v-if="showPasswordDialog" @submit="onPasswordSubmit" @cancel="onPasswordCancel" />
</template>

<script setup>
import { ref, onMounted, provide } from "vue";
import { initTheme } from "./src/themes";
import WelcomeView from "./src/views/WelcomeView.vue";
import SideBar from "./src/components/SideBar.vue";
import CleanView from "./src/views/CleanView.vue";
import AnalyzeView from "./src/views/AnalyzeView.vue";
import StatusView from "./src/views/StatusView.vue";
import UninstallView from "./src/views/UninstallView.vue";
import OptimizeView from "./src/views/OptimizeView.vue";
import PurgeView from "./src/views/PurgeView.vue";
import InstallerView from "./src/views/InstallerView.vue";
import SettingsView from "./src/views/SettingsView.vue";
import PasswordDialog from "./src/components/PasswordDialog.vue";
import { useMole } from "./src/composables/useMole.js";

const showWelcome = ref(!localStorage.getItem("revel-welcomed"));
const currentView = ref("clean");
provide("currentView", currentView);

const { submitPassword, cancelPassword } = useMole();
const showPasswordDialog = ref(false);

function onPasswordSubmit({ password }) {
  showPasswordDialog.value = false;
  submitPassword(password);
}

function onPasswordCancel() {
  showPasswordDialog.value = false;
  cancelPassword();
}

function handlePasswordRequest() {
  showPasswordDialog.value = true;
}

onMounted(() => {
  initTheme("fluent-light");
  window.addEventListener("mole-password-request", handlePasswordRequest);
});
</script>
