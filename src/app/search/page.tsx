"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Card, CardContent } from "@/components/ui/card"
import { SearchFilters } from "@/components/ui/search/searchfilter"
import { useSearchStore } from "@/store/search-store"

export default function AdvancedSearch() {
  const router = useRouter()

  const { results } = useSearchStore()
  const safeResults = Array.isArray(results) ? results : []

  const handleClick = (title: string) => {
    // 🚀 Future: navigate to document details page
    // router.push(`/documents/${id}`)
    console.log("Clicked:", title)
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 p-6">

      {/* 🔥 Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#953002]">
          Advanced Search
        </h1>
        <p className="text-slate-500 mt-1">
          Search documents using keywords
        </p>
      </div>

      {/* 🔍 Filters */}
      <SearchFilters />

      {/* 📄 Results */}
      <div className="space-y-4">

        <div className="flex justify-between items-center">
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
            <p className="text-slate-500">No documents found</p>
          </div>
        ) : (
          /* ✅ Results List */
          <div className="space-y-3">
            {safeResults.map((doc, index) => {
              const metadata = doc.metadata || []
              const metaObj: Record<string, string> = {}
              metadata.forEach((m) => {
                metaObj[m.key.toLowerCase()] = m.value
              })

              return (
                <Card
                  key={doc.documentId || index}
                  className="p-5 cursor-pointer hover:shadow-md transition border border-slate-200"
                  onClick={() => handleClick(doc.title)}
                >
                  <CardContent className="p-0 space-y-3">
                    {/* Title & Status */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 text-base">
                          📄 {doc.title || "Untitled document"}
                        </p>
                        {metaObj.description && (
                          <p className="text-sm text-slate-600 mt-1">
                            {metaObj.description}
                          </p>
                        )}
                      </div>
                      {metaObj.status && (
                        <span
                          className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap ${
                            metaObj.status === "Approved"
                              ? "bg-red-100 text-red-800"
                              : metaObj.status === "Pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {metaObj.status}
                        </span>
                      )}
                    </div>

                    {/* Metadata Row */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 border-t pt-3">
                      {metaObj.owner && (
                        <div className="flex items-center gap-1">
                          <span>👤</span>
                          <span>{metaObj.owner}</span>
                        </div>
                      )}
                      {metaObj.date && (
                        <div className="flex items-center gap-1">
                          <span>📅</span>
                          <span>{metaObj.date}</span>
                        </div>
                      )}
                      {metaObj.category && (
                        <div className="flex items-center gap-1">
                          <span>🏷️</span>
                          <span>{metaObj.category}</span>
                        </div>
                      )}
                      {metaObj.tags && (
                        <div className="flex items-center gap-1">
                          <span>🏷️</span>
                          <span>{metaObj.tags}</span>
                        </div>
                      )}
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