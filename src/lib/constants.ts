export const API_BASE_URL = "http://localhost:8081";

export const NOTIFICATION_CONFIG = {
  POLLING_INTERVAL: 5000,
  ENDPOINTS: {
    // This must match the @RequestMapping + @GetMapping in your Java controller
    BASE: "/api/notifications", 
    // Matches @PutMapping("/{id}/read")
    MARK_READ: (id: string) => `/api/notifications/${id}/read`,
    // Matches @PutMapping("/mark-all-read")
    MARK_ALL_READ: "/api/notifications/mark-all-read",
  }
};

export const AUTH_CONFIG = {
  // Centralizing this ID allows to swap it easily later
  TEST_USER_ID: "0b0f8543-672e-4a5a-bb8d-99da74f94f90",
};

export const AUDIT_CONFIG = {
  ENDPOINTS: {
    GET_LOGS: "/admin/logs", 
  }
};