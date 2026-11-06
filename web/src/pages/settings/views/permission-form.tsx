import { useState } from 'react';
import { ArrowLeft, Search, Users, X, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { authClient } from '../../../lib/auth-client';
import { apiBase } from '../../../api/fetcher';

interface PermissionFormProps {
  organizationId?: string;
  onBack: () => void;
}

const PERMISSION_SECTIONS = [
  {
    id: 'admin',
    title: 'Acesso total de administrador',
    permissions: [{ id: 'admin_all', title: 'Controle total do sistema', description: 'Acesso total a todos os recursos e dados sem restrições.' }],
  },
  {
    id: 'dashboard',
    title: 'Painel',
    permissions: [
      { id: 'dashboard_projects_progress', title: 'Ver progresso de projetos', description: 'Visualizar status e progresso de todos os projetos.' },
      {
        id: 'dashboard_only_own_tasks',
        title: 'Ver apenas tarefas vinculadas do usuário',
        description: 'Restringir a visão do painel apenas para as próprias tarefas.',
      },
    ],
  },
  {
    id: 'tasks',
    title: 'Tarefas',
    permissions: [
      { id: 'tasks_all', title: 'Controle total', description: 'Permissões completas de tarefas.' },
      { id: 'tasks_read', title: 'Ler', description: 'Permite visualizar as tarefas da organização.' },
      { id: 'tasks_create', title: 'Criar', description: 'Permite criar novas tarefas.' },
      { id: 'tasks_update', title: 'Editar', description: 'Permite editar tarefas existentes.' },
      { id: 'tasks_delete', title: 'Remover', description: 'Permite remover tarefas do sistema.' },
    ],
  },
  {
    id: 'automation',
    title: 'Automação',
    permissions: [
      { id: 'automation_all', title: 'Controle total', description: 'Acesso total a todas as funções de automação.' },

      // Modelos de mensagens
      { id: 'auto_templates_all', title: 'Modelos: Controle total', description: 'Gestão completa de modelos de mensagens.' },
      { id: 'auto_templates_read', title: 'Modelos: Ler', description: 'Visualizar modelos de mensagens.' },
      { id: 'auto_templates_create', title: 'Modelos: Criar', description: 'Criar novos modelos de mensagens.' },
      { id: 'auto_templates_update', title: 'Modelos: Editar', description: 'Editar modelos de mensagens existentes.' },
      { id: 'auto_templates_delete', title: 'Modelos: Remover', description: 'Excluir modelos de mensagens.' },

      // Mensagens automáticas
      { id: 'auto_msgs_all', title: 'Mensagens Auto: Controle total', description: 'Gestão completa de envios automáticos.' },
      { id: 'auto_msgs_read', title: 'Mensagens Auto: Ler', description: 'Visualizar mensagens automáticas configuradas.' },
      { id: 'auto_msgs_create', title: 'Mensagens Auto: Criar', description: 'Criar novas regras de mensagens automáticas.' },
      { id: 'auto_msgs_update', title: 'Mensagens Auto: Editar', description: 'Editar regras de mensagens automáticas.' },
      { id: 'auto_msgs_delete', title: 'Mensagens Auto: Remover', description: 'Excluir regras de mensagens automáticas.' },

      // Construtor de bots
      { id: 'auto_bots_all', title: 'Bots: Controle total', description: 'Acesso total ao construtor de bots fluxos.' },
      { id: 'auto_bots_read', title: 'Bots: Ler', description: 'Visualizar fluxos de bots.' },
      { id: 'auto_bots_create', title: 'Bots: Criar', description: 'Criar novos fluxos de conversação.' },
      { id: 'auto_bots_update', title: 'Bots: Editar', description: 'Editar lógica de bots existentes.' },
      { id: 'auto_bots_delete', title: 'Bots: Remover', description: 'Excluir bots do sistema.' },
    ],
  },
  {
    id: 'projects',
    title: 'Projetos',
    permissions: [
      { id: 'projects_all', title: 'Controle total', description: 'Acesso completo ao gerenciamento de projetos.' },
      { id: 'projects_read', title: 'Ler', description: 'Visualizar projetos ativos.' },
      { id: 'projects_create', title: 'Criar', description: 'Criar novos projetos na organização.' },
      { id: 'projects_update', title: 'Editar', description: 'Editar detalhes e membros do projeto.' },
      { id: 'projects_delete', title: 'Remover', description: 'Excluir projetos permanentemente.' },
    ],
  },
  {
    id: 'chat',
    title: 'Chat de atendimento',
    permissions: [
      { id: 'chat_all', title: 'Controle total', description: 'Gestão completa do chat e contatos.' },
      { id: 'chat_contacts_read', title: 'Ler contatos', description: 'Visualizar lista de contatos.' },
      { id: 'chat_contacts_create', title: 'Criar contatos', description: 'Adicionar novos contatos manualmente.' },
      { id: 'chat_contacts_update', title: 'Editar contatos', description: 'Atualizar dados de contatos.' },
      { id: 'chat_contacts_delete', title: 'Remover contatos', description: 'Excluir contatos da base.' },
      { id: 'chat_message_send', title: 'Enviar mensagem', description: 'Permite responder conversas.' },
      { id: 'chat_message_delete', title: 'Apagar mensagem', description: 'Permite apagar mensagens enviadas.' },
      { id: 'chat_message_update', title: 'Editar mensagem', description: 'Permite editar o conteúdo de mensagens enviadas.' },
    ],
  },
  {
    id: 'organizations',
    title: 'Organizations',
    permissions: [
      { id: 'org_all', title: 'Controle total', description: 'Acesso Administrativo à configurações da organização.' },
      { id: 'org_read', title: 'Ler', description: 'Visualizar dados da organização.' },
      { id: 'org_create', title: 'Criar', description: 'Criar novas sub-organizações ou unidades.' },
      { id: 'org_update', title: 'Editar', description: 'Editar detalhes da organização.' },
      { id: 'org_delete', title: 'Remover', description: 'Excluir organização do sistema.' },
    ],
  },
  {
    id: 'users',
    title: 'Configurações: Usuários',
    permissions: [
      { id: 'cfg_users_all', title: 'Controle total', description: 'Gestão completa de usuários.' },
      { id: 'cfg_users_read', title: 'Ler', description: 'Visualizar lista de usuários.' },
      { id: 'cfg_users_create', title: 'Criar', description: 'Convidar ou criar novos usuários.' },
      { id: 'cfg_users_update', title: 'Editar', description: 'Editar cadastro e status de usuários.' },
      { id: 'cfg_users_delete', title: 'Remover', description: 'Desativar ou remover usuários da conta.' },
    ],
  },
  {
    id: 'teams',
    title: 'Configurações: Equipes',
    permissions: [
      { id: 'cfg_teams_all', title: 'Controle total', description: 'Gestão completa de equipes.' },
      { id: 'cfg_teams_read', title: 'Ler', description: 'Visualizar equipes existentes.' },
      { id: 'cfg_teams_create', title: 'Criar', description: 'Criar novas equipes.' },
      { id: 'cfg_teams_update', title: 'Editar', description: 'Editar estrutura da equipe.' },
      { id: 'cfg_teams_delete', title: 'Remover', description: 'Excluir equipes.' },
      { id: 'cfg_teams_members', title: 'Adicionar membros', description: 'Gerenciar membros dentro de equipes.' },
    ],
  },
  {
    id: 'permissions',
    title: 'Configurações: Permissões',
    permissions: [
      { id: 'cfg_perms_all', title: 'Controle total', description: 'Gestão completa dos perfis de segurança.' },
      { id: 'cfg_perms_read', title: 'Ler', description: 'Visualizar perfis existentes.' },
      { id: 'cfg_perms_create', title: 'Criar', description: 'Criar novos perfis de permissão.' },
      { id: 'cfg_perms_update', title: 'Editar', description: 'Editar permissões de perfis existentes.' },
      { id: 'cfg_perms_delete', title: 'Remover', description: 'Excluir perfis de segurança.' },
      { id: 'cfg_perms_members', title: 'Adicionar membros', description: 'Vincular usuários a perfis de acesso.' },
    ],
  },
  {
    id: 'audit',
    title: 'Log de auditoria',
    permissions: [
      { id: 'audit_all', title: 'Visualizar auditoria completa', description: 'Ver logs de atividade de todos os usuários da organização.' },
      { id: 'audit_self', title: 'Visualizar auditoria pessoal', description: 'Ver apenas os próprios logs de atividade.' },
    ],
  },
];

export function PermissionForm({ onBack, organizationId }: PermissionFormProps) {
  const [roleName, setRoleName] = useState('');
  const [selectedSection, setSelectedSection] = useState('tasks');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!roleName.trim()) {
      alert('Por favor, informe o nome da função.');
      return;
    }

    try {
      setLoading(true);
      // Usando URL absoluta para evitar o prefixo /api/auth automático do better-auth client
      await authClient.$fetch(`${apiBase}/settings/roles`, {
        method: 'POST',
        headers: {
          'x-organization-id': organizationId || '',
        },
        body: {
          name: roleName,
          permissions: selectedPermissions,
        },
      });
      onBack();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar perfil de acesso.');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (id: string) => {
    setSelectedPermissions((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const toggleSectionAll = (_sectionId: string, permissions: any[]) => {
    const allPermissionIds = permissions.map((p) => p.id);
    const allSelected = allPermissionIds.every((id) => selectedPermissions.includes(id));

    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((id) => !allPermissionIds.includes(id)));
    } else {
      setSelectedPermissions((prev) => {
        const uniqueIds = new Set([...prev, ...allPermissionIds]);
        return Array.from(uniqueIds);
      });
    }
  };

  const activeSection = PERMISSION_SECTIONS.find((s) => s.id === selectedSection);

  return (
    <div className='flex flex-col h-full w-full animate-in fade-in duration-300'>
      {/* HEADER */}
      <div className='flex items-start justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4 mb-6'>
        <div className='flex items-start gap-4'>
          <button onClick={onBack} className='mt-1 p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors'>
            <ArrowLeft size={20} className='text-neutral-500' />
          </button>
          <div>
            <h2 className='text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-1'>Perfil de Acesso</h2>
            <div className='text-[11px] text-zinc-500 font-medium'>Configure permissões granulares para esta função</div>
          </div>
        </div>

        <div className='flex gap-3 text-right'>
          <Button variant='outline' onClick={onBack} disabled={loading}>
            Cancelar
          </Button>
          <Button className='bg-blue-600 hover:bg-blue-700 text-white border-0 min-w-[100px]' onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 size={16} className='animate-spin' /> : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* BARRA DE NOME & MEMBERS */}
      <div className='flex items-end justify-between border-b border-neutral-200 dark:border-neutral-800 mb-8 px-12 pb-4'>
        <div className='flex-1 max-w-sm'>
          <label className='text-[10px] font-black  text-zinc-400 mb-2 block'>Nome da Função</label>
          <input
            type='text'
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder='Ex: Gerente, Suporte...'
            className='w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold'
          />
        </div>

        <button
          onClick={() => setIsMembersOpen(true)}
          className='flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-all border border-neutral-200 dark:border-neutral-800'
        >
          <Users size={14} />
          Membros da função (0)
        </button>
      </div>

      {/* TWO PANE LAYOUT */}
      <div className='flex gap-8 flex-1 pl-12 pr-12'>
        {/* PANE 1: Sections Menu */}
        <div className='w-64 flex flex-col gap-4'>
          <div className='relative'>
            <Search size={14} className='absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400' />
            <input
              type='text'
              placeholder='Pesquisar permissões'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full pl-9 pr-3 py-2 text-sm bg-transparent border border-neutral-200 dark:border-neutral-700 rounded-lg outline-none focus:border-blue-500 transition-colors'
            />
          </div>

          <div className='flex flex-col space-y-1 mt-2'>
            {PERMISSION_SECTIONS.map((section) => {
              const total = section.permissions.length;
              const selected = section.permissions.filter((p) => selectedPermissions.includes(p.id)).length;

              return (
                <button
                  key={section.id}
                  onClick={() => setSelectedSection(section.id)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${selectedSection === section.id ? 'bg-neutral-100 dark:bg-neutral-800/50 font-bold text-neutral-900 dark:text-white' : 'font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/20'}`}
                >
                  <span className='truncate pr-2'>{section.title}</span>
                  <span className='text-[10px] text-neutral-400 font-semibold'>
                    {selected}/{total}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className='flex-1 flex flex-col pr-8'>
          {activeSection && (
            <div className='animate-in fade-in duration-200'>
              {/* Select All Checkbox */}
              <label className='flex items-center gap-3 py-3 border-b border-neutral-200 dark:border-neutral-800 cursor-pointer group'>
                <div className='relative flex items-center justify-center'>
                  <input
                    type='checkbox'
                    className='peer appearance-none w-4 h-4 border border-neutral-300 dark:border-neutral-600 rounded bg-transparent checked:bg-blue-500 checked:border-blue-500 cursor-pointer transition-colors'
                    checked={activeSection.permissions.every((p) => selectedPermissions.includes(p.id))}
                    onChange={() => toggleSectionAll(activeSection.id, activeSection.permissions)}
                  />
                  <svg
                    className='absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='3'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <polyline points='20 6 9 17 4 12'></polyline>
                  </svg>
                </div>
                <span className='text-[15px] font-bold text-neutral-900 dark:text-white select-none'>{activeSection.title}</span>
              </label>

              {/* Individual Checkboxes */}
              <div className='mt-2 pl-7 flex flex-col'>
                {activeSection.permissions.map((perm) => (
                  <label key={perm.id} className='flex items-start gap-3 py-4 border-b border-neutral-100 dark:border-neutral-800/50 cursor-pointer group'>
                    <div className='relative flex items-center justify-center mt-0.5'>
                      <input
                        type='checkbox'
                        className='peer appearance-none w-4 h-4 border border-neutral-300 dark:border-neutral-600 rounded bg-transparent checked:bg-blue-500 checked:border-blue-500 cursor-pointer transition-colors'
                        checked={selectedPermissions.includes(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                      />
                      <svg
                        className='absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='3'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      >
                        <polyline points='20 6 9 17 4 12'></polyline>
                      </svg>
                    </div>
                    <div className='flex flex-col select-none'>
                      <span className='text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-0.5'>{perm.title}</span>
                      <span className='text-xs text-neutral-500'>{perm.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MEMBERS MODAL */}
      {isMembersOpen && (
        <div className='fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-200'>
          <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200'>
            <div className='flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800'>
              <h3 className='font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2'>
                <Users size={18} className='text-blue-500' />
                Membros da função
              </h3>
              <button onClick={() => setIsMembersOpen(false)} className='text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors'>
                <X size={20} />
              </button>
            </div>

            <div className='p-6 space-y-6'>
              <div className='space-y-2'>
                <label className='text-[10px] font-black  text-zinc-400'>Atribuir novos técnicos</label>
                <div className='flex gap-2'>
                  <select className='flex-1 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 transition-all font-medium'>
                    <option value=''>Selecionar técnicos...</option>
                  </select>
                  <Button className='bg-blue-600 hover:bg-blue-700 text-white border-0 gap-2 h-auto px-4'>
                    <UserPlus size={16} />
                    Atribuir
                  </Button>
                </div>
              </div>

              <div className='space-y-3'>
                <label className='text-[10px] font-black  text-zinc-400'>Técnicos já atribuídos</label>
                <div className='border border-zinc-100 dark:border-zinc-800/50 rounded-xl divide-y divide-zinc-50 dark:divide-zinc-800'>
                  <div className='px-12 py-10 flex flex-col items-center justify-center text-center'>
                    <Users size={32} className='text-zinc-200 dark:text-zinc-800 mb-3' />
                    <p className='text-sm font-bold text-zinc-400'>Nenhum técnico atribuído</p>
                    <p className='text-[10px] text-zinc-400 mt-1'>Selecione técnicos acima para dar acesso a esta função.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className='px-6 py-4 bg-zinc-50 dark:bg-zinc-800/20 border-t border-zinc-100 dark:border-zinc-800 flex justify-end'>
              <Button onClick={() => setIsMembersOpen(false)} className='bg-zinc-900 dark:bg-zinc-700 text-white border-0'>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
