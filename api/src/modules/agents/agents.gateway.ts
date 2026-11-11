import { BadRequestException } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import { Server, Socket } from 'socket.io';
import { auth } from '../../auth/auth';
import { allowedOrigins } from '../../origins';
import { AgentsService, agentNames, approved, checkProjectPath, mentionName } from './agents.service';

// A autenticação é feita na conexão (chave da máquina ou sessão do navegador), por isso o guard global fica de fora
@AllowAnonymous()
@WebSocketGateway({ cors: { origin: allowedOrigins, credentials: true } })
export class AgentsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  // Execuções automáticas seguidas por tarefa, sem nenhuma pessoa no meio
  private autoRuns: Record<string, number> = {};

  // Agentes já acionados por menção durante a etapa atual, por tarefa e agente que mencionou
  private handoffs: Record<string, string[]> = {};

  constructor(private agentsService: AgentsService) { }

  async handleConnection(client: Socket) {
    try {
      const machineToken = client.handshake.auth?.machineToken;
      if (machineToken) {
        const machine = await this.agentsService.findMachineByToken(machineToken);
        if (!machine) return client.disconnect(true);

        const { organizationId, machineId, machineName } = machine;
        client.data = { kind: 'machine', organizationId, machineId, machineName, agents: client.handshake.auth?.agents };
        client.join(machineRoom(organizationId));
        // O runner guarda o próprio id para ignorar tarefas presas a outra máquina
        if (machineId) client.emit('machine:identity', { machineId, machineName });
        await this.syncAgents(organizationId);
        return;
      }

      const organizationId = client.handshake.auth?.organizationId || client.handshake.query?.organizationId;
      if (typeof organizationId !== 'string') return client.disconnect(true);

      const session = await auth.api.getSession({ headers: fromNodeHeaders(client.handshake.headers) });
      if (!session || !(await this.agentsService.isMember(organizationId, session.user.id))) {
        return client.disconnect(true);
      }

      client.data = { kind: 'ui', organizationId };
      client.join(uiRoom(organizationId));
      client.join(userRoom(organizationId, session.user.id));
      client.emit('agent:status-list', await this.agentsService.statusList(organizationId));
      client.emit('agent:task-logs', this.agentsService.logsByOrg(organizationId));
      client.emit('agent:profiles-updated', { profiles: await this.agentsService.agentProfiles(organizationId) });
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('machine:agents')
  async machineAgents(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    if (client.data?.kind !== 'machine') return;

    client.data.agents = data?.agents;
    await this.syncAgents(client.data.organizationId);
  }

  // A máquina vem do token autenticado, nunca do payload
  @SubscribeMessage('machine:folders')
  async machineFolders(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    if (client.data?.kind !== 'machine') return;

    await this.agentsService.saveMachineFolders(client.data.organizationId, client.data.machineId, data?.folders);
  }

  async onlineMachineIds(organizationId: string): Promise<string[]> {
    const sockets = await this.server.in(machineRoom(organizationId)).fetchSockets();
    return sockets.map((socket) => socket.data?.machineId).filter((id) => typeof id === 'string');
  }

  // Cada máquina diz quais agentes usa, a organização fica com a soma das máquinas conectadas
  async syncAgents(organizationId: string) {
    const sockets = await this.server.in(machineRoom(organizationId)).fetchSockets();
    const lists = sockets.map((socket) => socket.data?.agents).filter((agents) => Array.isArray(agents));
    if (lists.length === 0) return;

    await this.agentsService.setEnabledAgents(organizationId, lists.flat());
    this.server.to(uiRoom(organizationId)).emit('agent:status-list', await this.agentsService.statusList(organizationId));
  }

  @SubscribeMessage('machine:roles-updated')
  async machineRoles(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    if (client.data?.kind !== 'machine') return;

    await this.agentsService.saveMachineRoles(client.data.organizationId, client.handshake.auth?.machineToken, data?.roles);
  }

  // Apelido e avatar são só apresentação: a chave do agente segue a mesma em rotas, despachos e telemetria
  @SubscribeMessage('machine:profiles-updated')
  async machineProfiles(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    if (client.data?.kind !== 'machine') return;

    const organizationId = client.data.organizationId;
    const profiles = await this.agentsService.saveMachineProfiles(organizationId, client.handshake.auth?.machineToken, data?.profiles);
    this.server.to(uiRoom(organizationId)).emit('agent:profiles-updated', { profiles });
  }

  @SubscribeMessage('machine:telemetry')
  telemetry(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    if (client.data?.kind !== 'machine') return;

    // A máquina vem da chave autenticada, nunca do payload. O nome do runner só vale sem cadastro (chave de dev)
    const { organizationId, machineId, machineName } = client.data;
    const status = this.agentsService.saveStatus(organizationId, { ...data, machineId, machineName: machineName || data?.machineName });
    if (status) this.server.to(uiRoom(organizationId)).emit('agent:status', status);
  }

  // Saída do terminal do agente, vai para o painel da organização em tempo real
  @SubscribeMessage('machine:task-output')
  taskOutput(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    if (client.data?.kind !== 'machine') return;

    const output = this.agentsService.appendOutput(client.data.organizationId, data);
    if (output) this.server.to(uiRoom(client.data.organizationId)).emit('agent:task-output', output);
  }

  @SubscribeMessage('machine:task-finished')
  async taskFinished(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    if (client.data?.kind !== 'machine') return;

    const organizationId = client.data.organizationId;
    // A classificação da spec é gravada antes da próxima etapa, para o implementador sair com modelo e orçamento certos
    if (data?.classification) await this.agentsService.saveClassification(organizationId, { ...data.classification, taskId: data.taskId });
    const task = await this.agentsService.finishTask(organizationId, data);
    if (task) this.server.to(uiRoom(organizationId)).emit('task:updated', task);
    if (task && data?.exitCode === 0 && !data?.stopped) await this.nextStage(organizationId, task.id, data);
    // A etapa acabou: a próxima pode mencionar de novo os mesmos agentes
    if (task) delete this.handoffs[`${task.id}:${data.agent}`];

    const status = this.agentsService.saveStatus(organizationId, {
      agent: data?.agent,
      state: 'idle',
      tokens: data?.tokens,
      contextTokens: data?.contextTokens,
      contextLimit: data?.contextLimit,
    });
    if (status) this.server.to(uiRoom(organizationId)).emit('agent:status', status);
  }

  // Camada 2: a máquina devolve a triagem feita pelo harness local mais barato
  @SubscribeMessage('task:classified')
  async taskClassified(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    if (client.data?.kind !== 'machine') return;

    const organizationId = client.data.organizationId;
    const task = await this.agentsService.saveClassification(organizationId, data);
    if (task) this.server.to(uiRoom(organizationId)).emit('task:updated', task);
  }

  // Sem chave do Jev na API, uma única máquina da organização faz a triagem em modo somente leitura
  async requestClassification(organizationId: string, task: { id: string; title?: string | null; description?: string | null; tags?: unknown }) {
    const [machine] = await this.server.in(machineRoom(organizationId)).fetchSockets();
    if (!machine) return false;

    machine.emit('machine:classify-task', { taskId: task.id, title: task.title, description: task.description, tags: task.tags });
    return true;
  }

  // Resposta do agente no Chat Lateral, só o dono da conversa recebe
  @SubscribeMessage('machine:chat-reply')
  async chatReply(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    if (client.data?.kind !== 'machine') return;

    const organizationId = client.data.organizationId;
    const message = await this.agentsService.saveChatReply(organizationId, data);
    if (message?.ownerId) this.server.to(userRoom(organizationId, message.ownerId)).emit('agent:chat-message', message);
  }

  // Resposta do agente que foi chamado na sala do time. Não acorda ninguém, para não virar conversa sem fim
  @SubscribeMessage('machine:team-reply')
  async teamReply(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    if (client.data?.kind !== 'machine') return;

    const organizationId = client.data.organizationId;
    try {
      const message = await this.agentsService.saveTeamMessage(organizationId, data?.agent, data);
      this.server.to(uiRoom(organizationId)).emit('agent:team-message', message);
    } catch {
      return;
    }
  }

  // Mensagem de um agente para outro (ou para o time). Com destino, a máquina roda o agente que recebeu
  async sendTeamMessage(organizationId: string, fromAgent: string, data: any) {
    const projectPath = data?.projectPath;
    checkProjectPath(projectPath);

    const message = await this.agentsService.saveTeamMessage(organizationId, fromAgent, data);
    this.server.to(uiRoom(organizationId)).emit('agent:team-message', message);

    if (message.targetAgent) {
      const history = await this.agentsService.listTeamChat(organizationId, { taskId: message.taskId, limit: 8 });
      this.server.to(machineRoom(organizationId)).emit('agent:team-message', {
        from: message.agent,
        to: message.targetAgent,
        taskId: message.taskId,
        projectPath,
        content: message.content,
        history: history.map((m) => ({ author: m.user.name, content: m.content })),
      });
    }
    return message;
  }

  // Humano autorizou o agente a seguir mesmo com a cota acima da margem de segurança
  continueQuota(organizationId: string, agent: string) {
    if (!agentNames.includes(agent)) throw new BadRequestException('agent deve ser um de: ' + agentNames.join(', '));

    this.server.to(machineRoom(organizationId)).emit('agent:quota-continue', { agent });
    return { agent };
  }

  // Humano preferiu não seguir: a máquina tira da fila o que esperava a cota do agente
  dropQuotaQueue(organizationId: string, agent: string) {
    if (!agentNames.includes(agent)) throw new BadRequestException('agent deve ser um de: ' + agentNames.join(', '));

    this.server.to(machineRoom(organizationId)).emit('agent:quota-drop', { agent });
    return { agent };
  }

  // Salva a mensagem na sessão e manda a máquina rodar o agente. Com externalId a CLI retoma a própria conversa
  async sendSessionChat(organizationId: string, userId: string, sessionId: string, data: any) {
    if (!(await this.hasMachine(organizationId))) {
      throw new BadRequestException('Nenhuma máquina conectada. Suba o deskreport-client.');
    }

    const { message, session } = await this.agentsService.saveSessionMessage(organizationId, userId, sessionId, data);
    const history = await this.agentsService.listSessionMessages(organizationId, userId, session.id);
    this.server.to(userRoom(organizationId, userId)).emit('agent:chat-message', message);
    this.server.to(machineRoom(organizationId)).emit('agent:chat', {
      agent: session.agent,
      ownerId: userId,
      sessionId: session.id,
      externalId: session.externalId,
      projectPath: session.projectPath,
      content: message.content,
      history: history.slice(-9, -1).map((m) => ({ author: m.user.name, content: m.content })),
    });
    return { ...message, session };
  }

  async hasMachine(organizationId: string) {
    const sockets = await this.server.in(machineRoom(organizationId)).fetchSockets();
    return sockets.length > 0;
  }

  // Atribui o agente na tarefa e manda o deskreport-client abrir o agente com a spec
  async dispatchTask(organizationId: string, taskId: string, data: any) {
    const { task, machineName, ...job } = await this.agentsService.startDispatch(taskId, organizationId, data, await this.onlineMachineIds(organizationId));
    // Acionamento por uma pessoa reinicia o limite da esteira automática
    if (!data?.auto) delete this.autoRuns[task.id];
    this.emitTask(organizationId, 'task:updated', task);
    // Máquina alvo offline: nunca cai em outra máquina, o agente só fica atribuído
    if (job.machineOffline) return { ...job, task };
    if (job.mode === 'task') this.agentsService.clearOutput(organizationId, task.id);
    this.server.to(machineRoom(organizationId)).emit('agent:dispatch', job);
    return { ...job, task };
  }

  // Esteira automática: quem terminou passa a vez para os agentes que mencionou com @ no resumo.
  // Sem menção, a implementação segue para a revisão do Antigravity quando a organização usa esse agente
  async nextStage(organizationId: string, taskId: string, data: any) {
    const text = typeof data.comment === 'string' && data.comment ? data.comment : typeof data.summary === 'string' ? data.summary : '';
    // Revisão aprovada passa para o agente com cargo de QA, mesmo que seja o próprio revisor
    if (data.stage === 'review' && approved(text)) {
      const qaAgent = await this.agentsService.agentForRole(organizationId, 'qa');
      if (qaAgent && this.countAutoRun(taskId)) {
        const result = await this.dispatchTask(organizationId, taskId, { agent: qaAgent, stage: 'qa', comment: text, auto: true }).catch(() => null);
        if (result) return;
      }
    }
    // QA aprovado no navegador: o projeto pode pedir o commit ao DevOps. Sem a opção, ou com QA só no código, a esteira para e espera a pessoa
    if (data.stage === 'qa' && !data.qaWithoutEnvironment && approved(text) && (await this.agentsService.autoCommitAfterQa(organizationId, taskId))) {
      const devops = await this.agentsService.agentForRole(organizationId, 'devops');
      if (devops && this.countAutoRun(taskId)) {
        const result = await this.dispatchTask(organizationId, taskId, { agent: devops, comment: text, commit: true, auto: true }).catch(() => null);
        if (result) return;
      }
    }
    // Depois do QA a menção não aciona ninguém, nem para commit: o único caminho automático é o commit acima
    if (data.stage === 'qa') return;
    const mentioned = await this.dispatchMentions(organizationId, taskId, text, data.agent);
    // Conta também quem o agente já acionou por comentário durante a etapa
    const handedOff = mentioned.length > 0 || (this.handoffs[`${taskId}:${data.agent}`] || []).length > 0;
    if (handedOff || data.mode === 'comment') return;

    // Implementação que deixou arquivos alterados vai para a revisão, mesmo pedida por outro agente que esqueceu de mencionar o revisor.
    // O commit do DevOps não deixa arquivo pendente e para aqui. Runner antigo, sem a etapa, segue a regra de antes
    const implemented = data.stage ? data.stage === 'implement' && Array.isArray(data.touchedFiles) && data.touchedFiles.length > 0 : !data.handoff && data.agent !== 'antigravity';
    if (!implemented) return;
    const reviewer = await this.agentsService.agentForRole(organizationId, 'review');
    if (reviewer && reviewer !== data.agent && this.countAutoRun(taskId)) {
      await this.dispatchTask(organizationId, taskId, { agent: reviewer, auto: true }).catch(() => null);
    }
  }

  // Agente que menciona outro (@claude, @opencode ou o apelido, como @jarvis) passa a próxima etapa para ele, com o comentário como pedido.
  // Só agentes habilitados, e cada um uma vez por etapa de quem mencionou
  async dispatchMentions(organizationId: string, taskId: string, content: string, fromAgent: string, projectPath?: string) {
    const enabled = await this.agentsService.enabledAgents(organizationId);
    const profiles = await this.agentsService.agentProfiles(organizationId);
    const key = `${taskId}:${fromAgent}`;
    const already = this.handoffs[key] || [];
    const agents = enabled.filter((agent) => {
      if (agent === fromAgent || already.includes(agent)) return false;
      const nickname = profiles[agent]?.nickname ? mentionName(profiles[agent].nickname) : '';
      const names = nickname ? `${agent}|${nickname}` : agent;
      return new RegExp(`@(${names})\\b`, 'i').test(content);
    });

    const dispatched = [];
    for (const agent of agents) {
      if (!this.countAutoRun(taskId)) break;
      // Registra antes de acionar, para dois eventos seguidos não acionarem o mesmo agente
      this.handoffs[key] = [...(this.handoffs[key] || []), agent];
      const result = await this.dispatchTask(organizationId, taskId, { agent, comment: content, projectPath, auto: true }).catch(() => null);
      if (result) dispatched.push(result);
      else this.handoffs[key] = this.handoffs[key].filter((name) => name !== agent);
    }
    return dispatched;
  }

  // Limite de execuções seguidas entre agentes, para não virar conversa sem fim
  private countAutoRun(taskId: string) {
    const runs = this.autoRuns[taskId] || 0;
    if (runs >= MAX_AUTO_RUNS) return false;
    this.autoRuns[taskId] = runs + 1;
    return true;
  }

  // Manda a máquina matar o agente que roda a tarefa (ou tirar ela da fila)
  async stopTask(organizationId: string, taskId: string) {
    if (!(await this.hasMachine(organizationId))) {
      throw new BadRequestException('Nenhuma máquina conectada. Suba o deskreport-client.');
    }

    const id = await this.agentsService.findTaskToStop(taskId, organizationId);
    this.server.to(machineRoom(organizationId)).emit('agent:stop-task', { taskId: id });
    return { taskId: id };
  }

  // Avisa o painel da organização que uma tarefa mudou
  emitTask(organizationId: string, event: 'task:created' | 'task:updated', task: unknown) {
    this.server.to(uiRoom(organizationId)).emit(event, task);
  }
}

// Spec, implementação, revisão, correção, nova revisão e commit/deploy cabem com folga
const MAX_AUTO_RUNS = 8;

function machineRoom(organizationId: string) {
  return `org:${organizationId}:machines`;
}

function uiRoom(organizationId: string) {
  return `org:${organizationId}:ui`;
}

function userRoom(organizationId: string, userId: string) {
  return `org:${organizationId}:user:${userId}`;
}
