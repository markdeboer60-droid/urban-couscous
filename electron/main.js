import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development';

// Data file in %APPDATA%/financieel-dashboard/data.json
const dataDir = path.join(app.getPath('userData'));
const dataFile = path.join(dataDir, 'data.json');

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, '[]');
}

function readData() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
}

function writeData(data) {
  ensureDataFile();
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// IPC handlers
ipcMain.handle('get-entries', () => readData());

ipcMain.handle('save-entry', (_, entry) => {
  const data = readData();
  const idx = data.findIndex(e => e.month === entry.month);
  if (idx >= 0) data[idx] = entry;
  else data.push(entry);
  data.sort((a, b) => a.month.localeCompare(b.month));
  writeData(data);
  return readData();
});

ipcMain.handle('delete-entry', (_, month) => {
  writeData(readData().filter(e => e.month !== month));
  return readData();
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Financieel Dashboard',
    autoHideMenuBar: true,
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
