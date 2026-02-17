'use client';

import { useState } from 'react';
import { X, Link2, Lock, Calendar, ChevronDown } from 'lucide-react';

interface ShareDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  onGenerateLink: (options: ShareLinkOptions) => void;
}

interface ShareLinkOptions {
  accessLevel: 'VIEW' | 'EDIT' | 'COMMENT';
  linkExpiry: number;
  requireAuthentication: boolean;
  allowDownload: boolean;
  allowComments: boolean;
  password?: string;
}

export default function ShareDocumentModal({
  isOpen,
  onClose,
  documentTitle,
  onGenerateLink
}: ShareDocumentModalProps) {
  const [accessLevel, setAccessLevel] = useState<'VIEW' | 'EDIT' | 'COMMENT'>('VIEW');
  const [linkExpiry, setLinkExpiry] = useState<number>(7);
  const [requireAuth, setRequireAuth] = useState(true);
  const [allowDownload, setAllowDownload] = useState(false);
  const [allowComments, setAllowComments] = useState(true);

  if (!isOpen) return null;

  const handleGenerateLink = () => {
    onGenerateLink({
      accessLevel,
      linkExpiry,
      requireAuthentication: requireAuth,
      allowDownload,
      allowComments
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-200 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-[#8B4513]" />
            <h2 className="text-lg font-semibold text-gray-800">Share Document</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Document Name */}
        <p className="text-sm text-gray-600 mb-6">
          Create a secure share link for:{' '}
          <span className="font-medium text-gray-800">{documentTitle}</span>
        </p>

        {/* Access Level */}
        <div className="mb-5">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-2">
            <Lock className="w-4 h-4" />
            Access Level
          </label>
          <div className="relative">
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value as 'VIEW' | 'EDIT' | 'COMMENT')}
              className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#8B4513] focus:border-[#8B4513] appearance-none cursor-pointer"
            >
              <option value="VIEW">View Only</option>
              <option value="EDIT">Can Edit</option>
              <option value="COMMENT">Can Comment</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Link Expiry */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-2">
            <Calendar className="w-4 h-4" />
            Link Expiry
          </label>
          <div className="relative">
            <select
              value={linkExpiry}
              onChange={(e) => setLinkExpiry(Number(e.target.value))}
              className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#8B4513] focus:border-[#8B4513] appearance-none cursor-pointer">
              <option value={1}>1 Day</option>
              <option value={7}>7 Days</option>
              <option value={30}>30 Days</option>
              <option value={90}>90 Days</option>
              <option value={365}>1 Year</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Advanced Options */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-800 mb-4">Advanced Options</h3>
          
          {/* Require Authentication */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 pr-4">
              <div className="text-sm font-medium text-gray-800">Require Authentication</div>
              <div className="text-xs text-gray-500 mt-0.5">Users must log in to access</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={requireAuth}
                onChange={(e) => setRequireAuth(e.target.checked)}
                className="sr-only peer"/>
              <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#8B4513] peer-focus:ring-offset-1 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B85C2E]"></div>
            </label>
          </div>

          {/* Allow Download */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 pr-4">
              <div className="text-sm font-medium text-gray-800">Allow Download</div>
              <div className="text-xs text-gray-500 mt-0.5">Users can download the document</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={allowDownload}
                onChange={(e) => setAllowDownload(e.target.checked)}
                className="sr-only peer"/>
              <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#8B4513] peer-focus:ring-offset-1 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B85C2E]"></div>
            </label>
          </div>

          {/* Allow Comments */}
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <div className="text-sm font-medium text-gray-800">Allow Comments</div>
              <div className="text-xs text-gray-500 mt-0.5">Users can add comments</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={allowComments}
                onChange={(e) => setAllowComments(e.target.checked)}
                className="sr-only peer"/>
              <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#8B4513] peer-focus:ring-offset-1 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B85C2E]"></div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition font-medium text-sm">
            Cancel
          </button>
          <button
            onClick={handleGenerateLink}
            className="flex-1 px-4 py-2.5 bg-[#8B4513] text-white rounded-md hover:bg-[#723910] transition font-medium text-sm">
            Generate Share Link
          </button>
        </div>
      </div>
    </div>
  );
}
