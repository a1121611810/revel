# Electron Binary 安装修复实施计划（修订版）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 `pnpm build:mac` 卡死问题——electron binary 自动安装 + 国内 mirror 加速

**Architecture:** 改 4 个配置/脚本文件。postinstall 脚本自动检测并安装 electron binary，.npmrc 配置国内 mirror（npmmirror），CI 用 --ignore-scripts 跳过不必要的下载。

**Tech Stack:** pnpm 11.5.0, Electron 42.3.0, Electron Forge 7.11.2

## Global Constraints

- `allowBuilds.electron: true` 保持（虽因 electron 无 lifecycle scripts 而无效，但作为善意默认）
- CI 使用 `--ignore-scripts` 跳过 postinstall
- `.npmrc` 的 `electron_mirror` 指向 `https://npmmirror.com/mirrors/electron/`
- `release.yml` 不改动（GitHub Actions 可直接从 GitHub Release 下载）
- 不改任何 JavaScript/Vue 源码

---

### Task 1: 修改 pnpm-workspace.yaml ✅ 已完成

**Commit:** `e60f268`

### Task 2: 创建 postinstall 脚本 + mirror 配置

**Files:**
- Create: `scripts/electron-postinstall.mjs`
- Modify: `package.json` (第 23 行)
- Modify: `.npmrc` (末尾)

- [ ] **Step 1: 创建 electron-postinstall.mjs**

```bash
cat > scripts/electron-postinstall.mjs << 'ENDSCRIPT'
#!/usr/bin/env node
import { spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const electronDir = join(root, "node_modules", "electron");
const distVersionFile = join(electronDir, "dist", "version");
const pathFile = join(electronDir, "path.txt");
const installScript = join(electronDir, "install.js");

function isElectronInstalled() {
  try {
    if (!existsSync(distVersionFile)) return false;
    if (!existsSync(pathFile)) return false;
    const platformPath = readFileSync(pathFile, "utf-8").trim();
    const binaryPath = join(electronDir, "dist", platformPath);
    return existsSync(binaryPath);
  } catch {
    return false;
  }
}

async function main() {
  if (!existsSync(installScript)) {
    return;
  }
  if (isElectronInstalled()) {
    console.log("[electron-postinstall] Electron binary 已安装，跳过");
    return;
  }
  console.log("[electron-postinstall] 正在安装 Electron binary...");
  const result = spawnSync(process.execPath, [installScript], {
    cwd: root,
    stdio: "inherit",
    timeout: 5 * 60 * 1000,
  });
  if (result.status === 0) {
    console.log("[electron-postinstall] Electron binary 安装完成");
  } else if (result.signal === "SIGTERM") {
    console.warn("[electron-postinstall] 安装超时，请手动运行: node " + installScript);
  } else {
    console.warn("[electron-postinstall] 安装失败 (exit: " + result.status + ")，可稍后手动安装");
  }
}
main().catch((err) => {
  console.warn("[electron-postinstall] 出错:", err.message);
});
ENDSCRIPT
```

验证文件存在：
```bash
ls -la scripts/electron-postinstall.mjs
```

- [ ] **Step 2: 修改 package.json 的 postinstall**

```diff
-    "postinstall": "simple-git-hooks",
+    "postinstall": "simple-git-hooks && node scripts/electron-postinstall.mjs",
```

验证：
```bash
grep "postinstall" package.json
# 应输出: "postinstall": "simple-git-hooks && node scripts/electron-postinstall.mjs",
```

- [ ] **Step 3: 修改 .npmrc 添加 electron_mirror**

```diff
 blockExoticSubdeps=false
+electron_mirror=https://npmmirror.com/mirrors/electron/
```

验证：
```bash
tail -1 .npmrc
# 应输出: electron_mirror=https://npmmirror.com/mirrors/electron/
```

- [ ] **Step 4: 测试 postinstall 脚本**

```bash
cd /Users/lilianda/develop/revel
node scripts/electron-postinstall.mjs
```

预期输出：`[electron-postinstall] Electron binary 已安装，跳过`
（因为 Task 1 已手动安装了 binary）

- [ ] **Step 5: 提交**

```bash
git add scripts/electron-postinstall.mjs package.json .npmrc
git commit -m "feat: 添加 postinstall 脚本自动安装 electron binary + 国内 mirror"
```

---

### Task 3: CI 加 --ignore-scripts

**Files:**
- Modify: `.github/workflows/ci.yml` (4 处)

- [ ] **Step 1-4: 在 lint/format/test/build 四个 job 的 `pnpm install` 加 `--ignore-scripts`**

```diff
-      - run: pnpm install --frozen-lockfile
+      - run: pnpm install --frozen-lockfile --ignore-scripts
```

- [ ] **Step 5: 验证 ci.yml 语法**

```bash
cd /Users/lilianda/develop/revel
python3 -c "import yaml; data=yaml.safe_load(open('.github/workflows/ci.yml')); print('YAML valid'); [print(j, len(data['jobs'][j]['steps']), 'steps') for j in data['jobs']]"
```

- [ ] **Step 6: 提交**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: 不需要 binary 的 job 使用 --ignore-scripts 跳过 electron 下载"
```

---

### Task 4: 最终验证

- [ ] **Step 1: 确认 release.yml 不改动——在 GitHub Actions 中直接从 GitHub Release 下载最快**

```bash
grep "ELECTRON_MIRROR" .github/workflows/release.yml
# 应输出 mirror 配置指向 GitHub
```

- [ ] **Step 2: 运行 pnpm install 确认 postinstall 链正常**

```bash
cd /Users/lilianda/develop/revel
pnpm install
```

预期：先运行 `simple-git-hooks`，再运行 `electron-postinstall` 并输出 "已安装，跳过"

- [ ] **Step 3: 确认 pnpm build 正常**

```bash
pnpm build
```
预期：~1.5 秒，输出 "全部构建完成！"

- [ ] **Step 4: 确认 electron binary 可用**

```bash
node -e "console.log(require('electron'))"
```
预期：输出 electron binary 完整路径，不卡顿

- [ ] **Step 5: 提交最终版本**

```bash
git log --oneline -5
```
