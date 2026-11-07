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
  const tags = Array.isArray(task.tags) ? task.tags.join(' ') : '';
  const text = [task.title, task.description, tags]
    .join(' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

  if (highPattern.test(text)) return { complexity: 'high', reason: 'Envolve arquitetura, segurança ou regra de negócio crítica' };
  if (mediumPattern.test(text)) return { complexity: 'medium', reason: 'Envolve interface, API, fluxo ou implementação de funcionalidade' };
  return { complexity: 'low', reason: 'Documentação, ajuste pontual ou tarefa simples' };
}

// Perfil e modelo indicados para o tier. Com agent, o modelo é o desse agente
export function routing(complexity: string, agent?: string) {
  const tier = tiers[complexity] || tiers.low;
  const suggestedAgent = agent || tier.agent;
  return { profile: tier.profile, suggestedAgent, suggestedModel: tier.models[suggestedAgent] || '' };
}
