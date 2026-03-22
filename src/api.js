// Communicatie via Electron IPC (geen HTTP server nodig)
const api = window.electronAPI;

export async function getEntries() {
  return api.getEntries();
}

export async function saveEntry(entry) {
  return api.saveEntry(entry);
}

export async function deleteEntry(month) {
  return api.deleteEntry(month);
}
