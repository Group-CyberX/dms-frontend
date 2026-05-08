import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  email: string;
  role: string;
  permissions: Record<string, boolean>;
}

interface AuthData {
  token: string;
  email: string;
  role: string;
  userId?: string;
  userName?: string;
  permissions?: Record<string, boolean>;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  email: string | null;
  role: string | null;
  userId: string | null;
  userName: string | null;
  permissions: Record<string, boolean>;
  hasHydrated: boolean;

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
      userId: null,
      userName: null,
      permissions: {},
      hasHydrated: false,

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
          hasHydrated: true,
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
          hasHydrated: true,
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
      onRehydrateStorage: () => (state) => {
        // Set hasHydrated to true when storage is rehydrated
        if (state) {
          state.hasHydrated = true;
        }
      },
    }
  )
);

// Setup cross-window logout detection
// Call this once on app initialization to listen for logout in other windows
export const setupCrossWindowLogoutDetection = () => {
  if (typeof window === "undefined") return;

  const handleStorageChange = (event: StorageEvent) => {
    // ONLY check for dms-auth-store key (Zustand persist middleware key)
    // This fires once per logout, avoiding duplicate logout() calls
    if (event.key === "dms-auth-store" && event.newValue === null) {
      // Auth store was removed in another window
      const currentState = useAuthStore.getState();
      
      // Only logout if we still have a token (guard against duplicate calls)
      if (currentState.accessToken) {
        useAuthStore.getState().logout();
        console.log("[Cross-Window Logout] Session invalidated from another window");
      }
    }
  };

  // Add listener for storage changes from OTHER windows
  window.addEventListener("storage", handleStorageChange);

  // Return cleanup function
  return () => {
    window.removeEventListener("storage", handleStorageChange);
  };
};
