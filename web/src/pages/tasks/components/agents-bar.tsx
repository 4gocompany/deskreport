import { AGENT_LABELS, useAgentsStore } from '../use-agents';

export function AgentsBar() {
  const agents = useAgentsStore((state) => state.agents);

  return (
    <div className='flex items-center gap-2 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800/60 overflow-x-auto'>
      {agents.map((agent) => {
        const working = agent.state === 'working';
        return (
          <div
            key={agent.agent}
            className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] whitespace-nowrap ${
              working
                ? 'border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${working ? 'bg-blue-500 animate-pulse' : 'bg-zinc-400'}`} />
            <span className='font-bold'>{AGENT_LABELS[agent.agent] || agent.agent}</span>
            {working ? (
              <span className='max-w-80 truncate'>
                {[agent.project, agent.action].filter(Boolean).join(' · ')}
              </span>
            ) : (
              <span>Ocioso</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
