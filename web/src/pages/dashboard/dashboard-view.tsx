import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '../../lib/auth-client';
import { useTenantStore } from '../../store';
import { useTenant } from '../../hooks/useTenant';
import { apiBase } from '../../api/fetcher';
import { List, ListRow } from '../../components/ui/list';

interface ProjectItem {
  id: string;
  name: string;
  status?: string;
}

interface TaskItem {
  id: string;
  project: string;
  status: string;
}

const projectColumns = '1fr 88px 112px 88px 112px 160px';
const projectHeaders = ['Projeto', 'Fila', 'Em andamento', 'Release', 'Concluídas', 'Progresso'];

const stages = [
  { status: 'backlog', label: 'Backlog', dot: 'bg-zinc-300 dark:bg-zinc-700' },
  { status: 'todo', label: 'Para fazer', dot: 'bg-zinc-400 dark:bg-zinc-600' },
  { status: 'in-progress', label: 'Em andamento', dot: 'bg-blue-400' },
  { status: 'review', label: 'Revisão', dot: 'bg-blue-500' },
  { status: 'release', label: 'Release', dot: 'bg-blue-600' },
  { status: 'done', label: 'Concluído', dot: 'bg-blue-800 dark:bg-blue-300' },
];

function countByStatus(tasks: TaskItem[]) {
  const queued = tasks.filter((t) => t.status === 'backlog' || t.status === 'todo').length;
  const inProgress = tasks.filter((t) => t.status === 'in-progress' || t.status === 'review').length;
  const release = tasks.filter((t) => t.status === 'release').length;
  const completed = tasks.filter((t) => t.status === 'done' || t.status === 'completed').length;
  const total = tasks.length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, queued, inProgress, release, completed, percentage };
}

export function DashboardView() {
  const { company_id } = useTenant();
  const { organizations } = useTenantStore();
  const navigate = useNavigate();
  const currentOrg = organizations.find((o) => o.id === company_id || (o as any).slug === company_id) || organizations[0];
  const orgId = currentOrg?.id || company_id || '';

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;

    async function fetchData() {
      setLoading(true);
      try {
        const headers = { 'x-organization-id': orgId };
        const [projectsRes, tasksRes] = await Promise.all([
          authClient.$fetch<ProjectItem[]>(`${apiBase}/projects`, { headers }),
          authClient.$fetch<TaskItem[]>(`${apiBase}/tasks`, { headers }),
        ]);
        setProjects(projectsRes.data || []);
        setTasks(tasksRes.data || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orgId]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const activeProjects = projects.filter((p) => p.status !== 'archived');
  const activeTasks = tasks.filter((t) => activeProjects.some((p) => p.id === t.project));
  const totals = countByStatus(activeTasks);

  const projectRows = activeProjects
    .map((project) => ({ ...project, ...countByStatus(activeTasks.filter((t) => t.project === project.id)) }))
    .sort((a, b) => b.inProgress - a.inProgress || b.total - a.total);

  return (
    <div className='space-y-6 pb-12 overflow-x-hidden'>
      <div>
        <h2 className='text-xl font-semibold text-zinc-900 dark:text-zinc-100'>Painel de Controle</h2>
        <p className='text-sm text-zinc-500 dark:text-zinc-400 mt-1'>Progresso e performance operacional dos projetos.</p>
      </div>

      <div className='rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 grid grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200 dark:divide-zinc-800'>
        <Kpi label='Projetos ativos' value={activeProjects.length} detail={`${totals.total} tarefas`} />
        <Kpi label='Na fila' value={totals.queued} />
        <Kpi label='Em andamento' value={totals.inProgress} highlight={totals.inProgress > 0} />
        <Kpi label='Em release' value={totals.release} />
        <div className='p-5'>
          <p className='text-xs font-medium text-zinc-500'>Taxa de conclusão</p>
          <p className='tabular-nums text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mt-1'>{totals.percentage}%</p>
          <p className='text-xs text-zinc-500 mt-1'>
            {totals.completed} de {totals.total} concluídas
          </p>
          <div className='h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 mt-3 overflow-hidden'>
            <div className='h-full bg-blue-600' style={{ width: `${totals.percentage}%` }} />
          </div>
        </div>
      </div>

      {totals.total > 0 && <Pipeline tasks={activeTasks} />}

      <div className='space-y-3'>
        <h3 className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>Progresso por projeto</h3>
        {projectRows.length === 0 ? (
          <div className='rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-sm text-zinc-500'>
            Nenhum projeto ativo nesta organização.
          </div>
        ) : (
          <List columns={projectColumns} headers={projectHeaders}>
            {projectRows.map((project) => (
              <ListRow key={project.id} columns={projectColumns} onClick={() => navigate(`/${company_id}/${project.id}/tasks`)}>
                <div className='flex items-center gap-2 min-w-0'>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${project.inProgress > 0 || project.completed > 0 ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                  />
                  <span className='text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate'>{project.name}</span>
                </div>
                <span className='text-sm text-zinc-500 tabular-nums'>{project.queued}</span>
                <span className={`text-sm font-medium tabular-nums ${project.inProgress > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500'}`}>
                  {project.inProgress}
                </span>
                <span className='text-sm text-zinc-500 tabular-nums'>{project.release}</span>
                <span className='text-sm text-zinc-500 tabular-nums'>
                  {project.completed}/{project.total}
                </span>
                <div className='flex items-center gap-2'>
                  <div className='w-20 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden'>
                    <div className='h-full bg-blue-600' style={{ width: `${project.percentage}%` }} />
                  </div>
                  <span className='text-xs text-zinc-500 tabular-nums w-9 text-right'>{project.percentage}%</span>
                </div>
              </ListRow>
            ))}
          </List>
        )}
      </div>
    </div>
  );
}

interface KpiProps {
  label: string;
  value: number;
  detail?: string;
  highlight?: boolean;
}

function Kpi({ label, value, detail, highlight }: KpiProps) {
  return (
    <div className='p-5'>
      <p className='text-xs font-medium text-zinc-500'>{label}</p>
      <p className={`tabular-nums text-2xl font-semibold mt-1 ${highlight ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
        {value}
      </p>
      {detail && <p className='text-xs text-zinc-500 mt-1'>{detail}</p>}
    </div>
  );
}

function Pipeline({ tasks }: { tasks: TaskItem[] }) {
  const items = stages.map((stage) => {
    const count = tasks.filter((t) => t.status === stage.status || (stage.status === 'done' && t.status === 'completed')).length;
    return { ...stage, count, percent: Math.round((count / tasks.length) * 100) };
  });

  return (
    <div className='rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4'>
      <h3 className='text-sm font-semibold text-zinc-900 dark:text-zinc-100'>Fluxo da esteira</h3>
      <div className='h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex'>
        {items.map((item) => (
          <div key={item.status} className={item.dot} style={{ width: `${(item.count / tasks.length) * 100}%` }} />
        ))}
      </div>
      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4'>
        {items.map((item) => (
          <div key={item.status}>
            <div className='flex items-center gap-2'>
              <span className={`w-2 h-2 rounded-full ${item.dot}`} />
              <span className='text-xs text-zinc-500'>{item.label}</span>
            </div>
            <p className='text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums mt-1'>{item.count}</p>
            <p className='text-xs text-zinc-500 tabular-nums'>{item.percent}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='h-12 w-72 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-md' />
      <div className='h-28 w-full animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-xl' />
      <div className='h-64 w-full animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-xl' />
    </div>
  );
}
