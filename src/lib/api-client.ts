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
          userName: data.username || store.userName || "",
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

export interface FolderTreeNode {
  folder_id: string;
  name: string;
  path: string;
  parent_folder_id: string | null;
  documentCount: number;
  totalSize: number;
  children: FolderTreeNode[];
}

/**
 * Fetch the full nested folder tree, with recursive document counts and sizes
 * already rolled up by the backend.
 *
 * `all` scopes the counts, and means exactly what it means on getDocuments():
 * omitted or false counts only your own documents, true counts everyone's.
 * Pass whichever scope the list you are showing beside these counts uses -
 * they disagreed before, and a folder badge read 26 next to a list of 3.
 *
 * The response is a single synthetic root — `folder_id: null`, its
 * `documentCount` is the total for that scope, and `children` holds the
 * real top-level folders — rather than an array of roots.
 */
export async function fetchFolderTree(all = false): Promise<FolderTreeNode> {
  const query = all ? "?all=true" : "";
  const response = await fetchWithAuth(`${API_BASE_URL}/folders/tree${query}`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    let errBody: unknown;
    try { errBody = await response.json(); } catch { errBody = response.statusText; }
    throw errBody || response.statusText;
  }

  return response.json();
}

/**
 * Move one or more documents to a target folder (or to root if targetFolderId is null)
 */
export async function moveDocuments(req: {
  documentIds: string[];
  targetFolderId: string | null;
}): Promise<{ movedCount: number }> {
  const response = await fetchWithAuth(`${API_BASE_URL}/documents/move`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    let errBody: unknown;
    try { errBody = await response.json(); } catch { errBody = response.statusText; }
    throw errBody || response.statusText;
  }

  return response.json();
}

/**
 * Fetch documents, optionally scoped to a specific folder.
 * Pass folderId=null to get all non-deleted documents.
 */
export async function fetchDocuments(folderId?: string | null): Promise<Document[]> {
  const url =
    folderId != null
      ? `${API_BASE_URL}/documents?folderId=${encodeURIComponent(folderId)}`
      : `${API_BASE_URL}/documents`;

  const response = await fetchWithAuth(url, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    let errBody: unknown;
    try { errBody = await response.json(); } catch { errBody = response.statusText; }
    throw errBody || response.statusText;
  }

  return response.json();
}

/**
 * Upload a document with metadata and progress tracking
 */
export async function uploadDocument(
  params: UploadDocumentParams,
  onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
): Promise<DocumentUploadResponse> {
  return new Promise((resolve, reject) => {
    console.log('[SINGLE_UPLOAD] Starting single-file upload...');
    console.log('[SINGLE_UPLOAD] File:', params.file.name);
    console.log('[SINGLE_UPLOAD] Size:', params.file.size, 'bytes');
    console.log('[SINGLE_UPLOAD] Title:', params.title);
    
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', params.file, makeSafeFilename(params.file));
    formData.append('title', params.title);
    
    if (params.folderId) formData.append('folderId', params.folderId);
    if (params.category) formData.append('category', params.category);
    if (params.tags) formData.append('tags', params.tags);
    if (params.description) formData.append('description', params.description);

    let uploadComplete = false;

    // Track upload progress (KB by KB) - cap at 95% to reserve 5% for backend processing
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress && !uploadComplete) {
        // Cap progress at 95% during upload - reserve 5% for server-side processing
        let percentage = (event.loaded / event.total) * 100;
        if (percentage > 95) percentage = 95;
        
        console.log(`[SINGLE_UPLOAD] Upload progress: ${(event.loaded / 1024 / 1024).toFixed(2)}MB / ${(event.total / 1024 / 1024).toFixed(2)}MB = ${percentage.toFixed(1)}%`);
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage,
        });
      }
    };

    xhr.onload = () => {
      uploadComplete = true;
      console.log('[SINGLE_UPLOAD] Response received from server, processing backend validation...');
      
      // Show 98% while waiting for full response parsing
      if (onProgress) {
        onProgress({
          loaded: params.file.size,
          total: params.file.size,
          percentage: 98,
        });
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          console.log('[SINGLE_UPLOAD] Upload completed successfully');
          console.log('[SINGLE_UPLOAD] Response:', response);
          
          // Show 100% only after successful response parsing
          if (onProgress) {
            onProgress({
              loaded: params.file.size,
              total: params.file.size,
              percentage: 100,
            });
          }
          
          resolve(response);
        } catch (error) {
          console.error('[SINGLE_UPLOAD] Error parsing response:', error);
          reject(new Error('Failed to parse response'));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          console.error('[SINGLE_UPLOAD] Upload failed:', errorData.message);
          reject(new Error(errorData.message || `Upload failed with status ${xhr.status}`));
        } catch {
          console.error('[SINGLE_UPLOAD] Upload failed with status:', xhr.status);
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      console.error('[SINGLE_UPLOAD] Network error during upload');
      reject(new Error('Upload failed - network error'));
    };

    console.log('[SINGLE_UPLOAD] Sending request...');
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
 * Create a new folder. `path` is computed server-side from the parent's
 * path, so it is not sent — the DTO the backend accepts here only has
 * `name` and `parentFolderId` (camelCase, unlike the Folders entity used
 * by update/delete, which is snake_case). Omit parentFolderId to create
 * a root folder.
 */
export async function createFolder(name: string, parentFolderId?: string): Promise<Folder> {
  const folderData = {
    name,
    parentFolderId: parentFolderId || null,
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
export interface FolderDeleteResult {
  deletedFolderIds: string[];
  documentsMovedToRecycleBin: number;
}

/**
 * Delete a folder. This cascades: every subfolder is deleted too, and every
 * document inside any of them is moved to the recycle bin (soft delete).
 */
export async function deleteFolder(folderId: string): Promise<FolderDeleteResult> {
  const response = await fetch(`${API_BASE_URL}/folders/${folderId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete folder: ${response.statusText}`);
  }

  return response.json();
}

export interface FolderTrashItem {
  folderId: string;
  name: string;
  path: string;
  deletedAt: string;
  documentCount: number;
  subfolderCount: number;
}

export interface FolderRestoreResult {
  restoredFolderIds: string[];
  documentsRestored: number;
}

/** List deleted folders (recycle bin), one row per deleted subtree root. */
export async function getDeletedFolders(): Promise<FolderTrashItem[]> {
  const response = await fetch(`${API_BASE_URL}/folders/trash`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch deleted folders: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Restore a deleted folder. This cascades: every subfolder is restored too,
 * along with every document that was moved to the recycle bin alongside it.
 */
export async function restoreFolder(folderId: string): Promise<FolderRestoreResult> {
  const response = await fetch(`${API_BASE_URL}/folders/${folderId}/restore`, {
    method: 'POST',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error(`Failed to restore folder: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Upload new document version with progress tracking
 */
export async function uploadNewVersion(
  documentId: string,
  file: File,
  onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
): Promise<DocumentVersion> {
  return new Promise((resolve, reject) => {
    console.log('[VERSION_UPLOAD] Starting version upload...');
    console.log('[VERSION_UPLOAD] File:', file.name);
    console.log('[VERSION_UPLOAD] Size:', file.size, 'bytes');
    
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file, makeSafeFilename(file));

    let uploadComplete = false;

    // Track upload progress - cap at 95% to reserve 5% for backend processing
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress && !uploadComplete) {
        // Cap progress at 95% during upload - reserve 5% for server
        let percentage = (event.loaded / event.total) * 100;
        if (percentage > 95) percentage = 95;
        
        console.log(`[VERSION_UPLOAD] Upload progress: ${(event.loaded / 1024 / 1024).toFixed(2)}MB / ${(event.total / 1024 / 1024).toFixed(2)}MB = ${percentage.toFixed(1)}%`);
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage,
        });
      }
    };

    xhr.onload = () => {
      uploadComplete = true;
      console.log('[VERSION_UPLOAD] Response received from server, processing backend...');
      
      // Show 98% while waiting for response parsing
      if (onProgress) {
        onProgress({
          loaded: file.size,
          total: file.size,
          percentage: 98,
        });
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          console.log('[VERSION_UPLOAD] Version upload completed successfully');
          console.log('[VERSION_UPLOAD] Response:', response);
          
          // Show 100% only after successful response parsing
          if (onProgress) {
            onProgress({
              loaded: file.size,
              total: file.size,
              percentage: 100,
            });
          }
          
          resolve(response);
        } catch (error) {
          console.error('[VERSION_UPLOAD] Error parsing response:', error);
          reject(new Error('Failed to parse response'));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          console.error('[VERSION_UPLOAD] Upload failed:', errorData.message);
          reject(new Error(errorData.message || `Upload failed with status ${xhr.status}`));
        } catch {
          console.error('[VERSION_UPLOAD] Upload failed with status:', xhr.status);
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      console.error('[VERSION_UPLOAD] Network error during upload');
      reject(new Error('Upload failed - network error'));
    };

    console.log('[VERSION_UPLOAD] Sending request...');
    xhr.open('POST', `${API_BASE_URL}/documents/${documentId}/versions/upload`);
    const authHeader = getAuthHeader().Authorization;
    if (authHeader) xhr.setRequestHeader('Authorization', authHeader);
    xhr.send(formData);
  });
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
 * Initiate multipart upload session with metadata validation
 */
export async function initiateMultipartUpload(
  fileName: string,
  totalSize: number,
  title: string,
  category: string,
  tags?: string,
  description?: string,
  documentId?: string,
  folderId?: string
): Promise<{ sessionId: string; s3UploadId: string; partSize: number }> {
  const params = new URLSearchParams({
    fileName,
    totalSize: totalSize.toString(),
    title,
    category,
    ...(tags && { tags }),
    ...(description && { description }),
    ...(documentId && { documentId }),
    ...(folderId && { folderId }),
  });

  const response = await fetch(`${API_BASE_URL}/multipart-uploads/initiate?${params}`, {
    method: 'POST',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Validation failed: ${errorText}`);
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
 * Get upload progress with S3 verification
 * Returns actual bytes uploaded to S3 (source of truth)
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
 * Get all users (public listing). Use this for non-admin pages.
 */
export async function getUsers(): Promise<User[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/users`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get all users (admin-only). Use when admin privileges are required.
 */
export async function getAdminUsers(): Promise<User[]> {
  const response = await fetchWithAuth(`${ADMIN_API_BASE_URL}/users`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch admin users: ${response.statusText}`);
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

export async function deleteRole(roleId: string): Promise<void> {
  const response = await fetchWithAuth(`${ADMIN_API_BASE_URL}/roles/${roleId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete role: ${response.statusText}`);
  }
}

const handleResponseError = async (res: Response) => {
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    throw new Error(data.error || data.message || text);
  } catch (e) {
    if (e instanceof Error && e.name !== 'SyntaxError') throw e;
    throw new Error(text || res.statusText || 'API Request Failed');
  }
};

export const apiClient = {
  get: async (url: string, options?: RequestInit) => {
    const res = await fetchWithAuth(`${API_ROOT_URL}${url}`, { ...options, method: 'GET' });
    if (!res.ok) await handleResponseError(res);
    return res.json();
  },
  post: async (url: string, body: any, options?: RequestInit) => {
    const res = await fetchWithAuth(`${API_ROOT_URL}${url}`, {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: JSON.stringify(body),
    });
    if (!res.ok) await handleResponseError(res);
    return res.json();
  },
  put: async (url: string, body: any, options?: RequestInit) => {
    const res = await fetchWithAuth(`${API_ROOT_URL}${url}`, {
      ...options,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: JSON.stringify(body),
    });
    if (!res.ok) await handleResponseError(res);
    return res.json();
  },
  delete: async (url: string, options?: RequestInit) => {
    const res = await fetchWithAuth(`${API_ROOT_URL}${url}`, { ...options, method: 'DELETE' });
    if (!res.ok) await handleResponseError(res);
    return res.json();
  },
};
export interface SearchHistoryItem {
  searchId: string;
  query: string;
  documentId: string;
  documentTitle: string;
  timestamp: string;
}

/**
 * Get search history for the current user
 */
export async function getSearchHistory(): Promise<SearchHistoryItem[]> {
  const response = await fetch(`${API_BASE_URL}/search/history`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch search history: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Clear search history for the current user
 */
export async function clearSearchHistory(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/search/history`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error(`Failed to clear search history: ${response.statusText}`);
  }
}

/**
 * Log a clicked search result to history
 */
export async function logSearchClick(query: string, documentId: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/search/log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      clickedDocId: documentId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to log search click: ${response.statusText}`);
  }
}

export interface ProcessingJob {
  jobId: string;
  documentVersionId: string;
  jobType: string;
  status: string; // "PENDING", "IN_PROGRESS", "SUCCESS", "FAILED"
  createdAt?: string;
}

/**
 * Fetch jobs for a document
 */
export async function getDocumentJobs(documentId: string): Promise<ProcessingJob[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/jobs?documentId=${documentId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch processing jobs');
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// ERP integration
//
// The DMS talks to each configured ERP over plain REST. Everything the UI needs
// is here; the credential is never returned by the API.
// ---------------------------------------------------------------------------

export interface ErpConnection {
  connectionId: string;
  name: string;
  erpType: string;
  apiEndpoint: string;
  authType: string;
  hasCredential: boolean;
  isActive: boolean;
  status: string;              // UNKNOWN | OK | FAILED
  lastSyncedAt: string | null;
  lastErrorMessage: string | null;
  createdAt: string | null;
}

export interface ErpConnectionRequest {
  name: string;
  erpType: string;
  apiEndpoint: string;
  authType: string;
  apiKey?: string;             // blank on update = keep the stored credential
  isActive?: boolean;
}

export interface ErpMapping {
  mappingId: string;
  erpConnectionId: string;
  entityType: string;
  erpField: string;
  dmsField: string;
  isReferenceKey: boolean;
}

export interface ErpTransaction {
  transactionId: string;
  erpConnectionId: string;
  transactionType: string;
  externalRef: string;
  payload: string;
  syncStatus: string;
  lastErrorMessage: string | null;
  retryCount: number;
  syncedAt: string;
}

export interface ErpDocumentLink {
  linkId: string;
  linkType: string;            // AUTO | MANUAL
  matchedReference: string;
  externalRef: string;
  transactionType: string;
  payload: string;
  createdAt: string;
}

export interface ConnectionTestResult {
  success: boolean;
  attempts: number;
  message: string;
  testedAt: string;
}

export interface ErpSyncResult {
  connectionId: string;
  success: boolean;
  transactionsFetched: number;
  transactionsCreated: number;
  documentsLinked: number;
  message: string;
  syncedAt: string;
}

async function erpRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithAuth(`${API_BASE_URL}/erp${path}`, init);
  if (!response.ok) {
    let message = `ERP request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch {
      /* no JSON body */
    }
    throw new Error(message);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export const getErpConnections = () => erpRequest<ErpConnection[]>('/connections');

export const createErpConnection = (data: ErpConnectionRequest) =>
  erpRequest<ErpConnection>('/connections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const updateErpConnection = (id: string, data: ErpConnectionRequest) =>
  erpRequest<ErpConnection>(`/connections/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const deleteErpConnection = (id: string) =>
  erpRequest<void>(`/connections/${id}`, { method: 'DELETE' });

export const testErpConnection = (id: string) =>
  erpRequest<ConnectionTestResult>(`/connections/${id}/test`, { method: 'POST' });

export const syncErpConnection = (id: string) =>
  erpRequest<ErpSyncResult>(`/connections/${id}/sync`, { method: 'POST' });

export const getErpMappings = (id: string) =>
  erpRequest<ErpMapping[]>(`/connections/${id}/mappings`);

export const deleteErpMapping = (mappingId: string) =>
  erpRequest<void>(`/mappings/${mappingId}`, { method: 'DELETE' });

export const getErpTransactions = (page = 0, size = 25) =>
  erpRequest<{ content: ErpTransaction[]; totalElements: number; totalPages: number; number: number }>(
    `/transactions?page=${page}&size=${size}`
  );

export const retryErpTransaction = (transactionId: string) =>
  erpRequest<ErpTransaction>(`/transactions/${transactionId}/retry`, { method: 'POST' });

export const getErpStats = () =>
  erpRequest<{
    connections: number;
    transactions: number;
    failed: number;
    successfulToday: number;
    failedToday: number;
  }>('/stats');

/** Records pulled and documents attached, for one connection's row. */
export const getErpConnectionCounts = (connectionId: string) =>
  erpRequest<{ transactions: number; linkedDocuments: number }>(
    `/connections/${connectionId}/counts`
  );

/** What this document is attached to - drives the panel on the document page. */
export const getDocumentErpLinks = (documentId: string) =>
  erpRequest<ErpDocumentLink[]>(`/documents/${documentId}/links`);

// ---------------------------------------------------------------------------
// Document edit lock
//
// One user holds a document while changing its file, metadata or tags.
// Everyone else keeps read access and sees who is editing.
// ---------------------------------------------------------------------------

export interface DocumentLockStatus {
  documentId: string;
  locked: boolean;
  lockedByUserId: string | null;
  lockedByUsername: string | null;
  lockedAt: string | null;
  expiresAt: string | null;
  heldByCurrentUser: boolean;
}

/** Thrown when the server rejects a change because someone else holds the lock. */
export class DocumentLockedError extends Error {
  lockedByUsername: string | null;
  constructor(message: string, lockedByUsername: string | null) {
    super(message);
    this.name = 'DocumentLockedError';
    this.lockedByUsername = lockedByUsername;
  }
}

export async function lockDocument(documentId: string): Promise<DocumentLockStatus> {
  const response = await fetchWithAuth(`${API_BASE_URL}/documents/${documentId}/lock`, {
    method: 'POST',
  });
  if (response.status === 409) {
    const body = await response.json().catch(() => ({}));
    throw new DocumentLockedError(
      body?.message ?? 'This document is being edited by someone else',
      body?.lockedByUsername ?? null
    );
  }
  if (!response.ok) throw new Error('Could not start editing this document');
  return response.json();
}

export async function unlockDocument(documentId: string): Promise<DocumentLockStatus> {
  const response = await fetchWithAuth(`${API_BASE_URL}/documents/${documentId}/unlock`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Could not release the document');
  return response.json();
}

export async function getDocumentLockStatus(documentId: string): Promise<DocumentLockStatus> {
  const response = await fetchWithAuth(`${API_BASE_URL}/documents/${documentId}/lock-status`);
  if (!response.ok) throw new Error('Could not check the lock status');
  return response.json();
}

export interface TaskSigningContext {
  taskId: number;
  instanceId: number;
  documentId: string;
  workflowName: string;
  requiresSignature: boolean;
}

/**
 * Asked the moment "Approve" is clicked: does this workflow require the approver
 * to place a signature, and on which document? Drives whether we open the
 * signing page or the plain approve dialog.
 */
export async function getTaskSigningContext(taskId: string | number): Promise<TaskSigningContext> {
  const response = await fetchWithAuth(`${API_BASE_URL}/tasks/${taskId}/signing-context`);
  if (!response.ok) {
    throw new Error('Failed to check whether this approval needs a signature');
  }
  return response.json();
}

export interface TaskContext extends TaskSigningContext {
  taskStatus: string;
  workflowStatus: string;
  dueDate: string | null;
  assignedToMe: boolean;
  overdue: boolean;
  /** Banner text, or null when the step can be acted on. */
  statusMessage: string | null;
}

/**
 * Everything the document page needs about one approval step, in one request.
 *
 * Replaces the page's own reconstruction of the same facts, which cost a user
 * lookup plus one request for every workflow attached to the document.
 */
export async function getTaskContext(taskId: string | number): Promise<TaskContext> {
  const response = await fetchWithAuth(`${API_BASE_URL}/tasks/${taskId}/context`);
  if (!response.ok) {
    throw new Error('Failed to load the approval context for this task');
  }
  return response.json();
}

export interface DocumentMetadata {
  metadataId: string;
  documentId: string;
  key: string;
  value: string;
}

/**
 * Get all metadata for a document
 */
export async function getDocumentMetadata(documentId: string): Promise<DocumentMetadata[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/metadata/document/${documentId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch metadata: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Add metadata to a document
 */
export async function addMetadata(documentId: string, key: string, value: string): Promise<DocumentMetadata> {
  const response = await fetchWithAuth(`${API_BASE_URL}/metadata/document/${documentId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });
  if (!response.ok) {
    throw new Error(`Failed to add metadata: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Update metadata for a document
 */
export async function updateMetadata(documentId: string, key: string, value: string): Promise<DocumentMetadata> {
  const response = await fetchWithAuth(`${API_BASE_URL}/metadata/document/${documentId}/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update metadata: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Delete metadata from a document
 */
export async function deleteMetadata(documentId: string, key: string): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/metadata/document/${documentId}/${encodeURIComponent(key)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete metadata: ${response.statusText}`);
  }
}

// ---------------------------------------------------------------------------
// Paged responses
//
// Every list endpoint that can grow without bound returns a page rather than a
// table. This is the shape Spring Data produces, so the same helper reads all
// of them.
// ---------------------------------------------------------------------------

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;   // zero-based page index
  size: number;
  first: boolean;
  last: boolean;
}

/** An empty page, for error paths that still have to render a table. */
export function emptyPage<T>(size = 10): Page<T> {
  return {
    content: [], totalElements: 0, totalPages: 0,
    number: 0, size, first: true, last: true,
  };
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface SlaAlert {
  taskId: number;
  documentId: string;
  documentTitle: string;
  workflowName: string;
  priority: string | null;
  assignedBy: string;
  dueDate: string;
  daysRemaining: number;
  overdue: boolean;
}

export interface DashboardSummary {
  totalUsers: number;
  totalDocuments: number;
  myDocuments: number;
  archivedDocuments: number;
  activeWorkflows: number;
  completedWorkflows: number;
  submittedWorkflows: number;
  pendingApprovals: number;
  unreadNotifications: number;
  erpConnections: number;
  auditEvents: number;
  failedAuditEvents: number;
  slaAlerts: SlaAlert[];
}

/**
 * The whole dashboard in one request.
 *
 * This replaces four list calls plus one request per active workflow. The
 * counts are computed by the database and the SLA list arrives ready to render.
 */
export interface DocumentWorkflowStatus {
  documentId: string;
  workflowId: number;
  status: string | null;
}

/**
 * Latest workflow status for every document, one short row each.
 *
 * The document list and document page previously fetched every workflow row in
 * the database and reduced it to exactly this in the browser.
 */
export async function getWorkflowStatusByDocument(): Promise<DocumentWorkflowStatus[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/workflows/status-by-document`);
  if (!response.ok) {
    throw new Error(`Failed to load workflow status: ${response.status}`);
  }
  return response.json();
}

export interface MyTaskRow {
  taskId: number;
  stepOrder: number;
  status: string;
  actionComment: string | null;
  workflowId: number;
  workflowName: string | null;
  workflowStatus: string | null;
  dueDate: string | null;
  priority: string | null;
  templateId: number | null;
  requiresSignature: boolean;
  documentId: string | null;
  documentTitle: string;
  assigneeLabel: string | null;
  assignedByLabel: string | null;
  overdue: boolean;
}

/**
 * The signed-in user's tasks, joined to their workflow, document and approval
 * step by the server and ordered by due date.
 *
 * Replaces the My Tasks screen's previous approach of downloading every user,
 * workflow and document, issuing one request per workflow for its tasks, and
 * filtering the result in the browser.
 */
export async function getMyTasks(): Promise<MyTaskRow[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/tasks/my`);
  if (!response.ok) {
    throw new Error(`Failed to load tasks: ${response.status}`);
  }
  return response.json();
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await fetchWithAuth(`${API_BASE_URL}/dashboard/summary`);
  if (!response.ok) {
    throw new Error(`Failed to load dashboard: ${response.status}`);
  }
  return response.json();
}

export interface ServiceCheck {
  name: string;
  healthy: boolean;
  detail: string;
  latencyMs: number;
}

export interface SystemHealth {
  healthy: boolean;
  uptime: string;
  activeUsers: number;
  lastBackup: string;
  apiResponseTimeMs: number;
  documentQueueDepth: number;
  erpSyncStatus: string;
  storageUsedBytes: number;
  dbConnectionsActive: number;
  dbConnectionsMax: number;
  ocrAvailable: boolean;
  services: ServiceCheck[];
  checkedAt: string;
}

/**
 * Live system health, checked fresh on every call - a real database round
 * trip, a real S3 reachability probe, real counts. There is no caching layer
 * here to invalidate, because the whole point of the page is that a click on
 * Refresh reflects the system's actual current state.
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const response = await fetchWithAuth(`${API_BASE_URL}/system-health`);
  if (!response.ok) {
    throw new Error(`Failed to load system health: ${response.status}`);
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// Paged lists
// ---------------------------------------------------------------------------

export interface DocumentPageParams {
  page?: number;
  size?: number;
  search?: string;
  folderId?: string | null;
  all?: boolean;
}

/** One page of documents, searched and filtered in the database. */
export async function getDocumentsPage(params: DocumentPageParams = {}): Promise<Page<Document>> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 0));
  query.set('size', String(params.size ?? 10));
  if (params.all) query.set('all', 'true');
  if (params.search) query.set('search', params.search);
  if (params.folderId) query.set('folderId', params.folderId);

  const response = await fetchWithAuth(`${API_BASE_URL}/documents/page?${query.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to load documents: ${response.status}`);
  }
  return response.json();
}

export interface UserPageParams {
  page?: number;
  size?: number;
  search?: string;
  status?: string;
  role?: string;
}

/** One page of the user directory. */
export async function getUsersPage(params: UserPageParams = {}): Promise<Page<User>> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 0));
  query.set('size', String(params.size ?? 10));
  if (params.search) query.set('search', params.search);
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.role && params.role !== 'all') query.set('role', params.role);

  const response = await fetchWithAuth(`${ADMIN_API_BASE_URL}/users/page?${query.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to load users: ${response.status}`);
  }
  return response.json();
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  roles: number;
}

/**
 * Directory-wide user counts.
 *
 * Kept separate from the page because they describe every user, not the ten on
 * screen - once paging is real, counting the rows in the table gives the wrong
 * answer.
 */
export async function getUserStats(): Promise<UserStats> {
  const response = await fetchWithAuth(`${ADMIN_API_BASE_URL}/users/stats`);
  if (!response.ok) {
    throw new Error(`Failed to load user statistics: ${response.status}`);
  }
  return response.json();
}
