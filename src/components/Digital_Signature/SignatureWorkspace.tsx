"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Rnd } from 'react-rnd';
import * as pdfjsLib from 'pdfjs-dist';
import { SignatureModal } from './SignatureModal';
import { signatureService } from "@/lib/signatureService";
import { getDocument as fetchDocument, downloadDocumentVersion, type Document } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

// =========================================================================
// 1. TYPE DEFINITIONS
// =========================================================================

/**
 * A signature placed on a page.
 *
 * Position and size are held in pixels relative to the rendered page container.
 * They are converted to fractions of the page only at submit time, so the stamp
 * lands in the right spot on the server regardless of the render width used here.
 */
interface Placement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  signatureUrl: string;
  page: number;
}

interface ApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentName: string;
  signerEmail: string;
  signerRole: string;
  placementCount: number;
  onConfirm: (comments: string) => void;
  loading?: boolean;
  error?: string | null;
}

export interface SignatureWorkspaceProps {
  /** Document being signed. */
  documentId: string;
  /** Workflow task being approved, when the signing came from an approval. */
  taskId?: string | null;
}

/** Width the PDF page is rendered at. Placement fractions are derived from the
 *  actual rendered size, so this value is presentation only. */
const PAGE_RENDER_WIDTH = 760;

// =========================================================================
// 2. APPROVE MODAL
// =========================================================================

const ApproveModal: React.FC<ApproveModalProps> = ({
  isOpen,
  onClose,
  documentName,
  signerEmail,
  signerRole,
  placementCount,
  onConfirm,
  loading = false,
  error = null,
}) => {
  const [comments, setComments] = useState('');
  const [timestamp, setTimestamp] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Local time - a UTC string reads as "wrong" to anyone not on GMT.
      setTimestamp(new Date().toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium',
      }));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">

        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="text-[#8B2E00] text-xl">✍️</span>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Sign &amp; Approve</h3>
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

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 text-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Signer</span>
            <span className="text-slate-800 font-semibold">{signerEmail || 'Unknown'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Role</span>
            <span className="text-slate-700 font-medium">{signerRole || '-'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Signatures placed</span>
            <span className="text-slate-700 font-medium">{placementCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Timestamp</span>
            <span className="text-slate-700 font-medium">{timestamp}</span>
          </div>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
          The signatures will be written into the PDF and saved as a new version.
          The current version is kept in the document history.
        </p>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

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
            {loading ? 'Signing...' : 'Sign & Approve'}
          </button>
        </div>

      </div>
    </div>
  );
};

/**
 * Whether these bytes are really a PDF, read from the file itself.
 *
 * Every PDF begins with %PDF-, whatever it is called. This used to be guessed
 * from the blob's MIME type or the document title instead, and both are
 * unreliable: the download endpoint labels everything
 * application/octet-stream, so the type never matched, which left the title as
 * the only real test - and a title is just a label a user typed. A genuine PDF
 * stored under a name like "testingsig" was refused, while a renamed .docx
 * would have sailed through to fail inside the PDF parser instead.
 */
async function looksLikePdf(blob: Blob): Promise<boolean> {
  const header = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  if (header.length < 5) return false;
  // "%PDF-"
  return header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44
      && header[3] === 0x46 && header[4] === 0x2d;
}

// =========================================================================
// 3. MAIN SIGNATURE WORKSPACE
// =========================================================================

export const SignatureWorkspace: React.FC<SignatureWorkspaceProps> = ({ documentId, taskId }) => {
  const router = useRouter();
  const userId = useAuthStore((state) => state.userId);
  const email = useAuthStore((state) => state.email);
  const role = useAuthStore((state) => state.role);

  // Document + PDF state
  const [doc, setDoc] = useState<Document | null>(null);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({ width: PAGE_RENDER_WIDTH, height: 0 });

  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Signature + placement state
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // A callback ref, not useRef: the canvas is only mounted once loading has
  // finished, so an effect guarded on `canvasRef.current` could run while the
  // element did not yet exist and then never run again - the page stayed on
  // "Loading document..." or showed an empty frame with no way to recover.
  // Holding the node in state makes its arrival re-trigger the render.
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);

  // ---------------------------------------------------------------------
  // Load the document and open its current version as a PDF
  // ---------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const load = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const documentData = await fetchDocument(documentId);
        if (cancelled) return;
        setDoc(documentData);

        if (!documentData.current_version_id) {
          setLoadError('This document has no stored version to sign.');
          return;
        }

        const blob = await downloadDocumentVersion(documentId, documentData.current_version_id);
        if (cancelled) return;

        // Stamping is PDF-only; fail clearly rather than rendering a blank page.
        if (!(await looksLikePdf(blob))) {
          setLoadError('Only PDF documents can be signed. This file is not a PDF.');
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        const loaded = await pdfjsLib.getDocument(objectUrl).promise;
        if (cancelled) return;

        setPdf(loaded);
        setTotalPages(loaded.numPages);
        setCurrentPage(1);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load document for signing:', err);
          setLoadError(err instanceof Error ? err.message : 'Failed to load the document.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [documentId]);

  // ---------------------------------------------------------------------
  // Render the active page onto the canvas
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!pdf || !canvasEl) return;

    let cancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdf.getPage(currentPage);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const scale = PAGE_RENDER_WIDTH / baseViewport.width;
        const viewport = page.getViewport({ scale });

        const context = canvasEl.getContext('2d');
        if (!context) return;

        canvasEl.width = viewport.width;
        canvasEl.height = viewport.height;

        // Placement fractions are computed against this size.
        setPageSize({ width: viewport.width, height: viewport.height });

        await page.render({ canvas: canvasEl, canvasContext: context, viewport }).promise;
      } catch (err) {
        if (!cancelled) console.error('Failed to render page:', err);
      }
    };

    renderPage();
    return () => { cancelled = true; };
  }, [pdf, currentPage, canvasEl]);

  // ---------------------------------------------------------------------
  // Load the signer's saved signature templates
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!userId) return;

    const loadSavedSignatures = async () => {
      try {
        const saved = await signatureService.getUserSignatures(userId);
        if (saved && saved.length > 0) {
          const defaultSig = saved.find((s: any) => s.isDefault) || saved[0];
          const raw = defaultSig.signatureImage ?? defaultSig.signatureDataUrl ?? '';
          if (raw) {
            setSavedSignature(raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`);
          }
        }
      } catch (err) {
        console.error('Could not load saved signatures:', err);
      }
    };

    loadSavedSignatures();
  }, [userId]);

  // ---------------------------------------------------------------------
  // Placement handling
  // ---------------------------------------------------------------------
  const handleAddToPage = () => {
    if (!savedSignature) {
      setIsModalOpen(true);
      return;
    }

    // Drop it near the lower third of the page, a common signature spot.
    const width = 180;
    const height = 70;
    setPlacements((prev) => [
      ...prev,
      {
        id: `sig-${Date.now()}`,
        x: Math.max(0, pageSize.width / 2 - width / 2),
        y: Math.max(0, pageSize.height * 0.7),
        width,
        height,
        signatureUrl: savedSignature,
        page: currentPage,
      },
    ]);
  };

  const removePlacement = (id: string) => {
    setPlacements((prev) => prev.filter((p) => p.id !== id));
  };

  const goToPreviousPage = () => setCurrentPage((p) => Math.max(p - 1, 1));
  const goToNextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));

  // ---------------------------------------------------------------------
  // Submit: convert pixels to page fractions, then stamp server-side
  // ---------------------------------------------------------------------
  const handleFinalApprove = useCallback(async (comments: string) => {
    if (placements.length === 0) {
      setSubmitError('Place at least one signature before approving.');
      return;
    }
    if (pageSize.width === 0 || pageSize.height === 0) {
      setSubmitError('The page is still rendering. Try again in a moment.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const result = await signatureService.signAndApprove({
        documentId,
        taskId: taskId ? Number(taskId) : null,
        comments,
        placements: placements.map((p) => ({
          page: p.page,
          x: p.x / pageSize.width,
          y: p.y / pageSize.height,
          width: p.width / pageSize.width,
          height: p.height / pageSize.height,
          imageDataUrl: p.signatureUrl,
        })),
      });

      setIsApproveModalOpen(false);
      // Land on the document so the signer immediately sees the new version.
      router.push(`/documents/${result.documentId}`);
    } catch (err) {
      console.error('Failed to sign and approve:', err);
      setSubmitError(err instanceof Error ? err.message : 'Signing failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [documentId, taskId, placements, pageSize, router]);

  const documentName = doc?.title ?? 'Document';

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------
  return (
    <div className="flex h-full w-full flex-col bg-[#F3F4F6] font-sans antialiased text-gray-800 overflow-hidden">

      {/* HEADER */}
      <div style={{ height: '65px' }} className="w-full shrink-0 flex items-center justify-between border-b border-slate-200 bg-white px-8 shadow-sm z-20">
        <div className="flex items-center gap-5">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-700 transition-colors text-xl font-medium p-1 hover:bg-slate-50 rounded-lg"
          >
            ←
          </button>
          <div className="flex items-center gap-3.5">
            <span className="text-[#8B2E00] text-3xl">📄</span>
            <div>
              <h1 className="text-base font-bold text-gray-950 tracking-tight leading-tight">{documentName}</h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Place your signatures, then sign &amp; approve</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="rounded-full bg-slate-100 px-8 py-2 text-xs font-bold text-slate-600 tracking-wide">
            {placements.length} placements
          </span>
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-slate-200 px-8 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 bg-white transition shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => { setSubmitError(null); setIsApproveModalOpen(true); }}
            disabled={placements.length === 0 || !!loadError}
            className="rounded-lg bg-[#8B2E00] px-6 py-2 text-xs font-extrabold text-white hover:bg-[#722600] disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-all tracking-wide"
          >
            Save &amp; Approve
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">

        {/* SIDEBAR */}
        <div style={{ width: '300px' }} className="border-r bg-white p-3 flex h-full flex-col justify-between shrink-0 overflow-y-auto overflow-x-hidden">
          <div className="space-y-4">
            <div className="px-2 py-2 flex items-center gap-2">
              <div className="h-10 w-10 rounded bg-[#8B2E00] text-white flex items-center justify-center text-sm font-bold shrink-0">✍️</div>
              <div className="font-semibold text-sm text-[#8B2E00]">Your Signatures</div>
            </div>

            <div className="px-2 space-y-4">
              {!savedSignature ? (
                <p className="text-sm text-slate-400 mb-3 leading-relaxed">No signatures yet. Create one to start placing.</p>
              ) : (
                <div className="group relative rounded-lg border border-slate-100 bg-[#FAF9F6] p-4 flex items-center justify-center min-h-[90px] shadow-inner">
                  <img src={savedSignature} alt="Saved signature" className="max-h-14 object-contain" />
                </div>
              )}

              <div>
                {savedSignature && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-0.5">Options</p>}
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 bg-white shadow-sm transition"
                >
                  <span className="text-sm">+</span> {savedSignature ? 'Change Signature' : 'Create Signature'}
                </button>
              </div>

              <button
                onClick={handleAddToPage}
                disabled={!pdf || !!loadError}
                className="w-full rounded-lg bg-[#8B2E00] hover:bg-[#722600] disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 text-xs font-bold shadow-md transition-all tracking-wide"
              >
                📄 Add to Page {currentPage}
              </button>

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
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Drag the signature box to position it. Drag a corner to resize. You can place the same signature multiple times.
            </p>
          </div>
        </div>

        {/* CANVAS */}
        <div className="flex-1 overflow-y-auto p-12 flex flex-col items-center bg-[#F3F4F6] select-none">

          {isLoading && (
            <div className="mt-24 text-sm font-medium text-slate-500">Loading document…</div>
          )}

          {loadError && !isLoading && (
            <div className="mt-24 max-w-md rounded-lg border border-red-200 bg-red-50 p-5 text-center">
              <p className="text-sm font-semibold text-red-800">Cannot sign this document</p>
              <p className="mt-1.5 text-xs text-red-700">{loadError}</p>
              <button
                onClick={() => router.back()}
                className="mt-4 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50 transition"
              >
                Go back
              </button>
            </div>
          )}

          {!isLoading && !loadError && pdf && (
            <>
              <div className="flex items-center gap-3 mb-6 bg-white px-3.5 py-1.5 rounded-lg shadow-sm border border-slate-200 text-xs text-slate-500 shrink-0">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="hover:text-black p-0.5 rounded hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-base font-bold px-1"
                >
                  ‹
                </button>
                <span className="font-semibold text-slate-700">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="hover:text-black p-0.5 rounded hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-base font-bold px-1"
                >
                  ›
                </button>
              </div>

              {/* The placement layer is positioned against this box, and its size
                  is exactly the rendered canvas size, so pixel -> fraction is exact. */}
              <div
                className="relative bg-white shadow-2xl border border-slate-200 rounded-sm mb-12 shrink-0"
                style={{ width: pageSize.width || PAGE_RENDER_WIDTH, height: pageSize.height || undefined }}
              >
                <canvas ref={setCanvasEl} className="block" />

                {placements
                  .filter((p) => p.page === currentPage)
                  .map((placement) => (
                    <Rnd
                      key={placement.id}
                      size={{ width: placement.width, height: placement.height }}
                      position={{ x: placement.x, y: placement.y }}
                      bounds="parent"
                      onDragStop={(e, d) => {
                        setPlacements((prev) =>
                          prev.map((p) => (p.id === placement.id ? { ...p, x: d.x, y: d.y } : p))
                        );
                      }}
                      onResizeStop={(e, direction, ref, delta, position) => {
                        setPlacements((prev) =>
                          prev.map((p) =>
                            p.id === placement.id
                              ? { ...p, width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...position }
                              : p
                          )
                        );
                      }}
                      className="border border-dashed border-amber-600 bg-amber-50/20 group rounded flex items-center justify-center shadow-sm"
                    >
                      <div className="relative w-full h-full flex items-center justify-center p-2 select-none pointer-events-none">
                        <img src={placement.signatureUrl} alt="Signature" className="w-full h-full object-contain" />
                      </div>

                      <button
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); removePlacement(placement.id); }}
                        className="absolute -top-2.5 -right-2.5 z-50 hidden group-hover:flex bg-red-500 hover:bg-red-600 text-white w-5 h-5 rounded-full text-[10px] items-center justify-center shadow-md pointer-events-auto transition-colors cursor-pointer"
                      >
                        ✕
                      </button>
                    </Rnd>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODALS */}
      <SignatureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={async (data) => {
          setSavedSignature(data.dataUrl);
          if (!userId) return;
          try {
            await signatureService.saveSignature(userId, {
              label: "My Signature",
              signatureType: data.type,
              signatureDataUrl: data.dataUrl,
              isDefault: true,
            });
          } catch (err) {
            console.error('Could not save the signature to your profile:', err);
          }
        }}
      />

      <ApproveModal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        onConfirm={handleFinalApprove}
        loading={isSubmitting}
        error={submitError}
        documentName={documentName}
        signerEmail={email ?? ''}
        signerRole={role ?? ''}
        placementCount={placements.length}
      />
    </div>
  );
};
