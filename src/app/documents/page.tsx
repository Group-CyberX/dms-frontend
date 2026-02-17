'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UploadDocumentDialog } from '@/components/ui/upload-document-dialog';
import { Plus } from 'lucide-react';

export default function DocumentsPage() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">CyberX Document Upload Feature</h1>
              <p className="text-gray-600 mt-1">Manage your uploaded documents</p>
            </div>
            <Button
              onClick={() => setUploadDialogOpen(true)}
              className="bg-[#953002] hover:bg-[#953002] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
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
