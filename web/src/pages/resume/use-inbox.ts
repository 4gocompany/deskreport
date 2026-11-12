import { useEffect } from 'react';
import { create } from 'zustand';
import { useMachines, Machine } from '../../hooks/useMachines';
import { useSession } from '../../lib/auth-client';
import { Project, useTenantStore } from '../../store';
import { AgentStatus, useAgentsStore } from '../tasks/use-agents';
import { TaskCardProps, TaskComment } from '../tasks/tasks-data';
import { useTaskStore } from '../tasks/use-task-store';

export type InboxCategory = 'po_signal' | 'quota' | 'cost' | 'execution_error' | 'deadline' | 'system_log';
export type InboxFilter = 'all' | 'po' | 'costs' | 'logs' | 'deadline';

export type InboxItem = {
  key: string;
  category: InboxCategory;
  // Texto curto do selo e a cor dele: danger para o que travou, warn para o que está perto, info para o que espera decisão
  label: string;
  tone: 'danger' | 'warn' | 'info';
  since?: string;
  task?: TaskCardProps;
  agent?: AgentStatus;
  machine?: Machine;
  project?: Project;
  // Comentário de erro de execução da tarefa
  comment?: TaskComment;
};

const dismissedKey = 'deskreport:inbox-dismissed';
const day = 86400000;

type InboxStore = {
  dismissed: string[];
  dismiss: (keys: string[]) => void;
};

export const useInboxStore = create<InboxStore>((set, get) => ({
  dismissed: JSON.parse(localStorage.getItem(dismissedKey) || '[]'),
  dismiss: (keys) => {
    const dismissed = [...get().dismissed, ...keys.filter((key) => !get().dismissed.includes(key))];
    localStorage.setItem(dismissedKey, JSON.stringify(dismissed));
    set({ dismissed });
  },
}));

export function categoryFilter(category: InboxCategory): InboxFilter {
  if (category === 'po_signal') return 'po';
  if (category === 'quota' || category === 'cost') return 'costs';
  if (category === 'deadline') return 'deadline';
  return 'logs';
}

// Datas de prazo são só o dia (YYYY-MM-DD), por isso a conta não usa horário
export function today() {
  return new Date().toLocaleDateString('en-CA');
}

export function daysUntil(date: string) {
  return date.slice ? (Date.parse(date.slice(0, 10)) - Date.parse(today())) / day : 0;
}

// Adia a partir de hoje quando o prazo já passou, senão a nova data continuaria vencida
export function postpone(date: string, days: number) {
  const base = daysUntil(date) < 0 ? today() : date.slice(0, 10);
  return new Date(Date.parse(base) + days * day).toISOString().slice(0, 10);
}

export function taskAgent(task: TaskCardProps) {
  const assignee = task.assignees?.find((user) => user.id.startsWith('agent-user-'));
  return assignee ? assignee.id.replace('agent-user-', '') : undefined;
}

export function newestComment(task: TaskCardProps, accept: (comment: TaskComment) => boolean) {
  const comments = (task.comments || []).filter(accept);
  return comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

function failedRun(task: TaskCardProps) {
  const last = newestComment(task, (comment) => comment.metadata?.exitCode !== undefined || comment.content.includes('Implementação não entregue'));
  if (last?.metadata?.error || last?.content.includes('Implementação não entregue')) return last;
}

// A pergunta aparece para quem pode responder: nunca para quem abriu, só para a pessoa PO do projeto quando há uma,
// e só depois de escalada quando o PO é um agente
function canAnswer(waitingFor: NonNullable<TaskCardProps['waitingFor']>, currentUserId?: string) {
  if (waitingFor.authorId && waitingFor.authorId === currentUserId) return false;
  if (!waitingFor.targetPoId) return true;
  if (waitingFor.targetPoId.startsWith('agent-user-')) return !!waitingFor.escalatedToHuman;
  return waitingFor.targetPoId === currentUserId;
}

export function buildInbox(tasks: TaskCardProps[], projects: Project[], agents: AgentStatus[], machines: Machine[], dismissed: string[], currentUserId?: string) {
  const items: InboxItem[] = [];
  const openTasks = tasks.filter((task) => task.status !== 'done');

  for (const task of tasks) {
    if (task.waitingFor && !canAnswer(task.waitingFor, currentUserId)) continue;
    if (task.waitingFor) items.push({ key: `ask-${task.id}`, category: 'po_signal', label: 'Pergunta', tone: 'info', since: task.waitingFor.createdAt, task });
    else if (task.status === 'release') items.push({ key: `release-${task.id}`, category: 'po_signal', label: 'Pronta para validar', tone: 'info', since: task.updatedAt, task });
  }

  for (const agent of agents) {
    const key = `${agent.machineId || ''}-${agent.agent}`;
    if (agent.quotaLevel === 'block') items.push({ key: `block-${key}`, category: 'system_log', label: 'Agente bloqueado', tone: 'danger', since: agent.updatedAt, agent });
    else if (agent.alert || agent.state === 'paused' || agent.quotaLevel || (agent.quotaUsed || 0) >= 80) {
      items.push({ key: `quota-${key}`, category: 'quota', label: 'Cota', tone: agent.quotaLevel === 'stop' ? 'danger' : 'warn', since: agent.updatedAt, agent });
    }
  }

  for (const task of openTasks) {
    if (task.tokenBudget && (task.tokensUsed || 0) / task.tokenBudget >= 0.8) {
      const spent = (task.tokensUsed || 0) >= task.tokenBudget;
      items.push({ key: `cost-${task.id}`, category: 'cost', label: spent ? 'Orçamento esgotado' : 'Orçamento perto do fim', tone: spent ? 'danger' : 'warn', since: task.updatedAt, task });
    }

    const failed = failedRun(task);
    if (failed) items.push({ key: `error-${task.id}-${failed.id}`, category: 'execution_error', label: 'Erro de execução', tone: 'danger', since: String(failed.createdAt), task, comment: failed });

    if (task.dueDate && daysUntil(task.dueDate) <= 3) {
      const late = daysUntil(task.dueDate) < 0;
      items.push({ key: `due-${task.id}`, category: 'deadline', label: late ? 'Atrasada' : 'Prazo próximo', tone: late ? 'danger' : 'warn', task });
    }
  }

  for (const project of projects) {
    if (project.status === 'active' && project.endDate && daysUntil(project.endDate) <= 7) {
      const late = daysUntil(project.endDate) < 0;
      items.push({ key: `project-${project.id}`, category: 'deadline', label: late ? 'Projeto atrasado' : 'Entrega próxima', tone: late ? 'danger' : 'warn', project });
    }
  }

  for (const machine of machines) {
    if (!machine.online) items.push({ key: `machine-${machine.id}`, category: 'system_log', label: 'Máquina offline', tone: 'danger', since: machine.lastSeenAt || undefined, machine });
  }

  return items.filter((item) => !dismissed.includes(item.key));
}

// Tudo que espera uma pessoa na organização ativa. Cada item some sozinho quando o problema é resolvido
export function useInbox(companyId?: string) {
  const { tasks, fetchTasks } = useTaskStore();
  const { projects, fetchProjects } = useTenantStore();
  const agents = useAgentsStore((state) => state.agents);
  const dismissed = useInboxStore((state) => state.dismissed);
  const machines = useMachines(companyId);
  const { data: session } = useSession();

  useEffect(() => {
    if (!companyId) return;
    fetchTasks();
    fetchProjects(companyId);
  }, [companyId, fetchTasks, fetchProjects]);

  return buildInbox(tasks, projects, agents, machines, dismissed, session?.user.id);
}
