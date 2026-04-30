"use client"

import * as React from "react"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSearchStore } from "@/store/search-store"
import { searchDocuments } from "@/lib/api"

export function SearchFilters() {
  const { filters, setFilters, setResults, clearFilters } = useSearchStore()
  const [loading, setLoading] = React.useState(false)

  // Run search using current filter values
  const handleSearch = async () => {
    try {
      setLoading(true)
      const data = await searchDocuments(filters)
      setResults(data)
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setLoading(false)
    }
  }

  // Update a specific filter field in store state
  const handleFilterChange = (key: string, value: string) => {
    setFilters({ [key]: value } as any)
  }

  // Reset all filter fields and clear current results
  const handleClear = () => {
    clearFilters()
  }

  return (
    <Card className="w-full shadow-sm border border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-slate-600">🔍</span>
            <CardTitle className="text-lg font-medium text-slate-700">
              Search Filters
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Search Query */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Search Query
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={filters.query}
              onChange={(e) => handleFilterChange("query", e.target.value)}
              placeholder="Enter keywords, document content, or metadata..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Document Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Document Type
            </label>
            <Select
              value={filters.documentType}
              onValueChange={(value) =>
                handleFilterChange("documentType", value)
              }
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="report">Report</SelectItem>
                <SelectItem value="agreement">Agreement</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status
            </label>
            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange("status", value)}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Owner */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Owner
            </label>
            <Select
              value={filters.owner}
              onValueChange={(value) => handleFilterChange("owner", value)}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Any owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="john-doe">John Doe</SelectItem>
                <SelectItem value="jane-smith">Jane Smith</SelectItem>
                <SelectItem value="mike-johnson">Mike Johnson</SelectItem>
                <SelectItem value="sarah-williams">Sarah Williams</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Signature Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Signature Status
            </label>
            <Select
              value={filters.signatureStatus}
              onValueChange={(value) =>
                handleFilterChange("signatureStatus", value)
              }
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="signed">Signed</SelectItem>
                <SelectItem value="unsigned">Unsigned</SelectItem>
                <SelectItem value="pending-signature">
                  Pending Signature
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Date Range
            </label>
            <Select
              value={filters.dateRange}
              onValueChange={(value) => handleFilterChange("dateRange", value)}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Any time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lastWeek">Last Week</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="lastQuarter">Last Quarter</SelectItem>
                <SelectItem value="lastYear">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tags Input */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Tags
          </label>
          <Input
            value={filters.tags}
            onChange={(e) => handleFilterChange("tags", e.target.value)}
            placeholder="Search by tags (e.g., Finance, Q1, Legal)..."
            className="bg-white"
          />
          <p className="text-xs text-slate-500 mt-1">
            Separate multiple tags with commas
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleSearch}
            disabled={loading}
            className="bg-[#953002] text-white hover:bg-[#7a2601]"
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleClear}
            className="text-slate-700"
          >
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}