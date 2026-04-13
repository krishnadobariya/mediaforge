import { create } from 'zustand';
import api from '../utils/api';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  loading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user, loading: false }),

  checkAuth: async () => {
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data.user, isAuthenticated: true, loading: false });
    } catch (error) {
      set({ user: null, isAuthenticated: false, loading: false });
    }
  },

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    set({ user: res.data.user, isAuthenticated: true });
    return res.data;
  },

  register: async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    set({ user: res.data.user, isAuthenticated: true });
    return res.data;
  },

  logout: async () => {
    // Optionally call backend logout
    set({ user: null, isAuthenticated: false });
  },
}));
