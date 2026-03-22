import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'data.json');

const app = express();
app.use(cors());
app.use(express.json());

function readData() {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// GET all entries
app.get('/api/entries', (req, res) => {
  res.json(readData());
});

// POST new or update existing entry for a month
app.post('/api/entries', (req, res) => {
  const entry = req.body;
  if (!entry.month) return res.status(400).json({ error: 'month is required' });

  const data = readData();
  const idx = data.findIndex(e => e.month === entry.month);
  if (idx >= 0) {
    data[idx] = entry;
  } else {
    data.push(entry);
  }
  data.sort((a, b) => a.month.localeCompare(b.month));
  writeData(data);
  res.json(entry);
});

// DELETE entry by month
app.delete('/api/entries/:month', (req, res) => {
  const month = req.params.month;
  const data = readData().filter(e => e.month !== month);
  writeData(data);
  res.json({ ok: true });
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
