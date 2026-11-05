import { Search, X, ListFilter, SortAsc, LayoutGrid, Users, Tag, Flag } from 'lucide-react';
import { TaskStatus, STATUS_CONFIG, PRIORITY_CONFIG, TaskPriority } from './tasks-data';
import { SortOption, GroupOption } from './use-task-filters';
import { Button } from '../../components/ui/button';
import { useTenantStore } from '../../store';

interface TaskFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  selectedStatus: TaskStatus | 'all';
  setSelectedStatus: (val: TaskStatus | 'all') => void;
  selectedProject: string | 'all';
  setSelectedProject: (val: string) => void;
  projects: string[];
  selectedAssignee: string | 'all';
  setSelectedAssignee: (val: string) => void;
  assignees: string[];
  selectedPriority: TaskPriority | 'all';
  setSelectedPriority: (val: TaskPriority | 'all') => void;
  sortBy: SortOption;
  setSortBy: (val: SortOption) => void;
  groupBy: GroupOption;
  setGroupBy: (val: GroupOption) => void;
  onClear: () => void;
}

export function TaskFiltersComponent({
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
  onClear
}: TaskFiltersProps) {
  const isFiltered = search !== '' || selectedStatus !== 'all' || selectedProject !== 'all' || selectedAssignee !== 'all' || selectedPriority !== 'all';

  const { projects: storeProjects } = useTenantStore();
  const getProjectName = (id: string) => storeProjects.find(p => p.id === id)?.name || id;

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {/* Search Input - Styled like GitHub Search */}
      <div className='relative min-w-[240px]'>
        <Search size={14} className='absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500' />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ou filtrar..."
          className='w-full pl-9 pr-8 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-zinc-500'
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setSearch('')}
          className='absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6'
        >
          <X size={12} />
        </Button>
      </div>

      <div className='flex items-center gap-1.5'>
        {/* Status Dropdown */}
        <div className='flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1'>
          <ListFilter size={12} className='text-zinc-500' />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className='bg-transparent border-none p-0 text-[11px] font-semibold outline-none focus:ring-0 cursor-pointer text-zinc-700 dark:text-zinc-300'
          >
            <option value="all">Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>

        {/* Priority Dropdown */}
        <div className='flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1'>
          <Flag size={12} className='text-zinc-500' />
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value as any)}
            className='bg-transparent border-none p-0 text-[11px] font-semibold outline-none focus:ring-0 cursor-pointer text-zinc-700 dark:text-zinc-300'
          >
            <option value="all">Prioridade</option>
            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>

        {/* Project Dropdown */}
        <div className='flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1'>
          <Tag size={12} className='text-zinc-500' />
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className='bg-transparent border-none p-0 text-[11px] font-semibold outline-none focus:ring-0 cursor-pointer text-zinc-700 dark:text-zinc-300 max-w-[80px]'
          >
            <option value="all">Projeto</option>
            {projects.filter(p => p !== 'all').map(project => (
              <option key={project} value={project}>{getProjectName(project)}</option>
            ))}
          </select>
        </div>

        {/* Assignee Dropdown */}
        <div className='flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1'>
          <Users size={12} className='text-zinc-500' />
          <select
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className='bg-transparent border-none p-0 text-[11px] font-semibold outline-none focus:ring-0 cursor-pointer text-zinc-700 dark:text-zinc-300 max-w-[80px]'
          >
            <option value="all">Responsável</option>
            {assignees.filter(a => a !== 'all').map(assignee => (
              <option key={assignee} value={assignee}>{assignee}</option>
            ))}
          </select>
        </div>

        <div className='w-px h-4 bg-zinc-200 dark:bg-zinc-800 shrink-0 mx-1' />

        {/* Sort Dropdown */}
        <div className='flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1'>
          <SortAsc size={12} className='text-zinc-500' />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className='bg-transparent border-none p-0 text-[11px] font-semibold outline-none focus:ring-0 cursor-pointer text-zinc-700 dark:text-zinc-300'
          >
            <option value="newest">Mais recentes</option>
            <option value="oldest">Mais antigos</option>
            <option value="priority">Prioridade</option>
            <option value="alphabetical">Alfabético</option>
          </select>
        </div>

        {/* Group Dropdown */}
        <div className='flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1'>
          <LayoutGrid size={12} className='text-zinc-500' />
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
            className='bg-transparent border-none p-0 text-[11px] font-semibold outline-none focus:ring-0 cursor-pointer text-zinc-700 dark:text-zinc-300'
          >
            <option value="status">Grupo: Status</option>
            <option value="priority">Grupo: Prioridade</option>
            <option value="project">Grupo: Projeto</option>
            <option value="assignee">Grupo: Responsável</option>
          </select>
        </div>

        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className='text-zinc-500 hover:text-red-500 gap-1'
          >
            <X size={12} />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
