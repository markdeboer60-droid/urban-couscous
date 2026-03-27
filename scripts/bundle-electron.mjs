/**
 * Kopieert de CJS-bundel van pdf-parse naar electron/pdf-parse-bundle.cjs.
 * Probeert eerst module-resolutie, daalt dan terug op directe padconstructie.
 */
import { copyFileSync, existsSync, readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const scriptPad = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPad), '..');
const destPath = path.join(root, 'electron', 'pdf-parse-bundle.cjs');

// ── 1. Probeer via module-resolutie (meest betrouwbaar) ──────────────────────
let srcPath = null;
try {
  const req = createRequire(scriptPad);
  srcPath = req.resolve('pdf-parse');
} catch { /* geen probleem, zie stap 2 */ }

// ── 2. Fallback: lees entry point uit package.json ───────────────────────────
if (!srcPath) {
  const pkgPath = path.join(root, 'node_modules', 'pdf-parse', 'package.json');
  if (!existsSync(pkgPath)) {
    console.error('FOUT: pdf-parse niet gevonden in node_modules.');
    console.error('Voer eerst uit: npm install --legacy-peer-deps');
    process.exit(1);
  }
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  // Ondersteunt v1.x (main) en v2.x (exports map)
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

copyFileSync(srcPath, destPath);
console.log(`pdf-parse gekopieerd naar electron/pdf-parse-bundle.cjs`);
