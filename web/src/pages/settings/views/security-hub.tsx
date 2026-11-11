import { Plus, Shield, X, Activity, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { alertDialog, confirmDialog } from '../../../components/ui/confirm-dialog';
import { PermissionForm } from './permission-form';
import { authClient } from '../../../lib/auth-client';
import { useState, useEffect } from 'react';
import { useTenantStore } from '../../../store';
import { useTenant } from '../../../hooks/useTenant';
import { apiBase } from '../../../api/fetcher';
import { List, ListAction, ListActions, ListRow } from '../../../components/ui/list';

const memberColumns = '1fr 140px 72px';
const roleLabels: Record<string, string> = { owner: 'Dono', admin: 'Administrador', member: 'Membro' };

export function SecurityHub() {
  const { company_id } = useTenant();
  const { organizations } = useTenantStore();
  const currentOrg = organizations.find((o) => o.id === company_id || (o as any).slug === company_id) || organizations[0];
  const activeOrganizationId = currentOrg?.id;

  const [members, setMembers] = useState<any[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

  // Controles de abas dentro de Usuários e Segurança
  const [activeTab, setActiveTab] = useState<'members' | 'roles' | 'auth' | 'logs'>('members');
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [roles, setRoles] = useState<any[]>([]);

  useEffect(() => {
    if (activeOrganizationId) {
      loadMembers();
      if (activeTab === 'roles') loadRoles();
    }
  }, [activeOrganizationId, activeTab]);

  const loadRoles = async () => {
    try {
      if (!activeOrganizationId) return;
      // better-auth fetch typically returns { data, error }
      const { data } = (await authClient.$fetch(`${apiBase}/settings/roles`, {
        headers: { 'x-organization-id': activeOrganizationId },
      })) as any;

      setRoles(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setRoles([]);
    }
  };

  const loadMembers = async () => {
    try {
      if (!activeOrganizationId) return;
      const { data } = await authClient.organization.getFullOrganization({
        query: { organizationId: activeOrganizationId },
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

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: newUser, error: createError } = await authClient.admin.createUser({
        email: memberEmail,
        name: memberName,
        password: memberPassword,
        role: inviteRole === 'admin' ? 'admin' : 'user',
      });

      if (createError) throw new Error(createError.message || 'Falha na criação do usuário.');
      if (!newUser?.user?.id) throw new Error('Falha na criação do usuário (ID não retornado).');

      if (!activeOrganizationId) {
        throw new Error('Nenhuma organização ativa selecionada. Selecione uma empresa antes de cadastrar usuários.');
      }

      await authClient.$fetch(`${apiBase}/settings/members/link`, {
        method: 'POST',
        headers: { 'x-organization-id': activeOrganizationId },
        body: {
          userId: newUser.user.id,
          role: inviteRole,
        },
      });

      setIsInviting(false);
      setMemberEmail('');
      setMemberName('');
      setMemberPassword('');
      loadMembers();
    } catch (e) {
      console.error(e);
      alertDialog('Não foi possível criar o usuário. Tente novamente.');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!(await confirmDialog('Remover este membro da organização?', { confirmLabel: 'Remover', danger: true }))) return;
    try {
      await authClient.organization.removeMember({
        memberIdOrEmail: memberId,
        organizationId: activeOrganizationId,
      });
      loadMembers();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className='space-y-8 animate-slide-up pb-10'>
      {/* HEADER INFORMATIVO */}
      <div className='mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-6'>
        <h2 className='text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-2'>Usuários e Segurança</h2>
        <p className='text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl'>
          Gerencie os membros da equipe, configure perfis de permissão ou monitore as atividades de cada usuário no sistema.
        </p>
      </div>

      {/* TAB NAVIGATION */}
      <div className='flex bg-neutral-100 dark:bg-neutral-800/50 p-1 rounded-lg w-fit mb-6 overflow-x-auto max-w-full'>
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'members' ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
        >
          Membros
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'roles' ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
        >
          Funções de acesso
        </button>
        <button
          onClick={() => setActiveTab('auth')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'auth' ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
        >
          Segurança e Autenticação
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === 'logs' ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
        >
          Log de auditoria
        </button>
      </div>

      {activeTab === 'members' && (
        <div className='flex flex-col gap-4 animate-in fade-in duration-300'>
          <div className='flex justify-between items-end border-b border-neutral-200 dark:border-neutral-800 pb-4'>
            <div>
              <h3 className='font-semibold text-neutral-900 dark:text-white text-lg'>Diretório de Usuários</h3>
              <p className='text-xs text-neutral-500 mt-1'>Veja todos os membros com acesso ao workspace.</p>
            </div>
            <Button variant='outline' size='sm' className='gap-2' onClick={() => setIsInviting(true)}>
              <Plus size={16} />
              Adicionar Novo Usuário
            </Button>
          </div>

          {members.length === 0 ? (
            <p className='py-8 text-center text-sm text-neutral-500'>Nenhum membro encontrado.</p>
          ) : (
            <List columns={memberColumns} headers={['Membro', 'Cargo', '']}>
              {members.map((member) => (
                <ListRow key={member.id} columns={memberColumns}>
                  <div className='flex items-center gap-2.5 min-w-0'>
                    <span className='w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-[11px] font-semibold flex items-center justify-center shrink-0'>
                      {member.user?.name ? member.user.name.charAt(0).toUpperCase() : '?'}
                    </span>
                    <span className='text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate'>{member.user?.name || member.email}</span>
                    <span className='text-xs text-zinc-400 truncate'>{member.user?.email || member.email}</span>
                  </div>
                  <span className='text-sm text-zinc-500'>{roleLabels[member.role] || member.role}</span>
                  <ListActions>
                    <ListAction title='Remover da organização' danger onClick={() => handleRemoveMember(member.id)}>
                      <Trash2 size={14} />
                    </ListAction>
                  </ListActions>
                </ListRow>
              ))}
            </List>
          )}
        </div>
      )}

      {activeTab === 'roles' && (
        <div className='flex flex-col gap-6 animate-in fade-in duration-300'>
          <div className='flex justify-between items-end border-b border-neutral-200 dark:border-neutral-800 pb-4'>
            <div>
              <h3 className='font-semibold text-neutral-900 dark:text-white text-lg'>Perfis de Permissão</h3>
              <p className='text-xs text-neutral-500 mt-1'>Crie perfis e defina exatamente o que cada pessoa pode ver e editar.</p>
            </div>
            <Button variant='outline' size='sm' className='gap-2' onClick={() => setEditingRole('new')}>
              <Plus size={16} />
              Criar Novo Perfil
            </Button>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {roles &&
              roles?.map((role) => (
                <div
                  key={role.id}
                  onClick={() => setEditingRole(role.id)}
                  className='p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 flex flex-col min-h-[160px] cursor-pointer hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group relative'
                >
                  <div className='p-2 w-fit rounded-lg bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 mb-4 shadow-sm group-hover:scale-110 transition-transform'>
                    <Shield size={20} className='text-blue-500' />
                  </div>
                  <h4 className='font-bold text-neutral-900 dark:text-neutral-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors'>
                    {role.name}
                  </h4>
                  <p className='text-xs text-neutral-500 line-clamp-2'>{role.permissions?.length || 0} permissões configuradas neste perfil.</p>
                  <div className='mt-auto flex items-center justify-between pt-4'>
                    <span className='text-[10px] font-bold text-neutral-400 uppercase tracking-wider'>{role._count?.members || 0} membros</span>
                    <div className='text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] font-bold uppercase'>
                      Editar <Plus size={10} className='rotate-45' />
                    </div>
                  </div>
                </div>
              ))}

            {/* PADRÕES (Opcional, se quiser manter os fixos como template) */}
            {!roles.length && (
              <>
                <div className='p-8 border border-neutral-200/50 dark:border-neutral-800/50 border-dashed rounded-xl col-span-full flex flex-col items-center justify-center text-center opacity-60'>
                  <Shield size={32} className='text-neutral-300 mb-2' />
                  <p className='text-sm font-medium text-neutral-400'>Nenhum perfil customizado encontrado.</p>
                  <p className='text-xs text-neutral-500'>Clique em "Criar Novo Perfil" para começar.</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'auth' && (
        <div className='flex flex-col gap-6 animate-in fade-in duration-300'>
          <div className='flex justify-between items-end border-b border-neutral-200 dark:border-neutral-800 pb-4'>
            <div>
              <h3 className='font-semibold text-neutral-900 dark:text-white text-lg'>Segurança e Autenticação</h3>
              <p className='text-xs text-neutral-500 mt-1'>Reforce a proteção das contas dos usuários.</p>
            </div>
          </div>
          <div className='space-y-4'>
            <div className='p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 flex items-center justify-between'>
              <div>
                <h4 className='font-bold text-neutral-900 dark:text-neutral-100'>Autenticação de Dois Fatores (2FA)</h4>
                <p className='text-xs text-neutral-500'>Exigir código adicional no login para todos.</p>
              </div>
              <div className='w-10 h-5 bg-neutral-300 dark:bg-neutral-700 rounded-full relative'>
                <div className='absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full' />
              </div>
            </div>
            <div className='p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 flex items-center justify-between'>
              <div>
                <h4 className='font-bold text-neutral-900 dark:text-neutral-100'>Política de Senhas</h4>
                <p className='text-xs text-neutral-500'>Exigir senhas fortes e trocas periódicas.</p>
              </div>
              <Button variant='outline' size='sm'>
                Configurar
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className='flex flex-col gap-4 animate-in fade-in duration-300'>
          <div className='flex justify-between items-end border-b border-neutral-200 dark:border-neutral-800 pb-4'>
            <div>
              <h3 className='font-semibold text-neutral-900 dark:text-white text-lg'>Logs de Atividade</h3>
              <p className='text-xs text-neutral-500 mt-1'>Monitore quem fez o que e quando no seu workspace.</p>
            </div>
          </div>

          <div className='p-12 border border-neutral-200 dark:border-neutral-800 border-dashed rounded-xl bg-transparent flex flex-col items-center justify-center text-center'>
            <Activity size={32} className='text-neutral-300 dark:text-neutral-700 mb-4' />
            <h4 className='font-bold text-neutral-500 dark:text-neutral-400 mb-1'>Nenhum evento detectado</h4>
            <p className='text-sm text-neutral-400 dark:text-neutral-500'>O sistema de auditoria está coletando eventos...</p>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO */}
      {isInviting && (
        <div className='fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200'>
          <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200'>
            <div className='flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800'>
              <h3 className='font-bold text-zinc-900 dark:text-zinc-100'>Adicionar Membro (Sem Convite)</h3>
              <button onClick={() => setIsInviting(false)} className='text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors'>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleInvite} className='p-6 space-y-4'>
              <div className='space-y-1.5'>
                <label className='text-[10px] font-black  text-zinc-400'>Nome do Membro</label>
                <input
                  autoFocus
                  type='text'
                  required
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder='Ex: João da Silva'
                  className='w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium'
                />
              </div>
              <div className='space-y-1.5'>
                <label className='text-[10px] font-black  text-zinc-400'>E-mail de Login</label>
                <input
                  type='email'
                  required
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder='exemplo@empresa.com'
                  className='w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium'
                />
              </div>
              <div className='space-y-1.5'>
                <label className='text-[10px] font-black  text-zinc-400'>Senha Padrão (Provisória)</label>
                <input
                  type='text'
                  required
                  value={memberPassword}
                  onChange={(e) => setMemberPassword(e.target.value)}
                  placeholder='*******'
                  className='w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium'
                />
              </div>
              <div className='space-y-1.5'>
                <label className='text-[10px] font-black  text-zinc-400'>Cargo de Acesso</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className='w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 transition-all font-medium'
                >
                  <option value='member'>Membro (Padrão)</option>
                  <option value='admin'>Administrador</option>
                </select>
              </div>
              <div className='pt-4 flex gap-3'>
                <Button type='button' variant='ghost' className='flex-1' onClick={() => setIsInviting(false)}>
                  Cancelar
                </Button>
                <Button type='submit' className='flex-1 bg-blue-500 hover:bg-blue-600 text-white border-0'>
                  Criar Usuário
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* PERMISSION FORM MODAL */}
      {editingRole && (
        <div className='fixed inset-0 z-[110] flex items-center justify-center p-0 md:p-8 bg-black/40 animate-in fade-in duration-300'>
          <div className='bg-white dark:bg-zinc-900 w-full h-full md:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-10 duration-300'>
            <div className='flex-1 overflow-y-auto p-12'>
              <PermissionForm
                organizationId={activeOrganizationId}
                onBack={() => {
                  setEditingRole(null);
                  loadRoles();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
