import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type WaitingOption = { label: string; description?: string };
export type WaitingQuestion = { header?: string; question: string; options: WaitingOption[]; multiSelect?: boolean };
export type AnswerItem = { header?: string; question: string; answer: string };

export function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function option(raw: any): WaitingOption {
  const label = clean(typeof raw === 'string' ? raw : raw?.label, 100);
  if (!label) throw new BadRequestException('Cada opção precisa de label');
  const description = typeof raw === 'string' ? '' : clean(raw?.description, 240);
  return description ? { label, description } : { label };
}

function question(raw: any): WaitingQuestion {
  const text = clean(raw?.question, 2000);
  if (!text) throw new BadRequestException('Informe question');

  const list = Array.isArray(raw?.options) ? raw.options : [];
  const structured = list.some((item: unknown) => typeof item === 'object' && item !== null);
  if (structured && ![0, 2, 3, 4].includes(list.length)) throw new BadRequestException('Use de 2 a 4 opções por pergunta');
  if (!structured && list.length > 8) throw new BadRequestException('Use no máximo 8 opções por pergunta');

  const header = clean(raw?.header, 40);
  const options = list.filter((item: unknown) => typeof item !== 'string' || item.trim()).map(option);
  return { header: header || undefined, question: text, options, multiSelect: Boolean(raw?.multiSelect) };
}

// Aceita o lote novo ({ questions }) e o formato antigo ({ question, options, multiSelect })
export function normalizeQuestions(data: any): WaitingQuestion[] {
  const raw = Array.isArray(data?.questions) ? data.questions : [data];
  if (raw.length < 1 || raw.length > 4) throw new BadRequestException('Envie de 1 a 4 perguntas');
  return raw.map(question);
}

export function waitingFor(questions: WaitingQuestion[], extra: Record<string, unknown>) {
  const first = questions[0];
  return {
    ...extra,
    escalatedToHuman: false,
    questions,
    question: first.question,
    options: first.options.map((item) => item.label),
    multiSelect: first.multiSelect,
    createdAt: new Date().toISOString(),
  };
}

export function answerItems(questions: WaitingQuestion[], answers: string[]): AnswerItem[] {
  return questions.map((item, index) => ({ header: item.header, question: item.question, answer: answers[index] }));
}

export function answerHtml(items: AnswerItem[], source?: string) {
  const body = items
    .map((item) => `<p><strong>${escapeHtml(item.header ? `${item.header}: ${item.question}` : item.question)}</strong><br>${escapeHtml(item.answer).replace(/\n/g, '<br>')}</p>`)
    .join('');
  return source ? `${body}<p>Fonte: ${escapeHtml(source)}</p>` : body;
}

export function answerText(items: AnswerItem[]) {
  return items.map((item) => `${item.question}\n${item.answer}`).join('\n\n');
}

// Product Owner do projeto da tarefa. Sem um no projeto, vale o primeiro agente com cargo de produto da organização
export async function findPo(prisma: PrismaService, organizationId: string, project: string) {
  const found = await prisma.project.findFirst({
    where: { organizationId, OR: [{ id: project }, { name: { equals: project, mode: 'insensitive' } }] },
    select: { productOwnerId: true },
  });
  if (found?.productOwnerId) return found.productOwnerId;

  const machines = await prisma.agentMachine.findMany({ where: { organizationId }, select: { agentRoles: true } });
  const members = await prisma.member.findMany({ where: { organizationId, userId: { startsWith: 'agent-user-' } }, select: { userId: true } });
  const agentId = members.map((member) => member.userId).find((userId) => machines.some((machine) => (machine.agentRoles as any)?.[userId.replace('agent-user-', '')]?.includes('product')));
  return agentId || null;
}

// Respostas da pessoa, uma por pergunta, cada uma com até 2000 caracteres
export function cleanAnswers(raw: unknown, total: number) {
  if (!Array.isArray(raw) || raw.length !== total) return null;
  const answers = raw.map((item) => clean(item, 2000));
  return answers.every(Boolean) ? answers : null;
}
