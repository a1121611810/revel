// Shared fixture: mo installer --dry-run --debug

// Full output with both debug lines and TUI lines
const RAW_OUTPUT = `
[DEBUG] Found installer:   * /Users/test/Downloads/test.dmg
[DEBUG] Found installer:   * /Users/test/Downloads/other.pkg
\x1B[2K➤ ○ test.dmg                    100MB | Downloads
\x1B[2K  ○ other.pkg                    50MB | Downloads
`;

const EXPECTED = [
  {
    id: 1,
    name: "test.dmg",
    ext: "dmg",
    path: "/Users/test/Downloads/test.dmg",
    size: "100 MB",
    date: "",
    checked: false,
  },
  {
    id: 2,
    name: "other.pkg",
    ext: "pkg",
    path: "/Users/test/Downloads/other.pkg",
    size: "50 MB",
    date: "",
    checked: false,
  },
];

// Debug-only output (no TUI lines) — matches real mole CLI behavior
const RAW_OUTPUT_DEBUG_ONLY = `
[DEBUG] Found installer:   * /Users/test/Downloads/test.dmg
[DEBUG] Found installer:   * /Users/test/Downloads/other.pkg
`;

const EXPECTED_DEBUG_ONLY = [
  {
    id: 1,
    name: "test.dmg",
    ext: "dmg",
    path: "/Users/test/Downloads/test.dmg",
    size: "",
    date: "",
    checked: false,
  },
  {
    id: 2,
    name: "other.pkg",
    ext: "pkg",
    path: "/Users/test/Downloads/other.pkg",
    size: "",
    date: "",
    checked: false,
  },
];

module.exports = { RAW_OUTPUT, EXPECTED, RAW_OUTPUT_DEBUG_ONLY, EXPECTED_DEBUG_ONLY };
