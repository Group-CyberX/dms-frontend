import { API_BASE_URL, NOTIFICATION_CONFIG } from "./constants";
import { Notification } from "@/types/notification";
import { fetchWithAuth } from "./api-client";

const getHeaders = () => ({
  'Content-Type': 'application/json',
});

async function getCurrentUserId(): Promise<string | null> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/users/me`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return typeof data?.userId === 'string' ? data.userId : null;
  } catch {
    return null;
  }
}

export const notificationService = {
  async getAll(): Promise<Notification[]> {
    const userId = await getCurrentUserId();
    if (!userId) {
      return [];
    }

    const url = `${API_BASE_URL}${NOTIFICATION_CONFIG.ENDPOINTS.BASE}?userId=${userId}`;
    try {
      const response = await fetchWithAuth(url, { headers: getHeaders() });
      if (response.status === 401 || response.status === 403) {
        // Expected when session expires or user logs out while polling.
        return [];
      }
      if (!response.ok) {
        console.error(`Backend Error: ${response.status}`);
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Connection failed:", error);
      return [];
    }
  },

  async markAsRead(id: string): Promise<boolean> {
    try {
      const url = `${API_BASE_URL}${NOTIFICATION_CONFIG.ENDPOINTS.MARK_READ(id)}`;
      const response = await fetchWithAuth(url, { 
        method: "PUT", 
        headers: getHeaders() 
      });
      return response.ok;
    } catch (error) {
      console.error("Failed to update notification status:", error);
      return false;
    }
  },

  async markAllRead(): Promise<boolean> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return false;
      }

      const url = `${API_BASE_URL}${NOTIFICATION_CONFIG.ENDPOINTS.MARK_ALL_READ}?userId=${userId}`;
      const response = await fetchWithAuth(url, { 
        method: "PUT", 
        headers: getHeaders() 
      });
      return response.ok;
    } catch (error) {
      console.error("Failed to clear all notifications:", error);
      return false;
    }
  },

  delete: async (id: string) => {
    try {
      const url = `${API_BASE_URL}${NOTIFICATION_CONFIG.ENDPOINTS.BASE}/${id}`;
      const response = await fetchWithAuth(url, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Failed to delete');
      return true;
    } catch (error) {
      console.error("Connection failed during delete:", error);
      throw error;
    }
  }
};