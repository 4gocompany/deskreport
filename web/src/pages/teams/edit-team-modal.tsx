import { useState, useEffect } from 'react';
import { Button, Dialog } from '../../components/ui';
import { authClient } from '../../lib/auth-client';
import { useTenantStore } from '../../store';
import { useTenant } from '../../hooks/useTenant';
import { Check, Search } from 'lucide-react';
import { apiBase } from '../../api/fetcher';

interface EditTeamModalProps {
  team: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditTeamModal({ team, onClose, onSuccess }: EditTeamModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [searchMember, setSearchMember] = useState('');

  const { fetchTeams } = useTenantStore();
  const { company_id } = useTenant();

  useEffect(() => {
    loadOrgMembers();
    if (team) {
      setName(team.name || '');
      setDescription(team.description || '');
      setSelectedMemberIds(team.members?.map((m: any) => m.userId) || []);
    }
  }, [team, company_id]);

  const loadOrgMembers = async () => {
    if (!company_id) return;
    try {
      const { data } = await authClient.organization.getFullOrganization({
        query: { organizationId: company_id },
      });
      if (data?.members) {
        const humanMembers = data.members.filter(
          (m: any) => !m.userId?.startsWith('agent-user-') && !m.user?.email?.endsWith('@agents.deskreport.com.br')
        );
        setMembers(humanMembers);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMemberIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
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
      const payload = {
        name,
        description,
        members: selectedMemberIds,
      };

      if (team) {
        await authClient.$fetch(`${apiBase}/teams/${team.id}`, {
          method: 'PUT',
          body: payload,
          headers,
        });
      } else {
        await authClient.$fetch(`${apiBase}/teams`, {
          method: 'POST',
          body: payload,
          headers,
        });
      }

      if (company_id) {
        await fetchTeams(company_id);
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save team:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(
    (m) => m.user?.name?.toLowerCase().includes(searchMember.toLowerCase()) || m.user?.email?.toLowerCase().includes(searchMember.toLowerCase()),
  );

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      title={team ? 'Editar Equipe' : 'Nova Equipe'}
      maxWidth='md'
      footer={
        <>
          <Button type='button' variant='ghost' className='flex-1' onClick={onClose}>
            Cancelar
          </Button>
          <Button type='submit' form='team-form' className='flex-1' disabled={loading}>
            {loading ? 'Salvando...' : team ? 'Salvar Alterações' : 'Criar Equipe'}
          </Button>
        </>
      }
    >
      <form id='team-form' onSubmit={handleSubmit} className='space-y-6'>
        <div className='space-y-4'>
          <div className='space-y-1.5'>
            <label className='text-[10px] font-black text-zinc-400 uppercase tracking-wider'>Identificação</label>
            <input
              autoFocus
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Nome da equipe (ex: Design, Suporte...)'
              className='w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium'
            />
          </div>

          <div className='space-y-1.5'>
            <label className='text-[10px] font-black text-zinc-400 uppercase tracking-wider'>Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='O que esta equipe faz?'
              className='w-full min-h-[80px] resize-none bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium'
            />
          </div>
        </div>

        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <label className='text-[10px] font-black text-zinc-400 uppercase tracking-wider'>Membros da Equipe ({selectedMemberIds.length})</label>
            <div className='relative'>
              <Search size={14} className='absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400' />
              <input
                type='text'
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                placeholder='Filtrar membros...'
                className='pl-9 pr-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500/50 w-48'
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar'>
            {filteredMembers.map((member) => {
              const isSelected = selectedMemberIds.includes(member.user.id);
              return (
                <div
                  key={member.id}
                  onClick={() => toggleMember(member.user.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                      : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className='relative'>
                    <img
                      src={member.user.image || `https://ui-avatars.com/api/?name=${member.user.name}&background=random`}
                      className='w-8 h-8 rounded-full bg-zinc-100'
                    />
                    {isSelected && (
                      <div className='absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 border-2 border-white dark:border-zinc-900 flex items-center justify-center'>
                        <Check size={10} className='text-white' />
                      </div>
                    )}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate'>{member.user.name}</div>
                    <div className='text-[10px] text-zinc-500 truncate'>{member.user.email}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </form>
    </Dialog>
  );
}
