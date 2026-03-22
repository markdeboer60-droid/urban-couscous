const BASE = 'http://localhost:3001/api';

export async function getEntries() {
  const res = await fetch(`${BASE}/entries`);
  return res.json();
}

export async function saveEntry(entry) {
  const res = await fetch(`${BASE}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  return res.json();
}

export async function deleteEntry(month) {
  await fetch(`${BASE}/entries/${month}`, { method: 'DELETE' });
}
