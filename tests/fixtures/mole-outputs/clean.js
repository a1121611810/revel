// Shared fixture: mo clean --dry-run

const RAW_OUTPUT = `
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

const EXPECTED = [
  {
    name: "User essentials",
    size: "4.04 GB",
    sizeBytes: 4339273728,
    items: [
      { name: "User app cache", size: "3.80 GB", sizeBytes: 4079558656, checked: true },
      { name: "User app logs", size: "243 KB", sizeBytes: 248832, checked: true },
    ],
    checked: true,
  },
  {
    name: "App caches",
    size: "885.10 MB",
    sizeBytes: 928223232,
    items: [
      { name: "Wallpaper agent cache", size: "428.7 MB", sizeBytes: 449521459, checked: true },
      { name: "Media analysis cache", size: "456.4 MB", sizeBytes: 478578330, checked: true },
    ],
    checked: true,
  },
  {
    name: "Browsers",
    size: "1.00 KB",
    sizeBytes: 1024,
    items: [{ name: "GoogleUpdater CRX cache", size: "1 KB", sizeBytes: 1024, checked: true }],
    checked: true,
  },
  {
    name: "Cloud & Office",
    size: "0 B",
    sizeBytes: 0,
    items: [],
    checked: true,
  },
];

module.exports = { RAW_OUTPUT, EXPECTED };
