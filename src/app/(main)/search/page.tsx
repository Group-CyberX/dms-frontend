"use client"

"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Card, CardContent } from "@/components/ui/card"
import { SearchFilters } from "@/components/ui/search/searchfilter"
import { useSearchStore, Document } from "@/store/search-store"
import { FileText, User, Calendar, History, Clock } from "lucide-react"
import { logSearchResultClick, getSearchHistory, clearSearchHistory } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export default function AdvancedSearch() {
  const router = useRouter()

  const { results, query } = useSearchStore()
  const safeResults: Document[] = Array.isArray(results) ? results : []
  
  // State for Search History
  const [history, setHistory] = React.useState<any[]>([])
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false)

  const fetchHistory = async () => {
    try {
      const data = await getSearchHistory()
      setHistory(data || [])
    } catch (e) {
      console.error("Failed to load search history:", e)
    }
  }

  const handleClearHistory = async () => {
    try {
      await clearSearchHistory()
      setHistory([])
    } catch (e) {
      console.error("Failed to clear search history:", e)
    }
  }

  const handleClick = (id: string) => {
    // Log the click event to the backend before navigating
    // Pass the active text search query or fallback if empty
    logSearchResultClick(query || "advanced_search", id).catch(e => console.error("Failed to log search:", e))
    
    router.push(`/documents/${id}`)
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 p-6">

      {/* 🔥 Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-[#953002]">
            Advanced Search
          </h1>
          <p className="text-slate-500 mt-1">
            Search documents using advanced filters and criteria
          </p>
        </div>

        {/* History Button & Sheet */}
        <Sheet open={isHistoryOpen} onOpenChange={(open) => {
          setIsHistoryOpen(open)
          if (open) fetchHistory()
        }}>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2 border-slate-300">
              <History className="w-4 h-4" />
              Search History
            </Button>
          </SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader className="mb-6 flex flex-row items-center justify-between">
              <div>
                <SheetTitle>Search History</SheetTitle>
                <SheetDescription>
                  Recently viewed documents from past searches.
                </SheetDescription>
              </div>
              <Button variant="destructive" size="sm" onClick={handleClearHistory} disabled={history.length === 0}>
                Clear
              </Button>
            </SheetHeader>

            <div className="space-y-4 shadow-none">
              {history.length === 0 ? (
                <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                  No history found.
                </div>
              ) : (
                history.map((item, index) => (
                  <div 
                    key={item.searchId || index}
                    onClick={() => {
                      setIsHistoryOpen(false)
                      router.push(`/documents/${item.documentId}`)
                    }}
                    className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition flex items-start gap-3"
                  >
                    <div className="mt-1 bg-[#953002]/10 p-1.5 rounded text-[#953002]">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {item.documentTitle || "Untitled Document"}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* 🔍 Filters */}
      <SearchFilters />

      {/* 📄 Results */}
      <div className="space-y-4 bg-white p-6 rounded-lg border shadow-sm">

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-slate-700">
            Search Results
          </h2>

          <span className="text-sm text-slate-500">
            {safeResults.length} documents found
          </span>
        </div>

        {/* ❌ No Results */}
        {safeResults.length === 0 ? (
          <div className="text-center py-10 border rounded-lg bg-slate-50">
            <p className="text-slate-500">No documents found with the given criteria.</p>
          </div>
        ) : (
          /* ✅ Results List */
          <div className="space-y-4">
            {safeResults.map((doc, index) => {
              // Now we have these mapped directly from backend SearchResponseDTO
              const desc = doc.description || doc.metadata?.description || ""
              const status = doc.status || doc.metadata?.status || "Pending"
              const owner = doc.owner || doc.metadata?.owner || "Unknown Owner"
              const date = doc.createdAt || doc.metadata?.date || "Unknown Date"
              
              // Handle Tags formatting natively from DTO list, 
              // or fallback if it's stored inside metadata
              let tagsToRender: string[] = []
              if (Array.isArray(doc.tags) && doc.tags.length > 0) {
                tagsToRender = doc.tags
              } else if (doc.metadata?.tags) {
                tagsToRender = doc.metadata.tags.split(',').map((t: string) => t.trim())
              }

              return (
                <Card
                  key={doc.documentId || index}
                  className="p-5 cursor-pointer hover:shadow-md transition border border-slate-200"
                  onClick={() => handleClick(doc.documentId || doc.title)}
                >
                  <CardContent className="p-0 space-y-4">
                    {/* Title & Status */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-5 h-5 text-[#953002]" />
                          <h3 className="font-semibold text-slate-900 text-lg">
                            {doc.title || "Untitled document"}
                          </h3>
                        </div>
                        {desc && (
                          <p className="text-sm text-slate-600 ml-7">
                            {desc}
                          </p>
                        )}
                      </div>
                      
                      {/* Status Badge */}
                      <span
                        className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap shadow-sm border ${
                          status.toLowerCase() === "approved"
                            ? "bg-[#953002] text-white border-[#7a2702]"
                            : status.toLowerCase() === "pending"
                            ? "bg-[#Eab308] text-white border-[#ca8a04]"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
                      </span>
                    </div>

                    {/* Meta Footer Row */}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 ml-7 pt-2">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span>{owner}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{date}</span>
                      </div>

                      {/* Display Tags */}
                      {tagsToRender.map((t, idx) => (
                        <span 
                          key={idx} 
                          className="px-2 py-0.5 rounded border border-slate-200 text-slate-600 bg-white"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}