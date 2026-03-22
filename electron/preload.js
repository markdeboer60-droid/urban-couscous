import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getEntries: () => ipcRenderer.invoke('get-entries'),
  saveEntry: (entry) => ipcRenderer.invoke('save-entry', entry),
  deleteEntry: (month) => ipcRenderer.invoke('delete-entry', month),
});
