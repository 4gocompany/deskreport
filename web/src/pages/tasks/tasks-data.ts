import type { LucideIcon } from 'lucide-react';
import { BookOpen, Bug, Flame, RefreshCw, Shield, Sparkles } from 'lucide-react';

export type TaskStatus = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done' | 'release';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskType = 'feature' | 'bugfix' | 'hotfix' | 'security' | 'refactor' | 'documentation';

export type TaskComment = {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  metadata?: {
    agent?: string;
    harness?: string;
    model?: string;
    exitCode?: number;
    error?: boolean;
    stage?: string;
    changelog?: string;
    touchedFiles?: string[];
    haltedReason?: string;
    poAnswer?: { answeredBy: 'human' | 'agent'; source?: string; items: { header?: string; question: string; answer: string }[] };
  } | null;
  createdAt: string | Date;
  user: {
    id?: string;
    name: string;
    image?: string;
  }
}

// Pergunta aberta por um agente ou pela equipe: enquanto existir, a tarefa não vai para Release
export type WaitingOption = { label: string; description?: string };
export type WaitingQuestion = { header?: string; question: string; options: WaitingOption[]; multiSelect?: boolean };

export type TaskWaitingFor = {
  agent?: string;
  stage?: string;
  authorId?: string;
  authorName?: string;
  targetPoId?: string | null;
  escalatedToHuman?: boolean;
  questions?: WaitingQuestion[];
  question: string;
  options?: string[];
  multiSelect?: boolean;
  createdAt: string;
}

// Pergunta aberta antes do lote não tem questions: vira uma pergunta só
export function waitingQuestions(waitingFor: TaskWaitingFor): WaitingQuestion[] {
  if (waitingFor.questions?.length) return waitingFor.questions;
  return [{ question: waitingFor.question, options: (waitingFor.options || []).map((label) => ({ label })), multiSelect: waitingFor.multiSelect }];
}

export type ChecklistRole = 'engineering' | 'review' | 'qa' | 'devops';
export type ChecklistItemStatus = 'pending' | 'done' | 'not_done' | 'na' | 'conflict';

export type ChecklistItem = {
  id: string;
  role: ChecklistRole;
  text: string;
  status: ChecklistItemStatus;
  reason?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export type ExtraDelivery = {
  id: string;
  role: ChecklistRole;
  agent: string;
  text: string;
  reason: string;
  createdAt: string;
}

export type TaskChecklist = {
  items: ChecklistItem[];
  extraDeliveries: ExtraDelivery[];
  haltedReason?: string | null;
  updatedAt: string;
}

export function checklistProgress(checklist?: TaskChecklist | null) {
  const items = checklist?.items || [];
  return { total: items.length, done: items.filter((item) => item.status !== 'pending' && item.status !== 'not_done').length };
}

export type TaskCardProps = {
  id: string;
  shortId?: number;
  title: string;
  project: string;
  status: TaskStatus;
  priority: TaskPriority;
  complexity?: 'pending' | 'low' | 'medium' | 'high';
  type?: TaskType;
  createdAt: string;
  updatedAt?: string;
  assigneeIds?: string[] | null;
  teamId?: string | null;
  comments?: TaskComment[];
  assignees?: {
    id: string;
    name: string;
    image?: string | null;
  }[];
  team?: {
    id: string;
    name: string;
  };
  tags?: { label: string; color: string }[];
  description?: string;
  tokensUsed?: number;
  tokenBudget?: number;
  dueDate?: string | null;
  machineId?: string | null;
  waitingFor?: TaskWaitingFor | null;
  checklist?: TaskChecklist | null;
  specEditedBy?: string | null;
  specEditedAt?: string | null;
}

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  'backlog': { label: 'Backlog', color: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700' },
  'todo': { label: 'Para fazer', color: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700' },
  'in-progress': { label: 'Em andamento', color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30' },
  'review': { label: 'Revisão', color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30' },
  'release': { label: 'Release', color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' },
  'done': { label: 'Concluído', color: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700/50' }
};

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; icon: string }> = {
  'low': { label: 'Baixa', color: 'text-zinc-400', icon: '↓' },
  'medium': { label: 'Média', color: 'text-blue-500', icon: '●' },
  'high': { label: 'Alta', color: 'text-orange-500', icon: '↑' },
  'urgent': { label: 'Urgente', color: 'text-red-500', icon: '▲' }
};

// Tipo GitFlow da tarefa: rótulo, cor do destaque e ícone dos chips e do badge no card
export const TASK_TYPE_CONFIG: Record<TaskType, { label: string; color: string; icon: LucideIcon }> = {
  feature: { label: 'Feature', color: 'text-blue-500', icon: Sparkles },
  bugfix: { label: 'Bugfix', color: 'text-amber-500', icon: Bug },
  hotfix: { label: 'Hotfix', color: 'text-red-500', icon: Flame },
  security: { label: 'Segurança', color: 'text-purple-500', icon: Shield },
  refactor: { label: 'Refatoração', color: 'text-zinc-500', icon: RefreshCw },
  documentation: { label: 'Documentação', color: 'text-teal-500', icon: BookOpen },
};
