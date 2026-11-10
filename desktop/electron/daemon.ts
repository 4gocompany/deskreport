import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DAEMON_URL = 'http://127.0.0.1:4399';
const TIMEOUT_MS = 1500;

// Lê o primeiro evento do SSE (estado atual do daemon) e fecha a conexão. Retorna null se o daemon não responder
export async function readYagniMode(): Promise<boolean | null> {
  try {
    const response = await fetch(`${DAEMON_URL}/events`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    const reader = response.body?.getReader();
    if (!reader) return null;

    const decoder = new TextDecoder();
    let text = '';
    while (!text.includes('\n\n')) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    await reader.cancel();

    const state = JSON.parse(text.slice('data: '.length, text.indexOf('\n\n')));
    return Boolean(state.yagniMode);
  } catch {
    return null;
  }
}

export type TrayState = 'idle' | 'working' | 'alert';

type DaemonState = { connected?: boolean; busy?: boolean; agents?: { alert?: string; state?: string }[] };

// Alerta de cota ou agente pausado vale mais que trabalho em andamento
function trayState(state: DaemonState): TrayState {
  if (state.agents?.some((agent) => agent.alert || agent.state === 'paused')) return 'alert';
  if (state.busy) return 'working';
  return 'idle';
}

// Acompanha o SSE do daemon e avisa quando o estado da bandeja muda. Daemon offline tenta de novo a cada 5s
export async function watchTrayState(onChange: (state: TrayState) => void) {
  let last: TrayState | null = null;
  function emit(state: TrayState) {
    if (state === last) return;
    last = state;
    onChange(state);
  }

  while (true) {
    try {
      const response = await fetch(`${DAEMON_URL}/events`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('SSE sem corpo');
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';
        for (const event of events) {
          if (event.startsWith('data: ')) emit(trayState(JSON.parse(event.slice('data: '.length))));
        }
      }
    } catch {
      // Daemon fora do ar: volta para o ícone padrão
    }
    emit('idle');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

// O daemon aceita POST só com Origin igual ao próprio host, como faz o widget
export async function toggleYagniMode() {
  try {
    await fetch(`${DAEMON_URL}/skills/toggle-yagni`, {
      method: 'POST',
      headers: { Origin: DAEMON_URL, 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // Daemon offline: o menu mostra o estado real na próxima abertura
  }
}

// O app só mostra o estado: quem roda os agentes é o daemon instalado pelo install.sh. Se ele estiver parado, sobe em segundo plano
export async function ensureDaemon() {
  if ((await readYagniMode()) !== null) return;
  const launcher = path.join(os.homedir(), '.deskreport', 'bin', process.platform === 'win32' ? 'deskreport.cmd' : 'deskreport');
  if (!existsSync(launcher)) return;
  spawn(launcher, ['--background'], { detached: true, stdio: 'ignore', shell: process.platform === 'win32' }).unref();
}
