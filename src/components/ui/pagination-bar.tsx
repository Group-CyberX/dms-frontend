"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationBarProps = {
  /** Zero-based, as the API returns it. */
  page: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  /** What is being counted, e.g. "records" or "users". */
  label?: string;
  disabled?: boolean;
};

const PAGE_SIZES = [10, 25, 50, 100];

/**
 * Pager for a server-side paged list.
 *
 * It reports the total from the server rather than the length of what is on
 * screen, because the screen only ever holds one page. Buttons move the page
 * index; the parent refetches.
 */
export default function PaginationBar({
  page,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  onPageSizeChange,
  label = "records",
  disabled = false,
}: PaginationBarProps) {
  if (totalElements === 0) return null;

  const firstRow = page * pageSize + 1;
  const lastRow = Math.min((page + 1) * pageSize, totalElements);

  // A short window around the current page, so a hundred pages do not produce a
  // hundred buttons.
  const windowStart = Math.max(0, Math.min(page - 2, Math.max(0, totalPages - 5)));
  const windowEnd = Math.min(totalPages, windowStart + 5);
  const pages = Array.from({ length: windowEnd - windowStart }, (_, i) => windowStart + i);

  return (
    <div className="flex flex-col gap-3 border-t bg-white px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground">
        Showing <span className="font-medium text-slate-900">{firstRow}</span>–
        <span className="font-medium text-slate-900">{lastRow}</span> of{" "}
        <span className="font-medium text-slate-900">{totalElements}</span> {label}
      </p>

      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <select
            className="mr-2 h-8 rounded-md border border-gray-300 bg-white px-2 text-xs"
            value={pageSize}
            disabled={disabled}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Rows per page"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        )}

        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2"
          disabled={disabled || page <= 0}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pages.map((p) => (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="sm"
            className={`h-8 w-8 p-0 ${p === page ? "bg-[#953002] hover:bg-[#6B2100]" : ""}`}
            disabled={disabled}
            onClick={() => onPageChange(p)}
          >
            {p + 1}
          </Button>
        ))}

        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2"
          disabled={disabled || page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
