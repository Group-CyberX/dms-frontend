import axios from "axios"

const API = axios.create({
  baseURL: "http://localhost:8081/api",
})

API.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token")
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export interface SearchFilters {
  query?: string
  documentType?: string
  status?: string
  owner?: string
  tags?: string
  signatureStatus?: string
  dateRange?: string
}

export const searchDocuments = async (filters: SearchFilters) => {
  // If we only have a general query and no other filters, use the basic `GET /api/search`
  const isOnlyQuery = filters.query && 
    !filters.documentType && !filters.status && !filters.owner && 
    !filters.tags && !filters.signatureStatus && (!filters.dateRange || filters.dateRange === "all" || filters.dateRange === "none");

  if (isOnlyQuery) {
    const response = await API.get("/search", { params: { query: filters.query } });
    return response.data;
  }
  
  // Otherwise, use the advanced POST endpoint
  // Send the filters object directly, as it exactly matches AdvancedSearchRequestDTO
  const response = await API.post("/search/advanced", filters);
  return response.data;
}

// ============================================ //
// DOCUMENT API CALLS
// ============================================ //
export const getDocumentById = async (documentId: string) => {
  const response = await API.get(`/documents/${documentId}`);
  return response.data;
}

export const getDocumentTags = async (documentId: string) => {
  const response = await API.get(`/tags/document/${documentId}`);
  return response.data;
}

export const addMetadata = async (documentId: string, key: string, value: string) => {
  const response = await API.post(`/metadata/document/${documentId}`, {
    key,
    value
  });
  return response.data;
}

export const updateMetadata = async (documentId: string, key: string, value: string) => {
  const response = await API.put(`/metadata/document/${documentId}/${key}`, {
    key,
    value
  });
  return response.data;
}

export const deleteMetadata = async (documentId: string, key: string) => {
  const response = await API.delete(`/metadata/document/${documentId}/${key}`);
  return response.data;
}

export const addBulkMetadata = async (documentId: string, metadataList: { key: string, value: string }[]) => {
  const response = await API.post(`/metadata/document/${documentId}/bulk`, metadataList);
  return response.data;
}

// ============================================ //
// SEARCH LOGS
// ============================================ //
export const logSearchResultClick = async (query: string, clickedDocId: string) => {
  if (!query || query.trim() === "") return;
  
  await API.post("/search/log", {
    query,
    clickedDocId
  });
}

export const getSearchHistory = async () => {
  const response = await API.get("/search/history");
  return response.data;
}

export const clearSearchHistory = async () => {
  const response = await API.delete("/search/history");
  return response.data;
}

// ============================================ //
// TAGS & VERSIONS (Added for Document Details)
// ============================================ //

export const addTagToDocument = async (documentId: string, tagName: string) => {
  const response = await API.post(`/tags/document/${documentId}`, null, {
    params: { tagName }
  });
  return response.data;
}

export const getDocumentVersions = async (documentId: string) => {
  const response = await API.get(`/documents/${documentId}/versions`);
  return response.data;
}

export const uploadNewVersion = async (documentId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await API.post(`/documents/${documentId}/versions/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    }
  });
  return response.data;
}

export const downloadDocumentVersion = async (documentId: string, versionId: string) => {
  const response = await API.get(`/documents/${documentId}/versions/${versionId}/download`, {
    responseType: "blob"
  });
  return response.data;
}

export const restoreDocumentVersion = async (documentId: string, versionId: string) => {
  const response = await API.post(`/documents/${documentId}/versions/${versionId}/restore`);
  return response.data;
}

export const deleteDocumentVersion = async (documentId: string, versionId: string) => {
  const response = await API.delete(`/documents/${documentId}/versions/${versionId}`);
  return response.data;
}
