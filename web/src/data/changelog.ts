export type ChangelogCategory = 'feature' | 'improvement' | 'fix' | 'security';

export type ChangelogItem = {
  category: ChangelogCategory;
  text: string;
};

export type ReleaseNote = {
  version: string;
  title: string;
  date: string;
  summary: string;
  items: ChangelogItem[];
};

export const RELEASES: ReleaseNote[] = [
  {
    version: '1.2.0',
    title: 'Papéis Desacoplados, Seletores Estritos e Skills Recomendadas',
    date: '09/11/2026',
    summary: 'Suporte a subagentes por cargo, eliminação de campos abertos na configuração e catálogo de skills com auditoria de segurança baseada na Cloudflare.',
    items: [
      {
        category: 'feature',
        text: 'Desacoplamento total de papéis: um único harness (como Claude Code) agora pode assumir todos os papéis da esteira usando modelos diferentes por função.',
      },
      {
        category: 'feature',
        text: 'Catálogo de skills recomendadas no widget local, trazendo Auditoria de Segurança (Cloudflare) e Modo Econômico (YAGNI).',
      },
      {
        category: 'feature',
        text: 'Scanner de segurança autoral embutido no client que analisa queries multi-tenant, IDOR, timingSafeEqual e vazamentos em modo somente leitura.',
      },
      {
        category: 'improvement',
        text: 'Seletores estritos no widget e no onboarding da CLI, eliminando digitação manual de modelos para prevenir erros.',
      },
      {
        category: 'security',
        text: 'Verificação ativa de limites de confiança e isolamento multi-tenant contra IDOR e ataques de temporização em webhooks.',
      },
    ],
  },
  {
    version: '1.1.0',
    title: 'Identificação de Ambientes e Isolamento de Workspace',
    date: '09/11/2026',
    summary: 'Suporte completo a múltiplos ambientes com identificação da máquina na esteira, rastro de execução nos cards e proteção contra concorrência.',
    items: [
      {
        category: 'feature',
        text: 'Identificação da máquina conectada diretamente na barra de status global com nome amigável ou hostname.',
      },
      {
        category: 'feature',
        text: 'Rastro de execução em tempo real nos cards de tarefas, exibindo em qual máquina e pasta cada agente está trabalhando.',
      },
      {
        category: 'security',
        text: 'Isolamento estrito de workspace: o runner local ignora tarefas fora do seu escopo sem gerar falsas falhas na esteira.',
      },
      {
        category: 'fix',
        text: 'Restauração do servidor MCP local no OpenCode, preservando ferramentas de criação e atualização de tarefas.',
      },
      {
        category: 'improvement',
        text: 'Telemetria enriquecida com machineName, machineId e workspace em tempo real para toda a organização.',
      },
    ],
  },
  {
    version: '1.0.0',
    title: 'Lançamento Oficial e Código Aberto',
    date: '07/11/2026',
    summary: 'Primeira versão estável sob a licença Business Source License 1.1 (BSL 1.1) com orquestração BYOH de agentes locais.',
    items: [
      {
        category: 'feature',
        text: 'BYOH (Bring Your Own Harness): detecção automática de Claude Code, OpenCode, Antigravity, Gemini e Codex instalados na máquina.',
      },
      {
        category: 'feature',
        text: 'Micro-Router de complexidade em duas camadas: triagem prévia gratuita para economia de tokens e modelos de raciocínio para arquitetura.',
      },
      {
        category: 'feature',
        text: 'Esteira de desenvolvimento com papéis definidos: Especificação, Engenharia, QA, Code Review e DevOps com aprovação humana obrigatória.',
      },
      {
        category: 'improvement',
        text: 'Painel Web completo com quadro Kanban, drawer de tarefas com histórico, anexos locais e chat lateral interativo.',
      },
      {
        category: 'improvement',
        text: 'Widget de segundo plano para desktop com monitoramento contínuo de cotas e travas de segurança de custos.',
      },
    ],
  },
];

export const LATEST_VERSION = RELEASES[0].version;
