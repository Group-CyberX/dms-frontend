/**
 * API client for document management
 * Configure the API_BASE_URL to match your backend server
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api';

/**
 * Get authorization header with JWT token
 */
function getAuthHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { 'Authorization': `Bearer ${token}` } : {};
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
 * Upload a document with metadata
 */
export async function uploadDocument(
  params: UploadDocumentParams
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('title', params.title);
  
  if (params.folderId) {
    formData.append('folderId', params.folderId);
  }
  if (params.category) {
    formData.append('category', params.category);
  }
  if (params.tags) {
    formData.append('tags', params.tags);
  }
  if (params.description) {
    formData.append('description', params.description);
  }

  const response = await fetch(`${API_BASE_URL}/documents/upload`, {
    method: 'POST',
    body: formData,
    headers: {
      ...getAuthHeader(),
      // Don't set Content-Type header - browser will set it automatically
      // with the correct boundary for multipart/form-data
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Upload failed with status ${response.status}`
    );
  }

  return response.json() as Promise<DocumentUploadResponse>;
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
  formData.append('file', file);

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
