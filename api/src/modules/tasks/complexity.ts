// Micro-Router: classifica a tarefa pela spec pronta, para não gastar modelo frontier em tarefa simples
export const complexities = ['low', 'medium', 'high'];
export const layers = ['banco', 'api', 'web', 'runner', 'infra', 'docs'];

// Orçamento de tokens da esteira automática por tier. Tarefa pending fica no padrão do banco, que cobre a etapa de spec
export const budgets: Record<string, number> = {
  low: 50000,
  medium: 150000,
  high: 400000,
};

// Modelo sugerido por agente em cada tier. Agente fora da lista roda no modelo padrão dele
const tiers: Record<string, { profile: string; agent: string; models: Record<string, string> }> = {
  low: {
    profile: 'free',
    agent: 'antigravity',
    models: { claude: 'haiku', gemini: 'gemini-2.5-flash' },
  },
  medium: {
    profile: 'eco',
    agent: 'claude',
    models: { claude: 'haiku', gemini: 'gemini-2.5-flash' },
  },
  high: { profile: 'frontier', agent: 'claude', models: {} },
};

type Facts = {
  layers?: unknown;
  migration?: unknown;
  security?: unknown;
  files?: unknown;
};

// Tier pelos fatos que o classificador leu na spec, e não por palavras soltas no texto
export function tierFromFacts(facts: Facts) {
  const list = Array.isArray(facts.layers) ? facts.layers : [];
  const touched = layers.filter((layer) => list.includes(layer)).length;
  const files = Number(facts.files) || 0;
  if (facts.security === true || touched >= 4 || files >= 15) return 'high';
  if (facts.migration === true || touched >= 2 || files >= 4) return 'medium';
  return 'low';
}

// O maior entre o tier do modelo (um acima quando a confiança é baixa) e o tier dos fatos
export function finalTier(choice: string, confidence: number, facts: Facts) {
  let level = Math.max(complexities.indexOf(choice), 0);
  if (confidence < 0.65) level = Math.min(level + 1, 2);
  return complexities[Math.max(level, complexities.indexOf(tierFromFacts(facts)))];
}

// Perfil e modelo indicados para o tier. Com agent, o modelo é o desse agente
export function routing(complexity: string, agent?: string) {
  const tier = tiers[complexity];
  // Tarefa ainda sem spec classificada roda no modelo padrão do agente
  if (!tier) return { profile: '', suggestedAgent: agent || '', suggestedModel: '' };
  const suggestedAgent = agent || tier.agent;
  return {
    profile: tier.profile,
    suggestedAgent,
    suggestedModel: tier.models[suggestedAgent] || '',
  };
}

export function jevKey() {
  return process.env.JEV_API_KEY || process.env.OPENROUTER_API_KEY || '';
}

// Opcional: Jev pela rota de decisões do OpenRouter. Só triagem, nada de código é executado
export async function classifyWithJev(task: { title?: string | null; description?: string | null; tags?: unknown }) {
  const response = await fetch('https://openrouter.ai/api/alpha/decisions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jevKey()}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      model: '~typesafe/jev-latest',
      state: {
        title: task.title || '',
        description: task.description || '',
        tags: Array.isArray(task.tags) ? task.tags : [],
      },
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

  const confidence = Number(answer?.confidence ?? answer?.score ?? 1);
  return {
    complexity: finalTier(choice, confidence, {}),
    reason: `Jev classificou como ${choice} com confiança ${confidence}`,
  };
}
