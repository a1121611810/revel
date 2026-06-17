# Electron 二进制安装方案设计（修订版）

## 问题

`pnpm build:mac`（即 `electron-forge make --platform=darwin`）执行后卡住不动。

## 根因（双因素）

### 因素一：二进制未解压到 dist/

`node_modules/electron/dist/Electron.app` 不存在。`require('electron')` 时会触发 `index.js` 中的 `downloadElectron()` → 调用 `install.js` 下载并解压。

**关键发现**：Electron 42.3.0 的 `package.json` 中**没有任何 lifecycle scripts**（`scripts: {}` 为空），所以 `pnpm-workspace.yaml` 的 `allowBuilds` 设置对 electron 包无效。没有 postinstall 脚本可执行，二进制需要手动或通过 `require('electron')` 才能触发安装。

### 因素二：GitHub Releases 在中国网络不可达

即使触发了安装流程，`@electron/get` 默认从 `github.com/electron/electron/releases/download/` 下载 118MB 的 zip，在中国网络环境下会超时/挂起。

## 目标

- **本地开发**：`pnpm build:mac` 能正常运行，不卡住
- **CI（ci.yml）**：lint/format/test/build 等无需 Electron binary 的 job 不浪费时间和流量下载它
- **Release（release.yml）**：`electron-forge make` 能正常获取 Electron binary 完成打包
- 改动最小，不引入无关变更

## 方案：postinstall 脚本 + 国内 mirror + CI `--ignore-scripts`

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

**作用**：虽然 electron 没有 lifecycle scripts，但保持 `electron: true` 作为善意默认（后续版本可能加回 postinstall），且避免与其他配置冲突。

#### 2. `scripts/electron-postinstall.mjs`（新文件）

在 `pnpm install` 后自动检查并安装 electron binary：

```javascript
// 核心逻辑：
// 1. 检查 node_modules/electron/dist/version 和 path.txt 是否存在
// 2. 如果不存在，运行 node node_modules/electron/install.js
// 3. 失败时不阻断安装流程（非致命错误）
```

#### 3. `package.json`

```diff
- "postinstall": "simple-git-hooks",
+ "postinstall": "simple-git-hooks && node scripts/electron-postinstall.mjs",
```

#### 4. `.npmrc`

```diff
 blockExoticSubdeps=false
+electron_mirror=https://npmmirror.com/mirrors/electron/
```

**作用**：让 `@electron/get` 从 npmmirror.com 下载 electron 二进制，替代默认的 GitHub Releases。npmmirror 在中国境内有 CDN 加速。

#### 5. `.github/workflows/ci.yml`

在 `lint`、`format`、`test`、`build` 四个 job 的 `pnpm install` 命令后加上 `--ignore-scripts`：

```diff
-      - run: pnpm install --frozen-lockfile
+      - run: pnpm install --frozen-lockfile --ignore-scripts
```

**作用**：跳过所有 postinstall 脚本（包括 electron-postinstall、simple-git-hooks 等）。CI 不需要 git hooks，不需要 Electron binary。

### 不改动的文件

| 文件 | 原因 |
|------|------|
| `.github/workflows/release.yml` | GitHub Actions 下载 GitHub Release 很快，不需要改 mirror |
| `forge.config.js` | 不变 |

### 各环境行为矩阵

| 环境 | `pnpm install` 命令 | postinstall 执行？ | electron binary 状态 | mirror 来源 |
|------|-------------------|-------------------|---------------------|-----------|
| **本地开发** | `pnpm install` | ✅ 执行（先 simple-git-hooks，再 electron-postinstall） | ✅ 自动安装到 `dist/` | `.npmrc` 的 npmmirror |
| **CI lint/format/test/build** | `pnpm install --frozen-lockfile --ignore-scripts` | ❌ 全部跳过 | ❌ 不安装（不需要） | 不适用 |
| **CI release** | `pnpm install --frozen-lockfile` | ✅ 执行 | ✅ 自动安装到 `dist/` | 环境变量 `ELECTRON_MIRROR`（GitHub） |

### 技术原理

```
pnpm install
  └─ postinstall（package.json）
       ├─ simple-git-hooks          → 配置 git hooks
       └─ node scripts/electron-postinstall.mjs
            └─ isElectronInstalled() → dist/version + path.txt 存在？
                 ├─ 是 → 跳过
                 └─ 否 → node install.js
                       └─ @electron/get (via ELECTRON_MIRROR=...)
                            ├─ npmmirror.com（本地，来自 .npmrc）
                            └─ github.com（Actions，来自 env）
```

`node_modules/electron/index.js` 的 `getElectronPath()` 在二进制安装后能正常返回路径，不再触发下载。

### 副作用分析

| 副作用 | 说明 | 影响 |
|--------|------|------|
| 本地首次安装耗时增加 | 解压 118MB zip 需 10-30 秒 | 一次性开销 |
| postinstall 失败不阻断 | electron-postinstall 捕获所有错误，不影响 `pnpm install` 状态 | 正确 |
| CI 跳过 git hooks | `--ignore-scripts` 跳过所有脚本 | 无影响，CI 不提交 |
| CI cache 不缓存 binary | `setup-node` 只缓存 pnpm store | 无影响，CI 用 `--ignore-scripts` 不涉及 binary |

## 回退策略

若修改后出现问题：

1. `pnpm-workspace.yaml`：`electron: true` → `false`
2. `package.json`：移除 `&& node scripts/electron-postinstall.mjs`
3. `.npmrc`：移除 `electron_mirror` 行
4. `ci.yml`：移除 `--ignore-scripts`
5. 删除 `scripts/electron-postinstall.mjs`
