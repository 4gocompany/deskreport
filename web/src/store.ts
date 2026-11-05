import { create } from 'zustand';
import { authClient } from './lib/auth-client';
import { apiBase } from './api/fetcher';

export type SubmenuItem = {
  name: string;
  to: string;
};

export type SubmenuNavigation = {
  navigation: SubmenuItem[];
  setNavigation: (navigation: SubmenuItem[]) => void;
};

export const useSubmenuNavigation = create<SubmenuNavigation>()((set) => ({
  navigation: [],
  setNavigation: (navigation: SubmenuItem[]) => set(() => ({ navigation: navigation })),
}));

export type ThemeType = 'light' | 'dark' | 'system';

export type ThemeStore = {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
};

export const useThemeStore = create<ThemeStore>()((set) => ({
  theme: (localStorage.getItem('deskreport-theme') as ThemeType) || 'system',
  setTheme: (theme: ThemeType) => {
    localStorage.setItem('deskreport-theme', theme);
    set({ theme });
  },
}));

export type ChatSidebarMode = 'hidden' | 'compact' | 'expanded';

export type UIStore = {
  chatSidebarMode: ChatSidebarMode;
  setChatSidebarMode: (mode: ChatSidebarMode) => void;
  chatSidebarPreference: 'compact' | 'hidden';
  setChatSidebarPreference: (pref: 'compact' | 'hidden') => void;
  toggleChatSidebarMode: () => void;
};

export const useUIStore = create<UIStore>()((set) => ({
  chatSidebarMode: (localStorage.getItem('deskreport-chat-mode') as ChatSidebarMode) || 'compact',
  setChatSidebarMode: (mode: ChatSidebarMode) => {
    localStorage.setItem('deskreport-chat-mode', mode);
    set({ chatSidebarMode: mode });
  },
  chatSidebarPreference: (localStorage.getItem('deskreport-chat-pref') as 'compact' | 'hidden') || 'compact',
  setChatSidebarPreference: (pref: 'compact' | 'hidden') => {
    localStorage.setItem('deskreport-chat-pref', pref);
    // Se mudar a preferência, a gente ajusta o modo atual se ele estiver nos estados iniciais
    set((state) => {
      const newMode = state.chatSidebarMode === 'expanded' ? 'expanded' : pref === 'hidden' ? 'hidden' : 'compact';
      localStorage.setItem('deskreport-chat-mode', newMode);
      return { chatSidebarPreference: pref, chatSidebarMode: newMode };
    });
  },
  toggleChatSidebarMode: () =>
    set((state) => {
      let nextMode: ChatSidebarMode;

      if (state.chatSidebarPreference === 'hidden') {
        // Se prefere escondido: alterna entre Hidden e Expanded
        nextMode = state.chatSidebarMode === 'expanded' ? 'hidden' : 'expanded';
      } else {
        // Se prefere compacto: alterna entre Compact e Expanded
        nextMode = state.chatSidebarMode === 'expanded' ? 'compact' : 'expanded';
      }

      localStorage.setItem('deskreport-chat-mode', nextMode);
      return { chatSidebarMode: nextMode };
    }),
}));

export type Organization = { id: string; name: string };
export type Project = {
  id: string;
  name: string;
  teams?: { teamId: string; team?: Team }[];
  completion_percentage?: number;
};
export type Team = {
  id: string;
  name: string;
  description?: string;
  _count?: { members: number; tasks: number };
  members?: any[];
};

export type TenantStore = {
  organizations: Organization[];
  projects: Project[];
  teams: Team[];
  members: any[];
  fetchOrganizations: () => Promise<void>;
  fetchProjects: (orgId: string) => Promise<void>;
  fetchTeams: (orgId: string) => Promise<void>;
  fetchMembers: (orgId: string) => Promise<void>;
};

export const useTenantStore = create<TenantStore>()((set, get) => ({
  organizations: [],
  projects: [{ id: 'all', name: 'Todos Projetos' }],
  teams: [],
  members: [],
  fetchOrganizations: async () => {
    if (get().organizations.length > 0) return;
    try {
      const { data } = await authClient.organization.list();
      if (data) {
        set({
          organizations: data.map((org: any) => ({
            id: org.id,
            name: org.name,
          })),
        });
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    }
  },
  fetchProjects: async (orgId: string) => {
    try {
      const { data, error } = await authClient.$fetch<any[]>(`${apiBase}/projects`, {
        headers: {
          'x-organization-id': orgId,
        },
      });
      if (!error && data) {
        set({
          projects: [
            { id: 'all', name: 'Todos Projetos' },
            ...data.map((p) => ({
              id: p.id,
              name: p.name,
              teams: p.teams,
              completion_percentage: p.completion_percentage,
            })),
          ],
        });
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  },
  fetchTeams: async (orgId: string) => {
    try {
      const { data, error } = await authClient.$fetch<Team[]>(`${apiBase}/teams`, {
        headers: {
          'x-organization-id': orgId,
        },
      });
      if (!error && data) {
        set({ teams: data });
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  },
  fetchMembers: async (orgId: string) => {
    try {
      const { data } = await authClient.organization.getFullOrganization({
        query: { organizationId: orgId },
      });
      if (data?.members) {
        set({ members: data.members });
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  },
}));
