export type ChecklistRole = 'engineering' | 'review' | 'qa' | 'devops';
export type ChecklistItemStatus =
  | 'pending'
  | 'done'
  | 'not_done'
  | 'na'
  | 'conflict';

export type ChecklistItem = {
  id: string;
  role: ChecklistRole;
  text: string;
  status: ChecklistItemStatus;
  // Obrigatório em not_done e conflict (trecho da spec). Também guarda o motivo de reabertura pela revisão
  reason?: string;
  updatedBy?: string;
  updatedAt?: string;
};

export type ExtraDelivery = {
  id: string;
  role: ChecklistRole;
  agent: string;
  text: string;
  reason: string;
  createdAt: string;
};

export type TaskChecklist = {
  items: ChecklistItem[];
  extraDeliveries: ExtraDelivery[];
  haltedReason?: string | null;
  updatedAt: string;
};

export const checklistRoles: ChecklistRole[] = [
  'engineering',
  'review',
  'qa',
  'devops',
];
export const checklistStatuses: ChecklistItemStatus[] = [
  'pending',
  'done',
  'not_done',
  'na',
  'conflict',
];
const stageStatuses: ChecklistItemStatus[] = [
  'done',
  'not_done',
  'na',
  'conflict',
];
const prefixes: Record<ChecklistRole, string> = {
  engineering: 'eng',
  review: 'rev',
  qa: 'qa',
  devops: 'dev',
};
const MAX_ITEMS = 100;
const MAX_EXTRA = 50;

export type NextStep =
  | 'implement'
  | 'review'
  | 'qa'
  | 'devops'
  | 'devops-commit'
  | 'rework'
  | 'release'
  | 'human'
  | 'halt';

function clip(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function isRole(value: unknown): value is ChecklistRole {
  return checklistRoles.includes(value as ChecklistRole);
}

function newId(items: ChecklistItem[], role: ChecklistRole) {
  const numbers = items
    .filter((item) => item.role === role)
    .map((item) => Number(item.id.split('-')[1]) || 0);
  return `${prefixes[role]}-${Math.max(0, ...numbers) + 1}`;
}

function addItem(items: ChecklistItem[], role: ChecklistRole, text: string) {
  items.push({ id: newId(items, role), role, text, status: 'pending' });
}

export function emptyChecklist(): TaskChecklist {
  return {
    items: [],
    extraDeliveries: [],
    haltedReason: null,
    updatedAt: new Date().toISOString(),
  };
}

export function haltedChecklist(
  current: TaskChecklist | null,
  haltedReason: string,
): TaskChecklist {
  return {
    ...(current || emptyChecklist()),
    haltedReason,
    updatedAt: new Date().toISOString(),
  };
}

const defaults: Record<string, Record<ChecklistRole | string, string[]>> = {
  bugfix: {
    engineering: [
      'Reproduzir ou localizar a causa raiz do bug e corrigir com a menor alteração possível',
      'Rodar build/testes do projeto e commitar os arquivos da tarefa',
    ],
    review: [
      'Validar se a correção resolve a causa raiz sem efeitos colaterais ou quebra de padrão',
      'Auditar isolamento multi-tenant, segurança e ausência de alterações fora do escopo',
    ],
    qa: ['Validar o fluxo corrigido e confirmar que o bug não ocorre mais'],
  },
  security: {
    engineering: [
      'Corrigir a vulnerabilidade garantindo amarração ao tenant (companyId/organizationId) e proteção de segredos',
      'Validar build/testes e commitar',
    ],
    review: [
      'Auditar isolamento multi-tenant, validação nas bordas e ausência de vazamento de segredos no diff',
    ],
    qa: [
      'Testar o bloqueio de acesso indevido e o funcionamento normal para o tenant autorizado',
    ],
  },
  refactor: {
    engineering: [
      'Aplicar a refatoração mantendo o comportamento e contratos de API idênticos',
      'Rodar build e testes antes e depois e commitar',
    ],
    review: [
      'Confirmar que contratos, regras de negócio e segurança permanecem intactos e o código ficou mais simples',
    ],
    qa: ['Validar que o fluxo refatorado continua funcionando sem regressão'],
  },
  documentation: {
    engineering: [
      'Atualizar a documentação conferindo rotas, exemplos e flags no código atual e commitar',
    ],
    review: ['Conferir precisão técnica, clareza e ausência de travessões'],
    qa: ['Revisar a renderização e links da documentação atualizada'],
  },
  feature: {
    engineering: [
      'Implementar os requisitos descritos na tarefa seguindo o padrão do projeto',
      'Rodar build/testes e commitar os arquivos da tarefa',
    ],
    review: [
      'Revisar aderência à descrição, simplicidade, padrão do projeto e isolamento multi-tenant',
      'Conferir bloco Além da spec e diff completo',
    ],
    qa: ['Testar o fluxo principal e estados de erro da entrega'],
  },
};
defaults.hotfix = defaults.bugfix;

// Checklist das tarefas que vão direto para a Engenharia, sem etapa de spec
export function defaultChecklist(type: string): TaskChecklist {
  const byRole = defaults[type] || defaults.feature;
  const checklist = emptyChecklist();
  for (const role of ['engineering', 'review', 'qa'] as ChecklistRole[]) {
    for (const text of byRole[role]) addItem(checklist.items, role, text);
  }
  return checklist;
}

// Checklist vindo da etapa de spec: lista de { role, text }. Sem itens de engineering, review e qa não vale
export function specChecklist(raw: unknown): TaskChecklist | null {
  if (!Array.isArray(raw)) return null;

  const checklist = emptyChecklist();
  for (const item of raw.slice(0, MAX_ITEMS)) {
    const text = clip(item?.text);
    if (text && isRole(item?.role)) addItem(checklist.items, item.role, text);
  }
  const complete = ['engineering', 'review', 'qa'].every((role) =>
    checklist.items.some((item) => item.role === role),
  );
  return complete ? checklist : null;
}

// Cargo do checklist que a etapa executa. Commit do DevOps chega como implement com commit
export function stageRole(data: any): ChecklistRole | null {
  if (data?.stage === 'review') return 'review';
  if (data?.stage === 'qa') return 'qa';
  if (
    data?.stage === 'devops' ||
    (data?.stage === 'implement' && data?.commit === true)
  )
    return 'devops';
  if (data?.stage === 'implement') return 'engineering';
  return null;
}

export function resolved(item: ChecklistItem) {
  return (
    item.status === 'done' || item.status === 'na' || item.status === 'conflict'
  );
}

function roleItems(checklist: TaskChecklist, role: ChecklistRole) {
  return checklist.items.filter((item) => item.role === role);
}

// Aplica o que o agente marcou na etapa. Devolve o checklist novo e, quando a esteira deve parar, o motivo
export function applyStage(
  checklist: TaskChecklist,
  role: ChecklistRole,
  data: any,
  agent: string,
) {
  const now = new Date().toISOString();
  const items = checklist.items.map((item) => ({ ...item }));
  const updates = Array.isArray(data?.checklistUpdates)
    ? data.checklistUpdates
    : [];

  for (const update of updates) {
    const item = items.find(
      (found) => found.id === update?.id && found.role === role,
    );
    if (!item || !stageStatuses.includes(update?.status)) continue;
    item.status = update.status;
    item.reason = clip(update.reason) || undefined;
    item.updatedBy = agent;
    item.updatedAt = now;
  }

  if (role === 'review' || role === 'qa') {
    const reopen = Array.isArray(data?.reopenItems) ? data.reopenItems : [];
    for (const entry of reopen) {
      const item = items.find(
        (found) => found.id === entry?.id && found.role === 'engineering',
      );
      if (!item) continue;
      item.status = 'pending';
      item.reason = clip(entry.reason) || 'Reaberto pela revisão';
      item.updatedBy = agent;
      item.updatedAt = now;
    }
    const added = Array.isArray(data?.newItems) ? data.newItems : [];
    for (const entry of added) {
      const text = clip(entry?.text);
      if (text && items.length < MAX_ITEMS) addItem(items, 'engineering', text);
    }
  }

  const extraDeliveries = [...checklist.extraDeliveries];
  const extras = Array.isArray(data?.extraDeliveries)
    ? data.extraDeliveries
    : [];
  for (const entry of extras) {
    const text = clip(entry?.text);
    const reason = clip(entry?.reason);
    if (!text || !reason || extraDeliveries.length >= MAX_EXTRA) continue;
    extraDeliveries.push({
      id: `extra-${extraDeliveries.length + 1}`,
      role,
      agent,
      text,
      reason,
      createdAt: now,
    });
  }

  const next: TaskChecklist = {
    items,
    extraDeliveries,
    haltedReason: null,
    updatedAt: now,
  };
  const own = roleItems(next, role);
  let haltedReason = '';
  if (own.length > 0) {
    const unmarked = own.some((item) => item.status === 'pending');
    const noReason = own.some(
      (item) =>
        (item.status === 'not_done' || item.status === 'conflict') &&
        !item.reason,
    );
    if (unmarked || noReason)
      haltedReason =
        'Etapa encerrada com item do checklist sem marcar ou sem motivo.';
    else if (
      role === 'engineering' &&
      (own.some((item) => item.status === 'not_done') ||
        !own.some((item) => item.status === 'done'))
    ) {
      haltedReason = 'Implementação encerrada com item não feito no checklist.';
    }
  }
  if (haltedReason) next.haltedReason = haltedReason;
  return { checklist: next, haltedReason };
}

export function reopenRoles(
  checklist: TaskChecklist,
  roles: ChecklistRole[],
): TaskChecklist {
  const items = checklist.items.map((item) =>
    roles.includes(item.role) ? { ...item, status: 'pending' as const } : item,
  );
  return { ...checklist, items, updatedAt: new Date().toISOString() };
}

// Próxima etapa decidida só pelo estado do checklist. Disponibilidade de agente fica com quem despacha
export function nextStep(
  checklist: TaskChecklist,
  stage: string,
  qaWithoutEnvironment = false,
): NextStep {
  if (checklist.haltedReason) return 'halt';

  const has = (role: ChecklistRole) => roleItems(checklist, role).length > 0;
  const allResolved = (role: ChecklistRole) =>
    roleItems(checklist, role).every(resolved);
  const engineeringOpen = roleItems(checklist, 'engineering').some(
    (item) => item.status === 'pending',
  );
  const failed = (role: ChecklistRole) =>
    roleItems(checklist, role).some((item) => item.status === 'not_done');

  if (stage === 'spec') return engineeringOpen ? 'implement' : 'halt';
  if (stage === 'implement')
    return allResolved('engineering') ? 'review' : 'halt';
  if (stage === 'review') {
    if (engineeringOpen || failed('review')) return 'rework';
    if (!allResolved('review')) return 'halt';
    if (has('qa')) return 'qa';
    return has('devops') && !allResolved('devops') ? 'devops' : 'release';
  }
  if (stage === 'qa') {
    if (engineeringOpen || failed('qa')) return 'rework';
    if (!allResolved('qa')) return 'halt';
    if (qaWithoutEnvironment) return 'human';
    return 'devops-commit';
  }
  if (stage === 'devops') return allResolved('devops') ? 'release' : 'halt';
  return 'halt';
}

// Edição pela pessoa no painel: adiciona item, altera texto, estado e motivo. Limpa a parada quando nada mais está pendente
export function editChecklist(
  current: TaskChecklist | null,
  data: any,
  userName: string,
): TaskChecklist {
  const checklist = current || emptyChecklist();
  const items = checklist.items.map((item) => ({ ...item }));
  const now = new Date().toISOString();

  if (data?.addItem) {
    const text = clip(data.addItem.text);
    if (!isRole(data.addItem.role) || !text)
      throw new Error('addItem precisa de role e text');
    if (items.length >= MAX_ITEMS)
      throw new Error('Limite de itens do checklist atingido');
    addItem(items, data.addItem.role, text);
    const added = items[items.length - 1];
    added.updatedBy = userName;
    added.updatedAt = now;
  }

  if (data?.updateItem) {
    const item = items.find((found) => found.id === data.updateItem.id);
    if (!item) throw new Error('Item não encontrado');
    const { text, status, reason } = data.updateItem;
    if (text !== undefined) {
      if (!clip(text)) throw new Error('text não pode ser vazio');
      item.text = clip(text);
    }
    if (status !== undefined) {
      if (!checklistStatuses.includes(status))
        throw new Error('status inválido');
      item.status = status;
    }
    if (reason !== undefined) item.reason = clip(reason) || undefined;
    if (
      (item.status === 'not_done' || item.status === 'conflict') &&
      !item.reason
    )
      throw new Error('Informe o motivo para not_done ou conflict');
    item.updatedBy = userName;
    item.updatedAt = now;
  }

  const stalled = items.some((item) => item.status === 'pending');
  const keepHalt = checklist.haltedReason && (stalled || items.length === 0);
  return {
    ...checklist,
    items,
    haltedReason: keepHalt ? checklist.haltedReason : null,
    updatedAt: now,
  };
}
