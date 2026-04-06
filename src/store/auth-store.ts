import { create } from "zustand";

interface AuthState {
  token: string | null;
  email: string | null;
  role: string | null;

  setAuth: (token: string, email: string, role: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  email: null,
  role: null,

  setAuth: (token, email, role) => {
    localStorage.setItem("token", token);

    set({
      token,
      email,
      role,
    });
  },

  logout: () => {
    localStorage.removeItem("token");

    set({
      token: null,
      email: null,
      role: null,
    });
  },
}));