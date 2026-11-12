import { useState, useEffect } from 'react';
import { Button, Dialog } from '../../components/ui';
import { authClient } from '../../lib/auth-client';
import { useTenantStore } from '../../store';
import { dateDay } from '../resume/use-inbox';
import { useTenant } from '../../hooks/useTenant';
import { apiBase } from '../../api/fetcher';
import { useMachines } from '../../hooks/useMachines';
import { agentProfile, useAgentsStore } from '../tasks/use-agents';

interface EditProjectModalProps {
  project: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditProjectModal({ project, onClose, onSuccess }: EditProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pickedFolder, setPickedFolder] = useState('');
  const [defaultMachineId, setDefaultMachineId] = useState('');
  const [status, setStatus] = useState('active');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [autoCommitAfterQa, setAutoCommitAfterQa] = useState(false);
  const [environments, setEnvironments] = useState<any[]>([]);

  const [productOwnerId, setProductOwnerId] = useState('');

  const { fetchProjects, teams, fetchTeams, members, fetchMembers } = useTenantStore();
  const agents = useAgentsStore((state) => state.agents);
  const { company_id } = useTenant();
  const machines = useMachines(company_id);

  useEffect(() => {
    if (company_id) {
      fetchTeams(company_id);
      fetchMembers(company_id);
    }
  }, [company_id]);

  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setDescription(project.description || '');
      setPickedFolder('');
      setDefaultMachineId(project.defaultMachineId || '');
      setStatus(project.status || 'active');
      setEndDate(project.endDate ? dateDay(project.endDate) : '');
      setSelectedTeamIds(project.teams?.map((t: any) => t.teamId) || []);
      setAutoCommitAfterQa(project.autoCommitAfterQa === true);
      setProductOwnerId(project.productOwnerId || '');
      setEnvironments(project.environments || []);
    } else {
      setProductOwnerId('');
      setName('');
      setPickedFolder('');
      setDefaultMachineId('');
      setDescription('');
      setStatus('active');
      setEndDate('');
      setSelectedTeamIds([]);
      setAutoCommitAfterQa(false);
      setEnvironments([]);
    }
  }, [project]);

  const addEnvironment = () => {
    setEnvironments((prev) => [...prev, { name: '', kind: 'local', url: '', healthUrl: '', startCommand: '', qaEnabled: true }]);
  };

  const changeEnvironment = (index: number, changes: any) => {
    setEnvironments((prev) => prev.map((item, i) => (i === index ? { ...item, ...changes } : item)));
  };

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
      const [machineId, path] = pickedFolder.split('::');
      const picked = machines.find((machine) => machine.id === machineId)?.folders?.find((item) => item.path === path);
      const payload = {
        name,
        description,
        location: picked ? { machineId, folder: picked.name, path: picked.path } : undefined,
        defaultMachineId: defaultMachineId || undefined,
        status,
        endDate: endDate || null,
        autoCommitAfterQa,
        productOwnerId: productOwnerId || null,
        teamIds: selectedTeamIds,
      };

      let saved: any;
      if (project) {
        saved = await authClient.$fetch(`${apiBase}/projects/${project.id}`, {
          method: 'PUT',
          body: payload,
          headers,
        });
      } else {
        saved = await authClient.$fetch(`${apiBase}/projects`, {
          method: 'POST',
          body: payload,
          headers,
        });
      }
      const projectId = project?.id || saved?.data?.id;
      if (projectId) {
        await authClient.$fetch(`${apiBase}/projects/${projectId}/environments`, {
          method: 'PUT',
          body: environments.map(({ name, kind, url, healthUrl, startCommand, qaEnabled, machineId }) => ({
            name,
            kind,
            url,
            healthUrl,
            startCommand,
            qaEnabled,
            machineId,
          })),
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
            <label className='text-[10px] font-black  text-zinc-400'>Prazo de Entrega</label>
            <input
              type='date'
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className='w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium'
            />
          </div>

          <div className='space-y-1.5'>
            <label className='text-[10px] font-black  text-zinc-400'>Product Owner</label>
            <select
              value={productOwnerId}
              onChange={(e) => setProductOwnerId(e.target.value)}
              className='w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-all font-medium'
            >
              <option value=''>Qualquer membro da organização (padrão)</option>
              {members
                .filter((member) => !member.userId?.startsWith('agent-user-'))
                .map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.user?.name || member.user?.email}
                  </option>
                ))}
              {agents.map(({ agent }) => (
                <option key={agent} value={`agent-user-${agent}`}>
                  {agentProfile(agent).name} (Agente de Produto)
                </option>
              ))}
            </select>
          </div>

          <div className='space-y-1.5'>
            <label className='text-[10px] font-black  text-zinc-400'>Pasta</label>
            <select
              value={pickedFolder}
              onChange={(e) => setPickedFolder(e.target.value)}
              className='w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-all font-medium'
            >
              <option value=''>{project?.folder ? `${project.folder} (atual)` : 'Selecione a pasta'}</option>
              {machines.map((machine) => (
                <optgroup key={machine.id} label={`${machine.name} (${machine.online ? 'Online' : 'Offline'})`}>
                  {(machine.folders || []).map((item) => (
                    <option key={item.path} value={`${machine.id}::${item.path}`}>
                      {item.remote ? `${item.name} (${item.remote})` : item.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {machines.every((machine) => !machine.folders?.length) && (
              <div className='text-[10px] text-zinc-400 italic'>Nenhuma pasta enviada ainda. Conecte o deskreport-client da máquina.</div>
            )}
          </div>

          {project?.locations?.length > 0 && (
            <div className='space-y-1.5'>
              <label className='text-[10px] font-black  text-zinc-400'>Máquinas do projeto</label>
              {project.locations.map((item: any) => {
                const online = machines.find((machine) => machine.id === item.machineId)?.online;
                return (
                  <div key={item.id} className='text-xs text-zinc-600 dark:text-zinc-300'>
                    <span className='font-semibold'>{item.machine?.name}</span> ({online ? 'Online' : 'Offline'}) {item.path}
                    {item.remote && <span className='text-zinc-400'> {item.remote}</span>}
                  </div>
                );
              })}
              <select
                value={defaultMachineId}
                onChange={(e) => setDefaultMachineId(e.target.value)}
                className='w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-all font-medium'
              >
                {project.locations.map((item: any) => (
                  <option key={item.machineId} value={item.machineId}>
                    Máquina padrão: {item.machine?.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
          <div className='flex items-center justify-between'>
            <label className='text-[10px] font-black text-zinc-400 uppercase tracking-wider'>Ambientes ({environments.length})</label>
            <Button type='button' variant='ghost' onClick={addEnvironment}>
              Adicionar
            </Button>
          </div>
          {environments.map((item, index) => (
            <div key={index} className='space-y-2 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800'>
              <div className='flex gap-2'>
                <input
                  value={item.name}
                  onChange={(e) => changeEnvironment(index, { name: e.target.value })}
                  placeholder='Nome'
                  className='flex-1 min-w-0 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 font-medium'
                />
                <select
                  value={item.kind}
                  onChange={(e) => changeEnvironment(index, { kind: e.target.value, qaEnabled: e.target.value !== 'production' })}
                  className='bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 font-medium'
                >
                  <option value='local'>Local</option>
                  <option value='staging'>Staging</option>
                  <option value='production'>Produção</option>
                </select>
              </div>
              <input
                value={item.url}
                onChange={(e) => changeEnvironment(index, { url: e.target.value })}
                placeholder='URL (ex: http://localhost:5173)'
                className='w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 font-medium'
              />
              <input
                value={item.healthUrl || ''}
                onChange={(e) => changeEnvironment(index, { healthUrl: e.target.value })}
                placeholder='URL de checagem de pronto (opcional)'
                className='w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 font-medium'
              />
              {item.kind === 'local' && (
                <div className='flex gap-2'>
                  <input
                    value={item.startCommand || ''}
                    onChange={(e) => changeEnvironment(index, { startCommand: e.target.value })}
                    placeholder='Script do package.json que sobe o projeto (ex: dev)'
                    className='flex-1 min-w-0 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 font-medium'
                  />
                  <select
                    value={item.machineId || ''}
                    onChange={(e) => changeEnvironment(index, { machineId: e.target.value || null })}
                    className='bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 font-medium'
                  >
                    <option value=''>Máquina padrão</option>
                    {machines.map((machine) => (
                      <option key={machine.id} value={machine.id}>
                        {machine.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className='flex items-center justify-between'>
                <label className='flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300'>
                  <input type='checkbox' checked={item.qaEnabled === true} onChange={(e) => changeEnvironment(index, { qaEnabled: e.target.checked })} />
                  {item.kind === 'production' ? 'QA pode usar produção' : 'QA pode usar'}
                </label>
                <Button type='button' variant='ghost' onClick={() => setEnvironments((prev) => prev.filter((_, i) => i !== index))}>
                  Remover
                </Button>
              </div>
            </div>
          ))}
          {environments.length === 0 && <div className='text-[10px] text-zinc-400 italic'>Sem ambiente, o QA valida só o código.</div>}
          <label className='flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300'>
            <input type='checkbox' checked={autoCommitAfterQa} onChange={(e) => setAutoCommitAfterQa(e.target.checked)} />
            Commit automático depois do QA (sem push nem deploy)
          </label>
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
