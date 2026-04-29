'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Trash2, 
  RotateCcw, 
  Loader,
  FileText,
  AlertCircle
} from 'lucide-react';
import { 
  getDeletedDocuments, 
  Document, 
  restoreDocument,
  permanentlyDeleteDocument,
  restoreMultipleDocuments,
  permanentlyDeleteMultipleDocuments
} from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export default function RecycleBinPage() {
  const router = useRouter();
  const { userName } = useAuthStore();
  const [deletedDocuments, setDeletedDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchDeletedDocuments();
  }, [router]);

  useEffect(() => {
    // Filter documents based on search query and current user
    const filtered = deletedDocuments.filter(doc => {
      // Only show documents deleted by the current user
      if (userName && doc.owner_name !== userName) {
        return false;
      }
      // Filter by search query
      return doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    });
    setFilteredDocuments(filtered);
  }, [searchQuery, deletedDocuments, userName]);

  const fetchDeletedDocuments = async () => {
    try {
      setLoading(true);
      const data = await getDeletedDocuments();
      console.log('Deleted documents fetched:', data);
      console.log('Current userName from auth store:', userName);
      setDeletedDocuments(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch deleted documents:', err);
      setError('Failed to load deleted documents');
      setDeletedDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysRemaining = (deletedAt: string) => {
    const deletedDate = new Date(deletedAt);
    const today = new Date();
    const diffTime = today.getTime() - deletedDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, 30 - diffDays);
    return daysRemaining;
  };

  const isExpiringSoon = (deletedAt: string) => {
    return calculateDaysRemaining(deletedAt) <= 7 && calculateDaysRemaining(deletedAt) > 0;
  };

  const formatFileSize = (bytes: number = 0): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getTotalSize = () => {
    const totalBytes = getUserDeletedDocuments().reduce((sum, doc) => {
      return sum + (doc.file_size || 0);
    }, 0);
    return formatFileSize(totalBytes);
  };

  const getUserDeletedDocuments = () => {
    // If userName is not available, return all deleted documents
    // (assuming backend already filters by current user)
    if (!userName) {
      console.log('userName is not set, returning all deleted documents:', deletedDocuments);
      return deletedDocuments;
    }
    // Otherwise filter by owner_name
    const userDocs = deletedDocuments.filter(doc => doc.owner_name === userName);
    console.log('Filtering by userName:', userName, 'Found documents:', userDocs);
    return userDocs;
  };

  const getExpiringCount = () => {
    return getUserDeletedDocuments().filter(doc => isExpiringSoon(doc.deleted_at || doc.created_at)).length;
  };

  const toggleSelectDocument = (documentId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId);
    } else {
      newSelected.add(documentId);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDocuments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDocuments.map(doc => doc.document_id)));
    }
  };

  const handleRestoreSelected = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to restore ${selectedIds.size} document(s)?`
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError(null); // Clear any previous errors
      await restoreMultipleDocuments(Array.from(selectedIds));
      
      // Remove restored documents from list
      setDeletedDocuments(prevDocs =>
        prevDocs.filter(doc => !selectedIds.has(doc.document_id))
      );
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed to restore documents:', err);
      setError('Failed to restore documents. Please try again.');
      // Refresh the list to sync with backend state
      await fetchDeletedDocuments();
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentlyDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${selectedIds.size} document(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError(null); // Clear any previous errors
      await permanentlyDeleteMultipleDocuments(Array.from(selectedIds));
      
      // Remove deleted documents from list
      setDeletedDocuments(prevDocs =>
        prevDocs.filter(doc => !selectedIds.has(doc.document_id))
      );
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed to permanently delete documents:', err);
      setError('Failed to permanently delete documents. Please try again.');
      // Refresh the list to sync with backend state
      await fetchDeletedDocuments();
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreOne = async (documentId: string, documentTitle: string) => {
    const confirmed = window.confirm(`Restore "${documentTitle}"?`);
    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError(null); // Clear any previous errors BEFORE attempting restore
      await restoreDocument(documentId);
      
      // Remove restored document from list
      setDeletedDocuments(prevDocs =>
        prevDocs.filter(doc => doc.document_id !== documentId)
      );
    } catch (err) {
      console.error('Failed to restore document:', err);
      setError('Failed to restore document. Please try again.');
      // Refresh the list to sync with backend state
      await fetchDeletedDocuments();
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentlyDeleteOne = async (documentId: string, documentTitle: string) => {
    const confirmed = window.confirm(
      `Permanently delete "${documentTitle}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError(null); // Clear any previous errors BEFORE attempting delete
      await permanentlyDeleteDocument(documentId);
      
      // Remove deleted document from list
      setDeletedDocuments(prevDocs =>
        prevDocs.filter(doc => doc.document_id !== documentId)
      );
    } catch (err) {
      console.error('Failed to permanently delete document:', err);
      setError('Failed to permanently delete document. Please try again.');
      // Refresh the list to sync with backend state
      await fetchDeletedDocuments();
    } finally {
      setActionLoading(false);
    }
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



  return (
    <div className="min-h-screen w-full bg-gray-100">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-[#953002]">Recycle Bin</h1>
            <p className="text-gray-600 text-sm">
              Manage deleted documents - items are permanently deleted after 30 days
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="space-y-6">
          {/* Stat Cards */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Deleted Items Card */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Deleted Items</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {getUserDeletedDocuments().length}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <Trash2 className="w-8 h-8 text-red-500" />
                  </div>
                </div>
              </div>

              {/* Expiring Soon Card */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Expiring Soon</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {getExpiringCount()}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <AlertCircle className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>
              </div>

              {/* Total Size Card */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Size</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {getTotalSize()}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <FileText className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Deleted Documents Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            {/* Search and Action Bar */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Search deleted items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-50 border-gray-300 h-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleRestoreSelected}
                  disabled={selectedIds.size === 0 || actionLoading}
                  className="bg-gray-200 hover:bg-gray-300 text-black px-4 h-10 rounded-md transition-all"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore ({selectedIds.size})
                </Button>
                <Button
                  onClick={handlePermanentlyDeleteSelected}
                  disabled={selectedIds.size === 0 || actionLoading}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 h-10 rounded-md transition-all"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Permanently
                </Button>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader className="w-8 h-8 text-[#953002] animate-spin mb-4" />
                <p className="text-gray-600">Loading deleted documents...</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="text-center py-12">
                <p className="text-red-600 font-medium">{error}</p>
                <button
                  onClick={fetchDeletedDocuments}
                  className="mt-4 px-4 py-2 bg-[#953002] text-white rounded hover:bg-[#7a2401] transition"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && getUserDeletedDocuments().length === 0 && (
              <div className="text-center py-12">
                <Trash2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No deleted items</p>
                <p className="text-gray-500 text-sm">Your recycle bin is empty</p>
              </div>
            )}

            {/* Documents Table */}
            {!loading && !error && getUserDeletedDocuments().length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 w-8">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filteredDocuments.length && filteredDocuments.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Document Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Deleted By</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Deleted Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Days Remaining</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((doc) => {
                      const daysRemaining = calculateDaysRemaining(doc.deleted_at || doc.created_at);
                      const expiringSoon = isExpiringSoon(doc.deleted_at || doc.created_at);
                      
                      return (
                        <tr 
                          key={doc.document_id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(doc.document_id)}
                              onChange={() => toggleSelectDocument(doc.document_id)}
                              className="w-4 h-4 rounded cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 text-gray-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{doc.title}</p>
                                {doc.folder_id && (
                                  <p className="text-xs text-gray-500">Folder ID: {doc.folder_id}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-gray-600">{doc.owner_name}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-gray-600">{formatDate(doc.deleted_at || doc.created_at)}</p>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-900 font-medium">{daysRemaining}</span>
                              {expiringSoon && (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                                  Expiring
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRestoreOne(doc.document_id, doc.title)}
                                disabled={actionLoading}
                                className="p-1 hover:bg-blue-100 rounded transition disabled:opacity-50"
                                title="Restore"
                              >
                                <RotateCcw className="w-4 h-4 text-blue-600" />
                              </button>
                              <button
                                onClick={() => handlePermanentlyDeleteOne(doc.document_id, doc.title)}
                                disabled={actionLoading}
                                className="p-1 hover:bg-red-100 rounded transition disabled:opacity-50"
                                title="Delete Permanently"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
