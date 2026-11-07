import { AgentStatus } from './use-agents';
import { TaskCardProps } from './tasks-data';

export function taskSteps(task: Pick<TaskCardProps, 'complexity' | 'status'>) {
  if (task.complexity === 'high') return ['Especificação', 'Desenvolvimento', 'QA', 'Revisão', 'Deploy'];
  if (task.complexity === 'medium') return ['Especificação', 'Desenvolvimento', 'QA', 'Deploy'];
  if (task.status === 'review') return ['Desenvolvimento', 'QA', 'Revisão', 'Deploy'];
  return ['Desenvolvimento', 'QA', 'Deploy'];
}

export function activeStep(task: Pick<TaskCardProps, 'complexity' | 'status'>, agent?: AgentStatus) {
  const steps = taskSteps(task);
  if (agent?.state === 'working') {
    const action = `${agent.action || ''} ${agent.tool || ''}`.toLowerCase();
    if (agent.agent === 'antigravity' || /spec|analise|analista/.test(action)) return stepIndex(steps, 'Especificação');
    if (agent.agent === 'opencode' || /qa|test|valid/.test(action)) return stepIndex(steps, 'QA');
    if (/revis|review|commit|deploy|release/.test(action)) return stepIndex(steps, task.status === 'review' ? 'Revisão' : 'Deploy');
    return stepIndex(steps, 'Desenvolvimento');
  }
  if (task.status === 'done' || task.status === 'release') return steps.length - 1;
  if (task.status === 'review') return stepIndex(steps, 'Revisão', stepIndex(steps, 'QA'));
  if (task.status === 'in-progress') return stepIndex(steps, 'Desenvolvimento');
  return -1;
}

function stepIndex(steps: string[], name: string, fallback = 0) {
  const index = steps.indexOf(name);
  return index >= 0 ? index : fallback;
}
