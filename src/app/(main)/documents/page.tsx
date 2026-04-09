'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UploadDocumentDialog } from '@/components/ui/upload-document-dialog';
import { Plus, Folder, Eye, Download, Edit2, FileText, Loader } from 'lucide-react';
import { getDocuments, Document } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

export default function DocumentsPage() {
  const router = useRouter();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    fetchDocuments();
  }, [router]);
  
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await getDocuments();
      setDocuments(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setError('Failed to load documents');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const folders = [
    { name: 'Invoices', count: 245 },
    { name: 'Contracts', count: 89 },
    { name: 'Purchase Orders', count: 156 },
    { name: 'Quality Certificates', count: 67 },
  ];

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

      {/* Main Content with mock data*/}
      <div className="p-6">
        <div className="space-y-6">
          {/* Folders Section with mock data */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Folder className="w-5 h-5" />
              Folders
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {folders.map((folder) => (
                <div
                  key={folder.name}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md hover:border-gray-300 cursor-pointer transition-all"
                >
                  <div className="flex items-start gap-3">
                    <Folder className="w-8 h-8 text-[#953002] flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">{folder.name}</p>
                      <p className="text-sm text-gray-600">{folder.count} files</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* All Documents Section with mock data */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <h2 className="text-lg font-semibold text-gray-900">All Documents</h2>
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
                  onClick={fetchDocuments}
                  className="mt-4 px-4 py-2 bg-[#953002] text-white rounded hover:bg-[#7a2401] transition"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && documents.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No documents yet</p>
                <p className="text-gray-500 text-sm">Upload your first document to get started</p>
              </div>
            )}

            {/* Documents Table */}
            {!loading && !error && documents.length > 0 && (
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
                    {documents.map((doc) => (
                      <tr key={doc.document_id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <FileIcon type={getFileType(doc.title)} />
                            <div>
                              <p className="font-medium text-gray-900">{doc.title}</p>
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
