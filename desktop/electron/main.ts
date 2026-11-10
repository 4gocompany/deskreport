import { app } from 'electron';
import { ensureDaemon } from './daemon';
import { createTray } from './tray';
import { createWidget } from './window';

// Uma única instância: o app vive só na bandeja, então a segunda abertura apenas encerra
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // Sem janela aberta o Electron ignora o SIGTERM: o deskreport stop e o desligamento do sistema precisam encerrar o app
  process.on('SIGTERM', () => app.quit());
  app.whenReady().then(() => {
    app.dock?.hide();
    ensureDaemon();
    createWidget();
    createTray();
  });
}
