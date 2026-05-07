'use client';

import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { Loader2, ChevronLeft, ChevronRight, AlertCircle, FileText, ZoomIn, ZoomOut } from 'lucide-react';

// Set worker source for pdfjs
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface DocumentPreviewProps {
  url: string | null;
  type: 'image' | 'pdf' | 'docx' | 'xlsx' | null;
  title: string;
}

export function DocumentPreview({ url, type, title }: DocumentPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docxContent, setDocxContent] = useState<string>('');
  const [xlsxContent, setXlsxContent] = useState<{headers: string[], rows: (string | number)[][]}>({headers: [], rows: []});
  const [zoom, setZoom] = useState(100);
  const minZoom = 50;
  const maxZoom = 300;

  // Render PDF pages
  useEffect(() => {
    if (!url || type !== 'pdf') return;

    let isMounted = true;
    let renderTask: any = null;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        const pdf = await pdfjsLib.getDocument(url).promise;
        if (!isMounted) return;
        
        setTotalPages(pdf.numPages);

        const page = await pdf.getPage(currentPage);
        if (!isMounted) return;
        
        const viewport = page.getViewport({ scale: (zoom / 100) * 1.5 });

        const canvas = canvasRef.current;
        if (!canvas || !isMounted) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const context = canvas.getContext('2d');
        if (!context || !isMounted) return;

        // Cancel previous render task if it exists
        if (renderTask) {
          renderTask.cancel();
        }

        renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
        });
        
        await renderTask.promise;
      } catch (err: any) {
        // Don't show error if it's a cancellation
        if (err?.name === 'RenderingCancelledException') {
          console.log('PDF render cancelled');
          return;
        }
        if (isMounted) {
          console.error('Error rendering PDF:', err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          setError(`Failed to render PDF: ${errorMessage}`);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPdf();

    // Cleanup: cancel render and reset mounted flag
    return () => {
      isMounted = false;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [url, type, currentPage, zoom]);

  // Load DOCX content
  useEffect(() => {
    if (!url || type !== 'docx') return;

    const loadDocx = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setDocxContent(result.value);
      } catch (err) {
        console.error('Error loading DOCX:', err);
        setError('Failed to load Word document');
      } finally {
        setLoading(false);
      }
    };

    loadDocx();
  }, [url, type]);

  // Load XLSX content
  useEffect(() => {
    if (!url || type !== 'xlsx') return;

    const loadXlsx = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON for easier rendering
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (json.length > 0) {
          const headers = (json[0] as string[]).map(h => String(h));
          const rows = (json.slice(1) as (string | number)[][]);
          setXlsxContent({ headers, rows });
        }
      } catch (err) {
        console.error('Error loading XLSX:', err);
        setError('Failed to load Excel spreadsheet');
      } finally {
        setLoading(false);
      }
    };

    loadXlsx();
  }, [url, type]);

  if (!url || !type) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-gray-500 font-medium">No preview available</p>
        <p className="text-sm text-gray-400 mt-2">Please download to view this document</p>
      </div>
    );
  }

  if (type === 'image') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2 p-3 bg-white rounded-lg border border-gray-200">
          <button
            onClick={() => setZoom(prev => Math.max(minZoom, prev - 10))}
            className="p-2 hover:bg-gray-100 rounded transition"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-medium min-w-fit">{zoom}%</span>
          <button
            onClick={() => setZoom(prev => Math.min(maxZoom, prev + 10))}
            className="p-2 hover:bg-gray-100 rounded transition"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setZoom(100)}
            className="px-2 py-1 text-xs hover:bg-gray-100 rounded transition ml-2"
            title="Reset zoom"
          >
            Reset
          </button>
        </div>
        <div className="flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 overflow-auto max-h-96">
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-[#953002] animate-spin" />
              <span className="text-sm text-gray-600">Loading image...</span>
            </div>
          ) : (
            <img
              src={url}
              alt={title}
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'center',
                transition: 'transform 0.2s ease',
              }}
              className="max-h-96 object-contain"
            />
          )}
        </div>
      </div>
    );
  }

  if (type === 'pdf') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2 p-3 bg-white rounded-lg border border-gray-200">
          <button
            onClick={() => setZoom(prev => Math.max(minZoom, prev - 10))}
            className="p-2 hover:bg-gray-100 rounded transition"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-medium min-w-fit">{zoom}%</span>
          <button
            onClick={() => setZoom(prev => Math.min(maxZoom, prev + 10))}
            className="p-2 hover:bg-gray-100 rounded transition"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setZoom(100)}
            className="px-2 py-1 text-xs hover:bg-gray-100 rounded transition ml-2"
            title="Reset zoom"
          >
            Reset
          </button>
        </div>
        <div className="flex items-center justify-center bg-gray-50 rounded-lg p-4 border border-gray-200 overflow-auto max-h-96">
          {loading && (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-[#953002] animate-spin" />
              <span className="text-sm text-gray-600">Rendering page...</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          <canvas ref={canvasRef} className={loading || error ? 'hidden' : ''} />
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 hover:bg-gray-100 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous page"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm text-gray-600 font-medium min-w-max">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 hover:bg-gray-100 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next page"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        )}
      </div>
    );
  }

  if (type === 'docx') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2 p-3 bg-white rounded-lg border border-gray-200">
          <button
            onClick={() => setZoom(prev => Math.max(minZoom, prev - 10))}
            className="p-2 hover:bg-gray-100 rounded transition"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-medium min-w-fit">{zoom}%</span>
          <button
            onClick={() => setZoom(prev => Math.min(maxZoom, prev + 10))}
            className="p-2 hover:bg-gray-100 rounded transition"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setZoom(100)}
            className="px-2 py-1 text-xs hover:bg-gray-100 rounded transition ml-2"
            title="Reset zoom"
          >
            Reset
          </button>
        </div>
        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-auto max-h-96 p-6">
          {loading && (
            <div className="flex items-center gap-2 justify-center h-96">
              <Loader2 className="w-5 h-5 text-[#953002] animate-spin" />
              <span className="text-sm text-gray-600">Loading document...</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          {!loading && !error && (
            <div
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease',
              }}
            >
              <div 
                className="prose prose-sm max-w-none text-gray-900"
                dangerouslySetInnerHTML={{ __html: docxContent }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (type === 'xlsx') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2 p-3 bg-white rounded-lg border border-gray-200">
          <button
            onClick={() => setZoom(prev => Math.max(minZoom, prev - 10))}
            className="p-2 hover:bg-gray-100 rounded transition"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-medium min-w-fit">{zoom}%</span>
          <button
            onClick={() => setZoom(prev => Math.min(maxZoom, prev + 10))}
            className="p-2 hover:bg-gray-100 rounded transition"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setZoom(100)}
            className="px-2 py-1 text-xs hover:bg-gray-100 rounded transition ml-2"
            title="Reset zoom"
          >
            Reset
          </button>
        </div>
        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-auto max-h-96">
          {loading && (
            <div className="flex items-center gap-2 justify-center h-96">
              <Loader2 className="w-5 h-5 text-[#953002] animate-spin" />
              <span className="text-sm text-gray-600">Loading spreadsheet...</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-600 p-6">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          {!loading && !error && xlsxContent.headers.length > 0 && (
            <div
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease',
              }}
              className="overflow-x-auto"
            >
              <table className="w-full border-collapse">
                <thead className="bg-[#953002] sticky top-0">
                  <tr>
                    {xlsxContent.headers.map((header, idx) => (
                      <th key={idx} className="border border-gray-300 px-4 py-2 text-left text-white font-medium text-sm">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {xlsxContent.rows.slice(0, 50).map((row, rowIdx) => (
                    <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="border border-gray-300 px-4 py-2 text-sm">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {xlsxContent.rows.length > 50 && (
                <div className="p-4 bg-yellow-50 border-t border-gray-300 text-center text-sm text-gray-600">
                  Showing first 50 rows of {xlsxContent.rows.length} total rows
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
