import { create } from 'zustand';
import type { AuthUser } from '../types';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  isAdmin: () => boolean;
}

const savedUser  = localStorage.getItem('auth_user');
const savedToken = localStorage.getItem('auth_token');

export const useAuthStore = create<AuthState>((set, get) => ({
  user:  savedUser  ? JSON.parse(savedUser)  : null,
  token: savedToken ?? null,

  setAuth: (user, token) => {
    localStorage.setItem('auth_user',  JSON.stringify(user));
    localStorage.setItem('auth_token', token);
    set({ user, token });
  },

  clearAuth: () => {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    set({ user: null, token: null });
  },

  isAdmin: () => get().user?.role === 'admin',
}));
