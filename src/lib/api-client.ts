/**
 * API client for document management
 * Configure the API_BASE_URL to match your backend server
 */

import { useAuthStore } from "@/store/auth-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081/api";
const API_ROOT_URL = API_BASE_URL.replace(/\/api\/?$/, "");
const ADMIN_API_BASE_URL = `${API_ROOT_URL}/admin`;

// Track ongoing token refresh to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Get authorization header with JWT token
 */
function getAuthHeader(): Record<string, string> {
  const store = useAuthStore.getState();
  const token =
    store.accessToken ||
    (typeof window !== "undefined"
      ? localStorage.getItem("accessToken") || localStorage.getItem("token")
      : null);

  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Attempt to refresh the access token using the refresh token
 */
async function refreshAccessToken(): Promise<boolean> {
  const store = useAuthStore.getState();
  const refreshToken = store.refreshToken || (typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null);

  if (!refreshToken) {
    console.warn("[Token Refresh] No refresh token available");
    return false;
  }

  try {
    const response = await fetch(`${API_ROOT_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.accessToken) {
        store.setAuth({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || refreshToken,
          email: data.email || store.email || "",
          role: data.role || store.role || "",
          permissions: data.permissions || store.permissions || {},
        });
        console.log("[Token Refresh] Access token refreshed successfully");
        return true;
      }
    } else if (response.status === 401 || response.status === 403) {
      console.warn("[Token Refresh] Refresh token invalid or expired, logging out");
      store.logout();
      return false;
    }
  } catch (error) {
    console.error("[Token Refresh] Failed to refresh token:", error);
  }

  return false;
}

/**
 * Fetch with automatic token refresh on 401 (Unauthorized)
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeader(),
      ...(options.headers || {}),
    },
  });

  // If access token expired (401), try to refresh and retry
  if (response.status === 401) {
    console.log("[Token Refresh] Received 401, attempting to refresh token");

    // If already refreshing, wait for the ongoing refresh
    if (isRefreshing && refreshPromise) {
      const refreshed = await refreshPromise;
      if (refreshed) {
        // Retry the original request with new token
        response = await fetch(url, {
          ...options,
          headers: {
            ...getAuthHeader(),
            ...(options.headers || {}),
          },
        });
      }
    } else {
      // Start a new refresh
      isRefreshing = true;
      refreshPromise = refreshAccessToken();

      try {
        const refreshed = await refreshPromise;
        isRefreshing = false;
        refreshPromise = null;

        if (refreshed) {
          // Retry the original request with new token
          response = await fetch(url, {
            ...options,
            headers: {
              ...getAuthHeader(),
              ...(options.headers || {}),
            },
          });
        }
      } catch (error) {
        isRefreshing = false;
        refreshPromise = null;
        console.error("[Token Refresh] Error during token refresh:", error);
      }
    }
  }

  return response;
}

// Create a backend-safe filename: only letters, numbers, underscore or dash allowed in base name
function makeSafeFilename(file: File): string {
  const original = file?.name || 'file';
  const idx = original.lastIndexOf('.');
  const ext = idx >= 0 ? original.substring(idx + 1).toLowerCase() : '';
  const baseRaw = idx >= 0 ? original.substring(0, idx) : original;
  // Replace any disallowed characters with underscore and collapse repeated underscores
  let base = baseRaw.replace(/[^A-Za-z0-9_-]+/g, '_').replace(/_+/g, '_');
  // Trim leading/trailing underscores
  base = base.replace(/^_+|_+$/g, '');
  if (!base) base = 'file';
  return ext ? `${base}.${ext}` : base;
}

export interface DocumentUploadResponse {
  documentId: string;
  versionId: string;
  title: string;
  fileName?: string;
  message: string;
  success: boolean;
}

export interface UploadDocumentParams {
  file: File;
  title: string;
  folderId?: string;
  category?: string;
  tags?: string;
  description?: string;
}

export interface Document {
  document_id: string;
  title: string;
  owner_id: string;
  owner_name: string;
  folder_id: string | null;
  current_version_id: string;
  created_at: string;
  deleted_at?: string;
  file_size?: number;
  is_locked: boolean;
  is_deleted: boolean;
}

export interface Folder {
  folder_id: string;
  name: string;
  parent_folder_id: string | null;
  path: string;
}

/**
 * Upload a document with metadata and progress tracking
 */
export async function uploadDocument(
  params: UploadDocumentParams,
  onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
): Promise<DocumentUploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', params.file, makeSafeFilename(params.file));
    formData.append('title', params.title);
    
    if (params.folderId) formData.append('folderId', params.folderId);
    if (params.category) formData.append('category', params.category);
    if (params.tags) formData.append('tags', params.tags);
    if (params.description) formData.append('description', params.description);

    // Track upload progress (KB by KB)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percentage = (event.loaded / event.total) * 100;
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage,
        });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          reject(new Error('Failed to parse response'));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          reject(new Error(errorData.message || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Upload failed - network error'));
    };

    xhr.open('POST', `${API_BASE_URL}/documents/upload`);
    const authHeader = getAuthHeader().Authorization;
    if (authHeader) xhr.setRequestHeader('Authorization', authHeader);
    xhr.send(formData);
  });
}

/**
 * Upload multiple documents
 */
export async function uploadMultipleDocuments(
  files: File[],
  metadata: Omit<UploadDocumentParams, 'file'>
): Promise<DocumentUploadResponse[]> {
  const uploadPromises = files.map((file) =>
    uploadDocument({
      file,
      ...metadata,
      title: metadata.title || file.name.replace(/\.[^/.]+$/, ''),
    })
  );

  return Promise.all(uploadPromises);
}

/**
 * Get all documents
 */
export async function getDocuments() {
  const response = await fetch(`${API_BASE_URL}/documents`, {
    headers: getAuthHeader(),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch documents: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get document by ID
 */
export async function getDocument(id: string) {
  const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
    headers: getAuthHeader(),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch document: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get all folders
 */
export async function getFolders(): Promise<Folder[]> {
  const response = await fetch(`${API_BASE_URL}/folders`, {
    headers: getAuthHeader(),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch folders: ${response.statusText}`);
  }

  return response.json();
}

export interface DocumentVersion {
  version_id: string;
  document_id: string;
  version_number: string;
  s3_bucket_key: string;
  checksum: string;
  ocr_content: string;
  created_at: string;
}

export interface WorkflowInstance {
  id: number;
  documentId?: string;
  document_id?: string;
  templateId?: number | null;
  workflowName?: string;
  priority?: string;
  dueDate?: string;
  status?: string;
}

/**
 * Get all workflow instances
 */
export async function getWorkflows(): Promise<WorkflowInstance[]> {
  const response = await fetch(`${API_BASE_URL}/workflows`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch workflows: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get all versions of a document
 */
export async function getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/versions`, {
    headers: getAuthHeader(),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch document versions: ${response.statusText}`);
  }

  return response.json();
}

export interface Tag {
  tagId: string;
  tagName: string;
}

/**
 * Get all tags for a document
 */
export async function getDocumentTags(documentId: string): Promise<Tag[]> {
  const response = await fetch(`${API_BASE_URL}/tags/document/${documentId}`, {
    headers: getAuthHeader(),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch tags: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Add a new tag to a document
 */
export async function addTagToDocument(documentId: string, tagName: string): Promise<Tag> {
  const response = await fetch(
    `${API_BASE_URL}/tags/document/${documentId}?tagName=${encodeURIComponent(tagName)}`,
    {
      method: 'POST',
      headers: getAuthHeader(),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to add tag: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create a new folder
 */
export async function createFolder(name: string, parentFolderId?: string, path?: string): Promise<Folder> {
  const folderData = {
    name,
    parent_folder_id: parentFolderId || null,
    path: path || `/${name}`,
  };

  const response = await fetch(`${API_BASE_URL}/folders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(folderData),
  });

  if (!response.ok) {
    throw new Error(`Failed to create folder: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get folder by ID
 */
export async function getFolder(folderId: string): Promise<Folder> {
  const response = await fetch(`${API_BASE_URL}/folders/${folderId}`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch folder: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update a folder
 */
export async function updateFolder(folderId: string, name: string, parentFolderId?: string, path?: string): Promise<Folder> {
  const folderData = {
    name,
    parent_folder_id: parentFolderId || null,
    path: path || `/${name}`,
  };

  const response = await fetch(`${API_BASE_URL}/folders/${folderId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(folderData),
  });

  if (!response.ok) {
    throw new Error(`Failed to update folder: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete a folder
 */
export async function deleteFolder(folderId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/folders/${folderId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete folder: ${response.statusText}`);
  }
}

/**
 * Upload new document version
 */
export async function uploadNewVersion(documentId: string, file: File): Promise<DocumentVersion> {
  const formData = new FormData();
  formData.append('file', file, makeSafeFilename(file));

  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/versions/upload`, {
    method: 'POST',
    body: formData,
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Upload failed with status ${response.status}`
    );
  }

  return response.json();
}

/**
 * Download document version file
 */
export async function downloadDocumentVersion(documentId: string, versionId: string): Promise<Blob> {
  const response = await fetch(
    `${API_BASE_URL}/documents/${documentId}/versions/${versionId}/download`,
    {
      method: 'GET',
      headers: getAuthHeader(),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to download version: ${response.statusText}`);
  }

  return response.blob();
}

/**
 * Restore document version
 */
export async function restoreDocumentVersion(documentId: string, versionId: string): Promise<DocumentVersion> {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/versions/${versionId}/restore`, {
    method: 'POST',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error(`Failed to restore version: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete document version
 */
export async function deleteDocumentVersion(documentId: string, versionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/versions/${versionId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete version: ${response.statusText}`);
  }
}

/**
 * Delete a document (soft delete - moves to recycle bin)
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete document: ${response.statusText}`);
  }
}

/**
 * Get all deleted documents (from trash)
 */
export async function getDeletedDocuments(): Promise<Document[]> {
  const response = await fetch(`${API_BASE_URL}/documents/trash`, {
    headers: getAuthHeader(),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch deleted documents: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Restore a deleted document
 */
export async function restoreDocument(documentId: string): Promise<Document> {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/restore`, {
    method: 'POST',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error(`Failed to restore document: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Permanently delete a document - For now, same as soft delete
 * Backend currently only supports soft delete via DELETE endpoint
 */
export async function permanentlyDeleteDocument(documentId: string): Promise<void> {
  // Backend doesn't have a separate permanent delete endpoint yet
  // Using the soft delete endpoint which moves to trash
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete document: ${response.statusText}`);
  }
}

/**
 * Restore multiple documents
 */
export async function restoreMultipleDocuments(documentIds: string[]): Promise<void> {
  // Backend doesn't have batch restore endpoint
  // Execute restore one by one
  const restorePromises = documentIds.map(id => restoreDocument(id));
  await Promise.all(restorePromises);
}

/**
 * Permanently delete multiple documents
 */
export async function permanentlyDeleteMultipleDocuments(documentIds: string[]): Promise<void> {
  // Backend doesn't have batch permanent delete endpoint
  // Execute delete one by one
  const deletePromises = documentIds.map(id => permanentlyDeleteDocument(id));
  await Promise.all(deletePromises);
}

// ============= MULTIPART UPLOAD FUNCTIONS =============

/**
 * Initiate multipart upload session
 */
export async function initiateMultipartUpload(
  fileName: string,
  totalSize: number,
  documentId?: string
): Promise<{ sessionId: string; s3UploadId: string; partSize: number }> {
  const params = new URLSearchParams({
    fileName,
    totalSize: totalSize.toString(),
    ...(documentId && { documentId }),
  });

  const response = await fetch(`${API_BASE_URL}/multipart-uploads/initiate?${params}`, {
    method: 'POST',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error(`Failed to initiate multipart upload: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Upload single chunk/part
 */
export async function uploadPartChunk(
  sessionId: string,
  partNumber: number,
  chunkFile: File
): Promise<{ partNumber: number; eTag: string; uploadedBytes: number; totalBytes: number }> {
  const formData = new FormData();
  formData.append('chunk', chunkFile);

  const response = await fetch(
    `${API_BASE_URL}/multipart-uploads/${sessionId}/parts/${partNumber}`,
    {
      method: 'POST',
      body: formData,
      headers: getAuthHeader(),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload part ${partNumber}: ${error}`);
  }

  return response.json();
}

/**
 * Complete multipart upload
 */
export async function completeMultipartUpload(
  sessionId: string,
  title: string,
  metadata: {
    folderId?: string;
    category?: string;
    tags?: string;
    description?: string;
  }
): Promise<DocumentUploadResponse> {
  const params = new URLSearchParams({
    title,
    ...(metadata.folderId && { folderId: metadata.folderId }),
    ...(metadata.category && { category: metadata.category }),
    ...(metadata.tags && { tags: metadata.tags }),
    ...(metadata.description && { description: metadata.description }),
  });

  const response = await fetch(
    `${API_BASE_URL}/multipart-uploads/${sessionId}/complete?${params}`,
    {
      method: 'POST',
      headers: getAuthHeader(),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to complete upload: ${error}`);
  }

  return response.json();
}

/**
 * Get upload progress
 */
export async function getUploadProgress(
  sessionId: string
): Promise<{ uploadedBytes: number; totalBytes: number; percentComplete: number; status: string }> {
  const response = await fetch(`${API_BASE_URL}/multipart-uploads/${sessionId}/progress`, {
    method: 'GET',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error(`Failed to get upload progress: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Abort multipart upload
 */
export async function abortMultipartUpload(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/multipart-uploads/${sessionId}/abort`, {
    method: 'POST',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error(`Failed to abort upload: ${response.statusText}`);
  }
}

export interface User {
  userId: string;
  username: string;
  email: string;
  role: {
    roleId: string;
    name: string;
    permissions: string;
  } | null;
  status: string;
  createdAt?: string;
}

export interface Role {
  roleId: string;
  name: string;
  permissions: string;
}

/**
 * Get all users (admin only)
 */
export async function getUsers(): Promise<User[]> {
  const response = await fetchWithAuth(`${ADMIN_API_BASE_URL}/users`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.statusText}`);
  }

  return response.json();
}

export async function createUser(data: {
  username: string;
  email: string;
  password: string;
  role: string;
}): Promise<User> {
  const response = await fetchWithAuth(`${ADMIN_API_BASE_URL}/users/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create user: ${response.statusText}`);
  }

  return response.json();
}

export async function updateUser(
  userId: string,
  data: {
    username: string;
    role: string;
  }
): Promise<User> {
  const response = await fetchWithAuth(`${ADMIN_API_BASE_URL}/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update user: ${response.statusText}`);
  }

  return response.json();
}

export async function updateUserStatus(userId: string, status: string): Promise<User> {
  const response = await fetchWithAuth(`${ADMIN_API_BASE_URL}/users/${userId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update status: ${response.statusText}`);
  }

  return response.json();
}

export async function getRoles(): Promise<Role[]> {
  const response = await fetchWithAuth(`${ADMIN_API_BASE_URL}/roles`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch roles: ${response.statusText}`);
  }

  return response.json();
}

export async function createRole(data: {
  name: string;
  permissions: string;
}): Promise<Role> {
  const response = await fetchWithAuth(`${ADMIN_API_BASE_URL}/roles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create role: ${response.statusText}`);
  }

  return response.json();
}

export async function updateRolePermissions(
  roleId: string,
  permissions: string,
  name?: string
): Promise<Role> {
  const response = await fetchWithAuth(`${ADMIN_API_BASE_URL}/roles/${roleId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({
      permissions,
      ...(name ? { name } : {}),
    }),
  });

  if (!response.ok) {
    let message = response.statusText || "Unknown server error";

    try {
      const json = await response.json();
      if (json && typeof json === "object") {
        message =
          (json as { message?: string; error?: string }).message ||
          (json as { message?: string; error?: string }).error ||
          message;
      }
    } catch {
      // Ignore JSON parse errors and fall back to status text.
    }

    throw new Error(`Failed to update role: ${message}`);
  }

  return response.json();
}
