import { useState, useEffect } from 'react';
import { Button, Dialog } from '../../components/ui';
import { authClient } from '../../lib/auth-client';
import { useTenantStore } from '../../store';
import { useTenant } from '../../hooks/useTenant';
import { apiBase } from '../../api/fetcher';

interface EditProjectModalProps {
  project: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditProjectModal({ project, onClose, onSuccess }: EditProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  const { fetchProjects, teams, fetchTeams } = useTenantStore();
  const { company_id } = useTenant();

  useEffect(() => {
    if (company_id) {
      fetchTeams(company_id);
    }
  }, [company_id]);

  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setDescription(project.description || '');
      setStatus(project.status || 'active');
      setSelectedTeamIds(project.teams?.map((t: any) => t.teamId) || []);
    } else {
      setName('');
      setDescription('');
      setStatus('active');
      setSelectedTeamIds([]);
    }
  }, [project]);

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) => (prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const headers: any = {};
    if (company_id) {
      headers['x-organization-id'] = company_id;
    }

    try {
      const payload = { name, description, status, teamIds: selectedTeamIds };

      if (project) {
        await authClient.$fetch(`${apiBase}/projects/${project.id}`, {
          method: 'PUT',
          body: payload,
          headers,
        });
      } else {
        await authClient.$fetch(`${apiBase}/projects`, {
          method: 'POST',
          body: payload,
          headers,
        });
      }
      if (company_id) {
        await fetchProjects(company_id);
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save project:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      title={project ? 'Editar Projeto' : 'Novo Projeto'}
      maxWidth='md'
      footer={
        <>
          <Button type='button' variant='ghost' className='flex-1' onClick={onClose}>
            Cancelar
          </Button>
          <Button type='submit' form='project-form' className='flex-1' disabled={loading}>
            {loading ? 'Salvando...' : project ? 'Salvar Alterações' : 'Criar Projeto'}
          </Button>
        </>
      }
    >
      <form id='project-form' onSubmit={handleSubmit} className='space-y-6'>
        <div className='space-y-4'>
          <div className='space-y-1.5'>
            <label className='text-[10px] font-black  text-zinc-400'>Nome do Projeto</label>
            <input
              autoFocus
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Ex: Comercial, Marketing...'
              className='w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium'
            />
          </div>

          <div className='space-y-1.5'>
            <label className='text-[10px] font-black  text-zinc-400'>Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Descreva o propósito deste projeto...'
              className='w-full min-h-[100px] resize-none bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium'
            />
          </div>

          <div className='space-y-1.5'>
            <label className='text-[10px] font-black  text-zinc-400'>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className='w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-all font-medium'
            >
              <option value='active'>Ativo</option>
              <option value='archived'>Arquivado</option>
            </select>
          </div>
        </div>

        <div className='space-y-3'>
          <label className='text-[10px] font-black text-zinc-400 uppercase tracking-wider'>Equipes Vinculadas ({selectedTeamIds.length})</label>
          <div className='grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar'>
            {teams.map((team) => {
              const isSelected = selectedTeamIds.includes(team.id);
              return (
                <div
                  key={team.id}
                  onClick={() => toggleTeam(team.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                      : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className='flex-1 min-w-0'>
                    <div className='text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate'>{team.name}</div>
                    <div className='text-[10px] text-zinc-500 truncate'>{team._count?.members || 0} membros</div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-zinc-300 dark:border-zinc-700'
                    }`}
                  >
                    {isSelected && <div className='w-1.5 h-1.5 rounded-full bg-white' />}
                  </div>
                </div>
              );
            })}
            {teams.length === 0 && <div className='col-span-2 text-[10px] text-zinc-400 italic'>Nenhuma equipe cadastrada.</div>}
          </div>
        </div>
      </form>
    </Dialog>
  );
}
