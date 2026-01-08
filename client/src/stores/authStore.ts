import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  settings: {
    theme: 'light' | 'dark' | 'system';
    aiProvider: 'openai' | 'ollama';
    notificationsEnabled: boolean;
  };
  gamificationStats: {
    level: number;
    currentXp: number;
    totalXp: number;
    streak: number;
    longestStreak: number;
    achievements: string[];
    lastActivityDate: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  updateSettings: (settings: Partial<User['settings']>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/login', { email, password });
          const { user, token } = response.data.data;
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          });
          
          // Set token for future requests
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Login failed',
            isLoading: false
          });
          throw error;
        }
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/register', { email, password, name });
          const { user, token } = response.data.data;
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          });
          
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } catch (error: any) {
          set({
            error: error.response?.data?.error || 'Registration failed',
            isLoading: false
          });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null
        });
        delete api.defaults.headers.common['Authorization'];
      },

      updateUser: (data: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...data } });
        }
      },

      updateSettings: async (settings: Partial<User['settings']>) => {
        const { user } = get();
        if (!user) return;

        try {
          const newSettings = { ...user.settings, ...settings };
          await api.patch('/auth/settings', { settings: newSettings });
          set({ user: { ...user, settings: newSettings } });
        } catch (error) {
          console.error('Failed to update settings:', error);
          throw error;
        }
      },

      refreshUser: async () => {
        try {
          const response = await api.get('/auth/me');
          set({ user: response.data.data });
        } catch (error) {
          console.error('Failed to refresh user:', error);
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      }),
      onRehydrateStorage: () => (state) => {
        // Restore token to API client on rehydration
        if (state?.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
      }
    }
  )
);

