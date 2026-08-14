"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronRight, Folder, FolderOpen, Plus, Pencil, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { FolderTreeNode } from "@/lib/api-client";

interface FolderNodeProps {
  node: FolderTreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCreateSubfolder: (parentId: string, name: string) => Promise<void>;
  /** Ask the parent to open the delete-confirmation dialog for this folder */
  onRequestDelete: (id: string) => void;
  onRenameFolder: (id: string, newName: string) => Promise<void>;
  /** When this matches node.folder_id, force-expand (e.g. a child was just created inside it). */
  forceOpenId?: string | null;
}

export function FolderNode({
  node,
  depth,
  selectedId,
  onSelect,
  onCreateSubfolder,
  onRequestDelete,
  onRenameFolder,
  forceOpenId,
}: FolderNodeProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (forceOpenId && forceOpenId === node.folder_id) setIsOpen(true);
  }, [forceOpenId, node.folder_id]);
  const [isCreating, setIsCreating] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameName, setRenameName] = useState(node.name);
  const createInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const isSelected = selectedId === node.folder_id;
  const hasChildren = node.children && node.children.length > 0;

  // Focus inline input when shown
  useEffect(() => {
    if (isCreating && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [isCreating]);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) setIsOpen((prev) => !prev);
  };

  const handleSelect = () => {
    onSelect(node.folder_id);
  };

  const handleStartCreate = () => {
    setIsOpen(true);
    setNewName("");
    setIsCreating(true);
  };

  const handleConfirmCreate = async () => {
    const trimmed = newName.trim();
    if (trimmed) {
      await onCreateSubfolder(node.folder_id, trimmed);
    }
    setIsCreating(false);
    setNewName("");
  };

  const handleConfirmRename = async () => {
    const trimmed = renameName.trim();
    if (trimmed && trimmed !== node.name) {
      await onRenameFolder(node.folder_id, trimmed);
    }
    setIsRenaming(false);
  };

  const indent = depth * 12;

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={`group flex items-center gap-1.5 rounded-md px-2 py-1.5 cursor-pointer select-none transition-colors ${
              isSelected
                ? "bg-[#8B2E00] text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
            style={{ paddingLeft: `${8 + indent}px` }}
            onClick={handleSelect}
          >
            {/* Chevron toggle */}
            <button
              type="button"
              onClick={handleToggle}
              className={`flex-shrink-0 w-4 h-4 flex items-center justify-center transition-transform duration-150 ${
                isSelected ? "text-white" : "text-slate-400"
              } ${!hasChildren ? "invisible" : ""}`}
            >
              <ChevronRight
                size={13}
                className={`transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
              />
            </button>

            {/* Folder icon */}
            {isOpen && hasChildren ? (
              <FolderOpen
                size={16}
                className={`flex-shrink-0 ${isSelected ? "text-white" : "text-amber-500"}`}
              />
            ) : (
              <Folder
                size={16}
                className={`flex-shrink-0 ${isSelected ? "text-white" : "text-amber-500"}`}
              />
            )}

            {/* Name — rename inline */}
            {isRenaming ? (
              <input
                ref={renameInputRef}
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                onBlur={handleConfirmRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmRename();
                  if (e.key === "Escape") {
                    setRenameName(node.name);
                    setIsRenaming(false);
                  }
                  e.stopPropagation();
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 bg-white text-slate-900 text-xs rounded px-1 py-0 border border-[#8B2E00] outline-none"
              />
            ) : (
              <span className="flex-1 min-w-0 truncate text-xs font-medium">
                {node.name}
              </span>
            )}

            {/* Document count badge */}
            <span
              className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[22px] text-center ${
                isSelected
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {node.documentCount}
            </span>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-44">
          <ContextMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleStartCreate();
            }}
            className="gap-2 text-sm"
          >
            <Plus size={14} />
            New subfolder
          </ContextMenuItem>
          <ContextMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setRenameName(node.name);
              setIsRenaming(true);
            }}
            className="gap-2 text-sm"
          >
            <Pencil size={14} />
            Rename
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onRequestDelete(node.folder_id);
            }}
            className="gap-2 text-sm text-red-600 focus:text-red-600"
          >
            <Trash2 size={14} />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Inline create input */}
      {isCreating && (
        <div
          className="flex items-center gap-1.5 px-2 py-1"
          style={{ paddingLeft: `${8 + indent + 28}px` }}
        >
          <Folder size={14} className="flex-shrink-0 text-amber-400" />
          <input
            ref={createInputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleConfirmCreate}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirmCreate();
              if (e.key === "Escape") {
                setIsCreating(false);
                setNewName("");
              }
              e.stopPropagation();
            }}
            placeholder="Folder name"
            className="flex-1 min-w-0 bg-white text-slate-900 text-xs rounded px-1.5 py-0.5 border border-[#8B2E00] outline-none placeholder:text-slate-300"
          />
        </div>
      )}

      {/* Children */}
      {isOpen && hasChildren && (
        <div>
          {node.children.map((child) => (
            <FolderNode
              key={child.folder_id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onCreateSubfolder={onCreateSubfolder}
              onRequestDelete={onRequestDelete}
              onRenameFolder={onRenameFolder}
              forceOpenId={forceOpenId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
