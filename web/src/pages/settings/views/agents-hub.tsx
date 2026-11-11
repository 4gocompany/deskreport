import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Copy } from 'lucide-react';
import { agentProfile, useAgentsStore } from '../../tasks/use-agents';
import { AgentAvatar } from '../../tasks/components/agent-avatar';
import { Machine, useMachines } from '../../../hooks/useMachines';
import { List, ListRow } from '../../../components/ui/list';

const agentColumns = '220px 1fr 120px';

const roleLabels: Record<string, string> = {
  architecture: 'Arquitetura',
  engineering: 'Engenharia',
  review: 'Revisão',
  qa: 'QA',
  devops: 'DevOps',
  documentation: 'Documentação',
  support: 'Suporte',
};

// Os cargos ficam na configuração de cada máquina. Mostra os cargos do agente e em quais máquinas ele roda
function agentRoles(agent: string, machines: Machine[]) {
  const roles: string[] = [];
  const names: string[] = [];
  for (const machine of machines) {
    const list = machine.agentRoles?.[agent];
    if (!list) continue;
    names.push(machine.name);
    for (const role of list) if (!roles.includes(role)) roles.push(role);
  }
  return [roles.map((role) => roleLabels[role] || role).join(', '), names.join(', ')].filter(Boolean).join(' · ');
}

export function AgentsHub() {
  const agents = useAgentsStore((state) => state.agents);
  useAgentsStore((state) => state.profiles);
  const [copied, setCopied] = useState('');
  const { company_id } = useParams();
  const machines = useMachines(company_id);

  const commands = [
    { prompt: '$', command: `curl -fsSL ${window.location.origin}/install.sh | bash` },
    { prompt: 'PS>', command: `irm ${window.location.origin}/install.ps1 | iex` },
    { prompt: '$', command: 'deskreport setup' },
  ];

  function copy(command: string) {
    navigator.clipboard.writeText(command);
    setCopied(command);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Agentes</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Instale o DeskReport CLI na sua máquina e conecte o time de agentes à organização.</p>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Instalação rápida</h3>
        {commands.map(({ prompt, command }) => (
          <div key={command} className="flex items-center gap-3 rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3">
            <span className="text-zinc-500 font-mono text-sm">{prompt}</span>
            <code className="flex-1 font-mono text-sm text-zinc-100 truncate">{command}</code>
            <button onClick={() => copy(command)} className="text-zinc-500 hover:text-zinc-200" title="Copiar">
              {copied === command ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            </button>
          </div>
        ))}
        <p className="text-xs text-zinc-500">No Linux e macOS use o curl, no Windows rode o comando irm no PowerShell. O setup abre o navegador para você autorizar a máquina nesta organização.</p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Time de agentes</h3>
        {agents.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum agente conectado. Rode o deskreport setup na sua máquina para habilitar os agentes.</p>
        ) : (
          <List columns={agentColumns} headers={['Agente', 'Cargo e máquinas', 'Estado']}>
            {agents.map((status) => {
              const member = agentProfile(status.agent);
              const working = status?.state === 'working';
              return (
                <ListRow key={member.agent} columns={agentColumns}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AgentAvatar profile={member} className="w-6 h-6 rounded-full text-[10px] shrink-0" />
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{member.name}</span>
                    {member.nickname && <span className="text-xs text-zinc-400 truncate">{member.label}</span>}
                  </div>
                  <span className="text-sm text-zinc-500 truncate">
                    {working && status.action ? [status.project, status.action].filter(Boolean).join(', ') : agentRoles(member.agent, machines) || 'Sem cargo nas máquinas'}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <span className={`w-1.5 h-1.5 rounded-full ${working ? 'bg-blue-500 animate-pulse' : 'bg-zinc-400'}`} />
                    {working ? 'Trabalhando' : 'Disponível'}
                  </span>
                </ListRow>
              );
            })}
          </List>
        )}
      </section>
    </div>
  );
}
