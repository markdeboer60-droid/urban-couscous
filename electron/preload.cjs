const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Templates
  templates: {
    getAll: () => ipcRenderer.invoke('templates:getAll'),
    getById: (id) => ipcRenderer.invoke('templates:getById', id),
    create: (payload) => ipcRenderer.invoke('templates:create', payload),
    update: (payload) => ipcRenderer.invoke('templates:update', payload),
    delete: (id) => ipcRenderer.invoke('templates:delete', id),
    selectDocx: () => ipcRenderer.invoke('templates:selectDocx'),
    copyDocx: (payload) => ipcRenderer.invoke('templates:copyDocx', payload),
    getCategorieen: () => ipcRenderer.invoke('templates:getCategorieen'),
  },
  // Export
  export: {
    generateDocx: (payload) => ipcRenderer.invoke('export:generateDocx', payload),
    openInWord: (filePath) => ipcRenderer.invoke('export:openInWord', filePath),
    exportPdf: (docxPath) => ipcRenderer.invoke('export:exportPdf', docxPath),
    openPdf: (pdfPath) => ipcRenderer.invoke('export:openPdf', pdfPath),
    sendEmail: (payload) => ipcRenderer.invoke('export:sendEmail', payload),
    saveDocxAs: (payload) => ipcRenderer.invoke('export:saveDocxAs', payload),
    savePdfAs: (payload) => ipcRenderer.invoke('export:savePdfAs', payload),
  },
  // Instellingen
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (updates) => ipcRenderer.invoke('settings:set', updates),
    selectDir: () => ipcRenderer.invoke('settings:selectDir'),
    selectLogo: () => ipcRenderer.invoke('settings:selectLogo'),
  },
});
