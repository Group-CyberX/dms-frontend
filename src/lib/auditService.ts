import { fetchWithAuth } from "./api-client";
import { API_BASE_URL, AUDIT_CONFIG } from "./constants";

const getHeaders = (): Record<string, string> => ({
  "Content-Type": "application/json",
});

export type AuditFilters = {
  userId?: string;
  action?: string;
  fromDate?: string;
  toDate?: string;
};

export type AuditPage = {
  logs: any[];
  totalElements: number;
  totalPages: number;
  page: number;
};

const EMPTY_PAGE: AuditPage = { logs: [], totalElements: 0, totalPages: 0, page: 0 };

const baseUrl = () =>
  API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

/**
 * Turns a Spring Data page into the shape the audit screen uses. The rows
 * arrive already sorted newest-first by the database, so there is nothing left
 * to sort here - the previous client-side sort only ever reordered whichever
 * rows happened to have been downloaded.
 */
const toPage = (data: any): AuditPage => {
  if (Array.isArray(data)) {
    // An older backend that still returns a bare array.
    return { logs: data, totalElements: data.length, totalPages: 1, page: 0 };
  }
  return {
    logs: data?.content ?? [],
    totalElements: data?.totalElements ?? 0,
    totalPages: data?.totalPages ?? 0,
    page: data?.number ?? 0,
  };
};

/** Filters the UI treats as "no filter" are simply not sent. */
const toParams = (filters: AuditFilters, page: number, size: number) => {
  const params = new URLSearchParams();
  if (filters.userId && filters.userId !== "all") params.append("userId", filters.userId);
  if (filters.action && filters.action !== "all") params.append("action", filters.action);
  if (filters.fromDate) params.append("fromDate", filters.fromDate);
  if (filters.toDate) params.append("toDate", filters.toDate);
  params.append("page", String(page));
  params.append("size", String(size));
  return params;
};

const hasAnyFilter = (filters: AuditFilters) =>
  Boolean(
    (filters.userId && filters.userId !== "all") ||
    (filters.action && filters.action !== "all") ||
    filters.fromDate ||
    filters.toDate
  );

export const auditService = {
  /**
   * One page of the trail. Filtering and paging both happen in the database -
   * the browser never holds more rows than it is showing, which matters because
   * the audit table is append-only and only ever grows.
   */
  async getLogs(page = 0, size = 25, filters: AuditFilters = {}, isExport = false): Promise<AuditPage> {
    const path = hasAnyFilter(filters)
      ? "/admin/logs/filter"
      : AUDIT_CONFIG.ENDPOINTS.GET_LOGS;

    const params = toParams(filters, page, size);
    if (isExport) params.append("export", "true");

    const url = `${baseUrl()}${path}?${params.toString()}`;

    try {
      const response = await fetchWithAuth(url, { method: "GET", headers: getHeaders() });

      if (response.status === 403) {
        throw new Error("You do not have permission to view audit logs.");
      }
      if (!response.ok) {
        throw new Error(`Failed to load audit logs: ${response.status}`);
      }

      return toPage(await response.json());
    } catch (error) {
      console.error("AuditService.getLogs error:", error);
      throw error;
    }
  },

  /**
   * Every row matching the current filters, for CSV and PDF export.
   *
   * Export is the one case where the whole result set is genuinely wanted, so
   * it asks for it explicitly rather than the screen quietly holding all the
   * rows all the time. Capped at the server's maximum page size.
   */
  async getAllForExport(filters: AuditFilters = {}): Promise<any[]> {
    // export=true tells the server this read is an export, so it records who
    // took a copy of the trail - reading everyone's activity is itself an
    // auditable act.
    const result = await this.getLogs(0, 500, filters, true);
    return result.logs;
  },
};
