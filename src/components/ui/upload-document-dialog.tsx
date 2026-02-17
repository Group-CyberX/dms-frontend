'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
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
import { Upload, X } from 'lucide-react';

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
}: UploadDocumentDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [documentName, setDocumentName] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = (acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(
      (file) => file.size <= 100 * 1024 * 1024
    );
    if (validFiles.length < acceptedFiles.length) {
      alert('Some files were too large (max 100MB) and were not added.');
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
  };

  const handleUpload = async () => {
    if (!files.length || !documentName || !category) {
      alert('Please fill in all required fields');
      return;
    }

    setIsUploading(true);
    try {
      // TODO: Implement actual upload logic
      console.log('Uploading document:', {
        files,
        documentName,
        category,
        tags,
        description,
      });

      // Simulated upload delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Reset form
      setFiles([]);
      setDocumentName('');
      setCategory('');
      setTags('');
      setDescription('');
      onOpenChange(false);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Upload Document</DialogTitle>
          <p className="text-xs text-gray-600 mt-1">
            Upload files and configure document metadata
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
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
                onChange={(event) => setDocumentName(event.target.value)}
                className="bg-white border-gray-300 text-sm h-9"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label htmlFor="category" className="text-xs font-medium text-gray-700">
                Category *
              </label>
              <Select value={category} onValueChange={setCategory}>
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
              onChange={(event) => setTags(event.target.value)}
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
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-xs focus-visible:border-amber-700 focus-visible:ring-2 focus-visible:ring-amber-200"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
            className="border-gray-300 h-9 text-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={isUploading || files.length === 0}
            className="bg-[#953002] hover:bg-[#953002] text-white h-9 text-sm"
          >
            <Upload className="w-4 h-4 mr-1" />
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}