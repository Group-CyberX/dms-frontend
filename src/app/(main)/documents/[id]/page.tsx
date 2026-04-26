'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { getDocument, getDocumentVersions, Document, DocumentVersion, getDocumentTags, addTagToDocument, Tag, uploadNewVersion, downloadDocumentVersion, restoreDocumentVersion, deleteDocumentVersion } from '@/lib/api-client';
import  ShareDocumentDialog  from '@/components/ui/share/share-document-dialog';
import {
  ArrowLeft,
  Share2,
  Download,
  Lock,
  FileText,
  AlertCircle,
  Loader2,
  Calendar,
  RotateCcw,
  Trash2,
  Upload,
  X,
  CheckCircle,
} from 'lucide-react';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [addingTag, setAddingTag] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const [downloadingVersionId, setDownloadingVersionId] = useState<string | null>(null);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);
  const [deletingVersionId, setDeletingVersionId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const onDrop = (acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(
      (file) => file.size <= 100 * 1024 * 1024
    );
    if (validFiles.length < acceptedFiles.length) {
      setUploadError('Some files were too large (max 100MB) and were not added.');
    } else {
      setUploadError(null);
    }
    if (validFiles.length > 0) {
      setNewVersionFile(validFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [docData, versionsData, tagsData] = await Promise.all([
          getDocument(documentId),
          getDocumentVersions(documentId),
          getDocumentTags(documentId),
        ]);
        setDocument(docData);
        setVersions(versionsData || []);
        setTags(tagsData || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching document:', err);
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      fetchData();
    }
  }, [documentId]);

  const getFileExtension = (fileName: string): string => {
    const match = fileName.match(/\.(\w+)$/);
    return match ? match[1].toUpperCase() : 'FILE';
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const handleAddTag = async () => {
    if (!newTagInput.trim() || !document) {
      return;
    }

    try {
      setAddingTag(true);
      const newTag = await addTagToDocument(document.document_id, newTagInput.trim());
      setTags([...tags, newTag]);
      setNewTagInput('');
    } catch (err) {
      console.error('Error adding tag:', err);
      alert(err instanceof Error ? err.message : 'Failed to add tag');
    } finally {
      setAddingTag(false);
    }
  };

  const handleUploadNewVersion = async () => {
    if (!newVersionFile || !document) {
      return;
    }

    try {
      setUploadingVersion(true);
      setUploadError(null);
      setUploadSuccess(null);
      const newVersion = await uploadNewVersion(document.document_id, newVersionFile);
      setVersions([newVersion, ...versions]);
      setUploadSuccess('New version uploaded successfully!');
      setUploadDialogOpen(false);
      setNewVersionFile(null);
      setTimeout(() => setUploadSuccess(null), 3000);
    } catch (err) {
      console.error('Error uploading version:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload new version';
      setUploadError(errorMessage);
    } finally {
      setUploadingVersion(false);
    }
  };

  const handleDownloadVersion = async (versionId: string) => {
    if (!document) {
      return;
    }

    try {
      setDownloadingVersionId(versionId);
      const blob = await downloadDocumentVersion(document.document_id, versionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${document.title}-v${versionId.substring(0, 8)}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading version:', err);
      alert(err instanceof Error ? err.message : 'Failed to download version');
    } finally {
      setDownloadingVersionId(null);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!document || versionId === document.current_version_id) {
      return;
    }

    try {
      setRestoringVersionId(versionId);
      await restoreDocumentVersion(document.document_id, versionId);
      setDocument({ ...document, current_version_id: versionId });
      alert('Version restored successfully');
    } catch (err) {
      console.error('Error restoring version:', err);
      alert(err instanceof Error ? err.message : 'Failed to restore version');
    } finally {
      setRestoringVersionId(null);
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (!document) {
      return;
    }

    if (versions.length <= 1) {
      alert('Cannot delete the only version of a document');
      return;
    }

    if (!confirm('Are you sure you want to delete this version?')) {
      return;
    }

    try {
      setDeletingVersionId(versionId);
      await deleteDocumentVersion(document.document_id, versionId);
      setVersions(versions.filter((v) => v.version_id !== versionId));
      alert('Version deleted successfully');
    } catch (err) {
      console.error('Error deleting version:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete version');
    } finally {
      setDeletingVersionId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-[#953002] animate-spin" />
          <p className="text-gray-600 mt-3">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[#953002] hover:text-[#7a2401] mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error loading document</h3>
              <p className="text-sm text-red-700 mt-1">{error || 'Document not found'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const fileExtension = document.title ? getFileExtension(document.title) : 'FILE';

  return (
    <div className="min-h-screen w-full bg-gray-100">
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[#953002] hover:text-[#7a2401] mb-4 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Documents
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">{document.title}</h1>
            <div className="flex gap-3">
              <div className="flex gap-3">
              <Button 
                className="bg-[#953002] hover:bg-[#7a2401] text-white"
                onClick={() => setShareDialogOpen(true)}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button 
                className="bg-[#953002] hover:bg-[#7a2401] text-white"
                onClick={() => document.current_version_id && handleDownloadVersion(document.current_version_id)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button 
                className="bg-[#953002] hover:bg-[#7a2401] text-white"
                onClick={() => setUploadDialogOpen(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                New Version
              </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <div className="flex flex-col items-center justify-center min-h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <FileText className="w-16 h-16 text-gray-400 mb-4" />
                <p className="text-gray-600 font-medium">{fileExtension} Document Preview</p>
                <p className="text-sm text-gray-500 mt-2">{document.title}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Information</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Created Date</p>
                  <p className="text-sm text-gray-900 mt-1">{formatDate(document.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Owner</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {document.owner_id === '00000000-0000-0000-0000-000000000000' ? 'System' : 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-700 text-white">
                      Approved
                    </span>
                    {document.is_locked && <Lock className="w-4 h-4 text-gray-600" />}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Document ID</p>
                  <p className="text-xs text-gray-600 mt-1 font-mono break-all">{document.document_id}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tags</h2>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {tags.length === 0 ? (
                    <p className="text-sm text-gray-500">No tags yet</p>
                  ) : (
                    tags.map((tag) => (
                      <span key={tag.tagId} className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {tag.tagName}
                      </span>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter tag name"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddTag();
                      }
                    }}
                    className="flex-1 px-3 py-1 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#953002]"
                  />
                  <button
                    onClick={handleAddTag}
                    disabled={addingTag || !newTagInput.trim()}
                    className="px-3 py-1 rounded text-sm font-medium bg-[#953002] text-white hover:bg-[#7a2401] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Version History</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {versions.map((version) => (
                  <div
                    key={version.version_id}
                    className={`p-3 rounded-lg border ${
                      version.version_id === document.current_version_id
                        ? 'border-[#953002] bg-orange-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">v{version.version_number}</p>
                          {version.version_id === document.current_version_id && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#953002] text-white">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDateTime(version.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleDownloadVersion(version.version_id)}
                          disabled={downloadingVersionId === version.version_id}
                          className="p-1 hover:bg-gray-200 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Download version"
                        >
                          {downloadingVersionId === version.version_id ? (
                            <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                        {version.version_id !== document.current_version_id && (
                          <button 
                            onClick={() => handleRestoreVersion(version.version_id)}
                            disabled={restoringVersionId === version.version_id}
                            className="p-1 hover:bg-gray-200 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Restore version"
                          >
                            {restoringVersionId === version.version_id ? (
                              <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                            ) : (
                              <RotateCcw className="w-4 h-4 text-gray-600" />
                            )}
                          </button>
                        )}
                        {versions.length > 1 && (
                          <button 
                            onClick={() => handleDeleteVersion(version.version_id)}
                            disabled={deletingVersionId === version.version_id}
                            className="p-1 hover:bg-red-200 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete version"
                          >
                            {deletingVersionId === version.version_id ? (
                              <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-red-600" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload New Version Panel */}
      {uploadDialogOpen && (
        <div className="fixed top-0 left-0 right-0 z-40 pt-20 px-4">
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Upload New Version</h3>
                <p className="text-xs text-gray-600 mt-1">Select a file to upload as the next version</p>
              </div>
              <button
                onClick={() => {
                  setUploadDialogOpen(false);
                  setNewVersionFile(null);
                  setUploadError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Error Message */}
              {uploadError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{uploadError}</p>
                </div>
              )}

              {/* Success Message */}
              {uploadSuccess && (
                <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-green-700">{uploadSuccess}</p>
                </div>
              )}

              {/* Drag and Drop Zone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer ${
                  isDragActive
                    ? 'border-[#953002] bg-amber-50'
                    : 'border-gray-300 hover:border-[#953002]'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                {isDragActive ? (
                  <p className="text-gray-700 font-medium">Drop file here...</p>
                ) : (
                  <>
                    <p className="text-gray-700 font-medium mb-1">Drag & drop your file here</p>
                    <p className="text-xs text-gray-500 mb-4">
                      or click to select • Maximum size: 100MB
                    </p>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"
                    >
                      Choose File from Device
                    </button>
                  </>
                )}
              </div>

              {/* Selected File */}
              {newVersionFile && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">{newVersionFile.name}</p>
                    <p className="text-xs text-blue-700 mt-1">
                      {(newVersionFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={() => setNewVersionFile(null)}
                    className="text-blue-400 hover:text-blue-600 ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Supported Formats */}
              <p className="text-xs text-gray-500 text-center">
                Supported formats: PDF, DOCX, XLSX, PNG, JPG, JPEG
              </p>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => {
                  setUploadDialogOpen(false);
                  setNewVersionFile(null);
                  setUploadError(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadNewVersion}
                disabled={!newVersionFile || uploadingVersion}
                className="flex-1 px-4 py-2 bg-[#953002] text-white rounded-lg hover:bg-[#7a2401] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {uploadingVersion ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </div>
                ) : (
                  'Upload Version'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success notification */}
      {uploadSuccess && !uploadDialogOpen && (
        <div className="fixed bottom-4 right-4 z-40 flex items-start gap-2 p-4 bg-green-50 border border-green-200 rounded-lg shadow-lg">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{uploadSuccess}</p>
        </div>
      )}

      {/* Share Document Dialog */}
      <ShareDocumentDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        documentTitle={document?.title || ""}
        documentId={document?.document_id || ""}
      />
    </div>
  );
}
