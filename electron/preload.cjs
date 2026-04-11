const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // App
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
  },
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
    scanDocxVars: (filePath) => ipcRenderer.invoke('templates:scanDocxVars', filePath),
    duplicate: (id) => ipcRenderer.invoke('templates:duplicate', id),
    toggleFavoriet: (id) => ipcRenderer.invoke('templates:toggleFavoriet', id),
  },
  // Klanten
  klanten: {
    getAll: () => ipcRenderer.invoke('klanten:getAll'),
    save: (klant) => ipcRenderer.invoke('klanten:save', klant),
    delete: (id) => ipcRenderer.invoke('klanten:delete', id),
    selecteerCsv: () => ipcRenderer.invoke('klanten:selecteerCsv'),
  },
  // Concepten
  concepten: {
    getAll: () => ipcRenderer.invoke('concepten:getAll'),
    getByTemplate: (templateId) => ipcRenderer.invoke('concepten:getByTemplate', templateId),
    save: (payload) => ipcRenderer.invoke('concepten:save', payload),
    delete: (templateId) => ipcRenderer.invoke('concepten:delete', templateId),
  },
  // Export
  export: {
    generateDocx: (payload) => ipcRenderer.invoke('export:generateDocx', payload),
    tekenDocument: (payload) => ipcRenderer.invoke('export:tekenDocument', payload),
    openInWord: (filePath) => ipcRenderer.invoke('export:openInWord', filePath),
    exportPdf: (docxPath) => ipcRenderer.invoke('export:exportPdf', docxPath),
    openPdf: (pdfPath) => ipcRenderer.invoke('export:openPdf', pdfPath),
    print: (filePath) => ipcRenderer.invoke('export:print', filePath),
    sendEmail: (payload) => ipcRenderer.invoke('export:sendEmail', payload),
    saveDocxAs: (payload) => ipcRenderer.invoke('export:saveDocxAs', payload),
    savePdfAs: (payload) => ipcRenderer.invoke('export:savePdfAs', payload),
    bulkGenereer: (payload) => ipcRenderer.invoke('export:bulkGenereer', payload),
    saveDocxToDir: (payload) => ipcRenderer.invoke('export:saveDocxToDir', payload),
  },
  // Instellingen
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (updates) => ipcRenderer.invoke('settings:set', updates),
    selectDir: () => ipcRenderer.invoke('settings:selectDir'),
    selectGedeeldeDir: () => ipcRenderer.invoke('settings:selectGedeeldeDir'),
    selectLogo: () => ipcRenderer.invoke('settings:selectLogo'),
    selectHandtekening: (naam) => ipcRenderer.invoke('settings:selectHandtekening', naam),
    getOneDrivePad: () => ipcRenderer.invoke('settings:getOneDrivePad'),
  },
  // Geschiedenis
  history: {
    getAll: () => ipcRenderer.invoke('history:getAll'),
    add: (entry) => ipcRenderer.invoke('history:add', entry),
    delete: (id) => ipcRenderer.invoke('history:delete', id),
  },
  // KVK
  kvk: {
    selectPdf: () => ipcRenderer.invoke('kvk:selectPdf'),
    scanPdf: (filePath) => ipcRenderer.invoke('kvk:scanPdf', filePath),
  },
  // Bedrijvenmonitor opzoeken
  bedrijf: {
    zoek: (payload) => ipcRenderer.invoke('bedrijf:zoek', payload),
  },
  // Admin hulpfuncties
  admin: {
    opruimen: () => ipcRenderer.invoke('admin:opruimen'),
  },
  // Standaard teksten (Visionplanner dossiernotities)
  standaardTeksten: {
    getAll:      ()      => ipcRenderer.invoke('standaardTeksten:getAll'),
    save:        (item)  => ipcRenderer.invoke('standaardTeksten:save', item),
    delete:      (id)    => ipcRenderer.invoke('standaardTeksten:delete', id),
    reorderAll:  (items) => ipcRenderer.invoke('standaardTeksten:reorderAll', items),
  },
});
