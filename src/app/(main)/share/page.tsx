'use client';

import { useState } from 'react';
import ShareDocumentModal from '@/components/modals/ShareDocumentModal';
import { Share2 } from 'lucide-react';

export default function TestSharePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleGenerateLink = (options: any) => {
    console.log('Share link options:', options);
    alert('Share link generated! Check console for options.');
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-100 rounded-lg shadow p-6">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-md hover:bg-gray-200 transition">
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>

      <ShareDocumentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}

        documentTitle="Sample.pdf"
        onGenerateLink={handleGenerateLink}
      />
    </div>
  );
}
