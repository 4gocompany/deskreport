import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { budgets, classifyWithJev, complexities, jevKey, routing } from './complexity';
import { taskTypes } from './task-types';

@Injectable()
export class TasksService {
    constructor(private prisma: PrismaService) { }

    // Máquina da tarefa sempre da organização. Vazio volta para a máquina padrão do projeto
    private async checkMachine(organizationId: string, machineId: unknown) {
        if (!machineId) return null;

        const machine = typeof machineId === 'string' ? await this.prisma.agentMachine.findFirst({ where: { id: machineId, organizationId }, select: { id: true } }) : null;
        if (!machine) throw new BadRequestException('Máquina não encontrada');
        return machine.id;
    }

    async create(organizationId: string, data: any) {
        const { assigneeIds, ...rest } = data;
        rest.companyId = organizationId;
        rest.machineId = await this.checkMachine(organizationId, rest.machineId);
        if (rest.type !== undefined && !taskTypes.includes(rest.type)) throw new BadRequestException('type deve ser um de: ' + taskTypes.join(', '));
        // Sem complexidade escolhida, a tarefa espera a spec pronta para ser classificada
        if (complexities.includes(rest.complexity)) rest.tokenBudget = budgets[rest.complexity];
        else rest.complexity = 'pending';

        const lastTask = await this.prisma.task.findFirst({
            where: { companyId: organizationId },
            orderBy: { shortId: 'desc' },
        });

        const shortId = lastTask ? lastTask.shortId + 1 : 1;

        return this.prisma.task.create({
            data: {
                ...rest,
                shortId,
                assignees: assigneeIds ? {
                    connect: assigneeIds.map((id: string) => ({ id }))
                } : undefined
            },
            include: {
                assignees: true,
                team: true,
                comments: { include: { user: true }, orderBy: { createdAt: 'desc' } }
            }
        });
    }

    async findAll(organizationId: string) {
        return this.prisma.task.findMany({
            where: { companyId: organizationId },
            include: {
                assignees: true,
                team: true,
                comments: { include: { user: true }, orderBy: { createdAt: 'desc' } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findOne(id: string, organizationId: string) {
        return this.prisma.task.findFirst({
            where: { id, companyId: organizationId },
            include: {
                assignees: true,
                team: true,
                comments: { include: { user: true }, orderBy: { createdAt: 'asc' } }
            }
        });
    }

    async update(id: string, organizationId: string, data: any) {
        const task = await this.ensureTaskInOrg(id, organizationId);

        const { title, description, project, status, priority, tags, dueDate, teamId, assigneeIds, type } = data;
        if (type !== undefined && !taskTypes.includes(type)) throw new BadRequestException('type deve ser um de: ' + taskTypes.join(', '));
        // Ajuste manual do tier pela pessoa. Valor fora da lista é ignorado
        const complexity = complexities.includes(data.complexity) ? data.complexity : undefined;
        const machineId = data.machineId === undefined ? undefined : await this.checkMachine(organizationId, data.machineId);
        if (status === 'release' && task.waitingFor) {
            throw new BadRequestException('A tarefa tem uma pergunta de agente aguardando resposta');
        }

        await this.prisma.task.update({
            where: { id },
            data: {
                title,
                description,
                project,
                status,
                priority,
                tags,
                dueDate,
                teamId,
                complexity,
                tokenBudget: complexity ? budgets[complexity] : undefined,
                type,
                machineId,
                assignees: assigneeIds ? {
                    set: assigneeIds.map((id: string) => ({ id }))
                } : undefined
            }
        });

        return this.findOne(id, organizationId);
    }

    // POST /tasks/:id/classify: com chave o Jev classifica aqui. Sem chave fica o tier atual e a máquina classifica depois
    async classify(id: string, organizationId: string) {
        const task = await this.prisma.task.findFirst({
            where: { id, companyId: organizationId },
            select: { id: true, shortId: true, title: true, description: true, tags: true, complexity: true }
        });
        if (!task) throw new NotFoundException('Task not found');

        const result = jevKey() ? await classifyWithJev(task).catch(() => null) : null;
        if (!result) return { ...task, routing: routing(task.complexity) };

        const { complexity, reason } = result;
        await this.prisma.task.update({ where: { id: task.id, companyId: organizationId }, data: { complexity, tokenBudget: budgets[complexity] } });
        return { ...task, complexity, routing: { ...routing(complexity), reason } };
    }

    async addComment(id: string, organizationId: string, userId: string, content: string) {
        await this.ensureTaskInOrg(id, organizationId);

        await this.prisma.taskComment.create({
            data: {
                taskId: id,
                userId,
                content
            }
        });

        // Comentário da pessoa responde a pergunta aberta pelo agente
        await this.prisma.task.update({ where: { id }, data: { waitingFor: Prisma.DbNull } });

        return this.findOne(id, organizationId);
    }

    private async ensureTaskInOrg(id: string, organizationId: string) {
        const task = await this.prisma.task.findFirst({
            where: { id, companyId: organizationId },
            select: { id: true, waitingFor: true }
        });

        if (!task) {
            throw new NotFoundException('Task not found');
        }

        return task;
    }

    async remove(id: string, organizationId: string) {
        return this.prisma.task.deleteMany({
            where: { id, companyId: organizationId }
        });
    }
}
