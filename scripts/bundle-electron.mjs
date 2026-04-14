/**
 * Kopieert CJS/UMD-bundels naar de electron/-map zodat ze betrouwbaar geladen
 * kunnen worden vanuit het Electron main-process, ongeacht asar-packaging.
 *
 * - pdf-parse  → electron/pdf-parse-bundle.cjs
 * - pdf-lib    → electron/pdf-lib-bundle.cjs  (UMD dist, geen externe deps)
 */
import { copyFileSync, existsSync, readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const scriptPad = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPad), '..');

// ── Hulpfunctie ───────────────────────────────────────────────────────────────
function kopieerBundle({ naam, vindPad, fallbackPad, doel }) {
  let srcPath = null;
  try {
    const req = createRequire(scriptPad);
    srcPath = req.resolve(vindPad);
  } catch { /* fallback hieronder */ }

  if (!srcPath || !existsSync(srcPath)) {
    srcPath = path.join(root, 'node_modules', ...fallbackPad.split('/'));
  }

  if (!existsSync(srcPath)) {
    console.error(`FOUT: ${naam} niet gevonden op pad:\n  ${srcPath}`);
    process.exit(1);
  }

  const destPath = path.join(root, 'electron', doel);
  copyFileSync(srcPath, destPath);
  console.log(`${naam} gekopieerd → electron/${doel}`);
}

// ── 1. pdf-parse ─────────────────────────────────────────────────────────────
{
  let srcPath = null;
  try {
    const req = createRequire(scriptPad);
    srcPath = req.resolve('pdf-parse');
  } catch { /* fallback */ }

  if (!srcPath) {
    const pkgPath = path.join(root, 'node_modules', 'pdf-parse', 'package.json');
    if (!existsSync(pkgPath)) {
      console.error('FOUT: pdf-parse niet gevonden in node_modules.');
      console.error('Voer eerst uit: npm install --legacy-peer-deps');
      process.exit(1);
    }
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const entry = pkg.main
      ?? pkg.exports?.['.']?.require?.default
      ?? pkg.exports?.['.']?.default?.default;
    if (!entry) {
      console.error('FOUT: Kon het CJS instappunt van pdf-parse niet bepalen.');
      process.exit(1);
    }
    srcPath = path.join(root, 'node_modules', 'pdf-parse', entry.replace(/^\.\//, ''));
  }

  if (!existsSync(srcPath)) {
    console.error(`FOUT: pdf-parse CJS bestand niet gevonden:\n  ${srcPath}`);
    process.exit(1);
  }

  const destPath = path.join(root, 'electron', 'pdf-parse-bundle.cjs');
  copyFileSync(srcPath, destPath);
  console.log('pdf-parse gekopieerd naar electron/pdf-parse-bundle.cjs');
}

// ── 2. pdf-lib (UMD dist — volledig zelfstandig, geen externe afhankelijkheden) ──
{
  // De UMD-bundel in dist/pdf-lib.js bevat alles ingebakken (fontkit, pako, etc.)
  const srcPath = path.join(root, 'node_modules', 'pdf-lib', 'dist', 'pdf-lib.js');
  if (!existsSync(srcPath)) {
    console.error(`FOUT: pdf-lib UMD-bundel niet gevonden:\n  ${srcPath}`);
    console.error('Voer eerst uit: npm install');
    process.exit(1);
  }
  const destPath = path.join(root, 'electron', 'pdf-lib-bundle.cjs');
  copyFileSync(srcPath, destPath);
  console.log('pdf-lib gekopieerd naar electron/pdf-lib-bundle.cjs');
}
