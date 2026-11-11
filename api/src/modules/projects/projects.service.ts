import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { checkProjectPath } from '../agents/agents.service';

export interface CreateProjectDto {
    name: string;
    description?: string;
    folder?: string;
    defaultMachineId?: string | null;
    // Pasta escolhida no seletor: a API confere com as pastas que a máquina enviou
    location?: { machineId: string; folder: string; path: string };
    startDate?: string | Date;
    endDate?: string | Date;
    status?: string;
    autoCommitAfterQa?: boolean;
    teamIds?: string[];
}

export interface EnvironmentDto {
    name: string;
    kind: string;
    url: string;
    healthUrl?: string;
    startCommand?: string;
    qaEnabled?: boolean;
    machineId?: string | null;
}

const projectInclude = {
    teams: { include: { team: true } },
    environments: { orderBy: { createdAt: 'asc' as const } },
    locations: { include: { machine: { select: { id: true, name: true, lastSeenAt: true } } } },
};

const environmentKinds = ['local', 'staging', 'production'];
const loopbackHosts = ['localhost', '127.0.0.1', '[::1]'];

function checkUrl(value: unknown, label: string) {
    try {
        const url = new URL(String(value));
        if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString();
    } catch {}
    throw new BadRequestException(`${label} inválida`);
}

@Injectable()
export class ProjectsService {
    constructor(private prisma: PrismaService) { }

    // Máquina sempre da organização: nunca grava vínculo com máquina de outra empresa
    private async checkMachine(organizationId: string, machineId: unknown) {
        const machine = typeof machineId === 'string' ? await this.prisma.agentMachine.findFirst({ where: { id: machineId, organizationId }, select: { id: true } }) : null;
        if (!machine) throw new BadRequestException('Máquina não encontrada');
    }

    // Só vale pasta que a máquina enviou. O remote vem dela, nunca do painel
    private async findMachineFolder(organizationId: string, location: CreateProjectDto['location']) {
        const machine = await this.prisma.agentMachine.findFirst({ where: { id: String(location?.machineId), organizationId }, select: { folders: true } });
        const folders = Array.isArray(machine?.folders) ? (machine.folders as { name: string; path: string; remote: string | null }[]) : [];
        const found = folders.find((item) => item.name === location.folder && item.path === location.path);
        if (!found) throw new BadRequestException('Pasta não encontrada na máquina');
        return found;
    }

    async create(organizationId: string, dto: CreateProjectDto) {
        const { name, description, folder, startDate, endDate, status, autoCommitAfterQa, teamIds, location } = dto;
        let { defaultMachineId } = dto;
        checkProjectPath(folder);
        if (defaultMachineId) await this.checkMachine(organizationId, defaultMachineId);

        const found = location ? await this.findMachineFolder(organizationId, location) : null;
        if (found) defaultMachineId = defaultMachineId || location.machineId;

        return this.prisma.project.create({
            data: {
                organizationId,
                name,
                description,
                folder: found?.name || folder,
                remote: found?.remote,
                defaultMachineId,
                startDate,
                endDate,
                status,
                autoCommitAfterQa,
                locations: found ? { create: { machineId: location.machineId, folder: found.name, path: found.path, remote: found.remote } } : undefined,
                teams: teamIds ? {
                    create: teamIds.map(teamId => ({ teamId }))
                } : undefined
            },
            include: projectInclude,
        });
    }

    async findAll(organizationId: string) {
        const projects = await this.prisma.project.findMany({
            where: { organizationId },
            include: projectInclude,
            orderBy: { createdAt: 'desc' },
        });

        const tasksStats = await this.prisma.task.groupBy({
            by: ['project', 'status'],
            where: { companyId: organizationId },
            _count: { id: true },
        });

        return projects.map((project) => {
            const projectTasks = tasksStats.filter((t) => t.project === project.id);
            const totalTasks = projectTasks.reduce((acc, curr) => acc + curr._count.id, 0);
            const completedTasks = projectTasks
                .filter((t) => t.status === 'done' || t.status === 'completed')
                .reduce((acc, curr) => acc + curr._count.id, 0);

            const completionPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

            return {
                ...project,
                total_tasks: totalTasks,
                completed_tasks: completedTasks,
                completion_percentage: completionPercentage,
            };
        });
    }

    async findOne(id: string, organizationId: string) {
        return this.prisma.project.findFirst({
            where: { id, organizationId },
            include: projectInclude,
        });
    }

    async saveEnvironments(id: string, organizationId: string, list: EnvironmentDto[]) {
        const project = await this.findOne(id, organizationId);
        if (!project) {
            throw new NotFoundException('Project not found');
        }
        if (!Array.isArray(list) || list.length > 10) {
            throw new BadRequestException('Envie até 10 ambientes');
        }

        for (const item of list) {
            if (item?.kind === 'local' && item.machineId) await this.checkMachine(organizationId, item.machineId);
        }

        const data = list.map((item) => {
            const name = String(item?.name || '').trim();
            if (!name || !environmentKinds.includes(item.kind)) {
                throw new BadRequestException('Ambiente precisa de nome e tipo (local, staging ou production)');
            }
            const local = item.kind === 'local';
            // Só o nome de um script do package.json: o painel nunca manda um comando para rodar nas máquinas
            const startCommand = local ? String(item.startCommand || '').trim() : '';
            if (startCommand && !/^[\w:.-]{1,60}$/.test(startCommand)) {
                throw new BadRequestException('Informe só o nome de um script do package.json');
            }
            const url = checkUrl(item.url, 'URL');
            const healthUrl = item.healthUrl ? checkUrl(item.healthUrl, 'URL de checagem') : null;
            if (local && ![url, healthUrl].every((value) => !value || loopbackHosts.includes(new URL(value).hostname))) {
                throw new BadRequestException('Ambiente local usa só localhost ou 127.0.0.1');
            }
            return {
                projectId: id,
                name,
                kind: item.kind,
                url,
                healthUrl,
                startCommand: startCommand || null,
                qaEnabled: item.qaEnabled === true,
                // Ambiente local sem máquina escolhida fica na máquina padrão do projeto
                machineId: local ? item.machineId || project.defaultMachineId : null,
            };
        });

        await this.prisma.$transaction([
            this.prisma.projectEnvironment.deleteMany({ where: { projectId: id } }),
            this.prisma.projectEnvironment.createMany({ data }),
        ]);
        return this.findOne(id, organizationId);
    }

    async update(id: string, organizationId: string, data: Partial<CreateProjectDto>) {
        const project = await this.findOne(id, organizationId);
        if (!project) {
            throw new NotFoundException('Project not found');
        }

        const { name, description, startDate, endDate, status, autoCommitAfterQa, teamIds, location } = data;
        let { folder, defaultMachineId } = data;
        checkProjectPath(folder);
        if (defaultMachineId) await this.checkMachine(organizationId, defaultMachineId);

        const found = location ? await this.findMachineFolder(organizationId, location) : null;
        if (found) {
            folder = found.name;
            defaultMachineId = defaultMachineId || project.defaultMachineId || location.machineId;
        }

        if (teamIds) {
            // Reset teams
            await this.prisma.projectTeam.deleteMany({
                where: { projectId: id }
            });

            // Add new teams
            if (teamIds.length > 0) {
                await this.prisma.projectTeam.createMany({
                    data: teamIds.map(teamId => ({
                        projectId: id,
                        teamId
                    }))
                });
            }
        }

        await this.prisma.project.update({
            where: { id },
            data: { name, description, folder, remote: found ? found.remote : undefined, defaultMachineId, startDate, endDate, status, autoCommitAfterQa },
        });

        if (found) {
            const place = { folder: found.name, path: found.path, remote: found.remote };
            await this.prisma.projectLocation.upsert({
                where: { projectId_machineId: { projectId: id, machineId: location.machineId } },
                create: { projectId: id, machineId: location.machineId, ...place },
                update: place,
            });
        }

        return this.findOne(id, organizationId);
    }

    async remove(id: string, organizationId: string) {
        return this.prisma.project.deleteMany({
            where: { id, organizationId },
        });
    }
}
