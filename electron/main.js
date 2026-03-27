import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { exec, execFile } from 'child_process';
import os from 'os';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development';

// ── Paden ─────────────────────────────────────────────────────────────────────
const dataDir = app.getPath('userData');
const metaFile = path.join(dataDir, 'templates.json');
const settingsFile = path.join(dataDir, 'instellingen.json');
const veldDir = path.join(dataDir, 'velden');

function ensureDirs() {
  [dataDir, veldDir].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
  if (!fs.existsSync(metaFile)) fs.writeFileSync(metaFile, '[]');
  if (!fs.existsSync(settingsFile)) {
    fs.writeFileSync(settingsFile, JSON.stringify({
      templateDir: path.join(dataDir, 'docx'),
      kantoorNaam: '',
      logoPad: '',
    }, null, 2));
  }
}

function readMeta() {
  ensureDirs();
  return JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
}
function writeMeta(data) {
  fs.writeFileSync(metaFile, JSON.stringify(data, null, 2));
}
function readSettings() {
  ensureDirs();
  return JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
}
function writeSettings(data) {
  fs.writeFileSync(settingsFile, JSON.stringify(data, null, 2));
}
function readVelden(templateId) {
  const f = path.join(veldDir, `${templateId}.json`);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf-8')) : [];
}
function writeVelden(templateId, velden) {
  fs.writeFileSync(path.join(veldDir, `${templateId}.json`), JSON.stringify(velden, null, 2));
}
function getTemplateDocxPath(templateId, versie) {
  const settings = readSettings();
  const dir = settings.templateDir || path.join(dataDir, 'docx');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${templateId}_v${versie}.docx`);
}

// ── Template handlers ─────────────────────────────────────────────────────────
ipcMain.handle('templates:getAll', () => readMeta());

ipcMain.handle('templates:getById', (_, id) => {
  const meta = readMeta().find(t => t.id === id);
  if (!meta) return null;
  return { ...meta, velden: readVelden(id) };
});

ipcMain.handle('templates:create', (_, { meta, velden }) => {
  const all = readMeta();
  if (all.find(t => t.id === meta.id)) throw new Error('ID al in gebruik');
  all.push({ ...meta, aangemaakt: new Date().toISOString(), bijgewerkt: new Date().toISOString() });
  writeMeta(all);
  writeVelden(meta.id, velden || []);
  return { ok: true };
});

ipcMain.handle('templates:update', (_, { id, meta, velden }) => {
  const all = readMeta();
  const idx = all.findIndex(t => t.id === id);
  if (idx < 0) throw new Error('Template niet gevonden');
  all[idx] = { ...all[idx], ...meta, bijgewerkt: new Date().toISOString() };
  writeMeta(all);
  if (velden !== undefined) writeVelden(id, velden);
  return { ok: true };
});

ipcMain.handle('templates:delete', (_, id) => {
  writeMeta(readMeta().filter(t => t.id !== id));
  const veldFile = path.join(veldDir, `${id}.json`);
  if (fs.existsSync(veldFile)) fs.unlinkSync(veldFile);
  return { ok: true };
});

ipcMain.handle('templates:selectDocx', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Selecteer Word-sjabloon',
    filters: [{ name: 'Word document', extensions: ['docx'] }],
    properties: ['openFile'],
  });
  return canceled ? null : filePaths[0];
});

ipcMain.handle('templates:copyDocx', (_, { srcPath, templateId, versie }) => {
  const dest = getTemplateDocxPath(templateId, versie);
  fs.copyFileSync(srcPath, dest);
  return dest;
});

ipcMain.handle('templates:getCategorieen', () => {
  const all = readMeta();
  return [...new Set(all.map(t => t.categorie).filter(Boolean))].sort();
});

// ── Export handlers ───────────────────────────────────────────────────────────
ipcMain.handle('export:generateDocx', async (_, { templateId, values }) => {
  const meta = readMeta().find(t => t.id === templateId);
  if (!meta) throw new Error('Template niet gevonden');

  const docxPath = getTemplateDocxPath(templateId, meta.versie);
  if (!fs.existsSync(docxPath)) throw new Error('DOCX bestand niet gevonden: ' + docxPath);

  const PizZip = require('pizzip');
  const Docxtemplater = require('docxtemplater');

  const content = fs.readFileSync(docxPath, 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

  doc.render(values);

  const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  const outName = `${meta.naam.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.docx`;
  const outPath = path.join(os.tmpdir(), outName);
  fs.writeFileSync(outPath, buf);
  return outPath;
});

ipcMain.handle('export:openInWord', (_, filePath) => {
  shell.openPath(filePath);
  return { ok: true };
});

ipcMain.handle('export:exportPdf', async (_, docxPath) => {
  const pdfPath = docxPath.replace(/\.docx$/, '.pdf');
  if (process.platform === 'win32') {
    const ed = docxPath.replace(/'/g, "''");
    const ep = pdfPath.replace(/'/g, "''");
    const ps = `$w=New-Object -ComObject Word.Application;$w.Visible=$false;$d=$w.Documents.Open('${ed}');$d.SaveAs([ref]'${ep}',[ref]17);$d.Close();$w.Quit()`;
    await new Promise((resolve, reject) =>
      execFile('powershell', ['-NoProfile', '-Command', ps], err => err ? reject(err) : resolve())
    );
  } else {
    await new Promise((resolve, reject) =>
      exec(`soffice --headless --convert-to pdf --outdir "${path.dirname(docxPath)}" "${docxPath}"`, err => err ? reject(err) : resolve())
    );
  }
  return pdfPath;
});

ipcMain.handle('export:openPdf', (_, pdfPath) => {
  shell.openPath(pdfPath);
  return { ok: true };
});

ipcMain.handle('export:sendEmail', (_, { bijlagePad }) => {
  if (process.platform === 'win32') {
    const ep = bijlagePad.replace(/'/g, "''");
    const ps = `$o=New-Object -ComObject Outlook.Application;$m=$o.CreateItem(0);$m.Attachments.Add('${ep}');$m.Display()`;
    execFile('powershell', ['-NoProfile', '-Command', ps], () => {});
  } else {
    shell.openExternal('mailto:?subject=Document');
  }
  return { ok: true };
});

ipcMain.handle('export:saveDocxAs', async (_, { srcPath, standaardNaam }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Opslaan als Word-document',
    defaultPath: standaardNaam,
    filters: [{ name: 'Word document', extensions: ['docx'] }],
  });
  if (canceled) return null;
  fs.copyFileSync(srcPath, filePath);
  return filePath;
});

ipcMain.handle('export:savePdfAs', async (_, { srcPath, standaardNaam }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Opslaan als PDF',
    defaultPath: standaardNaam,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (canceled) return null;
  fs.copyFileSync(srcPath, filePath);
  return filePath;
});

// ── Instellingen handlers ─────────────────────────────────────────────────────
ipcMain.handle('settings:get', () => readSettings());

ipcMain.handle('settings:set', (_, updates) => {
  writeSettings({ ...readSettings(), ...updates });
  return { ok: true };
});

ipcMain.handle('settings:selectDir', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Selecteer map voor sjablonen',
    properties: ['openDirectory'],
  });
  return canceled ? null : filePaths[0];
});

ipcMain.handle('settings:selectLogo', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Selecteer logo',
    filters: [{ name: 'Afbeelding', extensions: ['png', 'jpg', 'jpeg'] }],
    properties: ['openFile'],
  });
  return canceled ? null : filePaths[0];
});

// ── Venster ───────────────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Sjablonenplatform',
    autoHideMenuBar: true,
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Tijdelijk: DevTools voor debuggen (verwijder na oplossen white screen)
  win.webContents.openDevTools();
}

app.whenReady().then(() => {
  ensureDirs();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
