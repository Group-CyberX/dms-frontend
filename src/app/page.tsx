"use client"

import * as React from "react"
import { Search } from "lucide-react"

// Import your provided UI components
import { Card, CardContent } from "@/components/ui/card"

// Import SearchFilters component from the specified location
import { SearchFilters } from "@/components/ui/search/searchfilter"

export default function AdvancedSearch() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 p-6 bg-transparent">
      
      {/*  Page Title & Description Section */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-[#953002]">Advanced Search</h1>
        <p className="text-slate-500 text-sm">
          Search documents using advanced filters and criteria
        </p>
      </div>

      
      <SearchFilters />

      {/*  Search Results Section */}
      <div className="space-y-4">
        {/* Results Header */}
        <div className="flex items-center justify-between border-b pb-4 border-slate-200">
          <h2 className="text-lg font-semibold text-slate-700">Search Results</h2>
          <span className="text-sm font-medium text-slate-500">0 documents found</span>
        </div>

        
        <Card className="border-dashed border-2 bg-slate-50/50 py-16 flex flex-col items-center justify-center">
          <CardContent className="flex flex-col items-center justify-center text-center">
            {/* Magnifying glass icon for the search placeholder */}
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
              <Search size={24} />
            </div>
            <p className="text-slate-600 font-medium text-lg">No results to display</p>
            <p className="text-sm text-slate-400 mt-1 max-w-xs">
              Enter keywords in the search query above or adjust your filters to find documents.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}