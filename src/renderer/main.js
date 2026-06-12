import { createApp } from "vue";
import { initI18n, detectSystemLocale } from "@/locales";
import App from "./App.vue";
import spriteSvg from "./src/assets/icons/sprite.svg?raw";
import "@/style.css";

const i18n = initI18n();

const app = createApp(App);
app.use(i18n);

const spriteDiv = document.createElement("div");
spriteDiv.innerHTML = spriteSvg;
spriteDiv.style.display = "none";
spriteDiv.setAttribute("aria-hidden", "true");
document.body.appendChild(spriteDiv);

app.mount("#app");

if (window.electronAPI && window.electronAPI.getPlatform) {
  window.electronAPI.getPlatform().then((platform) => {
    if (platform === "darwin") {
      document.body.classList.add("platform-darwin");
    }
  });
}

// 异步检测系统语言（用户未手动设置时）
detectSystemLocale(i18n);
