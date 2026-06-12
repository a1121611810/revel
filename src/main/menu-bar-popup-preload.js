const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("popupAPI", {
  /**
   * Listen for menu-bar-status updates from the main process.
   * @param {(stats: object) => void} callback
   * @returns {() => void} cleanup function to remove the listener
   */
  onMenuBarStatus: (callback) => {
    const handler = (_event, stats) => callback(stats);
    ipcRenderer.on("menu-bar-status", handler);
    // Return a cleanup function
    return () => {
      ipcRenderer.removeListener("menu-bar-status", handler);
    };
  },

  /**
   * Listen for menu-bar-config updates (theme + user preferences).
   * @param {(config: object) => void} callback
   * @returns {() => void} cleanup function
   */
  onMenuBarConfig: (callback) => {
    const handler = (_event, config) => callback(config);
    ipcRenderer.on("menu-bar-config", handler);
    return () => {
      ipcRenderer.removeListener("menu-bar-config", handler);
    };
  },
});
