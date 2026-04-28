"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { 
  Share2, Download, User, Calendar, FileText, Plus, Loader2, 
  Edit2, Check, X, Trash2, ArrowLeft, Lock, AlertCircle, 
  RotateCcw, Upload, CheckCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import ApprovalAction from '@/components/ui/search/aproval-action';
import { 
  getDocumentById, 
  getDocumentTags, 
  updateMetadata, 
  deleteMetadata, 
  addMetadata,
  getDocumentVersions,
  addTagToDocument,
  uploadNewVersion,
  downloadDocumentVersion,
  restoreDocumentVersion,
  deleteDocumentVersion
} from '@/lib/api';

export interface DocumentVersion {
  version_id: string;
  version_number: number;
  created_at: string;
}

export interface Tag {
  tagId?: string;
  id?: string;
  tagName?: string;
  name?: string;
}

export default function DocumentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const [doc, setDoc] = useState<any>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);

  // Metadata Edit States
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Add Metadata States
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  // Add Tags States
  const [newTagInput, setNewTagInput] = useState('');
  const [addingTag, setAddingTag] = useState(false);

  // Version Upload States
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
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

  const fetchData = async () => {
    try {
      setLoading(true);
      
      let versionsData = [];
      try {
        versionsData = await getDocumentVersions(documentId);
      } catch (e) {
        console.warn("Versions endpoint might not be ready", e);
      }

      const [docData, tagsData] = await Promise.all([
        getDocumentById(documentId),
        getDocumentTags(documentId),
      ]);
      
      setDoc(docData);
      setTags(tagsData || []);
      setVersions(versionsData || []);
    } catch (error) {
      console.error("Error fetching document data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (documentId) {
      fetchData();
    }
  }, [documentId]);

  const handleUpdateMeta = async (key: string) => {
    try {
      await updateMetadata(documentId, key, editValue);
      setEditingKey(null);
      fetchData(); // reload
    } catch (error) {
      console.error("Failed to update metadata", error);
      alert("Failed to update metadata");
    }
  };

  const handleDeleteMeta = async (key: string) => {
    if (!confirm("Are you sure you want to delete this metadata?")) return;
    try {
      await deleteMetadata(documentId, key);
      fetchData(); // reload
    } catch (error) {
      console.error("Failed to delete metadata", error);
      alert("Failed to delete metadata");
    }
  };

  const handleAddMeta = async () => {
    if (!newKey.trim() || !newValue.trim()) {
      alert("Key and Value are required");
      return;
    }
    try {
      await addMetadata(documentId, newKey, newValue);
      setIsAdding(false);
      setNewKey('');
      setNewValue('');
      fetchData(); // reload
    } catch (error) {
      console.error("Failed to add metadata", error);
      alert("Failed to add metadata. Key might already exist.");
    }
  };

  const handleAddTag = async () => {
    if (!newTagInput.trim() || !doc) return;

    try {
      setAddingTag(true);
      const newTag = await addTagToDocument(documentId, newTagInput.trim());
      setTags([...tags, newTag]);
      setNewTagInput('');
    } catch (err) {
      console.error('Error adding tag:', err);
      // Optimistic update fallback for UI testing
      const mockTag = { tagId: Date.now().toString(), tagName: newTagInput.trim() };
      setTags([...tags, mockTag]);
      setNewTagInput('');
    } finally {
      setAddingTag(false);
    }
  };

  const handleUploadNewVersion = async () => {
    if (!newVersionFile || !doc) return;

    try {
      setUploadingVersion(true);
      setUploadError(null);
      setUploadSuccess(null);
      const newVersion = await uploadNewVersion(documentId, newVersionFile);
      setVersions([newVersion, ...versions]);
      setUploadSuccess('New version uploaded successfully!');
      setUploadDialogOpen(false);
      setNewVersionFile(null);
      setTimeout(() => setUploadSuccess(null), 3000);
      fetchData(); // refresh doc state
    } catch (err) {
      console.error('Error uploading version:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload new version';
      setUploadError(errorMessage);
    } finally {
      setUploadingVersion(false);
    }
  };

  const handleDownloadVersion = async (versionId: string) => {
    if (!doc) return;

    try {
      setDownloadingVersionId(versionId);
      const blob = await downloadDocumentVersion(documentId, versionId);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${doc.title || 'document'}-v${versionId.substring(0, 8)}`;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading version:', err);
      alert(err instanceof Error ? err.message : 'Failed to download version');
    } finally {
      setDownloadingVersionId(null);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!doc || versionId === doc.current_version_id) return;

    try {
      setRestoringVersionId(versionId);
      await restoreDocumentVersion(documentId, versionId);
      setDoc({ ...doc, current_version_id: versionId });
      alert('Version restored successfully');
      fetchData();
    } catch (err) {
      console.error('Error restoring version:', err);
      alert(err instanceof Error ? err.message : 'Failed to restore version');
    } finally {
      setRestoringVersionId(null);
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (!doc) return;

    if (versions.length <= 1) {
      alert('Cannot delete the only version of a document');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this version?')) return;

    try {
      setDeletingVersionId(versionId);
      await deleteDocumentVersion(documentId, versionId);
      setVersions(versions.filter((v) => v.version_id !== versionId));
      alert('Version deleted successfully');
    } catch (err) {
      console.error('Error deleting version:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete version');
    } finally {
      setDeletingVersionId(null);
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

  if (loading && !doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#8a3c26]" />
        <span className="ml-3 text-lg font-medium text-gray-600">Loading document...</span>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-500">Document not found</div>
      </div>
    );
  }

  // Map metadata array into a key-value object for easy lookup
  const metaObj: Record<string, string> = {};
  let displayStatus = "Pending";
  let displayOwner = "System Admin";

  if (doc.metadata && Array.isArray(doc.metadata)) {
    doc.metadata.forEach((m: any) => {
      // Keep the EXACT key for saving/updating back to the database!
      metaObj[m.key] = m.value;
      
      // Capture these specific keys ignoring case for the header
      const lowerKey = m.key.toLowerCase();
      if (lowerKey === "status") displayStatus = m.value;
      if (lowerKey === "owner") displayOwner = m.value;
    });
  }

  // Fallback info if not available in DB
  const displayDate = doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "Just now";

  return (
    <div className="min-h-screen bg-gray-100 p-6 relative">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#8a3c26] mb-2 flex items-center gap-3">
             <button onClick={() => router.back()} className="text-gray-400 hover:text-[#8a3c26] transition-colors"><ArrowLeft className="w-6 h-6" /></button>
            {doc.title || "Untitled Document"}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>{displayOwner}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{displayDate}</span>
            </div>
            <Badge className={`${
              displayStatus.toLowerCase() === 'approved' 
                ? 'bg-[#8a3c26] hover:bg-[#70301d]' 
                : 'bg-[#Eab308] hover:bg-[#ca8a04]'
            } text-white`}>
              {displayStatus}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-white">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" className="bg-white">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button className="bg-[#8a3c26] hover:bg-[#70301d] text-white" onClick={() => setUploadDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            New Version
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (PDF Preview & Approval Actions) */}
        <div className="lg:col-span-2 space-y-6">
          {/* PDF Preview Placeholder */}
          <div className="bg-[#f4f4f5] border border-gray-200 rounded-lg flex flex-col items-center justify-center min-h-[600px]">
            <FileText className="w-16 h-16 text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-700">
              PDF Document Preview
            </h3>
            <p className="text-sm text-gray-500">Preview not available for {doc.title}</p>
          </div>

          <ApprovalAction />
        </div>

        {/* Right Column (Side Panels) */}
        <div className="space-y-6">
          {/* Document Information Card */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">
                Document Information
              </CardTitle>
              {!isAdding && (
                <Button variant="ghost" size="icon" onClick={() => setIsAdding(true)} className="h-8 w-8 text-[#8a3c26]">
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Add New Metadata Inline Form */}
              {isAdding && (
                <div className="p-3 border border-[#8a3c26]/20 bg-[#8a3c26]/5 rounded-lg space-y-3 mb-4">
                  <div className="text-xs font-semibold text-[#8a3c26] mb-1">Add Metadata</div>
                  <Input 
                    placeholder="Key (e.g. Department)" 
                    value={newKey} 
                    onChange={e => setNewKey(e.target.value)} 
                    className="h-8 text-sm"
                  />
                  <Input 
                    placeholder="Value (e.g. HR)" 
                    value={newValue} 
                    onChange={e => setNewValue(e.target.value)} 
                    className="h-8 text-sm"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsAdding(false)}>Cancel</Button>
                    <Button size="sm" className="h-7 text-xs bg-[#8a3c26] hover:bg-[#70301d]" onClick={handleAddMeta}>Save</Button>
                  </div>
                </div>
              )}

              {Object.keys(metaObj).length === 0 ? (
                <div className="text-sm text-gray-500 italic">No metadata available</div>
              ) : (
                Object.entries(metaObj).map(([key, value]) => {
                  const lowerKey = key.toLowerCase();
                  if (lowerKey === 'status' || lowerKey === 'owner') return null; // We show these in the header already
                  
                  const isEditing = editingKey === key;
                  const isSystemKey = lowerKey === 'file-size' || lowerKey === 'content-type' || lowerKey === 'word-count';

                  return (
                    <div className="space-y-1.5 group" key={key}>
                      <div className="flex items-center justify-between">
                        <Label className="text-gray-600 capitalize">
                          {key.replace(/_/g, ' ')}
                        </Label>
                        
                        {/* Actions (Only show for non-system keys, visible on hover) */}
                        {!isSystemKey && !isEditing && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <button onClick={() => { setEditingKey(key); setEditValue(value); }} className="p-1 text-gray-400 hover:text-blue-600">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteMeta(key)} className="p-1 text-gray-400 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        {isEditing && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleUpdateMeta(key)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingKey(null)} className="p-1 text-gray-500 hover:bg-gray-100 rounded">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <Input 
                          value={editValue} 
                          onChange={(e) => setEditValue(e.target.value)} 
                          className="border-green-300 focus-visible:ring-green-200" 
                          autoFocus
                        />
                      ) : (
                        <Input value={value} readOnly className="bg-gray-50/50 outline-none focus-visible:ring-0 cursor-default" />
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Tags Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <span className="transform rotate-45">🏷️</span> Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 items-center mb-3">
                {tags.length === 0 ? (
                  <span className="text-sm text-gray-500 italic">No tags attached</span>
                ) : (
                  tags.map(t => (
                    <Badge key={t.id || t.tagId || t.name || t.tagName} variant="outline" className="text-gray-700 bg-gray-50">
                      {t.tagName || t.name}
                    </Badge>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter tag name..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleAddTag();
                  }}
                  className="h-8 text-sm"
                />
                <Button
                  onClick={handleAddTag}
                  disabled={addingTag || !newTagInput.trim()}
                  variant="outline" size="sm" className="h-8 text-xs text-[#8a3c26]"
                >
                  {addingTag ? <Loader2 className="w-3 h-3 animate-spin"/> : <Plus className="w-3 h-3 mr-1" />} Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Version History Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                ⏱️ Version History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-80 overflow-y-auto pr-1">
              
              {versions.length === 0 ? (
                <div className="text-sm text-gray-500 italic text-center py-4">No version history available</div>
              ) : (
                versions.map((version) => (
                  <div
                    key={version.version_id}
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      version.version_id === doc.current_version_id
                        ? 'border-[#8a3c26]/50 bg-[#8a3c26]/5'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">v{version.version_number}</span>
                        {version.version_id === doc.current_version_id && (
                          <Badge className="bg-[#8a3c26] hover:bg-[#70301d] text-[10px] h-5">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDateTime(version.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-gray-500 hover:text-blue-600 h-8 w-8"
                        onClick={() => handleDownloadVersion(version.version_id)}
                        disabled={downloadingVersionId === version.version_id}
                        title="Download"
                      >
                         {downloadingVersionId === version.version_id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4" />}
                      </Button>
                      
                      {version.version_id !== doc.current_version_id && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-gray-500 hover:text-green-600 h-8 w-8"
                          onClick={() => handleRestoreVersion(version.version_id)}
                          disabled={restoringVersionId === version.version_id}
                          title="Restore this version"
                        >
                          {restoringVersionId === version.version_id ? <Loader2 className="w-4 h-4 animate-spin"/> : <RotateCcw className="w-4 h-4" />}
                        </Button>
                      )}
                      
                      {versions.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-gray-500 hover:text-red-600 h-8 w-8"
                          onClick={() => handleDeleteVersion(version.version_id)}
                          disabled={deletingVersionId === version.version_id}
                          title="Delete version"
                        >
                          {deletingVersionId === version.version_id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}

            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Upload New Version Panel */}
      {uploadDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Upload New Version</h3>
                <p className="text-sm text-gray-500 mt-0.5">Select a file to replace the current version</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setUploadDialogOpen(false); setNewVersionFile(null); setUploadError(null); }} className="text-gray-400 hover:text-gray-600 h-8 w-8">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {uploadError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{uploadError}</p>
                </div>
              )}

              {/* Drag and Drop Zone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                  isDragActive
                    ? 'border-[#8a3c26] bg-[#8a3c26]/5 scale-[0.99]'
                    : 'border-gray-300 hover:border-[#8a3c26] hover:bg-gray-50'
                }`}
              >
                <input {...getInputProps()} />
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Upload className="w-6 h-6 text-gray-500" />
                </div>
                {isDragActive ? (
                  <p className="text-gray-700 font-medium">Drop the file here to upload...</p>
                ) : (
                  <>
                    <p className="text-gray-800 font-medium mb-1">Drag & drop your file here</p>
                    <p className="text-sm text-gray-500 mb-4">or click to browse from your computer</p>
                    <div className="text-xs text-gray-400 font-medium px-3 py-1 bg-gray-100 rounded-full inline-block">Max size: 100MB</div>
                  </>
                )}
              </div>

              {/* Selected File */}
              {newVersionFile && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 bg-white rounded shadow-sm text-blue-600">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-blue-900 truncate">{newVersionFile.name}</p>
                      <p className="text-xs text-blue-700 mt-0.5">
                        {(newVersionFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setNewVersionFile(null); }} className="text-blue-400 hover:text-blue-700 hover:bg-blue-100 h-8 w-8 shrink-0">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50">
              <Button variant="outline" onClick={() => { setUploadDialogOpen(false); setNewVersionFile(null); setUploadError(null); }}>
                Cancel
              </Button>
              <Button 
                onClick={handleUploadNewVersion}
                disabled={!newVersionFile || uploadingVersion}
                className="bg-[#8a3c26] text-white hover:bg-[#70301d] min-w-[140px]"
              >
                {uploadingVersion ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload Version'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success notification toast */}
      {uploadSuccess && !uploadDialogOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl shadow-xl animate-in slide-in-from-bottom-5">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm font-medium text-green-800 pr-2">{uploadSuccess}</p>
        </div>
      )}
    </div>
  );
}