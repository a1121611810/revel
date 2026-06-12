// E2E 测试预设数据
// 所有 fixture 数据已内联，避免构建时路径解析问题

// ── installer fixture ──
const INSTALLER_RAW_OUTPUT = `
[DEBUG] Found installer:   * /Users/test/Downloads/test.dmg
[DEBUG] Found installer:   * /Users/test/Downloads/other.pkg
`;

// ── clean fixture ──
const CLEAN_RAW_OUTPUT = `
➤ User essentials
  → User app cache 94 items, 3.80GB dry
  → User app logs 11 items, 243KB dry
  ✓ Trash · already empty

➤ App caches
  → Wallpaper agent cache, 428.7MB dry
  → Media analysis cache 4 items, 456.4MB dry
  ◎ Microsoft Edge running · old versions cleanup skipped

➤ Browsers
  → GoogleUpdater CRX cache, 1KB dry

➤ Cloud & Office
  ✓ Nothing to clean
`;

// ── purge fixture ──
const PURGE_RAW_OUTPUT = `
Scanning for projects...
[DEBUG] [DRY RUN] Would remove:   * /project/node_modules, 1.5GB, 37 days old
[DEBUG] [DRY RUN] Would remove:   * /project/target, 500MB, 12 days old
`;

// ── uninstall fixture ──
const UNINSTALL_RAW_OUTPUT = JSON.stringify([
  {
    name: "Test App",
    bundle_id: "com.test",
    source: "App",
    path: "/Applications/Test.app",
    size: "100MB",
  },
  {
    name: "Another App",
    bundle_id: "com.another",
    source: "Homebrew",
    path: "/opt/homebrew/Another.app",
    size: "250MB",
  },
]);

// ── analyze fixture ──
const ANALYZE_RAW_OUTPUT = JSON.stringify({
  total_size: 23622320128,
  entries: [
    {
      name: "Applications",
      path: "/Applications",
      size: 10737418240,
      is_dir: true,
      insight: true,
    },
    {
      name: "User Library",
      path: "/Users/test/Library",
      size: 8589934592,
      is_dir: true,
    },
    {
      name: "Downloads",
      path: "/Users/test/Downloads",
      size: 4294967296,
      is_dir: true,
    },
  ],
});

const MOLE_STATUS = {
  hardware: { cpu_model: "Apple M4", os_version: "15.1" },
  cpu: { usage: 15.2, core_count: 10, per_core: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  memory: { used: 17179869184, total: 34359738368, used_percent: 50 },
  disks: [{ used: 377487360000, total: 494384795648, used_percent: 76 }],
  batteries: [{ percent: 85, status: "discharging", time_left: "8:30" }],
  network: [{ rx_rate_mbs: 2.5, tx_rate_mbs: 0.8 }],
  gpu: [{ name: "Apple M4", usage: 10, memory_used: 2147483648, memory_total: 8589934592 }],
  uptime_seconds: 7200,
  uptime: "2:00:00",
  health_score: 90,
  health_score_msg: "Excellent",
};

function moleExec(_cmd, args) {
  const argStr = Array.isArray(args) ? args.join(" ") : "";
  if (argStr.includes("--version")) {
    return { stdout: "1.0.0", stderr: "", code: 0, success: true };
  }
  if (argStr.includes("status")) {
    return { stdout: JSON.stringify(MOLE_STATUS), stderr: "", code: 0, success: true };
  }
  if (argStr.includes("clean") && argStr.includes("--dry-run")) {
    return { stdout: CLEAN_RAW_OUTPUT, stderr: "", code: 0, success: true };
  }
  if (argStr.includes("analyze")) {
    return { stdout: ANALYZE_RAW_OUTPUT, stderr: "", code: 0, success: true };
  }
  if (argStr.includes("uninstall") && argStr.includes("--list")) {
    return { stdout: UNINSTALL_RAW_OUTPUT, stderr: "", code: 0, success: true };
  }
  if (argStr.includes("purge") && argStr.includes("--dry-run")) {
    return { stdout: PURGE_RAW_OUTPUT, stderr: "", code: 0, success: true };
  }
  if (argStr.includes("installer") && argStr.includes("--dry-run")) {
    return { stdout: INSTALLER_RAW_OUTPUT, stderr: "", code: 0, success: true };
  }
  return { stdout: "", stderr: "", code: 0, success: true };
}

module.exports = {
  status: MOLE_STATUS,
  moleExec,
};
