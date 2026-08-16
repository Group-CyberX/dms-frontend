"use client"

import * as React from "react"
import { Search, History, FileText, ChevronLeft, ChevronRight, User, Calendar } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

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

export default function AdvancedSearchPage() {
  // useSearchParams needs a Suspense boundary, or the whole route is forced
  // out of static rendering at build time.
  return (
    <React.Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading search…</div>}>
      <AdvancedSearch />
    </React.Suspense>
  )
}

function AdvancedSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Set by the header search box, which hands the term over rather than
  // searching in place.
  const initialQuery = searchParams.get("q") ?? ""
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [hasSearched, setHasSearched] = React.useState(false)
  const [currentQuery, setCurrentQuery] = React.useState<string>("")
  const [searchHistoryOpen, setSearchHistoryOpen] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(0)
  const [totalResults, setTotalResults] = React.useState(0)
  const [activeFilters, setActiveFilters] = React.useState<AdvancedSearchFilters | null>(null)
  const itemsPerPage = 10
  const searchFiltersRef = React.useRef(null)

  // The server returns the page, so these describe the whole result set while
  // `results` holds only what is on screen.
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + results.length
  const paginatedResults = results

  /**
   * Runs the search on the server, one page at a time.
   *
   * The page number is part of the request now. Previously the whole result set
   * was fetched and sliced in the browser, so "10 per page" only affected what
   * was drawn - every matching document had already been downloaded.
   */
  const runSearch = React.useCallback(async (filters: AdvancedSearchFilters, page: number) => {
    setIsLoading(true)
    setHasSearched(true)
    setCurrentQuery(filters.query)
    try {
      const response = await fetchWithAuth(
        `http://localhost:8081/api/search/advanced?page=${page - 1}&size=${itemsPerPage}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(filters)
        }
      )

      if (!response.ok) {
        console.error(`Backend Error: ${response.status}`)
        setResults([])
        setTotalPages(0)
        setTotalResults(0)
        return
      }

      const data = await response.json()
      setResults(data?.content ?? [])
      setTotalPages(data?.totalPages ?? 0)
      setTotalResults(data?.totalElements ?? 0)
    } catch (error) {
      console.error("Search failed:", error)
      setResults([])
      setTotalPages(0)
      setTotalResults(0)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // A new set of filters always starts at page one.
  const handleSearch = (filters: AdvancedSearchFilters) => {
    setActiveFilters(filters)
    setCurrentPage(1)
    runSearch(filters, 1)
  }

  // Arriving from the header with ?q=… runs that search straight away, so the
  // results are on screen rather than the term merely being pre-typed.
  React.useEffect(() => {
    if (!initialQuery.trim()) return
    const filters: AdvancedSearchFilters = {
      query: initialQuery, documentType: "", status: "",
      owner: "", signatureStatus: "", dateRange: "", tags: "",
    }
    setActiveFilters(filters)
    setCurrentPage(1)
    runSearch(filters, 1)
  }, [initialQuery, runSearch])

  // Moving between pages re-runs the same query for that page.
  const goToPage = (page: number) => {
    if (!activeFilters || page < 1 || page > totalPages) return
    setCurrentPage(page)
    runSearch(activeFilters, page)
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

      
      <SearchFilters ref={searchFiltersRef} onSearch={handleSearch} initialQuery={initialQuery} />

      {/*  Search Results Section */}
      <div className="space-y-4">
        {/* Results Header */}
        <div className="flex items-center justify-between border-b pb-4 border-slate-200">
          <h2 className="text-lg font-semibold text-slate-700">Search Results</h2>
          <span className="text-sm font-medium text-slate-500">{totalResults} documents found</span>
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
                  Showing {startIndex + 1} to {endIndex} of {totalResults} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
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
                        onClick={() => goToPage(page)}
                        className="w-9 h-9 p-0"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
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