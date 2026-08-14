"use client"

import React, { useState, useEffect } from 'react';

interface ApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentName?: string;
  onConfirm: (comments: string) => void;
  loading?: boolean;
}

export const ApproveModal: React.FC<ApproveModalProps> = ({
  isOpen,
  onClose,
  documentName = "Invoice_Q1_2025.pdf",
  onConfirm,
  loading = false,
}) => {
  const [comments, setComments] = useState('');
  const [timestamp, setTimestamp] = useState('');

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setTimestamp(now.toUTCString());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-[#8B2E00] text-xl">✍️</span>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Sign & Approve</h3>
              <p className="text-xs text-slate-500 font-medium">Document: {documentName}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Approval Comments */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-700 block mb-1.5">
            Approval Comments (optional)
          </label>
          <textarea
            rows={3}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Add your comments..."
            className="w-full rounded-lg border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8B2E00]/10 focus:border-[#8B2E00] resize-none transition"
          />
        </div>

        {/* Signer Info Summary (Certificate & Notice Removed) */}
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 text-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Signer</span>
            <span className="text-slate-800 font-semibold">John Doe</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Email</span>
            <span className="text-slate-700 font-medium">john.doe@company.com</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Role</span>
            <span className="text-slate-700 font-medium">Business Process Owner</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Timestamp</span>
            <span className="text-slate-700 font-medium">{timestamp}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition shadow-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => onConfirm(comments)}
            className="rounded-lg bg-[#8B2E00] hover:bg-[#722600] disabled:opacity-50 px-5 py-2 text-xs font-bold text-white shadow-md transition-all tracking-wide"
          >
            {loading ? 'Processing...' : 'Sign & Approve'}
          </button>
        </div>

      </div>
    </div>
  );
};