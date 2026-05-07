import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  email: string;
  role: string;
  permissions: Record<string, boolean>;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  email: string | null;
  role: string | null;
  permissions: Record<string, boolean>;

  setAuth: (data: AuthPayload) => void;
  logout: () => void;
  logoutAsync: () => Promise<void>;
}

// Zustand store for managing authentication state across the app
export const useAuthStore = create<AuthState>()(
  persist(
  
    (set, get) => ({

       // Initial state
      accessToken: null,
      refreshToken: null,
      email: null,
      role: null,
      permissions: {},

      // Set authentication data after login
      setAuth: (data) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("accessToken", data.accessToken);
          localStorage.setItem("refreshToken", data.refreshToken);
        }
        // Update global state
        set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          email: data.email,
          role: data.role,
          permissions: data.permissions ?? {},
        });
      },

      // Logout locally by clearing state and storage
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("dms-auth-store");
        }

        set({
          accessToken: null,
          refreshToken: null,
          email: null,
          role: null,
          permissions: {},
        });
      },

      // Logout with backend token revocation
      logoutAsync: async () => {
        const refreshToken = get().refreshToken;

        // Call backend to revoke refresh token
        if (refreshToken) {
          try {
            await fetch('http://localhost:8081/auth/logout', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refreshToken }),
            });
          } catch (err) {
            console.error('Failed to revoke token on server:', err);
          }
        }

        // Clear local auth state
        get().logout();
      },
    }),
    {
      name: "dms-auth-store",
    }
  )
);