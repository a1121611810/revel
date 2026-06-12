# Revel — 项目规格说明

## 项目概述
基于 Mole CLI 的自用 GUI 壳，采用 Microsoft Fluent Design 风格，Vue 3 + JavaScript + Electron 技术栈。

## 技术栈
- **Electron** ^42.0.0 — 桌面框架
- **Vue 3** ^3.4.0 — 前端框架（JavaScript，无 TypeScript）
- **Vite** ^8.0.0 — 构建工具（Rolldown 驱动，无 electron-vite 封装）
- **@vitejs/plugin-vue** ^6.0.7 — Vue SFC 编译
- **Vitest** ^4.0.0 — 测试框架

## 架构设计

### Electron 主进程 (src/main/main.js)
- 创建主窗口 (1200x800, min 900x600)
- 注册 IPC 处理程序：mole-exec, mole-exec-sync, get-platform
- 菜单栏集成
- 系统权限检查

### 预加载脚本 (src/preload/preload.js)
- 暴露 moleExec(command, args) 到渲染进程
- 暴露 moleExecSync(command, args) 到渲染进程
- 暴露 getPlatform() 到渲染进程

### Vue 3 前端 (src/renderer/)
- **App.vue**: 根布局（侧边栏 + 内容区）
- **SideBar.vue**: 导航菜单（7个命令入口）
- **useMole.js**: CLI 调用封装（IPC 通信）
- **7个视图组件**: 每个命令一个

## UI 设计
- Microsoft Fluent Design 风格
- 左侧侧边栏导航
- 主内容区显示各功能页面
- 深色/浅色主题支持
- 亚克力/毛玻璃效果

## 功能规格

### mo clean
- 扫描按钮 → 调用 `mo clean --dry-run`
- 分类显示可清理项（用户缓存、开发缓存、系统缓存等）
- 选择/取消选择各项
- 执行清理按钮 → 调用 `mo clean`
- 显示清理结果（释放空间）

### mo analyze
- 调用 `mo analyze --json` 获取数据
- 可视化展示（饼图/环形图）各目录空间占用
- 大文件列表
- 点击目录可下钻

### mo status
- 调用 `mo status --json` 获取数据
- 卡片式布局显示：CPU、GPU、内存、磁盘、电池、网络
- 实时刷新

### mo uninstall
- 调用 `mo list` 获取已安装应用列表
- 搜索/筛选功能
- 点击应用显示详情和关联文件
- 确认卸载

### mo optimize
- 显示可优化项列表
- 逐项执行优化
- 进度显示

### mo purge
- 扫描项目目录的构建产物
- 显示可清理的项目列表
- 选择性清理

### mo installer
- 扫描下载目录的安装包
- 显示安装包列表
- 选择性删除

## 数据流
```
用户操作 → Vue 组件 → useMole() → IPC → Electron 主进程 → child_process.spawn('mo', [...]) → Mole CLI → 系统
                                                           ↓
Vue 组件 ← 解析输出 ← IPC 返回 ← 逐行 stdout/stderr ← 子进程
```
