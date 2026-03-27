/**
 * Zoekt dynamisch het CJS-instappunt van pdf-parse op en kopieert het
 * naar electron/pdf-parse-bundle.cjs. Werkt met elke versie/structuur.
 */
import { copyFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

// Gebruik createRequire zodat de exports-map correct wordt gevolgd
const req = createRequire(import.meta.url);
const srcPath = req.resolve('pdf-parse');

const destPath = path.join(root, 'electron', 'pdf-parse-bundle.cjs');
copyFileSync(srcPath, destPath);

console.log(`pdf-parse gekopieerd:\n  ${srcPath}\n  -> ${destPath}`);
