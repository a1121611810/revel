# 更新日志

本文件遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式，并采用 [语义化版本控制](https://semver.org/lang/zh-CN/)。

## [3.0.3](https://github.com/a1121611810/revel/compare/v3.0.2...v3.0.3) (2026-06-16)


### ### Fixed

* 修正 ELECTRON_MIRROR URL，统一 workflow 级环境变量 ([10d4a25](https://github.com/a1121611810/revel/commit/10d4a25b8b26a2941539f2c7b9f3137f52cdab1f))

## [3.0.2](https://github.com/a1121611810/revel/compare/v3.0.1...v3.0.2) (2026-06-16)


### ### Fixed

* 添加 ELECTRON_MIRROR 和 CI=true 到所有构建步骤 ([6e4823f](https://github.com/a1121611810/revel/commit/6e4823fd3d8f6f4daef78cae161710b567567720))

## [3.0.1](https://github.com/a1121611810/revel/compare/v3.0.0...v3.0.1) (2026-06-16)


### ### Fixed

* 所有 CI 工作流添加 CI=true 环境变量，修复 pnpm 无 TTY 错误 ([a1b8ea7](https://github.com/a1121611810/revel/commit/a1b8ea72a15bd1333c7a3a2033b9ee7e4a405ab0))

## [3.0.0](https://github.com/a1121611810/revel/compare/v2.0.0...v3.0.0) (2026-06-16)


### ⚠ BREAKING CHANGES

* Build commands changed from electron-builder to Electron Forge.
    - Replace electron-builder with @electron-forge/cli, maker-dmg, maker-zip, plugin-fuses
    - Add forge.config.js for Electron Forge configuration
    - Update build:mac and build:win scripts to use electron-forge make
    - Remove electron-builder config block from package.json
    - Deprecate scripts/flip-fuses.mjs (now handled by @electron-forge/plugin-fuses)
    - Add node-linker=hoisted to .npmrc and pnpm-workspace.yaml
    - Add electron mirror config and update onlyBuiltDependencies
    - Add out/ to .gitignore
    - Update CI build command to pnpm build:mac
    - Remove echarts from dependencies
    - Update licenses.json and acknowledgments for new dependency tree

### ### Added

* **dock:** 添加 macOS Dock 图标显示隐藏策略及持久化 ([c0884b2](https://github.com/a1121611810/revel/commit/c0884b24621288326d08ac5f29767f2b5119e691))
* enhance auto-launch with show-window preference and main process hardening ([1dfd48f](https://github.com/a1121611810/revel/commit/1dfd48fbb8e71ebec30cbe093d86124013958de7))
* 侧边栏底部显示应用版本号 ([5d62e30](https://github.com/a1121611810/revel/commit/5d62e30ce5fd83a316502ee42531d72df1f44034))


### ### Fixed

* 使用 peter-evans/enable-pull-request-automerge 替代 gh CLI ([45e3b91](https://github.com/a1121611810/revel/commit/45e3b91a6d983e2c603aa1bad02159df2983985a))
* 修复 release tag 格式为 vX.Y.Z 并兼容旧格式 ([7f2f3d6](https://github.com/a1121611810/revel/commit/7f2f3d61764493c273b710758cf7ab2df49ab105))
* 添加 checkout 步骤并使用 fromJson 提取 PR 编号 ([c0dd92c](https://github.com/a1121611810/revel/commit/c0dd92cdcdaedbd6000f39a9243d6f774b4d9389))
* 添加 issues: write 权限到 release-please workflow ([85fc0b5](https://github.com/a1121611810/revel/commit/85fc0b5076cbd58e509bf0a61056edeb8bcc1894))
* 迁移 release-please-config.json 到 v4 manifest 格式 ([7a3d346](https://github.com/a1121611810/revel/commit/7a3d346e7cb2d166ac730f0d90f38561e371de65))


### ### Changed

* migrate from electron-builder to electron-forge ([ec21fb7](https://github.com/a1121611810/revel/commit/ec21fb701f64ae13a921764e84184059b247dfb9))

## [2.0.0](https://github.com/a1121611810/revel/compare/revel-v1.0.0...revel-v2.0.0) (2026-06-16)


### ⚠ BREAKING CHANGES

* Build commands changed from electron-builder to Electron Forge.
    - Replace electron-builder with @electron-forge/cli, maker-dmg, maker-zip, plugin-fuses
    - Add forge.config.js for Electron Forge configuration
    - Update build:mac and build:win scripts to use electron-forge make
    - Remove electron-builder config block from package.json
    - Deprecate scripts/flip-fuses.mjs (now handled by @electron-forge/plugin-fuses)
    - Add node-linker=hoisted to .npmrc and pnpm-workspace.yaml
    - Add electron mirror config and update onlyBuiltDependencies
    - Add out/ to .gitignore
    - Update CI build command to pnpm build:mac
    - Remove echarts from dependencies
    - Update licenses.json and acknowledgments for new dependency tree

### ### Added

* **dock:** 添加 macOS Dock 图标显示隐藏策略及持久化 ([c0884b2](https://github.com/a1121611810/revel/commit/c0884b24621288326d08ac5f29767f2b5119e691))
* enhance auto-launch with show-window preference and main process hardening ([1dfd48f](https://github.com/a1121611810/revel/commit/1dfd48fbb8e71ebec30cbe093d86124013958de7))
* 侧边栏底部显示应用版本号 ([5d62e30](https://github.com/a1121611810/revel/commit/5d62e30ce5fd83a316502ee42531d72df1f44034))


### ### Fixed

* 使用 peter-evans/enable-pull-request-automerge 替代 gh CLI ([45e3b91](https://github.com/a1121611810/revel/commit/45e3b91a6d983e2c603aa1bad02159df2983985a))
* 添加 checkout 步骤并使用 fromJson 提取 PR 编号 ([c0dd92c](https://github.com/a1121611810/revel/commit/c0dd92cdcdaedbd6000f39a9243d6f774b4d9389))
* 添加 issues: write 权限到 release-please workflow ([85fc0b5](https://github.com/a1121611810/revel/commit/85fc0b5076cbd58e509bf0a61056edeb8bcc1894))
* 迁移 release-please-config.json 到 v4 manifest 格式 ([7a3d346](https://github.com/a1121611810/revel/commit/7a3d346e7cb2d166ac730f0d90f38561e371de65))


### ### Changed

* migrate from electron-builder to electron-forge ([ec21fb7](https://github.com/a1121611810/revel/commit/ec21fb701f64ae13a921764e84184059b247dfb9))

## [Unreleased]

## [1.0.0] - 2025-05-30

### Added

- **系统清理模块** — 扫描并清理系统缓存、开发产物等临时文件，支持一键安全清理
- **磁盘分析模块** — 可视化展示磁盘空间使用情况，集成 ECharts 饼图分析各目录占用
- **系统状态模块** — 实时监控 CPU、内存、磁盘、电池和网络状态
- **应用卸载模块** — 彻底卸载 macOS 应用及其关联的配置文件和缓存
- **系统优化模块** — 执行系统优化任务，提升 macOS 运行效率
- **项目清理模块** — 扫描并清理开发项目中的构建产物（如 node_modules、build 目录等）
- **安装包管理模块** — 管理下载的安装包文件，支持查看和清理
- **Fluent Design 风格 UI** — 采用 Microsoft Fluent Design v2 设计语言，支持深色/浅色主题
- **亚克力视觉效果** — 窗口背景支持毛玻璃/亚克力效果
- **侧边栏导航** — 7 个功能模块通过侧边栏快速切换
- **实时命令输出** — 终端风格面板实时显示 Mole CLI 命令执行输出
- **权限自动提升** — 通过 osascript 自动请求管理员权限
- **全中文界面** — 所有 UI 元素和提示均为中文
- **响应式布局** — 适配不同窗口尺寸

### Changed

- 无

### Deprecated

- 无

### Removed

- 无

### Fixed

- 无

### Security

- 无

---

## 版本号说明

本项目采用 [语义化版本控制](https://semver.org/lang/zh-CN/)：

- **主版本号（MAJOR）**：不兼容的 API 修改
- **次版本号（MINOR）**：向下兼容的功能性新增
- **修订号（PATCH）**：向下兼容的问题修正

---

## 分类说明

| 分类 | 说明 |
|------|------|
| `Added` | 新功能 |
| `Changed` | 对现有功能的变更 |
| `Deprecated` | 即将移除的功能 |
| `Removed` | 已移除的功能 |
| `Fixed` | Bug 修复 |
| `Security` | 安全相关的修复 |
