import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { classifyTask, complexities, routing, triageTask } from './complexity';

@Injectable()
export class TasksService {
    constructor(private prisma: PrismaService) { }

    async create(organizationId: string, data: any) {
        const { assigneeIds, ...rest } = data;
        rest.companyId = organizationId;
        // Sem complexidade escolhida, o Micro-Router define pelo texto da tarefa
        if (!complexities.includes(rest.complexity)) rest.complexity = classifyTask(rest).complexity;

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

        const { title, description, project, status, priority, tags, dueDate, teamId, assigneeIds } = data;
        // Ajuste manual do tier pela pessoa. Valor fora da lista é ignorado
        const complexity = complexities.includes(data.complexity) ? data.complexity : undefined;
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
                assignees: assigneeIds ? {
                    set: assigneeIds.map((id: string) => ({ id }))
                } : undefined
            }
        });

        return this.findOne(id, organizationId);
    }

    // POST /tasks/:id/classify: recalcula o tier (Jev quando há chave, senão regra por texto) e grava
    async classify(id: string, organizationId: string) {
        const task = await this.prisma.task.findFirst({
            where: { id, companyId: organizationId },
            select: { id: true, shortId: true, title: true, description: true, tags: true }
        });
        if (!task) throw new NotFoundException('Task not found');

        const { complexity, reason } = await triageTask(task);
        await this.prisma.task.update({ where: { id }, data: { complexity } });
        return { id: task.id, shortId: task.shortId, title: task.title, description: task.description, tags: task.tags, complexity, routing: { ...routing(complexity), reason } };
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
