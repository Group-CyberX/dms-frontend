"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ApprovalAction from '@/components/ui/search/aproval-action';

// Using your existing api imports along with the new required ones
// Note: You will need to ensure `uploadNewVersion`, `downloadDocumentVersion`, etc exist in `@/lib/api` or change the import explicitly.
import { 
  getDocumentById, 
  getDocumentTags, 
  updateMetadata, 
  deleteMetadata, 
  addMetadata,
  // Make sure these are exported from your api.ts or api-client.ts
  getDocumentVersions,
  addTagToDocument,
  uploadNewVersion,
  downloadDocumentVersion,
  restoreDocumentVersion,
  deleteDocumentVersion
} from '@/lib/api'; 

import {
  ArrowLeft,
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
  Share2,
  User,
  Plus,
  Edit2,
  Check
} from 'lucide-react';

export default function DocumentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  // Base Data States
  const [doc, setDoc] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Metadata Edit States
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isAddingMeta, setIsAddingMeta] = useState(false);
  const [newMetaKey, setNewMetaKey] = useState('');
  const [newMetaValue, setNewMetaValue] = useState('');

  // Version & Tag States
  const [newTagInput, setNewTagInput] = useState('');
  const [addingTag, setAddingTag] = useState(false);
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
      const [docData, tagsData] = await Promise.all([
        getDocumentById(documentId),
        getDocumentTags(documentId),
      ]);
      
      setDoc(docData);
      setTags(tagsData || []);
      
      // If version functionality is implemented in your API
      try {
        const versionsData = await getDocumentVersions(documentId);
        setVersions(versionsData || []);
      } catch(e) {
        console.warn("Could not load versions", e);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching document:', err);
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (documentId) {
      fetchData();
    }
  }, [documentId]);

  // -- Metadata Functions --

  const handleUpdateMeta = async (key: string) => {
    try {
      await updateMetadata(documentId, key, editValue);
      setEditingKey(null);
      fetchData(); 
    } catch (error) {
      console.error("Failed to update metadata", error);
      alert("Failed to update metadata");
    }
  };

  const handleDeleteMeta = async (key: string) => {
    if (!confirm("Are you sure you want to delete this metadata?")) return;
    try {
      await deleteMetadata(documentId, key);
      fetchData(); 
    } catch (error) {
      console.error("Failed to delete metadata", error);
      alert("Failed to delete metadata");
    }
  };

  const handleAddMeta = async () => {
    if (!newMetaKey.trim() || !newMetaValue.trim()) {
      alert("Key and Value are required");
      return;
    }
    try {
      await addMetadata(documentId, newMetaKey, newMetaValue);
      setIsAddingMeta(false);
      setNewMetaKey('');
      setNewMetaValue('');
      fetchData();
    } catch (error) {
      console.error("Failed to add metadata", error);
      alert("Failed to add metadata. Key might already exist.");
    }
  };

  // -- Version Control & Tag Functions --

  const handleAddTag = async () => {
    if (!newTagInput.trim() || !doc) return;
    try {
      setAddingTag(true);
      const newTag = await addTagToDocument(doc.document_id || documentId, newTagInput.trim());
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
    if (!newVersionFile || !doc) return;
    try {
      setUploadingVersion(true);
      setUploadError(null);
      setUploadSuccess(null);
      const newVersion = await uploadNewVersion(doc.document_id || documentId, newVersionFile);
      setVersions([newVersion, ...versions]);
      setUploadSuccess('New version uploaded successfully!');
      setUploadDialogOpen(false);
      setNewVersionFile(null);
      setTimeout(() => setUploadSuccess(null), 3000);
    } catch (err) {
      console.error('Error uploading version:', err);
      setUploadError(err instanceof Error ? err.message : 'Failed to upload new version');
    } finally {
      setUploadingVersion(false);
    }
  };

  const handleDownloadVersion = async (versionId: string) => {
    if (!doc) return;
    try {
      setDownloadingVersionId(versionId);
      const blob = await downloadDocumentVersion(doc.document_id || documentId, versionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.title}-v${versionId.substring(0, 8)}`;
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
    if (!doc || versionId === doc.current_version_id) return;
    try {
      setRestoringVersionId(versionId);
      await restoreDocumentVersion(doc.document_id || documentId, versionId);
      setDoc({ ...doc, current_version_id: versionId });
      alert('Version restored successfully');
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
    if (!confirm('Are you sure you want to delete this version?')) return;

    try {
      setDeletingVersionId(versionId);
      await deleteDocumentVersion(doc.document_id || documentId, versionId);
      setVersions(versions.filter((v) => v.version_id !== versionId));
      alert('Version deleted successfully');
    } catch (err) {
      console.error('Error deleting version:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete version');
    } finally {
      setDeletingVersionId(null);
    }
  };

  // Helper formatting parsing
  const getFileExtension = (fileName: string): string => {
    const match = fileName?.match(/\.(\w+)$/);
    return match ? match[1].toUpperCase() : 'FILE';
  };

  const formatDateTime = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateString;
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

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-[#953002] hover:text-[#7a2401] mb-4">
            <ArrowLeft className="w-4 h-4" /> Back
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

  const metaObj: Record<string, string> = {};
  let displayStatus = "Pending";
  let displayOwner = "System Admin";

  if (doc?.metadata && Array.isArray(doc.metadata)) {
    doc.metadata.forEach((m: any) => {
      metaObj[m.key] = m.value;
      const lowerKey = m.key.toLowerCase();
      if (lowerKey === "status") displayStatus = m.value;
      if (lowerKey === "owner") displayOwner = m.value;
    });
  }

  const displayDate = doc?.created_at ? new Date(doc.created_at).toLocaleDateString() : "Just now";
  const fileExtension = doc?.title ? getFileExtension(doc.title) : 'FILE';

  return (
    <div className="min-h-screen w-full bg-gray-100 p-6">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-2 text-[#953002] hover:text-[#7a2401] mb-4 font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Documents
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{doc.title || "Untitled Document"}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1"><User className="w-4 h-4" /><span>{displayOwner}</span></div>
            <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /><span>{displayDate}</span></div>
            <Badge className={`${displayStatus.toLowerCase() === 'approved' ? 'bg-[#8a3c26] hover:bg-[#70301d]' : 'bg-[#Eab308] hover:bg-[#ca8a04]'} text-white`}>
              {displayStatus}
            </Badge>
            {doc.is_locked && <Lock className="w-4 h-4 text-gray-600" />}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-white">
            <Share2 className="w-4 h-4 mr-2" /> Share
          </Button>
          <Button className="bg-[#953002] hover:bg-[#7a2401] text-white" onClick={() => doc.current_version_id && handleDownloadVersion(doc.current_version_id)}>
            <Download className="w-4 h-4 mr-2" /> Download
          </Button>
          <Button className="bg-[#953002] hover:bg-[#7a2401] text-white" onClick={() => setUploadDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" /> New Version
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="flex flex-col items-center justify-center min-h-[500px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <FileText className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-gray-600 font-medium">{fileExtension} Document Preview</p>
              <p className="text-sm text-gray-500 mt-2">{doc.title}</p>
            </div>
          </div>
          <ApprovalAction />
        </div>

        {/* Right Column */}
        <div className="space-y-6">

          {/* Metadata Extracted Information */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Document Information</CardTitle>
              {!isAddingMeta && (
                <Button variant="ghost" size="icon" onClick={() => setIsAddingMeta(true)} className="h-8 w-8 text-[#8a3c26]">
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              
              {isAddingMeta && (
                <div className="p-3 border border-[#8a3c26]/20 bg-[#8a3c26]/5 rounded-lg space-y-3 mb-4">
                  <div className="text-xs font-semibold text-[#8a3c26] mb-1">Add Metadata</div>
                  <Input placeholder="Key (e.g. Department)" value={newMetaKey} onChange={e => setNewMetaKey(e.target.value)} className="h-8 text-sm" />
                  <Input placeholder="Value (e.g. HR)" value={newMetaValue} onChange={e => setNewMetaValue(e.target.value)} className="h-8 text-sm" />
                  <div className="flex justify-end gap-2 mt-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsAddingMeta(false)}>Cancel</Button>
                    <Button size="sm" className="h-7 text-xs bg-[#8a3c26] hover:bg-[#70301d]" onClick={handleAddMeta}>Save</Button>
                  </div>
                </div>
              )}

              {Object.keys(metaObj).length === 0 ? (
                <div className="text-sm text-gray-500 italic">No metadata available</div>
              ) : (
                Object.entries(metaObj).map(([key, value]) => {
                  const lowerKey = key.toLowerCase();
                  if (lowerKey === 'status' || lowerKey === 'owner') return null; 
                  
                  const isEditing = editingKey === key;
                  const isSystemKey = lowerKey === 'file-size' || lowerKey === 'content-type' || lowerKey === 'word-count';

                  return (
                    <div className="space-y-1.5 group" key={key}>
                      <div className="flex items-center justify-between">
                        <Label className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</Label>
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
                            <button onClick={() => handleUpdateMeta(key)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingKey(null)} className="p-1 text-gray-500 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="border-green-300 focus-visible:ring-green-200" autoFocus />
                      ) : (
                        <Input value={value} readOnly className="bg-gray-50/50 outline-none focus-visible:ring-0 cursor-default" />
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">🏷️ Tags</h2>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 items-center">
                {tags.length === 0 ? (
                  <p className="text-sm text-gray-500">No tags yet</p>
                ) : (
                  tags.map((tag) => (
                    <Badge key={tag.id || tag.tagId || tag.name || tag.tagName} variant="outline" className="text-gray-700">
                      {tag.tagName || tag.name}
                    </Badge>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter tag name"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyPress={(e) => { if (e.key === 'Enter') handleAddTag() }}
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

          {/* Version History */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">⏱️ Version History</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {versions.length === 0 && <p className="text-sm text-gray-500 italic">No versions found</p>}
              {versions.map((version) => (
                <div key={version.version_id} className={`p-3 rounded-lg border ${version.version_id === doc.current_version_id ? 'border-[#953002] bg-orange-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">v{version.version_number}</p>
                        {version.version_id === doc.current_version_id && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#953002] text-white">Current</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDateTime(version.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleDownloadVersion(version.version_id)} disabled={downloadingVersionId === version.version_id} className="p-1 hover:bg-gray-200 rounded transition" title="Download version">
                        {downloadingVersionId === version.version_id ? <Loader2 className="w-4 h-4 text-gray-600 animate-spin" /> : <Download className="w-4 h-4 text-gray-600" />}
                      </button>
                      {version.version_id !== doc.current_version_id && (
                        <button onClick={() => handleRestoreVersion(version.version_id)} disabled={restoringVersionId === version.version_id} className="p-1 hover:bg-gray-200 rounded transition" title="Restore version">
                          {restoringVersionId === version.version_id ? <Loader2 className="w-4 h-4 text-gray-600 animate-spin" /> : <RotateCcw className="w-4 h-4 text-gray-600" />}
                        </button>
                      )}
                      {versions.length > 1 && (
                        <button onClick={() => handleDeleteVersion(version.version_id)} disabled={deletingVersionId === version.version_id} className="p-1 hover:bg-red-200 rounded transition" title="Delete version">
                          {deletingVersionId === version.version_id ? <Loader2 className="w-4 h-4 text-red-600 animate-spin" /> : <Trash2 className="w-4 h-4 text-red-600" />}
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

      {/* Upload New Version Overlay */}
      {uploadDialogOpen && (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-black/40">
          <div className="max-w-2xl w-full mx-auto bg-white rounded-lg shadow-lg border border-gray-200 m-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Upload New Version</h3>
                <p className="text-xs text-gray-600 mt-1">Select a file to upload as the next version</p>
              </div>
              <button onClick={() => { setUploadDialogOpen(false); setNewVersionFile(null); setUploadError(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {uploadError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{uploadError}</p>
                </div>
              )}
              {uploadSuccess && (
                <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-green-700">{uploadSuccess}</p>
                </div>
              )}

              <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer ${isDragActive ? 'border-[#953002] bg-amber-50' : 'border-gray-300 hover:border-[#953002]'}`}>
                <input {...getInputProps()} />
                <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                {isDragActive ? (
                  <p className="text-gray-700 font-medium">Drop file here...</p>
                ) : (
                  <>
                    <p className="text-gray-700 font-medium mb-1">Drag & drop your file here</p>
                    <p className="text-xs text-gray-500 mb-4">or click to select • Maximum size: 100MB</p>
                    <span className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition">
                      Choose File from Device
                    </span>
                  </>
                )}
              </div>

              {newVersionFile && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">{newVersionFile.name}</p>
                    <p className="text-xs text-blue-700 mt-1">{(newVersionFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button onClick={() => setNewVersionFile(null)} className="text-blue-400 hover:text-blue-600 ml-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button onClick={() => { setUploadDialogOpen(false); setNewVersionFile(null); setUploadError(null); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white font-medium transition">
                Cancel
              </button>
              <button
                onClick={handleUploadNewVersion}
                disabled={!newVersionFile || uploadingVersion}
                className="flex-1 px-4 py-2 bg-[#953002] text-white rounded-lg hover:bg-[#7a2401] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {uploadingVersion ? <div className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</div> : 'Upload Version'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {uploadSuccess && !uploadDialogOpen && (
        <div className="fixed bottom-4 right-4 z-40 flex items-start gap-2 p-4 bg-green-50 border border-green-200 rounded-lg shadow-lg">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{uploadSuccess}</p>
        </div>
      )}
    </div>
  );
}