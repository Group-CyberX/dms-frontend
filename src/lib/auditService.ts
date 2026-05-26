import { fetchWithAuth } from "./api-client";
import { API_BASE_URL, AUDIT_CONFIG } from "./constants";

const getHeaders = (): Record<string, string> => ({
  "Content-Type": "application/json",
});

// Helper function to sort logs: Most recent (newest) first
const sortLogsNewestFirst = (logsArray: any[]): any[] => {
  return [...logsArray].sort((a, b) => {
    // Falls back to 'timestamp' or 'date' if 'createdAt' doesn't exist
    const dateA = new Date(a.createdAt || a.timestamp || a.date).getTime();
    const dateB = new Date(b.createdAt || b.timestamp || b.date).getTime();
    return dateB - dateA; // Descending order (Newest -> Oldest)
  });
};

export const auditService = {
  async getLogs() {
    const url = `${API_BASE_URL}${AUDIT_CONFIG.ENDPOINTS.GET_LOGS}`;
    try {
      const response = await fetchWithAuth(url, { 
        method: "GET",
        headers: getHeaders() 
      });

      if (!response.ok) return [];

      const data = await response.json();
      
      let rawLogs = [];
      if (Array.isArray(data)) rawLogs = data;
      else rawLogs = data.logs || data.data || [];

      // Sort logs before returning to the UI page component
      return sortLogsNewestFirst(rawLogs);
    } catch (error) {
      console.error("AuditService.getLogs error:", error);
      return [];
    }
  },

  async getFilteredLogs(params: URLSearchParams) {
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const url = `${baseUrl}/admin/logs/filter?${params.toString()}`;

    try {
      const response = await fetchWithAuth(url, { 
        method: "GET",
        headers: getHeaders()
      });

      if (response.status === 403) {
        console.error("Access Denied (403): Check backend SecurityConfig for /admin/logs/filter");
        throw new Error("You do not have permission to filter logs.");
      }

      if (!response.ok) throw new Error(`Filter failed: ${response.status}`);
      
      const data = await response.json();
      let rawLogs = Array.isArray(data) ? data : (data.logs || data.data || []);
      
      // Sort filtered logs as well so view consistency remains unbroken
      return sortLogsNewestFirst(rawLogs);
    } catch (error) {
      console.error("AuditService.getFilteredLogs error:", error);
      throw error; 
    }
  }
};