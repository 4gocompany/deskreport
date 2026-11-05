import { Page } from '../../components/layout/page';
import { Topbar } from '../../components/layout/topbar';
import { Users2, Plus, Settings2, MoreVertical, Briefcase, UserCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTenantStore } from '../../store';
import { EditTeamModal } from './edit-team-modal';
import { authClient } from '../../lib/auth-client';
import { apiBase } from '../../api/fetcher';

export default function TeamsPage() {
  const { company_id } = useParams();
  const { teams, fetchTeams } = useTenantStore();
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);

  useEffect(() => {
    if (company_id) {
      loadTeams();
    }
  }, [company_id]);

  const loadTeams = async () => {
    if (!company_id) return;
    setLoading(true);
    await fetchTeams(company_id);
    setLoading(false);
  };

  const handleDelete = async (teamId: string) => {
    if (!company_id || !confirm('Deseja realmente excluir esta equipe?')) return;
    try {
      await authClient.$fetch(`${apiBase}/teams/${teamId}`, {
        method: 'DELETE',
        headers: { 'x-organization-id': company_id },
      });
      loadTeams();
    } catch (error) {
      console.error('Failed to delete team:', error);
    }
  };

  return (
    <Page navigation={[]}>
      <div className='flex flex-col h-full w-full'>
        <Topbar title='Gestão de Equipes' inputSearch='off' />

        <div className='flex-1 overflow-y-auto p-8 bg-zinc-50 dark:bg-transparent'>
          <div className='max-w-6xl mx-auto animate-slide-up'>
            {/* HEADER */}
            <div className='flex items-center justify-between mb-8'>
              <div>
                <h2 className='text-2xl font-bold text-zinc-900 dark:text-zinc-100'>Equipes</h2>
                <p className='text-zinc-500 dark:text-zinc-400 mt-1'>Organize seus usuários em times para facilitar a atribuição de tarefas e projetos.</p>
              </div>
              <Button onClick={() => setIsCreating(true)} className='gap-2 shrink-0'>
                <Plus size={18} />
                Nova Equipe
              </Button>
            </div>

            <div className='space-y-3'>
              {loading ? (
                <div className='w-full flex justify-center py-20'>
                  <div className='w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin'></div>
                </div>
              ) : teams.length === 0 ? (
                <div className='text-center py-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl'>
                  <div className='w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4'>
                    <Users2 size={32} className='text-zinc-300' />
                  </div>
                  <h3 className='text-lg font-bold text-zinc-900 dark:text-zinc-100 italic'>Nenhuma equipe criada</h3>
                  <p className='text-zinc-500 max-w-xs mx-auto mt-2'>Crie sua primeira equipe para começar a organizar melhor suas entregas.</p>
                  <Button onClick={() => setIsCreating(true)} variant='outline' className='mt-6'>
                    Começar agora
                  </Button>
                </div>
              ) : (
                <div className='space-y-3'>
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl flex items-center justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group'
                    >
                      <div className='flex items-center gap-4'>
                        {/* Icon Container */}
                        <div className='w-12 h-12 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'>
                          <Users2 size={24} />
                        </div>

                        {/* Content */}
                        <div>
                          <h3 className='font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2'>{team.name}</h3>

                          <div className='flex items-center gap-4 mt-1'>
                            <div className='flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400'>
                              <UserCircle2 size={14} />
                              Membros: {team._count?.members || 0}
                            </div>
                            <div className='flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400'>
                              <Briefcase size={14} />
                              Tarefas Ativas: {team._count?.tasks || 0}
                            </div>
                            {team.description && <div className='flex items-center gap-1.5 text-xs text-zinc-400 italic'>— {team.description}</div>}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className='flex items-center gap-1.5'>
                        <Button size='icon' variant='ghost' onClick={() => setEditingTeam(team)} title='Configurações da Equipe'>
                          <Settings2 size={18} />
                        </Button>
                        <Button
                          size='icon'
                          variant='ghost'
                          className='text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                          onClick={() => handleDelete(team.id)}
                        >
                          <MoreVertical size={18} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {(isCreating || editingTeam) && (
        <EditTeamModal
          team={editingTeam}
          onClose={() => {
            setIsCreating(false);
            setEditingTeam(null);
          }}
          onSuccess={() => {
            setIsCreating(false);
            setEditingTeam(null);
            loadTeams();
          }}
        />
      )}
    </Page>
  );
}
