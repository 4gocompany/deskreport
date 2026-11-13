import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarClock, Check, CircleDollarSign, Gauge, MessageCircleQuestion, ServerOff } from 'lucide-react';
import { Button } from '../../components/ui';
import { authClient } from '../../lib/auth-client';
import { apiBase } from '../../api/fetcher';
import { useTenantStore } from '../../store';
import { OptionList } from '../tasks/components/option-list';
import { waitingQuestions } from '../tasks/tasks-data';
import { agentProfile } from '../tasks/use-agents';
import { useTaskStore } from '../tasks/use-task-store';
import { InboxCategory, InboxItem, dateDay, daysUntil, postpone, taskAgent, useInboxStore } from './use-inbox';

type InboxRowProps = {
  item: InboxItem;
  companyId: string;
  selected: boolean;
  onSelect: () => void;
  onOpenTask: (taskId: string) => void;
  onTerminal: (taskId: string) => void;
  tasksOnMachine: number;
};

const icons: Record<InboxCategory, typeof Gauge> = {
  po_signal: MessageCircleQuestion,
  quota: Gauge,
  cost: CircleDollarSign,
  execution_error: AlertTriangle,
  deadline: CalendarClock,
  system_log: ServerOff,
};

const tones = {
  danger: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30',
  warn: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
  info: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
};

function shortId(id?: number) {
  return '#' + String(id || 0).padStart(3, '0');
}

function since(date?: string) {
  if (!date) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  if (minutes < 60) return `há ${minutes} min`;
  if (minutes < 1440) return `há ${Math.floor(minutes / 60)} h`;
  return `há ${Math.floor(minutes / 1440)} d`;
}

function dueText(date: string | Date) {
  const days = daysUntil(date);
  if (days < 0) return `atrasado há ${-days} d`;
  if (days === 0) return 'vence hoje';
  return `vence em ${days} d`;
}

function InlineReply({ placeholder, label, disabled, onSubmit }: { placeholder: string; label: string; disabled: boolean; onSubmit: (text: string) => void }) {
  const [text, setText] = useState('');

  function send() {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText('');
  }

  return (
    <div className='flex items-center gap-2'>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && send()}
        placeholder={placeholder}
        className='flex-1 h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 outline-none focus:border-blue-500'
      />
      <Button size='sm' variant='outline' onClick={send} disabled={disabled || !text.trim()}>
        {label}
      </Button>
    </div>
  );
}

export function InboxRow({ item, companyId, selected, onSelect, onOpenTask, onTerminal, tasksOnMachine }: InboxRowProps) {
  const navigate = useNavigate();
  const { updateTask, addComment, dispatchTask } = useTaskStore();
  const { projects, fetchProjects } = useTenantStore();
  const dismiss = useInboxStore((state) => state.dismiss);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const { task, agent, machine, project } = item;
  const Icon = icons[item.category];
  const taskProject = task ? projects.find((p) => p.id === task.project)?.name : undefined;
  const title = task ? `${shortId(task.shortId)} ${task.title}` : project?.name || machine?.name || (agent ? agentProfile(agent.agent).name : '');
  const runner = task ? item.comment?.metadata?.agent || taskAgent(task) : undefined;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  async function dispatch(taskId: string, agentName: string) {
    const failure = await dispatchTask(taskId, agentName);
    if (failure) setError(failure);
  }

  function raiseBudget() {
    return updateTask(task!.id, { tokenBudget: (task!.tokenBudget || 50000) + 50000 });
  }

  function quota(action: 'continue' | 'drop') {
    return authClient.$fetch(`${apiBase}/agents/${agent!.agent}/quota/${action}`, {
      method: 'POST',
      headers: { 'x-organization-id': companyId },
    });
  }

  async function postponeProject() {
    await authClient.$fetch(`${apiBase}/projects/${project!.id}`, {
      method: 'PUT',
      body: { endDate: postpone(project!.endDate!, 7) },
      headers: { 'x-organization-id': companyId },
    });
    await fetchProjects(companyId);
  }

  function renderBody() {
    if (item.category === 'po_signal' && task?.waitingFor) {
      const { waitingFor } = task;
      const who = waitingFor.agent ? agentProfile(waitingFor.agent).name : waitingFor.authorName || 'A equipe';
      return (
        <>
          <p className='text-xs font-medium text-zinc-900 dark:text-zinc-100'>{who} perguntou:</p>
          <OptionList
            key={waitingFor.createdAt}
            questions={waitingQuestions(waitingFor)}
            recommended={!!waitingFor.agent}
            disabled={busy}
            onConfirm={(answers) => run(() => addComment(task.id, answers.join('\n'), waitingFor.agent, answers))}
          />
          <div className='flex gap-2'>
            <Button size='sm' variant='ghost' onClick={() => onOpenTask(task.id)}>Abrir tarefa</Button>
          </div>
        </>
      );
    }

    if (item.category === 'po_signal' && task) {
      return (
        <>
          <p className='text-sm text-zinc-600 dark:text-zinc-300'>Entrega pronta, esperando a sua validação.</p>
          <div className='flex gap-2'>
            <Button size='sm' onClick={() => run(() => updateTask(task.id, { status: 'done' }))} disabled={busy}>Aprovar e concluir</Button>
            <Button size='sm' variant='ghost' onClick={() => onOpenTask(task.id)}>Abrir tarefa</Button>
          </div>
          <InlineReply
            placeholder='Descreva o ajuste que falta'
            label='Pedir ajuste'
            disabled={busy}
            onSubmit={(text) => run(async () => {
              await addComment(task.id, text);
              await updateTask(task.id, { status: 'in-progress' });
            })}
          />
        </>
      );
    }

    if (item.category === 'quota' && agent) {
      return (
        <>
          <p className='text-sm text-zinc-600 dark:text-zinc-300'>
            {agent.alert || 'Agente pausado'}
            {agent.quotaUsed !== undefined && ` · ${agent.quotaUsed}% da cota usada`}
            {agent.quotaResetsAt && ` · renova ${new Date(agent.quotaResetsAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`}
            {agent.queued && agent.queued.length > 0 && ` · ${agent.queued.length} na fila`}
          </p>
          <div className='flex gap-2'>
            {(agent.quotaLevel === 'stop' || agent.state === 'paused') && (
              <Button size='sm' onClick={() => run(() => quota('continue'))} disabled={busy}>Autorizar e continuar</Button>
            )}
            {((agent.queued && agent.queued.length > 0) || agent.state === 'paused') && (
              <Button size='sm' variant='outline' onClick={() => run(() => quota('drop'))} disabled={busy}>Interromper fila</Button>
            )}
          </div>
        </>
      );
    }

    if (item.category === 'cost' && task) {
      const used = task.tokensUsed || 0;
      const budget = task.tokenBudget || 1;
      return (
        <>
          <div className='space-y-1'>
            <div className='h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden'>
              <div className={`h-full ${used >= budget ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(100, (used / budget) * 100)}%` }} />
            </div>
            <p className='text-xs text-zinc-500 tabular-nums'>{used.toLocaleString('pt-BR')} / {budget.toLocaleString('pt-BR')} tokens</p>
          </div>
          <div className='flex gap-2'>
            <Button size='sm' variant='outline' onClick={() => run(raiseBudget)} disabled={busy}>Aumentar orçamento (+50k)</Button>
            {used >= budget && runner && (
              <Button size='sm' onClick={() => run(async () => {
                await raiseBudget();
                await dispatch(task.id, runner);
              })} disabled={busy}>Aumentar e rodar</Button>
            )}
            <Button size='sm' variant='ghost' onClick={() => onOpenTask(task.id)}>Abrir tarefa</Button>
          </div>
          <InlineReply placeholder='Instrução para o agente' label='Enviar' disabled={busy} onSubmit={(text) => run(() => addComment(task.id, text, runner))} />
        </>
      );
    }

    if (item.category === 'execution_error' && task?.checklist?.haltedReason && !item.comment) {
      return (
        <>
          <p className='text-sm text-zinc-600 dark:text-zinc-300'>{task.checklist.haltedReason}</p>
          <div className='flex gap-2'>
            <Button size='sm' variant='outline' onClick={() => onOpenTask(task.id)}>Abrir tarefa</Button>
            {runner && <Button size='sm' onClick={() => run(() => dispatch(task.id, runner))} disabled={busy}>Tentar novamente</Button>}
          </div>
        </>
      );
    }

    if (item.category === 'execution_error' && task) {
      const code = item.comment?.metadata?.exitCode;
      return (
        <>
          <p className='text-sm text-zinc-600 dark:text-zinc-300'>
            {code !== undefined ? `${runner ? agentProfile(runner).name : 'Agente'} terminou com erro (código ${code}).` : 'Implementação não entregue: nenhum arquivo foi alterado.'}
          </p>
          <div className='flex gap-2'>
            {runner && <Button size='sm' onClick={() => run(() => dispatch(task.id, runner))} disabled={busy}>Tentar novamente</Button>}
            <Button size='sm' variant='outline' onClick={() => onTerminal(task.id)}>Ver terminal</Button>
            <Button size='sm' variant='ghost' onClick={() => dismiss([item.key])}>Dispensar</Button>
          </div>
          {runner && (
            <InlineReply placeholder='Oriente o agente e rode de novo' label='Enviar' disabled={busy} onSubmit={(text) => run(() => addComment(task.id, text, runner))} />
          )}
        </>
      );
    }

    if (item.category === 'deadline' && task?.dueDate) {
      return (
        <>
          <p className='text-sm text-zinc-600 dark:text-zinc-300'>Prazo: {dueText(task.dueDate)} ({dateDay(task.dueDate).split('-').reverse().join('/')}).</p>
          <div className='flex gap-2'>
            <Button size='sm' variant='outline' onClick={() => run(() => updateTask(task.id, { dueDate: postpone(task.dueDate!, 3) }))} disabled={busy}>Adiar +3 dias</Button>
            <Button size='sm' onClick={() => run(() => updateTask(task.id, { status: 'done' }))} disabled={busy}>Concluir</Button>
            <Button size='sm' variant='ghost' onClick={() => onOpenTask(task.id)}>Abrir tarefa</Button>
          </div>
          <InlineReply placeholder='Comentar na tarefa' label='Comentar' disabled={busy} onSubmit={(text) => run(() => addComment(task.id, text))} />
        </>
      );
    }

    if (item.category === 'deadline' && project?.endDate) {
      return (
        <>
          <p className='text-sm text-zinc-600 dark:text-zinc-300'>
            {project.completion_percentage ?? 0}% concluído · prazo: {dueText(project.endDate)} ({dateDay(project.endDate).split('-').reverse().join('/')})
          </p>
          <div className='flex gap-2'>
            <Button size='sm' variant='outline' onClick={() => run(postponeProject)} disabled={busy}>Adiar +7 dias</Button>
            <Button size='sm' variant='ghost' onClick={() => navigate(`/${companyId}/${project.id}/tasks/boards`)}>Ver tarefas</Button>
          </div>
        </>
      );
    }

    if (item.category === 'system_log' && machine) {
      return (
        <>
          <p className='text-sm text-zinc-600 dark:text-zinc-300 break-all'>
            {machine.workspaceRoot} · {tasksOnMachine} {tasksOnMachine === 1 ? 'tarefa depende' : 'tarefas dependem'} desta máquina
            {machine.lastSeenAt && ` · última conexão ${since(machine.lastSeenAt)}`}
          </p>
          <div className='flex gap-2'>
            <Button size='sm' variant='outline' onClick={() => navigate(`/${companyId}/settings/agents`)}>Configurar máquinas</Button>
            <Button size='sm' variant='ghost' onClick={() => dismiss([item.key])}>Dispensar</Button>
          </div>
        </>
      );
    }

    if (item.category === 'system_log' && agent) {
      return (
        <>
          <p className='text-sm text-zinc-600 dark:text-zinc-300'>{agent.alert || 'Bloqueado pelo provedor: só volta trocando o modelo.'}</p>
          <div className='flex gap-2'>
            <Button size='sm' variant='outline' onClick={() => navigate(`/${companyId}/settings/agents`)}>Configurar agentes</Button>
            {agent.taskId && <Button size='sm' variant='outline' onClick={() => onTerminal(agent.taskId!)}>Ver terminal</Button>}
          </div>
        </>
      );
    }

    return null;
  }

  const context = [taskProject, agent && item.category !== 'po_signal' ? agent.machineName : undefined].filter(Boolean).join(' · ');

  return (
    <div
      className={`flex gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 last:border-b-0 ${
        selected ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : ''
      }`}
    >
      <button
        type='button'
        onClick={onSelect}
        aria-label='Selecionar'
        className={`mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center ${
          selected ? 'bg-blue-600 border-blue-600 text-white' : 'border-zinc-300 dark:border-zinc-700'
        }`}
      >
        {selected && <Check size={12} strokeWidth={3} />}
      </button>
      <div className='flex-1 min-w-0 space-y-2'>
        <div className='flex items-center gap-2 min-w-0'>
          <Icon size={14} className='shrink-0 text-zinc-400' />
          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold shrink-0 ${tones[item.tone]}`}>{item.label}</span>
          <span className='text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate'>{title}</span>
          {context && <span className='text-xs text-zinc-400 truncate'>{context}</span>}
          <span className='ml-auto text-xs text-zinc-400 shrink-0'>{since(item.since)}</span>
        </div>
        {renderBody()}
        {error && <p className='text-xs text-red-500'>{error}</p>}
      </div>
    </div>
  );
}
