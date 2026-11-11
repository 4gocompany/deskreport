import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Page } from '../../components/layout/page';
import { Topbar } from '../../components/layout/topbar';
import { List, ListRow } from '../../components/ui/list';
import { useMachines } from '../../hooks/useMachines';
import { useTenantStore } from '../../store';
import { TaskDetailDrawer } from '../tasks/task-detail-drawer';
import { agentProfile, useAgentsStore } from '../tasks/use-agents';
import { useTaskStore } from '../tasks/use-task-store';

// Avisos são o que espera uma pessoa agora. Cada item some sozinho quando é resolvido, por isso não há "marcar como lido"
const taskColumns = '72px 1fr 160px 72px';
const statusColumns = '200px 1fr';

function shortId(id?: number) {
  return '#' + String(id || 0).padStart(3, '0');
}

function since(date?: string) {
  if (!date) return '';
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} h`;
  return `${Math.floor(minutes / 1440)} d`;
}

export default function Notifications() {
  const { company_id } = useParams();
  const { tasks, fetchTasks } = useTaskStore();
  const { projects, fetchProjects } = useTenantStore();
  const agents = useAgentsStore((state) => state.agents);
  const machines = useMachines(company_id);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!company_id) return;
    fetchTasks();
    fetchProjects(company_id);
  }, [company_id]);

  const questions = tasks.filter((task) => task.waitingFor);
  const releases = tasks.filter((task) => task.status === 'release' && !task.waitingFor);
  const pausedAgents = agents.filter((agent) => agent.alert || agent.state === 'paused');
  const offlineMachines = machines.filter((machine) => !machine.online);
  const empty = !questions.length && !releases.length && !pausedAgents.length && !offlineMachines.length;

  function projectName(id: string) {
    return projects.find((project) => project.id === id)?.name || id;
  }

  return (
    <Page navigation={[]}>
      <div className='flex flex-col h-full w-full'>
        <Topbar title='Avisos' inputSearch='off' />
        <div className='flex-1 overflow-y-auto p-6'>
          <div className='max-w-6xl mx-auto space-y-8'>
            {empty && <div className='text-center py-20 text-sm text-zinc-500'>Nada esperando você.</div>}

            {questions.length > 0 && (
              <section className='space-y-2'>
                <h2 className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>Perguntas dos agentes</h2>
                <List columns={taskColumns} headers={['Tarefa', 'Pergunta', 'Projeto', 'Há']}>
                  {questions.map((task) => (
                    <ListRow key={task.id} columns={taskColumns} onClick={() => setOpenTaskId(task.id)}>
                      <span className='text-xs text-zinc-400 tabular-nums'>{shortId(task.shortId)}</span>
                      <div className='min-w-0 truncate text-sm'>
                        <span className='font-medium text-zinc-900 dark:text-zinc-100'>{agentProfile(task.waitingFor!.agent).name}: </span>
                        <span className='text-zinc-600 dark:text-zinc-300'>{task.waitingFor!.question}</span>
                      </div>
                      <span className='text-sm text-zinc-500 truncate'>{projectName(task.project)}</span>
                      <span className='text-xs text-zinc-400'>{since(task.waitingFor!.createdAt)}</span>
                    </ListRow>
                  ))}
                </List>
              </section>
            )}

            {releases.length > 0 && (
              <section className='space-y-2'>
                <h2 className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>Prontas para testar</h2>
                <List columns={taskColumns} headers={['Tarefa', 'Título', 'Projeto', 'Há']}>
                  {releases.map((task) => (
                    <ListRow key={task.id} columns={taskColumns} onClick={() => setOpenTaskId(task.id)}>
                      <span className='text-xs text-zinc-400 tabular-nums'>{shortId(task.shortId)}</span>
                      <span className='text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate'>{task.title}</span>
                      <span className='text-sm text-zinc-500 truncate'>{projectName(task.project)}</span>
                      <span className='text-xs text-zinc-400'>{since(task.updatedAt)}</span>
                    </ListRow>
                  ))}
                </List>
              </section>
            )}

            {pausedAgents.length > 0 && (
              <section className='space-y-2'>
                <h2 className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>Agentes parados</h2>
                <List columns={statusColumns} headers={['Agente', 'Motivo']}>
                  {pausedAgents.map((agent) => (
                    <ListRow key={`${agent.machineName}-${agent.agent}`} columns={statusColumns}>
                      <span className='text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate'>
                        {agentProfile(agent.agent).name}
                        {agent.machineName && <span className='font-normal text-zinc-400'> · {agent.machineName}</span>}
                      </span>
                      <span className='text-sm text-zinc-600 dark:text-zinc-300 truncate'>{agent.alert || 'Pausado'}</span>
                    </ListRow>
                  ))}
                </List>
              </section>
            )}

            {offlineMachines.length > 0 && (
              <section className='space-y-2'>
                <h2 className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>Máquinas offline</h2>
                <List columns={statusColumns} headers={['Máquina', 'Pasta']}>
                  {offlineMachines.map((machine) => (
                    <ListRow key={machine.id} columns={statusColumns}>
                      <span className='text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate'>{machine.name}</span>
                      <span className='text-sm text-zinc-500 truncate'>{machine.workspaceRoot}</span>
                    </ListRow>
                  ))}
                </List>
              </section>
            )}
          </div>
        </div>
      </div>
      <TaskDetailDrawer task={tasks.find((task) => task.id === openTaskId) || null} isOpen={Boolean(openTaskId)} onClose={() => setOpenTaskId(null)} />
    </Page>
  );
}
