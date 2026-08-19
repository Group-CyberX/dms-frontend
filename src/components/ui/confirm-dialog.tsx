"use client";

import { AlertTriangle, HelpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type ConfirmOptions = {
  title: string;
  /** What will actually happen, named concretely. */
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'destructive' for anything that removes or revokes; red confirm button. */
  tone?: "default" | "destructive";
};

/**
 * The dialog behind useConfirm(). Rendered once by ConfirmProvider - screens
 * call the hook rather than mounting this themselves.
 */
export function ConfirmDialog({
  options,
  busy,
  onConfirm,
  onCancel,
}: {
  options: ConfirmOptions | null;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const open = options !== null;
  const destructive = options?.tone === "destructive";

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent className="max-w-[440px] rounded-xl p-0" showCloseButton={false}>
        <div className="px-6 pb-5 pt-6">
          <DialogHeader className="space-y-0 text-left">
            <div className="flex gap-3.5">
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  destructive ? "bg-red-50 text-red-600" : "bg-[#f7ede8] text-[#953002]"
                }`}
              >
                {destructive ? (
                  <AlertTriangle className="h-[18px] w-[18px]" />
                ) : (
                  <HelpCircle className="h-[18px] w-[18px]" />
                )}
              </span>

              <div className="min-w-0 space-y-1.5">
                <DialogTitle className="text-[17px] font-semibold leading-snug text-slate-900">
                  {options?.title ?? ""}
                </DialogTitle>
                {options?.description && (
                  <DialogDescription className="text-sm leading-relaxed text-slate-500">
                    {options.description}
                  </DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>

          <DialogFooter className="mt-6 flex-row justify-end gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={busy}
              className="h-9 rounded-md border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              {options?.cancelLabel ?? "Cancel"}
            </Button>

            <Button
              type="button"
              autoFocus
              onClick={onConfirm}
              disabled={busy}
              className={`h-9 rounded-md px-4 text-sm font-medium text-white shadow-sm ${
                destructive
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-[#953002] hover:bg-[#7f2600]"
              }`}
            >
              {options?.confirmLabel ?? "Confirm"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
