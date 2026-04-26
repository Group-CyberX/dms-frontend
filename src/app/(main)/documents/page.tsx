'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UploadDocumentDialog } from '@/components/ui/upload-document-dialog';
import { Plus, Folder, Eye, Download, Edit2, FileText, Loader, Share2 } from 'lucide-react';
import { getDocuments, Document, getFolders, Folder as FolderType } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

export default function DocumentsPage() {
  const router = useRouter();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    fetchData();
  }, [router]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const [docsData, foldersData] = await Promise.all([
        getDocuments(),
        getFolders(),
      ]);
      setDocuments(Array.isArray(docsData) ? docsData : []);
      setFolders(Array.isArray(foldersData) ? foldersData : []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load documents or folders');
      setDocuments([]);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate document count per folder
  const getFolderDocumentCount = (folderId: string | null) => {
    if (folderId === null) {
      return documents.filter(doc => !doc.is_deleted).length;
    }
    return documents.filter(doc => doc.folder_id === folderId && !doc.is_deleted).length;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getFileType = (filename: string) => {
    const ext = filename.split('.').pop()?.toUpperCase() || 'FILE';
    return ext;
  };

  // Filter documents based on search query and selected folder
  const filteredDocuments = documents.filter(doc => {
    if (doc.is_deleted) return false;
    
    if (selectedFolderId !== null && doc.folder_id !== selectedFolderId) {
      return false;
    }
    
    if (searchQuery && !doc.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  return (
    <div className="min-h-screen w-full bg-gray-100">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
              <p className="text-gray-600 text-sm mt-1">Manage and organize your documents</p>
            </div>
            <Button
              onClick={() => setUploadDialogOpen(true)}
              className="bg-[#953002] hover:bg-[#7a2401] text-white font-medium px-6 h-10 rounded-md shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="space-y-6">
          {/* Folders Section - Real Data */}
          {!loading && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Folder className="w-5 h-5" />
                Folders ({folders.length + 1})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* All Documents Folder */}
                <div
                  onClick={() => setSelectedFolderId(null)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    selectedFolderId === null
                      ? 'border-2 border-[#953002] bg-amber-50 shadow-md'
                      : 'border border-gray-200 hover:shadow-md hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Folder className="w-8 h-8 text-[#953002] flex-shrink-0 mt-1" />
                    <div>
                      <p className={`font-medium ${
                        selectedFolderId === null ? 'text-[#953002]' : 'text-gray-900'
                      }`}>All Documents</p>
                      <p className="text-sm text-gray-600">
                        {getFolderDocumentCount(null)} files
                      </p>
                    </div>
                  </div>
                </div>

                {/* Individual Folders */}
                {folders.map((folder) => (
                  <div
                    key={folder.folder_id}
                    onClick={() => setSelectedFolderId(folder.folder_id)}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${
                      selectedFolderId === folder.folder_id
                        ? 'border-2 border-[#953002] bg-amber-50 shadow-md'
                        : 'border border-gray-200 hover:shadow-md hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Folder className="w-8 h-8 text-[#953002] flex-shrink-0 mt-1" />
                      <div>
                        <p className={`font-medium ${
                          selectedFolderId === folder.folder_id ? 'text-[#953002]' : 'text-gray-900'
                        }`}>{folder.name}</p>
                        <p className="text-sm text-gray-600">
                          {getFolderDocumentCount(folder.folder_id)} files
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedFolderId !== null 
                  ? folders.find(f => f.folder_id === selectedFolderId)?.name || 'Documents'
                  : 'All Documents'
                }
              </h2>
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="sm:w-64 bg-gray-50 border-gray-300 h-10"
              />
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader className="w-8 h-8 text-[#953002] animate-spin mb-4" />
                <p className="text-gray-600">Loading documents...</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="text-center py-12">
                <p className="text-red-600 font-medium">{error}</p>
                <button
                  onClick={fetchData}
                  className="mt-4 px-4 py-2 bg-[#953002] text-white rounded hover:bg-[#7a2401] transition"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredDocuments.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No documents yet</p>
                <p className="text-gray-500 text-sm">Upload your first document to get started</p>
              </div>
            )}

            {/* Documents Table */}
            {!loading && !error && filteredDocuments.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Title</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Created</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Locked</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((doc) => (
                      <tr 
                        key={doc.document_id} 
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/documents/${doc.document_id}`)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <FileIcon type={getFileType(doc.title)} />
                            <div>
                              <p className="font-medium text-gray-900 hover:text-[#953002]">{doc.title}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{getFileType(doc.title)}</td>
                        <td className="py-3 px-4 text-gray-600">{formatDate(doc.created_at)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            doc.is_locked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {doc.is_locked ? 'Locked' : 'Unlocked'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button className="p-1 hover:bg-gray-200 rounded transition" title="View">
                              <Eye className="w-4 h-4 text-gray-600" />
                            </button>
                            <button className="p-1 hover:bg-gray-200 rounded transition" title="Edit">
                              <Edit2 className="w-4 h-4 text-gray-600" />
                            </button>
                            <button className="p-1 hover:bg-gray-200 rounded transition" title="Download">
                              <Download className="w-4 h-4 text-gray-600" />
                            </button>
                            <button className="p-1 hover:bg-gray-200 rounded transition" title="Share">
                              <Share2 className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Dialog */}
      <UploadDocumentDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadSuccess={fetchData}
      />
    </div>
  );
}

function FileIcon({ type }: { type: string }) {
  return (
    <div className="flex-shrink-0">
      <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
        <FileText className="w-5 h-5 text-gray-600" />
      </div>
    </div>
  );
}
