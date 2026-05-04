import { create } from "zustand";

interface AuthData {
  token: string;
  email: string;
  role: string;
  userId?: string;
  userName?: string;
  permissions?: Record<string, boolean>;
}

interface AuthState {
  token: string | null;
  email: string | null;
  role: string | null;
  userId: string | null;
  userName: string | null;
  permissions: Record<string, boolean>;

  setAuth: (data: AuthData) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  email: null,
  role: null,
  userId: null,
  userName: null,
  permissions: {},

  setAuth: (data) => {
    localStorage.setItem("token", data.token);

    set({
      token: data.token,
      email: data.email,
      role: data.role,
      userId: data.userId || null,
      userName: data.userName || null,
      permissions: data.permissions || {},
    });
  },

  logout: () => {
    localStorage.removeItem("token");

    set({
      token: null,
      email: null,
      role: null,
      userId: null,
      userName: null,
      permissions: {},
    });
  },
}));