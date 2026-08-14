"use client"

import * as React from "react"
import { Search, History, FileText, ChevronLeft, ChevronRight, User, Calendar } from "lucide-react"
import { useRouter } from "next/navigation"

// Import your provided UI components
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// Import SearchFilters component from the specified location
import { SearchFilters, AdvancedSearchFilters } from "@/components/ui/search/searchfilter"
import { SearchHistoryDialog } from "@/components/ui/search/search-history-dialog"
import { fetchWithAuth, logSearchClick } from "@/lib/api-client"

interface SearchResult {
  documentId: string;
  title: string;
  description?: string;
  documentType?: string;
  status?: string;
  owner?: {
    id?: string;
    name: string;
    email?: string;
  } | string;
  createdAt?: string;
  fileName?: string;
  tags?: string[];
}

export default function AdvancedSearch() {
  const router = useRouter()
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [hasSearched, setHasSearched] = React.useState(false)
  const [currentQuery, setCurrentQuery] = React.useState<string>("")
  const [searchHistoryOpen, setSearchHistoryOpen] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const itemsPerPage = 10
  const searchFiltersRef = React.useRef(null)

  // Calculate pagination values
  const totalPages = Math.ceil(results.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedResults = results.slice(startIndex, endIndex)

  const handleSearch = async (filters: AdvancedSearchFilters) => {
    setIsLoading(true)
    setHasSearched(true)
    setCurrentQuery(filters.query)
    setCurrentPage(1)
    try {
      const response = await fetchWithAuth('http://localhost:8081/api/search/advanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters)
      })

      if (!response.ok) {
        console.error(`Backend Error: ${response.status}`)
        setResults([])
        return
      }

      const data = await response.json()
      setResults(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Search failed:", error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleResultClick = async (documentId: string, title: string) => {
    try {
      // Log the search click
      await logSearchClick(currentQuery || title, documentId)
    } catch (error) {
      console.error("Failed to log search click:", error)
    }
    
    // Navigate to document detail page
    router.push(`/documents/${documentId}`)
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 p-6 bg-transparent">
      
      {/*  Page Title & Description Section */}
      <div className="space-y-1 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#953002]">Advanced Search</h1>
          <p className="text-slate-500 text-sm">
            Search documents using advanced filters and criteria
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSearchHistoryOpen(true)}
          className="gap-2"
        >
          <History className="w-4 h-4" />
          Search History
        </Button>
      </div>

      
      <SearchFilters ref={searchFiltersRef} onSearch={handleSearch} />

      {/*  Search Results Section */}
      <div className="space-y-4">
        {/* Results Header */}
        <div className="flex items-center justify-between border-b pb-4 border-slate-200">
          <h2 className="text-lg font-semibold text-slate-700">Search Results</h2>
          <span className="text-sm font-medium text-slate-500">{results.length} documents found</span>
        </div>

        
        {isLoading ? (
          <Card className="border-dashed border-2 bg-slate-50/50 py-16 flex flex-col items-center justify-center">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400 animate-spin">
                <Search size={24} />
              </div>
              <p className="text-slate-600 font-medium text-lg">Searching...</p>
            </CardContent>
          </Card>
        ) : results.length === 0 && hasSearched ? (
          <Card className="border-dashed border-2 bg-slate-50/50 py-16 flex flex-col items-center justify-center">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
                <Search size={24} />
              </div>
              <p className="text-slate-600 font-medium text-lg">No results found</p>
              <p className="text-sm text-slate-400 mt-1 max-w-xs">
                Try adjusting your search query or filters
              </p>
            </CardContent>
          </Card>
        ) : results.length === 0 && !hasSearched ? (
          <Card className="border-dashed border-2 bg-slate-50/50 py-16 flex flex-col items-center justify-center">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
                <Search size={24} />
              </div>
              <p className="text-slate-600 font-medium text-lg">No results to display</p>
              <p className="text-sm text-slate-400 mt-1 max-w-xs">
                Enter keywords in the search query above or adjust your filters to find documents.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {paginatedResults.map((result) => (
              <Card 
                key={result.documentId}
                className="border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
                onClick={() => handleResultClick(result.documentId, result.title)}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col gap-3">
                    
                    {/* Header Row: Icon + Title & Badge */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <FileText size={20} className="text-[#953002] flex-shrink-0" />
                        <h3 className="text-base font-bold text-slate-800 break-words">
                          {result.title}
                        </h3>
                      </div>
                      
                      {/* Status Badge */}
                      {result.status && (
                        <Badge 
                          className={`flex-shrink-0 text-white font-medium px-2.5 py-0.5 rounded ${
                            result.status === 'Pending' ? 'bg-[#eab308] hover:bg-[#eab308]/90' :
                            'bg-[#953002] hover:bg-[#953002]/90'
                          }`}
                        >
                          {result.status}
                        </Badge>
                      )}
                    </div>

                    {/* Description/Snippet */}
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {result.description || "No description available..."}
                    </p>

                    {/* Metadata Row */}
                    <div className="flex items-center flex-wrap gap-4 mt-1 text-xs text-slate-500">
                      {/* Owner */}
                      {result.owner && (
                        <div className="flex items-center gap-1.5">
                          <User size={14} className="text-slate-400" />
                          <span>
                            {typeof result.owner === 'string' 
                              ? result.owner 
                              : result.owner.name}
                          </span>
                        </div>
                      )}
                      
                      {/* Date */}
                      {result.createdAt && (
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-slate-400" />
                          <span>{new Date(result.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      )}

                      {/* Document Type (shown as a tag) */}
                      {result.documentType && (
                        <span className="border border-slate-200 px-2 py-0.5 rounded text-slate-600 bg-white">
                          {result.documentType}
                        </span>
                      )}

                      {/* Tags */}
                      {result.tags && result.tags.length > 0 && result.tags.map((tag, index) => (
                        <span
                          key={`tag-${index}`}
                          className="border border-slate-200 px-2 py-0.5 rounded text-slate-600 bg-white"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-6 border-slate-200">
                <div className="text-sm text-slate-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, results.length)} of {results.length} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="gap-1"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-9 h-9 p-0"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="gap-1"
                  >
                    Next
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search History Dialog */}
      <SearchHistoryDialog 
        open={searchHistoryOpen} 
        onOpenChange={setSearchHistoryOpen} 
      />
    </div>
  )
}