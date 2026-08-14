"use client"

import React, { useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { SignatureModal } from './SignatureModal';
import { signatureService } from "@/lib/signatureService";

// =========================================================================
// 1. TYPE DEFINITIONS
// =========================================================================

/**
 * Represents a single signature placed on a specific document page.
 */
interface Placement {
  id: string;           // Unique identifier for the placed signature instance
  x: number;            // Horizontal position (px relative to the page container)
  y: number;            // Vertical position (px relative to the page container)
  width: number;        // Box width in pixels
  height: number;       // Box height in pixels
  signatureUrl: string; // Base64 data URL or SVG of the signature
  page: number;         // 👈 Tracks which page number this signature belongs to
}

/**
 * Props for the confirmation modal shown when clicking "Save & Approve"
 */
interface ApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentName?: string;
  onConfirm: (comments: string) => void;
  loading?: boolean;
}

// =========================================================================
// 2. APPROVE MODAL COMPONENT (CLEANED: NO CERTIFICATE / NO DIGITAL NOTICE)
// =========================================================================

const ApproveModal: React.FC<ApproveModalProps> = ({
  isOpen,
  onClose,
  documentName = "Invoice_Q1_2025.pdf",
  onConfirm,
  loading = false,
}) => {
  const [comments, setComments] = useState('');
  const [timestamp, setTimestamp] = useState('');

  // Generate current UTC timestamp whenever the modal is opened
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setTimestamp(now.toUTCString());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    // Semi-transparent backdrop with blur
    <div 
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
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

        {/* Approval Comments Textarea */}
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

        {/* Signer Information Box (Removed Certificate & Legal Notice blocks) */}
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

        {/* Modal Footer Buttons */}
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

// =========================================================================
// 3. MAIN SIGNATURE WORKSPACE COMPONENT
// =========================================================================

export const SignatureWorkspace: React.FC = () => {
  // Modal visibility states
  const [isModalOpen, setIsModalOpen] = useState(false);                  // Create/Change signature modal
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);    // Final approval modal
  const [isSubmitting, setIsSubmitting] = useState(false);                // Loading state during API submission

  // Signature and placement data
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  
  // 👈 Pagination State: controls current active page view
  const [currentPage, setCurrentPage] = useState<number>(1);
  const totalPages = 3;

  const mockUserId = "86ee0da4-69ff-4ea5-91ed-c7cfe411f0d9"; 

  // Load existing saved signature from backend on mount
  useEffect(() => {
    const loadSavedSignatures = async () => {
      try {
        const saved = await signatureService.getUserSignatures(mockUserId);
        if (saved && saved.length > 0) {
          const defaultSig = saved.find((s: any) => s.isDefault) || saved[0];
          setSavedSignature(`data:image/png;base64,${defaultSig.signatureImage}`);
        }
      } catch (err) {
        console.error("Could not load user profile signatures:", err);
      }
    };
    loadSavedSignatures();
  }, [mockUserId]);

  // Places a new signature box onto the currently viewed page
  const handleAddToPage = () => {
    const activeSignature = savedSignature || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='60'><text x='50%' y='50%' font-weight='bold' font-family='sans-serif' font-size='16' fill='%2364748b' text-anchor='middle' alignment-baseline='middle'>John Doe</text></svg>";

    const newPlacement: Placement = {
      id: `sig-${Date.now()}`,
      x: 280, 
      y: 450,
      width: 150,
      height: 60,
      signatureUrl: activeSignature,
      page: currentPage // 👈 Associate placement specifically with the active page
    };
    
    setPlacements((prev) => [...prev, newPlacement]);
  };

  // Removes a signature placement by ID
  const removePlacement = (id: string) => {
    setPlacements((prev) => prev.filter(p => p.id !== id));
  };

  // Pagination navigation helpers
  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  // Final submit handler invoked from ApproveModal
  const handleFinalApprove = async (comments: string) => {
    try {
      setIsSubmitting(true);
      console.log("Approval submitted with comments:", comments);
      console.log("All placements:", placements);

      // Example service call when backend is connected:
      // await signatureService.approveDocument({ placements, comments, userId: mockUserId });

      setIsApproveModalOpen(false);
    } catch (err) {
      console.error("Failed to approve document:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-[#F3F4F6] font-sans antialiased text-gray-800 overflow-hidden">
      
      {/* ------------------------------------------------------------- */}
      {/* TOP HEADER BAR                                                */}
      {/* ------------------------------------------------------------- */}
      <div style={{ height: '65px' }} className="w-full shrink-0 flex items-center justify-between border-b border-slate-200 bg-white px-8 shadow-sm z-20">
        <div className="flex items-center gap-5">
          <button className="text-gray-400 hover:text-gray-700 transition-colors text-xl font-medium p-1 hover:bg-slate-50 rounded-lg">←</button>
          <div className="flex items-center gap-3.5">
            <span className="text-[#8B2E00] text-3xl">📄</span>
            <div>
              <h1 className="text-base font-bold text-gray-950 tracking-tight leading-tight">Invoice_Q1_2025.pdf</h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Place your signatures, then sign & approve</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="rounded-full bg-slate-100 px-8 py-2 text-xs font-bold text-slate-600 tracking-wide">{placements.length} placements</span>
          <button className="rounded-lg border border-slate-200 px-8 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 bg-white transition shadow-sm">Cancel</button>
          
          {/* 👈 Opens the Approve Modal */}
          <button 
            onClick={() => setIsApproveModalOpen(true)}
            className="rounded-lg bg-[#8B2E00] px-6 py-2 text-xs font-extrabold text-white hover:bg-[#722600] shadow-md transition-all tracking-wide"
          >
            Save & Approve
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MAIN SPLIT CONTENT (SIDEBAR + WORKSPACE)                      */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT SIDEBAR */}
        <div style={{ width: '300px' }} className="border-r bg-white p-3 flex h-full flex-col justify-between shrink-0 overflow-y-auto overflow-x-hidden">  
          <div className="space-y-4">
            <div className="px-2 py-2 flex items-center gap-2">
              <div className="h-10 w-10 rounded bg-[#8B2E00] text-white flex items-center justify-center text-sm font-bold shrink-0">✍️</div>
              <div className="font-semibold text-sm text-[#8B2E00]">Your Signatures</div>
            </div>
            
            <div className="px-2 space-y-4">
              {/* Saved Signature Preview */}
              {!savedSignature ? (
                <p className="text-sm text-slate-400 mb-3 leading-relaxed">No signatures yet. Create one to start placing.</p>
              ) : (
                <div className="group relative rounded-lg border border-slate-100 bg-[#FAF9F6] p-4 flex items-center justify-center min-h-[90px] shadow-inner animate-in fade-in zoom-in-95 duration-200">
                  <img src={savedSignature} alt="Saved Signature" className="max-h-14 object-contain animate-in fade-in" />
                </div>
              )}

              {/* Create / Change Signature Button */}
              <div>
                {savedSignature && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-0.5">Options</p>}
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 bg-white shadow-sm transition"
                >
                  <span className="text-sm">+</span> {savedSignature ? 'Change Signature' : 'Create Signature'}
                </button>
              </div>

              {/* 👈 Dynamic Add Button: shows current page number */}
              <button 
                onClick={handleAddToPage} 
                className="w-full rounded-lg bg-[#8B2E00] hover:bg-[#722600] text-white py-2.5 text-xs font-bold shadow-md transition-all tracking-wide"
              >
                📄 Add to Page {currentPage}
              </button>

              {/* Placement List Sidebar Item */}
              {placements.length > 0 && (
                <div className="border-t border-slate-100 pt-4 mt-2">
                  <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2 px-1">All Placements</h3>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {placements.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-[11px] p-2 bg-slate-50 rounded border border-slate-100">
                        <span className="text-slate-500 font-medium">Page {p.page} ({Math.round(p.x)}, {Math.round(p.y)})</span>
                        <button onClick={() => removePlacement(p.id)} className="text-slate-400 hover:text-red-500 font-medium transition">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-2 border-t border-slate-100 pt-3 mb-2">
            <p className="text-[11px] text-slate-400 leading-relaxed">Drag the signature box to position it. Drag the corner to resize. You can place the same signature multiple times.</p>
          </div>
        </div>

        {/* WORKSPACE CANVAS CONTAINER */}
        <div className="flex-1 overflow-y-auto p-12 flex flex-col items-center bg-[#F3F4F6] select-none">
          
          {/* 👈 PAGE CONTROLS: Next/Previous Switcher */}
          <div className="flex items-center gap-3 mb-6 bg-white px-3.5 py-1.5 rounded-lg shadow-sm border border-slate-200 text-xs text-slate-500 shrink-0">
            <button 
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="hover:text-black p-0.5 rounded hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed text-base font-bold px-1"
            >
              ‹
            </button>
            <span className="font-semibold text-slate-700">Page {currentPage} of {totalPages}</span>
            <button 
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="hover:text-black p-0.5 rounded hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed text-base font-bold px-1"
            >
              ›
            </button>
          </div>

          {/* PAGE CANVAS (Document Layout) */}
          <div className="relative bg-white shadow-2xl border border-slate-200 rounded-sm w-[760px] min-h-[1050px] p-20 mb-12 shrink-0 flex flex-col justify-between">
            <div className="w-full flex-1 flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-800 mb-8">Document Page {currentPage}</h2>
                <div className="space-y-4">
                  <div className="h-3 bg-slate-200 rounded-md w-1/3 mb-12"></div>
                  <div className="h-2.5 bg-slate-100 rounded-sm w-full"></div>
                  <div className="h-2.5 bg-slate-100 rounded-sm w-full"></div>
                  <div className="h-2.5 bg-slate-100 rounded-sm w-11/12"></div>
                  <div className="h-2.5 bg-slate-100 rounded-sm w-full"></div>
                  <div className="h-2.5 bg-slate-100 rounded-sm w-5/6"></div>
                </div>
              </div>

              <div className="my-16 text-center text-xs font-bold tracking-[0.25em] text-slate-300 uppercase select-none pointer-events-none">— Document Preview —</div>

              <div className="space-y-4 mb-20">
                <div className="h-2.5 bg-slate-100 rounded-sm w-full"></div>
                <div className="h-2.5 bg-slate-100 rounded-sm w-full"></div>
                <div className="h-2.5 bg-slate-100 rounded-sm w-5/6"></div>
                <div className="h-2.5 bg-slate-100 rounded-sm w-full"></div>
                <div className="h-2.5 bg-slate-100 rounded-sm w-4/5"></div>
                <div className="h-2.5 bg-slate-100 rounded-sm w-2/3"></div>
              </div>
            </div>

            {/* 👈 DYNAMIC PLACEMENTS LAYER: Filtered to only display current page items */}
            {placements
              .filter((p) => p.page === currentPage)
              .map((placement) => (
                <Rnd
                  key={placement.id}
                  size={{ width: placement.width, height: placement.height }}
                  position={{ x: placement.x, y: placement.y }}
                  bounds="parent" 
                  
                  // Functional state update ensures drag coordinates persist correctly
                  onDragStop={(e, d) => {
                    setPlacements((prev) => 
                      prev.map((p) => (p.id === placement.id ? { ...p, x: d.x, y: d.y } : p))
                    );
                  }}
                  
                  // Functional state update ensures resize dimensions persist correctly
                  onResizeStop={(e, direction, ref, delta, position) => {
                    setPlacements((prev) => 
                      prev.map((p) => 
                        p.id === placement.id 
                          ? { ...p, width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...position } 
                          : p
                      )
                    );
                  }}
                  className="border border-dashed border-amber-600 bg-amber-50/20 group rounded flex items-center justify-center shadow-sm backdrop-blur-[0.5px]"
                >
                  {/* Signature Image Layer */}
                  <div className="relative w-full h-full flex items-center justify-center p-2 select-none pointer-events-none">
                    <img src={placement.signatureUrl} alt="Signature" className="w-full h-full object-contain" />
                  </div>
                  
                  {/* 
                    🔥 FIXED RED DELETE BUTTON:
                    - `onMouseDown` & `onTouchStart` with `stopPropagation` prevent react-rnd from capturing the click as a drag event.
                    - `z-50` ensures the button sits cleanly above the draggable layer.
                  */}
                  <button 
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      removePlacement(placement.id); 
                    }} 
                    className="absolute -top-2.5 -right-2.5 z-50 hidden group-hover:flex bg-red-500 hover:bg-red-600 text-white w-5 h-5 rounded-full text-[10px] items-center justify-center shadow-md pointer-events-auto transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </Rnd>
              ))}
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODALS                                                        */}
      {/* ------------------------------------------------------------- */}
      
      {/* Signature Creation / Draw / Type Modal */}
      <SignatureModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={async (data) => {
          setSavedSignature(data.dataUrl);
          try {
            await signatureService.saveSignature(mockUserId, {
              label: "My Signature Snapshot",
              signatureType: data.type, 
              signatureDataUrl: data.dataUrl,
              isDefault: true
            });
          } catch (err) {
            console.error("Backend sync transaction failed:", err);
          }
        }}
      />

      {/* Save & Approve Confirmation Modal */}
      <ApproveModal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        onConfirm={handleFinalApprove}
        loading={isSubmitting}
        documentName="Invoice_Q1_2025.pdf"
      />
    </div>
  );
};