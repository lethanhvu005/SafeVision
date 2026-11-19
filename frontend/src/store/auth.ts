import { create } from 'zustand';

type Role = 'guest' | 'user' | 'admin' | 'super_admin';

const TOKEN_KEY = 'token';
const ROLE_KEY = 'role';

function readToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

function readRole(): Role {
  return (sessionStorage.getItem(ROLE_KEY) as Role | null) ?? 'guest';
}

interface AuthState {
  token: string | null;
  role: Role;
  setAuth: (token: string, role: Role) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: readToken(),
  role: readRole(),
  setAuth: (token, role) => {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(ROLE_KEY, role);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    set({ token, role });
  },
  logout: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    set({ token: null, role: 'guest' });
  },
}));
