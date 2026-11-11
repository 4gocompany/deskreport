import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Page } from '../../components/layout/page';
import { Topbar } from '../../components/layout/topbar';
import { Button } from '../../components/ui';
import { TaskDetailDrawer } from '../tasks/task-detail-drawer';
import { TaskTerminalDialog } from '../tasks/components/task-terminal-dialog';
import { useTaskStore } from '../tasks/use-task-store';
import { InboxRow } from './inbox-row';
import { InboxFilter, categoryFilter, postpone, useInbox, useInboxStore } from './use-inbox';

const filters: { id: InboxFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'po', label: 'Product Owner' },
  { id: 'costs', label: 'Cotas e Custos' },
  { id: 'logs', label: 'Execução e Logs' },
  { id: 'deadline', label: 'Deadlines' },
];

export default function Resume() {
  const { company_id } = useParams();
  const { tasks, updateTask } = useTaskStore();
  const dismiss = useInboxStore((state) => state.dismiss);
  const items = useInbox(company_id);
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [terminalTaskId, setTerminalTaskId] = useState<string | null>(null);

  const visible = items.filter((item) => filter === 'all' || categoryFilter(item.category) === filter);
  const picked = items.filter((item) => selected.includes(item.key));
  const allSelected = visible.length > 0 && visible.every((item) => selected.includes(item.key));

  const pickedTasks = picked.filter((item) => item.task);
  const pickedCosts = picked.filter((item) => item.category === 'cost');
  const pickedDeadlines = picked.filter((item) => item.category === 'deadline' && item.task);
  const pickedDismissable = picked.filter((item) => item.category === 'execution_error' || item.category === 'system_log');

  function toggle(key: string) {
    setSelected(selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key]);
  }

  function toggleAll() {
    const keys = visible.map((item) => item.key);
    setSelected(allSelected ? selected.filter((key) => !keys.includes(key)) : [...selected, ...keys.filter((key) => !selected.includes(key))]);
  }

  async function finishTasks() {
    for (const item of pickedTasks) await updateTask(item.task!.id, { status: 'done' });
    setSelected([]);
  }

  async function raiseBudgets() {
    for (const item of pickedCosts) await updateTask(item.task!.id, { tokenBudget: (item.task!.tokenBudget || 50000) + 50000 });
    setSelected([]);
  }

  async function postponeDeadlines() {
    for (const item of pickedDeadlines) await updateTask(item.task!.id, { dueDate: postpone(item.task!.dueDate!, 3) });
    setSelected([]);
  }

  function dismissPicked() {
    dismiss(pickedDismissable.map((item) => item.key));
    setSelected([]);
  }

  return (
    <Page navigation={[]}>
      <div className='flex flex-col h-full w-full'>
        <Topbar title='Início' inputSearch='off' />
        <div className='flex-1 overflow-y-auto p-6'>
          <div className='max-w-6xl mx-auto space-y-4'>
            <div className='flex flex-wrap gap-2'>
              {filters.map(({ id, label }) => {
                const count = items.filter((item) => id === 'all' || categoryFilter(item.category) === id).length;
                return (
                  <button
                    key={id}
                    type='button'
                    onClick={() => setFilter(id)}
                    className={`h-8 px-3 rounded-full border text-xs font-medium transition-colors ${
                      filter === id
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>

            {visible.length === 0 ? (
              <div className='text-center py-20 text-sm text-zinc-500'>Nada esperando você.</div>
            ) : (
              <div className='rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60'>
                <div className='flex items-center gap-3 px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800'>
                  <button
                    type='button'
                    onClick={toggleAll}
                    aria-label='Selecionar todos visíveis'
                    className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center ${
                      allSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-zinc-300 dark:border-zinc-700'
                    }`}
                  >
                    {allSelected && <Check size={12} strokeWidth={3} />}
                  </button>
                  <span className='text-xs text-zinc-500'>
                    {picked.length > 0 ? `${picked.length} selecionados` : 'Selecionar todos visíveis'}
                  </span>
                  {picked.length > 0 && (
                    <div className='ml-auto flex flex-wrap gap-2'>
                      {pickedTasks.length > 0 && <Button size='sm' onClick={finishTasks}>Concluir tarefas</Button>}
                      {pickedCosts.length > 0 && <Button size='sm' variant='outline' onClick={raiseBudgets}>Aumentar orçamento (+50k)</Button>}
                      {pickedDeadlines.length > 0 && <Button size='sm' variant='outline' onClick={postponeDeadlines}>Adiar prazo (+3 dias)</Button>}
                      {pickedDismissable.length > 0 && <Button size='sm' variant='outline' onClick={dismissPicked}>Dispensar avisos</Button>}
                      <Button size='sm' variant='ghost' onClick={() => setSelected([])}>Limpar seleção</Button>
                    </div>
                  )}
                </div>
                {visible.map((item) => (
                  <InboxRow
                    key={item.key}
                    item={item}
                    companyId={company_id || ''}
                    selected={selected.includes(item.key)}
                    onSelect={() => toggle(item.key)}
                    onOpenTask={setOpenTaskId}
                    onTerminal={setTerminalTaskId}
                    tasksOnMachine={tasks.filter((task) => task.status !== 'done' && task.machineId === item.machine?.id).length}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <TaskDetailDrawer task={tasks.find((task) => task.id === openTaskId) || null} isOpen={Boolean(openTaskId)} onClose={() => setOpenTaskId(null)} />
      {terminalTaskId && <TaskTerminalDialog taskId={terminalTaskId} isOpen onClose={() => setTerminalTaskId(null)} />}
    </Page>
  );
}
