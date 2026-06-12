// Shared fixture: mo uninstall --list

const RAW_OUTPUT = JSON.stringify([
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

const EXPECTED = [
  {
    id: 1,
    name: "Test App",
    version: "com.test",
    path: "/Applications/Test.app",
    size: "100MB",
  },
  {
    id: 2,
    name: "Another App",
    version: "com.another",
    path: "/opt/homebrew/Another.app",
    size: "250MB",
  },
];

module.exports = { RAW_OUTPUT, EXPECTED };
