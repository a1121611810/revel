// Shared fixture: mo purge --dry-run --debug

const RAW_OUTPUT = `
Scanning for projects...
[DEBUG] [DRY RUN] Would remove:   * /project/node_modules, 1.5GB, 37 days old
[DEBUG] [DRY RUN] Would remove:   * /project/target, 500MB, 12 days old
`;

const EXPECTED = [
  {
    id: 1,
    name: "node_modules",
    size: "1.5 GB",
    type: "node",
    path: "/project/node_modules",
    checked: false,
  },
  {
    id: 2,
    name: "target",
    size: "500 MB",
    type: "rust",
    path: "/project/target",
    checked: false,
  },
];

module.exports = { RAW_OUTPUT, EXPECTED };
