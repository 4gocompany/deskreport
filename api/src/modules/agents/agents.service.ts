import { BadRequestException, ConflictException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { auth } from '../../auth/auth';
import { PrismaService } from '../../prisma/prisma.service';
import { budgets, complexities, finalTier, routing } from '../tasks/complexity';
import { taskTypes } from '../tasks/task-types';

export const agentNames = ['antigravity', 'claude', 'opencode', 'codex', 'gemini', 'aider'];
export const roleNames = ['engineering', 'review', 'qa', 'architecture', 'devops', 'documentation', 'support'];

const agentUsers = {
  antigravity: agentUser('antigravity', 'Antigravity', '#16a34a', 'AG'),
  claude: agentUser('claude', 'Claude Code', '#ea580c', 'CC'),
  opencode: agentUser('opencode', 'OpenCode', '#2563eb', 'OC'),
  codex: agentUser('codex', 'Codex', '#0d9488', 'CX'),
  gemini: agentUser('gemini', 'Gemini', '#4f46e5', 'GM'),
  aider: agentUser('aider', 'Aider', '#ca8a04', 'AD'),
};

function agentUser(agent: string, name: string, color: string, initials: string) {
  return { id: `agent-user-${agent}`, name, email: `${agent}@agents.deskreport.com.br`, image: avatar(color, initials) };
}

function avatar(color: string, initials: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="32" fill="${color}"/><text x="32" y="41" font-family="Arial,sans-serif" font-size="24" font-weight="700" fill="#fff" text-anchor="middle">${initials}</text></svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

export type AgentStatus = {
  agent: string;
  state: 'working' | 'idle' | 'paused';
  // Alerta de cota. warn só avisa, stop espera o humano autorizar e block só sai trocando o modelo ou com a cota renovada
  alert?: string;
  quotaLevel?: 'warn' | 'stop' | 'block';
  // Títulos das tarefas que esperam a pausa de cota
  queued?: string[];
  project?: string;
  action?: string;
  tool?: string;
  file?: string;
  taskId?: string;
  // Máquina onde o agente está conectado e a pasta em que ele executa. Runner antigo não envia
  machineName?: string;
  machineId?: string;
  workspace?: string;
  // Tokens gastos na execução atual da tarefa (só o Claude Code informa)
  tokens?: number;
  // Modelo em uso na execução, quando a máquina informa
  model?: string;
  // Cota e contexto lidos do provedor na máquina. Sem leitura oficial ficam vazios
  quotaUsed?: number;
  quotaResetsAt?: string;
  contextTokens?: number;
  contextLimit?: number;
  updatedAt: string;
};

// Saída do terminal guardada por tarefa, só o final dela e só das últimas tarefas
const OUTPUT_MAX_CHARS = 50_000;
const OUTPUT_MAX_TASKS = 20;

const taskStatuses = ['backlog', 'todo', 'in-progress', 'review', 'done', 'release'];
const taskPriorities = ['low', 'medium', 'high', 'urgent'];

const taskInclude = {
  assignees: true,
  team: true,
  comments: { include: { user: true }, orderBy: { createdAt: 'desc' as const } },
};

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function text(value: unknown, max = 300) {
  return typeof value === 'string' ? value.slice(0, max) : undefined;
}

function positive(value: unknown) {
  return Number.isInteger(value) && (value as number) > 0 ? (value as number) : undefined;
}

function percent(value: unknown) {
  return typeof value === 'number' && value >= 0 && value <= 100 ? Math.round(value) : undefined;
}

// Apelido vira menção sem acento nem espaço: "João Silva" é @joaosilva
export function mentionName(nickname: string) {
  return nickname.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

// Só agentes conhecidos, apelido curto, avatar em URL ou imagem embutida e cor em hexadecimal
function cleanProfiles(profiles: any) {
  const clean = {};
  if (!profiles || typeof profiles !== 'object') return clean;

  for (const agent of agentNames) {
    const profile = profiles[agent];
    if (!profile || typeof profile !== 'object') continue;
    const nickname = text(profile.nickname, 30)?.trim();
    const avatar = text(profile.avatar, 200_000)?.trim();
    const color = text(profile.color, 7);
    clean[agent] = {
      nickname: nickname && mentionName(nickname) ? nickname : undefined,
      avatar: avatar && /^(https:\/\/|data:image\/)/.test(avatar) ? avatar : undefined,
      color: color && /^#[0-9a-f]{6}$/i.test(color) ? color : undefined,
    };
  }
  return clean;
}

function isoDate(value: unknown) {
  return typeof value === 'string' && !isNaN(Date.parse(value)) ? new Date(value).toISOString() : undefined;
}

@Injectable()
export class AgentsService {
  private statuses: Record<string, Record<string, AgentStatus>> = {};
  private taskLogs: Record<string, Record<string, AgentStatus[]>> = {};
  private outputs: Record<string, Record<string, string>> = {};
  private enabledByOrg: Record<string, string[]> = {};
  private qaCalls: Record<string, number[]> = {};

  constructor(private prisma: PrismaService) { }

  // Os agentes são usuários reais do time, assim aparecem como atribuídos e assinam os próprios comentários.
  // Só entram na organização os agentes que alguma máquina habilitou
  async ensureAgentUsers(organizationId: string, agents: string[]) {
    const now = new Date();
    for (const agent of agents) {
      const user = agentUsers[agent];
      if (!user) continue;
      await this.prisma.user.upsert({
        where: { id: user.id },
        create: { ...user, role: 'agent', emailVerified: true, createdAt: now, updatedAt: now },
        update: { name: user.name, image: user.image },
      });
      await this.prisma.member.upsert({
        where: { organizationId_userId: { organizationId, userId: user.id } },
        create: { organizationId, userId: user.id, role: 'member', createdAt: now },
        update: {},
      });
    }
  }

  // Recebe a soma dos agentes que as máquinas conectadas usam
  async setEnabledAgents(organizationId: string, agents: unknown) {
    if (!Array.isArray(agents)) return;

    const enabled = agentNames.filter((agent) => agents.includes(agent));
    this.enabledByOrg[organizationId] = enabled;
    await this.ensureAgentUsers(organizationId, enabled);
  }

  // Sem máquina conectada desde que a API subiu, vale quem já é membro da organização
  async enabledAgents(organizationId: string) {
    const enabled = this.enabledByOrg[organizationId];
    if (enabled) return enabled;

    const members = await this.prisma.member.findMany({
      where: { organizationId, userId: { startsWith: 'agent-user-' } },
      select: { userId: true },
    });
    const userIds = members.map((member) => member.userId);
    return agentNames.filter((agent) => userIds.includes(agentUsers[agent].id));
  }

  // Primeiro agente habilitado que alguma máquina da organização configurou com o cargo
  async agentForRole(organizationId: string, role: string) {
    const machines = await this.prisma.agentMachine.findMany({ where: { organizationId }, select: { agentRoles: true } });
    const enabled = await this.enabledAgents(organizationId);
    return enabled.find((agent) => machines.some((machine) => (machine.agentRoles as any)?.[agent]?.includes(role)));
  }

  // Tarefa nova com vários agentes começa por um só. Com arquiteto entre eles a spec vem antes, senão quem implementa.
  // Os outros entram pela esteira
  async firstAgent(organizationId: string, agents: string[]) {
    const machines = await this.prisma.agentMachine.findMany({ where: { organizationId }, select: { agentRoles: true } });
    for (const role of ['architecture', 'engineering']) {
      const agent = agents.find((name) => machines.some((machine) => (machine.agentRoles as any)?.[name]?.includes(role)));
      if (agent) return agent;
    }
    return agents[0];
  }

  listMachines(organizationId: string) {
    return this.prisma.agentMachine.findMany({
      where: { organizationId },
      select: { id: true, name: true, tokenPrefix: true, workspaceRoot: true, folders: true, agentRoles: true, lastSeenAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Guarda as pastas da máquina autenticada e vincula os projetos que já existem no mesmo repositório
  async saveMachineFolders(organizationId: string, machineId: string | undefined, raw: unknown) {
    if (!machineId) return;

    const folders = cleanFolders(raw);
    const { count } = await this.prisma.agentMachine.updateMany({ where: { id: machineId, organizationId }, data: { folders } });
    if (!count) return;

    for (const item of folders) {
      const project = await this.matchProject(organizationId, item, false);
      if (project) await this.saveLocation(project, machineId, item);
    }
  }

  // Mesmo repositório é o mesmo projeto. Sem remote casa pelo nome da pasta, e com migrate o projeto antigo sem remote ganha o dele
  private async matchProject(organizationId: string, item: MachineFolder, migrate: boolean) {
    const select = { id: true, folder: true, remote: true, defaultMachineId: true };
    const byName = { remote: null, OR: [{ folder: item.name }, { name: { equals: item.name, mode: 'insensitive' as const } }] };

    if (item.remote) {
      const found = await this.prisma.project.findFirst({ where: { organizationId, remote: item.remote }, select });
      if (found || !migrate) return found;

      const old = await this.prisma.project.findFirst({ where: { organizationId, ...byName }, select });
      if (!old) return null;
      return this.prisma.project.update({ where: { id: old.id }, data: { remote: item.remote }, select });
    }
    return this.prisma.project.findFirst({ where: { organizationId, ...byName }, select });
  }

  private async saveLocation(project: { id: string; defaultMachineId: string | null }, machineId: string, item: MachineFolder) {
    const data = { folder: item.name, path: item.path, remote: item.remote };
    await this.prisma.projectLocation.upsert({
      where: { projectId_machineId: { projectId: project.id, machineId } },
      create: { projectId: project.id, machineId, ...data },
      update: data,
    });
    if (!project.defaultMachineId) await this.prisma.project.update({ where: { id: project.id }, data: { defaultMachineId: machineId } });
  }

  async createMachine(organizationId: string, data: any) {
    const name = text(data?.name, 100)?.trim();
    const workspaceRoot = text(data?.workspaceRoot, 300)?.trim();
    if (!name || !workspaceRoot) {
      throw new BadRequestException('Informe name e workspaceRoot');
    }

    const token = 'drk_' + randomBytes(24).toString('base64url');
    const machine = await this.prisma.agentMachine.create({
      data: {
        organizationId,
        name,
        workspaceRoot,
        tokenHash: hashToken(token),
        tokenPrefix: token.slice(0, 10),
      },
    });

    return { id: machine.id, name, workspaceRoot, tokenPrefix: machine.tokenPrefix, token };
  }

  async removeMachine(id: string, organizationId: string) {
    const { count } = await this.prisma.agentMachine.deleteMany({ where: { id, organizationId } });
    if (count === 0) throw new NotFoundException('Machine not found');
    return { id };
  }

  // Um usuário de QA por organização, sempre member. A senha só chega aqui para virar hash e nunca volta na resposta
  async createQaAccess(organizationId: string, password: unknown) {
    if (typeof password !== 'string' || password.length < 24 || password.length > 128) throw new BadRequestException('Senha inválida');

    const hourAgo = Date.now() - 3_600_000;
    const calls = (this.qaCalls[organizationId] || []).filter((time) => time > hourAgo);
    if (calls.length >= 5) throw new HttpException('Muitas tentativas, aguarde', 429);
    this.qaCalls[organizationId] = [...calls, Date.now()];

    const email = `qa-${organizationId.replace(/-/g, '').slice(0, 12)}@agents.deskreport.com.br`;
    const context = await auth.$context;
    const hash = await context.password.hash(password);
    const now = new Date();

    let user = await this.prisma.user.findFirst({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({ data: { name: 'QA (agente)', email, emailVerified: true, role: 'agent', createdAt: now, updatedAt: now } });
    }

    const account = await this.prisma.account.findFirst({ where: { userId: user.id, providerId: 'credential' } });
    if (account) {
      await this.prisma.account.update({ where: { id: account.id }, data: { password: hash, updatedAt: now } });
    } else {
      await this.prisma.account.create({ data: { accountId: user.id, providerId: 'credential', userId: user.id, password: hash, createdAt: now, updatedAt: now } });
    }

    await this.prisma.member.deleteMany({ where: { userId: user.id, organizationId: { not: organizationId } } });
    await this.prisma.member.upsert({
      where: { organizationId_userId: { organizationId, userId: user.id } },
      update: { role: 'member' },
      create: { organizationId, userId: user.id, role: 'member', createdAt: now },
    });
    await this.prisma.session.deleteMany({ where: { userId: user.id } });

    return { email };
  }

  // Devolve a organização dona da chave, ou null quando a chave não vale
  async findOrgByMachineToken(token: unknown) {
    const machine = await this.findMachineByToken(token);
    return machine?.organizationId ?? null;
  }

  // Máquina dona da chave. A chave de desenvolvimento não tem máquina cadastrada, então vem sem id e nome
  async findMachineByToken(token: unknown) {
    if (typeof token !== 'string' || !token.startsWith('drk_')) return null;

    const devToken = process.env.DESKREPORT_DEV_TOKEN;
    if (devToken && token === devToken && process.env.NODE_ENV !== 'production') {
      const org = await this.prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
      return org ? { organizationId: org.id, machineId: undefined, machineName: undefined } : null;
    }

    const machine = await this.prisma.agentMachine.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!machine) return null;

    await this.prisma.agentMachine.update({ where: { id: machine.id }, data: { lastSeenAt: new Date() } });
    return { organizationId: machine.organizationId, machineId: machine.id, machineName: machine.name };
  }

  // Guarda os cargos que a máquina configurou para cada agente, só aceita agentes e cargos conhecidos
  async saveMachineRoles(organizationId: string, token: unknown, roles: any) {
    if (typeof token !== 'string' || !roles || typeof roles !== 'object') return;

    const agentRoles = {};
    for (const agent of agentNames) {
      const list = roles[agent];
      agentRoles[agent] = Array.isArray(list) ? roleNames.filter((role) => list.includes(role)) : [];
    }
    await this.prisma.agentMachine.updateMany({ where: { organizationId, tokenHash: hashToken(token) }, data: { agentRoles } });
  }

  // Guarda os perfis da máquina e devolve os perfis da organização já somados
  async saveMachineProfiles(organizationId: string, token: unknown, profiles: unknown) {
    if (typeof token !== 'string') return {};

    const agentProfiles = cleanProfiles(profiles);
    await this.prisma.agentMachine.updateMany({ where: { organizationId, tokenHash: hashToken(token) }, data: { agentProfiles } });
    return this.agentProfiles(organizationId);
  }

  // Perfis de todas as máquinas da organização. A máquina mais nova vence quando duas configuram o mesmo agente
  async agentProfiles(organizationId: string) {
    const machines = await this.prisma.agentMachine.findMany({
      where: { organizationId },
      select: { agentProfiles: true },
      orderBy: { createdAt: 'asc' },
    });

    const profiles = {};
    for (const machine of machines) {
      const saved = machine.agentProfiles || {};
      for (const agent of agentNames) {
        if (saved[agent]?.nickname || saved[agent]?.avatar || saved[agent]?.color) profiles[agent] = saved[agent];
      }
    }
    return profiles as Record<string, { nickname?: string; avatar?: string; color?: string }>;
  }

  async isMember(organizationId: string, userId: string) {
    const member = await this.prisma.member.findFirst({ where: { organizationId, userId }, select: { id: true } });
    return !!member;
  }

  async statusList(organizationId: string) {
    const saved = this.statuses[organizationId] || {};
    const enabled = await this.enabledAgents(organizationId);
    return enabled.map((agent) => saved[agent] || { agent, state: 'idle', updatedAt: new Date().toISOString() });
  }

  logsByOrg(organizationId: string) {
    return this.taskLogs[organizationId] || {};
  }

  saveStatus(organizationId: string, data: any) {
    if (!agentNames.includes(data?.agent)) return null;

    // Telemetria sem leitura nova mantém a última, e a cota some quando a janela renova
    const previous = this.statuses[organizationId]?.[data.agent];
    const quotaResetsAt = isoDate(data.quotaResetsAt) || previous?.quotaResetsAt;
    const quotaValid = quotaResetsAt && new Date(quotaResetsAt).getTime() > Date.now();
    const quotaUsed = percent(data.quotaUsed) ?? previous?.quotaUsed;

    const status: AgentStatus = {
      agent: data.agent,
      state: data.state === 'working' || data.state === 'paused' ? data.state : 'idle',
      alert: text(data.alert),
      quotaLevel: ['warn', 'stop', 'block'].includes(data.quotaLevel) ? data.quotaLevel : undefined,
      queued: Array.isArray(data.queued) ? data.queued.slice(0, 10).map((title: unknown) => text(title, 120)).filter(Boolean) : undefined,
      project: text(data.project, 100),
      action: text(data.action),
      tool: text(data.tool, 60),
      file: text(data.file),
      taskId: text(data.taskId, 60),
      machineName: text(data.machineName, 100) || previous?.machineName,
      machineId: text(data.machineId, 60) || previous?.machineId,
      workspace: text(data.workspace, 200) || previous?.workspace,
      tokens: positive(data.tokens) || previous?.tokens,
      model: text(data.model, 120) || previous?.model,
      quotaUsed: quotaValid ? quotaUsed : undefined,
      quotaResetsAt: quotaValid ? quotaResetsAt : undefined,
      contextTokens: positive(data.contextTokens) || previous?.contextTokens,
      contextLimit: positive(data.contextLimit) || previous?.contextLimit,
      updatedAt: new Date().toISOString(),
    };

    this.statuses[organizationId] = { ...this.statuses[organizationId], [status.agent]: status };

    if (status.taskId && status.action && status.state === 'working') {
      const orgLogs = this.taskLogs[organizationId] || {};
      const current = orgLogs[status.taskId] || [];
      const last = current[current.length - 1];
      if (!last || last.action !== status.action || last.file !== status.file) {
        orgLogs[status.taskId] = [...current.slice(-79), status];
        this.taskLogs[organizationId] = orgLogs;
      }
    }

    return status;
  }

  // Pedaço do stdout/stderr do agente para o terminal ao vivo da tarefa
  appendOutput(organizationId: string, data: any) {
    const taskId = text(data?.taskId, 60);
    const chunk = text(data?.text, 10_000);
    if (!taskId || !chunk) return null;

    const orgOutputs = this.outputs[organizationId] || {};
    orgOutputs[taskId] = ((orgOutputs[taskId] || '') + chunk).slice(-OUTPUT_MAX_CHARS);
    const taskIds = Object.keys(orgOutputs);
    for (const old of taskIds.slice(0, taskIds.length - OUTPUT_MAX_TASKS)) delete orgOutputs[old];
    this.outputs[organizationId] = orgOutputs;
    return { taskId, text: chunk };
  }

  taskOutput(organizationId: string, taskId: string) {
    return { taskId, text: this.outputs[organizationId]?.[taskId] || '' };
  }

  clearOutput(organizationId: string, taskId: string) {
    if (this.outputs[organizationId]) delete this.outputs[organizationId][taskId];
  }

  // Só para tarefa da organização. A máquina mata o processo e devolve o fim pelo machine:task-finished
  async findTaskToStop(taskId: string, organizationId: string) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId: organizationId }, select: { id: true } });
    if (!task) throw new NotFoundException('Task not found');
    return task.id;
  }

  // mode comment: o agente foi chamado num comentário e decide se mexe no código ou só responde
  // Sem agent, roda o agente que está nos responsáveis. Sem projectPath, usa a pasta do projeto da tarefa
  // onlineMachineIds vem do gateway. Com a máquina alvo fora dele, a pessoa recebe o erro e a esteira só mantém o agente atribuído
  async startDispatch(taskId: string, organizationId: string, data: any, onlineMachineIds?: string[]) {
    const mode = data?.mode === 'comment' ? 'comment' : 'task';
    checkProjectPath(data?.projectPath);

    const task = await this.prisma.task.findFirst({
      where: { id: taskId, companyId: organizationId },
      include: {
        assignees: { select: { id: true } },
        comments: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
        attachments: { where: { companyId: organizationId }, select: { id: true, filename: true, size: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    // Orçamento esgotado para a esteira automática. Acionamento por uma pessoa continua liberado
    if (data?.auto && task.tokensUsed >= task.tokenBudget) {
      // Sem o aviso a esteira parava em silêncio e a tarefa ficava esperando um agente que nunca vinha
      // Um aviso basta: a esteira tenta de novo a cada etapa, e só repete depois que alguém aciona e a tarefa ganha outro comentário
      const lastComment = task.comments[task.comments.length - 1]?.content || '';
      if (agentNames.includes(data?.agent) && !lastComment.includes('o orçamento de tokens da tarefa acabou')) {
        const content = `Não fui acionado: o orçamento de tokens da tarefa acabou (${task.tokensUsed} de ${task.tokenBudget}). Para seguir, acione pelo painel.`;
        await this.commentTask(organizationId, task.id, { agent: data.agent, content });
      }
      throw new BadRequestException('Orçamento de tokens da tarefa esgotado');
    }

    const assignedAgent = task.assignees.find((user) => user.id.startsWith('agent-user-'))?.id.replace('agent-user-', '');
    const agent = data?.agent || assignedAgent;
    if (!agentNames.includes(agent)) {
      throw new BadRequestException('Atribua um agente nos responsáveis da tarefa');
    }

    // Máquina alvo: a pedida agora, a da tarefa, a padrão do projeto ou a primeira onde o projeto existe
    const project = await this.projectLocations(organizationId, task.project);
    // A máquina da tarefa ou a padrão pode ter sido removida (a tarefa não tem chave estrangeira): passa para a próxima da ordem
    const candidates = [data?.machineId, task.machineId, project?.defaultMachineId, project?.locations[0]?.machineId].filter((id) => typeof id === 'string');
    const machines = await this.prisma.agentMachine.findMany({ where: { id: { in: candidates }, organizationId }, select: { id: true, name: true } });
    if (data?.machineId && !machines.some((item) => item.id === data.machineId)) throw new BadRequestException('Máquina não encontrada');
    const machine = candidates.map((id) => machines.find((item) => item.id === id)).find(Boolean) || null;

    const location = project?.locations.find((item) => item.machineId === machine?.id);
    const projectPath = location?.path || location?.folder || data?.projectPath || project?.folder;
    if (!projectPath) {
      throw new BadRequestException('O projeto da tarefa não tem pasta. Sincronize as pastas no widget do DeskReport');
    }

    if (!machine && onlineMachineIds && !onlineMachineIds.length) {
      throw new BadRequestException('Nenhuma máquina conectada. Suba o deskreport-client.');
    }
    const machineOffline = !!machine && !!onlineMachineIds && !onlineMachineIds.includes(machine.id);
    if (machineOffline && !data?.auto) {
      throw new BadRequestException(`A máquina ${machine.name} está offline. Conecte a máquina ou escolha outra máquina na tarefa.`);
    }
    // Na esteira a tarefa espera a máquina. Sem o aviso ela parecia travada, e um aviso basta enquanto ninguém mexe
    const offlineNote = `Não fui acionado: a máquina ${machine?.name} está offline. Conecte a máquina ou escolha outra na tarefa e acione pelo painel.`;
    if (machineOffline && agentNames.includes(data?.agent) && !(task.comments[task.comments.length - 1]?.content || '').includes('está offline. Conecte a máquina')) {
      await this.commentTask(organizationId, task.id, { agent: data.agent, content: offlineNote });
    }

    await this.ensureAgentUsers(organizationId, [agent]);
    const updated = await this.prisma.task.update({
      where: { id: task.id },
      data: {
        // Máquina offline na esteira automática: o agente fica atribuído e a tarefa não anda
        status: agent === 'antigravity' || mode === 'comment' || machineOffline ? task.status : 'in-progress',
        assignees: { connect: { id: agentUsers[agent].id } },
        // A escolha feita agora vale para as próximas etapas da esteira
        ...(data?.machineId && machine && data.machineId !== task.machineId ? { machineId: machine.id } : {}),
      },
      include: taskInclude,
    });

    const route = routing(task.complexity, agent);
    return {
      task: updated,
      taskId: task.id,
      title: task.title,
      description: task.description,
      // O runner usa o status para saber se o revisor revisa ou escreve a spec
      status: task.status,
      hasSpec: Boolean(task.specEditedAt),
      // Só os comentários mais recentes. O histórico completo fica no deskreport_get_task
      comments: task.comments.slice(-5).map((c) => `${c.user?.name || 'Membro'}: ${c.content}`),
      project: task.project,
      // O deskreport-client baixa cada anexo e passa o caminho local no prompt do agente
      attachments: task.attachments,
      agent,
      projectPath,
      machineId: machine?.id,
      machineName: machine?.name,
      machineOffline: machineOffline || undefined,
      mode,
      // Etapa pedida pela esteira. Hoje só o QA, que o runner não adivinha pelo cargo quando o mesmo agente revisa
      stage: data?.stage === 'qa' ? 'qa' : undefined,
      // Ambiente de QA do projeto. Vem só do cadastro, nunca de texto de tarefa ou comentário
      environment: data?.stage === 'qa' ? await this.qaEnvironment(organizationId, task.project, machine?.id) : undefined,
      // Commit automático depois do QA aprovado: o DevOps commita, sem push nem deploy
      commit: data?.commit === true ? true : undefined,
      // Micro-Router: o client usa o modelo sugerido quando a máquina não fixou um modelo para o agente
      complexity: task.complexity,
      // O tipo define a skill injetada no prompt do agente
      type: task.type,
      suggestedProfile: route.profile,
      suggestedModel: route.suggestedModel,
      // No modo task é o pedido do agente anterior da esteira, quando houver
      comment: text(data?.comment, 10000),
    };
  }

  // Classificação da spec feita na máquina. A regra dos fatos roda de novo aqui, a API não confia no client
  async saveClassification(organizationId: string, data: any) {
    if (typeof data?.taskId !== 'string' || !complexities.includes(data?.complexity)) return null;

    // Sem confiança informada conta como baixa e sobe um nível
    const complexity = finalTier(data.complexity, Number(data.confidence) || 0, data);
    const { count } = await this.prisma.task.updateMany({
      where: { id: data.taskId, companyId: organizationId },
      data: { complexity, tokenBudget: budgets[complexity] },
    });
    if (!count) return null;
    return this.prisma.task.findFirst({ where: { id: data.taskId, companyId: organizationId }, include: taskInclude });
  }

  // A tarefa guarda o id do projeto, mas tarefas antigas podem ter o nome
  private projectLocations(organizationId: string, project: string) {
    return this.prisma.project.findFirst({
      where: { organizationId, OR: [{ id: project }, { name: { equals: project, mode: 'insensitive' } }] },
      select: { folder: true, defaultMachineId: true, locations: { select: { machineId: true, folder: true, path: true }, orderBy: { createdAt: 'asc' } } },
    });
  }

  // Ambientes liberados para o QA: local primeiro, depois staging, e produção só se o projeto marcou
  // O ambiente local vale só na máquina dele (ou em qualquer uma quando não tem máquina)
  async qaEnvironment(organizationId: string, project: string, machineId?: string) {
    const found = await this.prisma.project.findFirst({
      where: { organizationId, OR: [{ id: project }, { name: { equals: project, mode: 'insensitive' } }] },
      select: { environments: { where: { qaEnabled: true }, select: { name: true, kind: true, url: true, healthUrl: true, startCommand: true, machineId: true } } },
    });
    const order = ['local', 'staging', 'production'];
    return found?.environments
      .filter((env) => env.kind !== 'local' || !env.machineId || env.machineId === machineId)
      .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))[0];
  }

  async autoCommitAfterQa(organizationId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId: organizationId }, select: { project: true } });
    if (!task) return false;
    const found = await this.prisma.project.findFirst({
      where: { organizationId, OR: [{ id: task.project }, { name: { equals: task.project, mode: 'insensitive' } }] },
      select: { autoCommitAfterQa: true },
    });
    return found?.autoCommitAfterQa === true;
  }

  // Projetos ativos com pasta e sem ambiente liberado para o QA, para o aviso do onboarding do widget
  async projectsWithoutQa(organizationId: string) {
    const projects = await this.prisma.project.findMany({
      where: { organizationId, status: 'active', folder: { not: null }, environments: { none: { qaEnabled: true } } },
      select: { name: true },
      orderBy: { name: 'asc' },
    });
    return { organizationId, names: projects.map((project) => project.name) };
  }

  // Rotas do MCP: o agente fala com o DeskReport pela chave da máquina, sempre preso à organização dela
  listProjects(organizationId: string) {
    return this.prisma.project.findMany({
      where: { organizationId },
      select: { id: true, name: true, description: true, folder: true, status: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Cada pasta do Workspace vira um projeto. Projeto que já tem o nome da pasta só ganha o folder
  async syncProjects(organizationId: string, machineId: string | undefined, raw: unknown) {
    if (!Array.isArray(raw) || raw.length > 200) {
      throw new BadRequestException('folders deve ser uma lista de pastas');
    }
    for (const item of raw) checkProjectPath(typeof item === 'string' ? item : item?.name);

    const folders = cleanFolders(raw);
    for (const item of folders) {
      let project = await this.matchProject(organizationId, item, true);
      if (!project) {
        // Outro repositório com o mesmo nome de projeto: o remote diferencia
        const sameName = await this.prisma.project.findFirst({ where: { organizationId, name: { equals: item.name, mode: 'insensitive' } }, select: { id: true } });
        const name = sameName && item.remote ? item.remote : item.name;
        project = await this.prisma.project.create({
          data: { organizationId, name, folder: item.name, remote: item.remote },
          select: { id: true, folder: true, remote: true, defaultMachineId: true },
        });
      }
      if (machineId) await this.saveLocation(project, machineId, item);
      if (!project.folder) await this.prisma.project.update({ where: { id: project.id }, data: { folder: item.name } });
    }

    return this.listProjects(organizationId);
  }

  createProject(organizationId: string, data: any) {
    const name = text(data?.name, 100)?.trim();
    if (!name) throw new BadRequestException('Informe name');

    return this.prisma.project.create({
      data: { organizationId, name, description: text(data?.description, 2000) },
      select: { id: true, name: true, description: true, status: true },
    });
  }

  async listTasks(organizationId: string, query: any) {
    const project = await this.findProjectId(organizationId, query?.project);

    return this.prisma.task.findMany({
      where: {
        companyId: organizationId,
        project,
        status: taskStatuses.includes(query?.status) ? query.status : undefined,
        priority: taskPriorities.includes(query?.priority) ? query.priority : undefined,
      },
      include: { assignees: true },
      orderBy: { shortId: 'desc' },
      take: 100,
    });
  }

  // Aceita o UUID ou o número curto da tarefa (3 ou #003)
  async findTaskId(organizationId: string, ref: string) {
    const where = /^#?\d{1,9}$/.test(ref)
      ? { companyId: organizationId, shortId: Number(ref.replace('#', '')) }
      : { companyId: organizationId, id: ref };
    const task = await this.prisma.task.findFirst({ where, select: { id: true } });
    if (!task) throw new NotFoundException('Task not found');
    return task.id;
  }

  async getTask(organizationId: string, ref: string) {
    const id = await this.findTaskId(organizationId, ref);
    return this.prisma.task.findFirst({ where: { id, companyId: organizationId }, include: taskInclude });
  }

  // O agente vira o autor da tarefa
  async createTask(organizationId: string, data: any) {
    const agent = data?.agent && agentNames.includes(data.agent) ? data.agent : 'antigravity';
    const { assigneeIds, ...fields } = await this.taskFields(organizationId, data);
    if (!fields.title) throw new BadRequestException('Informe title');

    if (!fields.project) {
      const firstProject = await this.prisma.project.findFirst({
        where: { organizationId },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (firstProject) fields.project = firstProject.id;
      else throw new BadRequestException('Informe project');
    }

    // Na #071 três agentes abriram a mesma tarefa em 10 minutos. Título parecido com uma tarefa aberta recente do projeto vira comentário nela
    const recent = await this.prisma.task.findMany({
      where: { companyId: organizationId, project: fields.project, status: { notIn: ['done', 'release'] }, createdAt: { gte: new Date(Date.now() - 12 * 3_600_000) } },
      select: { shortId: true, title: true },
    });
    const twin = recent.find((task) => similarTitles(task.title, fields.title));
    if (twin) {
      throw new ConflictException(`Já existe a tarefa #${String(twin.shortId).padStart(3, '0')} parecida: "${twin.title}". Comente nela com deskreport_comment_task em vez de abrir outra.`);
    }

    await this.ensureAgentUsers(organizationId, [agent]);
    const last = await this.prisma.task.findFirst({
      where: { companyId: organizationId },
      orderBy: { shortId: 'desc' },
      select: { shortId: true },
    });

    return this.prisma.task.create({
      data: {
        ...fields,
        title: fields.title,
        project: fields.project,
        complexity: 'pending',
        companyId: organizationId,
        shortId: (last?.shortId || 0) + 1,
        reporterId: agentUsers[agent].id,
        assignees: assigneeIds ? { connect: assigneeIds.map((id) => ({ id })) } : undefined,
      },
      include: taskInclude,
    });
  }

  async updateTask(organizationId: string, ref: string, data: any) {
    const id = await this.findTaskId(organizationId, ref);
    const { assigneeIds, ...fields } = await this.taskFields(organizationId, data);

    if (fields.status === 'release') {
      const open = await this.prisma.task.findFirst({ where: { id, waitingFor: { not: Prisma.DbNull } }, select: { id: true } });
      if (open) throw new BadRequestException('A tarefa tem uma pergunta aguardando resposta da pessoa');
    }

    return this.prisma.task.update({
      where: { id },
      data: { ...fields, assignees: assigneeIds ? { set: assigneeIds.map((id) => ({ id })) } : undefined },
      include: taskInclude,
    });
  }

  // O comentário sai assinado pelo usuário do agente
  async commentTask(organizationId: string, ref: string, data: any) {
    const agent = agentName(data?.agent);
    const content = text(data?.content, 10000)?.trim();
    if (!content) throw new BadRequestException('Informe content');

    const id = await this.findTaskId(organizationId, ref);
    await this.ensureAgentUsers(organizationId, [agent]);
    await this.prisma.taskComment.create({
      data: {
        taskId: id,
        userId: agentUsers[agent].id,
        content: toHtml(content),
        metadata: commentMetadata(agent, data),
      },
    });
    return this.prisma.task.findFirst({ where: { id, companyId: organizationId }, include: taskInclude });
  }

  // Pergunta do agente para a pessoa: aparece na tarefa e segura o Release até alguém responder
  async askHuman(organizationId: string, ref: string, data: any) {
    const agent = agentName(data?.agent);
    const question = text(data?.question, 2000)?.trim();
    if (!question) throw new BadRequestException('Informe question');

    const options = Array.isArray(data?.options)
      ? data.options.filter((option: unknown) => typeof option === 'string' && option.trim()).slice(0, 8).map((option: string) => option.trim().slice(0, 100))
      : [];

    const id = await this.findTaskId(organizationId, ref);
    return this.prisma.task.update({
      where: { id },
      data: { waitingFor: { agent, question, options, multiSelect: Boolean(data?.multiSelect), createdAt: new Date().toISOString() } },
      include: taskInclude,
    });
  }

  // Campos que o agente pode mandar na criação e na edição, validados aqui na borda
  private async taskFields(organizationId: string, data: any) {
    if (data?.status !== undefined && !taskStatuses.includes(data.status)) {
      throw new BadRequestException('status deve ser um de: ' + taskStatuses.join(', '));
    }
    if (data?.priority !== undefined && !taskPriorities.includes(data.priority)) {
      throw new BadRequestException('priority deve ser um de: ' + taskPriorities.join(', '));
    }
    if (data?.type !== undefined && !taskTypes.includes(data.type)) {
      throw new BadRequestException('type deve ser um de: ' + taskTypes.join(', '));
    }
    if (data?.tags !== undefined && (!Array.isArray(data.tags) || data.tags.some((tag: unknown) => typeof tag !== 'string'))) {
      throw new BadRequestException('tags deve ser uma lista de textos');
    }

    const description = text(data?.description, 20000);
    return {
      title: text(data?.title, 300)?.trim() || undefined,
      description: description === undefined ? undefined : toHtml(description),
      project: await this.findProjectId(organizationId, data?.project),
      status: data?.status as string | undefined,
      priority: data?.priority as string | undefined,
      type: data?.type as string | undefined,
      tags: data?.tags?.slice(0, 20).map((tag: string) => ({ label: tag.slice(0, 50), color: 'bg-blue-500 text-blue-500' })),
      assigneeIds: await this.memberIds(organizationId, data?.assigneeIds),
    };
  }

  // Aceita o id ou o nome do projeto, sempre dentro da organização
  private async findProjectId(organizationId: string, value: unknown) {
    const key = text(value, 100)?.trim();
    if (!key) return undefined;

    const project = await this.prisma.project.findFirst({
      where: { organizationId, OR: [{ id: key }, { name: { equals: key, mode: 'insensitive' } }] },
      select: { id: true },
    });
    if (!project) throw new BadRequestException(`Projeto ${key} não encontrado`);
    return project.id;
  }

  // Só aceita membros da organização. Agente pode vir pelo nome (claude, opencode...)
  private async memberIds(organizationId: string, ids: unknown) {
    if (ids === undefined) return undefined;
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
      throw new BadRequestException('assigneeIds deve ser uma lista de ids');
    }

    const userIds: string[] = ids.map((id) => agentUsers[id]?.id || id);
    const members = await this.prisma.member.findMany({
      where: { organizationId, userId: { in: userIds } },
      select: { userId: true },
    });
    if (userIds.some((id) => !members.some((member) => member.userId === id))) {
      throw new BadRequestException('assigneeIds tem usuário fora da organização');
    }
    return userIds;
  }

  // Chat Lateral: cada usuário tem as próprias sessões com cada agente. Nova sessão começa com o contexto limpo
  async listSessions(organizationId: string, userId: string, agent: string) {
    agentName(agent);
    await this.ensureMember(organizationId, userId);

    return this.prisma.agentChatSession.findMany({
      where: { organizationId, userId, agent },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }

  // As sessões anteriores ficam no histórico, mas deixam de ser a ativa
  async createSession(organizationId: string, userId: string, agent: string, data: any) {
    agentName(agent);
    checkProjectPath(data?.projectPath);
    await this.ensureMember(organizationId, userId);
    const taskId = data?.taskId ? await this.findTaskId(organizationId, String(data.taskId)) : undefined;

    await this.prisma.agentChatSession.updateMany({ where: { organizationId, userId, agent, active: true }, data: { active: false } });
    return this.prisma.agentChatSession.create({
      data: { organizationId, userId, agent, title: text(data?.title, 100)?.trim() || undefined, projectPath: data?.projectPath, taskId },
    });
  }

  // Sempre presa ao dono e à organização, ninguém abre a sessão de outro só pelo id
  async findSession(organizationId: string, userId: string, sessionId: string) {
    const session = await this.prisma.agentChatSession.findFirst({ where: { id: sessionId, organizationId, userId } });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async listSessionMessages(organizationId: string, userId: string, sessionId: string) {
    await this.findSession(organizationId, userId, sessionId);

    const messages = await this.prisma.agentChatMessage.findMany({
      where: { organizationId, sessionId },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return messages.reverse();
  }

  async deleteSession(organizationId: string, userId: string, sessionId: string) {
    const { count } = await this.prisma.agentChatSession.deleteMany({ where: { id: sessionId, organizationId, userId } });
    if (count === 0) throw new NotFoundException('Session not found');
    return { id: sessionId };
  }

  // A primeira mensagem vira o título da sessão e a pasta do projeto fica fixa nela, porque a conversa da CLI mora na pasta
  async saveSessionMessage(organizationId: string, ownerId: string, sessionId: string, data: any) {
    const content = text(data?.content, 10000)?.trim();
    if (!content) throw new BadRequestException('Informe content');
    checkProjectPath(data?.projectPath);
    const session = await this.findSession(organizationId, ownerId, sessionId);
    await this.ensureAgentUsers(organizationId, [session.agent]);

    const message = await this.prisma.agentChatMessage.create({
      data: { organizationId, sessionId, agent: session.agent, ownerId, userId: ownerId, content },
      include: { user: { select: { id: true, name: true, image: true } } },
    });
    const updated = await this.prisma.agentChatSession.update({
      where: { id: session.id },
      data: {
        title: session.title === 'Nova conversa' ? content.slice(0, 60) : session.title,
        projectPath: session.projectPath || data?.projectPath,
        active: true,
      },
    });
    return { message, session: updated };
  }

  // Resposta vinda da máquina, assinada pelo usuário do agente. Guarda o id da conversa da CLI para retomar na próxima mensagem
  async saveChatReply(organizationId: string, data: any) {
    const content = text(data?.content, 10000)?.trim();
    const ownerId = text(data?.ownerId, 60);
    const sessionId = text(data?.sessionId, 60);
    if (!agentNames.includes(data?.agent) || !content || !ownerId || !sessionId) return null;

    const session = await this.prisma.agentChatSession.findFirst({ where: { id: sessionId, organizationId, userId: ownerId, agent: data.agent } });
    if (!session) return null;

    const externalId = text(data?.externalId, 100);
    await this.prisma.agentChatSession.update({
      where: { id: session.id },
      data: { externalId: session.externalId || externalId },
    });
    return this.prisma.agentChatMessage.create({
      data: { organizationId, sessionId, agent: data.agent, ownerId, userId: agentUsers[data.agent].id, content },
      include: { user: { select: { id: true, name: true, image: true } } },
    });
  }

  // Sala do time: conversa entre agentes, sem dono
  async listTeamChat(organizationId: string, query: any) {
    const taskId = query?.taskId ? await this.findTaskId(organizationId, String(query.taskId)) : undefined;
    const take = Math.min(Number(query?.limit) || 50, 100);

    const messages = await this.prisma.agentChatMessage.findMany({
      where: { organizationId, ownerId: null, taskId },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return messages.reverse();
  }

  // toAgent vazio ou team vai para o time todo
  async saveTeamMessage(organizationId: string, fromAgent: unknown, data: any) {
    const agent = agentName(fromAgent);
    const content = text(data?.message, 10000)?.trim();
    if (!content) throw new BadRequestException('Informe message');

    const toAgent = data?.toAgent && data.toAgent !== 'team' ? agentName(data.toAgent) : null;
    if (toAgent === agent) throw new BadRequestException('toAgent deve ser outro agente');
    const taskId = data?.taskId ? await this.findTaskId(organizationId, String(data.taskId)) : null;

    await this.ensureAgentUsers(organizationId, [agent]);
    return this.prisma.agentChatMessage.create({
      data: { organizationId, agent, userId: agentUsers[agent].id, targetAgent: toAgent, taskId, content },
      include: { user: { select: { id: true, name: true, image: true } } },
    });
  }

  private async ensureMember(organizationId: string, userId: string) {
    if (!(await this.isMember(organizationId, userId))) throw new NotFoundException('Organization not found');
  }

  async finishTask(organizationId: string, data: any) {
    const taskId = text(data?.taskId, 60);
    if (!taskId) return null;

    const task = await this.prisma.task.findFirst({ where: { id: taskId, companyId: organizationId } });
    if (!task) return null;

    const agentUser = agentUsers[data.agent];
    const tokens = Number.isInteger(data.tokens) && data.tokens > 0 ? data.tokens : 0;
    if (tokens) {
      await this.prisma.task.update({ where: { id: task.id }, data: { tokensUsed: { increment: tokens } } });
    }
    // Parada pelo usuário: a tarefa volta para A fazer
    if (data.stopped && task.status === 'in-progress') {
      await this.prisma.task.update({ where: { id: task.id }, data: { status: 'todo' } });
    }
    if (data.exitCode === 0 && data.agent !== 'antigravity' && data.mode !== 'comment') {
      // A revisão vai para o Antigravity só quando a organização usa esse agente
      const hasReviewer = (await this.enabledAgents(organizationId)).includes('antigravity');
      await this.prisma.task.update({
        where: { id: task.id },
        data: hasReviewer ? { status: 'review', assignees: { connect: { id: agentUsers.antigravity.id } } } : { status: 'review' },
      });
    }

    // Spec do agente substitui a descrição e guarda a anterior
    const spec = data.stage === 'spec' && data.exitCode === 0 && !data.stopped ? text(data.spec, 30000)?.trim() : '';
    if (spec && agentUser) {
      await this.prisma.task.update({
        where: { id: task.id, companyId: organizationId },
        data: { description: toHtml(spec), descriptionPrevious: task.description, specEditedBy: data.agent, specEditedAt: new Date() },
      });
    }

    const userId = agentUser?.id || task.reporterId || (await this.prisma.member.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    }))?.userId;

    if (userId) {
      const agent = agentNames.includes(data?.agent) ? data.agent : undefined;
      await this.prisma.taskComment.create({
        data: {
          taskId: task.id,
          userId,
          content: finishedComment(data),
          metadata: agent ? commentMetadata(agent, data) : undefined,
        },
      });
    }

    return this.prisma.task.findFirst({ where: { id: task.id, companyId: organizationId }, include: taskInclude });
  }
}

// Resposta enxuta para o chat do agente: sem avatar em base64 nem dados de conta
export function compactTask(task: any) {
  return {
    id: task.id,
    shortId: task.shortId,
    title: task.title,
    description: task.description,
    project: task.project,
    status: task.status,
    priority: task.priority,
    tags: task.tags,
    waitingFor: task.waitingFor,
    reporterId: task.reporterId,
    assignees: task.assignees?.map((user: any) => ({ id: user.id, name: user.name })),
    comments: task.comments?.map((comment: any) => ({
      author: comment.user?.name,
      content: comment.content,
      metadata: comment.metadata || undefined,
      createdAt: comment.createdAt,
    })),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export type MachineFolder = { name: string; path: string; remote: string | null };

// Qualquer URL de origin vira host/dono/repo em minúsculas. Inválida vira null
export function normalizeGitRemote(raw: unknown) {
  if (typeof raw !== 'string') return null;

  const value = raw
    .trim()
    .replace(/^(https?|ssh|git):\/\//i, '')
    .replace(/^[^/@]+@/, '')
    .replace(/^([^/:]+):/, '$1/')
    .replace(/\/+$/, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '')
    .toLowerCase();
  return /^[\w.-]+\/[^\s]+$/.test(value) && !value.includes('..') ? value : null;
}

// Aceita a lista nova ({ name, path, remote }) e a antiga (só os nomes). O que não for pasta válida fica de fora
function cleanFolders(raw: unknown): MachineFolder[] {
  if (!Array.isArray(raw)) return [];

  const folders: MachineFolder[] = [];
  for (const item of raw.slice(0, 200)) {
    const name = typeof item === 'string' ? item : item?.name;
    if (typeof name !== 'string' || !/^[\w.-]+$/.test(name) || name.startsWith('.')) continue;

    const path = typeof item?.path === 'string' && item.path.length <= 500 ? item.path : name;
    folders.push({ name, path, remote: normalizeGitRemote(item?.remote) });
  }
  return folders;
}

// Só o nome de uma pasta do workspace, sem subir de diretório
export function checkProjectPath(value: unknown) {
  if (value !== undefined && (typeof value !== 'string' || !/^[\w.-]+$/.test(value) || value.startsWith('.'))) {
    throw new BadRequestException('projectPath deve ser o nome de uma pasta do workspace');
  }
}

function agentName(value: unknown) {
  if (typeof value !== 'string' || !agentNames.includes(value)) {
    throw new BadRequestException('agent deve ser um de: ' + agentNames.join(', '));
  }
  return value;
}

function toHtml(value: string) {
  return `<p>${escapeHtml(value).replace(/\n/g, '<br>')}</p>`;
}

function commentMetadata(agent: string, data: any) {
  const model = text(data?.model, 120)?.trim();
  const exitCode = typeof data?.exitCode === 'number' ? data.exitCode : undefined;
  return {
    agent,
    harness: agent,
    model: model || undefined,
    exitCode,
    error: exitCode !== undefined && exitCode !== 0 && !data?.stopped ? true : undefined,
    stage: text(data?.stage, 40),
  };
}

function cleanSummary(raw: string | undefined): string {
  if (!raw) return '';
  const marker = raw.lastIndexOf('--- RESUMO DA ENTREGA ---');
  const base = marker >= 0 ? raw.slice(marker + 25) : raw;

  const lines = base.split('\n');
  const filtered: string[] = [];
  let skippingCommand = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (filtered.length > 0 && filtered[filtered.length - 1] !== '') filtered.push('');
      continue;
    }

    if (trimmed.startsWith('$ ') || trimmed.startsWith('> ')) {
      skippingCommand = true;
      continue;
    }

    if (
      trimmed.startsWith('exit=') ||
      trimmed === '(no output)' ||
      /^Parei com código \d+/i.test(trimmed) ||
      /^\d+:\s*/.test(trimmed) ||
      /^\d+-\s*/.test(trimmed) ||
      /\|\s*\d+\s*[+-]+$/.test(trimmed) ||
      /^\d+\s+files?\s+changed/i.test(trimmed) ||
      /^\(?node:\d+\)?/i.test(trimmed)
    ) {
      continue;
    }

    if (/^[A-ZÁÉÍÓÚÀÂÊÔÃÕ].*/.test(trimmed) || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      skippingCommand = false;
    }

    if (!skippingCommand) {
      filtered.push(trimmed);
    }
  }

  return filtered.join('\n').trim();
}

function formatChangelog(files: string[]): string {
  if (!files || files.length === 0) return '';

  const list = files.map((file) => {
    const trimmed = file.trim();
    const status = trimmed.slice(0, 2).trim();
    const filePath = trimmed.slice(2).trim();

    let prefix = 'Modificado';
    if (status === 'A' || status === '??') prefix = 'Novo';
    else if (status === 'D') prefix = 'Removido';

    return `<li><strong>[${prefix}]</strong> <code>${escapeHtml(filePath)}</code></li>`;
  });

  return `<p><strong>Changelog de arquivos:</strong></p><ul>${list.join('')}</ul>`;
}

const stageTitles: Record<string, string> = {
  spec: 'Spec concluída.',
  implement: 'Implementação concluída.',
  review: 'Revisão concluída.',
  qa: 'QA concluído.',
};

// Falam do mesmo problema quando dividem 3 radicais ou mais e eles passam da metade do título mais curto.
// O radical (4 primeiras letras, sem acento) junta plural e singular, como "mapa" e "mapas" nas tarefas do SICAR da #071
function similarTitles(a: string, b: string) {
  const first = titleWords(a);
  const second = titleWords(b);
  const common = first.filter((word) => second.includes(word)).length;
  return common >= 3 && common / Math.min(first.length, second.length) > 0.5;
}

function titleWords(title: string) {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4)
    .map((word) => word.slice(0, 4))
    .filter((word, index, all) => all.indexOf(word) === index);
}

// Parecer que aprova e não reprova nem nega a aprovação
export function approved(text: string) {
  return /\baprovad[oa]\b/i.test(text) && !/reprovad|n[aã]o\s+(est[aá]\s+)?aprovad/i.test(text);
}

// O comentário é exibido como HTML no painel, então tudo que vem do agente é escapado
function finishedComment(data: any) {
  let result = data.stopped ? 'Execução parada pelo usuário.' : '';
  if (typeof data.exitCode === 'number' && data.exitCode !== 0 && !data.stopped) result = `Erro na execução (código ${data.exitCode}).`;
  if (data.exitCode === 0 && stageTitles[data.stage]) result = stageTitles[data.stage];
  const verdict = typeof data.comment === 'string' && data.comment ? data.comment : typeof data.summary === 'string' ? data.summary : '';
  if (data.exitCode === 0 && data.stage === 'review') result = approved(verdict) ? 'Revisão concluída: aprovada.' : 'Revisão concluída: com ajustes.';
  if (data.exitCode === 0 && data.stage === 'implement' && !data.touchedFiles?.length) result = 'Implementação não entregue: nenhum arquivo foi alterado.';
  // QA sem ambiente no ar não abriu o navegador: o título não pode dizer que o QA foi feito
  if (data.exitCode === 0 && data.stage === 'qa' && data.qaWithoutEnvironment) result = 'QA só no código: sem ambiente para testar no navegador.';
  const summary = cleanSummary(text(data.summary, 4000));
  const changelog = text(data.changelog, 4000)?.trim();
  const files = Array.isArray(data.touchedFiles) ? data.touchedFiles.slice(0, 50).map((file: unknown) => text(file) || '') : [];

  let html = '';
  if (result) html += `<p>${result}</p>`;
  if (summary) html += `<p>${escapeHtml(summary).replace(/\n/g, '<br>')}</p>`;
  if (changelog) html += `<p><strong>O que mudou:</strong><br>${escapeHtml(changelog).replace(/\n/g, '<br>')}</p>`;
  if (files.length > 0) {
    html += formatChangelog(files);
  }
  return html || '<p>Tarefa concluída sem comentários adicionais.</p>';
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
