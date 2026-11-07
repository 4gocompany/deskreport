// Micro-Router: classifica a tarefa pelo texto antes do despacho, para não gastar modelo frontier em tarefa simples
export const complexities = ['low', 'medium', 'high'];

// Modelo sugerido por agente em cada tier. Agente fora da lista roda no modelo padrão dele
const tiers: Record<string, { profile: string; agent: string; models: Record<string, string> }> = {
  low: { profile: 'free', agent: 'antigravity', models: { claude: 'haiku', gemini: 'gemini-2.5-flash' } },
  medium: { profile: 'eco', agent: 'claude', models: { claude: 'haiku', gemini: 'gemini-2.5-flash' } },
  high: { profile: 'frontier', agent: 'claude', models: {} },
};

const highPattern = /arquitet|seguranca|multi-?tenant|\bauth|autentica|autoriza|concorrencia|performance critica|refatoracao critica|regra de negocio critica/;
const mediumPattern = /crud|migration|migrac|prisma|endpoint|controller|componente|\btela\b|modal|\bcard\b|pagina|interface|fluxo|integrac|websocket|\bsocket\b|\bapi\b|schema|service|\brota\b|feature|funcionalidade/;

export function classifyTask(task: { title?: string | null; description?: string | null; tags?: unknown }) {
  const text = taskText(task);
  if (highPattern.test(text)) return { complexity: 'high', reason: 'Envolve arquitetura, segurança ou regra de negócio crítica' };
  if (mediumPattern.test(text)) return { complexity: 'medium', reason: 'Envolve interface, API, fluxo ou implementação de funcionalidade' };
  return { complexity: 'low', reason: 'Documentação, ajuste pontual ou tarefa simples' };
}

function taskText(task: { title?: string | null; description?: string | null; tags?: unknown }) {
  const tags = Array.isArray(task.tags) ? task.tags.join(' ') : '';
  return [task.title, task.description, tags]
    .join(' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// Perfil e modelo indicados para o tier. Com agent, o modelo é o desse agente
export function routing(complexity: string, agent?: string) {
  const tier = tiers[complexity] || tiers.low;
  const suggestedAgent = agent || tier.agent;
  return { profile: tier.profile, suggestedAgent, suggestedModel: tier.models[suggestedAgent] || '' };
}

const criticalPattern = /multi-?tenant|seguranc|\bauth|permiss|crypto|cripto|token|secret|faturam|pagamento/;
const structuralPattern = /migration|migrac|prisma|schema|banco|endpoint|controller|service|modal|\bcard\b|componente|\btela\b|interface|\bapi\b/;

// Guarda defensiva: modelo barato não rebaixa tarefa de banco, interface ou segurança
export function applySanityCheck(complexity: string, task: { title?: string | null; description?: string | null; tags?: unknown }) {
  const text = taskText(task);
  if (complexity !== 'high' && criticalPattern.test(text)) {
    return { complexity: 'high', reason: 'Promovido para high por conter termos de arquitetura ou segurança' };
  }
  if (complexity === 'low' && structuralPattern.test(text)) {
    return { complexity: 'medium', reason: 'Promovido para medium por envolver código de interface, banco ou API' };
  }
  return { complexity };
}

export function jevKey() {
  return process.env.JEV_API_KEY || process.env.OPENROUTER_API_KEY || '';
}

// Camada 1: Jev pela rota de decisões do OpenRouter. Só triagem, nada de código é executado
export async function classifyWithJev(task: { title?: string | null; description?: string | null; tags?: unknown }) {
  const response = await fetch('https://openrouter.ai/api/alpha/decisions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jevKey()}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      model: '~typesafe/jev-latest',
      state: { title: task.title || '', description: task.description || '', tags: Array.isArray(task.tags) ? task.tags : [] },
      questions: {
        complexity: {
          type: 'choice',
          instructions: 'Classifique a complexidade técnica desta tarefa de software',
          criteria: {
            low: 'Documentação, typos, ajustes cosméticos de texto ou tarefas triviais sem lógica',
            medium: 'Interfaces, modais, componentes React, CRUDs, migrations de banco, endpoints e rotas',
            high: 'Arquitetura, segurança multi-tenant, concorrência, autenticação ou refatorações críticas',
          },
        },
      },
    }),
  });
  if (!response.ok) throw new Error(`Jev respondeu ${response.status}`);

  const data = await response.json();
  const answer = data?.answers?.complexity || data?.decisions?.complexity || data?.complexity || data;
  const choice = answer?.choice || answer?.value;
  if (!complexities.includes(choice)) throw new Error('Jev sem escolha válida');

  // Pouca confiança sobe um tier por segurança
  const confidence = Number(answer?.confidence ?? answer?.score ?? 1);
  const complexity = confidence < 0.65 ? complexities[Math.min(complexities.indexOf(choice) + 1, 2)] : choice;
  return { complexity, reason: `Jev classificou como ${choice} com confiança ${confidence}` };
}

// Com chave usa o Jev. Sem chave ou com falha fica a regra por texto. A guarda vale nos dois casos
export async function triageTask(task: { title?: string | null; description?: string | null; tags?: unknown }) {
  let result = classifyTask(task);
  if (jevKey()) result = await classifyWithJev(task).catch(() => result);
  const checked = applySanityCheck(result.complexity, task);
  return { complexity: checked.complexity, reason: checked.reason || result.reason };
}
