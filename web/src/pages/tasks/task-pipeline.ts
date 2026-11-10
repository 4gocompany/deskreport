import { AgentStatus } from './use-agents';
import { TaskCardProps } from './tasks-data';

// Toda tarefa passa pela Especificação, que é onde a complexidade é classificada
export function taskSteps() {
  return ['Especificação', 'Desenvolvimento', 'QA', 'Revisão', 'Deploy'];
}

// A etapa ativa segue o status e o que o agente está fazendo, nunca o nome do agente sozinho
export function activeStep(task: Pick<TaskCardProps, 'complexity' | 'status'>, agent?: AgentStatus) {
  const steps = taskSteps();
  if (task.status === 'done' || task.status === 'release') return steps.length - 1;

  if (agent?.state === 'working') {
    const action = `${agent.action || ''} ${agent.tool || ''}`.toLowerCase();
    if (task.status === 'review' || /revis|review/.test(action)) return stepIndex(steps, 'Revisão');
    if (/deploy|release/.test(action)) return stepIndex(steps, 'Deploy');
    if (/spec|analise|analista/.test(action)) return stepIndex(steps, 'Especificação');
    if (/qa|test|valid/.test(action)) return stepIndex(steps, 'QA');
    return stepIndex(steps, 'Desenvolvimento');
  }

  if (task.status === 'review') return stepIndex(steps, 'Revisão');
  if (task.status === 'in-progress') return stepIndex(steps, 'Desenvolvimento');
  return -1;
}

// Etapa que não existe na tarefa cai em Desenvolvimento, sem voltar para o início da esteira
function stepIndex(steps: string[], name: string) {
  const index = steps.indexOf(name);
  return index >= 0 ? index : steps.indexOf('Desenvolvimento');
}
