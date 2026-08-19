"use client"

import React, { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { getSearchHistory, clearSearchHistory, SearchHistoryItem } from "@/lib/api-client"
import { Trash2, Loader2 } from "lucide-react"
import { useConfirm } from "@/hooks/use-confirm"

interface SearchHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchHistoryDialog({ open, onOpenChange }: SearchHistoryDialogProps) {
  const confirm = useConfirm()
  const router = useRouter()
  const [history, setHistory] = useState<SearchHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchSearchHistory()
    }
  }, [open])

  const fetchSearchHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getSearchHistory()
      setHistory(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Failed to fetch search history:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch search history")
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  const handleClearHistory = async () => {
    if (!(await confirm({
      title: "Clear all search history?",
      description: "Your saved searches are removed for good. This cannot be undone.",
      confirmLabel: "Clear history",
      tone: "destructive",
    }))) {
      return
    }

    try {
      await clearSearchHistory()
      setHistory([])
    } catch (err) {
      console.error("Failed to clear search history:", err)
      setError(err instanceof Error ? err.message : "Failed to clear search history")
    }
  }

  const formatDate = (timestamp: string): string => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return timestamp
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Search History</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
            <span className="ml-2 text-slate-600">Loading search history...</span>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-500 font-medium">No search history yet</p>
            <p className="text-sm text-slate-400 mt-2">Your search history will appear here</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {history.map((item) => (
              <div
                key={item.searchId}
                className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <button
                      onClick={() => {
                        router.push(`/documents/${item.documentId}`)
                        onOpenChange(false)
                      }}
                      className="font-medium text-slate-900 hover:text-[#953002] hover:underline text-left transition-colors"
                    >
                      {item.documentTitle}
                    </button>
                    <p className="text-sm text-slate-600 mt-1">
                      Query: <span className="font-mono">{item.query}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{formatDate(item.timestamp)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-4 border-t">
          {history.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearHistory}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear History
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
