import { useState, useEffect } from 'react';
import { authClient } from '../../lib/auth-client';
import { useTenantStore } from '../../store';
import { useTenant } from '../../hooks/useTenant';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { AlertTriangle, Layers, Activity, TrendingUp, CheckCircle2, CalendarDays } from 'lucide-react';
import { apiBase } from '../../api/fetcher';

interface DashboardSummary {
  total_projects: number;
  total_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  active_members: number;
}

interface UpcomingDeadline {
  id: string;
  title: string;
  dueDate: string;
  priority: string;
  assignee?: {
    name: string;
    image?: string;
  };
}

interface ProjectHealth {
  id: string;
  name: string;
  status: 'on_track' | 'at_risk' | 'delayed';
  completion_percentage: number;
  total_tasks: number;
  completed_tasks: number;
}

interface TaskTrend {
  date: string;
  created: number;
  completed: number;
}

export function DashboardView() {
  const { company_id } = useTenant();
  const { organizations } = useTenantStore();
  const currentOrg = organizations.find((o) => o.id === company_id || (o as any).slug === company_id) || organizations[0];
  const orgId = currentOrg?.id || '';
  
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [deadlines, setDeadlines] = useState<UpcomingDeadline[]>([]);
  const [health, setHealth] = useState<ProjectHealth[]>([]);
  const [trends, setTrends] = useState<TaskTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const headers = { 'x-organization-id': orgId };
        const [sumRes, deadRes, healthRes, trendsRes] = await Promise.all([
          authClient.$fetch<DashboardSummary>(`${apiBase}/dashboard/summary`, { headers }),
          authClient.$fetch<UpcomingDeadline[]>(`${apiBase}/dashboard/upcoming-deadlines`, { headers }),
          authClient.$fetch<ProjectHealth[]>(`${apiBase}/dashboard/project-health`, { headers }),
          authClient.$fetch<TaskTrend[]>(`${apiBase}/dashboard/task-trends`, { headers }),
        ]);

        if (sumRes.data) setSummary(sumRes.data);
        if (deadRes.data) setDeadlines(deadRes.data);
        if (healthRes.data) setHealth(healthRes.data);
        if (trendsRes.data) setTrends(trendsRes.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgId]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!summary) return null;

  const taskStatusData = [
    { name: 'Concluídas', value: summary.total_tasks - summary.pending_tasks, color: '#10b981' },
    { name: 'Pendentes', value: summary.pending_tasks, color: '#f59e0b' },
    { name: 'Atrasadas', value: summary.overdue_tasks, color: '#ef4444' },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className='bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-white'>
          <p className='text-zinc-400 text-xs mb-2 font-medium'>{label}</p>
          {payload.map((p: any) => (
            <div key={p.dataKey} className='flex items-center gap-2 text-sm font-semibold'>
              <div className='w-2 h-2 rounded-full' style={{ backgroundColor: p.color }} />
              {p.name === 'created' ? 'Criadas:' : p.name === 'completed' ? 'Concluídas:' : p.name} {p.value}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className='space-y-6 pb-12 overflow-x-hidden'>
      <div className='flex flex-col md:flex-row items-start md:items-end justify-between gap-4'>
        <div>
          <h2 className='text-xl font-semibold text-zinc-900 dark:text-zinc-100'>Painel de Controle</h2>
          <p className='text-sm text-zinc-500 dark:text-zinc-400 mt-1'>Análise de dados e performance operacional.</p>
        </div>
        <div className='flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/50 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800'>
          <span className='flex h-2 w-2 relative'>
            <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75'></span>
            <span className='relative inline-flex rounded-full h-2 w-2 bg-emerald-500'></span>
          </span>
          <span className='text-xs font-medium text-zinc-700 dark:text-zinc-300'>Tempo Real</span>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5'>
        <KPICard title='Total de Tarefas' value={summary.total_tasks} icon={<Activity />} gradient='from-blue-500 to-indigo-600' />
        <KPICard
          title='Tarefas Concluídas'
          value={summary.total_tasks - summary.pending_tasks}
          icon={<CheckCircle2 />}
          gradient='from-emerald-400 to-green-600'
        />
        <KPICard title='Tarefas Atrasadas' value={summary.overdue_tasks} icon={<AlertTriangle />} gradient='from-red-400 to-rose-600' />
        <KPICard title='Projetos Ativos' value={summary.total_projects} icon={<Layers />} gradient='from-violet-500 to-purple-600' />
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-3 gap-6'>
        <div className='xl:col-span-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm flex flex-col relative overflow-hidden group'>
          <div className='absolute top-0 right-0 w-64 h-64 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl -mx-32 -my-32 transition-transform duration-700 group-hover:scale-150 pointer-events-none'></div>
          <div className='flex items-center justify-between z-10 mb-6'>
            <div>
              <h4 className='text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2'>
                <TrendingUp className='w-5 h-5 text-blue-500' /> Fluxo de Trabalho
              </h4>
              <p className='text-xs text-zinc-500 mt-1'>Velocidade de criação versus conclusão</p>
            </div>
          </div>
          <div className='h-72 w-full z-10 shrink-0 mt-auto'>
            {trends.length > 0 ? (
              <ResponsiveContainer width='100%' height='100%' minWidth={0}>
                <AreaChart data={trends} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id='colorCompleted' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='5%' stopColor='#10b981' stopOpacity={0.3} />
                      <stop offset='95%' stopColor='#10b981' stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id='colorCreated' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='5%' stopColor='#3b82f6' stopOpacity={0.3} />
                      <stop offset='95%' stopColor='#3b82f6' stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#3f3f46' opacity={0.2} />
                  <XAxis dataKey='date' tick={{ fill: '#71717a', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type='monotone' dataKey='created' stroke='#3b82f6' strokeWidth={3} fillOpacity={1} fill='url(#colorCreated)' />
                  <Area type='monotone' dataKey='completed' stroke='#10b981' strokeWidth={3} fillOpacity={1} fill='url(#colorCompleted)' />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className='h-full flex items-center justify-center text-sm text-zinc-400'>Aguardando dados...</div>
            )}
          </div>
        </div>

        <div className='rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm flex flex-col justify-between'>
          <div>
            <h4 className='text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2'>
              <PieChart className='w-5 h-5 text-emerald-500' /> Distribuição
            </h4>
          </div>
          <div className='h-56 my-auto'>
            <ResponsiveContainer width='100%' height='100%' minWidth={0}>
              <PieChart>
                <Pie data={taskStatusData} cx='50%' cy='50%' innerRadius={70} outerRadius={90} paddingAngle={3} dataKey='value' stroke='none'>
                  {taskStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className='grid grid-cols-3 gap-2 mt-4'>
            {taskStatusData.map((d) => (
              <div key={d.name} className='flex flex-col items-center'>
                <div className='text-xs font-medium text-zinc-500 dark:text-zinc-400 tracking-wider mb-1 uppercase'>{d.name}</div>
                <div className='text-base font-semibold' style={{ color: d.color }}>
                  {d.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm'>
          <h4 className='text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-6'>
            <Layers className='w-5 h-5 text-violet-500' /> Saúde dos Projetos
          </h4>
          <div className='space-y-4'>
            {health.map((proj) => (
              <div key={proj.id} className='p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/30'>
                <div className='flex items-center justify-between mb-3'>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 rounded-lg bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 flex items-center justify-center'>
                        <svg className={`w-5 h-5 ${proj.status === 'delayed' ? 'text-red-500' : proj.status === 'at_risk' ? 'text-amber-500' : 'text-emerald-500'}`} fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' />
                        </svg>
                    </div>
                    <div>
                      <h5 className='font-bold text-zinc-900 dark:text-zinc-100'>{proj.name}</h5>
                      <p className='text-xs text-zinc-500'>{proj.completed_tasks} de {proj.total_tasks} concluídas</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-md ${proj.status === 'on_track' ? 'bg-emerald-500/10 text-emerald-500' : proj.status === 'at_risk' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
                    {proj.status === 'on_track' ? 'No Prazo' : proj.status === 'at_risk' ? 'Em Risco' : 'Atrasado'}
                  </span>
                </div>
                <div className='w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden'>
                  <div className='h-full bg-blue-500 rounded-full' style={{ width: `${proj.completion_percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className='rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm'>
          <h4 className='text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-6'>
            <CalendarDays className='w-5 h-5 text-amber-500' /> Próximas Entregas
          </h4>
          <div className='space-y-4'>
            {deadlines.map((task) => (
              <div key={task.id} className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex flex-col items-center justify-center text-[10px] font-bold'>
                  <span>{new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit' })}</span>
                  <span className='text-[8px] uppercase'>{new Date(task.dueDate).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='text-sm font-bold truncate text-zinc-900 dark:text-zinc-100'>{task.title}</div>
                  <div className='text-xs text-zinc-500 capitalize'>{task.priority}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, gradient }: { title: string; value: number | string; icon: React.ReactNode; gradient: string }) {
  return (
    <div className='rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm flex items-start justify-between'>
      <div>
        <h3 className='text-xs font-medium text-zinc-500 dark:text-zinc-400 tracking-wider mb-1 uppercase'>{title}</h3>
        <div className='text-2xl font-semibold text-zinc-900 dark:text-zinc-100'>{value}</div>
      </div>
      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} text-white opacity-90`}>
        {icon}
      </div>
    </div>
  );
}

const Skeleton = ({ className }: { className?: string }) => <div className={`animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-md ${className}`} />;

function DashboardSkeleton() {
  return (
    <div className='space-y-6 pt-4'>
      <div className='flex justify-between items-end mb-8 px-1'>
        <div className='space-y-2'><Skeleton className='h-7 w-48' /><Skeleton className='h-4 w-80' /></div>
        <Skeleton className='h-7 w-32 rounded-lg' />
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 small-cards'>
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className='h-24 w-full rounded-xl' />)}
      </div>
      <div className='grid grid-cols-1 xl:grid-cols-3 gap-6'>
        <Skeleton className='xl:col-span-2 h-[400px] rounded-xl' />
        <Skeleton className='h-[400px] rounded-xl' />
      </div>
    </div>
  );
}
