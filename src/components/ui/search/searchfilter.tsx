"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSearchStore } from "@/store/search-store"
import { searchDocuments } from "@/lib/api"

export function SearchFilters() {
  const { query, setQuery, setResults, clearResults } = useSearchStore()
  const [loading, setLoading] = React.useState(false)

  const handleSearch = async () => {
    try {
      setLoading(true)

      const data = await searchDocuments(query)

      setResults(data)
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setQuery("")
    clearResults()
  }

  return (
    <Card className="w-full shadow-sm border border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-slate-700">
          Search Documents
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter search keyword..."
            className="pl-10"
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleSearch}
            disabled={loading}
            className="bg-[#953002] text-white"
          >
            {loading ? "Searching..." : "Search"}
          </Button>

          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}