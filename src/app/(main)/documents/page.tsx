'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UploadDocumentDialog } from '@/components/ui/upload-document-dialog';
import { useConfirm } from '@/hooks/use-confirm';
import PaginationBar from '@/components/ui/pagination-bar';
import { notify } from '@/lib/feedback';
import ShareDocumentDialog from '@/components/ui/share/share-document-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Plus, Eye, Download, FileText, Loader, Trash2, Share2, MoveRight,
  LayoutGrid, List, MoreHorizontal, Lock,
} from 'lucide-react';
import {
  getDocuments,
  getDocumentsPage,
  getNewUploadCount,
  getFolders,
  Document,
  Folder,
  getWorkflowStatusByDocument,
  deleteDocument,
  moveDocuments,
  FolderTreeNode,
} from '@/lib/api-client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { hasPermission } from '@/lib/access-control';
import { FolderSidebar } from '@/components/FolderSidebar';
import { FolderNode } from '@/components/FolderNode';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ── Types ─────────────────────────────────────────────────────────────────────

type ViewMode = 'list' | 'grid';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build nested tree from flat folder + doc lists */
function buildTree(
  folders: Folder[],
  documents: Document[],
  parentId: string | null = null
): FolderTreeNode[] {
  return folders
    .filter((f) => (f.parent_folder_id ?? null) === parentId)
    .map((f) => {
      const children = buildTree(folders, documents, f.folder_id);
      const directCount = documents.filter(
        (d) => !d.is_deleted && d.folder_id === f.folder_id
      ).length;
      const childCount = children.reduce(
        (sum, child) => sum + child.documentCount,
        0
      );
      return {
        folder_id: f.folder_id,
        name: f.name,
        path: f.path,
        parent_folder_id: f.parent_folder_id,
        documentCount: directCount + childCount,
        totalSize: 0,
        children,
      };
    });
}

function formatDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function getFileType(filename: string) {
  return filename.split('.').pop()?.toUpperCase() || 'FILE';
}

function getFileColor(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['pdf'].includes(ext)) return 'bg-red-100 text-red-600';
  if (['doc', 'docx'].includes(ext)) return 'bg-blue-100 text-blue-600';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'bg-green-100 text-green-600';
  if (['ppt', 'pptx'].includes(ext)) return 'bg-orange-100 text-orange-600';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'bg-purple-100 text-purple-600';
  if (['zip', 'rar', '7z'].includes(ext)) return 'bg-yellow-100 text-yellow-600';
  return 'bg-slate-100 text-slate-600';
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const norm = status.toUpperCase();
  if (norm === 'PENDING_APPROVAL')
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-700">Pending</span>;
  if (norm === 'APPROVED')
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Approved</span>;
  if (norm === 'REJECTED')
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">Rejected</span>;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">{status || 'None'}</span>;
}

// ── Move sheet ────────────────────────────────────────────────────────────────

interface MoveSheetProps {
  open: boolean;
  onClose: () => void;
  onMove: (targetFolderId: string | null) => Promise<void>;
}

function MoveSheet({ open, onClose, onMove }: MoveSheetProps) {
  const [tree, setTree] = useState<FolderTreeNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingTree(true);
    setSelected(null);
    Promise.all([getFolders(), getDocuments()])
      .then(([folders, docs]) => {
        const flds: Folder[] = Array.isArray(folders) ? folders : [];
        const documents: Document[] = Array.isArray(docs) ? docs : [];
        setTree(buildTree(flds, documents, null));
      })
      .catch(() => setTree([]))
      .finally(() => setLoadingTree(false));
  }, [open]);

  const handleConfirm = async () => {
    setMoving(true);
    try {
      await onMove(selected);
      onClose();
    } finally {
      setMoving(false);
    }
  };

  const noop = async () => {};

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-72 flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="text-base">Move to folder</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {loadingTree ? (
            <p className="text-xs text-slate-400 px-2 py-4">Loading folders…</p>
          ) : (
            <>
              <div
                onClick={() => setSelected(null)}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer text-xs font-semibold transition-colors ${
                  selected === null ? 'bg-[#8B2E00] text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FileText size={14} />
                All Documents (root)
              </div>
              {tree.map((node) => (
                <FolderNode
                  key={node.folder_id}
                  node={node}
                  depth={0}
                  selectedId={selected}
                  onSelect={setSelected}
                  onCreateSubfolder={noop}
                  onRequestDelete={() => {}}
                  onRenameFolder={noop}
                />
              ))}
            </>
          )}
        </div>

        <div className="border-t px-5 py-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={moving}
            className="px-4 py-1.5 text-sm bg-[#8B2E00] text-white rounded hover:bg-[#7a2401] disabled:opacity-50 transition"
          >
            {moving ? 'Moving…' : 'Move here'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Document card (grid view) ─────────────────────────────────────────────────

interface DocCardProps {
  doc: Document;
  selected: boolean;
  status: string;
  onToggle: () => void;
  onView: () => void;
  onDelete: () => void;
  onMove: () => void;
  onShare: () => void;
}

function DocCard({ doc, selected, status, onToggle, onView, onDelete, onMove, onShare }: DocCardProps) {
  const fileType = getFileType(doc.title);
  const colorClass = getFileColor(doc.title);

  return (
    <div
      className={`group relative bg-white rounded-xl border transition-all duration-150 cursor-pointer flex flex-col ${
        selected
          ? 'border-[#8B2E00] ring-2 ring-[#8B2E00]/20 shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
      onClick={onView}
    >
      {/* Checkbox */}
      <div
        className="absolute top-2.5 left-2.5 z-10"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-gray-300 w-3.5 h-3.5"
        />
      </div>

      {/* Actions dropdown */}
      <div
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded-md bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition">
              <MoreHorizontal size={13} className="text-gray-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 text-xs">
            <DropdownMenuItem className="gap-2 text-xs" onClick={onView}>
              <Eye size={12} /> View
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-xs">
              <Download size={12} /> Download
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-xs" onClick={onMove}>
              <MoveRight size={12} /> Move
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-xs" onClick={onShare}>
              <Share2 size={12} /> Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 text-xs text-red-600 focus:text-red-600"
              onClick={onDelete}
            >
              <Trash2 size={12} /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* File icon area */}
      <div className="flex items-center justify-center h-28 rounded-t-xl bg-gray-50 border-b border-gray-100">
        <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 ${colorClass}`}>
          <FileText size={22} />
          <span className="text-[9px] font-bold tracking-wide">{fileType}</span>
        </div>
      </div>

      {/* Card body */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <p className="text-xs font-semibold text-gray-800 truncate leading-tight" title={doc.title}>
          {doc.title}
        </p>

        <div className="flex items-center justify-between gap-1 mt-auto pt-1">
          <StatusBadge status={status} />
          {doc.is_locked && (
            <span className="flex items-center gap-0.5 text-[10px] text-red-500">
              <Lock size={9} /> Locked
            </span>
          )}
        </div>

        <p className="text-[10px] text-gray-400">{formatDate(doc.created_at)}</p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const confirm = useConfirm();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const accessToken = useAuthStore((state) => state.accessToken);
  const role = useAuthStore((state) => state.role);
  const permissions = useAuthStore((state) => state.permissions);

  const folderParam = searchParams.get('folder');
  const selectedFolderId = folderParam ?? null;

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docWorkflowStatus, setDocWorkflowStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The list is paged, searched and filtered by the database. Typing must not
  // fire a request per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Documents uploaded by anyone, for the roles allowed to see them. Without
  // this an end user's upload was visible only to the person who uploaded it,
  // so nobody with authority ever saw it.
  const canSeeEveryonesDocuments = hasPermission(permissions, role, 'canViewAllDocuments');

  // Restricts the list to uploads no workflow has been started on yet.
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [newCount, setNewCount] = useState(0);

  // Incrementing this tells FolderSidebar to reload its own data
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [moveSheetOpen, setMoveSheetOpen] = useState(false);
  // Which document the share dialog is for. Held as the document rather than
  // just an id so the dialog can show its title without looking it up again.
  const [shareTarget, setShareTarget] = useState<{ id: string; title: string } | null>(null);
  const [moveSingleDocId, setMoveSingleDocId] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    const token = accessToken || (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null);
    if (!token) router.push('/login');
  }, [accessToken, router]);

  /**
   * Fetch documents from the server.
   * silent=true  → updates data without showing the loading spinner (background sync)
   * silent=false → shows spinner (initial load / manual retry)
   */
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    const [docsResult, workflowsResult, newCountResult] = await Promise.allSettled([
      getDocumentsPage({
        page,
        size: pageSize,
        search: debouncedSearch || undefined,
        folderId: selectedFolderId,
        all: canSeeEveryonesDocuments,
        status: showNewOnly ? 'NEW' : undefined,
      }),
      getWorkflowStatusByDocument(),
      canSeeEveryonesDocuments ? getNewUploadCount(true) : Promise.resolve(0),
    ]);

    if (docsResult.status === 'fulfilled') {
      setDocuments(docsResult.value.content ?? []);
      setTotalPages(docsResult.value.totalPages ?? 0);
      setTotalElements(docsResult.value.totalElements ?? 0);
    } else {
      console.error('Failed to fetch documents:', docsResult.reason);
      setError('Failed to load documents');
      setDocuments([]);
      setTotalPages(0);
      setTotalElements(0);
    }

    if (newCountResult.status === 'fulfilled') {
      setNewCount(Number(newCountResult.value ?? 0));
    }

    if (workflowsResult.status === 'fulfilled') {
      try {
        // Already one row per document, latest first, resolved by the server.
        const statusRecord: Record<string, string> = {};
        for (const row of workflowsResult.value) {
          statusRecord[row.documentId] = row.status ?? '';
        }
        setDocWorkflowStatus(statusRecord);
      } catch (e) {
        console.warn('Failed to build workflow status map', e);
      }
    } else {
      // Workflow status is supplementary (badges only) — don't let it block the document list.
      console.warn('Failed to fetch workflows, continuing without workflow status:', workflowsResult.reason);
    }

    if (!silent) setLoading(false);
  }, [page, pageSize, debouncedSearch, selectedFolderId, canSeeEveryonesDocuments, showNewOnly]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => { setSelectedDocIds(new Set()); }, [selectedFolderId]);

  useEffect(() => { setPage(0); }, [debouncedSearch, selectedFolderId, showNewOnly, pageSize]);

  const handleSelectFolder = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id === null) params.delete('folder');
      else params.set('folder', id);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const handleDelete = async (documentId: string, documentTitle: string) => {
    if (!(await confirm({
      title: `Delete "${documentTitle}"?`,
      description: 'It moves to the recycle bin, where it can be restored for 30 days.',
      confirmLabel: 'Delete',
      tone: 'destructive',
    }))) return;
    try {
      await deleteDocument(documentId);
      // Optimistic: remove immediately from local state
      setDocuments((prev) => prev.filter((d) => d.document_id !== documentId));
      setSelectedDocIds((prev) => { const n = new Set(prev); n.delete(documentId); return n; });
      // Refresh sidebar counts
      setSidebarRefreshKey((k) => k + 1);
    } catch (err) {
      // Reported as a toast rather than the page's error state: one failed
      // delete should not replace the whole list with an error screen.
      console.error('Failed to delete:', err);
      notify.error(err instanceof Error ? err.message : 'Could not delete that document.');
    }
  };

  const openMoveSheet = (singleDocId?: string) => {
    setMoveSingleDocId(singleDocId ?? null);
    setMoveSheetOpen(true);
  };

  const handleMove = async (targetFolderId: string | null) => {
    const ids = moveSingleDocId ? [moveSingleDocId] : Array.from(selectedDocIds);
    if (!ids.length) return;
    try {
      await moveDocuments({ documentIds: ids, targetFolderId });

      // ── Optimistic update ──────────────────────────────────────────────────
      // Immediately patch folder_id in local state so the filtered view
      // updates without any spinner or page refresh.
      setDocuments((prev) =>
        prev.map((d) =>
          ids.includes(d.document_id)
            ? { ...d, folder_id: targetFolderId }
            : d
        )
      );
      setSelectedDocIds(new Set());
      // Tell the sidebar to reload its document counts
      setSidebarRefreshKey((k) => k + 1);

      // Silent background sync to pick up any server-side changes
      fetchData(true);
    } catch (err) {
      console.error('Failed to move:', err);
      setError('Failed to move documents');
    }
  };

  const toggleDoc = (id: string) => {
    setSelectedDocIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (selectedDocIds.size === filteredDocuments.length) setSelectedDocIds(new Set());
    else setSelectedDocIds(new Set(filteredDocuments.map((d) => d.document_id)));
  };

  // The folder, the search and the status were all applied by the database, and
  // only this page was sent, so there is nothing left to filter here. Filtering
  // again would only hide rows the server deliberately returned.
  const filteredDocuments = documents;

  const getStatus = (docId: string) => docWorkflowStatus[String(docId ?? '')] ?? '';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Folder sidebar */}
      <FolderSidebar
        selectedFolderId={selectedFolderId}
        onSelectFolder={handleSelectFolder}
        refreshKey={sidebarRefreshKey}
        onDocumentsChanged={() => fetchData(true)}
      />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden bg-gray-50">
        {/* Page header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
              <p className="text-gray-500 text-sm mt-0.5">Manage and organize your documents</p>
            </div>
            <div className="flex items-center gap-2">
              {selectedDocIds.size > 0 && (
                <Button
                  variant="outline"
                  onClick={() => openMoveSheet()}
                  className="h-9 text-sm gap-1.5 border-slate-300"
                >
                  <MoveRight size={15} />
                  Move selected ({selectedDocIds.size})
                </Button>
              )}
              {hasPermission(permissions, role, "canCreateDocument") && (
                <Button
                  onClick={() => setUploadDialogOpen(true)}
                  className="bg-[#8B2E00] hover:bg-[#7a2401] text-white font-medium h-9 px-5 rounded-md shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Upload
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                {/* Select-all — list view only */}
                {viewMode === 'list' && (
                  <input
                    type="checkbox"
                    checked={selectedDocIds.size === filteredDocuments.length && filteredDocuments.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300 w-3.5 h-3.5"
                  />
                )}
                <span className="text-sm font-medium text-gray-500">
                  {totalElements} document{totalElements !== 1 ? 's' : ''}
                </span>

                {/* Uploads nobody has started a workflow on yet. Only offered to
                    roles that can act on other people's documents. */}
                {canSeeEveryonesDocuments && (
                  <button
                    type="button"
                    onClick={() => setShowNewOnly((on) => !on)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                      showNewOnly
                        ? 'border-[#8B2E00] bg-[#8B2E00] text-white'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    New uploads
                    {newCount > 0 && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          showNewOnly ? 'bg-white/20 text-white' : 'bg-[#f7ede8] text-[#8B2E00]'
                        }`}
                      >
                        {newCount}
                      </span>
                    )}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search documents…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 h-8 text-sm bg-gray-50 border-gray-200"
                />

                {/* View toggle */}
                <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 gap-0.5">
                  <button
                    type="button"
                    title="List view"
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === 'list'
                        ? 'bg-white shadow-sm text-[#8B2E00]'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <List size={15} />
                  </button>
                  <button
                    type="button"
                    title="Grid view"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === 'grid'
                        ? 'bg-white shadow-sm text-[#8B2E00]'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <LayoutGrid size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader className="w-7 h-7 text-[#8B2E00] animate-spin mb-3" />
                <p className="text-gray-500 text-sm">Loading documents…</p>
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-red-600 font-medium text-sm">{error}</p>
                <button
                  onClick={() => fetchData(false)}
                  className="mt-3 px-4 py-2 bg-[#8B2E00] text-white text-sm rounded hover:bg-[#7a2401] transition"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && filteredDocuments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <FileText className="w-14 h-14 text-gray-200 mb-3" />
                <p className="text-gray-500 font-medium text-sm">No documents found</p>
                <p className="text-gray-400 text-xs mt-1">Upload a document to get started</p>
              </div>
            )}

            {/* ── LIST VIEW ─────────────────────────────────────────────────── */}
            {!loading && !error && filteredDocuments.length > 0 && viewMode === 'list' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="py-2.5 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedDocIds.size === filteredDocuments.length && filteredDocuments.length > 0}
                          onChange={toggleAll}
                          className="rounded border-gray-300 w-3.5 h-3.5"
                        />
                      </th>
                      <th className="text-left py-2.5 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">Title</th>
                      <th className="text-left py-2.5 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">Type</th>
                      <th className="text-left py-2.5 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">Created</th>
                      <th className="text-left py-2.5 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                      <th className="text-left py-2.5 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">Locked</th>
                      <th className="text-left py-2.5 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((doc) => (
                      <tr
                        key={doc.document_id}
                        className={`border-b border-gray-50 transition-colors ${
                          selectedDocIds.has(doc.document_id) ? 'bg-amber-50/60' : 'hover:bg-gray-50/60'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedDocIds.has(doc.document_id)}
                            onChange={() => toggleDoc(doc.document_id)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-gray-300 w-3.5 h-3.5"
                          />
                        </td>
                        <td
                          className="py-3 px-4 cursor-pointer"
                          onClick={() => router.push(`/documents/${doc.document_id}`)}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold ${getFileColor(doc.title)}`}>
                              <FileText size={14} />
                            </div>
                            <p className="font-medium text-gray-800 hover:text-[#8B2E00] truncate max-w-[200px]">
                              {doc.title}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-xs">{getFileType(doc.title)}</td>
                        <td className="py-3 px-4 text-gray-400 text-xs">{formatDate(doc.created_at)}</td>
                        <td className="py-3 px-4"><StatusBadge status={getStatus(doc.document_id)} /></td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            doc.is_locked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {doc.is_locked ? 'Locked' : 'Unlocked'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => router.push(`/documents/${doc.document_id}`)} className="p-1.5 hover:bg-gray-100 rounded transition" title="View"><Eye className="w-3.5 h-3.5 text-gray-400" /></button>
                            <button className="p-1.5 hover:bg-gray-100 rounded transition" title="Download"><Download className="w-3.5 h-3.5 text-gray-400" /></button>
                            {hasPermission(permissions, role, "canEditDocument") && (
                              <button onClick={(e) => { e.stopPropagation(); openMoveSheet(doc.document_id); }} className="p-1.5 hover:bg-blue-50 rounded transition" title="Move"><MoveRight className="w-3.5 h-3.5 text-blue-400" /></button>
                            )}
                            {hasPermission(permissions, role, "canDeleteDocument") && (
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(doc.document_id, doc.title); }} className="p-1.5 hover:bg-red-50 rounded transition" title="Delete"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                            )}
                            {hasPermission(permissions, role, "canShareDocument") && (
                              <button onClick={(e) => { e.stopPropagation(); setShareTarget({ id: doc.document_id, title: doc.title }); }} className="p-1.5 hover:bg-gray-100 rounded transition" title="Share"><Share2 className="w-3.5 h-3.5 text-gray-400" /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── GRID VIEW ─────────────────────────────────────────────────── */}
            {!loading && !error && filteredDocuments.length > 0 && viewMode === 'grid' && (
              <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredDocuments.map((doc) => (
                  <DocCard
                    key={doc.document_id}
                    doc={doc}
                    selected={selectedDocIds.has(doc.document_id)}
                    status={getStatus(doc.document_id)}
                    onToggle={() => toggleDoc(doc.document_id)}
                    onView={() => router.push(`/documents/${doc.document_id}`)}
                    onDelete={() => handleDelete(doc.document_id, doc.title)}
                    onMove={() => openMoveSheet(doc.document_id)}
                    onShare={() => setShareTarget({ id: doc.document_id, title: doc.title })}
                  />
                ))}
              </div>
            )}

            {!loading && !error && (
              <div className="px-5 pb-4">
                <PaginationBar
                  page={page}
                  totalPages={totalPages}
                  totalElements={totalElements}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  label="documents"
                  disabled={loading}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload dialog */}
      <UploadDocumentDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadSuccess={() => { fetchData(false); setSidebarRefreshKey((k) => k + 1); }}
        defaultFolderId={selectedFolderId ?? undefined}
      />

      {/* Move sheet */}
      <MoveSheet
        open={moveSheetOpen}
        onClose={() => setMoveSheetOpen(false)}
        onMove={handleMove}
      />

      {/* Share dialog.
          Mounted only while a document is targeted, rather than kept open with
          a changing id: the dialog holds the generated link, token and password
          in its own state, and a dialog that survived between documents would
          offer the previous document's link for the next one. */}
      {shareTarget && (
        <ShareDocumentDialog
          open
          onOpenChange={(open) => { if (!open) setShareTarget(null); }}
          documentId={shareTarget.id}
          documentTitle={shareTarget.title}
        />
      )}
    </div>
  );
}
