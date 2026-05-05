import { create } from "zustand";

interface AuthState {
  token: string | null;
  email: string | null;
  role: string | null;
  permissions: Record<string, boolean>;

  setAuth: (data: any) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  email: null,
  role: null,
  permissions: {},

  setAuth: (data) => {
    localStorage.setItem("token", data.token);

    set({
      token: data.token,
      email: data.email,
      role: data.role,
      permissions: data.permissions,
    });
  },

  logout: () => {
    localStorage.removeItem("token");

    set({
      token: null,
      email: null,
      role: null,
      permissions: {},
    });
  },
}));