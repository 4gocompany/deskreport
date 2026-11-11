import { app } from 'electron';
import { ensureDaemon } from './daemon';
import { createTray } from './tray';
import { createWidget, openWidget } from './window';

// Uma única instância: o app vive na bandeja, e abrir de novo (Launchpad, menu ou deskreport widget) mostra o widget
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // Sem janela aberta o Electron ignora o SIGTERM: o deskreport stop e o desligamento do sistema precisam encerrar o app
  process.on('SIGTERM', () => app.quit());
  app.whenReady().then(() => {
    app.dock?.hide();
    ensureDaemon();
    createWidget();
    const tray = createTray();
    openWidget(tray.getBounds());
    app.on('second-instance', () => openWidget(tray.getBounds()));
    // No macOS reabrir um app que já está rodando chega como activate, não como segunda instância
    app.on('activate', () => openWidget(tray.getBounds()));
  });
}
