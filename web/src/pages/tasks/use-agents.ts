import { useEffect } from 'react';
import { create } from 'zustand';
import { io } from 'socket.io-client';
import { apiBase } from '../../api/fetcher';
import { TaskCardProps } from './tasks-data';
import { useTaskStore } from './use-task-store';

export type AgentStatus = {
  agent: string;
  state: 'working' | 'idle' | 'paused';
  // Alerta de cota. warn só avisa, stop espera autorização humana e block só sai trocando o modelo
  alert?: string;
  quotaLevel?: 'warn' | 'stop' | 'block';
  project?: string;
  action?: string;
  tool?: string;
  file?: string;
  taskId?: string;
  // Tokens gastos na execução atual (só o Claude Code informa)
  tokens?: number;
  updatedAt: string;
};

export const AGENT_LABELS: Record<string, string> = {
  antigravity: 'Antigravity',
  claude: 'Claude Code',
  opencode: 'OpenCode',
  codex: 'Codex',
  gemini: 'Gemini CLI',
  aider: 'Aider',
};

export type AgentProfile = { agent: string; name: string; role: string; initials: string; color: string };

// Todos os agentes suportados, na mesma ordem e cores do backend
export const AGENT_TEAM: AgentProfile[] = [
  { agent: 'antigravity', name: 'Antigravity', role: 'Spec & Review', initials: 'AG', color: 'bg-green-600' },
  { agent: 'claude', name: 'Claude Code', role: 'Dev', initials: 'CC', color: 'bg-orange-600' },
  { agent: 'opencode', name: 'OpenCode', role: 'QA', initials: 'OC', color: 'bg-blue-600' },
  { agent: 'codex', name: 'Codex', role: 'Dev', initials: 'CX', color: 'bg-teal-600' },
  { agent: 'gemini', name: 'Gemini CLI', role: 'Dev', initials: 'GM', color: 'bg-indigo-600' },
  { agent: 'aider', name: 'Aider', role: 'Dev', initials: 'AD', color: 'bg-yellow-600' },
];

// Perfil de um agente habilitado, com um padrão para agentes ainda sem perfil no painel
export function agentProfile(agent: string): AgentProfile {
  const profile = AGENT_TEAM.find((a) => a.agent === agent);
  if (profile) return profile;
  return { agent, name: agent, role: 'Agente', initials: agent.slice(0, 2).toUpperCase(), color: 'bg-zinc-600' };
}

export type AgentChatMessage = {
  id: string;
  sessionId?: string | null;
  agent: string;
  userId: string;
  targetAgent?: string | null;
  taskId?: string | null;
  content: string;
  createdAt: string;
  user?: { id: string; name: string; image?: string | null };
};

// Sessão do Chat Lateral com um agente. Nova sessão começa com o contexto limpo
export type AgentChatSession = {
  id: string;
  agent: string;
  title: string;
  projectPath?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type AgentsStore = {
  agents: AgentStatus[];
  taskLogs: Record<string, AgentStatus[]>;
  // Saída do terminal de cada tarefa, para o modal do terminal ao vivo
  taskOutputs: Record<string, string>;
  setTaskOutput: (taskId: string, text: string) => void;
  appendTaskOutput: (output: { taskId: string; text: string }) => void;
  chatMessages: Record<string, AgentChatMessage[]>;
  teamMessages: AgentChatMessage[];
  setTeamMessages: (messages: AgentChatMessage[]) => void;
  addTeamMessage: (message: AgentChatMessage) => void;
  setAgents: (agents: AgentStatus[]) => void;
  setTaskLogs: (taskLogs: Record<string, AgentStatus[]>) => void;
  setAgent: (status: AgentStatus) => void;
  // Mensagens do Chat Lateral separadas por sessão
  setChatHistory: (sessionId: string, messages: AgentChatMessage[]) => void;
  addChatMessage: (message: AgentChatMessage) => void;
};

export const useAgentsStore = create<AgentsStore>((set) => ({
  // Preenchido pelo socket com os agentes habilitados na máquina do usuário
  agents: [],
  taskLogs: {},
  taskOutputs: {},
  setTaskOutput: (taskId, text) => set((state) => ({ taskOutputs: { ...state.taskOutputs, [taskId]: text } })),
  appendTaskOutput: ({ taskId, text }) =>
    set((state) => ({
      taskOutputs: { ...state.taskOutputs, [taskId]: ((state.taskOutputs[taskId] || '') + text).slice(-50000) },
    })),
  chatMessages: {},
  teamMessages: [],
  setTeamMessages: (teamMessages) => set({ teamMessages }),
  addTeamMessage: (message) =>
    set((state) => {
      if (state.teamMessages.some((m) => m.id === message.id)) return state;
      return { teamMessages: [...state.teamMessages, message] };
    }),
  setAgents: (agents) => set({ agents }),
  setTaskLogs: (taskLogs) => set({ taskLogs }),
  // Mantém as mensagens que chegaram enquanto o histórico carregava
  setChatHistory: (sessionId, messages) =>
    set((state) => {
      const pending = (state.chatMessages[sessionId] || []).filter((m) => !messages.some((loaded) => loaded.id === m.id));
      return { chatMessages: { ...state.chatMessages, [sessionId]: [...messages, ...pending] } };
    }),
  addChatMessage: (message) =>
    set((state) => {
      if (!message.sessionId) return state;
      const current = state.chatMessages[message.sessionId] || [];
      if (current.some((m) => m.id === message.id)) return state;
      return { chatMessages: { ...state.chatMessages, [message.sessionId]: [...current, message] } };
    }),
  setAgent: (status) =>
    set((state) => {
      const agents = state.agents.map((a) => (a.agent === status.agent ? status : a));
      if (!status.taskId || !status.action || status.state !== 'working') {
        return { agents };
      }
      const current = state.taskLogs[status.taskId] || [];
      const last = current[current.length - 1];
      if (last && last.action === status.action && last.file === status.file) {
        return { agents };
      }
      return {
        agents,
        taskLogs: {
          ...state.taskLogs,
          [status.taskId]: [...current.slice(-79), status],
        },
      };
    }),
}));

// Liga o navegador na sala da organização e mantém agentes e tasks ao vivo
export function useAgentsSocket(organizationId: string) {
  useEffect(() => {
    if (!organizationId) return;
    const socket = io(apiBase, { withCredentials: true, auth: { organizationId } });
    const { setAgents, setTaskLogs, setAgent, addChatMessage, addTeamMessage, appendTaskOutput } =
      useAgentsStore.getState();
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();

    socket.on('agent:status-list', setAgents);
    socket.on('agent:task-logs', setTaskLogs);
    socket.on('agent:task-output', appendTaskOutput);
    socket.on('agent:status', (status: AgentStatus) => {
      const before = useAgentsStore.getState().agents.find((a) => a.agent === status.agent);
      if (status.alert && status.alert !== before?.alert) notifyBrowser(status.alert);
      setAgent(status);
    });
    socket.on('agent:chat-message', addChatMessage);
    socket.on('agent:team-message', addTeamMessage);
    socket.on('task:created', (task: TaskCardProps) => {
      const { tasks, setTasks } = useTaskStore.getState();
      if (!tasks.some((t) => t.id === task.id)) {
        setTasks([task, ...tasks]);
      }
    });
    socket.on('task:updated', (task: TaskCardProps) => {
      const { tasks, setTasks, fetchTasks } = useTaskStore.getState();
      if (tasks.some((t) => t.id === task.id)) {
        setTasks(tasks.map((t) => (t.id === task.id ? task : t)));
      } else {
        fetchTasks();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [organizationId]);
}

// Push do navegador para o alerta de cota, fica na tela até o usuário ver
function notifyBrowser(message: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification('DeskReport', { body: message, requireInteraction: true });
}

export function findTaskAgent(agents: AgentStatus[], task: TaskCardProps, projectName: string) {
  const working = agents.filter((a) => a.state === 'working');
  const byTask = working.find((a) => a.taskId === task.id);
  if (byTask) return byTask;
  if (task.status !== 'in-progress') return undefined;
  return working.find((a) => !a.taskId && (a.project === task.project || a.project === projectName));
}
