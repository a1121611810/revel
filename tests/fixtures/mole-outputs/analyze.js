// Shared fixture: mo analyze -json

const RAW_OUTPUT = JSON.stringify({
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

const EXPECTED = {
  diskData: [
    { name: "User Library", size: "8.00 GB", bytes: 8589934592, color: "#0f6cbd" },
    { name: "Downloads", size: "4.00 GB", bytes: 4294967296, color: "#2889e0" },
  ],
  topDirectories: [
    { name: "User Library", path: "/Users/test/Library", size: "8.00 GB", bytes: 8589934592, percentage: 100, color: "#0f6cbd" },
    { name: "Downloads", path: "/Users/test/Downloads", size: "4.00 GB", bytes: 4294967296, percentage: 50, color: "#2889e0" },
  ],
  totalSize: 23622320128,
};

module.exports = { RAW_OUTPUT, EXPECTED };
