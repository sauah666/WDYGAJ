
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  on: (channel, func) => {
    // Deliberately strip event as it includes sender 
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  }
});
