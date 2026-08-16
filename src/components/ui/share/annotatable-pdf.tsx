'use client';

import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export interface AnnotationPin {
  id: string;
  pageNumber: number;
  /** Fractions of the page (0-1) from the top-left. */
  anchorX: number;
  anchorY: number;
  /** Position in the ordered comment list, shown inside the pin. */
  number: number;
  author: string;
  content: string;
  /**
   * COMMENT draws a numbered pin; TEXT draws the words themselves, previewing
   * how the typewriter annotation will be burned into the saved version.
   */
  type?: 'COMMENT' | 'TEXT';
}

/** Where the typewriter caret currently sits, if anywhere. */
export interface TextAnchor {
  pageNumber: number;
  x: number;
  y: number;
}

interface Props {
  /** Blob URL of the PDF to display. */
  fileUrl: string;
  pins: AnnotationPin[];
  /** Null disables placing new pins (view-only, or someone else is editing). */
  onPlace: ((pageNumber: number, x: number, y: number) => void) | null;
  onPinClick?: (id: string) => void;
  selectedPinId?: string | null;
  /**
   * Typewriter support. When textAnchor is set, an input is drawn on the page
   * at that spot; committing it calls onCommitText with what was typed.
   */
  textAnchor?: TextAnchor | null;
  onCommitText?: (value: string) => void;
  onCancelText?: () => void;
}

const RENDER_WIDTH = 720;

/**
 * A PDF page with a click-to-annotate overlay.
 *
 * Pin positions are stored as fractions of the page rather than pixels, so a
 * comment stays on the same spot whatever width the page is rendered at - and
 * the backend can convert the same numbers into PDF user space when writing
 * them into the file.
 */
export function AnnotatablePdf({
  fileUrl, pins, onPlace, onPinClick, selectedPinId,
  textAnchor = null, onCommitText, onCancelText,
}: Props) {
  // A callback ref rather than useRef: the canvas is only mounted once loading
  // finishes, so an effect that reads a plain ref can run before the element
  // exists and then never run again, leaving the page permanently blank.
  // Storing the node in state makes its arrival a dependency.
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [size, setSize] = useState({ width: RENDER_WIDTH, height: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** What is being typed into the on-page text box right now. */
  const [draft, setDraft] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const loaded = await pdfjsLib.getDocument(fileUrl).promise;
        if (cancelled) return;
        setPdf(loaded);
        setTotalPages(loaded.numPages);
        setCurrentPage(1);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to open the PDF:', err);
          setError('This document could not be opened for annotation.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [fileUrl]);

  useEffect(() => {
    if (!pdf || !canvasEl) return;
    let cancelled = false;

    const render = async () => {
      try {
        const page = await pdf.getPage(currentPage);
        if (cancelled) return;

        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: RENDER_WIDTH / base.width });

        const context = canvasEl.getContext('2d');
        if (!context) return;

        canvasEl.width = viewport.width;
        canvasEl.height = viewport.height;
        setSize({ width: viewport.width, height: viewport.height });

        await page.render({ canvas: canvasEl, canvasContext: context, viewport }).promise;
      } catch (err) {
        if (!cancelled) console.error('Failed to render page:', err);
      }
    };

    render();
    return () => { cancelled = true; };
  }, [pdf, currentPage, canvasEl]);

  /** Sends the typed text up, or just closes the box if nothing was typed. */
  const commitDraft = () => {
    const value = draft.trim();
    setDraft('');
    if (value) onCommitText?.(value);
    else onCancelText?.();
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onPlace || size.height === 0) return;
    // Ignore clicks that landed on an existing pin.
    if ((event.target as HTMLElement).closest('[data-pin]')) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;

    onPlace(currentPage, x, y);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading document…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        {error}
      </div>
    );
  }

  // Numbered discussion pins and typewriter text are drawn differently, so they
  // are separated here rather than in the caller.
  const pinsOnPage = pins.filter((p) => p.pageNumber === currentPage && p.type !== 'TEXT');
  const textOnPage = pins.filter((p) => p.pageNumber === currentPage && p.type === 'TEXT');

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 shadow-sm">
        <button
          type="button"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="rounded p-0.5 transition hover:bg-slate-50 disabled:opacity-30"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-semibold text-slate-700">Page {currentPage} of {totalPages}</span>
        <button
          type="button"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="rounded p-0.5 transition hover:bg-slate-50 disabled:opacity-30"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div
        onClick={handleClick}
        className={`relative border border-slate-200 bg-white shadow-lg ${onPlace ? 'cursor-crosshair' : ''}`}
        style={{ width: size.width || RENDER_WIDTH, height: size.height || undefined }}
      >
        <canvas ref={setCanvasEl} className="block" />

        {/* Typewriter text already added: shown where it will be drawn into the
            saved PDF, so what you see here is what the version will contain. */}
        {textOnPage.map((entry) => (
          <div
            key={entry.id}
            data-pin
            onClick={(e) => { e.stopPropagation(); onPinClick?.(entry.id); }}
            style={{
              left: `${entry.anchorX * 100}%`,
              top: `${entry.anchorY * 100}%`,
              maxWidth: `${Math.max(100 - entry.anchorX * 100 - 4, 15)}%`,
            }}
            className={`absolute cursor-pointer whitespace-pre-wrap text-[11px] leading-snug text-[#103A7A] ${
              selectedPinId === entry.id ? 'rounded bg-[#103A7A]/10 ring-1 ring-[#103A7A]/30' : ''
            }`}
          >
            {entry.content}
          </div>
        ))}

        {pinsOnPage.map((pin) => (
          <button
            key={pin.id}
            data-pin
            type="button"
            title={`${pin.author}: ${pin.content}`}
            onClick={(e) => { e.stopPropagation(); onPinClick?.(pin.id); }}
            style={{
              left: `${pin.anchorX * 100}%`,
              top: `${pin.anchorY * 100}%`,
            }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-md transition
              ${selectedPinId === pin.id
                ? 'bg-[#5c1e00] ring-2 ring-[#8B2E00]/40 scale-110'
                : 'bg-[#8B2E00] hover:bg-[#722600]'}`}
          >
            {pin.number}
          </button>
        ))}

        {/* The typewriter caret: type straight onto the page. */}
        {textAnchor && textAnchor.pageNumber === currentPage && (
          <textarea
            data-pin
            autoFocus
            value={draft}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter commits, Shift+Enter makes a new line, Escape abandons.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commitDraft();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setDraft('');
                onCancelText?.();
              }
            }}
            onBlur={commitDraft}
            rows={1}
            placeholder="Type here, then press Enter"
            style={{
              left: `${textAnchor.x * 100}%`,
              top: `${textAnchor.y * 100}%`,
              width: `${Math.max(100 - textAnchor.x * 100 - 4, 20)}%`,
            }}
            className="absolute resize-none rounded border border-[#103A7A]/40 bg-white/95 px-1.5 py-1 text-[11px] leading-snug text-[#103A7A] shadow-sm outline-none ring-2 ring-[#103A7A]/20"
          />
        )}
      </div>

      {onPlace && (
        <p className="text-xs text-slate-400">
          {textAnchor
            ? 'Press Enter to place the text, Escape to cancel.'
            : 'Click anywhere on the page to annotate that spot.'}
        </p>
      )}
    </div>
  );
}
