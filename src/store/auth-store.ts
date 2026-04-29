import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthPayload {
  token: string;
  email: string;
  role: string;
  permissions: Record<string, boolean>;
}

interface AuthState {
  token: string | null;
  email: string | null;
  role: string | null;
  permissions: Record<string, boolean>;

  setAuth: (data: AuthPayload) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      role: null,
      permissions: {},

      setAuth: (data) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("token", data.token);
        }

        set({
          token: data.token,
          email: data.email,
          role: data.role,
          permissions: data.permissions ?? {},
        });
      },

      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          localStorage.removeItem("dms-auth-store");
        }

        set({
          token: null,
          email: null,
          role: null,
          permissions: {},
        });
      },
    }),
    {
      name: "dms-auth-store",
    }
  )
);