#!/usr/bin/env node
/**
 * Revel 图标导出脚本
 *
 * 将 src/renderer/src/assets/icons/app-icon.svg 导出为 macOS ICNS
 * 同时导出 app-icon-dark.svg 为 PNG（供将来 Dark Appearance 使用）
 */
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Resvg } from "@resvg/resvg-js";
import { createICNS, NEAREST_NEIGHBOR } from "png2icons";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const iconsDir = path.resolve(root, "src/renderer/src/assets/icons");
const buildDir = path.resolve(root, "build");
const ICON_SIZE = 1024;

async function exportSvgToPng(svgPath, outputPath, size = ICON_SIZE) {
  if (!existsSync(svgPath)) {
    throw new Error(`[export-icons] SVG file not found: ${svgPath}`);
  }
  const svgContent = await readFile(svgPath, "utf-8");
  const resvg = new Resvg(svgContent, {
    fitTo: { mode: "width", value: size },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  await writeFile(outputPath, pngBuffer);
  return pngBuffer;
}

async function main() {
  console.log("[export-icons] 开始导出应用图标...");

  await mkdir(buildDir, { recursive: true });

  // Export Default icon (1024x1024 for production)
  const defaultSvg = path.resolve(iconsDir, "app-icon.svg");
  const defaultPngPath = path.resolve(buildDir, "icon.png");
  const defaultPngBuffer = await exportSvgToPng(defaultSvg, defaultPngPath, ICON_SIZE);
  console.log(`[export-icons] 已生成 ${defaultPngPath}`);

  // Export multi-resolution PNGs for dev mode Dock icon
  const png64Path = path.resolve(buildDir, "icon_64.png");
  const png64Buffer = await exportSvgToPng(defaultSvg, png64Path, 64);
  console.log(`[export-icons] 已生成 ${png64Path}`);

  const png128Path = path.resolve(buildDir, "icon_128.png");
  const png128Buffer = await exportSvgToPng(defaultSvg, png128Path, 128);
  console.log(`[export-icons] 已生成 ${png128Path}`);

  // Export Dark variant as PNG (for future use with Xcode Icon Composer)
  const darkSvg = path.resolve(iconsDir, "app-icon-dark.svg");
  const darkPngPath = path.resolve(buildDir, "icon-dark.png");
  await exportSvgToPng(darkSvg, darkPngPath, ICON_SIZE);
  console.log(`[export-icons] 已生成 ${darkPngPath}`);

  // Convert Default to ICNS (png2icons handles all required sizes internally)
  const icnsBuffer = createICNS(defaultPngBuffer, NEAREST_NEIGHBOR);
  if (!icnsBuffer) {
    throw new Error("[export-icons] ICNS generation failed");
  }
  const icnsPath = path.resolve(buildDir, "icon.icns");
  await writeFile(icnsPath, icnsBuffer);
  console.log(`[export-icons] 已生成 ${icnsPath}`);

  console.log("[export-icons] 导出完成");
}

main().catch((err) => {
  console.error("[export-icons] 导出失败:", err);
  process.exit(1);
});
