import { useState } from 'react';
import { Apple, Check, Copy, Download, Monitor, Terminal } from 'lucide-react';
import { agentProfile, useAgentsStore } from '../../tasks/use-agents';

const DOWNLOADS = [
  { label: 'Linux', detail: 'Qualquer distro, x64 ou arm64', href: '/downloads/deskreport-linux.tar.gz', icon: <Terminal size={18} /> },
  { label: 'macOS', detail: 'Apple Silicon e Intel', href: '/downloads/deskreport-macos.tar.gz', icon: <Apple size={18} /> },
  { label: 'Windows', detail: 'Windows 10 e 11, x64', href: '/downloads/deskreport-windows-x64.tar.gz', icon: <Monitor size={18} /> },
];

export function AgentsHub() {
  const agents = useAgentsStore((state) => state.agents);
  const [copied, setCopied] = useState('');

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
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Downloads</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {DOWNLOADS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              download
              className="flex items-center gap-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                {item.icon}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.label}</div>
                <div className="text-xs text-zinc-500">{item.detail}</div>
              </div>
              <Download size={16} className="text-zinc-400" />
            </a>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Time de agentes</h3>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
          {agents.length === 0 && (
            <p className="p-4 text-sm text-zinc-500">Nenhum agente conectado. Rode o deskreport setup na sua máquina para habilitar os agentes.</p>
          )}
          {agents.map((status) => {
            const member = agentProfile(status.agent);
            const working = status?.state === 'working';
            return (
              <div key={member.agent} className="flex items-center gap-4 p-4">
                <span className={`w-10 h-10 rounded-full ${member.color} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                  {member.initials}
                </span>
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{member.name}</div>
                  <div className="text-xs text-zinc-500 truncate">
                    {member.role}
                    {working && status.action ? `: ${[status.project, status.action].filter(Boolean).join(', ')}` : ''}
                  </div>
                </div>
                <span
                  className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${working
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                    }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${working ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
                  {working ? 'Trabalhando' : 'Disponível'}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
