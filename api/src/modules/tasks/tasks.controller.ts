import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { ActiveOrg } from '../../auth/active-org.decorator';
import { ActiveUser } from '../../auth/active-user.decorator';
import { AgentsGateway } from '../agents/agents.gateway';
import { AgentsService, agentNames } from '../agents/agents.service';
import { jevKey } from './complexity';

@Controller('tasks')
export class TasksController {
    constructor(
        private readonly tasksService: TasksService,
        private readonly agentsGateway: AgentsGateway,
        private readonly agentsService: AgentsService,
    ) { }

    @Post()
    async create(@ActiveOrg() orgId: string, @Body() data: any) {
        let task = await this.tasksService.create(orgId, data);

        // Tarefa criada já com agente atribuído: abre um agente só na máquina conectada, os outros vêm pela esteira
        // Sem máquina conectada a tarefa fica criada e o agente pode ser acionado depois pelo dispatch
        const agents = task.assignees.filter((user) => user.id.startsWith('agent-user-')).map((user) => user.id.replace('agent-user-', ''));
        if (agents.length > 0) {
            const agent = await this.agentsService.firstAgent(orgId, agents);
            const dispatched = await this.agentsGateway.dispatchTask(orgId, task.id, { agent }).catch(() => null);
            if (dispatched) task = { ...task, ...dispatched.task };
        }

        return task;
    }

    @Get()
    findAll(@ActiveOrg() orgId: string) {
        return this.tasksService.findAll(orgId);
    }

    @Get(':id')
    findOne(@ActiveOrg() orgId: string, @Param('id') id: string) {
        return this.tasksService.findOne(id, orgId);
    }

    @Put(':id')
    update(@ActiveOrg() orgId: string, @Param('id') id: string, @Body() data: any) {
        return this.tasksService.update(id, orgId, data);
    }

    // Camada 1 (Jev) responde na hora. Sem chave, a máquina refina depois e o painel recebe o task:updated
    @Post(':id/classify')
    async classify(@ActiveOrg() orgId: string, @Param('id') id: string) {
        const result = await this.tasksService.classify(id, orgId);
        if (!jevKey()) await this.agentsGateway.requestClassification(orgId, result).catch(() => false);
        return result;
    }

    // Agente escolhido ao lado do botão Comentar ou mencionado no texto (@claude, @opencode...)
    // Ele entra como responsável e recebe o comentário para responder ou executar
    @Post(':id/comments')
    async addComment(
        @ActiveOrg() orgId: string,
        @ActiveUser() userId: string,
        @Param('id') id: string,
        @Body() data: any
    ) {
        const content = typeof data?.content === 'string' ? data.content : '';
        let task = await this.tasksService.addComment(id, orgId, userId, content);
        this.agentsGateway.emitTask(orgId, 'task:updated', task);

        const agents = agentNames.filter((agent) => agent === data?.agent || new RegExp(`@${agent}\\b`, 'i').test(content));
        for (const agent of agents) {
            const dispatched = await this.agentsGateway
                .dispatchTask(orgId, id, { agent, mode: 'comment', comment: content, projectPath: data?.projectPath })
                .catch(() => null);
            if (dispatched && task) task = { ...task, assignees: dispatched.task.assignees };
        }

        return task;
    }

    @Delete(':id')
    remove(@ActiveOrg() orgId: string, @Param('id') id: string) {
        return this.tasksService.remove(id, orgId);
    }
}
