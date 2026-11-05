import { create } from 'zustand';
import { authClient } from '../../lib/auth-client';
import { TaskCardProps } from './tasks-data';
import { apiBase } from '../../api/fetcher';

const API_URL = apiBase + '/tasks';

// URL route is typically /:company_id/... so we can extract it for the headers
const getOrgId = () => {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname.split('/');
    return path[1] || 'deskreport';
  }
  return 'deskreport';
};

interface TaskStore {
  tasks: TaskCardProps[];
  setTasks: (tasks: TaskCardProps[]) => void;
  addTask: (task: Omit<TaskCardProps, 'id' | 'createdAt'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<TaskCardProps>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  fetchTasks: () => Promise<void>;
  addComment: (taskId: string, content: string, agent?: string) => Promise<void>;
  dispatchTask: (id: string, agent: string) => Promise<string | null>;
  stopTask: (id: string) => Promise<string | null>;
  fetchTerminal: (id: string) => Promise<string>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  fetchTasks: async () => {
    try {
      const { data, error } = await authClient.$fetch<TaskCardProps[]>(API_URL, {
        headers: { 'x-organization-id': getOrgId() },
      });
      if (!error && data) {
        set({ tasks: data });
      } else if (error) {
        console.error('Failed to fetch tasks:', error);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', (error as Error).message || error);
    }
  },
  addTask: async (task) => {
    try {
      const { data, error } = await authClient.$fetch<TaskCardProps>(API_URL, {
        method: 'POST',
        body: task,
        headers: { 'x-organization-id': getOrgId() },
      });
      if (!error && data) {
        set((state) => ({ tasks: [data, ...state.tasks] }));
      } else if (error) {
        console.error('Failed to add task:', error);
      }
    } catch (error) {
      console.error('Failed to add task:', (error as Error).message || error);
    }
  },
  updateTask: async (id, updates) => {
    const previous = get().tasks;
    set({ tasks: previous.map((t) => (t.id === id ? { ...t, ...updates } : t)) });

    try {
      const { data, error } = await authClient.$fetch<TaskCardProps>(`${API_URL}/${id}`, {
        method: 'PUT',
        body: updates,
        headers: { 'x-organization-id': getOrgId() },
      });
      if (!error && data) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? data : t)),
        }));
      } else {
        set({ tasks: previous });
        console.error('Failed to update task:', error);
      }
    } catch (error) {
      set({ tasks: previous });
      console.error('Failed to update task:', (error as Error).message || error);
    }
  },
  dispatchTask: async (id, agent) => {
    const { error } = await authClient.$fetch(`${API_URL}/${id}/dispatch`, {
      method: 'POST',
      body: { agent },
      headers: { 'x-organization-id': getOrgId() },
    });
    if (error) return error.message || 'Não foi possível rodar o agente';

    if (agent === 'antigravity') return null;
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, status: 'in-progress' } : t)),
    }));
    return null;
  },
  stopTask: async (id) => {
    const { error } = await authClient.$fetch(`${API_URL}/${id}/stop`, {
      method: 'POST',
      headers: { 'x-organization-id': getOrgId() },
    });
    return error ? error.message || 'Não foi possível parar o agente' : null;
  },
  fetchTerminal: async (id) => {
    const { data } = await authClient.$fetch<{ text: string }>(`${API_URL}/${id}/terminal`, {
      headers: { 'x-organization-id': getOrgId() },
    });
    return data?.text || '';
  },
  addComment: async (taskId, content, agent) => {
    try {
      const { data, error } = await authClient.$fetch<TaskCardProps>(`${API_URL}/${taskId}/comments`, {
        method: 'POST',
        body: { content, agent: agent || undefined },
        headers: { 'x-organization-id': getOrgId() },
      });
      if (!error && data) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? data : t)),
        }));
      } else if (error) {
        console.error('Failed to add comment:', error);
      }
    } catch (error) {
      console.error('Failed to add comment:', (error as Error).message || error);
    }
  },
  deleteTask: async (id) => {
    try {
      const { error } = await authClient.$fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: { 'x-organization-id': getOrgId() },
      });
      if (!error) {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        }));
      } else if (error) {
        console.error('Failed to delete task:', error);
      }
    } catch (error) {
      console.error('Failed to delete task:', (error as Error).message || error);
    }
  },
}));
