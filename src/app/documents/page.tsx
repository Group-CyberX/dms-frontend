'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UploadDocumentDialog } from '@/components/ui/upload-document-dialog';
import { Plus, Folder, Eye, Download, Edit2, FileText } from 'lucide-react';

export default function DocumentsPage() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const folders = [
    { name: 'Invoices', count: 245 },
    { name: 'Contracts', count: 89 },
    { name: 'Purchase Orders', count: 156 },
    { name: 'Quality Certificates', count: 67 },
  ];

  const documents = [
    {
      id: 1,
      name: 'Invoice_Q1_2025.pdf',
      size: '2.4 MB',
      type: 'PDF',
      owner: 'John Doe',
      modified: 'Feb 5, 2026',
      status: 'Approved',
      statusColor: 'bg-amber-700 text-white',
    },
    {
      id: 2,
      name: 'Contract_Vendor_ABC.pdf',
      size: '1.9 MB',
      type: 'PDF',
      owner: 'Jane Smith',
      modified: 'Feb 4, 2026',
      status: 'Pending Approval',
      statusColor: 'bg-amber-400 text-white',
    },
    {
      id: 3,
      name: 'Purchase_Order_12345.xlsx',
      size: '512 KB',
      type: 'Excel',
      owner: 'Mike Johnson',
      modified: 'Feb 3, 2026',
      status: 'Draft',
      statusColor: 'bg-gray-200 text-gray-800',
    },
    {
      id: 4,
      name: 'Quality_Report_Jan.pdf',
      size: '3.1 MB',
      type: 'PDF',
      owner: 'Sarah Williams',
      modified: 'Feb 2, 2026',
      status: 'Approved',
      statusColor: 'bg-amber-700 text-white',
    },
    {
      id: 5,
      name: 'Employee_Contract.docx',
      size: '890 KB',
      type: 'Word',
      owner: 'John Doe',
      modified: 'Feb 1, 2026',
      status: 'Pending Approval',
      statusColor: 'bg-amber-400 text-white',
    },
  ];

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
          {/* Folders Section */}
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

          {/* All Documents Section */}
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

            {/* Documents Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Owner</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Last Modified</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <FileIcon type={doc.type} />
                          <div>
                            <p className="font-medium text-gray-900">{doc.name}</p>
                            <p className="text-xs text-gray-500">{doc.size}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{doc.type}</td>
                      <td className="py-3 px-4 text-gray-600">{doc.owner}</td>
                      <td className="py-3 px-4 text-gray-600">{doc.modified}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${doc.statusColor}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button className="p-1 hover:bg-gray-200 rounded transition">
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                          <button className="p-1 hover:bg-gray-200 rounded transition">
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                          <button className="p-1 hover:bg-gray-200 rounded transition">
                            <Download className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
