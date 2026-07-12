import { app, BrowserWindow, screen } from "electron";
import path from "node:path";
import http from "node:http";
import { createStateServer } from "./httpServer";
import { resolvePort, StatePayload } from "../shared/state";

const WINDOW_WIDTH = 200;
const WINDOW_HEIGHT = 240;
const MARGIN = 24;

let mainWindow: BrowserWindow | null = null;
let stateServer: http.Server | null = null;

/** Position the window in a screen corner (default bottom-right). */
function computePosition(): { x: number; y: number } {
  const { workArea } = screen.getPrimaryDisplay();
  const corner = (process.env.MASCOT_CORNER || "bottom-right").toLowerCase();
  const left = corner.includes("left");
  const top = corner.includes("top");
  const x = left ? workArea.x + MARGIN : workArea.x + workArea.width - WINDOW_WIDTH - MARGIN;
  const y = top ? workArea.y + MARGIN : workArea.y + workArea.height - WINDOW_HEIGHT - MARGIN;
  return { x, y };
}

function createWindow(): void {
  const { x, y } = computePosition();

  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setAlwaysOnTop(true, "screen-saver");
  mainWindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function forwardState(payload: StatePayload): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("mascot:state", payload);
  }
}

app.whenReady().then(() => {
  createWindow();
  stateServer = createStateServer(resolvePort(), forwardState);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Keep running with no windows on macOS is irrelevant here; this is an always-on tray-like app.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  stateServer?.close();
});
