import { useState, useEffect } from 'react';
import { Page } from '../../components/layout/page';
import { Topbar } from '../../components/layout/topbar';
import { useSession } from '../../lib/auth-client';
import { useTenant } from '../../hooks/useTenant';
import { useTenantStore } from '../../store';
import { authClient } from '../../lib/auth-client';
import { apiBase } from '../../api/fetcher';
import { ChecklistCard } from './components/checklist-card';
import { RadarCard } from './components/radar-card';

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-md ${className}`} />
);

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

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface RadarData {
  at_risk_projects: ProjectHealth[];
  delayed_projects: ProjectHealth[];
  upcoming_tasks: UpcomingDeadline[];
  overdue_count: number;
}

interface HomeData {
  checklist: ChecklistItem[];
  radar: RadarData;
  summary: DashboardSummary;
}

export default function Resume() {
  const { data: session } = useSession();
  const { company_id } = useTenant();
  const { organizations } = useTenantStore();
  const currentOrg = organizations.find((o) => o.id === company_id || (o as any).slug === company_id) || organizations[0];
  const orgId = currentOrg?.id || '';

  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;

    const fetchHomeData = async () => {
      setLoading(true);
      try {
        const res = await authClient.$fetch<HomeData>(`${apiBase}/dashboard/home`, {
          headers: { 'x-organization-id': orgId }
        });
        if (res.data) setHomeData(res.data);
      } catch (error) {
        console.error('Failed to fetch home data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, [orgId]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const name = session?.user?.name?.split(' ')[0] || 'visitante';

  return (
    <Page navigation={[]}>
      <Topbar title='Início' inputSearch='off' />

      <div className='flex-1 overflow-y-auto'>
        <div className='max-w-6xl mx-auto p-6 space-y-6'>
          <div>
            <h1 className='text-xl font-semibold text-zinc-900 dark:text-zinc-100'>
              {getGreeting()}, <span className='text-blue-600 dark:text-blue-500'>{name}</span>.
            </h1>
            <p className='text-sm text-zinc-500 dark:text-zinc-400 mt-1'>
              Aqui está o que precisa da sua atenção hoje para manter tudo na linha.
            </p>
          </div>

          {loading ? (
            <div className='space-y-6'>
              <Skeleton className='h-96 w-full rounded-xl' />
              <Skeleton className='h-[500px] w-full rounded-xl' />
            </div>
          ) : homeData ? (
            <>
              <ChecklistCard items={homeData.checklist} />
              <RadarCard 
                atRiskProjects={homeData.radar.at_risk_projects} 
                delayedProjects={homeData.radar.delayed_projects} 
                upcomingTasks={homeData.radar.upcoming_tasks}
                overdueCount={homeData.radar.overdue_count}
              />
            </>
          ) : null}
        </div>
      </div>
    </Page>
  );
}
