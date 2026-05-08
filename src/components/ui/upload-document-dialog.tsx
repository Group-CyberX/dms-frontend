'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadDocument } from '@/lib/api-client';
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

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess?: () => void | Promise<void>;
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  onUploadSuccess,
}: UploadDocumentDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [documentName, setDocumentName] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [percentComplete, setPercentComplete] = useState(0);

  const {
    initiateUpload,
    uploadChunks,
    completeUpload,
    percentComplete: multipartPercent,
    error: uploadError,
  } = useMultipartUpload();

  const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100MB

  const onDrop = (acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(
      (file) => file.size <= 100 * 1024 * 1024
    );
    if (validFiles.length < acceptedFiles.length) {
      setError('Some files were too large (max 100MB) and were not added.');
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
    if (!category) {
      setError('Category is required');
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
          const initResponse = await initiateUpload(file);
          const { sessionId, partSize } = initResponse;

          // Step 2: Upload chunks
          await uploadChunks(file, sessionId, partSize);

          // Step 3: Complete
          const result = await completeUpload(sessionId, {
            title: documentName,
            category: category || undefined,
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
          setPercentComplete(100);
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
            category: category,
            tags: tags || undefined,
            description: description || undefined,
          },
          (progress) => {
            // Update progress bar in real-time (KB by KB)
            setPercentComplete(progress.percentage);
            console.log(`Uploaded: ${(progress.loaded / 1024 / 1024).toFixed(2)}MB / ${(progress.total / 1024 / 1024).toFixed(2)}MB`);
          }
        );

        if (!result.success) {
          setError(result.message || 'Upload failed');
          setIsUploading(false);
          return;
        }

        console.log('Upload successful!', result);
        setSuccess(true);
        setPercentComplete(100);
        setIsUploading(false);
      }

      // Reset form on success
      setFiles([]);
      setDocumentName('');
      setCategory('');
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
                  {(multipartPercent || percentComplete).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-[#953002] h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${multipartPercent || percentComplete}%` }}
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
                    Maximum file size: 100MB
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

            {/* Category */}
            <div className="space-y-1">
              <label htmlFor="category" className="text-xs font-medium text-gray-700">
                Category *
              </label>
              <Select value={category} onValueChange={(value) => {
                setCategory(value);
                if (error) setError(null);
              }}>
                <SelectTrigger className="bg-white border-gray-300 h-9 text-sm">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

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