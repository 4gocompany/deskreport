import { PRIORITY_CONFIG, TaskCardProps } from '../tasks-data';
import { useDraggable } from '@dnd-kit/react';
import { AGENT_LABELS, findTaskAgent, useAgentsStore } from '../use-agents';

interface TaskCardComponentProps {
  task: TaskCardProps;
  projectName: string;
  onClick: () => void;
}

export function TaskCard({ task, projectName, onClick }: TaskCardComponentProps) {
  const priority = PRIORITY_CONFIG[task.priority];
  const { ref } = useDraggable({ id: task.id });
  const agent = useAgentsStore((state) => findTaskAgent(state.agents, task, projectName));

  return (
    <div
      id={task.id}
      ref={ref}
      key={task.id}
      onClick={onClick}
      className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-xl shadow-sm hover:border-blue-500 dark:hover:border-blue-500/50 transition-all group relative cursor-pointer'
    >
      <div className='flex items-center justify-between mb-2.5'>
        <div className='flex items-center gap-2'>
          <span
            className='text-[11px] font-medium text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 max-w-28 truncate'
          >
            {projectName}
          </span>
          {priority && <span className={`flex items-center gap-1 text-[11px] font-semibold ${priority.color}`}>{priority.label}</span>}
        </div>
        {task.assignees && task.assignees.length > 0 && (
          <div className='flex -space-x-1.5 overflow-hidden'>
            {task.assignees.slice(0, 3).map((a, i) => (
              <img
                key={i}
                src={a.avatar}
                className='w-6 h-6 rounded-full border border-white dark:border-zinc-900 bg-zinc-100 shadow-sm relative z-[1]'
                title={a.name}
              />
            ))}
            {task.assignees.length > 3 && (
              <div className='w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-white dark:border-zinc-900 flex items-center justify-center text-[10px] font-semibold text-zinc-500 z-[0]'>
                +{task.assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>

      <h4 className='text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2.5 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors'>
        {task.title}
      </h4>

      {agent && (
        <div className='flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-500/10 text-xs text-blue-700 dark:text-blue-300 mb-2'>
          <span className='w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0' />
          <span className='font-semibold shrink-0'>{AGENT_LABELS[agent.agent] || agent.agent}</span>
          <span className='truncate'>{agent.file || agent.action}</span>
        </div>
      )}

      <div className='flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/60'>
        <div className='flex items-center gap-2'>
          <span className='text-xs font-medium text-zinc-400 tabular-nums'>#{String(task.shortId || 0).padStart(3, '0')}</span>
          {task.tags && task.tags.length > 0 && (
            <div className='flex gap-1.5 border-l border-zinc-200 dark:border-zinc-800 pl-2'>
              {task.tags.slice(0, 2).map((tag) => {
                const color = (tag.color || 'bg-blue-500').split(' ')[0];
                return (
                  <div
                    key={tag.label}
                    className={`w-2 h-2 rounded-full ${color}`}
                    title={tag.label}
                  />
                );
              })}
            </div>
          )}
        </div>
        <span className='text-xs text-zinc-400 font-medium'>
          {new Date(task.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
