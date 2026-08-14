'use client';

import { useState, useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadDocument, getFolders, Folder } from '@/lib/api-client';
import { useMultipartUpload } from '@/hooks/use-multipart-upload';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';

/** Root-to-leaf chain of folder ids leading to `folderId`, so a cascading
 * picker can be pre-drilled-down to it. */
function buildAncestorChain(folders: Folder[], folderId?: string): string[] {
  if (!folderId) return [];
  const byId = new Map(folders.map((f) => [f.folder_id, f]));
  const chain: string[] = [];
  let current: string | undefined = folderId;
  while (current) {
    chain.unshift(current);
    current = byId.get(current)?.parent_folder_id ?? undefined;
  }
  return chain;
}

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess?: () => void | Promise<void>;
  /** Preselect this folder in the dropdown (e.g. the folder currently being browsed) */
  defaultFolderId?: string;
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  onUploadSuccess,
  defaultFolderId,
}: UploadDocumentDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [documentName, setDocumentName] = useState('');
  // One entry per drill-down level: selectionPath[0] is the top-level folder
  // chosen, selectionPath[1] the subfolder chosen inside it, and so on. The
  // upload target is always the deepest entry actually chosen.
  const [selectionPath, setSelectionPath] = useState<string[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [percentComplete, setPercentComplete] = useState(0);

  const selectedFolderId = selectionPath[selectionPath.length - 1] ?? '';

  // One dropdown per drill-down level: level 0 is always the root folders;
  // level i (i > 0) only appears once level i-1 has a selection AND that
  // selection actually has children.
  const folderLevels = useMemo(() => {
    const levels: Folder[][] = [];
    let parentId: string | null = null;
    for (let depth = 0; ; depth++) {
      const options = folders.filter((f) => (f.parent_folder_id ?? null) === parentId);
      if (options.length === 0) break;
      levels.push(options);
      const chosen = selectionPath[depth];
      if (!chosen) break;
      parentId = chosen;
    }
    return levels;
  }, [folders, selectionPath]);

  const handleSelectAtLevel = (levelIndex: number, folderId: string) => {
    setSelectionPath((prev) => [...prev.slice(0, levelIndex), folderId]);
    if (error) setError(null);
  };

  // Load the folder list fresh each time the dialog opens, and pre-drill
  // the picker down to the folder currently being browsed (if any).
  useEffect(() => {
    if (!open) return;
    setFoldersLoading(true);
    getFolders()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setFolders(list);
        setSelectionPath(buildAncestorChain(list, defaultFolderId));
      })
      .catch((err) => {
        console.error('Failed to load folders:', err);
        setFolders([]);
        setSelectionPath([]);
      })
      .finally(() => setFoldersLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const {
    initiateUpload,
    uploadChunks,
    completeUpload,
    percentComplete: hookPercentComplete,
    error: uploadError,
  } = useMultipartUpload();

  // Sync hook progress to dialog state during upload
  useEffect(() => {
    if (isUploading) {
      console.log('[Dialog] Syncing progress from hook:', hookPercentComplete);
      setPercentComplete(hookPercentComplete);
    }
  }, [hookPercentComplete, isUploading]);

  const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100MB - threshold for switching to multipart
  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB - max file size

  const onDrop = (acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(
      (file) => file.size <= MAX_FILE_SIZE
    );
    if (validFiles.length < acceptedFiles.length) {
      setError('Some files were too large (max 500MB) and were not added.');
    } else {
      setError(null);
    }
    setFiles((prev) => [...prev, ...validFiles]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    noClick: false,
  });

  const removeFile = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
    if (error) setError(null);
  };

  const handleUpload = async () => {
    // Clear previous errors
    setError(null);
    setSuccess(false);
    setPercentComplete(0);

    // Frontend validation
    if (!files.length) {
      setError('Please select a file to upload');
      return;
    }
    if (!documentName.trim()) {
      setError('Document name is required');
      return;
    }
    if (!selectedFolderId) {
      setError('Please select a folder');
      return;
    }

    const file = files[0];
    setIsUploading(true);

    try {
      // Decide: multipart or single-part?
      if (file.size > MULTIPART_THRESHOLD) {
        // ===== MULTIPART UPLOAD (for files > 100MB) =====
        console.log(`File ${file.name} is ${file.size} bytes, using multipart upload`);

        try {
          // Step 1: Initiate
          const initResponse = await initiateUpload(file, {
            title: documentName,
            tags: tags || undefined,
            description: description || undefined,
          });
          const { sessionId, partSize } = initResponse;

          // Step 2: Upload chunks
          await uploadChunks(file, sessionId, partSize);

          // Step 3: Complete
          const result = await completeUpload(sessionId, {
            title: documentName,
            folderId: selectedFolderId || undefined,
            tags: tags || undefined,
            description: description || undefined,
          });

          if (!result.success) {
            setError(result.message || 'Upload failed');
            setIsUploading(false);
            return;
          }

          console.log('Multipart upload successful!', result);
          setSuccess(true);
          // Progress is already at 100% from completeUpload hook
          setIsUploading(false);
        } catch (error) {
          console.error('Multipart upload failed:', error);
          const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
          setError(errorMessage);
          setIsUploading(false);
          return;
        }
      } else {
        // ===== SINGLE-PART UPLOAD (for files ≤ 100MB) =====
        console.log(`File ${file.name} is ${file.size} bytes, using single-part upload`);

        const result = await uploadDocument(
          {
            file,
            title: documentName,
            folderId: selectedFolderId,
            tags: tags || undefined,
            description: description || undefined,
          },
          (progress) => {
            // Update progress bar in real-time
            // Progress is capped at 95% during upload, then shows processing (98%), then 100% on completion
            setPercentComplete(progress.percentage);
            console.log(`[Dialog] Upload progress: ${(progress.loaded / 1024 / 1024).toFixed(2)}MB / ${(progress.total / 1024 / 1024).toFixed(2)}MB = ${progress.percentage.toFixed(1)}%`);
          }
        );

        if (!result.success) {
          setError(result.message || 'Upload failed');
          setIsUploading(false);
          return;
        }

        console.log('Upload successful!', result);
        setSuccess(true);
        // Progress is already at 100% from the API callback, just mark as not uploading
        setIsUploading(false);
      }

      // Reset form on success
      setFiles([]);
      setDocumentName('');
      setSelectionPath([]);
      setTags('');
      setDescription('');
      setError(null);

      // Close dialog immediately after upload completes
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false); // Reset success state
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      }, 800); // Close sooner so user sees brief success message
    } catch (error) {
      console.error('Upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setError(null);
      setSuccess(false);
      setPercentComplete(0);
      setIsUploading(false);
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Upload Document</DialogTitle>
          <p className="text-xs text-gray-600 mt-1">
            Upload files and configure document metadata
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-3 rounded-md bg-red-50 border border-red-200">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-start gap-3 p-3 rounded-md bg-green-50 border border-green-200">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">Document uploaded successfully!</p>
              </div>
            </div>
          )}

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Uploading...</span>
                <span className="text-sm font-semibold text-[#953002]">
                  {percentComplete.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-[#953002] h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${percentComplete}%` }}
                />
              </div>
            </div>
          )}
          {/* File Upload Section */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">
              Select Files
            </label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition cursor-pointer ${
                isDragActive
                  ? 'border-[#953002] bg-amber-50'
                  : 'border-gray-300 hover:border-[#953002] '
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-8 h-8 mx-auto text-gray-400 mb-3" />
              {isDragActive ? (
                <p className="text-gray-700 font-medium text-sm">
                  Drop files here...
                </p>
              ) : (
                <>
                  <p className="text-gray-700 font-medium text-sm mb-1">
                    Drag & drop files here
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    Maximum file size: 500MB
                  </p>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"
                  >
                    Choose File from Device
                  </button>
                </>
              )}
            </div>

            {/* Selected Files List */}
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Document Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="docname" className="text-xs font-medium text-gray-700">
                Document Name
              </label>
              <Input
                id="docname"
                placeholder="Enter document name"
                value={documentName}
                onChange={(event) => {
                  setDocumentName(event.target.value);
                  if (error) setError(null);
                }}
                className="bg-white border-gray-300 text-sm h-9"
              />
            </div>

            {/* Folder (top level) */}
            <div className="space-y-1">
              <label htmlFor="folder" className="text-xs font-medium text-gray-700">
                Folder *
              </label>
              <Select
                value={selectionPath[0] ?? ''}
                onValueChange={(value) => handleSelectAtLevel(0, value)}
                disabled={foldersLoading}
              >
                <SelectTrigger className="bg-white border-gray-300 h-9 text-sm">
                  <SelectValue
                    placeholder={foldersLoading ? 'Loading folders...' : 'Select folder'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {[...(folderLevels[0] ?? [])]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((folder) => (
                      <SelectItem key={folder.folder_id} value={folder.folder_id}>
                        {folder.name}
                      </SelectItem>
                    ))}
                  {!foldersLoading && (folderLevels[0]?.length ?? 0) === 0 && (
                    <div className="px-2 py-1.5 text-xs text-gray-500">
                      No folders yet
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subfolder pickers — one appears per level, only once the folder
              chosen above (or in the previous subfolder dropdown) actually has children. */}
          {folderLevels.slice(1).map((options, i) => {
            const levelIndex = i + 1;
            return (
              <div className="space-y-1" key={levelIndex}>
                <label className="text-xs font-medium text-gray-700">
                  Subfolder
                </label>
                <Select
                  value={selectionPath[levelIndex] ?? ''}
                  onValueChange={(value) => handleSelectAtLevel(levelIndex, value)}
                >
                  <SelectTrigger className="bg-white border-gray-300 h-9 text-sm">
                    <SelectValue placeholder="Select subfolder (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...options]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((folder) => (
                        <SelectItem key={folder.folder_id} value={folder.folder_id}>
                          {folder.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}

          {/* Tags */}
          <div className="space-y-1">
            <label htmlFor="tags" className="text-xs font-medium text-gray-700">
              Tags
            </label>
            <Input
              id="tags"
              placeholder="Enter tags (comma-separated)"
              value={tags}
              onChange={(event) => {
                setTags(event.target.value);
                if (error) setError(null);
              }}
              className="bg-white border-gray-300 text-sm h-9"
            />
            <p className="text-xs text-gray-500">
              Example: urgent, Q1 2026, vendor-abc
            </p>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label htmlFor="description" className="text-xs font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              placeholder="Enter document description (optional)"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                if (error) setError(null);
              }}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-xs focus-visible:border-amber-700 focus-visible:ring-2 focus-visible:ring-amber-200"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading || success}
            className="border-gray-300 h-9 text-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={isUploading || files.length === 0 || success}
            className="bg-[#953002] hover:bg-[#953002] text-white h-9 text-sm"
          >
            <Upload className="w-4 h-4 mr-1" />
            {isUploading ? 'Uploading...' : success ? 'Done' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}