import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development';

// ── Simple JSON store (no native modules) ─────────────────────────────────────
const storePath = path.join(app.getPath('userData'), 'discord-agent-store.json');

function readStore() {
  try {
    if (fs.existsSync(storePath)) return JSON.parse(fs.readFileSync(storePath, 'utf8'));
  } catch (_) {}
  return {};
}

function writeStore(data) {
  try {
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (_) {}
}

let storeData = readStore();

// ── Window ────────────────────────────────────────────────────────────────────
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0b0b0d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: !isDev,
    },
    show: false,
    icon: path.join(__dirname, '../assets/icon.png'),
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── Window controls ───────────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());
ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false);

// ── External links ────────────────────────────────────────────────────────────
ipcMain.on('open-external', (_, url) => shell.openExternal(url));

// ── System info ───────────────────────────────────────────────────────────────
ipcMain.handle('get-system-info', () => ({
  platform: process.platform,
  arch: process.arch,
  cpus: os.cpus(),
  totalMemory: os.totalmem(),
  freeMemory: os.freemem(),
}));

// ── Store ─────────────────────────────────────────────────────────────────────
ipcMain.handle('store-get', (_, key) => {
  const keys = key.split('.');
  let val = storeData;
  for (const k of keys) val = val?.[k];
  return val ?? null;
});

ipcMain.handle('store-set', (_, key, value) => {
  const keys = key.split('.');
  let obj = storeData;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!obj[keys[i]] || typeof obj[keys[i]] !== 'object') obj[keys[i]] = {};
    obj = obj[keys[i]];
  }
  obj[keys[keys.length - 1]] = value;
  writeStore(storeData);
  return true;
});

ipcMain.handle('store-delete', (_, key) => {
  const keys = key.split('.');
  let obj = storeData;
  for (let i = 0; i < keys.length - 1; i++) obj = obj?.[keys[i]];
  if (obj) delete obj[keys[keys.length - 1]];
  writeStore(storeData);
  return true;
});

ipcMain.handle('store-clear', () => { storeData = {}; writeStore(storeData); return true; });
ipcMain.handle('store-get-all', () => storeData);
