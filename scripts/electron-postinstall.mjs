#!/usr/bin/env node
/**
 * Electron Binary 自动安装脚本
 *
 * 在 pnpm install 之后运行，检查 electron 二进制是否已安装。
 * 如果未安装，自动从 mirror 下载并解压到 node_modules/electron/dist/。
 *
 * electron 42.3.0 的 package.json 中没有 lifecycle scripts，
 * 所以 allowBuilds 无法触发 install.js。此脚本作为 postinstall hook
 * 来弥补这个缺口。
 */
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
const npmrcPath = join(root, ".npmrc");

/**
 * 从 .npmrc 读取 electron mirror，如果没有则使用国内默认源
 */
function getElectronMirror() {
  // 优先读取 .npmrc 中的配置
  try {
    const npmrc = readFileSync(npmrcPath, "utf-8");
    const match = npmrc.match(/^electron_mirror\s*=\s*(.+)$/m);
    if (match) return match[1].trim();
  } catch {}
  // 兜底：国内镜像源
  return "https://npmmirror.com/mirrors/electron/";
}

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
  // 只处理 electron 包已安装的情况
  if (!existsSync(installScript)) {
    // 开发模式下可能没有 node_modules，跳过
    return;
  }

  if (isElectronInstalled()) {
    console.log("[electron-postinstall] Electron binary 已安装，跳过");
    return;
  }

  console.log("[electron-postinstall] 正在安装 Electron binary...");
  const mirror = getElectronMirror();
  console.log(`[electron-postinstall] 使用 mirror: ${mirror}`);

  const result = spawnSync(process.execPath, [installScript], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      ELECTRON_MIRROR: mirror,
    },
    timeout: 5 * 60 * 1000, // 5 分钟超时
  });

  if (result.status === 0) {
    console.log("[electron-postinstall] Electron binary 安装完成");
  } else if (result.signal === "SIGTERM") {
    console.warn("[electron-postinstall] 安装超时，请手动运行:");
    console.warn(`  node ${installScript}`);
  } else {
    console.warn(
      `[electron-postinstall] 安装失败（exit code: ${result.status})`,
    );
    console.warn("这不是致命错误，可以稍后手动安装:");
    console.warn(`  node ${installScript}`);
  }
}

main().catch((err) => {
  console.warn("[electron-postinstall] 出错:", err.message);
  console.warn("Electron binary 安装跳过，这不是致命错误");
});
