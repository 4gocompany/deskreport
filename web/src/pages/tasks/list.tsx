import { Page } from '../../components/layout/page';
import { Topbar } from '../../components/layout/topbar';
import { useParams } from 'react-router-dom';
import { MoreVertical, Plus, Users2 } from 'lucide-react';
import { STATUS_CONFIG } from './tasks-data';
import { useTaskStore } from './use-task-store';
import { useTaskFilters } from './use-task-filters';
import { TaskFiltersComponent } from './task-filters-component';
import { TaskDetailDrawer } from './task-detail-drawer';
import { Button } from '../../components/ui/button';
import { useState, useEffect } from 'react';

export function TaskList() {
  const { company_id, project_id } = useParams();
  const cId = company_id || '4go';
  const pId = project_id || 'deskreport';

  const { tasks, fetchTasks } = useTaskStore();

  useEffect(() => {
    if (company_id) fetchTasks();
  }, [company_id, fetchTasks]);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = selectedTaskId ? (tasks.find(t => t.id === selectedTaskId) || null) : null;
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const {
    search,
    setSearch,
    selectedStatus,
    setSelectedStatus,
    selectedProject,
    setSelectedProject,
    projects,
    selectedAssignee,
    setSelectedAssignee,
    assignees,
    selectedPriority,
    setSelectedPriority,
    sortBy,
    setSortBy,
    groupBy,
    setGroupBy,
    filteredTasks
  } = useTaskFilters(tasks);

  const navigation = [
    { name: 'Quadros', to: `/${cId}/${pId}/tasks/boards` },
    { name: 'Em Lista', to: `/${cId}/${pId}/tasks/list` },
    { name: 'Gestão de Dados', to: `/${cId}/${pId}/tasks/management` },
  ]

  const clearFilters = () => {
    setSearch('');
    setSelectedStatus('all');
    setSelectedProject('all');
    setSelectedAssignee('all');
    setSelectedPriority('all');
    setSortBy('newest');
    setGroupBy('status');
  };

  return (
    <Page navigation={navigation}>
      <Topbar title='Tarefas' smartHeader inputSearch='off'>
        <div className='flex items-center gap-3'>
          <TaskFiltersComponent
            search={search}
            setSearch={setSearch}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            selectedProject={selectedProject}
            setSelectedProject={setSelectedProject}
            projects={projects}
            selectedAssignee={selectedAssignee}
            setSelectedAssignee={setSelectedAssignee}
            assignees={assignees}
            selectedPriority={selectedPriority}
            setSelectedPriority={setSelectedPriority}
            sortBy={sortBy}
            setSortBy={setSortBy}
            groupBy={groupBy}
            setGroupBy={setGroupBy}
            onClear={clearFilters}
          />
          <div className='w-px h-3.5 bg-zinc-200 dark:bg-zinc-800' />
          <Button size="md" className='gap-1.5' onClick={() => { setSelectedTaskId(null); setIsDetailOpen(true); }}>
            <Plus size={12} />
            Tarefa
          </Button>
        </div>
      </Topbar>

      <div className='flex-1 overflow-auto p-6 transition-colors'>
        <div className='max-w-6xl mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden flex flex-col'>
          <table className='w-full text-left border-collapse table-fixed'>
            <thead>
              <tr className='border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50'>
                <th className='py-3 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 w-20'>ID</th>
                <th className='py-3 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400'>
                  Título
                </th>
                <th className='py-3 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 w-48'>
                  Responsável
                </th>
                <th className='py-3 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 w-40'>
                  Equipe
                </th>
                <th className='py-3 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 w-36'>
                  Status
                </th>
                <th className='py-3 px-2 w-12'></th>
              </tr>
            </thead>
            <tbody className='divide-y divide-zinc-200 dark:divide-zinc-800'>
              {filteredTasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => { setSelectedTaskId(task.id); setIsDetailOpen(true); }}
                  className='hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors group cursor-pointer'
                >
                  <td className='py-2.5 px-4 text-xs font-medium text-zinc-400 tabular-nums'>
                    #{String(task.shortId || 0).padStart(3, '0')}
                  </td>
                  <td className='py-2.5 px-4'>
                    <div className='flex items-center gap-2.5'>
                      <span className='group-hover:text-blue-600 dark:group-hover:text-blue-400 text-sm font-medium text-zinc-900 dark:text-zinc-100 transition-colors truncate'>
                        {task.title}
                      </span>
                    </div>
                  </td>
                  <td className='py-2.5 px-4'>
                    {task.assignees && task.assignees.length > 0 ? (
                      <div className='flex items-center -space-x-1.5'>
                        {task.assignees.map((a, i) => (
                          <img
                            key={i}
                            src={a.avatar}
                            className='w-6 h-6 rounded-full border border-white dark:border-zinc-900 bg-zinc-100 shadow-sm'
                            title={a.name}
                          />
                        ))}
                        {task.assignees.length === 1 && (
                          <span className='text-xs text-zinc-600 dark:text-zinc-300 font-medium truncate ml-3'>{task.assignees[0].name}</span>
                        )}
                        {task.assignees.length > 1 && (
                          <span className='text-xs text-zinc-600 dark:text-zinc-300 font-medium truncate ml-3'>{task.assignees.length} pessoas</span>
                        )}
                      </div>
                    ) : (
                      <span className='text-zinc-400 dark:text-zinc-600 text-xs'>Sem responsável</span>
                    )}
                  </td>
                  <td className='py-2.5 px-4'>
                    {task.team ? (
                      <div className='flex items-center gap-1.5'>
                        <Users2 size={13} className="text-blue-500" />
                        <span className='text-xs text-zinc-600 dark:text-zinc-300 font-medium truncate'>{task.team.name}</span>
                      </div>
                    ) : (
                      <span className='text-zinc-400 dark:text-zinc-600 text-xs'>Sem equipe</span>
                    )}
                  </td>
                  <td className='py-2.5 px-4'>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${STATUS_CONFIG[task.status].color}`}>
                      {STATUS_CONFIG[task.status].label}
                    </span>
                  </td>
                  <td className='py-2.5 px-2 text-center'>
                    <Button size="icon" variant="ghost" className='h-7 w-7' onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTaskId(task.id);
                      setIsDetailOpen(true);
                    }}>
                      <MoreVertical size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className='border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 py-3 px-4 flex items-center justify-between text-xs text-zinc-500'>
            <span>Mostrando {filteredTasks.length} tarefas</span>
            <div className='flex items-center gap-1 font-medium'>
              <Button size="sm" variant="ghost">Anterior</Button>
              <Button size="sm">1</Button>
              <Button size="sm" variant="ghost">Próxima</Button>
            </div>
          </div>
        </div>
      </div>
      <TaskDetailDrawer
        task={selectedTask}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTaskId(null);
        }}
        defaultProject={project_id !== 'all' ? project_id : undefined}
      />
    </Page>
  );
}
