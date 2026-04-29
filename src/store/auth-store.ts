import { create } from "zustand";

interface AuthState {
  token: string | null;
  email: string | null;
  role: string | null;
  userId: string | null;
  userName: string | null;

  setAuth: (token: string, email: string, role: string, userId?: string, userName?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  email: null,
  role: null,
  userId: null,
  userName: null,

  setAuth: (token, email, role, userId, userName) => {
    localStorage.setItem("token", token);

    set({
      token,
      email,
      role,
      userId: userId || null,
      userName: userName || null,
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
    });
  },
}));