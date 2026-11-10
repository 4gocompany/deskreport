import { app, BrowserWindow, screen } from 'electron';
import { Rect, widgetPosition } from './position';

const WIDGET_ORIGIN = 'http://127.0.0.1:4399';
const WIDGET_URL = `${WIDGET_ORIGIN}/widget`;
const WIDGET_WIDTH = 380;
const WIDGET_HEIGHT = 560;
// Clique na bandeja para fechar o popup dispara primeiro o blur, então ignoramos o reabrir logo em seguida
const REOPEN_BLOCK_MS = 300;

let widget: BrowserWindow | null = null;
let hiddenByBlurAt = 0;

export function createWidget() {
  widget = new BrowserWindow({
    width: WIDGET_WIDTH,
    height: WIDGET_HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    roundedCorners: true,
    backgroundColor: '#09090b',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged,
    },
  });

  widget.on('blur', hideOnBlur);
  widget.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  widget.webContents.on('will-navigate', (event: Electron.Event, url: string) => {
    if (!url.startsWith(WIDGET_ORIGIN)) event.preventDefault();
  });
  widget.loadURL(WIDGET_URL).catch((error: Error) => console.error('Daemon local indisponível:', error.message));
}

export function toggleWidget(trayBounds: Rect) {
  if (!widget) return;
  if (widget.isVisible()) return hideWidget();
  if (Date.now() - hiddenByBlurAt < REOPEN_BLOCK_MS) return;
  openWidget(trayBounds);
}

export function openWidget(trayBounds: Rect) {
  if (!widget) return;
  const center = { x: trayBounds.x + trayBounds.width / 2, y: trayBounds.y + trayBounds.height / 2 };
  const area = screen.getDisplayNearestPoint(center).workArea;
  const { x, y } = widgetPosition(trayBounds, { width: WIDGET_WIDTH, height: WIDGET_HEIGHT }, area);
  widget.setPosition(x, y);
  widget.show();
  widget.focus();
}

function hideWidget() {
  widget?.hide();
}

function hideOnBlur() {
  hiddenByBlurAt = Date.now();
  hideWidget();
}
