#!/usr/bin/env node
/**
 * 生成第三方依赖许可证清单
 * 运行 `pnpm licenses list --json` 并扁平化为 licenses.json
 */

import { spawn } from "child_process";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "../src/renderer/src/data/licenses.json");

function runPnpmLicenses() {
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["licenses", "list", "--json"], {
      cwd: join(__dirname, ".."),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`pnpm licenses list exited with ${code}: ${stderr.trim()}`));
        return;
      }
      resolve(stdout.trim());
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}

function flattenLicenses(rawJson) {
  const byLicense = JSON.parse(rawJson);
  const result = [];

  for (const [licenseName, packages] of Object.entries(byLicense)) {
    for (const pkg of packages) {
      const author = pkg.author && pkg.author !== "unknown" ? pkg.author : "";
      result.push({
        name: pkg.name,
        version: pkg.versions?.[0] || "",
        license: licenseName,
        author,
      });
    }
  }

  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

async function main() {
  try {
    const rawJson = await runPnpmLicenses();
    const flattened = flattenLicenses(rawJson);

    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, JSON.stringify(flattened, null, 2) + "\n", "utf8");

    console.log(
      `[generate-licenses] Generated ${flattened.length} license entries → ${OUTPUT_PATH}`,
    );
  } catch (err) {
    console.error("[generate-licenses] Warning:", err.message);
    console.error("[generate-licenses] Using existing licenses.json if available.");
    process.exitCode = 0; // Don't fail the build
  }
}

export { main };

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
