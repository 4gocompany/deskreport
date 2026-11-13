import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { budgets, classifyWithJev, complexities, jevKey, routing } from './complexity';
import { editChecklist, TaskChecklist } from './checklist';
import { taskTypes } from './task-types';
import { answerHtml, answerItems, answerText, cleanAnswers, findPo, normalizeQuestions, waitingFor } from './waiting';

// Vazio limpa o prazo, texto de data vira Date e undefined mantém o que está salvo
function toDate(value: unknown) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const date = new Date(value as string);
    if (isNaN(date.getTime())) throw new BadRequestException('Data inválida');
    return date;
}

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
        if (rest.dueDate !== undefined) rest.dueDate = toDate(rest.dueDate);
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
        const tokenBudget = complexity ? budgets[complexity] : Number.isInteger(data.tokenBudget) && data.tokenBudget > 0 ? data.tokenBudget : undefined;
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
                dueDate: dueDate === undefined ? undefined : toDate(dueDate),
                teamId,
                complexity,
                tokenBudget,
                type,
                machineId,
                assignees: assigneeIds ? {
                    set: assigneeIds.map((id: string) => ({ id }))
                } : undefined
            }
        });

        return this.findOne(id, organizationId);
    }

    // A pessoa adiciona item, edita texto, estado e motivo. A spec continua sendo a fonte da verdade: o agente marca conflito se o item a contradiz
    async updateChecklist(id: string, organizationId: string, userId: string, data: any) {
        const task = await this.prisma.task.findFirst({ where: { id, companyId: organizationId }, select: { checklist: true } });
        if (!task) throw new NotFoundException('Task not found');

        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        let checklist: TaskChecklist;
        try {
            checklist = editChecklist(task.checklist as unknown as TaskChecklist | null, data, user?.name || 'Pessoa');
        } catch (error) {
            throw new BadRequestException(error.message);
        }

        await this.prisma.task.update({ where: { id, companyId: organizationId }, data: { checklist: checklist as any } });
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

    // Com pergunta aberta, answers (uma por pergunta) vira o registro das escolhas. Devolve também quem perguntou, para ser retomado
    async addComment(id: string, organizationId: string, userId: string, content: string, answers?: unknown) {
        const found = await this.ensureTaskInOrg(id, organizationId);
        const waiting = found.waitingFor as any;
        const questions = Array.isArray(waiting?.questions) ? waiting.questions : waiting?.question ? [{ question: waiting.question, options: [] }] : [];
        const list = waiting ? cleanAnswers(answers, questions.length) : null;
        const free = content.trim();
        const items = list ? answerItems(questions, list) : waiting && free && questions.length ? answerItems(questions, questions.map((_, index) => (index === 0 ? free : '(ver resposta acima)'))) : null;

        await this.prisma.taskComment.create({
            data: {
                taskId: id,
                userId,
                content: items ? answerHtml(items) : content,
                metadata: items ? { poAnswer: { answeredBy: 'human', items } } : undefined
            }
        });

        // Comentário da pessoa responde a pergunta aberta pelo agente
        await this.prisma.task.update({ where: { id, companyId: organizationId }, data: { waitingFor: Prisma.DbNull } });

        const task = await this.findOne(id, organizationId);
        const askedBy: string | undefined = typeof waiting?.agent === 'string' ? waiting.agent : undefined;
        const askedStage: string | undefined = typeof waiting?.stage === 'string' ? waiting.stage : undefined;
        return { task, askedBy, askedStage, answer: items ? answerText(items) : content };
    }

    // Sinalização da equipe para o Product Owner: segura o Release até alguém responder
    async askPo(id: string, organizationId: string, userId: string, data: any) {
        await this.ensureTaskInOrg(id, organizationId);

        const questions = normalizeQuestions(data);
        const task = await this.prisma.task.findFirst({ where: { id, companyId: organizationId }, select: { project: true, waitingFor: true } });
        if (task.waitingFor) throw new ConflictException('A tarefa já possui uma pergunta pendente de resposta');

        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        const agent = typeof data?.agent === 'string' && data.agent ? data.agent : undefined;
        const targetPoId = await findPo(this.prisma, organizationId, task.project);

        await this.prisma.task.update({
            where: { id, companyId: organizationId },
            data: { waitingFor: waitingFor(questions, { agent, authorId: userId, authorName: user?.name, targetPoId }) },
        });

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
