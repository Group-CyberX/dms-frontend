"use client"

import * as React from "react"
import { Search } from "lucide-react"

// Import your provided UI components
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Import SearchFilters component from the specified location
import { SearchFilters, AdvancedSearchFilters } from "@/components/ui/search/searchfilter"
import { fetchWithAuth } from "@/lib/api-client"

interface SearchResult {
  documentId: string;
  title: string;
  documentType?: string;
  status?: string;
  owner?: string;
  createdAt?: string;
  fileName?: string;
}

export default function AdvancedSearch() {
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [hasSearched, setHasSearched] = React.useState(false)
  const searchFiltersRef = React.useRef(null)

  const handleSearch = async (filters: AdvancedSearchFilters) => {
    setIsLoading(true)
    setHasSearched(true)
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

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 p-6 bg-transparent">
      
      {/*  Page Title & Description Section */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-[#953002]">Advanced Search</h1>
        <p className="text-slate-500 text-sm">
          Search documents using advanced filters and criteria
        </p>
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
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold text-slate-700">Title</TableHead>
                  <TableHead className="font-semibold text-slate-700">Document Type</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="font-semibold text-slate-700">Owner</TableHead>
                  <TableHead className="font-semibold text-slate-700">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.documentId} className="hover:bg-slate-50">
                    <TableCell className="text-slate-900 font-medium">{result.title}</TableCell>
                    <TableCell className="text-slate-600">{result.documentType || "-"}</TableCell>
                    <TableCell className="text-slate-600">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        result.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        result.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        result.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {result.status || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-600">{result.owner || "-"}</TableCell>
                    <TableCell className="text-slate-600">
                      {result.createdAt ? new Date(result.createdAt).toLocaleDateString() : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}