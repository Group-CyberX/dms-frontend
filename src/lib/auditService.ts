import { API_BASE_URL, AUDIT_CONFIG } from "./constants";

const getHeaders = (): Record<string, string> => {
  const isBrowser = typeof window !== "undefined";
  const token = isBrowser ? localStorage.getItem("token") : null;
  
  return {
    "Authorization": token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  };
};

export const auditService = {
  async getLogs() {
    const url = `${API_BASE_URL}${AUDIT_CONFIG.ENDPOINTS.GET_LOGS}`;
    try {
      const response = await fetch(url, { 
        method: "GET",
        headers: getHeaders() 
      });

      if (!response.ok) return [];

      const data = await response.json();
      if (Array.isArray(data)) return data;
      return data.logs || data.data || [];
    } catch (error) {
      console.error("AuditService.getLogs error:", error);
      return [];
    }
  },

  async getFilteredLogs(params: URLSearchParams) {
    // Ensure API_BASE_URL doesn't end with a slash if your endpoint starts with one
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const url = `${baseUrl}/admin/logs/filter?${params.toString()}`;

    try {
      const response = await fetch(url, { 
        method: "GET",
        headers: getHeaders()
      });

      if (response.status === 403) {
        console.error("Access Denied (403): Check backend SecurityConfig for /admin/logs/filter");
        throw new Error("You do not have permission to filter logs.");
      }

      if (!response.ok) throw new Error(`Filter failed: ${response.status}`);
      
      const data = await response.json();
      return Array.isArray(data) ? data : (data.logs || data.data || []);
    } catch (error) {
      console.error("AuditService.getFilteredLogs error:", error);
      throw error; // Re-throw so the UI can handle the specific error
    }
  }
};