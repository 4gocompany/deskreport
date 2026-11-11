import { app, Menu, MenuItem, nativeImage, shell, Tray } from 'electron';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readYagniMode, toggleYagniMode, TrayState, watchTrayState } from './daemon';
import { openSettings, openWidget, toggleWidget } from './window';

const PANEL_URL = 'https://app.deskreport.com.br';

const TOOLTIPS: Record<TrayState, string> = {
  idle: 'DeskReport',
  working: 'DeskReport: agente trabalhando',
  alert: 'DeskReport: precisa de atenção',
};

// A barra de menus do macOS usa ícone de 18 pontos. O de 32 do Linux e do Windows aparecia com quase o dobro do tamanho
function trayIcon(state: TrayState) {
  const suffix = process.platform === 'darwin' ? '-mac' : '';
  return nativeImage.createFromPath(path.join(app.getAppPath(), 'build', `tray-${state}${suffix}.png`));
}

export function createTray() {
  const tray = new Tray(trayIcon('idle'));
  tray.setToolTip(TOOLTIPS.idle);
  watchTrayState((state) => {
    tray.setImage(trayIcon(state));
    tray.setToolTip(TOOLTIPS[state]);
  });

  if (process.platform === 'linux') {
    // AppIndicator não entrega clique esquerdo: o menu aparece em qualquer clique
    refreshLinuxMenu(tray);
    return tray;
  }

  tray.on('click', () => toggleWidget(tray.getBounds()));
  tray.on('right-click', () => popUpMenu(tray));
  return tray;
}

async function popUpMenu(tray: Tray) {
  tray.popUpContextMenu(await buildMenu(tray));
}

async function refreshLinuxMenu(tray: Tray) {
  tray.setContextMenu(await buildMenu(tray));
}

async function buildMenu(tray: Tray) {
  const yagniMode = await readYagniMode();

  return Menu.buildFromTemplate([
    { label: 'Abrir Widget', click: () => openWidget(tray.getBounds()) },
    { label: 'Abrir Painel Web', click: () => shell.openExternal(PANEL_URL) },
    { label: 'Configurações', click: () => openSettings(tray.getBounds()) },
    { type: 'separator' },
    {
      label: 'Modo Econômico (YAGNI)',
      type: 'checkbox',
      checked: yagniMode === true,
      enabled: yagniMode !== null,
      click: async () => {
        await toggleYagniMode();
        if (process.platform === 'linux') await refreshLinuxMenu(tray);
      },
    },
    {
      label: 'Iniciar com o Sistema',
      type: 'checkbox',
      checked: startsWithSystem(),
      click: (item: MenuItem) => {
        setStartWithSystem(item.checked);
        if (process.platform === 'linux') refreshLinuxMenu(tray);
      },
    },
    { type: 'separator' },
    { label: 'Sair do DeskReport', click: () => app.quit() },
  ]);
}

// O Electron não tem login item no Linux: lá vale o arquivo de autostart do desktop
const autostartFile = path.join(os.homedir(), '.config', 'autostart', 'deskreport.desktop');

function startsWithSystem() {
  if (process.platform === 'linux') return existsSync(autostartFile);
  return app.getLoginItemSettings().openAtLogin;
}

function setStartWithSystem(enabled: boolean) {
  if (process.platform !== 'linux') return app.setLoginItemSettings({ openAtLogin: enabled });
  if (!enabled) return rmSync(autostartFile, { force: true });
  mkdirSync(path.dirname(autostartFile), { recursive: true });
  writeFileSync(autostartFile, `[Desktop Entry]\nType=Application\nName=DeskReport\nExec="${process.env.APPIMAGE || process.execPath}"\nTerminal=false\n`);
}
