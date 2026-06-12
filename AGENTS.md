# AGENTS.md

## 项目概述

- **项目名称**：Revel
- **定位**：Mole CLI 的 Fluent Design 图形界面
- **目标平台**：macOS（优先）、Windows、Linux
- **开源协议**：MIT
- **GitHub**：https://github.com/a1121611810/revel

---

## 技术栈

- **Electron** ^42.0.0 — 桌面框架
- **Vue 3** ^3.4.0 — 前端框架（JavaScript，无 TypeScript）
- **Vite** ^8.0.0 — 构建工具（Rolldown 驱动，无 electron-vite 封装）
- **@vitejs/plugin-vue** ^6.0.7 — Vue SFC 编译
- **@vue/test-utils** ^2.4.0 — Vue 组件测试工具
- **Vitest** ^4.0.0 — 测试框架
- **ECharts** ^5.5.0 — 数据可视化
- **pnpm** 11.5.0 — 包管理器

---

## 架构决策

### 多进程架构

```
Main Process (main.js)
├── 窗口管理 (BrowserWindow)
├── 系统托盘 (Tray)
├── IPC 通信 (ipcMain)
├── 命令执行 (child_process.spawn)
└── 权限提升 (osascript sudo)

Renderer Process (Vue 3 App)
├── 页面路由 (WelcomeView / CleanView / AnalyzeView / ...)
├── 主题引擎 (themes/engine.js)
├── UI 组件 (style.css 自建 Fluent 风格)
└── IPC 调用 (window.electronAPI)

Preload Script (preload.js)
└── 安全桥接 (contextBridge)
```

### 构建架构（无 electron-vite）

使用原生 Vite 多配置：

- `vite.renderer.config.js` — Renderer：Vite dev server + HMR
- `vite.main.config.js` — Main：Vite library mode (CJS, target: node24)
- `vite.preload.config.js` — Preload：Vite library mode (CJS)

开发模式：
- `scripts/dev.mjs` — Vite dev server + watch 编译 main/preload + Electron

生产构建：
- `scripts/build.mjs` — 依次构建 renderer → main → preload，输出到 `dist/`

---

## 目录结构

```
src/
├── main/                 # Electron 主进程
│   ├── main.js           # 入口文件
│   └── __mocks__/        # E2E 测试 mock
├── preload/              # 预加载脚本
│   └── preload.js        # 入口文件
├── renderer/             # 渲染进程
│   ├── index.html        # HTML 入口
│   ├── App.vue           # Vue 根组件
│   ├── main.js           # Vue 入口（挂载 + 主题初始化）
│   ├── src/
│   │   ├── views/        # 页面级组件
│   │   │   ├── WelcomeView.vue
│   │   │   ├── CleanView.vue
│   │   │   ├── AnalyzeView.vue
│   │   │   ├── StatusView.vue
│   │   │   ├── UninstallView.vue
│   │   │   ├── OptimizeView.vue
│   │   │   ├── PurgeView.vue
│   │   │   ├── InstallerView.vue
│   │   │   └── SettingsView.vue
│   │   ├── components/   # 共享组件
│   │   │   └── SideBar.vue
│   │   ├── composables/  # 可复用逻辑
│   │   │   └── useMole.js
│   │   ├── themes/       # 主题系统
│   │   │   ├── engine.js
│   │   │   ├── fluent-light.json
│   │   │   └── fluent-dark.json
│   │   └── utils/        # 工具函数
│   │       └── helpers.js
│   └── src/views/__tests__/ # 页面级组件测试（已迁移到 tests/）

tests/                      # 所有测试的统一根目录
├── main/                   # 主进程单元测试
├── preload/                # preload 单元测试
├── renderer/               # 渲染进程单元测试
│   ├── views/
│   ├── components/
│   ├── composables/
│   ├── themes/
│   └── core/               # App.vue / main.js
├── integration/            # 集成测试
├── browser/                # Vitest Browser Mode 测试
│   └── renderer/
└── e2e/                    # Playwright Electron E2E 测试
    ├── tests/              # 9 个视图的 E2E 测试
    └── fixtures/           # 测试预设数据

scripts/
├── dev.mjs               # 开发模式启动脚本
└── build.mjs             # 生产构建脚本

vite.renderer.config.js   # Renderer 进程 Vite 配置
vite.main.config.js       # Main 进程 Vite 配置
vite.preload.config.js    # Preload 进程 Vite 配置
```

---

## 关键实现细节

### 主题系统

- 使用自建的 CSS 变量 + Theme JSON 引擎
- `themes/engine.js` 提供运行时主题切换能力
- 主题 JSON 格式：`fluent-light.json`、`fluent-dark.json`
- 支持手动切换和跟随系统两种模式
- 通过 `<style>` 标签动态注入 CSS 变量到 `:root`

### IPC 通信

- `mole-exec` — 普通命令执行（`mo` + 参数）
- `mole-exec-sudo` — 提权命令执行（osascript）
- `mole-output` — 命令输出实时推送（send/on 模式）
- `get-platform` — 获取平台信息
- `open-external` — 打开外部链接
- `show-dialog` — 显示系统对话框
- `check-for-updates` — 检查更新
- `get-app-version` — 获取版本号
- `set-auto-launch` / `get-auto-launch` — 开机启动
- `check-mole-installed` — 检查 Mole CLI 安装
- `navigate-to` — 导航事件
- `update-available` — 更新事件（预留通道）
- `system-status` — 系统状态实时推送（main → renderer，start/stop + 周期性推送）

### 系统状态数据（StatusView）

状态监控支持**双源数据采集**，主进程在 macOS 上同时采集 Mole CLI 和原生系统数据：

```
Payload: { mole: {...}, native: {...}, platform, osVersion, ... }
```

- **Mole 源**：通过 `mo status --json` 获取，与 Mole CLI 保持一致
- **原生源**（macOS only）：通过 `ioreg`/`vm_statistics64`/`host_statistics64` 获取，更接近系统监视器
- **渲染层偏好**：用户可在 StatusView 选择全局偏好（自动/Mole/原生）或按模块覆盖
- **默认行为**：macOS 自动使用原生数据，其他平台回退到 Mole

### 数据持久化

- `localStorage`：
  - `revel-welcomed` — 首次引导标记
  - `revel-theme` — 保存的主题 ID
  - `revel-theme-mode` — 主题模式 (manual/system)
  - `revel-status-source-mode` — 状态页数据源全局偏好 (auto/mole/native)
  - `revel-status-source-modules` — 状态页各模块数据源覆盖偏好 (JSON)

---

## 样式系统

- 自建 Fluent Design 风格 CSS，不使用 `@fluentui/web-components`
- `style.css` 提供完整的 Design Token（CSS 变量）和组件类
- 组件类：`.btn`、`.btn-primary`、`.card`、`.badge`、`.text-field`、`.checkbox` 等
- 主题切换通过 CSS 变量动态注入实现，无需刷新页面

---

## 质量工具链

| 工具 | 用途 | 触发方式 |
|------|------|---------|
| **oxlint** | 代码检查 | `pnpm lint` / pre-commit hook |
| **oxfmt** | 代码格式化 | `pnpm format` / pre-commit hook |
| **vitest** | 单元测试 (jsdom) | `pnpm test` |
| **vitest** | 浏览器测试 (Browser Mode) | `pnpm test:browser` |
| **playwright** | E2E 测试 (Electron) | `pnpm test:e2e` |
| **simple-git-hooks** | Git hooks | `postinstall` 自动配置 |

pre-commit hook 会强制运行 `oxlint src/` 和 `oxfmt src/ --check`，任一不通过则提交失败。

---

## CI/CD

`.github/workflows/ci.yml` 包含 5 个并行 job：

1. **lint** — `oxlint src/`
2. **format** — `oxfmt src/ --check`
3. **test** — `vitest run`（单元测试）
4. **build** — `node scripts/build.mjs`

E2E 测试（`pnpm test:e2e`）仅本地运行，不纳入 CI（避免 Linux/macOS 兼容性和 Mole CLI 安装依赖）。

---

## 测试体系

### 四层测试架构

| 层级 | 工具 | 环境 | 覆盖范围 | 命令 |
|------|------|------|----------|------|
| L1 单元 | Vitest | jsdom (Node) | 纯函数、工具方法、主进程模块 | `pnpm test` |
| L2 组件 | Vitest | jsdom (Node) | Vue 组件渲染、状态变化、简单 DOM | `pnpm test` |
| L3 浏览器 | Vitest | Browser Mode | 复杂交互、CSS 动画、ECharts 渲染、真实事件 | `pnpm test:browser` |
| L4 E2E | Playwright | Electron | 跨视图导航、真实 IPC、窗口行为 | `pnpm test:e2e` |

### 测试目录

所有测试统一在 `tests/` 根目录下，`src/` 下不再保留 `__tests__`：
- `tests/main/`、`tests/preload/`、`tests/renderer/`、`tests/integration/` — jsdom 单元测试
- `tests/browser/` — Browser Mode 测试（`.browser.spec.js`）
- `tests/e2e/tests/` — Playwright E2E 测试

### E2E Mock 策略

E2E 测试通过 `REVEL_E2E=1` 环境变量启动，主进程加载 `src/main/__mocks__/ipc-handlers.js` 覆盖所有真实 IPC handler 为 mock 实现，返回预设 fixture 数据。不依赖真实 Mole CLI 或 macOS 系统命令。

### 路径 Alias

测试文件使用 Vite resolve alias 导入源码：
- `@/` → `src/renderer/src/`
- `@renderer/` → `src/renderer/`
- `@main/` → `src/main/`
- `@preload/` → `src/preload/`

## 常见陷阱

1. **Vue 组件使用 `<script setup>` 风格**，非 Options API
2. **UI 是纯 CSS 类系统**（`.btn`、`.card`），不是 Fluent UI Web Components（`@fluentui/web-components` 在 package.json 中但未实际使用）
3. **Vite 8 使用 Rolldown 替代 esbuild + Rollup**，构建速度提升 10-30 倍
4. **Electron 42 使用 Node 24**，Vite 配置中的 `target` 应为 `'node24'`
5. **开发模式使用 `scripts/dev.mjs`** 启动，不是 `electron-vite dev`
6. **生产构建输出到 `dist/`**，不是 `out/`

---

## 文件入口

- **主进程**：`src/main/main.js` → 构建到 `dist/main/main.js`
- **预加载**：`src/preload/preload.js` → 构建到 `dist/preload/preload.js`
- **渲染进程**：`src/renderer/index.html` → 构建到 `dist/renderer/`
- **Vue 入口**：`src/renderer/main.js`（createApp + 主题引擎初始化）

---

## 联系方式

- 维护者：a1121611810
