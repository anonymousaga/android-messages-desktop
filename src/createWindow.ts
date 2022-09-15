import { app, BrowserWindow, shell } from "electron";
import path from "path";
import { checkForUpdate } from "./helpers/autoUpdate";
import { IS_DEV, IS_LINUX, IS_MAC, RESOURCES_PATH } from "./helpers/constants";
import { settings } from "./helpers/settings";
import { popupContextMenu } from "./menu/contextMenu";

export function createWindow(): BrowserWindow {
  const { width, height } = settings.savedWindowSize.value;
  const { x, y } = settings.savedWindowPosition.value ?? {};

  const window = new BrowserWindow({
    width,
    height,
    x,
    y,
    autoHideMenuBar: settings.autoHideMenuEnabled.value,
    title: "Android Messages",
    show: false, //don't show window just yet (issue #229)
    icon: IS_LINUX
      ? path.resolve(RESOURCES_PATH, "icons", "128x128.png")
      : undefined,
    titleBarStyle: IS_MAC ? "hiddenInset" : "default",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: IS_DEV
        ? path.resolve(app.getAppPath(), "bridge.js")
        : path.resolve(app.getAppPath(), "app", "bridge.js"),
    },
  });

  process.env.MAIN_WINDOW_ID = window.id.toString();

  window.on("close", (event) => {
    if (settings.trayEnabled.value) {
      event.preventDefault();
      window.hide();
    }
  });

  setupUserAgentForFi(window);
  setupWebcontentsEvents(window);

  window.loadURL("https://messages.google.com/web/");

  maybeInitialShow(window);
  maybeCheckForUpdate();

  return window;
}

function maybeInitialShow(window: BrowserWindow) {
  if (!settings.trayEnabled.value || !settings.startInTrayEnabled.value) {
    window.show();
  }
}

function maybeCheckForUpdate() {
  if (settings.checkForUpdateOnLaunchEnabled.value && !IS_DEV) {
    checkForUpdate(true);
  }
}

function setupUserAgentForFi(window: BrowserWindow) {
  // set user agent to potentially make google fi work
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:104.0) Gecko/20100101 Firefox/104.0";

  window.webContents.session.webRequest.onBeforeSendHeaders(
    {
      urls: ["https://accounts.google.com/*"],
    },
    ({ requestHeaders }, callback) =>
      callback({
        requestHeaders: { ...requestHeaders, "User-Agent": userAgent },
      })
  );
}

function setupWebcontentsEvents(window: BrowserWindow) {
  window.webContents.on("new-window", (e, url) => {
    e.preventDefault();
    shell.openExternal(url);
  });

  window.webContents.on("context-menu", popupContextMenu);

  // block Google collecting data
  window.webContents.session.webRequest.onBeforeRequest(
    {
      urls: [
        "https://messages.google.com/web/jserror?*",
        "https://play.google.com/log?*",
        "https://www.google-analytics.com/analytics.js",
      ],
    },
    (details, callback) => {
      callback({ cancel: true });
    }
  );
}
