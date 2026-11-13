import { Test, TestingModule } from '@nestjs/testing';
import { createHash } from 'crypto';
import { AgentsService, normalizeGitRemote } from '../agents.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { mockPrismaService } from '../../../test-utils/prisma-service.mock';

jest.mock('../../../auth/auth', () => ({ auth: {} }));

describe('AgentsService', () => {
  let service: AgentsService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AgentsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get(AgentsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('cria a máquina guardando só o hash da chave', async () => {
    prisma.agentMachine.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'm-1', ...data }));

    const result = await service.createMachine('org-1', { name: 'Workstation', workspaceRoot: '/home/dev' });
    const saved = prisma.agentMachine.create.mock.calls[0][0].data;

    expect(result.token.startsWith('drk_')).toBe(true);
    expect(saved.tokenHash).toBe(createHash('sha256').update(result.token).digest('hex'));
    expect(JSON.stringify(saved)).not.toContain(result.token);
  });

  it('remove a máquina só dentro da organização', async () => {
    prisma.agentMachine.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.removeMachine('m-1', 'org-2')).rejects.toThrow('Machine not found');
    expect(prisma.agentMachine.deleteMany).toHaveBeenCalledWith({ where: { id: 'm-1', organizationId: 'org-2' } });
  });

  it('não dispara task de outra organização', async () => {
    prisma.task.findFirst.mockResolvedValue(null);

    await expect(service.startDispatch('t-1', 'org-2', { agent: 'claude' })).rejects.toThrow('Task not found');
    expect(prisma.task.findFirst.mock.calls[0][0].where).toEqual({ id: 't-1', companyId: 'org-2' });
    expect(prisma.task.update).not.toHaveBeenCalled();
  });

  it('recusa agente ou pasta inválidos', async () => {
    await expect(service.startDispatch('t-1', 'org-1', { agent: 'bash' })).rejects.toThrow();
    await expect(service.startDispatch('t-1', 'org-1', { agent: 'claude', projectPath: '../etc' })).rejects.toThrow();
  });

  it('cria como membros só os agentes habilitados pela máquina', async () => {
    await service.setEnabledAgents('org-1', ['codex', 'opencode', 'bash', 'codex']);

    expect(prisma.user.upsert.mock.calls.map((c: any) => c[0].where.id)).toEqual(['agent-user-opencode', 'agent-user-codex']);
    expect(prisma.member.upsert.mock.calls[0][0].where).toEqual({ organizationId_userId: { organizationId: 'org-1', userId: 'agent-user-opencode' } });
    expect((await service.statusList('org-1')).map((a) => a.agent)).toEqual(['opencode', 'codex']);
    prisma.member.findMany.mockResolvedValue([]);
    expect(await service.statusList('org-2')).toEqual([]);
  });

  it('sem máquina conectada usa os agentes que já são membros', async () => {
    prisma.member.findMany.mockResolvedValue([{ userId: 'agent-user-gemini' }]);

    expect((await service.statusList('org-1')).map((a) => a.agent)).toEqual(['gemini']);
    expect(prisma.member.findMany.mock.calls[0][0].where.organizationId).toBe('org-1');
  });

  it('atribui o agente na task ao disparar', async () => {
    prisma.task.findFirst.mockResolvedValue({ id: 't-1', title: 'T', status: 'todo', assignees: [], comments: [{ userId: 'u-1', content: 'ok', user: { name: 'Rodrigo' } }, { userId: 'agent-user-claude', content: 'feito', user: { name: 'Claude Code' } }] });
    prisma.task.update.mockResolvedValue({ id: 't-1' });
    prisma.agentMachine.findMany.mockResolvedValue([]);

    const result = await service.startDispatch('t-1', 'org-1', { agent: 'claude', projectPath: 'api' });

    expect(prisma.task.update.mock.calls[0][0].data).toEqual({ status: 'in-progress', assignees: { connect: { id: 'agent-user-claude' } } });
    expect(result.comments).toEqual(['Rodrigo: ok', 'Claude Code: feito']);
    expect(result.task).toEqual({ id: 't-1' });
  });

  it('manda a etapa qa no despacho e ignora outras etapas', async () => {
    prisma.task.findFirst.mockResolvedValue({ id: 't-1', status: 'in-progress', assignees: [], comments: [] });
    prisma.task.update.mockResolvedValue({ id: 't-1' });

    expect((await service.startDispatch('t-1', 'org-1', { agent: 'antigravity', projectPath: 'api', stage: 'qa' })).stage).toBe('qa');
    expect((await service.startDispatch('t-1', 'org-1', { agent: 'antigravity', projectPath: 'api', stage: 'comment' })).stage).toBeUndefined();
  });

  it('acha o agente habilitado com o cargo nas máquinas da organização', async () => {
    prisma.member.findMany.mockResolvedValue([{ userId: 'agent-user-claude' }, { userId: 'agent-user-antigravity' }]);
    prisma.agentMachine.findMany.mockResolvedValue([{ agentRoles: { claude: ['engineering'], antigravity: ['review', 'qa'] } }]);

    expect(await service.agentForRole('org-1', 'qa')).toBe('antigravity');
    expect(await service.agentForRole('org-1', 'support')).toBeUndefined();
    expect(prisma.agentMachine.findMany.mock.calls[0][0].where.organizationId).toBe('org-1');
  });

  it('tarefa nova começa pelo arquiteto, senão por quem implementa', async () => {
    prisma.agentMachine.findMany.mockResolvedValue([{ agentRoles: { claude: ['engineering'], codex: ['engineering'], antigravity: ['architecture', 'review'], opencode: ['qa'] } }]);

    expect(await service.firstAgent('org-1', ['codex', 'claude', 'opencode', 'antigravity'])).toBe('antigravity');
    expect(await service.firstAgent('org-1', ['opencode', 'claude'])).toBe('claude');
    expect(await service.firstAgent('org-1', ['opencode'])).toBe('opencode');
    expect(prisma.agentMachine.findMany.mock.calls[0][0].where.organizationId).toBe('org-1');
  });

  it('sem agent e sem pasta usa o agente responsável e a pasta do projeto da tarefa', async () => {
    prisma.task.findFirst.mockResolvedValue({ id: 't-1', project: 'p-1', status: 'todo', assignees: [{ id: 'u-1' }, { id: 'agent-user-opencode' }], comments: [] });
    prisma.project.findFirst.mockResolvedValue({ folder: 'deskreport.com.br', locations: [] });
    prisma.task.update.mockResolvedValue({ id: 't-1' });

    const result = await service.startDispatch('t-1', 'org-1', {});

    expect(result.agent).toBe('opencode');
    expect(result.projectPath).toBe('deskreport.com.br');
    expect(prisma.project.findFirst.mock.calls[0][0].where.organizationId).toBe('org-1');
  });

  it('recusa disparar sem agente responsável ou sem pasta no projeto', async () => {
    prisma.task.findFirst.mockResolvedValue({ id: 't-1', project: 'p-1', assignees: [{ id: 'u-1' }], comments: [] });
    await expect(service.startDispatch('t-1', 'org-1', {})).rejects.toThrow('Atribua um agente');

    prisma.project.findFirst.mockResolvedValue({ folder: null, locations: [] });
    await expect(service.startDispatch('t-1', 'org-1', { agent: 'claude' })).rejects.toThrow('Sincronize as pastas');
    expect(prisma.task.update).not.toHaveBeenCalled();
  });

  it('sincroniza pastas como projetos da organização', async () => {
    prisma.project.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'p-2', folder: null, defaultMachineId: 'm-9' });
    prisma.project.create.mockResolvedValue({ id: 'p-1', folder: 'api', defaultMachineId: null });

    await service.syncProjects('org-1', 'm-1', ['api', 'site']);

    expect(prisma.project.create.mock.calls[0][0].data).toEqual({ organizationId: 'org-1', name: 'api', folder: 'api', remote: null });
    expect(prisma.project.update).toHaveBeenCalledWith({ where: { id: 'p-2' }, data: { folder: 'site' } });
    expect(prisma.project.update).toHaveBeenCalledWith({ where: { id: 'p-1' }, data: { defaultMachineId: 'm-1' } });
    expect(prisma.projectLocation.upsert.mock.calls[0][0].where).toEqual({ projectId_machineId: { projectId: 'p-1', machineId: 'm-1' } });
    await expect(service.syncProjects('org-1', 'm-1', ['../etc'])).rejects.toThrow();
  });

  it('normaliza o remote git de qualquer formato de origin', () => {
    expect(normalizeGitRemote('git@GitHub.com:4goCompany/deskreport.git')).toBe('github.com/4gocompany/deskreport');
    expect(normalizeGitRemote('https://user:pass@github.com/4gocompany/deskreport.git/')).toBe('github.com/4gocompany/deskreport');
    expect(normalizeGitRemote('ssh://git@host.com:22/org/repo')).toBe('host.com/22/org/repo');
    expect(normalizeGitRemote('github.com/a/../b')).toBeNull();
    expect(normalizeGitRemote('repo')).toBeNull();
    expect(normalizeGitRemote('')).toBeNull();
  });

  it('guarda as pastas só da máquina autenticada e vincula o projeto pelo remote', async () => {
    prisma.agentMachine.updateMany.mockResolvedValue({ count: 1 });
    prisma.project.findFirst.mockResolvedValue({ id: 'p-1', folder: 'web', defaultMachineId: null });

    await service.saveMachineFolders('org-1', 'm-1', [{ name: 'web', path: '/home/dev/web', remote: 'git@github.com:Org/Web.git' }, { name: '../x', path: '/x' }]);

    expect(prisma.agentMachine.updateMany).toHaveBeenCalledWith({ where: { id: 'm-1', organizationId: 'org-1' }, data: { folders: [{ name: 'web', path: '/home/dev/web', remote: 'github.com/org/web' }] } });
    expect(prisma.project.findFirst.mock.calls[0][0].where).toEqual({ organizationId: 'org-1', remote: 'github.com/org/web' });
    expect(prisma.projectLocation.upsert.mock.calls[0][0].create).toEqual({ projectId: 'p-1', machineId: 'm-1', folder: 'web', path: '/home/dev/web', remote: 'github.com/org/web' });
  });

  it('despacha na máquina padrão do projeto com o caminho dela e barra máquina offline', async () => {
    prisma.task.findFirst.mockResolvedValue({ id: 't-1', project: 'p-1', status: 'todo', assignees: [], comments: [] });
    prisma.project.findFirst.mockResolvedValue({ folder: 'web', defaultMachineId: 'm-2', locations: [{ machineId: 'm-2', folder: 'web', path: '/mac/web' }] });
    prisma.agentMachine.findMany.mockResolvedValue([{ id: 'm-2', name: 'Mac' }]);
    prisma.task.update.mockResolvedValue({ id: 't-1' });

    const result = await service.startDispatch('t-1', 'org-1', { agent: 'claude' }, ['m-2']);
    expect(result.machineId).toBe('m-2');
    expect(result.projectPath).toBe('/mac/web');
    expect(prisma.agentMachine.findMany.mock.calls[0][0].where).toEqual({ id: { in: ['m-2', 'm-2'] }, organizationId: 'org-1' });

    await expect(service.startDispatch('t-1', 'org-1', { agent: 'claude' }, [])).rejects.toThrow('A máquina Mac está offline');
    const auto = await service.startDispatch('t-1', 'org-1', { agent: 'claude', auto: true }, []);
    expect(auto.machineOffline).toBe(true);
    expect(prisma.task.update.mock.calls[1][0].data.status).toBe('todo');
    expect(prisma.taskComment.create.mock.calls[0][0].data.content).toContain('a máquina Mac está offline');
  });

  it('tarefa presa a uma máquina removida cai para a máquina padrão do projeto', async () => {
    prisma.task.findFirst.mockResolvedValue({ id: 't-1', project: 'p-1', status: 'todo', machineId: 'm-velha', assignees: [], comments: [] });
    prisma.project.findFirst.mockResolvedValue({ folder: 'web', defaultMachineId: 'm-2', locations: [{ machineId: 'm-2', folder: 'web', path: '/mac/web' }] });
    prisma.agentMachine.findMany.mockResolvedValue([{ id: 'm-2', name: 'Mac' }]);
    prisma.task.update.mockResolvedValue({ id: 't-1' });

    const result = await service.startDispatch('t-1', 'org-1', { agent: 'claude' }, ['m-2']);
    expect(result.machineId).toBe('m-2');
    await expect(service.startDispatch('t-1', 'org-1', { agent: 'claude', machineId: 'm-outra-org' }, ['m-2'])).rejects.toThrow('Máquina não encontrada');
  });

  it('move a task para revisão do Antigravity e comenta como o agente', async () => {
    await service.setEnabledAgents('org-1', ['claude', 'antigravity']);
    prisma.task.findFirst.mockResolvedValue({ id: 't-1', reporterId: 'u-1' });

    await service.finishTask('org-1', { taskId: 't-1', agent: 'claude', exitCode: 0, summary: '<script>x</script>', touchedFiles: ['M a.ts'] });

    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 't-1', companyId: 'org-1' },
      data: { status: 'review', assignees: { connect: { id: 'agent-user-antigravity' } } },
    });
    expect(prisma.taskComment.create.mock.calls[0][0].data.userId).toBe('agent-user-claude');
    const content = prisma.taskComment.create.mock.calls[0][0].data.content;
    expect(content).toContain('&lt;script&gt;');
    expect(prisma.taskComment.create.mock.calls[0][0].data.metadata.touchedFiles).toEqual(['M a.ts']);
  });

  it('sem Antigravity habilitado a task vai para revisão sem revisor', async () => {
    await service.setEnabledAgents('org-1', ['codex']);
    prisma.task.findFirst.mockResolvedValue({ id: 't-1', reporterId: 'u-1' });

    await service.finishTask('org-1', { taskId: 't-1', agent: 'codex', exitCode: 0 });

    expect(prisma.task.update).toHaveBeenCalledWith({ where: { id: 't-1', companyId: 'org-1' }, data: { status: 'review' } });
    expect(prisma.taskComment.create.mock.calls[0][0].data.userId).toBe('agent-user-codex');
  });

  it('ignora telemetria de agente desconhecido', async () => {
    await service.setEnabledAgents('org-1', ['claude']);
    expect(service.saveStatus('org-1', { agent: 'outro', state: 'working' })).toBeNull();
    expect((await service.statusList('org-1')).map((a) => a.agent)).toEqual(['claude']);
  });

  it('guarda a mensagem entre agentes assinada por quem enviou e com a tarefa da organização', async () => {
    prisma.task.findFirst.mockResolvedValue({ id: 't-1' });
    prisma.agentChatMessage.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'msg-1', ...data }));

    await service.saveTeamMessage('org-1', 'claude', { toAgent: 'antigravity', message: 'Pode revisar?', taskId: '#3' });

    expect(prisma.task.findFirst).toHaveBeenCalledWith({ where: { companyId: 'org-1', shortId: 3 }, select: { id: true } });
    expect(prisma.agentChatMessage.create.mock.calls[0][0].data).toEqual({
      organizationId: 'org-1',
      agent: 'claude',
      userId: 'agent-user-claude',
      targetAgent: 'antigravity',
      taskId: 't-1',
      content: 'Pode revisar?',
    });
  });

  it('não deixa o agente mandar mensagem para ele mesmo nem para agente desconhecido', async () => {
    await expect(service.saveTeamMessage('org-1', 'claude', { toAgent: 'claude', message: 'oi' })).rejects.toThrow('toAgent');
    await expect(service.saveTeamMessage('org-1', 'claude', { toAgent: 'outro', message: 'oi' })).rejects.toThrow('agent deve ser');
  });

  it('a sala do time só lista mensagens sem dono da organização', async () => {
    prisma.agentChatMessage.findMany.mockResolvedValue([]);

    await service.listTeamChat('org-1', {});

    expect(prisma.agentChatMessage.findMany.mock.calls[0][0].where).toEqual({ organizationId: 'org-1', ownerId: null, taskId: undefined });
  });

  it('aceita o estado pausado com alerta de cota', async () => {
    const status = service.saveStatus('org-1', { agent: 'claude', state: 'paused', alert: 'Alerta de Cota' });
    expect(status).toMatchObject({ state: 'paused', alert: 'Alerta de Cota' });
  });

  it('guarda máquina e pasta e mantém ao voltar para ocioso sem elas', async () => {
    service.saveStatus('org-1', { agent: 'claude', state: 'working', machineId: 'm-1', machineName: 'Workstation', workspace: 'omniplug' });
    const idle = service.saveStatus('org-1', { agent: 'claude', state: 'idle' });
    expect(idle).toMatchObject({ machineId: 'm-1', machineName: 'Workstation', workspace: 'omniplug' });
    expect(service.saveStatus('org-2', { agent: 'claude', state: 'idle' })?.machineId).toBeUndefined();
  });

  it('parada pelo usuário volta a task para A fazer e soma os tokens', async () => {
    prisma.task.findFirst.mockResolvedValue({ id: 't-1', reporterId: 'u-1', status: 'in-progress' });

    await service.finishTask('org-1', { taskId: 't-1', agent: 'claude', exitCode: 1, stopped: true, tokens: 1200 });

    expect(prisma.task.update).toHaveBeenCalledWith({ where: { id: 't-1', companyId: 'org-1' }, data: { tokensUsed: { increment: 1200 } } });
    expect(prisma.task.update).toHaveBeenCalledWith({ where: { id: 't-1', companyId: 'org-1' }, data: { status: 'todo' } });
    expect(prisma.taskComment.create.mock.calls[0][0].data.content).toContain('parada pelo usuário');
  });

  it('não para task de outra organização', async () => {
    prisma.task.findFirst.mockResolvedValue(null);

    await expect(service.findTaskToStop('t-1', 'org-2')).rejects.toThrow('Task not found');
    expect(prisma.task.findFirst.mock.calls[0][0].where).toEqual({ id: 't-1', companyId: 'org-2' });
  });

  it('guarda a saída do terminal separada por organização', () => {
    service.appendOutput('org-1', { taskId: 't-1', text: 'linha 1\n' });
    service.appendOutput('org-1', { taskId: 't-1', text: 'linha 2\n' });

    expect(service.taskOutput('org-1', 't-1').text).toBe('linha 1\nlinha 2\n');
    expect(service.taskOutput('org-2', 't-1').text).toBe('');
    expect(service.appendOutput('org-1', { taskId: 't-1', text: 123 })).toBeNull();
  });

  it('não abre sessão de outro usuário ou de outra organização', async () => {
    prisma.agentChatSession.findFirst.mockResolvedValue(null);
    prisma.agentChatSession.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.listSessionMessages('org-1', 'u-1', 's-9')).rejects.toThrow('Session not found');
    await expect(service.deleteSession('org-1', 'u-1', 's-9')).rejects.toThrow('Session not found');
    expect(prisma.agentChatSession.findFirst.mock.calls[0][0].where).toEqual({ id: 's-9', organizationId: 'org-1', userId: 'u-1' });
    expect(prisma.agentChatSession.deleteMany.mock.calls[0][0].where).toEqual({ id: 's-9', organizationId: 'org-1', userId: 'u-1' });
  });

  it('nova sessão desativa as anteriores do usuário com o agente', async () => {
    prisma.member.findFirst.mockResolvedValue({ id: 'm-1' });
    prisma.agentChatSession.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 's-1', ...data }));

    await service.createSession('org-1', 'u-1', 'claude', {});

    expect(prisma.agentChatSession.updateMany).toHaveBeenCalledWith({ where: { organizationId: 'org-1', userId: 'u-1', agent: 'claude', active: true }, data: { active: false } });
    expect(prisma.agentChatSession.create.mock.calls[0][0].data).toMatchObject({ organizationId: 'org-1', userId: 'u-1', agent: 'claude' });
  });

  it('a primeira mensagem vira o título da sessão', async () => {
    prisma.agentChatSession.findFirst.mockResolvedValue({ id: 's-1', agent: 'claude', title: 'Nova conversa', projectPath: null });
    prisma.agentChatMessage.create.mockResolvedValue({ id: 'msg-1' });
    prisma.agentChatSession.update.mockResolvedValue({ id: 's-1' });

    await service.saveSessionMessage('org-1', 'u-1', 's-1', { content: 'Revisa o login', projectPath: 'app' });

    expect(prisma.agentChatSession.update.mock.calls[0][0].data).toEqual({ title: 'Revisa o login', projectPath: 'app', active: true });
  });

  it('resposta da máquina só entra em sessão do dono e guarda o id da conversa da CLI', async () => {
    prisma.agentChatSession.findFirst.mockResolvedValue(null);
    expect(await service.saveChatReply('org-1', { agent: 'claude', ownerId: 'u-1', sessionId: 's-1', content: 'oi' })).toBeNull();

    prisma.agentChatSession.findFirst.mockResolvedValue({ id: 's-1', externalId: null });
    prisma.agentChatMessage.create.mockResolvedValue({ id: 'msg-1' });
    await service.saveChatReply('org-1', { agent: 'claude', ownerId: 'u-1', sessionId: 's-1', content: 'oi', externalId: 'cli-1' });

    expect(prisma.agentChatSession.findFirst.mock.calls[1][0].where).toEqual({ id: 's-1', organizationId: 'org-1', userId: 'u-1', agent: 'claude' });
    expect(prisma.agentChatSession.update).toHaveBeenCalledWith({ where: { id: 's-1' }, data: { externalId: 'cli-1' } });
  });
});
