import { useState } from 'react';
import { Activity, X } from 'lucide-react';
import { AgentStatus, agentProfile, executionPlace, useAgentsStore } from '../../pages/tasks/use-agents';

const STORAGE_KEY = 'deskreport_statusbar_visible';

function formatTokens(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

// Verde trabalhando, amarelo com alerta de cota, cinza ocioso
function dotColor(agent: AgentStatus) {
  if (agent.alert || agent.state === 'paused') return 'bg-amber-400';
  if (agent.state === 'working') return 'bg-emerald-500 animate-pulse';
  return 'bg-zinc-500';
}

// Rodapé com a cota lida do provedor e os tokens da tarefa atual de cada agente
export function GlobalStatusBar() {
  const agents = useAgentsStore((state) => state.agents);
  const [visible, setVisible] = useState(localStorage.getItem(STORAGE_KEY) !== 'false');
  const machines = agents.map((agent) => agent.machineName).filter((name, i, list) => name && list.indexOf(name) === i);

  function toggle(value: boolean) {
    localStorage.setItem(STORAGE_KEY, String(value));
    setVisible(value);
  }

  if (!visible) {
    return (
      <button
        onClick={() => toggle(true)}
        className='fixed bottom-2 left-[86px] z-30 w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-zinc-100 flex items-center justify-center'
        title='Mostrar barra de status'
      >
        <Activity size={12} />
      </button>
    );
  }

  return (
    <footer className='h-8 shrink-0 bg-zinc-950 border-t border-zinc-800 flex items-center gap-5 px-4 text-[11px] font-mono text-zinc-400 z-30'>
      <span className='flex items-center gap-1.5 whitespace-nowrap'>
        <span className={`w-1.5 h-1.5 rounded-full ${agents.length > 0 ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
        {machines.length > 0 ? machines.join(' · ') : agents.length > 0 ? 'Máquina conectada' : 'Nenhuma máquina'}
      </span>

      <div className='flex-1 flex items-center gap-5 overflow-x-auto min-w-0'>
        {agents.map((agent) => (
          <span key={agent.agent} className='flex items-center gap-1.5 whitespace-nowrap' title={agent.alert || executionPlace(agent) || agent.action}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor(agent)}`} />
            <span className='text-zinc-200'>{agentProfile(agent.agent).name}</span>
            {agent.workspace && <span className='text-zinc-500'>{agent.workspace}</span>}
            {agent.quotaUsed != null && (
              <span className={agent.quotaUsed >= 60 ? 'text-amber-400' : ''}>{agent.quotaUsed}% cota usada</span>
            )}
            {agent.tokens != null && <span className='text-zinc-500'>{formatTokens(agent.tokens)} tokens</span>}
          </span>
        ))}
      </div>

      <button onClick={() => toggle(false)} className='text-zinc-500 hover:text-zinc-200' title='Ocultar barra de status'>
        <X size={13} />
      </button>
    </footer>
  );
}
