import { Page } from '../../components/layout/page';
import { Topbar } from '../../components/layout/topbar';
import { useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { STATUS_CONFIG, PRIORITY_CONFIG, TaskCardProps, TaskStatus } from './tasks-data';
import { useTaskStore } from './use-task-store';
import { useTaskFilters } from './use-task-filters';
import { TaskFiltersComponent } from './task-filters-component';
import { TaskDetailDrawer } from './task-detail-drawer';
import { Button } from '../../components/ui/button';
import { useMemo, useState, useEffect } from 'react';
import { useTenantStore } from '../../store';
import { TaskCard } from './components/task-card';
import { DragDropProvider, useDroppable } from '@dnd-kit/react';
import { AgentsBar } from './components/agents-bar';

export function TaskBoards() {
  const { company_id, project_id } = useParams();
  const cId = company_id || '4go';
  const pId = project_id || 'deskreport';

  const { tasks, updateTask, fetchTasks } = useTaskStore();

  useEffect(() => {
    if (company_id) fetchTasks();
  }, [company_id, fetchTasks]);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus | undefined>();
  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedTaskId) || null, [tasks, selectedTaskId]);

  const { projects: storeProjects } = useTenantStore();
  const getProjectName = (id: string) => storeProjects.find((p) => p.id === id)?.name || id;

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
    filteredTasks,
  } = useTaskFilters(tasks);

  // Apply URL routing filter dynamically over the selected Project
  const finalTasksFiltered = useMemo(() => {
    if (project_id && project_id !== 'all') {
      return filteredTasks.filter((t) => t.project === project_id);
    }
    return filteredTasks;
  }, [filteredTasks, project_id]);

  const navigation = [
    { name: 'Quadros', to: `/${cId}/${pId}/tasks/boards` },
    { name: 'Em Lista', to: `/${cId}/${pId}/tasks/list` },
    { name: 'Gestão de Dados', to: `/${cId}/${pId}/tasks/management` },
  ];

  const dynamicColumns = useMemo(() => {
    if (groupBy === 'status') {
      return Object.entries(STATUS_CONFIG).map(([id, config]) => ({
        id,
        title: config.label,
        color: config.color.includes('text-blue')
          ? 'text-blue-500'
          : config.color.includes('text-purple')
            ? 'text-purple-500'
            : config.color.includes('text-emerald')
              ? 'text-emerald-500'
              : config.color.includes('text-zinc-400')
                ? 'text-zinc-400'
                : 'text-zinc-500',
      }));
    }
    if (groupBy === 'priority') {
      return Object.entries(PRIORITY_CONFIG).map(([id, config]) => ({
        id,
        title: config.label,
        color: config.color,
      }));
    }
    if (groupBy === 'project') {
      const uniqueProjects = unique(finalTasksFiltered.map((t) => t.project));
      return uniqueProjects.map((p) => ({ id: p, title: getProjectName(p), color: 'text-zinc-500' }));
    }
    if (groupBy === 'assignee') {
      const uniqueAssignees = unique(finalTasksFiltered.flatMap((t) => t.assignees?.map((a) => a.name) || []));
      return [
        ...uniqueAssignees.map((a) => ({ id: a, title: a, color: 'text-zinc-500' })),
        { id: 'unassigned', title: 'Sem responsável', color: 'text-zinc-400' },
      ];
    }
    return [];
  }, [groupBy, finalTasksFiltered, storeProjects]);

  const clearFilters = () => {
    setSearch('');
    setSelectedStatus('all');
    setSelectedProject('all');
    setSelectedAssignee('all');
    setSelectedPriority('all');
    setSortBy('newest');
    setGroupBy('status');
  };

  const getTasksForColumn = (columnId: string) => {
    if (groupBy === 'status') return finalTasksFiltered.filter((t) => t.status === columnId);
    if (groupBy === 'priority') return finalTasksFiltered.filter((t) => t.priority === columnId);
    if (groupBy === 'project') return finalTasksFiltered.filter((t) => t.project === columnId);
    if (groupBy === 'assignee') {
      if (columnId === 'unassigned') return finalTasksFiltered.filter((t) => !t.assignees || t.assignees.length === 0);
      return finalTasksFiltered.filter((t) => t.assignees?.some((a) => a.name === columnId));
    }
    return [];
  };

  function openTask(task: TaskCardProps) {
    setSelectedTaskId(task.id);
    setIsDetailOpen(true);
  }

  function openNewTask(status?: TaskStatus) {
    setSelectedTaskId(null);
    setNewTaskStatus(status);
    setIsDetailOpen(true);
  }

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
          <Button
            size='md'
            className='gap-1.5'
            onClick={() => openNewTask()}
          >
            <Plus size={12} />
            Tarefa
          </Button>
        </div>
      </Topbar>

      <AgentsBar />

      <div className='flex-1 overflow-x-auto transition-colors selection:bg-blue-100 selection:text-blue-900'>
        <div className='flex h-full items-start'>
          <DragDropProvider
            onDragEnd={(event) => {
              if (event.canceled || groupBy !== 'status') return;

              const sourceId = event.operation.source?.id;
              const targetColumnId = event.operation.target?.id;
              if (!sourceId || !targetColumnId) return;

              const task = tasks.find((t) => t.id === sourceId);
              if (!task || task.status === targetColumnId) return;

              updateTask(task.id, { status: targetColumnId as TaskStatus });
            }}
          >
            {dynamicColumns.map((column) => (
              <BoardColumn
                column={column}
                key={column.id}
                counterTasks={getTasksForColumn(column.id).length}
                onAdd={() => openNewTask(groupBy === 'status' ? (column.id as TaskStatus) : undefined)}
              >
                {getTasksForColumn(column.id).map((task) => (
                  <TaskCard task={task} key={task.id} projectName={getProjectName(task.project)} onClick={() => openTask(task)} />
                ))}
              </BoardColumn>
            ))}
          </DragDropProvider>

          {/* New Column Placeholder */}
          <div className='w-[300px] min-w-[300px] h-full flex flex-col shrink-0 px-3 pt-6'>
            <Button
              variant='outline'
              className='w-full h-10 gap-2 border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:text-blue-500 hover:border-blue-400 dark:hover:border-blue-500/30 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-all group'
            >
              <Plus size={16} className='group-hover:scale-110 transition-transform' />
              Adicionar coluna
            </Button>
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
        defaultStatus={newTaskStatus}
      />
    </Page>
  );
}

function BoardColumn({
  column,
  children,
  counterTasks,
  onAdd,
}: {
  column: { id: string; title: string; color: string };
  children: React.ReactNode;
  counterTasks: number;
  onAdd: () => void;
}) {
  const { ref } = useDroppable({ id: column.id });
  return (
    <div
      id={column.id}
      ref={ref}
      key={column.id}
      className='w-[310px] min-w-[310px] shrink-0 h-full flex flex-col border-r border-zinc-200 dark:border-zinc-800 last:border-r-0 bg-zinc-50/40 dark:bg-zinc-950/40'
    >
      <div className='px-4 py-3 bg-white/80 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10 backdrop-blur-sm'>
        <div className='flex items-center justify-between group/header'>
          <div className='flex items-center gap-2'>
            <div className={`w-2 h-2 rounded-full ${column.color.replace('text-', 'bg-')}`} />
            <h3 className='font-semibold text-zinc-900 dark:text-zinc-100 text-xs'>{column.title}</h3>
            <span className='text-xs font-medium text-zinc-400 dark:text-zinc-500 px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800'>{counterTasks}</span>
          </div>
          <Button variant='ghost' size='icon' className='h-6 w-6 text-zinc-400 opacity-0 group-hover/header:opacity-100 transition-opacity' onClick={onAdd}>
            <Plus size={14} />
          </Button>
        </div>
      </div>

      <div className='flex-1 space-y-2.5 overflow-y-auto p-3'>
        {children}

        <Button
          variant='ghost'
          className='w-full py-3 text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all group border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl mt-2'
          onClick={onAdd}
        >
          <Plus size={14} />
          <span className='text-xs font-medium'>Nova tarefa</span>
        </Button>
      </div>
    </div>
  );
}

function unique(list: string[]) {
  return list.filter((item, index) => list.indexOf(item) === index);
}
