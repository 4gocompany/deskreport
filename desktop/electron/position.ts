export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const GAP = 8;

// Calcula onde abrir o popup colado no ícone da bandeja, sempre dentro da área útil da tela
export function widgetPosition(tray: Rect, size: { width: number; height: number }, area: Rect) {
  // Linux (AppIndicator) não informa a posição do ícone: abre no canto superior direito
  if (tray.width === 0 && tray.height === 0) {
    return { x: area.x + area.width - size.width - GAP, y: area.y + GAP };
  }

  const x = clamp(tray.x + tray.width / 2 - size.width / 2, area.x, area.x + area.width - size.width);
  // Bandeja na metade de cima da tela (menu bar, taskbar no topo): popup abaixo. Na de baixo: popup acima
  const onTop = tray.y < area.y + area.height / 2;
  const y = onTop ? tray.y + tray.height + GAP : tray.y - size.height - GAP;

  return {
    x: Math.round(x),
    y: Math.round(clamp(y, area.y, area.y + area.height - size.height)),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
