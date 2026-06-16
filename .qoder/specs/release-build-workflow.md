# Release 自动构建上传 Workflow

## Context

release-please 已自动创建 GitHub Release（tag + changelog），但 Release 页面没有 .dmg/.zip 安装包。需要新增一个 workflow，在 tag 创建后自动构建 macOS 安装包并上传到对应 Release。

## 实现方案

### Task 1: 新建 `.github/workflows/release.yml`

```yaml
name: Release Build

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  build-macos:
    strategy:
      matrix:
        include:
          - arch: x64
            runner: macos-13    # Intel runner
          - arch: arm64
            runner: macos-15    # Apple Silicon runner
    runs-on: ${{ matrix.runner }}
    timeout-minutes: 30

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 11.5.0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        env:
          ELECTRON_MIRROR: https://electronjs.org/headers/

      - name: Build macOS (${{ matrix.arch }})
        run: pnpm exec electron-forge make --platform=darwin --arch=${{ matrix.arch }}
        env:
          ELECTRON_MIRROR: https://electronjs.org/headers/

      - name: Upload to GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            out/maker-zip/darwin/*.zip
            out/maker-dmg/*.dmg
          fail_on_unmatched_files: true
          generate_release_notes: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Task 2: 在 README.md 中添加 Gatekeeper 放行说明

在安装说明部分添加提示：由于未签名，用户首次打开需执行：
```bash
sudo xattr -rd com.apple.quarantine /Applications/Revel.app
```

## 关键设计决策

| 决策 | 说明 |
|------|------|
| **双 runner 原生构建** | `macos-13`(x64) + `macos-15`(arm64)，避免交叉编译问题 |
| **ELECTRON_MIRROR 覆盖** | CI 环境使用官方源，不影响本地 `.npmrc` 的国内镜像 |
| **softprops/action-gh-release** | 自动找到 release-please 已创建的 Release，追加文件，不覆盖 changelog |
| **generate_release_notes: false** | 不干扰 release-please 生成的 changelog |

## 与 release-please 的协作流程

```
push to main
    ↓
release-please 创建/更新 Release PR
    ↓
merge Release PR → 创建 tag (v1.2.3) + GitHub Release
    ↓
tag push 触发 release.yml
    ↓
x64 + arm64 并行构建 → 上传 .dmg/.zip 到 Release
```

## 验证方式

1. 推送此变更后，手动创建测试 tag：`git tag v0.0.1-test && git push origin v0.0.1-test`
2. 在 GitHub Actions 页面确认 release.yml 是否被触发
3. 构建完成后检查 Release 页面是否出现 4 个文件（x64/arm64 各一个 .dmg + .zip）
4. 验证完成后删除测试 tag 和 Release
