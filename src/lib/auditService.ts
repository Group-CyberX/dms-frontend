import { API_BASE_URL, AUDIT_CONFIG } from "./constants";

/* This service handles all backend communication related to audit logs.*/
export const auditService = {
  async getLogs() {
    const url = `${API_BASE_URL}${AUDIT_CONFIG.ENDPOINTS.GET_LOGS}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }
};