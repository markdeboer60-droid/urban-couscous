/**
 * Kopieert de kant-en-klare CJS-bundel van pdf-parse v2 naar de electron-map
 * zodat hij betrouwbaar werkt vanuit de verpakte app (app.asar.unpacked/electron/).
 */
import { copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

copyFileSync(
  path.join(root, 'node_modules', 'pdf-parse', 'dist', 'pdf-parse', 'cjs', 'index.cjs'),
  path.join(root, 'electron', 'pdf-parse-bundle.cjs')
);

console.log('pdf-parse gekopieerd naar electron/pdf-parse-bundle.cjs');
