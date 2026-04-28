"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentName: string;
  onConfirm: (comment: string) => Promise<void> | void;
  loading?: boolean;
};

export default function ApproveTaskDialog({
  open,
  onOpenChange,
  documentName,
  onConfirm,
  loading = false,
}: Props) {
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!open) {
      setComment('');
    }
  }, [open]);

  const handleConfirm = async () => {
    await onConfirm(comment.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-0 shadow-md sm:max-w-lg">
        <div className="px-4 pb-4 pt-4">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg font-semibold tracking-tight text-gray-800">
              Approve Task
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-gray-600">
              Document: {documentName}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">Comments</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add your comments..."
              rows={3}
              className="min-h-20 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none transition placeholder:text-gray-500 focus:border-gray-400"
            />
            <p className="mt-2 text-xs text-gray-500">Optional</p>
          </div>

          <DialogFooter className="mt-4 flex flex-row justify-end gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 rounded-md px-4 text-sm font-medium text-gray-700"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              className="h-9 rounded-md bg-[#a34713] px-4 text-sm font-medium text-white hover:bg-[#8e3d10]"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
