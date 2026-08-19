"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { FileText, FolderPlus, RefreshCw, FolderOpen, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getFolders,
  fetchFolderTree,
  createFolder as apiCreateFolder,
  deleteFolder as apiDeleteFolder,
  updateFolder as apiUpdateFolder,
  Folder,
  FolderTreeNode,
} from "@/lib/api-client";
import { FolderNode } from "@/components/FolderNode";
import { useAuthStore } from "@/store/auth-store";
import { hasPermission } from "@/lib/access-control";

interface FolderSidebarProps {
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  /** Increment to trigger a silent reload of folder counts */
  refreshKey?: number;
  /** Called after a folder delete moves documents to the recycle bin, so the parent can refresh its own document list */
  onDocumentsChanged?: () => void;
  /**
   * Whose documents the counts describe. Must match the scope of the list
   * rendered beside them, or a folder badge contradicts the list.
   */
  allOwners?: boolean;
}

export function FolderSidebar({
  selectedFolderId,
  onSelectFolder,
  refreshKey = 0,
  onDocumentsChanged,
  allOwners = false,
}: FolderSidebarProps) {
  // Deleting a folder soft-deletes every document inside it, whoever owns
  // them, so it is gated on its own permission rather than on being able to
  // delete a single document.
  const role = useAuthStore((state) => state.role);
  const permissions = useAuthStore((state) => state.permissions);
  const canDeleteFolder = hasPermission(permissions, role, "canDeleteFolder");

  const [tree, setTree] = useState<FolderTreeNode[]>([]);
  const [allDocCount, setAllDocCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flatFolders, setFlatFolders] = useState<Folder[]>([]);

  // ── New-folder dialog state ─────────────────────────────────────────────
  // Creating via the header "+" targets whichever folder is currently
  // selected in the tree, so the user can pick the parent just by
  // clicking a folder first. No selection → root folder.
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderSaving, setNewFolderSaving] = useState(false);
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  // Set right after a folder is created inside a parent, so that parent's
  // node auto-expands to reveal the new child instead of staying collapsed.
  const [justExpandedFolderId, setJustExpandedFolderId] = useState<
    string | null
  >(null);

  const selectedFolder = useMemo(
    () => flatFolders.find((f) => f.folder_id === selectedFolderId) ?? null,
    [flatFolders, selectedFolderId]
  );

  // ── Delete-folder dialog state ──────────────────────────────────────────
  // Shared by the header "Delete" button (targets the selected folder) and
  // each node's right-click "Delete" menu item.
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const deleteTargetFolder = useMemo(
    () => flatFolders.find((f) => f.folder_id === deleteTargetId) ?? null,
    [flatFolders, deleteTargetId]
  );
  const deleteTargetHasChildren = useMemo(
    () =>
      deleteTargetId
        ? flatFolders.some((f) => f.parent_folder_id === deleteTargetId)
        : false,
    [flatFolders, deleteTargetId]
  );

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Flat folders drive the create/rename/delete dialogs, which only need
      // names and parent ids. The tree - structure plus the counts rolled up
      // per folder - comes from the backend rather than being recomputed here.
      //
      // The counts are deliberately left at the default scope, "my documents",
      // scoped exactly as the list beside them is. Asking for one scope here
      // and rendering the other next to it is what made a folder claim 26 files
      // against a list of 3.
      const [folders, treeRoot] = await Promise.all([
        getFolders(),
        fetchFolderTree(allOwners),
      ]);
      const flds: Folder[] = Array.isArray(folders) ? folders : [];
      setFlatFolders(flds);
      setAllDocCount(treeRoot.documentCount);
      setTree(treeRoot.children);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Failed to load folders";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [allOwners]);

  // Initial load
  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // Reload whenever the parent signals a data change (move / delete)
  useEffect(() => {
    if (refreshKey > 0) loadTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // Focus the input when the dialog opens
  useEffect(() => {
    if (newFolderDialogOpen) {
      setNewFolderName("");
      // Small delay so the dialog animation finishes first
      setTimeout(() => newFolderInputRef.current?.focus(), 80);
    }
  }, [newFolderDialogOpen]);

  // ── Mutation handlers ─────────────────────────────────────────────────────

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    // Target the currently selected folder as parent; no selection = root.
    const parentId = selectedFolderId ?? undefined;
    setNewFolderSaving(true);
    try {
      await apiCreateFolder(name, parentId);
      setNewFolderDialogOpen(false);
      await loadTree();
      if (parentId) setJustExpandedFolderId(parentId);
    } finally {
      setNewFolderSaving(false);
    }
  };

  const handleCreateSubfolder = useCallback(
    async (parentId: string, name: string) => {
      await apiCreateFolder(name, parentId);
      await loadTree();
    },
    [loadTree]
  );

  const handleDeleteFolder = useCallback(
    async (id: string) => {
      // Cascades server-side: id and all its subfolders are deleted, and
      // every document inside any of them moves to the recycle bin.
      const result = await apiDeleteFolder(id);
      if (selectedFolderId && result.deletedFolderIds.includes(selectedFolderId)) {
        onSelectFolder(null);
      }
      await loadTree();
      onDocumentsChanged?.();
    },
    [selectedFolderId, onSelectFolder, loadTree, onDocumentsChanged]
  );

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleteSaving(true);
    try {
      await handleDeleteFolder(deleteTargetId);
      setDeleteTargetId(null);
    } finally {
      setDeleteSaving(false);
    }
  };

  const handleRenameFolder = useCallback(
    async (id: string, newName: string) => {
      const folder = flatFolders.find((f) => f.folder_id === id);
      if (!folder) return;
      const segments = folder.path.split("/");
      segments[segments.length - 1] = newName;
      const newPath = segments.join("/");
      await apiUpdateFolder(
        id,
        newName,
        folder.parent_folder_id ?? undefined,
        newPath
      );
      await loadTree();
    },
    [flatFolders, loadTree]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <aside className="w-56 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Folders
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Refresh"
              onClick={loadTree}
              className="p-1 rounded hover:bg-slate-100 transition-colors"
            >
              <RefreshCw size={12} className="text-slate-400" />
            </button>
            <button
              type="button"
              title={
                selectedFolder
                  ? `New folder in "${selectedFolder.name}"`
                  : "New root folder"
              }
              onClick={() => setNewFolderDialogOpen(true)}
              className="p-1 rounded hover:bg-slate-100 transition-colors"
            >
              <FolderPlus size={13} className="text-slate-400" />
            </button>
            {canDeleteFolder && (
              <button
                type="button"
                title={
                  selectedFolder
                    ? `Delete "${selectedFolder.name}"`
                    : "Select a folder to delete"
                }
                onClick={() =>
                  selectedFolderId && setDeleteTargetId(selectedFolderId)
                }
                disabled={!selectedFolderId}
                className="p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              >
                <Trash2 size={13} className="text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && !loading && (
          <div className="mx-3 mb-2">
            <Alert variant="destructive" className="p-2">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
            <button
              type="button"
              onClick={loadTree}
              className="mt-1 w-full text-xs text-[#8B2E00] hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Tree list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
          {/* Loading skeletons */}
          {loading && (
            <div className="space-y-1.5 pt-1 px-1">
              {[...Array(7)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-6 w-full rounded"
                  style={{ opacity: 1 - i * 0.1 }}
                />
              ))}
            </div>
          )}

          {!loading && (
            <>
              {/* "All Documents" root entry */}
              <div
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer select-none transition-colors ${
                  selectedFolderId === null
                    ? "bg-[#8B2E00] text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
                onClick={() => onSelectFolder(null)}
              >
                <FileText
                  size={16}
                  className={`flex-shrink-0 ${
                    selectedFolderId === null ? "text-white" : "text-[#8B2E00]"
                  }`}
                />
                <span className="flex-1 min-w-0 truncate text-xs font-semibold">
                  All Documents
                </span>
                <span
                  className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[22px] text-center ${
                    selectedFolderId === null
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {allDocCount}
                </span>
              </div>

              {/* Folder tree nodes */}
              {tree.map((node) => (
                <FolderNode
                  key={node.folder_id}
                  node={node}
                  depth={0}
                  selectedId={selectedFolderId}
                  onSelect={onSelectFolder}
                  onCreateSubfolder={handleCreateSubfolder}
                  onRequestDelete={setDeleteTargetId}
                  onRenameFolder={handleRenameFolder}
                  forceOpenId={justExpandedFolderId}
                  canDelete={canDeleteFolder}
                />
              ))}

              {/* Empty state */}
              {tree.length === 0 && !error && (
                <p className="px-3 pt-2 text-[11px] text-slate-400">
                  No folders yet. Use the{" "}
                  <FolderPlus size={11} className="inline" /> button to create
                  one.
                </p>
              )}
            </>
          )}
        </div>
      </aside>

      {/* ── New Folder Dialog ──────────────────────────────────────────────── */}
      <Dialog
        open={newFolderDialogOpen}
        onOpenChange={(open) => {
          if (!open) setNewFolderDialogOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <FolderOpen size={20} className="text-amber-500" />
              </div>
              <DialogTitle className="text-base font-semibold">
                {selectedFolder ? "New Subfolder" : "Create New Folder"}
              </DialogTitle>
            </div>
            {selectedFolder && (
              <p className="text-xs text-slate-500 pl-[52px]">
                Will be created inside{" "}
                <span className="font-medium text-slate-700">
                  {selectedFolder.name}
                </span>
              </p>
            )}
          </DialogHeader>

          <div className="py-1">
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">
              Folder name
            </label>
            <Input
              ref={newFolderInputRef}
              placeholder="e.g. Invoices 2025"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
                if (e.key === "Escape") setNewFolderDialogOpen(false);
              }}
              className="h-9 text-sm"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewFolderDialogOpen(false)}
              disabled={newFolderSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || newFolderSaving}
              className="bg-[#8B2E00] hover:bg-[#7a2401] text-white"
            >
              {newFolderSaving ? "Creating…" : "Create folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Folder Dialog ───────────────────────────────────────────── */}
      <Dialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open && !deleteSaving) setDeleteTargetId(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <DialogTitle className="text-base font-semibold">
                Delete folder
              </DialogTitle>
            </div>
            <p className="text-xs text-slate-500 pl-[52px]">
              Delete{" "}
              <span className="font-medium text-slate-700">
                {deleteTargetFolder?.name}
              </span>
              {deleteTargetHasChildren ? " and all of its subfolders" : ""}?{" "}
              {deleteTargetHasChildren
                ? "Every document inside them will be moved to the Recycle Bin."
                : "Any documents inside it will be moved to the Recycle Bin."}
            </p>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTargetId(null)}
              disabled={deleteSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={confirmDelete}
              disabled={deleteSaving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteSaving ? "Deleting…" : "Delete folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
