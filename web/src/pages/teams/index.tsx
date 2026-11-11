import { Page } from '../../components/layout/page';
import { Topbar } from '../../components/layout/topbar';
import { Users2, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { confirmDialog } from '../../components/ui/confirm-dialog';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTenantStore } from '../../store';
import { EditTeamModal } from './edit-team-modal';
import { authClient } from '../../lib/auth-client';
import { apiBase } from '../../api/fetcher';
import { List, ListAction, ListActions, ListRow } from '../../components/ui/list';

const teamColumns = '1fr 96px 120px 72px';

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
    if (!company_id || !(await confirmDialog('Excluir esta equipe?', { confirmLabel: 'Excluir', danger: true }))) return;
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

        <div className='flex-1 overflow-y-auto p-6'>
          <div className='max-w-6xl mx-auto space-y-6 animate-slide-up'>
            {/* HEADER */}
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='text-xl font-semibold text-zinc-900 dark:text-zinc-100'>Equipes</h2>
                <p className='text-sm text-zinc-500 dark:text-zinc-400 mt-1'>Organize seus usuários em times para facilitar a atribuição de tarefas e projetos.</p>
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
                <div className='text-center py-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm'>
                  <div className='w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4'>
                    <Users2 size={32} className='text-zinc-300' />
                  </div>
                  <h3 className='text-base font-semibold text-zinc-900 dark:text-zinc-100'>Nenhuma equipe criada</h3>
                  <p className='text-sm text-zinc-500 max-w-xs mx-auto mt-2'>Crie sua primeira equipe para começar a organizar melhor suas entregas.</p>
                  <Button onClick={() => setIsCreating(true)} variant='outline' className='mt-6'>
                    Começar agora
                  </Button>
                </div>
              ) : (
                <List columns={teamColumns} headers={['Nome', 'Membros', 'Tarefas ativas', '']}>
                  {teams.map((team) => (
                    <ListRow key={team.id} columns={teamColumns} onClick={() => setEditingTeam(team)}>
                      <div className='flex items-baseline gap-2.5 min-w-0'>
                        <span className='text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate'>{team.name}</span>
                        {team.description && <span className='text-xs text-zinc-400 truncate'>{team.description}</span>}
                      </div>
                      <span className='text-sm text-zinc-500'>{team._count?.members || 0}</span>
                      <span className='text-sm text-zinc-500'>{team._count?.tasks || 0}</span>
                      <ListActions>
                        <ListAction title='Excluir equipe' danger onClick={() => handleDelete(team.id)}>
                          <Trash2 size={14} />
                        </ListAction>
                      </ListActions>
                    </ListRow>
                  ))}
                </List>
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
