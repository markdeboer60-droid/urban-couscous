import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import https from 'https';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { exec, execFile } from 'child_process';
import { randomUUID } from 'crypto';
import os from 'os';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development';

// ── Paden ─────────────────────────────────────────────────────────────────────
const dataDir = app.getPath('userData');
const metaFile = path.join(dataDir, 'templates.json');
const settingsFile = path.join(dataDir, 'instellingen.json');
const veldDir = path.join(dataDir, 'velden');
const historyFile = path.join(dataDir, 'history.json');
const geschiedenisDir = path.join(dataDir, 'geschiedenis');
const klantenFile = path.join(dataDir, 'klanten.json');
const conceptenFile = path.join(dataDir, 'concepten.json');

const defaultOndertekenaars = [
  'Drs M.R. de Boer AA',
  'Drs M.R. Wijnia',
  'Drs G.O. Visser RA',
];

function ensureDirs() {
  [dataDir, veldDir, geschiedenisDir].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
  if (!fs.existsSync(metaFile)) fs.writeFileSync(metaFile, '[]');
  if (!fs.existsSync(historyFile)) fs.writeFileSync(historyFile, '[]');
  if (!fs.existsSync(klantenFile)) fs.writeFileSync(klantenFile, '[]');
  if (!fs.existsSync(conceptenFile)) fs.writeFileSync(conceptenFile, '[]');
  if (!fs.existsSync(settingsFile)) {
    fs.writeFileSync(settingsFile, JSON.stringify({
      templateDir: path.join(dataDir, 'docx'),
      kantoorNaam: '',
      logoPad: '',
      ondertekenaars: defaultOndertekenaars,
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
function readKlanten() { ensureDirs(); return JSON.parse(fs.readFileSync(klantenFile, 'utf-8')); }
function writeKlanten(data) { fs.writeFileSync(klantenFile, JSON.stringify(data, null, 2)); }
function readConcepten() { ensureDirs(); return JSON.parse(fs.readFileSync(conceptenFile, 'utf-8')); }
function writeConcepten(data) { fs.writeFileSync(conceptenFile, JSON.stringify(data, null, 2)); }

function getTemplateDocxPath(templateId, versie) {
  const settings = readSettings();
  const dir = settings.templateDir || path.join(dataDir, 'docx');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${templateId}_v${versie}.docx`);
}

// ── App info ──────────────────────────────────────────────────────────────────
ipcMain.handle('app:getVersion', () => app.getVersion());

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

ipcMain.handle('templates:duplicate', (_, id) => {
  const all = readMeta();
  const orig = all.find(t => t.id === id);
  if (!orig) throw new Error('Template niet gevonden');
  const nieuwId = id + '-kopie-' + Date.now();
  const nieuw = { ...orig, id: nieuwId, naam: orig.naam + ' (kopie)', aangemaakt: new Date().toISOString(), bijgewerkt: new Date().toISOString() };
  all.push(nieuw);
  writeMeta(all);
  writeVelden(nieuwId, readVelden(id));
  const srcDocx = getTemplateDocxPath(id, orig.versie);
  if (fs.existsSync(srcDocx)) fs.copyFileSync(srcDocx, getTemplateDocxPath(nieuwId, nieuw.versie));
  return nieuwId;
});

ipcMain.handle('templates:toggleFavoriet', (_, id) => {
  const all = readMeta();
  const idx = all.findIndex(t => t.id === id);
  if (idx < 0) throw new Error('Template niet gevonden');
  all[idx].favoriet = !all[idx].favoriet;
  writeMeta(all);
  return all[idx].favoriet;
});

// ── Klanten handlers ──────────────────────────────────────────────────────────
ipcMain.handle('klanten:getAll', () => readKlanten());

ipcMain.handle('klanten:save', (_, klant) => {
  const all = readKlanten();
  const idx = all.findIndex(k => k.id === klant.id);
  if (idx >= 0) {
    all[idx] = { ...klant, bijgewerkt: new Date().toISOString() };
  } else {
    all.push({ ...klant, id: randomUUID(), aangemaakt: new Date().toISOString(), bijgewerkt: new Date().toISOString() });
  }
  writeKlanten(all);
  return { ok: true };
});

ipcMain.handle('klanten:delete', (_, id) => {
  writeKlanten(readKlanten().filter(k => k.id !== id));
  return { ok: true };
});

// ── Concepten handlers ────────────────────────────────────────────────────────
ipcMain.handle('concepten:getAll', () => readConcepten());

ipcMain.handle('concepten:getByTemplate', (_, templateId) => {
  return readConcepten().find(c => c.templateId === templateId) || null;
});

ipcMain.handle('concepten:save', (_, { templateId, templateNaam, waarden }) => {
  const all = readConcepten().filter(c => c.templateId !== templateId);
  all.push({ id: randomUUID(), templateId, templateNaam, waarden, datum: new Date().toISOString() });
  writeConcepten(all);
  return { ok: true };
});

ipcMain.handle('concepten:delete', (_, templateId) => {
  writeConcepten(readConcepten().filter(c => c.templateId !== templateId));
  return { ok: true };
});

ipcMain.handle('templates:getCategorieen', () => {
  const all = readMeta();
  return [...new Set(all.map(t => t.categorie).filter(Boolean))].sort();
});

// ── Docxtemplater hulpfunctie ─────────────────────────────────────────────────
/**
 * Word kan sjabloontags (bv. {Boekjaar}) splitsen over meerdere XML-runs,
 * wat Docxtemplater "unclosed_tag" fouten veroorzaakt.
 * Deze functie voegt aangrenzende runs samen zodat de tag in één
 * <w:t>-element terechtkomt.
 */
function fixSplitTemplateTags(zip) {
  // Verwerk alle relevante XML-bestanden in het word/-gedeelte van de docx
  const doelBestanden = Object.keys(zip.files).filter(name =>
    !zip.files[name].dir &&
    name.startsWith('word/') &&
    name.endsWith('.xml') &&
    !name.includes('_rels')
  );
  for (const naam of doelBestanden) {
    let xml;
    try { xml = zip.files[naam].asText(); } catch { continue; }

    // Stap 1: verwijder zelf-sluitende inline-elementen die Word tussen runs plaatst
    // (spellingmarkeringen, bladwijzers) — ze beïnvloeden de documentinhoud niet
    xml = xml.replace(/<w:(?:proofErr|bookmarkStart|bookmarkEnd)[^>]*\/?>/g, '');

    // Stap 2: voeg opeenvolgende runs samen waar de tekst een { heeft maar nog geen }
    // Iteratief totdat er geen wijzigingen meer zijn (voor tags gesplitst over 3+ runs)
    let vorige;
    do {
      vorige = xml;
      xml = xml.replace(
        /(<w:t(?:[^>]*)>[^<]*\{[^}<]*)<\/w:t><\/w:r><w:r(?:[^>]*)?>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:t(?:[^>]*)?>/g,
        '$1'
      );
    } while (xml !== vorige);

    zip.file(naam, xml);
  }
  return zip;
}

/**
 * Na het renderen verwijdert deze functie opeenvolgende lege alinea's uit het
 * document. Dit voorkomt witte gaten die ontstaan wanneer conditionele blokken
 * ({#rente_euribor}...{/rente_euribor}) niet worden gerenderd.
 * Reeksen van 2+ lege alinea's (geen <w:r>-elementen) worden teruggebracht naar 1.
 */
function compacteerLegeAlineas(zip) {
  const doelBestanden = Object.keys(zip.files).filter(name =>
    !zip.files[name].dir &&
    /^word\/(document|header\d*|footer\d*)\.xml$/.test(name)
  );
  for (const naam of doelBestanden) {
    let xml;
    try { xml = zip.files[naam].asText(); } catch { continue; }
    let aantalLeeg = 0;
    xml = xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (match) => {
      // Een alinea is leeg als hij geen tekstrun (<w:r>) bevat
      if (!/<w:r[\s>]/.test(match)) {
        aantalLeeg++;
        return aantalLeeg <= 1 ? match : '';
      }
      aantalLeeg = 0;
      return match;
    });
    zip.file(naam, xml);
  }
}

// ── Export handlers ───────────────────────────────────────────────────────────
ipcMain.handle('export:generateDocx', async (_, { templateId, values }) => {
  const all = readMeta();
  const meta = all.find(t => t.id === templateId);
  if (!meta) throw new Error('Template niet gevonden');

  const docxPath = getTemplateDocxPath(templateId, meta.versie);
  if (!fs.existsSync(docxPath)) throw new Error('DOCX bestand niet gevonden: ' + docxPath);

  // Volgnummer ophogen en injecteren als {volgnummer}
  let renderValues = { ...values };
  if (meta.volgnummerActief) {
    const prefix  = meta.volgnummerPrefix  || '';
    const padding = meta.volgnummerPadding || 4;
    const huidig  = meta.volgnummerHuidig  || 1;
    renderValues.volgnummer = `${prefix}${String(huidig).padStart(padding, '0')}`;
  }

  const PizZip = require('pizzip');
  const Docxtemplater = require('docxtemplater');

  const content = fs.readFileSync(docxPath, 'binary');
  let buf;
  try {
    const zip = fixSplitTemplateTags(new PizZip(content));
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      stripInvalidXMLChars: true,
      // Lege string voor reguliere tags, lege array voor loop/conditie-modules
      nullGetter: (part) => part.module ? [] : '',
    });
    doc.render(renderValues);
    const renderedZip = doc.getZip();
    compacteerLegeAlineas(renderedZip);
    buf = renderedZip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  } catch (e) {
    const errors = e.properties?.errors;
    let details = '';
    if (Array.isArray(errors) && errors.length > 0) {
      details = errors.map(err => {
        const uitleg = err.properties?.explanation;
        const tag   = err.properties?.xtag;
        const id    = err.properties?.id;
        return [uitleg, tag ? `tag: {${tag}}` : '', id ? `(${id})` : '']
          .filter(Boolean).join(' ');
      }).filter(Boolean).join('; ');
    }
    throw new Error(`Documentfout: ${details || e.message || String(e)}`);
  }

  // Na succesvolle render: volgnummer verhogen
  if (meta.volgnummerActief) {
    const idx = all.findIndex(t => t.id === templateId);
    if (idx >= 0) {
      all[idx].volgnummerHuidig = (meta.volgnummerHuidig || 1) + 1;
      writeMeta(all);
    }
  }
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

ipcMain.handle('export:print', (_, filePath) => {
  if (process.platform === 'win32') {
    const fp = filePath.replace(/'/g, "''");
    execFile('powershell', [
      '-NoProfile', '-Command',
      `Start-Process -FilePath '${fp}' -Verb Print`,
    ], () => {});
  } else {
    shell.openPath(filePath);
  }
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

ipcMain.handle('export:saveDocxToDir', (_, { srcPath, opslagMap, naam }) => {
  if (!fs.existsSync(opslagMap)) fs.mkdirSync(opslagMap, { recursive: true });
  const doel = path.join(opslagMap, naam);
  fs.copyFileSync(srcPath, doel);
  return doel;
});

ipcMain.handle('export:bulkGenereer', async (_, { templateId, rijen, opslagMap }) => {
  const meta = readMeta().find(t => t.id === templateId);
  if (!meta) throw new Error('Template niet gevonden');
  const docxPath = getTemplateDocxPath(templateId, meta.versie);
  if (!fs.existsSync(docxPath)) throw new Error('DOCX bestand niet gevonden: ' + docxPath);

  const PizZip = require('pizzip');
  const Docxtemplater = require('docxtemplater');
  const content = fs.readFileSync(docxPath, 'binary');

  if (!fs.existsSync(opslagMap)) fs.mkdirSync(opslagMap, { recursive: true });

  const paden = [];
  const fouten = [];

  for (let i = 0; i < rijen.length; i++) {
    const values = rijen[i];
    try {
      const zip = fixSplitTemplateTags(new PizZip(content));
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true, linebreaks: true, stripInvalidXMLChars: true,
        nullGetter: (part) => part.module ? [] : '',
      });
      doc.render(values);
      const renderedZip = doc.getZip();
      compacteerLegeAlineas(renderedZip);
      const buf = renderedZip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
      const naamBase = Object.values(values).filter(Boolean).slice(0, 2).join('_').replace(/[^a-zA-Z0-9_\-]/g, '_') || `rij_${i + 1}`;
      const uitvoerNaam = `${meta.naam.replace(/[^a-zA-Z0-9]/g, '_')}_${naamBase}_${i + 1}.docx`;
      const uitvoerPad = path.join(opslagMap, uitvoerNaam);
      fs.writeFileSync(uitvoerPad, buf);
      paden.push(uitvoerPad);
    } catch (e) {
      fouten.push({ rij: i + 1, fout: e.message || String(e) });
    }
  }

  return { paden, fouten };
});

ipcMain.handle('export:saveDocxAs', async (_, { srcPath, standaardNaam, defaultDir }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Opslaan als Word-document',
    defaultPath: defaultDir ? path.join(defaultDir, standaardNaam) : standaardNaam,
    filters: [{ name: 'Word document', extensions: ['docx'] }],
  });
  if (canceled) return null;
  fs.copyFileSync(srcPath, filePath);
  return filePath;
});

ipcMain.handle('export:savePdfAs', async (_, { srcPath, standaardNaam, defaultDir }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Opslaan als PDF',
    defaultPath: defaultDir ? path.join(defaultDir, standaardNaam) : standaardNaam,
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

ipcMain.handle('settings:getOneDrivePad', () => {
  const home = os.homedir();
  // Scan homedirectory op OneDrive-mappen (OneDrive, OneDrive - Bedrijf, etc.)
  try {
    const entries = fs.readdirSync(home, { withFileTypes: true });
    const oneDriveMappen = entries
      .filter(e => e.isDirectory() && e.name.toLowerCase().startsWith('onedrive'))
      .map(e => path.join(home, e.name));
    if (oneDriveMappen.length > 0) return oneDriveMappen[0];
  } catch {}
  return null;
});

// ── Geschiedenis handlers ─────────────────────────────────────────────────────
function readHistory() {
  if (!fs.existsSync(historyFile)) return [];
  return JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
}
function writeHistory(data) {
  fs.writeFileSync(historyFile, JSON.stringify(data, null, 2));
}

ipcMain.handle('history:getAll', () => readHistory());

ipcMain.handle('history:add', (_, entry) => {
  const ext = path.extname(entry.docxPad || '.docx');
  const bestandsnaam = `${entry.templateId}_${Date.now()}${ext}`;
  const persistentPad = path.join(geschiedenisDir, bestandsnaam);
  if (entry.docxPad && fs.existsSync(entry.docxPad)) {
    fs.copyFileSync(entry.docxPad, persistentPad);
  }

  // Ondertitel samenstellen uit gemarkeerde velden of bekende sleutels
  let ondertitel = '';
  try {
    const velden = readVelden(entry.templateId);
    const gemarkeerd = velden.filter(v => v.toonInGeschiedenisTitel);
    if (gemarkeerd.length > 0) {
      ondertitel = gemarkeerd
        .map(v => entry.values?.[v.sleutel])
        .filter(Boolean)
        .join(' — ');
    } else {
      // Fallback op bekende sleutelnamen
      const kandidaten = [
        'bedrijfsnaam', 'klantnaam', 'naam_client', 'naam_cliënt', 'naam',
        'klantnummer', 'relatienummer', 'kvk_nummer', 'debiteurnummer',
      ];
      const gevonden = kandidaten.map(k => entry.values?.[k]).filter(Boolean);
      ondertitel = gevonden.slice(0, 2).join(' — ');
    }
  } catch {}

  const nieuwEntry = {
    id: randomUUID(),
    templateId: entry.templateId,
    templateNaam: entry.templateNaam,
    categorie: entry.categorie,
    datum: new Date().toISOString(),
    values: entry.values,
    docxPad: persistentPad,
    ondertitel,
  };
  const history = readHistory();
  history.unshift(nieuwEntry);
  if (history.length > 200) history.length = 200;
  writeHistory(history);
  return nieuwEntry;
});

ipcMain.handle('history:delete', (_, id) => {
  const history = readHistory();
  const entry = history.find(e => e.id === id);
  if (entry?.docxPad && fs.existsSync(entry.docxPad)) {
    try { fs.unlinkSync(entry.docxPad); } catch {}
  }
  writeHistory(history.filter(e => e.id !== id));
  return { ok: true };
});

// ── DOCX variabelen scanner ───────────────────────────────────────────────────
ipcMain.handle('templates:scanDocxVars', (_, filePath) => {
  const PizZip = require('pizzip');
  const content = fs.readFileSync(filePath, 'binary');
  const zip = new PizZip(content);

  const xmlNames = Object.keys(zip.files).filter(
    n => n.startsWith('word/') && n.endsWith('.xml') && !zip.files[n].dir
  );

  const variabelen = new Set();
  const condities = new Set();

  for (const xmlName of xmlNames) {
    const xml = zip.files[xmlName].asText();
    // Concateneer alle <w:t> tekstnodes om gesplitste runs samen te voegen
    const parts = [];
    const wtRe = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let m;
    while ((m = wtRe.exec(xml)) !== null) parts.push(m[1]);
    const tekst = parts.join('');

    // Gewone variabelen {naam}
    const varRe = /\{([^{}#\/^@>|\s][^{}\/^>|]*)\}/g;
    while ((m = varRe.exec(tekst)) !== null) {
      const tag = m[1].trim();
      if (tag && !tag.startsWith('#') && !tag.startsWith('^')) variabelen.add(tag);
    }
    // Conditionele blokken {#conditie}
    const condRe = /\{[#^]([^{}]+)\}/g;
    while ((m = condRe.exec(tekst)) !== null) condities.add(m[1].trim());
  }
  // Sluitende condities weghalen uit variabelen
  condities.forEach(c => variabelen.delete(c));

  return { variabelen: [...variabelen], condities: [...condities] };
});

// ── KVK uittreksel scanner ────────────────────────────────────────────────────
ipcMain.handle('kvk:selectPdf', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Selecteer KVK uittreksel (PDF)',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
    properties: ['openFile'],
  });
  return canceled ? null : filePaths[0];
});

ipcMain.handle('kvk:scanPdf', async (_, filePath) => {
  // pdf-parse v2 CJS wordt gekopieerd naar electron/ via scripts/bundle-electron.mjs
  const bundlePad = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'electron', 'pdf-parse-bundle.cjs')
    : path.join(__dirname, 'pdf-parse-bundle.cjs');
  const { PDFParse } = require(bundlePad);
  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: buffer });
  const data = await parser.getText();
  const t = data.text;
  const result = {};

  const zoek = (regex) => t.match(regex)?.[1]?.trim() || null;

  const bedrijfsnaam = zoek(/Handelsnaam\s*[:\n\r]+([^\n\r]+)/i)
    || zoek(/Naam\s*[:\n\r]+([^\n\r]+)/i);
  if (bedrijfsnaam) result.bedrijfsnaam = bedrijfsnaam;

  const kvknummer = zoek(/KVK[- ]?nummer\s*[:\n\r]+(\d{8})/i);
  if (kvknummer) result.kvk_nummer = kvknummer;

  const rechtsvorm = zoek(/Rechtsvorm\s*[:\n\r]+([^\n\r]+)/i);
  if (rechtsvorm) result.rechtsvorm = rechtsvorm;

  const adres = zoek(/Vestigingsadres\s*[:\n\r]+([^\n\r]+)/i)
    || zoek(/Adres\s*[:\n\r]+([^\n\r]+)/i);
  if (adres) result.adres = adres;

  const bestuurder = zoek(/(?:Bestuurder|Directeur|Vennoot)\s*[:\n\r]+([^\n\r]+)/i);
  if (bestuurder) result.naam_bestuurder = bestuurder;

  const geboortedatum = zoek(/Geboortedatum\s*[:\n\r]+(\d{1,2}[-\s]\d{1,2}[-\s]\d{4}|\d{1,2}\s+\w+\s+\d{4})/i);
  if (geboortedatum) result.geboortedatum = geboortedatum;

  return result;
});

// ── Bedrijvenmonitor lookup ───────────────────────────────────────────────────

/**
 * Fetches a URL via HTTPS, following up to `maxRedirects` redirects.
 * Returns the final HTML body as a string.
 */
function fetchHtml(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    let urlObj;
    try { urlObj = new URL(url); } catch { return reject(new Error(`Ongeldige URL: ${url}`)); }

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'nl-NL,nl;q=0.9',
      },
    };

    const req = https.get(options, (res) => {
      const { statusCode, headers } = res;
      if ([301, 302, 303, 307, 308].includes(statusCode) && headers.location && maxRedirects > 0) {
        const next = headers.location.startsWith('http')
          ? headers.location
          : `https://${urlObj.hostname}${headers.location}`;
        res.resume();
        resolve(fetchHtml(next, maxRedirects - 1));
        return;
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Verzoek verlopen (timeout)')); });
  });
}

/**
 * Extracts company address data from a bedrijvenmonitor.info company page.
 * Tries JSON-LD schema.org first, then common HTML patterns.
 */
function parseBedrijfPagina(html) {
  const result = {};

  // JSON-LD schema.org (most reliable)
  const jsonLdBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, raw] of jsonLdBlocks) {
    try {
      let parsed = JSON.parse(raw.trim());
      if (Array.isArray(parsed)) parsed = parsed.find(j => j['@type'] === 'Organization' || j['@type'] === 'LocalBusiness') || {};
      if (parsed['@type'] === 'Organization' || parsed['@type'] === 'LocalBusiness') {
        if (parsed.name) result.naam = parsed.name;
        const addr = parsed.address || {};
        if (addr.streetAddress) result.adres = addr.streetAddress;
        if (addr.postalCode) result.postcode = addr.postalCode;
        if (addr.addressLocality) result.plaats = addr.addressLocality;
        if (result.adres) break;
      }
    } catch { /* skip malformed JSON-LD */ }
  }

  // Fallback: look for Dutch postcode (1234 AB) and nearby address text
  if (!result.postcode) {
    const pc = html.match(/\b(\d{4}\s+[A-Z]{2})\b/);
    if (pc) result.postcode = pc[1].replace(/\s+/, ' ');
  }

  // Fallback: meta description often contains "adres: Straat 12, 1234 AB Plaats"
  if (!result.adres) {
    const meta = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    if (meta) {
      const desc = meta[1];
      // Dutch address pattern: "Word+ number, postcode City"
      const adresM = desc.match(/([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s\-']+\s+\d+[A-Za-z]?(?:\s*[-–]\s*\d+[A-Za-z]?)?)/);
      if (adresM) result.adres = adresM[1].trim();
      const pcM = desc.match(/(\d{4}\s*[A-Z]{2})\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s\-']+)/);
      if (pcM) {
        if (!result.postcode) result.postcode = pcM[1].replace(/\s+/, ' ');
        if (!result.plaats) result.plaats = pcM[2].trim();
      }
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

ipcMain.handle('bedrijf:zoek', async (_, { naam, plaats }) => {
  try {
    // Step 1: search on bedrijvenmonitor.info
    const params = new URLSearchParams({ bedrijfsnaam: naam.trim() });
    if (plaats && plaats.trim()) params.set('gemeente', plaats.trim());
    const zoekUrl = `https://bedrijvenmonitor.info/zoeken?${params.toString()}`;

    const zoekHtml = await fetchHtml(zoekUrl);

    // Step 2: find the first company link (/bedrijf/...) in the results page
    const linkMatches = [...zoekHtml.matchAll(/href="(\/bedrijf\/[^"?#]+)"/g)];
    if (!linkMatches.length) {
      return { fout: `Geen bedrijven gevonden voor "${naam}"${plaats ? ' in ' + plaats : ''}.` };
    }

    // Step 3: fetch the first company page
    const bedrijfUrl = `https://bedrijvenmonitor.info${linkMatches[0][1]}`;
    const bedrijfHtml = await fetchHtml(bedrijfUrl);

    const data = parseBedrijfPagina(bedrijfHtml);
    if (!data) return { fout: 'Bedrijf gevonden maar adresgegevens konden niet worden uitgelezen.' };

    return data;
  } catch (err) {
    return { fout: err.message || 'Zoeken mislukt' };
  }
});

// ── Venster ───────────────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
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

}

app.whenReady().then(() => {
  ensureDirs();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
