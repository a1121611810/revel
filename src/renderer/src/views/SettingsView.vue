<template>
  <div class="fade-in">
    <h1 class="page-title">{{ $t("settings.title") }}</h1>
    <p class="page-subtitle">{{ $t("settings.subtitle") }}</p>

    <div class="settings-grid">
      <!-- General Settings -->
      <div class="card">
        <div class="card-header">
          <div class="card-header-accent" style="background: var(--colorBrandForeground1)"></div>
          <div class="card-header-text">
            <div class="card-header-title-row">
              <span class="card-header-icon" aria-hidden="true">
                <Icon name="theme" size="18" />
              </span>
              <h2 class="card-title">{{ $t("settings.general") }}</h2>
            </div>
            <span class="card-desc">{{ $t("settings.generalDesc") }}</span>
          </div>
        </div>

        <!-- Theme Selection -->
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">{{ $t("settings.themeMode") }}</span>
            <span class="setting-desc">{{ $t("settings.themeModeDesc") }}</span>
          </div>
          <div class="theme-toggle-group">
            <button
              class="btn btn-outline btn-small"
              :class="{ active: currentThemeId === 'fluent-light' && themeMode === 'manual' }"
              @click="quickTheme('light')"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="5" />
                <path
                  d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2"
                />
              </svg>
              {{ $t("settings.themeLight") }}
            </button>
            <button
              class="btn btn-outline btn-small"
              :class="{ active: currentThemeId === 'fluent-dark' && themeMode === 'manual' }"
              @click="quickTheme('dark')"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              {{ $t("settings.themeDark") }}
            </button>
            <button
              class="btn btn-outline btn-small"
              :class="{ active: themeMode === 'system' }"
              @click="quickTheme('system')"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <path d="M8 21h8M12 17v4M2 7h20" />
              </svg>
              {{ $t("settings.themeSystem") }}
            </button>
          </div>
        </div>

        <!-- Language switcher -->
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">{{ $t("settings.language") }}</span>
            <span class="setting-desc">{{ $t("settings.languageDesc") }}</span>
          </div>
          <div class="theme-toggle-group">
            <button
              class="btn btn-outline btn-small"
              :class="{ active: locale === 'zh-CN' }"
              @click="setAppLocale('zh-CN')"
            >
              中文
            </button>
            <button
              class="btn btn-outline btn-small"
              :class="{ active: locale === 'en-US' }"
              @click="setAppLocale('en-US')"
            >
              English
            </button>
          </div>
        </div>

        <!-- Installed Themes List -->
        <div class="setting-row themes-list-row">
          <div class="setting-info">
            <span class="setting-label">{{ $t("settings.installedThemes") }}</span>
            <span class="setting-desc">{{ $t("settings.installedThemesDesc") }}</span>
          </div>
          <div class="theme-previews">
            <button
              v-for="theme in availableThemes"
              :key="theme.id"
              class="theme-preview-btn"
              :class="{ active: currentThemeId === theme.id }"
              @click="handleLoadTheme(theme.id)"
              :title="theme.description"
            >
              <div
                class="theme-preview-color"
                :style="{
                  background: theme.preview?.background || '#ccc',
                  borderColor: theme.preview?.primary || 'transparent',
                }"
              >
                <div
                  class="theme-preview-dot"
                  :style="{ background: theme.preview?.primary || '#0078d4' }"
                />
              </div>
              <span class="theme-preview-name">{{ theme.name }}</span>
            </button>
          </div>
        </div>

        <!-- Accent Color -->
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">{{ $t("settings.accentColor") }}</span>
            <span class="setting-desc">{{ $t("settings.accentColorDesc") }}</span>
          </div>
          <div class="accent-presets">
            <button
              v-for="preset in accentPresets"
              :key="preset.id"
              class="accent-swatch"
              :class="{ active: currentAccent === preset.hex }"
              :style="{ backgroundColor: preset.hex }"
              :title="preset.name"
              @click="setAccent(preset.hex)"
            />
            <input
              type="color"
              class="accent-picker"
              :value="currentAccent"
              @change="setAccent($event.target.value)"
            />
          </div>
        </div>

        <!-- Auto Launch -->
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">{{ $t("settings.autoLaunch") }}</span>
            <span class="setting-desc">{{ $t("settings.autoLaunchDesc") }}</span>
            <span v-if="autoLaunchDevMode" class="setting-warning">{{
              $t("settings.autoLaunchDevMode")
            }}</span>
          </div>
          <label class="checkbox">
            <input
              v-model="startupEnabled"
              type="checkbox"
              class="checkbox-input"
              :disabled="autoLaunchDevMode"
              @change="toggleAutoLaunch"
            />
            <span>{{ $t("settings.autoLaunchEnabled") }}</span>
          </label>
          <label v-if="startupEnabled && !autoLaunchDevMode" class="checkbox setting-sub">
            <input
              v-model="autoLaunchShowWindow"
              type="checkbox"
              class="checkbox-input"
              @change="toggleAutoLaunchShowWindow"
            />
            <span>{{ $t("settings.autoLaunchShowWindow") }}</span>
          </label>
        </div>

        <!-- Dock Icon Visibility (macOS only) -->
        <div v-if="isMacOS" class="setting-row">
          <div class="setting-info">
            <span class="setting-label">{{ $t("settings.dockIcon") }}</span>
            <span class="setting-desc">{{ $t("settings.dockIconDesc") }}</span>
          </div>
          <div class="theme-toggle-group">
            <button
              class="btn btn-outline btn-small"
              :class="{ active: dockStrategy === 'never' }"
              @click="setDockStrategy('never')"
            >
              {{ $t("settings.dockAlways") }}
            </button>
            <button
              class="btn btn-outline btn-small"
              :class="{ active: dockStrategy === 'onClose' }"
              @click="setDockStrategy('onClose')"
            >
              {{ $t("settings.dockHideOnClose") }}
            </button>
            <button
              class="btn btn-outline btn-small"
              :class="{ active: dockStrategy === 'onMinimize' }"
              @click="setDockStrategy('onMinimize')"
            >
              {{ $t("settings.dockHideOnMinimize") }}
            </button>
          </div>
        </div>

        <!-- Auto-launch Dock icon (sub-option, macOS only) -->
        <label v-if="isMacOS && startupEnabled && !autoLaunchDevMode" class="checkbox setting-sub">
          <input
            v-model="dockHideOnAutoLaunch"
            type="checkbox"
            class="checkbox-input"
            @change="toggleDockHideOnAutoLaunch"
          />
          <span>{{ $t("settings.dockHideOnAutoLaunch") }}</span>
        </label>

        <!-- Menu Bar Monitor -->
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">{{ $t("settings.menuBar") }}</span>
            <span class="setting-desc">{{ $t("settings.menuBarDesc") }}</span>
          </div>
          <label class="checkbox">
            <input
              v-model="menuBarEnabled"
              type="checkbox"
              class="checkbox-input"
              data-testid="menubar-toggle"
              :disabled="!isMacOS"
              @change="toggleMenuBar"
            />
            <span>{{ $t("settings.menuBarEnabled") }}</span>
          </label>
        </div>

        <!-- Menu Bar Modules (shown when enabled) -->
        <div v-if="menuBarEnabled && isMacOS" class="setting-row">
          <div class="setting-info">
            <span class="setting-label">{{ $t("settings.menuBarModules") }}</span>
            <span class="setting-desc">{{ $t("settings.menuBarModulesDesc") }}</span>
          </div>
          <div class="menubar-modules">
            <label class="checkbox">
              <input
                v-model="menuBarConfig.tray.modules.cpu"
                type="checkbox"
                class="checkbox-input"
                @change="saveMenuBarFullConfig"
              />
              <span>CPU</span>
            </label>
            <label class="checkbox">
              <input
                v-model="menuBarConfig.tray.modules.gpu"
                type="checkbox"
                class="checkbox-input"
                @change="saveMenuBarFullConfig"
              />
              <span>GPU</span>
            </label>
            <label class="checkbox">
              <input
                v-model="menuBarConfig.tray.modules.ram"
                type="checkbox"
                class="checkbox-input"
                @change="saveMenuBarFullConfig"
              />
              <span>RAM</span>
            </label>
            <label class="checkbox">
              <input
                v-model="menuBarConfig.tray.modules.ssd"
                type="checkbox"
                class="checkbox-input"
                @change="saveMenuBarFullConfig"
              />
              <span>SSD</span>
            </label>
          </div>
        </div>

        <!-- Tray Appearance (menu bar) -->
        <div v-if="menuBarEnabled && isMacOS" class="menu-bar-appearance">
          <div class="appearance-section-title">{{ $t("settings.menuBarTrayAppearance") }}</div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">{{ $t("settings.menuBarTrayLayout") }}</span>
              <span class="setting-desc">{{ $t("settings.menuBarTrayLayoutDesc") }}</span>
            </div>
            <div class="layout-toggle">
              <button
                class="btn btn-small"
                :class="{ 'btn-primary': menuBarConfig.tray.layout === 'horizontal' }"
                @click="setTrayLayout('horizontal')"
              >
                {{ $t("settings.menuBarTrayLayoutH") }}
              </button>
              <button
                class="btn btn-small"
                :class="{ 'btn-primary': menuBarConfig.tray.layout === 'vertical' }"
                @click="setTrayLayout('vertical')"
              >
                {{ $t("settings.menuBarTrayLayoutV") }}
              </button>
            </div>
          </div>

          <!-- Tray font size -->
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">{{ $t("settings.menuBarTrayFontSize") }}</span>
              <span class="setting-desc">{{ menuBarConfig.tray.fontSize }}px</span>
            </div>
            <div class="range-control">
              <input
                type="range"
                min="9"
                max="14"
                step="1"
                :value="menuBarConfig.tray.fontSize"
                @input="setTrayFontSize($event.target.value)"
                class="range-input"
              />
              <span class="range-value">{{ menuBarConfig.tray.fontSize }}px</span>
            </div>
          </div>

          <!-- Tray spacing -->
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">{{ $t("settings.menuBarTraySpacing") }}</span>
              <span class="setting-desc">{{ menuBarConfig.tray.spacing }}px</span>
            </div>
            <div class="range-control">
              <input
                type="range"
                min="1"
                max="12"
                step="1"
                :value="menuBarConfig.tray.spacing"
                @input="setTraySpacing($event.target.value)"
                class="range-input"
              />
              <span class="range-value">{{ menuBarConfig.tray.spacing }}px</span>
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">{{ $t("settings.menuBarTraySeparator") }}</span>
              <span class="setting-desc">{{ $t("settings.menuBarTraySeparatorDesc") }}</span>
            </div>
            <div class="layout-toggle">
              <button
                class="btn btn-small"
                :class="{ 'btn-primary': menuBarConfig.tray.separator === '  ' }"
                @click="setTraySeparator('  ')"
              >
                {{ $t("settings.menuBarTraySepSpaces") }}
              </button>
              <button
                class="btn btn-small"
                :class="{ 'btn-primary': menuBarConfig.tray.separator === ' · ' }"
                @click="setTraySeparator(' · ')"
              >
                {{ $t("settings.menuBarTraySepDot") }}
              </button>
              <button
                class="btn btn-small"
                :class="{ 'btn-primary': menuBarConfig.tray.separator === ' | ' }"
                @click="setTraySeparator(' | ')"
              >
                {{ $t("settings.menuBarTraySepBar") }}
              </button>
            </div>
          </div>
        </div>

        <!-- Popup Appearance -->
        <div v-if="menuBarEnabled && isMacOS" class="menu-bar-appearance">
          <div class="appearance-section-title">{{ $t("settings.menuBarPopupAppearance") }}</div>

          <!-- Font size -->
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">{{ $t("settings.menuBarFontSize") }}</span>
              <span class="setting-desc">{{ menuBarConfig.popup.fontSize }}px</span>
            </div>
            <div class="range-control">
              <input
                type="range"
                min="10"
                max="18"
                step="1"
                :value="menuBarConfig.popup.fontSize"
                @input="setPopupFontSize($event.target.value)"
                class="range-input"
              />
              <span class="range-value">{{ menuBarConfig.popup.fontSize }}px</span>
            </div>
          </div>

          <!-- Spacing -->
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">{{ $t("settings.menuBarSpacing") }}</span>
              <span class="setting-desc">{{ menuBarConfig.popup.spacing }}px</span>
            </div>
            <div class="range-control">
              <input
                type="range"
                min="2"
                max="12"
                step="1"
                :value="menuBarConfig.popup.spacing"
                @input="setPopupSpacing($event.target.value)"
                class="range-input"
              />
              <span class="range-value">{{ menuBarConfig.popup.spacing }}px</span>
            </div>
          </div>

          <!-- Module colors -->
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">{{ $t("settings.menuBarColors") }}</span>
              <span class="setting-desc">{{ $t("settings.menuBarColorsDesc") }}</span>
            </div>
            <div class="color-picker-group">
              <label class="color-picker-item">
                <span class="color-label">CPU</span>
                <input
                  type="color"
                  v-model="menuBarConfig.popup.moduleColors.cpu"
                  @change="saveMenuBarFullConfig"
                  class="color-input"
                />
              </label>
              <label class="color-picker-item">
                <span class="color-label">GPU</span>
                <input
                  type="color"
                  v-model="menuBarConfig.popup.moduleColors.gpu"
                  @change="saveMenuBarFullConfig"
                  class="color-input"
                />
              </label>
              <label class="color-picker-item">
                <span class="color-label">RAM</span>
                <input
                  type="color"
                  v-model="menuBarConfig.popup.moduleColors.ram"
                  @change="saveMenuBarFullConfig"
                  class="color-input"
                />
              </label>
              <label class="color-picker-item">
                <span class="color-label">SSD</span>
                <input
                  type="color"
                  v-model="menuBarConfig.popup.moduleColors.ssd"
                  @change="saveMenuBarFullConfig"
                  class="color-input"
                />
              </label>
            </div>
          </div>

          <!-- Range colors + thresholds -->
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">{{ $t("settings.menuBarRangeColors") }}</span>
              <span class="setting-desc">{{ $t("settings.menuBarRangeColorsDesc") }}</span>
            </div>
            <div class="range-color-group">
              <div class="range-color-row">
                <span class="range-badge range-badge-low">{{
                  $t("settings.menuBarRangeLow")
                }}</span>
                <input
                  type="color"
                  v-model="menuBarConfig.popup.rangeColors.low"
                  @change="saveMenuBarFullConfig"
                  class="color-input"
                />
                <span class="range-threshold-label">&lt;</span>
                <input
                  type="number"
                  v-model.number="menuBarConfig.popup.thresholds.mid"
                  min="1"
                  max="99"
                  class="threshold-input"
                  @change="saveMenuBarFullConfig"
                />
                <span class="range-threshold-suffix">%</span>
              </div>
              <div class="range-color-row">
                <span class="range-badge range-badge-mid">{{
                  $t("settings.menuBarRangeMid")
                }}</span>
                <input
                  type="color"
                  v-model="menuBarConfig.popup.rangeColors.mid"
                  @change="saveMenuBarFullConfig"
                  class="color-input"
                />
                <span class="range-threshold-label">&lt;</span>
                <input
                  type="number"
                  v-model.number="menuBarConfig.popup.thresholds.high"
                  min="1"
                  max="99"
                  class="threshold-input"
                  @change="saveMenuBarFullConfig"
                />
                <span class="range-threshold-suffix">%</span>
              </div>
              <div class="range-color-row">
                <span class="range-badge range-badge-high">{{
                  $t("settings.menuBarRangeHigh")
                }}</span>
                <input
                  type="color"
                  v-model="menuBarConfig.popup.rangeColors.high"
                  @change="saveMenuBarFullConfig"
                  class="color-input"
                />
                <span class="range-threshold-label">&ge;</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Cleanup Preferences -->
      <div class="card">
        <div class="card-header">
          <div class="card-header-accent" style="background: #107c10"></div>
          <div class="card-header-text">
            <div class="card-header-title-row">
              <span class="card-header-icon" aria-hidden="true">
                <Icon name="auto-launch" size="18" />
              </span>
              <h2 class="card-title">{{ $t("settings.cleanPreferences") }}</h2>
            </div>
            <span class="card-desc">{{ $t("settings.cleanPreferencesDesc") }}</span>
          </div>
        </div>

        <!-- Confirm Before Cleanup -->
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">{{ $t("settings.cleanConfirm") }}</span>
            <span class="setting-desc">{{ $t("settings.cleanConfirmDesc") }}</span>
          </div>
          <label class="checkbox">
            <input
              v-model="confirmBeforeClean"
              type="checkbox"
              class="checkbox-input"
              @change="saveCleanPrefs('confirm', confirmBeforeClean)"
            />
            <span>{{ $t("settings.cleanConfirmEnabled") }}</span>
          </label>
        </div>

        <!-- Show Cleanup Details -->
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">{{ $t("settings.showDetails") }}</span>
            <span class="setting-desc">{{ $t("settings.showDetailsDesc") }}</span>
          </div>
          <label class="checkbox">
            <input
              v-model="showCleanDetails"
              type="checkbox"
              class="checkbox-input"
              @change="saveCleanPrefs('details', showCleanDetails)"
            />
            <span>{{ $t("settings.showDetailsEnabled") }}</span>
          </label>
        </div>

        <!-- Default Selections -->
        <div class="setting-row default-items-row">
          <div class="setting-info">
            <span class="setting-label">{{ $t("settings.defaultSelected") }}</span>
            <span class="setting-desc">{{ $t("settings.defaultSelectedDesc") }}</span>
          </div>
          <div class="default-checkboxes">
            <label class="checkbox">
              <input
                v-model="defaultSelections"
                value="browser-cache"
                type="checkbox"
                class="checkbox-input"
                @change="saveCleanPrefs('defaults', defaultSelections)"
              />
              <span>{{ $t("settings.browserCache") }}</span>
            </label>
            <label class="checkbox">
              <input
                v-model="defaultSelections"
                value="app-cache"
                type="checkbox"
                class="checkbox-input"
                @change="saveCleanPrefs('defaults', defaultSelections)"
              />
              <span>{{ $t("settings.appCache") }}</span>
            </label>
            <label class="checkbox">
              <input
                v-model="defaultSelections"
                value="dev-cache"
                type="checkbox"
                class="checkbox-input"
                @change="saveCleanPrefs('defaults', defaultSelections)"
              />
              <span>{{ $t("settings.devCache") }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Permissions & Authorization -->
      <div class="card" data-testid="settings-permissions">
        <div class="card-header">
          <div class="card-header-accent" style="background: #d83b01"></div>
          <div class="card-header-text">
            <div class="card-header-title-row">
              <span class="card-header-icon" aria-hidden="true">
                <Icon name="about" size="18" />
              </span>
              <h2 class="card-title">{{ $t("settings.security") }}</h2>
            </div>
            <span class="card-desc">{{ $t("settings.securityDesc") }}</span>
          </div>
        </div>

        <!-- Password Management -->
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">{{ $t("settings.adminPassword") }}</span>
            <span class="setting-desc">{{
              auth.passwordSaved.value
                ? $t("settings.passwordSaved")
                : $t("settings.passwordNotSaved")
            }}</span>
          </div>
          <div class="auth-password-actions">
            <button
              v-if="!auth.passwordSaved.value"
              class="btn btn-primary btn-small"
              data-testid="auth-set-password"
              @click="openPasswordDialog('set')"
            >
              {{ $t("settings.setPassword") }}
            </button>
            <template v-else>
              <button class="btn btn-outline btn-small" @click="openPasswordDialog('change')">
                {{ $t("settings.changePassword") }}
              </button>
              <button class="btn btn-outline btn-small" @click="handleClearPassword">
                {{ $t("settings.clearPassword") }}
              </button>
            </template>
          </div>
        </div>

        <!-- Module Permissions List -->
        <div class="setting-row auth-modules-row">
          <div class="setting-info">
            <span class="setting-label">{{ $t("settings.modulePermissions") }}</span>
            <span class="setting-desc">{{ $t("settings.modulePermissionsDesc") }}</span>
          </div>
          <div class="auth-modules-list">
            <div v-for="mod in auth.modules.value" :key="mod.id" class="auth-module-item">
              <span class="auth-module-name">{{ $t(mod.nameKey) }}</span>
              <span
                class="badge"
                :class="{
                  'badge-success': mod.authorized,
                  'badge-warning': !mod.authorized,
                }"
              >
                {{ mod.authorized ? $t("settings.authorized") : $t("settings.notAuthorized") }}
              </span>
              <button
                class="btn btn-outline btn-small"
                :disabled="authLoading"
                @click="handleVerifyModule(mod.id)"
              >
                {{ $t("settings.testAuth") }}
              </button>
            </div>
          </div>
        </div>

        <!-- Global Actions -->
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">{{ $t("settings.ensureAllAuth") }}</span>
            <span class="setting-desc">{{ $t("settings.ensureAllAuthDesc") }}</span>
          </div>
          <button
            class="btn btn-primary btn-small"
            :disabled="authLoading"
            @click="handleEnsureAll"
          >
            {{ $t("settings.ensureAll") }}
          </button>
        </div>
      </div>

      <!-- Toast notification -->
      <div v-if="authToast.show" class="auth-toast" :class="`auth-toast-${authToast.type}`">
        {{ authToast.message }}
      </div>

      <!-- Password Dialog -->
      <PasswordDialog
        v-if="showPasswordDialog"
        @submit="onPasswordSubmit"
        @cancel="onPasswordCancel"
      />

      <!-- About -->
      <div class="card">
        <div class="card-header">
          <div class="card-header-accent" style="background: var(--colorNeutralForeground3)"></div>
          <div class="card-header-text">
            <div class="card-header-title-row">
              <span class="card-header-icon" aria-hidden="true">
                <Icon name="acknowledgments" size="18" />
              </span>
              <h2 class="card-title">{{ $t("settings.about") }}</h2>
            </div>
            <span class="card-desc">{{ $t("settings.aboutDesc") }}</span>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Revel v{{ appVersion }}</span>
            <span class="setting-desc">{{ $t("welcome.subtitle") }}</span>
          </div>
          <div class="about-actions">
            <button class="btn btn-primary btn-small" @click="openReleases">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              {{ $t("settings.visitReleases") }}
            </button>
            <button class="btn btn-outline btn-small" @click="openGitHub">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                />
              </svg>
              {{ $t("settings.visitGitHub") }}
            </button>
            <button class="btn btn-outline btn-small" @click="showAckDialog = true">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
              </svg>
              {{ $t("settings.acknowledgments") }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <AcknowledgmentsDialog v-model="showAckDialog" />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import {
  loadTheme,
  getCurrentTheme,
  getThemeList,
  setThemeMode,
  getThemeMode,
  setAccentColor,
} from "../themes";
import { ACCENT_PRESETS } from "../themes/accent-presets.js";
import { useAuth } from "../composables/useAuth.js";
import AcknowledgmentsDialog from "../components/AcknowledgmentsDialog.vue";
import PasswordDialog from "../components/PasswordDialog.vue";
import Icon from "@/components/Icon.vue";

const { t, locale } = useI18n();
const auth = useAuth();

const showPasswordDialog = ref(false);
const passwordDialogMode = ref("set");
const authLoading = ref(false);
const authToast = ref({ show: false, message: "", type: "success" });

function setAppLocale(lang) {
  locale.value = lang;
  localStorage.setItem("revel-language", lang);
  document.documentElement.setAttribute("lang", lang === "zh-CN" ? "zh-CN" : "en");
  if (window.electronAPI && window.electronAPI.setAppLocale) {
    window.electronAPI.setAppLocale(lang).catch(function () {});
  }
}

// === Available Themes ===
const availableThemes = ref([]);
const currentThemeId = ref("");
const themeMode = ref("manual");

const accentPresets = ACCENT_PRESETS;
const currentAccent = ref(localStorage.getItem("revel-accent-color") || "#0078d4");
const showAckDialog = ref(false);

async function setAccent(hex) {
  try {
    await setAccentColor(hex);
    currentAccent.value = hex;
  } catch {
    // Theme engine error; silently ignore
  }
}

onMounted(() => {
  availableThemes.value = getThemeList();
  currentThemeId.value = getCurrentTheme();
  themeMode.value = getThemeMode();
  loadAppVersion();
  loadAutoLaunchStatus();
  loadMenuBarFullConfig();
  loadDockConfig();
  loadSavedPasswordStatus();
  loadCleanPreferences();
  auth.loadStatus();
});

// === Theme Switch ===
async function handleLoadTheme(themeId) {
  try {
    await loadTheme(themeId);
    currentThemeId.value = themeId;
  } catch {
    // Theme engine error; silently ignore
  }
}

async function handleSetMode(mode) {
  try {
    themeMode.value = mode;
    await setThemeMode(mode);
    currentThemeId.value = getCurrentTheme();
  } catch {
    // Theme engine error; silently ignore
  }
}

async function quickTheme(mode) {
  if (mode === "system") {
    await handleSetMode("system");
  } else {
    await handleSetMode("manual");
    await handleLoadTheme(mode === "dark" ? "fluent-dark" : "fluent-light");
  }
}

// === Auto Launch ===
const startupEnabled = ref(false);
const autoLaunchDevMode = ref(false);
const autoLaunchShowWindow = ref(false);

async function loadAutoLaunchStatus() {
  try {
    const res = await window.electronAPI.getAutoLaunch();
    startupEnabled.value = res.enabled || false;
    autoLaunchDevMode.value = res.devMode || false;
    autoLaunchShowWindow.value = res.showWindow || false;
  } catch {
    startupEnabled.value = false;
  }
}

async function toggleAutoLaunch() {
  try {
    const res = await window.electronAPI.setAutoLaunch(startupEnabled.value, {
      showWindow: autoLaunchShowWindow.value,
    });
    if (res && !res.success) {
      startupEnabled.value = !startupEnabled.value;
    }
  } catch {
    startupEnabled.value = !startupEnabled.value;
  }
}

async function toggleAutoLaunchShowWindow() {
  try {
    await window.electronAPI.setAutoLaunchShowWindow(autoLaunchShowWindow.value);
  } catch {
    autoLaunchShowWindow.value = !autoLaunchShowWindow.value;
  }
}

// === Dock Icon Visibility (macOS only) ===
const dockStrategy = ref("never");
const dockHideOnAutoLaunch = ref(false);

async function loadDockConfig() {
  try {
    const config = await window.electronAPI.getDockConfig();
    dockStrategy.value = config.hideStrategy || "never";
    dockHideOnAutoLaunch.value = config.hideOnAutoLaunch || false;
  } catch {
    dockStrategy.value = "never";
    dockHideOnAutoLaunch.value = false;
  }
}

async function setDockStrategy(strategy) {
  try {
    const res = await window.electronAPI.setDockStrategy(strategy);
    if (res && res.success) {
      dockStrategy.value = strategy;
    }
  } catch {
    // silently fail
  }
}

async function toggleDockHideOnAutoLaunch() {
  try {
    await window.electronAPI.setDockHideOnAutoLaunch(dockHideOnAutoLaunch.value);
  } catch {
    dockHideOnAutoLaunch.value = !dockHideOnAutoLaunch.value;
  }
}

// === Menu Bar Monitor ===
const menuBarEnabled = ref(false);
const isMacOS = ref(false);
const DEFAULT_MENU_BAR_CONFIG = {
  tray: {
    modules: { cpu: true, gpu: true, ram: true, ssd: true },
    layout: "horizontal",
    fontSize: 12,
    spacing: 4,
    separator: "  ",
  },
  popup: {
    modules: { cpu: true, gpu: true, ram: true, ssd: true },
    fontSize: 12,
    spacing: 4,
    moduleColors: {
      cpu: "#5ac8fa",
      gpu: "#ff9f0a",
      ram: "#bf5af2",
      ssd: "#30d158",
    },
    rangeColors: {
      low: "#30d158",
      mid: "#ff9f0a",
      high: "#ff453a",
    },
    thresholds: {
      mid: 50,
      high: 80,
    },
  },
};
const menuBarConfig = ref(JSON.parse(JSON.stringify(DEFAULT_MENU_BAR_CONFIG)));

let saveMenuBarDebounceTimer = null;
let menuBarConfigLoaded = false;

async function loadMenuBarFullConfig() {
  if (menuBarConfigLoaded) {
    console.log("[Settings] loadMenuBarFullConfig: already loaded, skipping");
    return;
  }
  console.log("[Settings] loadMenuBarFullConfig START");
  try {
    const platform = await window.electronAPI.getPlatform();
    console.log("[Settings] loadMenuBarFullConfig platform:", platform);
    isMacOS.value = platform === "darwin";
    if (!isMacOS.value) {
      console.log("[Settings] loadMenuBarFullConfig: not macOS, return");
      return;
    }

    const enabled = await window.electronAPI.getMenuBarEnabled();
    console.log("[Settings] loadMenuBarFullConfig enabled:", enabled);
    menuBarEnabled.value = enabled;

    const cfg = await window.electronAPI.getMenuBarConfig();
    console.log(
      "[Settings] loadMenuBarFullConfig loaded cfg keys:",
      cfg ? Object.keys(cfg) : "null",
    );
    if (cfg) {
      // Deep merge tray config
      if (cfg.tray) {
        menuBarConfig.value.tray.modules = {
          ...DEFAULT_MENU_BAR_CONFIG.tray.modules,
          ...(cfg.tray.modules || {}),
        };
        if (cfg.tray.layout) menuBarConfig.value.tray.layout = cfg.tray.layout;
        if (cfg.tray.fontSize != null) menuBarConfig.value.tray.fontSize = cfg.tray.fontSize;
        if (cfg.tray.spacing != null) menuBarConfig.value.tray.spacing = cfg.tray.spacing;
        if (cfg.tray.separator != null) menuBarConfig.value.tray.separator = cfg.tray.separator;
      }
      // Deep merge popup config
      if (cfg.popup) {
        menuBarConfig.value.popup.modules = {
          ...DEFAULT_MENU_BAR_CONFIG.popup.modules,
          ...(cfg.popup.modules || {}),
        };
        if (cfg.popup.fontSize != null) menuBarConfig.value.popup.fontSize = cfg.popup.fontSize;
        if (cfg.popup.spacing != null) menuBarConfig.value.popup.spacing = cfg.popup.spacing;
        menuBarConfig.value.popup.moduleColors = {
          ...DEFAULT_MENU_BAR_CONFIG.popup.moduleColors,
          ...(cfg.popup.moduleColors || {}),
        };
        menuBarConfig.value.popup.rangeColors = {
          ...DEFAULT_MENU_BAR_CONFIG.popup.rangeColors,
          ...(cfg.popup.rangeColors || {}),
        };
        menuBarConfig.value.popup.thresholds = {
          ...DEFAULT_MENU_BAR_CONFIG.popup.thresholds,
          ...(cfg.popup.thresholds || {}),
        };
      }
    }
    console.log(
      "[Settings] loadMenuBarFullConfig DONE, tray.layout:",
      menuBarConfig.value.tray.layout,
    );
    menuBarConfigLoaded = true;
  } catch (err) {
    console.error("[Settings] loadMenuBarFullConfig ERROR:", err);
    menuBarEnabled.value = false;
  }
}

async function toggleMenuBar() {
  try {
    const res = await window.electronAPI.setMenuBarEnabled(menuBarEnabled.value);
    if (!res.success) {
      menuBarEnabled.value = !menuBarEnabled.value;
    }
  } catch {
    menuBarEnabled.value = !menuBarEnabled.value;
  }
}

function saveMenuBarFullConfigDebounced() {
  if (saveMenuBarDebounceTimer) clearTimeout(saveMenuBarDebounceTimer);
  saveMenuBarDebounceTimer = setTimeout(() => {
    saveMenuBarFullConfig();
  }, 500);
}

function setTrayLayout(layout) {
  menuBarConfig.value.tray.layout = layout;
  saveMenuBarFullConfig();
}

function setTraySeparator(sep) {
  menuBarConfig.value.tray.separator = sep;
  saveMenuBarFullConfig();
}

function setTrayFontSize(val) {
  menuBarConfig.value.tray.fontSize = Number(val);
  saveMenuBarFullConfigDebounced();
}

function setTraySpacing(val) {
  menuBarConfig.value.tray.spacing = Number(val);
  saveMenuBarFullConfigDebounced();
}

function setPopupFontSize(val) {
  menuBarConfig.value.popup.fontSize = Number(val);
  saveMenuBarFullConfigDebounced();
}

function setPopupSpacing(val) {
  menuBarConfig.value.popup.spacing = Number(val);
  saveMenuBarFullConfigDebounced();
}

async function saveMenuBarFullConfig() {
  try {
    // Use JSON round-trip to strip Vue reactive proxy — Electron IPC uses
    // structured clone which cannot serialize Vue's reactive Proxy objects.
    const payload = JSON.parse(JSON.stringify(menuBarConfig.value));
    console.log(
      "[Settings] saveMenuBarFullConfig sending, tray.layout:",
      payload.tray?.layout,
      "popup.layout:",
      payload.popup?.layout,
    );
    const result = await window.electronAPI.setMenuBarConfig(payload);
    console.log("[Settings] saveMenuBarFullConfig result:", JSON.stringify(result));
  } catch (err) {
    console.error("[Settings] saveMenuBarFullConfig ERROR:", err);
  }
}

// === Security Settings ===
const hasSavedPassword = ref(false);

async function loadSavedPasswordStatus() {
  try {
    const res = await window.electronAPI.hasSudoPassword();
    hasSavedPassword.value = res?.has || false;
  } catch {
    hasSavedPassword.value = false;
  }
}

async function clearSavedPassword() {
  try {
    await window.electronAPI.clearSudoPassword();
    hasSavedPassword.value = false;
  } catch {
    window.alert(t("settings.clearPasswordFailed"));
  }
}

// === Cleanup Preferences Persistence ===
const DEFAULT_CLEAN_PREFS = {
  confirm: true,
  details: true,
  defaults: ["browser-cache", "app-cache"],
};

const confirmBeforeClean = ref(DEFAULT_CLEAN_PREFS.confirm);
const showCleanDetails = ref(DEFAULT_CLEAN_PREFS.details);
const defaultSelections = ref([...DEFAULT_CLEAN_PREFS.defaults]);

function loadCleanPreferences() {
  try {
    const confirm = localStorage.getItem("revel-clean-confirm");
    const details = localStorage.getItem("revel-clean-details");
    const defaults = localStorage.getItem("revel-clean-defaults");

    confirmBeforeClean.value = confirm !== null ? confirm === "true" : DEFAULT_CLEAN_PREFS.confirm;
    showCleanDetails.value = details !== null ? details === "true" : DEFAULT_CLEAN_PREFS.details;
    defaultSelections.value = defaults ? JSON.parse(defaults) : [...DEFAULT_CLEAN_PREFS.defaults];
  } catch {
    confirmBeforeClean.value = DEFAULT_CLEAN_PREFS.confirm;
    showCleanDetails.value = DEFAULT_CLEAN_PREFS.details;
    defaultSelections.value = [...DEFAULT_CLEAN_PREFS.defaults];
  }
}

function saveCleanPrefs(key, value) {
  try {
    const storageKey = `revel-clean-${key}`;
    const storageValue = typeof value === "boolean" ? String(value) : JSON.stringify(value);
    localStorage.setItem(storageKey, storageValue);
  } catch {
    // localStorage may be unavailable or full; silently fail
  }
}

// === App Version ===
const appVersion = ref("1.0.0");

async function loadAppVersion() {
  try {
    const version = await window.electronAPI.getAppVersion();
    appVersion.value = version || "1.0.0";
  } catch {
    appVersion.value = "1.0.0";
  }
}

// === Open Releases ===
async function openReleases() {
  try {
    await window.electronAPI.openExternal("https://github.com/a1121611810/revel/releases");
  } catch {
    window.alert(t("settings.cannotOpenLink"));
  }
}

// === Permissions & Authorization ===
function openPasswordDialog(mode) {
  passwordDialogMode.value = mode;
  showPasswordDialog.value = true;
}

async function onPasswordSubmit({ password, remember }) {
  showPasswordDialog.value = false;
  if (!password) return;

  authLoading.value = true;
  try {
    const saveRes = await window.electronAPI.saveSudoPassword(password);
    if (!saveRes.success) {
      showToast(saveRes.fallback || "保存密码失败", "error");
      return;
    }
    const verifyRes = await auth.ensureSudo();
    if (verifyRes.success) {
      showToast("授权成功", "success");
    } else {
      showToast(verifyRes.fallback || "密码验证失败", "error");
    }
  } catch (err) {
    showToast(err.message || "操作失败", "error");
  } finally {
    authLoading.value = false;
  }
}

function onPasswordCancel() {
  showPasswordDialog.value = false;
}

function showToast(message, type) {
  authToast.value = { show: true, message, type };
  setTimeout(() => {
    authToast.value.show = false;
  }, 3000);
}

async function handleVerifyModule(moduleId) {
  authLoading.value = true;
  try {
    const res = await auth.verifyModule(moduleId);
    if (res.success) {
      showToast("模块授权验证成功", "success");
    } else {
      showToast(res.fallback || "授权验证失败", "error");
    }
  } catch (err) {
    showToast(err.message || "验证失败", "error");
  } finally {
    authLoading.value = false;
  }
}

async function handleEnsureAll() {
  authLoading.value = true;
  try {
    const res = await auth.ensureSudo();
    if (res.success) {
      showToast("全部模块已授权", "success");
    } else {
      showToast(res.fallback || "授权失败，请检查密码", "error");
    }
  } catch (err) {
    showToast(err.message || "授权失败", "error");
  } finally {
    authLoading.value = false;
  }
}

async function handleClearPassword() {
  try {
    await window.electronAPI.clearSudoPassword();
    auth.clearLocalState();
    showToast("密码已清除", "success");
  } catch {
    showToast("清除密码失败", "error");
  }
}

// === Open GitHub ===
async function openGitHub() {
  try {
    await window.electronAPI.openExternal("https://github.com/a1121611810/revel");
  } catch {
    window.alert(t("settings.cannotOpenLink"));
  }
}
</script>

<style scoped>
.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Card Header */
.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.card-header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--colorBrandForeground1);
  flex-shrink: 0;
}

.card-header-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-header-accent {
  width: 4px;
  border-radius: 2px;
  align-self: stretch;
  flex-shrink: 0;
}

.card-header-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--colorNeutralForeground1);
  margin: 0;
}

.card-desc {
  font-size: 12px;
  color: var(--colorNeutralForeground3);
}

/* Setting Row Layout */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid var(--colorNeutralStroke2);
  gap: 16px;
}

.setting-row:last-child {
  border-bottom: none;
}

.default-items-row {
  align-items: flex-start;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--colorNeutralForeground1);
}

.setting-desc {
  font-size: 12px;
  color: var(--colorNeutralForeground3);
}

.setting-warning {
  display: block;
  font-size: 12px;
  color: var(--colorPaletteRedForeground1, #d13438);
  margin-top: 4px;
}

.setting-sub {
  margin-left: 24px;
  margin-top: 8px;
}

/* Theme Toggle Button Group */
.theme-toggle-group {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.theme-toggle-group .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
}

.theme-toggle-group .btn.active {
  background: var(--colorBrandBackground1);
  color: white;
  border-color: transparent;
  box-shadow: 0 2px 8px rgba(0, 120, 212, 0.3);
}

/* Default Selections Checkboxes */
.default-checkboxes {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}

.default-checkboxes .checkbox {
  justify-content: flex-end;
}

/* About Action Buttons */
.about-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.about-actions .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* === Theme Preview Blocks === */
.themes-list-row {
  align-items: flex-start;
}

.theme-previews {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.theme-preview-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border: 2px solid transparent;
  border-radius: var(--corner80);
  background: none;
  cursor: pointer;
  transition: all var(--duration100);
}

.theme-preview-btn:hover {
  background: var(--colorSubtleBackgroundHover);
}

.theme-preview-btn.active {
  border-color: var(--colorBrandForeground1);
  background: var(--colorBrandBackgroundTint);
}

.theme-preview-color {
  width: 40px;
  height: 40px;
  border-radius: var(--cornerCircular);
  border: 2px solid var(--colorNeutralStroke2);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.theme-preview-dot {
  width: 14px;
  height: 14px;
  border-radius: var(--cornerCircular);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.theme-preview-name {
  font-size: 11px;
  color: var(--colorNeutralForeground2);
  font-weight: 500;
  white-space: nowrap;
}

.theme-preview-btn.active .theme-preview-name {
  color: var(--colorBrandForeground1);
  font-weight: 600;
}

/* === Accent Color Picker === */
.accent-presets {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.accent-swatch {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.1s ease;
  padding: 0;
}

.accent-swatch:hover {
  transform: scale(1.15);
}

.accent-swatch.active {
  border-color: var(--colorNeutralForeground1);
}

.accent-picker {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  background: none;
}

.auth-password-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.auth-modules-row {
  align-items: flex-start;
}

.auth-modules-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
  min-width: 280px;
}

.auth-module-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border-radius: var(--corner40);
  background: var(--colorNeutralBackground2);
}

.auth-module-name {
  font-size: 13px;
  color: var(--colorNeutralForeground1);
  flex: 1;
}

.auth-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: var(--corner40);
  font-size: 13px;
  font-weight: 500;
  z-index: 9999;
  animation: toastIn 0.2s ease-out;
}

.auth-toast-success {
  background: var(--colorSuccessBackground1);
  color: white;
}

.auth-toast-error {
  background: var(--colorDangerBackground1);
  color: white;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* Menu bar modules checkboxes */
.menubar-modules {
  display: flex;
  gap: 16px;
  flex-shrink: 0;
}

.menubar-modules .checkbox {
  margin: 0;
}

/* Menu bar appearance settings */
.menu-bar-appearance {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--colorNeutralStroke2);
}

.appearance-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--colorNeutralForeground2);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.layout-toggle {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.range-control {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.range-input {
  width: 120px;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--colorNeutralStroke2);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--colorBrandBackground1);
  border: 2px solid var(--colorNeutralBackground1);
  box-shadow: var(--shadow4);
  cursor: pointer;
  transition: box-shadow var(--duration100);
}

.range-input::-webkit-slider-thumb:hover {
  box-shadow: var(--shadow8);
}

.range-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--colorNeutralForeground1);
  min-width: 36px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.color-picker-group {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.color-picker-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.color-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--colorNeutralForeground3);
  text-transform: uppercase;
}

.color-input {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 2px solid var(--colorNeutralStroke1);
  border-radius: var(--corner40);
  cursor: pointer;
  background: none;
}

.color-input::-webkit-color-swatch-wrapper {
  padding: 2px;
}

.color-input::-webkit-color-swatch {
  border: none;
  border-radius: 2px;
}

.range-color-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.range-color-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  padding: 2px 6px;
  border-radius: var(--cornerPill);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.range-badge-low {
  background: var(--colorSuccessBackground1);
  color: var(--colorSuccessForeground1);
}

.range-badge-mid {
  background: var(--colorWarningBackground1);
  color: var(--colorWarningForeground1);
}

.range-badge-high {
  background: var(--colorDangerBackground1);
  color: var(--colorDangerForeground1);
}

.range-threshold-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--colorNeutralForeground3);
}

.range-threshold-suffix {
  font-size: 12px;
  color: var(--colorNeutralForeground3);
}

.threshold-input {
  width: 52px;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--colorNeutralStroke1);
  border-radius: var(--corner40);
  font-family: var(--font);
  font-size: 13px;
  font-weight: 600;
  background: var(--colorNeutralBackground1);
  color: var(--colorNeutralForeground1);
  outline: none;
  text-align: center;
  font-variant-numeric: tabular-nums;
  -moz-appearance: textfield;
}

.threshold-input::-webkit-inner-spin-button,
.threshold-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.threshold-input:focus {
  border-color: var(--colorStrokeFocus1);
}
</style>
