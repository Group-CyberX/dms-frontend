import { API_BASE_URL, NOTIFICATION_CONFIG, AUTH_CONFIG } from "./constants";
import { Notification } from "@/types/notification";

// Helper to get Auth Headers
const getHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const notificationService = {
  async getAll(): Promise<Notification[]> {
    const url = `${API_BASE_URL}${NOTIFICATION_CONFIG.ENDPOINTS.BASE}?userId=${AUTH_CONFIG.TEST_USER_ID}`;
    try {
      const response = await fetch(url, { headers: getHeaders() });
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
      const response = await fetch(url, { 
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
      const url = `${API_BASE_URL}${NOTIFICATION_CONFIG.ENDPOINTS.MARK_ALL_READ}?userId=${AUTH_CONFIG.TEST_USER_ID}`;
      const response = await fetch(url, { 
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
      const response = await fetch(url, {
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