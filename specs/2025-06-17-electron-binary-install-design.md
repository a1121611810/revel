# Electron 二进制安装方案设计

## 问题

`pnpm build:mac`（即 `electron-forge make --platform=darwin`）执行后卡住不动，原因是 Electron 二进制文件未安装到 `node_modules/electron/dist/`，导致 `require('electron')` 触发 `install.js` 的下载/解压流程并挂起。

## 根因

`pnpm-workspace.yaml` 中 `allowBuilds.electron: false` 阻止了 electron 包的 `postinstall` 脚本（`install.js`）运行。该脚本负责从 zip 中解压 Electron.app 到 `node_modules/electron/dist/` 并创建 `path.txt`。

另一个配置文件 `.npmrc` 设了 `onlyBuiltDependencies=["electron",...]`（允许 electron 构建），但与 `pnpm-workspace.yaml` 的 `electron: false` 冲突，后者优先级更高。

## 目标

- **本地开发**：`pnpm build:mac` 能正常运行，不卡住
- **CI（ci.yml）**：lint/format/test/build 等无需 Electron binary 的 job 不浪费时间和流量下载它
- **Release（release.yml）**：`electron-forge make` 能正常获取 Electron binary 完成打包
- 改动最小，不引入无关变更

## 方案：`electron: true` + CI 用 `--ignore-scripts`

### 改动文件

#### 1. `pnpm-workspace.yaml`

```diff
 allowBuilds:
   canvas: true
-  electron: false
+  electron: true
   fs-xattr: false
   macos-alias: false
   simple-git-hooks: true
```

**作用**：允许 electron 包的 postinstall 脚本运行。`pnpm install` 时会执行 `node_modules/electron/install.js`，从缓存或网络获取 zip 并解压到 `dist/` 目录。

#### 2. `.github/workflows/ci.yml`

在 `lint`、`format`、`test`、`build` 四个 job 的 `pnpm install` 命令后加上 `--ignore-scripts`：

```diff
-      - run: pnpm install --frozen-lockfile
+      - run: pnpm install --frozen-lockfile --ignore-scripts
```

**作用**：跳过所有 postinstall 脚本（包括 electron、simple-git-hooks 等）。CI 不执行 git commit，不需要 git hooks；CI 只跑 lint/format/test/build（Vite 构建），不需要 Electron binary。

### 不改动的文件

| 文件 | 原因 |
|------|------|
| `.github/workflows/release.yml` | Release 需要 Electron binary，照常 `pnpm install --frozen-lockfile`，postinstall 会执行 |
| `.npmrc` | 配置无误，`onlyBuiltDependencies` 与 workspace 不冲突 |
| `package.json` | 无变更必要 |
| `forge.config.js` | 不变 |

### 各环境行为矩阵

| 环境 | `pnpm install` 命令 | electron postinstall 执行？ | electron binary 状态 | 关键命令 |
|------|-------------------|---------------------------|---------------------|---------|
| **本地开发** | `pnpm install` | ✅ 执行 | ✅ 安装到 `dist/` | `pnpm build:mac` 正常 |
| **CI lint/format/test/build** | `pnpm install --frozen-lockfile --ignore-scripts` | ❌ 跳过 | ❌ 不安装（不需要） | `pnpm lint/test/build`（Vite 构建）正常工作 |
| **CI release** | `pnpm install --frozen-lockfile` | ✅ 执行 | ✅ 安装到 `dist/` | `electron-forge make` 正常 |

### 技术原理

`node_modules/electron/index.js` 在模块加载时执行 `getElectronPath()`：

```
getElectronPath()
  ├─ path.txt 存在？ → 读取 binary 路径，返回
  └─ path.txt 不存在？ → downloadElectron() → spawn install.js
       ├─ isInstalled() 检查 dist/version + path.txt
       ├─ downloadArtifact() → @electron/get 下载/使用缓存 zip
       └─ extractFile() → extract-zip 解压到 dist/
```

`electron-forge make` 的 `@electron/packager` 则使用 `@electron/get` 的 `downloadArtifact` 直接下载 zip 到缓存目录，不依赖 `require('electron')`。但本地开发中 `require('electron')` 被调用时会触发上述流程，binary 缺失时就会卡住。

### 自上次排查后的额外发现

`pnpm install` 在本地执行 `pnpm licenses list --json` 时报告了 SQLite 错误：

```
[ERR_SQLITE_ERROR] unable to open database file
```

该错误发生在 `scripts/generate-licenses.mjs` 中，已被其容错逻辑捕获（设 `process.exitCode = 0`），不影响主构建流程。这是独立的 pnpm store 问题，不在本方案范围内。

### 副作用分析

| 副作用 | 说明 | 影响 |
|--------|------|------|
| CI 跳过 git hooks 安装 | `simple-git-hooks` 的 postinstall 被 `--ignore-scripts` 跳过 | 无影响，CI 不提交代码 |
| CI 跳过 canvas 构建 | `canvas` 的构建脚本也被跳过 | 无影响，canvas 非实际依赖 |
| 本地首次安装耗时增加 | 解压 118MB zip 到 dist/ 需 10-30 秒 | 一次性开销，后续 update 只增量 |
| CI cache 不缓存 binary | `setup-node` 只缓存 pnpm store，不缓存 `node_modules/electron/dist/` | 无影响，CI 用 `--ignore-scripts` 不涉及 binary |

## 回退策略

若修改后出现问题，只需：

1. 将 `pnpm-workspace.yaml` 的 `electron: true` 改回 `false`
2. 将 `ci.yml` 的 `--ignore-scripts` 移除

即可完全恢复原状。
