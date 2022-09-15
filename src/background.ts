import { app, ipcMain } from "electron";
import { BrowserWindow } from "electron/main";
import process from "process";
import { createWindow } from "./createWindow";
import { SETTINGS_FILE } from "./helpers/constants";
import { MenuManager } from "./helpers/menuManager";
import { setSettingsFlushEnabled, settings } from "./helpers/settings";
import { Conversation, TrayManager } from "./helpers/trayManager";

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    console.log(SETTINGS_FILE());

    app.setAppUserModelId("pw.kmr.amd");

    const tray = new TrayManager();
    const menu = new MenuManager();
    const window = createWindow();

    tray.startIfEnabled();

    setupEventListeners(window, tray);
    setupIpc(window, tray);
  });
}

function setupIpc(window: BrowserWindow, tray: TrayManager) {
  ipcMain.removeAllListeners();

  ipcMain.on("should-hide-notification-content", (event) => {
    event.returnValue = settings.hideNotificationContentEnabled.value;
  });

  ipcMain.on("show-main-window", () => {
    window.show();
  });

  ipcMain.on("flash-main-window-if-not-focused", () => {
    if (!window.isFocused() && settings.taskbarFlashEnabled.value) {
      window.flashFrame(true);
    }
  });

  ipcMain.on("set-unread-status", (_, unreadStatus: boolean) => {
    tray.setUnread(unreadStatus);
  });

  ipcMain.on("set-recent-conversations", (_, data: Conversation[]) => {
    tray.setRecentConversations(data);
  });
}

function setupEventListeners(window: BrowserWindow, tray: TrayManager) {
  app.removeAllListeners();

  addSecondInstanceListener(window);
  addBeforeQuitListener(window);
  addActivateListener(tray);
  addAllWindowsClosedListener();
}

function addActivateListener(tray: TrayManager) {
  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      const window = createWindow();
      setupIpc(window, tray);
      setupEventListeners(window, tray);
    }
  });
}

function addAllWindowsClosedListener() {
  app.on("window-all-closed", function () {
    if (process.platform !== "darwin" && !settings.trayEnabled.value)
      app.quit();
  });
}

function addBeforeQuitListener(window: BrowserWindow) {
  app.on("before-quit", () => {
    setSettingsFlushEnabled(false);
    window.removeAllListeners();
  });
}

function addSecondInstanceListener(window: BrowserWindow) {
  app.on("second-instance", () => {
    if (window) {
      if (!window.isVisible()) {
        window.show();
      }
    }
  });
}
