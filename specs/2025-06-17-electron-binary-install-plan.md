# Electron Binary 安装修复实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 `pnpm build:mac` 卡死问题——启用 electron postinstall 安装 binary，同时 CI 用 `--ignore-scripts` 跳过不必要的下载

**Architecture:** 改 2 个配置文件：pnpm-workspace.yaml 放行 electron 构建（electron: true），ci.yml 在不需要 binary 的 job 上加 --ignore-scripts。release.yml 不动，electron binary 在 install 阶段自动安装。

**Tech Stack:** pnpm 11.5.0, Electron 42.3.0, Electron Forge 7.11.2

## Global Constraints

- pnpm-workspace.yaml 的 allowBuilds 格式不变，仅改 electron 的值
- ci.yml 使用 --frozen-lockfile 不变，仅补 --ignore-scripts
- 不改动 release.yml、.npmrc、package.json、forge.config.js
- 不改任何 JavaScript/Vue 源码

---

### Task 1: 修改 pnpm-workspace.yaml

**Files:**
- Modify: `pnpm-workspace.yaml` (第 4 行)

- [ ] **Step 1: 修改 electron 的 allowBuilds 值**

将 `electron: false` 改为 `electron: true`：

```diff
 allowBuilds:
   canvas: true
-  electron: false
+  electron: true
   fs-xattr: false
   macos-alias: false
   simple-git-hooks: true
```

- [ ] **Step 2: 验证修改**

查看修改后的文件确认语法正确：

```bash
cd /Users/lilianda/develop/revel
grep -A 6 "allowBuilds:" pnpm-workspace.yaml
```

预期输出应包含 `electron: true`，YAML 缩进一致。

- [ ] **Step 3: 测试 pnpm install 执行 electron postinstall**

```bash
cd /Users/lilianda/develop/revel
pnpm install
```

预期行为：
1. pnpm 执行 electron 包的 postinstall（`node_modules/electron/install.js`）
2. install.js 检查 `isInstalled()` → false
3. 从 `~/Library/Caches/electron/electron-v42.3.0-darwin-arm64.zip` 解压到 `node_modules/electron/dist/`
4. 创建 `node_modules/electron/path.txt`

验证 binary 已安装：

```bash
ls -la node_modules/electron/dist/Electron.app/Contents/MacOS/Electron
# 应显示文件存在（约 334MB 的二进制文件）
cat node_modules/electron/path.txt
# 应输出: Electron.app/Contents/MacOS/Electron
```

- [ ] **Step 4: 确认 pnpm build 仍然正常**

```bash
cd /Users/lilianda/develop/revel
pnpm build
```

预期：~2秒内完成，输出 "全部构建完成！"

- [ ] **Step 5: 确认 pnpm build:mac 不再卡死**

```bash
cd /Users/lilianda/develop/revel
timeout 120 pnpm build:mac
```

预期：不再卡在 "Downloading Electron binary..."，能正常进入 forge 打包流程。
注：完整 make 过程可能仍需数分钟（下载+解压+打包），但不应无限挂起。

- [ ] **Step 6: 提交**

```bash
git add pnpm-workspace.yaml
git commit -m "fix: 启用 electron postinstall，修复 pnpm build:mac 卡死问题"
```

---

### Task 2: CI 加 --ignore-scripts

**Files:**
- Modify: `.github/workflows/ci.yml` (第 43、57、71、91 行附近)

- [ ] **Step 1: 在 lint job 的 pnpm install 加 --ignore-scripts**

```diff
       - run: pnpm install --frozen-lockfile
+      - run: pnpm install --frozen-lockfile --ignore-scripts
```

- [ ] **Step 2: 在 format job 的 pnpm install 加 --ignore-scripts**

```diff
       - run: pnpm install --frozen-lockfile
+      - run: pnpm install --frozen-lockfile --ignore-scripts
```

- [ ] **Step 3: 在 test job 的 pnpm install 加 --ignore-scripts**

```diff
       - run: pnpm install --frozen-lockfile
+      - run: pnpm install --frozen-lockfile --ignore-scripts
```

- [ ] **Step 4: 在 build job 的 pnpm install 加 --ignore-scripts**

```diff
       - run: pnpm install --frozen-lockfile
+      - run: pnpm install --frozen-lockfile --ignore-scripts
```

- [ ] **Step 5: 验证 ci.yml 语法**

```bash
cd /Users/lilianda/develop/revel
# 检查 YAML 格式（更推荐用 python 解析验证）
python3 -c "import yaml; data=yaml.safe_load(open('.github/workflows/ci.yml')); print('YAML valid'); jobs=list(data['jobs'].keys()); print('Jobs:', jobs); [print(f'  {j}: steps={len(data[\"jobs\"][j][\"steps\"])}') for j in jobs]"
```

预期输出：YAML valid，4 个 job 信息正常，每个包含 install 步骤。

- [ ] **Step 6: 提交**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: 不需要 binary 的 job 使用 --ignore-scripts 跳过 electron 下载"
```

---

### Task 3: 最终验证 & 确认 release.yml 不受影响

**Files:**
- Verify: `.github/workflows/release.yml`
- Verify: `node_modules/electron/dist/`

- [ ] **Step 1: 确认 release.yml 无需改动**

```bash
cd /Users/lilianda/develop/revel
# release.yml 的 pnpm install 没有 --ignore-scripts → postinstall 正常执行
grep "pnpm install" .github/workflows/release.yml
```

预期输出只包含 `pnpm install --frozen-lockfile`（无 `--ignore-scripts`）。

- [ ] **Step 2: 确认 electron binary 在本地可正常工作**

```bash
cd /Users/lilianda/develop/revel
node -e "console.log(require('fs').existsSync('node_modules/electron/dist/Electron.app'))"
```

预期输出：`true`

```bash
node -e "console.log(require('electron'))"
```

预期输出：Electron.app 的完整路径，不卡死。

- [ ] **Step 3: 提交最终版本（如有累积未提交）**

```bash
git log --oneline -3
```
